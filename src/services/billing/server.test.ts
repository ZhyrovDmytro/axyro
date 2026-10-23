import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("@/services/auth/server", () => ({
  getAuthSession: vi.fn(),
  supabaseRequest: vi.fn(),
}));
vi.mock("./stripe", async (original) => ({
  ...(await original<typeof import("./stripe")>()),
  stripeRequest: vi.fn(),
}));
import { getAuthSession, supabaseRequest } from "@/services/auth/server";
import { stripeRequest } from "./stripe";
import {
  getBillingAccess,
  reconcileCustomer,
  providerSubscriptions,
} from "./server";
const user = {
  id: "user-a",
  email: "a@example.com",
  displayName: "A",
  avatarUrl: null,
  role: "user" as const,
  providers: ["email"],
  isDevelopmentAdmin: false,
};
beforeEach(() => {
  vi.clearAllMocks();
});
describe("billing server ownership", () => {
  it("paginates every provider subscription page before reconciling", async () => {
    const subscription = {
      id: "sub_old",
      customer: "cus_a",
      status: "active",
      cancel_at_period_end: false,
      items: {
        data: [{ current_period_end: 1800000000, price: { id: "price_pro" } }],
      },
    };
    vi.mocked(stripeRequest)
      .mockResolvedValueOnce({ data: [subscription], has_more: true })
      .mockResolvedValueOnce({
        data: [{ ...subscription, id: "sub_last" }],
        has_more: false,
      });
    expect((await providerSubscriptions("cus_a")).map((row) => row.id)).toEqual(
      ["sub_old", "sub_last"],
    );
    expect(vi.mocked(stripeRequest).mock.calls[1][0]).toContain(
      "starting_after=sub_old",
    );
  });
  it("does not query customer billing for unauthenticated requests", async () => {
    vi.mocked(getAuthSession).mockResolvedValue(null);
    expect(await getBillingAccess()).toEqual({
      user: null,
      subscription: null,
      hasPro: false,
    });
    expect(supabaseRequest).not.toHaveBeenCalled();
  });
  it("reads only the verified user's subscription", async () => {
    vi.mocked(getAuthSession).mockResolvedValue({ user, accessToken: "token" });
    vi.mocked(supabaseRequest).mockResolvedValue([
      {
        user_id: user.id,
        customer_id: "cus_a",
        subscription_id: "sub_a",
        status: "active",
        expires_at: "2999-01-01T00:00:00Z",
        cancel_at_period_end: true,
      },
    ]);
    expect((await getBillingAccess()).hasPro).toBe(true);
    expect(vi.mocked(supabaseRequest).mock.calls[0][0]).toContain(
      "user_id=eq.user-a",
    );
  });
  it("reconciles actual provider subscription instead of an incoming claimed tier", async () => {
    vi.stubEnv("STRIPE_MONTHLY_PRICE_ID", "price_pro");
    vi.mocked(stripeRequest).mockResolvedValue({
      data: [
        {
          id: "sub_a",
          customer: "cus_a",
          status: "past_due",
          cancel_at_period_end: false,
          items: {
            data: [
              { current_period_end: 1800000000, price: { id: "price_pro" } },
            ],
          },
        },
      ],
    });
    vi.mocked(supabaseRequest).mockResolvedValue(null);
    await reconcileCustomer("cus_a");
    expect(vi.mocked(supabaseRequest).mock.calls[0]).toEqual([
      "rest/v1/subscriptions?customer_id=eq.cus_a",
      expect.objectContaining({
        admin: true,
        method: "PATCH",
        body: expect.objectContaining({
          status: "past_due",
          subscription_id: "sub_a",
        }),
      }),
    ]);
    vi.unstubAllEnvs();
  });
});
