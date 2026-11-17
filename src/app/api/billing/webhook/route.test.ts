import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/services/billing/server", () => ({
  reconcileCustomer: vi.fn(),
  billingError: () => Response.json({ error: "Unavailable" }, { status: 503 }),
}));
import { reconcileCustomer } from "@/services/billing/server";
import { POST } from "./route";

const secret = "webhook-test-secret";
function request(
  type: string,
  customer: unknown = "cus_verified",
  signed = true,
) {
  const body = JSON.stringify({ type, data: { object: { customer } } });
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = createHmac("sha256", secret)
    .update(`${timestamp}.${body}`)
    .digest("hex");
  return new Request("https://axyro.example/api/billing/webhook", {
    method: "POST",
    body,
    headers: {
      "stripe-signature": signed ? `t=${timestamp},v1=${signature}` : "forged",
    },
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("STRIPE_WEBHOOK_SECRET", secret);
});
afterEach(() => vi.unstubAllEnvs());

describe("signed billing webhook delivery", () => {
  it.each([
    "checkout.session.completed",
    "checkout.session.async_payment_succeeded",
    "customer.subscription.created",
    "customer.subscription.updated",
    "customer.subscription.deleted",
    "invoice.paid",
    "invoice.payment_failed",
  ])("reconciles trusted provider state for %s", async (type) => {
    const response = await POST(request(type));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ received: true });
    expect(reconcileCustomer).toHaveBeenCalledExactlyOnceWith("cus_verified");
  });

  it("accepts expanded customer references", async () => {
    expect(
      (await POST(request("invoice.paid", { id: "cus_verified" }))).status,
    ).toBe(200);
    expect(reconcileCustomer).toHaveBeenCalledExactlyOnceWith("cus_verified");
  });

  it("rejects unsigned delivery without touching subscriptions", async () => {
    expect(
      (await POST(request("invoice.paid", "cus_verified", false))).status,
    ).toBe(400);
    expect(reconcileCustomer).not.toHaveBeenCalled();
  });

  it("fails closed when the signing secret is absent", async () => {
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "");
    expect((await POST(request("invoice.paid"))).status).toBe(503);
    expect(reconcileCustomer).not.toHaveBeenCalled();
  });

  it("acknowledges unrelated events without changing access", async () => {
    expect((await POST(request("customer.updated"))).status).toBe(200);
    expect(reconcileCustomer).not.toHaveBeenCalled();
  });

  it("returns a retryable error when reconciliation fails", async () => {
    vi.mocked(reconcileCustomer).mockRejectedValueOnce(
      new Error("Unavailable"),
    );
    expect((await POST(request("invoice.paid"))).status).toBe(503);
  });
});
