import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { supabaseRequest } from "@/services/auth/server";
import { enforceAuthRateLimit, enforceRateLimit } from "./rate-limit";

vi.mock("@/services/auth/server", () => ({ supabaseRequest: vi.fn() }));
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("SUPABASE_SECRET_KEY", "test-server-secret");
  vi.stubEnv("APP_URL", "https://axyro.app");
  vi.stubEnv("SITE_ID", "");
});
afterEach(() => vi.unstubAllEnvs());

describe("shared request quotas", () => {
  it("requires the platform IP and rejects generic forwarded headers", async () => {
    vi.stubEnv("SITE_ID", "test-netlify-site");
    const request = new Request("https://axyro.app", {
      headers: { "x-forwarded-for": "1.2.3.4" },
    });
    expect(
      (await enforceAuthRateLimit(request, "auth-signin", "player@example.com"))
        ?.status,
    ).toBe(503);
    expect(supabaseRequest).not.toHaveBeenCalled();
    vi.stubEnv("SITE_ID", "");
    expect(
      (
        await enforceAuthRateLimit(
          new Request(request, {
            headers: { "x-nf-client-connection-ip": "1.2.3.4" },
          }),
          "auth-signin",
          "player@example.com",
        )
      )?.status,
    ).toBe(503);
    expect(supabaseRequest).not.toHaveBeenCalled();
  });

  it("limits both the connecting client and the client/email pair", async () => {
    vi.stubEnv("SITE_ID", "test-netlify-site");
    vi.mocked(supabaseRequest).mockResolvedValue(0);
    const request = new Request("https://axyro.app", {
      headers: { "x-nf-client-connection-ip": "1.2.3.4" },
    });
    expect(
      await enforceAuthRateLimit(request, "auth-signin", "player@example.com"),
    ).toBeNull();
    expect(supabaseRequest).toHaveBeenCalledTimes(2);
    const bodies = vi
      .mocked(supabaseRequest)
      .mock.calls.map((call) => call[1]?.body);
    expect(bodies[0]).toMatchObject({
      p_bucket: expect.stringMatching(/^auth-client:/),
      p_max_requests: 30,
    });
    expect(bodies[1]).toMatchObject({
      p_bucket: expect.stringMatching(/^auth-signin:/),
      p_max_requests: 10,
    });
    await enforceAuthRateLimit(
      new Request(request, {
        headers: { "x-nf-client-connection-ip": "5.6.7.8" },
      }),
      "auth-signin",
      "player@example.com",
    );
    expect(vi.mocked(supabaseRequest).mock.calls[3][1]?.body).not.toEqual(
      bodies[1],
    );
  });

  it("stops rotating target emails when the client quota is exhausted", async () => {
    vi.stubEnv("SITE_ID", "test-netlify-site");
    vi.mocked(supabaseRequest).mockResolvedValue(120);
    const request = new Request("https://axyro.app", {
      headers: { "x-nf-client-connection-ip": "1.2.3.4" },
    });
    expect(
      (await enforceAuthRateLimit(request, "auth-signup", "new@example.com"))
        ?.status,
    ).toBe(429);
    expect(supabaseRequest).toHaveBeenCalledOnce();
  });
  it("uses privileged atomic counters without sending the raw subject", async () => {
    vi.mocked(supabaseRequest).mockResolvedValue(0);
    expect(
      await enforceRateLimit("auth-signin", "Player@example.com"),
    ).toBeNull();
    expect(supabaseRequest).toHaveBeenCalledWith(
      "rest/v1/rpc/consume_api_rate_limit",
      {
        admin: true,
        method: "POST",
        body: {
          p_bucket: expect.stringMatching(/^auth-signin:[a-f0-9]{64}$/),
          p_max_requests: 10,
          p_window_seconds: 900,
        },
      },
    );
    const first = vi.mocked(supabaseRequest).mock.calls[0][1]?.body;
    await enforceRateLimit("auth-signin", "player@EXAMPLE.com");
    expect(vi.mocked(supabaseRequest).mock.calls[1][1]?.body).toEqual(first);
    vi.stubEnv("APP_URL", "https://axyro-staging.netlify.app");
    await enforceRateLimit("auth-signin", "player@example.com");
    expect(vi.mocked(supabaseRequest).mock.calls[2][1]?.body).not.toEqual(
      first,
    );
  });

  it("returns 429 and an actionable retry duration when exhausted", async () => {
    vi.mocked(supabaseRequest).mockResolvedValue(120);
    const response = await enforceRateLimit("planner", "verified-user-id");
    expect(response?.status).toBe(429);
    expect(response?.headers.get("retry-after")).toBe("120");
    expect(response?.headers.get("cache-control")).toBe("no-store");
  });

  it.each([null, -1, "0", 1.5, 90000])(
    "fails closed for invalid counter response %s",
    async (value) => {
      vi.mocked(supabaseRequest).mockResolvedValue(value);
      expect((await enforceRateLimit("billing", "user-id"))?.status).toBe(503);
    },
  );

  it("fails closed when the migration or server credential is unavailable", async () => {
    vi.mocked(supabaseRequest).mockRejectedValue(new Error("Missing RPC"));
    expect((await enforceRateLimit("billing", "user-id"))?.status).toBe(503);
    vi.stubEnv("SUPABASE_SECRET_KEY", "");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    vi.mocked(supabaseRequest).mockClear();
    expect((await enforceRateLimit("billing", "user-id"))?.status).toBe(503);
    expect(supabaseRequest).not.toHaveBeenCalled();
  });

  it("does not require hosted counters for local development", async () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(await enforceRateLimit("billing", "development-admin")).toBeNull();
    expect(supabaseRequest).not.toHaveBeenCalled();
  });
});
