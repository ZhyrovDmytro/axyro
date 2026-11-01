import { createHmac } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { priceIds, verifyWebhook } from "./stripe";
afterEach(() => vi.unstubAllEnvs());
describe("configured subscription prices", () => {
  it("includes both currencies and keeps EUR-only configurations working", () => {
    vi.stubEnv("STRIPE_MONTHLY_PRICE_ID", "price_eur_month");
    vi.stubEnv("STRIPE_YEARLY_PRICE_ID", "price_eur_year");
    vi.stubEnv("STRIPE_USD_MONTHLY_PRICE_ID", "price_usd_month");
    vi.stubEnv("STRIPE_USD_YEARLY_PRICE_ID", "price_usd_year");
    expect(priceIds()).toEqual([
      "price_usd_month",
      "price_usd_year",
      "price_eur_month",
      "price_eur_year",
    ]);
    vi.stubEnv("STRIPE_USD_MONTHLY_PRICE_ID", "");
    vi.stubEnv("STRIPE_USD_YEARLY_PRICE_ID", "");
    expect(priceIds()).toEqual(["price_eur_month", "price_eur_year"]);
  });
});
describe("Stripe webhook boundary", () => {
  const body = '{"id":"evt_test"}';
  const secret = "test-secret";
  const timestamp = 1700000000;
  const signature = createHmac("sha256", secret)
    .update(`${timestamp}.${body}`)
    .digest("hex");
  it("accepts valid signatures including rotated keys", () => {
    expect(
      verifyWebhook(
        body,
        `t=${timestamp},v1=${"0".repeat(64)},v1=${signature}`,
        secret,
        timestamp * 1000,
      ),
    ).toBe(true);
  });
  it("rejects forged, modified and replayed payloads", () => {
    expect(
      verifyWebhook(body, `t=${timestamp},v1=bad`, secret, timestamp * 1000),
    ).toBe(false);
    expect(
      verifyWebhook(
        body + " ",
        `t=${timestamp},v1=${signature}`,
        secret,
        timestamp * 1000,
      ),
    ).toBe(false);
    expect(
      verifyWebhook(
        body,
        `t=${timestamp},v1=${signature}`,
        secret,
        (timestamp + 301) * 1000,
      ),
    ).toBe(false);
    expect(
      verifyWebhook(body, `t=nope,v1=${signature}`, secret, timestamp * 1000),
    ).toBe(false);
  });
});
