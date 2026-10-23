import { afterEach, describe, expect, it, vi } from "vitest";
const auth = vi.hoisted(() => ({
  setDevelopmentSession: vi.fn(),
  setProviderSession: vi.fn(),
  getAuthSession: vi.fn(async () => null),
  supabaseRequest: vi.fn(),
  clearSession: vi.fn(),
}));
vi.mock("@/services/auth/server", () => ({
  ...auth,
  authConfigured: () => true,
  beginPkce: vi.fn(),
  supabaseUrl: () => "https://provider.test",
  assertSameOrigin: (request: Request) => {
    if (request.headers.get("origin") !== new URL(request.url).origin)
      throw new Error("Origin");
  },
}));
import { POST } from "./route";
function request(action: string, body: unknown, origin = "https://axyro.test") {
  return new Request(`https://axyro.test/api/auth/${action}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", origin },
    body: JSON.stringify(body),
  });
}
describe("auth route trust boundaries", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });
  it("rejects admin/admin in production before issuing any session", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const response = await POST(
      request("signin", { email: "admin", password: "admin" }),
      { params: Promise.resolve({ action: "signin" }) },
    );
    expect(response.status).toBe(422);
    expect(auth.setDevelopmentSession).not.toHaveBeenCalled();
    expect(auth.setProviderSession).not.toHaveBeenCalled();
  });
  it("rejects cross-origin sign in", async () => {
    const response = await POST(
      request(
        "signin",
        { email: "admin", password: "admin" },
        "https://attacker.test",
      ),
      { params: Promise.resolve({ action: "signin" }) },
    );
    expect(response.status).toBe(403);
    expect(auth.setDevelopmentSession).not.toHaveBeenCalled();
  });
  it("requires authentication for account deletion", async () => {
    const response = await POST(request("delete", { confirmation: "DELETE" }), {
      params: Promise.resolve({ action: "delete" }),
    });
    expect(response.status).toBe(401);
    expect(auth.supabaseRequest).not.toHaveBeenCalled();
  });
});
