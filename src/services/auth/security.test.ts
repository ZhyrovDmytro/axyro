import { afterEach, describe, it, expect, vi } from "vitest";
import {
  developmentAdminEnabled,
  safeNext,
  assertSameOrigin,
} from "./security";
describe("authentication security boundaries", () => {
  afterEach(() => vi.unstubAllEnvs());
  it("accepts the actual loopback host when Next normalizes development URLs", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("APP_URL", "https://axyro.app");
    const request = new Request("http://localhost:3000/api/auth/signin", {
      headers: { origin: "http://127.0.0.1:3000", host: "127.0.0.1:3000" },
    });
    expect(() => assertSameOrigin(request)).not.toThrow();
    for (const headers of [
      { origin: "http://127.0.0.1:3001", host: "127.0.0.1:3001" },
      { origin: "https://127.0.0.1:3000", host: "127.0.0.1:3000" },
      { origin: "http://evil.test:3000", host: "evil.test:3000" },
      { origin: "http://127.0.0.1:3000", host: "localhost:3000" },
    ]) {
      expect(() =>
        assertSameOrigin(new Request(request.url, { headers })),
      ).toThrow();
    }
    vi.stubEnv("NODE_ENV", "production");
    expect(() => assertSameOrigin(request)).toThrow();
  });
  it("never enables development admin in production", () => {
    expect(developmentAdminEnabled("production")).toBe(false);
    expect(developmentAdminEnabled("development")).toBe(true);
    expect(developmentAdminEnabled("test")).toBe(true);
  });
  it("uses the configured public origin behind a production deployment proxy", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("APP_URL", "https://axyro-staging.netlify.app");
    const url =
      "https://deploy-id--axyro-staging.netlify.app/api/billing/checkout";
    expect(() =>
      assertSameOrigin(
        new Request(url, {
          headers: { origin: "https://axyro-staging.netlify.app" },
        }),
      ),
    ).not.toThrow();
    for (const origin of [
      "https://evil.test",
      "https://axyro.app",
      "https://deploy-id--axyro-staging.netlify.app",
      "http://axyro-staging.netlify.app",
    ]) {
      expect(() =>
        assertSameOrigin(new Request(url, { headers: { origin } })),
      ).toThrow();
    }
    expect(() => assertSameOrigin(new Request(url))).toThrow();
  });
  it("rejects external and ambiguous callback destinations", () => {
    for (const path of [
      "https://attacker.test",
      "//attacker.test",
      "/\\attacker.test",
      "/\nfoo",
    ])
      expect(safeNext(path)).toBe("/");
    expect(safeNext("/plan/setup?resume=1")).toBe("/plan/setup?resume=1");
  });
  it("requires a matching request origin for mutations", () => {
    expect(() =>
      assertSameOrigin(
        new Request("https://axyro.test/api/auth/logout", {
          headers: { origin: "https://evil.test" },
        }),
      ),
    ).toThrow();
    expect(() =>
      assertSameOrigin(new Request("https://axyro.test/api/auth/logout")),
    ).toThrow();
    expect(() =>
      assertSameOrigin(
        new Request("https://axyro.test/api/auth/logout", {
          headers: { origin: "https://axyro.test" },
        }),
      ),
    ).not.toThrow();
  });
});
