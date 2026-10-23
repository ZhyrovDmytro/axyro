import { beforeEach, describe, expect, it, vi } from "vitest";
const auth = vi.hoisted(() => ({
  getAuthSession: vi.fn(),
  assertSameOrigin: vi.fn(),
  supabaseRequest: vi.fn(),
}));
const billing = vi.hoisted(() => ({ getBillingAccess: vi.fn() }));
vi.mock("@/services/auth/server", () => auth);
vi.mock("@/services/billing/server", () => billing);
import { GET, PUT } from "./route";
const owner = "a0000000-0000-4000-8000-000000000000";
function request(data: unknown, userId = owner, revision = 0) {
  return new Request("http://localhost/api/user-data", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, revision, data }),
  });
}
beforeEach(() => {
  vi.resetAllMocks();
  auth.getAuthSession.mockResolvedValue({
    user: { id: owner },
    accessToken: "user-token",
  });
  billing.getBillingAccess.mockResolvedValue({ hasPro: false });
});
describe("user data server ownership", () => {
  it("rejects unauthenticated reads", async () => {
    auth.getAuthSession.mockResolvedValue(null);
    expect((await GET()).status).toBe(401);
    expect(auth.supabaseRequest).not.toHaveBeenCalled();
  });
  it("never loads another owner based on client input", async () => {
    auth.supabaseRequest.mockResolvedValue([]);
    const result = await GET();
    expect(await result.json()).toEqual({
      userId: owner,
      data: null,
      revision: 0,
    });
    expect(auth.supabaseRequest).toHaveBeenCalledWith(
      expect.stringContaining(`user_id=eq.${owner}`),
      { token: "user-token" },
    );
  });
  it("rejects queued writes from an earlier identity", async () => {
    expect(
      (await PUT(request({}, "b0000000-0000-4000-8000-000000000000"))).status,
    ).toBe(403);
    expect(auth.supabaseRequest).not.toHaveBeenCalled();
  });
  it("does not let Free save a new personalized plan", async () => {
    auth.supabaseRequest.mockResolvedValue([]);
    expect(
      (await PUT(request({ "veyro.training-plan.v1": "new plan" }))).status,
    ).toBe(403);
    expect(auth.supabaseRequest).toHaveBeenCalledTimes(1);
  });
  it("retains the same personalized plan after subscription expiration", async () => {
    const data = { "veyro.training-plan.v1": "existing plan" };
    auth.supabaseRequest
      .mockResolvedValueOnce([{ payload: data, revision: 2 }])
      .mockResolvedValueOnce(true);
    expect((await PUT(request(data, owner, 2))).status).toBe(200);
    expect(billing.getBillingAccess).not.toHaveBeenCalled();
  });
  it("reports concurrent writes without silently overwriting history", async () => {
    auth.supabaseRequest.mockResolvedValueOnce([]).mockResolvedValueOnce(false);
    expect(
      (await PUT(request({ "veyro.preferences.v1": "settings" }))).status,
    ).toBe(409);
  });
  it("accepts partial snapshots for a newly registered user", async () => {
    auth.supabaseRequest.mockResolvedValueOnce([]).mockResolvedValueOnce(true);
    expect(
      (await PUT(request({ "veyro.preferences.v1": "settings" }))).status,
    ).toBe(200);
  });
  it("rejects unknown snapshot keys", async () => {
    expect((await PUT(request({ role: "admin" }))).status).toBe(400);
    expect(auth.supabaseRequest).not.toHaveBeenCalled();
  });
});
