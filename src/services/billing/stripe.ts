import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";

export function priceIds() {
  return [process.env.STRIPE_MONTHLY_PRICE_ID, process.env.STRIPE_YEARLY_PRICE_ID].filter((id): id is string => !!id);
}
export async function stripeRequest(path: string, body?: URLSearchParams, idempotencyKey?: string): Promise<unknown> {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error("Billing is not configured.");
  const response = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: body ? "POST" : "GET",
    headers: {
      Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
      "Stripe-Version": "2025-06-30.basil",
      ...(body ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
      ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
    },
    body,
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error("Billing provider request failed.");
  return response.json();
}
export const stripeSubscriptionSchema = z.object({
  id: z.string(), customer: z.string(),
  status: z.enum(["active", "trialing", "past_due", "canceled", "unpaid", "incomplete", "incomplete_expired", "paused"]),
  cancel_at_period_end: z.boolean(),
  items: z.object({ data: z.array(z.object({ current_period_end: z.number(), price: z.object({ id: z.string() }) })) }),
});
export const stripeUrlSchema = z.object({ url: z.url() });
export async function products() {
  return Promise.all(priceIds().map(async (id) => {
    const price = z.object({ id: z.string(), active: z.boolean(), unit_amount: z.number().int().nonnegative(), currency: z.string(), recurring: z.object({ interval: z.enum(["month", "year"]), interval_count: z.number().int().positive() }) }).parse(await stripeRequest(`prices/${encodeURIComponent(id)}`));
    if (!price.active) throw new Error("A configured billing product is unavailable.");
    return { id: price.id, amount: price.unit_amount, currency: price.currency, interval: price.recurring.interval, intervalCount: price.recurring.interval_count };
  }));
}
export function verifyWebhook(body: string, signature: string, secret: string, now = Date.now()) {
  const parts = signature.split(",").map((part) => part.split("="));
  const timestamp = parts.find(([key]) => key === "t")?.[1];
  if (!timestamp || !/^\d+$/.test(timestamp) || Math.abs(now / 1000 - Number(timestamp)) > 300) return false;
  const expected = createHmac("sha256", secret).update(`${timestamp}.${body}`).digest();
  return parts.some(([key, value]) => key === "v1" && !!value && /^[a-f0-9]{64}$/i.test(value) && timingSafeEqual(expected, Buffer.from(value, "hex")));
}
