import { describe, it, expect } from "vitest";
import {
  developmentAdminEnabled,
  safeNext,
  assertSameOrigin,
} from "./security";
describe("authentication security boundaries", () => {
  it("never enables development admin in production", () => {
    expect(developmentAdminEnabled("production")).toBe(false);
    expect(developmentAdminEnabled("development")).toBe(true);
    expect(developmentAdminEnabled("test")).toBe(true);
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
