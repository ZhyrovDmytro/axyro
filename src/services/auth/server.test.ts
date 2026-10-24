import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { authConfigured, supabaseRequest } from "./server";

vi.mock("next/headers", () => ({ cookies: vi.fn() }));

beforeEach(() => {
  vi.stubEnv("SUPABASE_URL", "https://example.supabase.co");
  for (const key of [
    "SUPABASE_PUBLISHABLE_KEY",
    "SUPABASE_SECRET_KEY",
    "SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
  ])
    vi.stubEnv(key, "");
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({})));
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

function sentHeaders() {
  const init = vi.mocked(fetch).mock.calls[0]?.[1];
  return new Headers(init?.headers);
}

describe("Supabase API key compatibility", () => {
  it("recognizes a publishable key and sends it without bearer authorization", async () => {
    vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");
    expect(authConfigured()).toBe(true);
    await supabaseRequest("/auth/v1/settings");
    expect(sentHeaders().get("apikey")).toBe("sb_publishable_test");
    expect(sentHeaders().has("Authorization")).toBe(false);
  });

  it("uses the user's JWT with the publishable API key for owned data", async () => {
    vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");
    await supabaseRequest("/rest/v1/profiles", { token: "user-session-jwt" });
    expect(sentHeaders().get("apikey")).toBe("sb_publishable_test");
    expect(sentHeaders().get("Authorization")).toBe("Bearer user-session-jwt");
  });

  it("uses the server secret only for explicitly privileged requests", async () => {
    vi.stubEnv("SUPABASE_SECRET_KEY", "sb_secret_test");
    await expect(supabaseRequest("/rest/v1/profiles")).rejects.toThrow(
      "Authentication is not configured",
    );
    await supabaseRequest("/auth/v1/admin/users", { admin: true });
    expect(sentHeaders().get("apikey")).toBe("sb_secret_test");
    expect(sentHeaders().has("Authorization")).toBe(false);
  });

  it.each([
    ["SUPABASE_ANON_KEY", false],
    ["SUPABASE_SERVICE_ROLE_KEY", true],
  ] as const)(
    "preserves legacy JWT behavior for %s",
    async (variable, admin) => {
      vi.stubEnv(variable, "legacy-jwt");
      await supabaseRequest("/rest/v1/profiles", { admin });
      expect(sentHeaders().get("apikey")).toBe("legacy-jwt");
      expect(sentHeaders().get("Authorization")).toBe("Bearer legacy-jwt");
    },
  );
});
