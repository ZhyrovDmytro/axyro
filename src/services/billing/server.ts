import { z } from "zod";
import {
  hasEntitlement,
  type Subscription,
} from "@/domain/access/entitlements";
import type { AuthSession } from "@/services/auth/types";
import { getAuthSession, supabaseRequest } from "@/services/auth/server";
import { priceIds, stripeRequest, stripeSubscriptionSchema } from "./stripe";

const rowSchema = z.object({
  user_id: z.string(),
  customer_id: z.string(),
  subscription_id: z.string().nullable(),
  status: z.enum([
    "free",
    "active",
    "trialing",
    "past_due",
    "canceled",
    "unpaid",
    "incomplete",
    "incomplete_expired",
    "paused",
  ]),
  expires_at: z.string().nullable(),
  cancel_at_period_end: z.boolean(),
});
export async function billingRow(userId: string) {
  const rows = z
    .array(rowSchema)
    .parse(
      await supabaseRequest(
        `rest/v1/subscriptions?user_id=eq.${encodeURIComponent(userId)}&select=*`,
        { admin: true },
      ),
    );
  return rows[0] ?? null;
}
export async function getBillingAccess(verifiedSession?: AuthSession) {
  const session = verifiedSession ?? (await getAuthSession());
  if (!session) return { user: null, subscription: null, hasPro: false };
  if (session.user.role === "admin")
    return { user: session.user, subscription: null, hasPro: true };
  const row = await billingRow(session.user.id);
  const subscription: Subscription | null = row
    ? {
        status: row.status,
        expiresAt: row.expires_at,
        cancelAtPeriodEnd: row.cancel_at_period_end,
      }
    : null;
  return {
    user: session.user,
    subscription,
    hasPro: hasEntitlement(session.user, subscription, "pro"),
  };
}
export async function customerForUser(userId: string, email: string) {
  const existing = await billingRow(userId);
  if (existing) return existing.customer_id;
  const customer = z
    .object({ id: z.string() })
    .parse(
      await stripeRequest(
        "customers",
        new URLSearchParams({ email, "metadata[user_id]": userId }),
        `customer-${userId}`,
      ),
    );
  await supabaseRequest("rest/v1/subscriptions?on_conflict=user_id", {
    admin: true,
    method: "POST",
    prefer: "resolution=ignore-duplicates,return=representation",
    body: {
      user_id: userId,
      customer_id: customer.id,
      status: "free",
      expires_at: null,
      cancel_at_period_end: false,
    },
  });
  const saved = await billingRow(userId);
  if (!saved) throw new Error("Customer association could not be saved.");
  return saved.customer_id;
}
export async function providerSubscriptions(customerId: string) {
  const subscriptions: z.infer<typeof stripeSubscriptionSchema>[] = [];
  let cursor: string | undefined;
  do {
    const page = z
      .object({
        data: z.array(stripeSubscriptionSchema),
        has_more: z.boolean().default(false),
      })
      .parse(
        await stripeRequest(
          `subscriptions?customer=${encodeURIComponent(customerId)}&status=all&limit=100${cursor ? `&starting_after=${encodeURIComponent(cursor)}` : ""}`,
        ),
      );
    subscriptions.push(...page.data);
    if (!page.has_more) return subscriptions;
    const next = page.data.at(-1)?.id;
    if (!next || next === cursor)
      throw new Error("Invalid billing pagination.");
    cursor = next;
  } while (cursor);
  return subscriptions;
}
export async function reserveCheckout(
  userId: string,
  priceId: string,
  returnTo: string,
) {
  return z
    .object({
      id: z.string().uuid(),
      priceId: z.string(),
      returnTo: z.string(),
      expiresAt: z.number().int(),
    })
    .parse(
      await supabaseRequest("rest/v1/rpc/reserve_billing_checkout", {
        admin: true,
        method: "POST",
        body: { p_user_id: userId, p_price: priceId, p_return_to: returnTo },
      }),
    );
}
export async function reconcileCustomer(customerId: string) {
  // Fetch current provider state instead of applying potentially out-of-order event snapshots.
  const result = { data: await providerSubscriptions(customerId) };
  const eligible = result.data.filter((subscription) =>
    subscription.items.data.some((item) => priceIds().includes(item.price.id)),
  );
  const ranked = [...eligible].sort((a, b) => {
    const active = (status: string) =>
      status === "active" || status === "trialing";
    return (
      Number(active(b.status)) - Number(active(a.status)) ||
      Math.max(...b.items.data.map((item) => item.current_period_end)) -
        Math.max(...a.items.data.map((item) => item.current_period_end))
    );
  });
  const subscription = ranked[0];
  await supabaseRequest(
    `rest/v1/subscriptions?customer_id=eq.${encodeURIComponent(customerId)}`,
    {
      admin: true,
      method: "PATCH",
      body: {
        subscription_id: subscription?.id ?? null,
        status: subscription?.status ?? "free",
        expires_at: subscription
          ? new Date(
              Math.max(
                ...subscription.items.data.map(
                  (item) => item.current_period_end,
                ),
              ) * 1000,
            ).toISOString()
          : null,
        cancel_at_period_end: subscription?.cancel_at_period_end ?? false,
        updated_at: new Date().toISOString(),
      },
    },
  );
}
export async function cancelBillingForUser(userId: string) {
  const row = await billingRow(userId);
  if (!row) return;
  const result = { data: await providerSubscriptions(row.customer_id) };
  for (const subscription of result.data) {
    if (!["canceled", "incomplete_expired"].includes(subscription.status)) {
      const response = await fetch(
        `https://api.stripe.com/v1/subscriptions/${encodeURIComponent(subscription.id)}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
            "Stripe-Version": "2025-06-30.basil",
          },
          signal: AbortSignal.timeout(15000),
        },
      );
      if (!response.ok) throw new Error("Subscription cancellation failed.");
    }
  }
}
export function billingOrigin() {
  const value = process.env.APP_URL;
  if (!value) throw new Error("APP_URL must be configured.");
  return new URL(value).origin;
}
export function billingError(error: unknown) {
  console.error(
    "Billing operation failed",
    error instanceof Error ? error.name : "UnknownError",
  );
  return Response.json(
    { error: "Billing is temporarily unavailable. Please try again." },
    { status: 503 },
  );
}
