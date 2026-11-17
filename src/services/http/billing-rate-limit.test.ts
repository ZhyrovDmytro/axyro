import { beforeEach, describe, expect, it, vi } from "vitest";
import { enforceRateLimit } from "./rate-limit";
import { POST as portal } from "@/app/api/billing/portal/route";
import { POST as restore } from "@/app/api/billing/restore/route";
import { billingRow } from "@/services/billing/server";
vi.mock("./rate-limit", () => ({ enforceRateLimit: vi.fn() }));
vi.mock("@/services/auth/server", () => ({
  assertSameOrigin: vi.fn(),
  getAuthSession: vi.fn(async () => ({ user: { id: "verified-user" } })),
}));
vi.mock("@/services/billing/server", () => ({
  billingRow: vi.fn(),
  reconcileCustomer: vi.fn(),
  getBillingAccess: vi.fn(),
  billingOrigin: vi.fn(),
  billingError: vi.fn(),
}));
beforeEach(() => vi.resetAllMocks());

describe("billing action quotas", () => {
  it.each([portal, restore])(
    "denies provider work when the shared quota is exhausted",
    async (handler) => {
      vi.mocked(enforceRateLimit).mockResolvedValue(
        new Response(null, { status: 429 }),
      );
      const response = await handler(
        new Request("https://axyro.test", { method: "POST" }),
      );
      expect(response.status).toBe(429);
      expect(enforceRateLimit).toHaveBeenCalledWith("billing", "verified-user");
      expect(billingRow).not.toHaveBeenCalled();
    },
  );
});
