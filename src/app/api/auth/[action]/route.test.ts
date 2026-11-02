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
import { GET, POST } from "./route";
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
  it("uses the canonical callback for Google behind a deployment proxy", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("APP_URL", "https://axyro-staging.netlify.app");
    const response = await GET(
      new Request(
        "https://deploy-id--axyro-staging.netlify.app/api/auth/oauth?provider=google",
      ),
      { params: Promise.resolve({ action: "oauth" }) },
    );
    const location = new URL(response.headers.get("location")!);
    expect(location.searchParams.get("redirect_to")).toBe(
      "https://axyro-staging.netlify.app/auth/callback",
    );
  });
  it.each(["signup", "recover"])(
    "uses the canonical callback for %s",
    async (action) => {
      vi.stubEnv("NODE_ENV", "production");
      vi.stubEnv("APP_URL", "https://axyro-staging.netlify.app");
      auth.supabaseRequest.mockResolvedValueOnce({});
      const response = await POST(
        request(action, {
          email: "player@example.com",
          password: "secure-password-123",
          confirmPassword: "secure-password-123",
          displayName: "Player",
        }),
        { params: Promise.resolve({ action }) },
      );
      expect(response.status).toBe(200);
      expect(auth.supabaseRequest).toHaveBeenCalledWith(
        `/auth/v1/${action}?redirect_to=${encodeURIComponent("https://axyro-staging.netlify.app/auth/callback")}`,
        expect.any(Object),
      );
    },
  );
  it.each(["new", "already registered"])(
    "keeps signup responses generic for %s accounts awaiting no session",
    async (account) => {
      auth.supabaseRequest.mockResolvedValueOnce({
        id: "provider-user-id",
        identities: account === "new" ? [{ provider: "email" }] : [],
      });
      const response = await POST(
        request("signup", {
          email: "player@example.com",
          password: "secure-password-123",
          confirmPassword: "secure-password-123",
          displayName: "Player",
        }),
        { params: Promise.resolve({ action: "signup" }) },
      );
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({
        user: null,
        requiresVerification: true,
      });
      expect(auth.setProviderSession).not.toHaveBeenCalled();
    },
  );
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
