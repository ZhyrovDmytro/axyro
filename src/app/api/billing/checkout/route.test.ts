import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("@/services/auth/server", () => ({
  getAuthSession: vi.fn(),
  assertSameOrigin: vi.fn(),
}));
vi.mock("@/services/billing/server", () => ({
  billingError: () => Response.json({ error: "Unavailable" }, { status: 503 }),
  billingOrigin: () => "https://axyro.example",
  customerForUser: vi.fn(async () => "cus_verified"),
  billingRow: vi.fn(async () => null),
  getBillingAccess: vi.fn(),
  reserveCheckout: vi.fn(),
  providerSubscriptions: vi.fn(async () => []),
}));
vi.mock("@/services/billing/stripe", async (original) => ({
  ...(await original<typeof import("@/services/billing/stripe")>()),
  priceIds: () => ["price_allowed"],
  stripeRequest: vi.fn(),
}));
import { getAuthSession } from "@/services/auth/server";
import {
  billingRow,
  getBillingAccess,
  reserveCheckout,
  providerSubscriptions,
} from "@/services/billing/server";
import { stripeRequest } from "@/services/billing/stripe";
import { POST } from "./route";
const user = {
  id: "user-a",
  email: "a@example.com",
  displayName: "A",
  avatarUrl: null,
  role: "user" as const,
  providers: ["email"],
  isDevelopmentAdmin: false,
};
const request = (body: unknown) =>
  new Request("https://axyro.example/api/billing/checkout", {
    method: "POST",
    headers: {
      origin: "https://axyro.example",
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getAuthSession).mockResolvedValue({ user, accessToken: "token" });
  vi.mocked(getBillingAccess).mockResolvedValue({
    user,
    subscription: null,
    hasPro: false,
  });
  vi.mocked(reserveCheckout).mockImplementation(
    async (_user, priceId, returnTo) => ({
      id: "11111111-1111-4111-8111-111111111111",
      priceId,
      returnTo,
      expiresAt: 2000000000,
    }),
  );
  vi.mocked(stripeRequest).mockResolvedValue({
    url: "https://checkout.stripe.com/test",
  });
});
describe("Checkout trust boundaries", () => {
  it("uses the same database intent when concurrent requests change continuation", async () => {
    vi.mocked(reserveCheckout).mockResolvedValue({
      id: "11111111-1111-4111-8111-111111111111",
      priceId: "price_allowed",
      returnTo: "/plan/setup?focus=padel",
      expiresAt: 2000000000,
    });
    const results = await Promise.all([
      POST(request({ priceId: "price_allowed", returnTo: "/plan/setup" })),
      POST(request({ priceId: "price_allowed", returnTo: "/account" })),
    ]);
    expect(results.map((result) => result.status)).toEqual([200, 200]);
    const calls = vi.mocked(stripeRequest).mock.calls;
    expect(calls[0][2]).toBe(calls[1][2]);
    expect(calls[0][1]?.toString()).toBe(calls[1][1]?.toString());
  });
  it("checks live provider state before checkout even if webhook has not arrived", async () => {
    vi.mocked(providerSubscriptions).mockResolvedValueOnce([
      {
        id: "sub_live",
        customer: "cus_verified",
        status: "active",
        cancel_at_period_end: false,
        items: { data: [] },
      },
    ]);
    expect((await POST(request({ priceId: "price_allowed" }))).status).toBe(
      409,
    );
    expect(stripeRequest).not.toHaveBeenCalled();
  });
  it.each(["past_due", "unpaid", "incomplete", "paused"] as const)(
    "does not create another subscription for %s status",
    async (status) => {
      vi.mocked(billingRow).mockResolvedValueOnce({
        user_id: "user-a",
        customer_id: "cus_verified",
        subscription_id: "sub_existing",
        status,
        expires_at: null,
        cancel_at_period_end: false,
      });
      expect((await POST(request({ priceId: "price_allowed" }))).status).toBe(
        409,
      );
      expect(stripeRequest).not.toHaveBeenCalled();
    },
  );
  it("requires a session and an allowlisted provider price", async () => {
    vi.mocked(getAuthSession).mockResolvedValueOnce(null);
    expect((await POST(request({ priceId: "price_allowed" }))).status).toBe(
      401,
    );
    expect((await POST(request({ priceId: "price_attacker" }))).status).toBe(
      400,
    );
    expect(stripeRequest).not.toHaveBeenCalled();
  });
  it("blocks offsite continuation and duplicate active subscriptions", async () => {
    expect(
      (
        await POST(
          request({ priceId: "price_allowed", returnTo: "//evil.example" }),
        )
      ).status,
    ).toBe(400);
    vi.mocked(getBillingAccess).mockResolvedValueOnce({
      user,
      subscription: null,
      hasPro: true,
    });
    expect((await POST(request({ priceId: "price_allowed" }))).status).toBe(
      409,
    );
    expect(stripeRequest).not.toHaveBeenCalled();
  });
  it.each(["/exercises/dead-bug", "/activity", "/workouts/lower-body-control?minutes=20"])("accepts contextual continuation %s", async (returnTo) => {
    expect((await POST(request({ priceId: "price_allowed", returnTo }))).status).toBe(200);
  });
  it("keeps plan continuation parameters and uses the authenticated customer", async () => {
    expect(
      (
        await POST(
          request({
            priceId: "price_allowed",
            returnTo: "/plan/setup?focus=padel",
          }),
        )
      ).status,
    ).toBe(200);
    const params = vi.mocked(stripeRequest).mock.calls[0][1]!;
    expect(params.get("customer")).toBe("cus_verified");
    expect(params.get("success_url")).toBe(
      "https://axyro.example/plan/setup?focus=padel&checkout=success",
    );
    expect(params.get("subscription_data[metadata][user_id]")).toBe("user-a");
    expect(params.has("subscription_data[trial_period_days]")).toBe(false);
  });
});
