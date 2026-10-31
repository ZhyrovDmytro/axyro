import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { authConfigured, getAuthSession, supabaseRequest } from "./server";
import { cookies } from "next/headers";

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

describe("production owner access", () => {
  const id = "123e4567-e89b-42d3-a456-426614174000";
  const profile = { display_name: "Owner", avatar_url: null, role: "user" };

  async function signIn(
    email: string,
    confirmed: boolean,
    role = "user",
    grantSucceeds = true,
  ) {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");
    vi.stubEnv("SUPABASE_SECRET_KEY", "sb_secret_test");
    vi.mocked(cookies).mockResolvedValue({
      get: (name: string) =>
        name === "axyro-access" ? { value: "verified-token" } : undefined,
    } as unknown as Awaited<ReturnType<typeof cookies>>);
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        Response.json({
          id,
          email,
          email_confirmed_at: confirmed ? "2026-10-31T12:00:00+00:00" : null,
          user_metadata: { email: "dmytrozhyrov@gmail.com", role: "admin" },
        }),
      )
      .mockResolvedValueOnce(Response.json([{ ...profile, role }]))
      .mockResolvedValueOnce(
        grantSucceeds
          ? Response.json([{ ...profile, role: "admin" }])
          : Response.json({ error: "Unavailable" }, { status: 503 }),
      );
    return getAuthSession({ refresh: false });
  }

  it.each(["dmytrozhyrov@gmail.com", "DmytroZhyrov@Gmail.com"])(
    "grants verified %s full access through its database role",
    async (email) => {
      const session = await signIn(email, true);
      expect(session?.user).toMatchObject({
        id,
        role: "admin",
        isDevelopmentAdmin: false,
      });
      expect(vi.mocked(fetch).mock.calls[2]).toEqual([
        `https://example.supabase.co/rest/v1/profiles?user_id=eq.${id}`,
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({ role: "admin" }),
        }),
      ]);
      expect(
        new Headers(vi.mocked(fetch).mock.calls[2][1]?.headers).get("apikey"),
      ).toBe("sb_secret_test");
    },
  );

  it.each([
    ["dmytrozhyrov@gmail.com", false],
    ["someone@example.com", true],
    ["dmytrozhyrov+test@gmail.com", true],
  ] as const)(
    "does not elevate %s with confirmed=%s, even with owner metadata",
    async (email, confirmed) => {
      expect((await signIn(email, confirmed))?.user.role).toBe("user");
      expect(fetch).toHaveBeenCalledTimes(2);
    },
  );

  it("does not rewrite an existing owner admin role", async () => {
    expect(
      (await signIn("dmytrozhyrov@gmail.com", true, "admin"))?.user.role,
    ).toBe("admin");
    expect(fetch).toHaveBeenCalledTimes(2);
  });
  it("does not grant access when the database role update fails", async () => {
    expect(
      await signIn("dmytrozhyrov@gmail.com", true, "user", false),
    ).toBeNull();
    expect(fetch).toHaveBeenCalledTimes(3);
  });
});

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
