import {
  checkoutContractFields,
  contractTermsVersion,
} from "@/services/billing/contract-confirmation";
import { z } from "zod";
import { enforceRateLimit } from "@/services/http/rate-limit";
import {
  readRequestText,
  RequestBodyTooLargeError,
} from "@/services/http/request-body";
import { assertSameOrigin, getAuthSession } from "@/services/auth/server";
import {
  billingError,
  billingRow,
  billingOrigin,
  customerForUser,
  getBillingAccess,
  reserveCheckout,
  providerSubscriptions,
} from "@/services/billing/server";
import {
  priceIds,
  stripeRequest,
  stripeUrlSchema,
} from "@/services/billing/stripe";
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const session = await getAuthSession();
    if (!session)
      return Response.json({ error: "Sign in to subscribe." }, { status: 401 });
    const limited = await enforceRateLimit("billing", session.user.id);
    if (limited) return limited;
    const parsed = z
      .object({
        priceId: z.string(),
        acceptedTermsVersion: z.string().optional(),
        returnTo: z
          .string()
          .max(1000)
          .refine(
            (value) =>
              value.startsWith("/") &&
              !value.startsWith("//") &&
              !/[\\\r\n]/.test(value) &&
              /^\/(?:onboarding|plan|account|workouts|exercises|activity)(?:[/?#]|$)/.test(
                value,
              ),
          )
          .default("/account"),
      })
      .safeParse(JSON.parse(await readRequestText(request, 16384)));
    if (!parsed.success || !priceIds().includes(parsed.data.priceId))
      return Response.json(
        { error: "Choose a configured subscription." },
        { status: 400 },
      );
    if ((await getBillingAccess(session)).hasPro)
      return Response.json(
        {
          error: "Pro is already active. Manage your subscription in Account.",
        },
        { status: 409 },
      );
    const existing = await billingRow(session.user.id);
    if (
      existing?.subscription_id &&
      !["canceled", "incomplete_expired", "free"].includes(existing.status)
    ) {
      return Response.json(
        {
          error:
            "A subscription already exists. Manage your subscription in Account to update payment or change your membership.",
        },
        { status: 409 },
      );
    }
    const live = /^(sk|rk)_live_/.test(process.env.STRIPE_SECRET_KEY ?? "");
    const origin = billingOrigin();
    const contract = checkoutContractFields(origin);
    if (
      live &&
      (!contract || process.env.AXYRO_LIVE_CHECKOUT_ENABLED !== "true")
    ) {
      return Response.json(
        { error: "Live checkout is unavailable." },
        { status: 503 },
      );
    }
    if (contract && parsed.data.acceptedTermsVersion !== contractTermsVersion) {
      return Response.json(
        {
          error:
            "Review and accept the current membership terms before continuing.",
        },
        { status: 400 },
      );
    }
    const customer = await customerForUser(session.user.id, session.user.email);
    const reservation = await reserveCheckout(
      session.user.id,
      parsed.data.priceId,
      parsed.data.returnTo,
    );
    if (reservation.priceId !== parsed.data.priceId) {
      return Response.json(
        {
          error: "A checkout is open for a different membership.",
          pendingPriceId: reservation.priceId,
          pendingUntil: new Date(reservation.expiresAt * 1000).toISOString(),
        },
        { status: 409 },
      );
    }
    if (live) {
      const price = z
        .object({ tax_behavior: z.string() })
        .parse(
          await stripeRequest(
            `prices/${encodeURIComponent(reservation.priceId)}`,
          ),
        );
      if (price.tax_behavior !== "inclusive") {
        return Response.json(
          { error: "This price is unavailable." },
          { status: 503 },
        );
      }
    }
    const subscriptions = await providerSubscriptions(customer);
    if (
      subscriptions.some(
        (subscription) =>
          !["canceled", "incomplete_expired"].includes(subscription.status),
      )
    )
      return Response.json(
        { error: "A subscription already exists. Manage it in Account." },
        { status: 409 },
      );
    const successUrl = new URL(reservation.returnTo, origin);
    successUrl.searchParams.set("checkout", "success");
    const cancelUrl = new URL(reservation.returnTo, origin);
    cancelUrl.searchParams.set("checkout", "cancelled");
    const checkout = stripeUrlSchema.parse(
      await stripeRequest(
        "checkout/sessions",
        new URLSearchParams({
          ...contract,
          mode: "subscription",
          "subscription_data[billing_mode][type]": "classic",
          "branding_settings[background_color]": "#111412",
          "branding_settings[button_color]": "#d9fc54",
          "branding_settings[font_family]": "default",
          "branding_settings[border_style]": "rounded",
          customer,
          "line_items[0][price]": reservation.priceId,
          expires_at: String(reservation.expiresAt),
          "line_items[0][quantity]": "1",
          "subscription_data[metadata][user_id]": session.user.id,
          client_reference_id: session.user.id,
          success_url: successUrl.toString(),
          cancel_url: cancelUrl.toString(),
        }),
        `checkout-${reservation.id}`,
        "2025-09-30.clover",
      ),
    );
    return Response.json(checkout);
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError)
      return Response.json({ error: "Request too large." }, { status: 413 });
    return billingError(error);
  }
}
