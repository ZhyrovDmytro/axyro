import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  jar: { get: vi.fn(), delete: vi.fn(), set: vi.fn() },
  setProviderSession: vi.fn(),
  supabaseRequest: vi.fn(),
}));
vi.mock("next/headers", () => ({ cookies: async () => mocks.jar }));
vi.mock("@/services/auth/server", () => ({
  setProviderSession: mocks.setProviderSession,
  supabaseRequest: mocks.supabaseRequest,
}));
import { GET } from "./route";

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("APP_URL", "https://axyro-staging.netlify.app");
  mocks.jar.get.mockImplementation((name: string) => {
    const values: Record<string, string> = {
      "axyro-pkce": "test-verifier",
      "axyro-auth-next": "/account",
    };
    return values[name] ? { value: values[name] } : undefined;
  });
});
afterEach(() => vi.unstubAllEnvs());

describe("canonical auth callback redirects", () => {
  const url = "https://deploy-id--axyro-staging.netlify.app/auth/callback";
  it.each(["signin", "recovery", undefined])(
    "only grants password recovery for a recovery PKCE flow (%s)",
    async (flow) => {
      mocks.jar.get.mockImplementation((name: string) => {
        const values: Record<string, string | undefined> = {
          "axyro-pkce": "test-verifier",
          "axyro-auth-next": "/reset-password",
          "axyro-auth-flow": flow,
        };
        return values[name] ? { value: values[name] } : undefined;
      });
      mocks.supabaseRequest.mockResolvedValue({ access_token: "test-token" });
      await GET(new Request(`${url}?code=test-code`));
      expect(mocks.jar.delete).toHaveBeenCalledWith("axyro-auth-flow");
      if (flow === "recovery")
        expect(mocks.jar.set).toHaveBeenCalledWith(
          "axyro-password-recovery",
          "1",
          expect.objectContaining({
            httpOnly: true,
            secure: true,
            maxAge: 600,
          }),
        );
      else expect(mocks.jar.set).not.toHaveBeenCalled();
    },
  );
  it("keeps successful sign-in on the stable application hostname", async () => {
    mocks.supabaseRequest.mockResolvedValue({ access_token: "test-token" });
    const response = await GET(new Request(`${url}?code=test-code`));
    expect(response.headers.get("location")).toBe(
      "https://axyro-staging.netlify.app/account",
    );
    expect(mocks.supabaseRequest).toHaveBeenCalledWith(
      "/auth/v1/token?grant_type=pkce",
      {
        method: "POST",
        body: { auth_code: "test-code", code_verifier: "test-verifier" },
      },
    );
    expect(mocks.setProviderSession).toHaveBeenCalledWith({
      access_token: "test-token",
    });
  });

  it("returns callback errors to the stable hostname without exchanging a code", async () => {
    const response = await GET(new Request(`${url}?error=access_denied`));
    expect(response.headers.get("location")).toBe(
      "https://axyro-staging.netlify.app/signin?error=callback",
    );
    expect(mocks.supabaseRequest).not.toHaveBeenCalled();
  });

  it("keeps provider failures on the stable hostname", async () => {
    mocks.supabaseRequest.mockRejectedValue(new Error("Unavailable"));
    const response = await GET(new Request(`${url}?code=test-code`));
    expect(response.headers.get("location")).toBe(
      "https://axyro-staging.netlify.app/signin?error=callback",
    );
    expect(mocks.setProviderSession).not.toHaveBeenCalled();
  });
});
