import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  supabaseRequest: vi.fn(),
  stripeRequest: vi.fn(),
  sendBillingEmail: vi.fn(),
  billingEmailConfigured: vi.fn(() => true),
}));
vi.mock("@/services/auth/server", () => mocks);
vi.mock("./stripe", () => mocks);
vi.mock("./transactional-email", () => mocks);

import { confirmPurchase } from "./contract-confirmation";

const paid = {
  id: "cs_test_contract",
  created: 1795428840,
  amount_total: 699,
  currency: "eur",
  payment_status: "paid",
  consent: { terms_of_service: "accepted" },
  customer_details: { email: "jana@example.com" },
  metadata: {
    contract_version: "2026-11-23",
    contract_origin: "https://axyro-staging.netlify.app",
    operator: "Test Operator\nTest Business Address",
  },
};

beforeEach(() => {
  vi.resetAllMocks();
  mocks.supabaseRequest.mockResolvedValue([]);
  mocks.stripeRequest.mockResolvedValue({
    data: [{ price: { recurring: { interval: "month", interval_count: 1 } } }],
  });
});

it("sends contractual details to the paid customer's checkout email", async () => {
  await confirmPurchase(paid);
  expect(mocks.sendBillingEmail).toHaveBeenCalledWith(
    "jana@example.com",
    "Your Axyro Pro contract",
    expect.stringMatching(
      /€6\.99 every month[\s\S]*Test Operator[\s\S]*axyro-staging\.netlify\.app\/withdrawal/,
    ),
    "contract-cs_test_contract",
  );
  expect(mocks.supabaseRequest).toHaveBeenLastCalledWith(
    expect.stringContaining("on_conflict=checkout_id"),
    expect.objectContaining({ body: { checkout_id: paid.id } }),
  );
});

it("does not send again once delivery is recorded", async () => {
  mocks.supabaseRequest.mockResolvedValue([{ checkout_id: paid.id }]);
  await confirmPurchase(paid);
  expect(mocks.sendBillingEmail).not.toHaveBeenCalled();
});

it("leaves delivery unrecorded on provider failure so Stripe can retry", async () => {
  mocks.sendBillingEmail.mockRejectedValue(new Error("Email unavailable"));
  await expect(confirmPurchase(paid)).rejects.toThrow("Email unavailable");
  expect(mocks.supabaseRequest).toHaveBeenCalledTimes(1);
});

it("requires payment and recorded terms acceptance", async () => {
  await expect(
    confirmPurchase({ ...paid, payment_status: "unpaid" }),
  ).rejects.toThrow();
  await expect(confirmPurchase({ ...paid, consent: null })).rejects.toThrow();
  expect(mocks.sendBillingEmail).not.toHaveBeenCalled();
});
