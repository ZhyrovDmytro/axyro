import { describe, expect, it } from "vitest";
import { hasEntitlement, type Subscription } from "./entitlements";
const now = Date.parse("2026-10-17T12:00:00Z");
const paid: Subscription = {
  status: "active",
  expiresAt: "2026-10-18T12:00:00Z",
  cancelAtPeriodEnd: false,
};
describe("trusted Pro entitlement", () => {
  it("requires identity and grants admins access independently of billing", () => {
    expect(hasEntitlement(null, paid, "pro", now)).toBe(false);
    expect(hasEntitlement({ role: "admin" }, null, "pro", now)).toBe(true);
    expect(hasEntitlement({ role: "user" }, null, "pro", now)).toBe(false);
  });
  it("retains paid access on cancellation and expires at the exact boundary", () => {
    expect(
      hasEntitlement(
        { role: "user" },
        { ...paid, cancelAtPeriodEnd: true },
        "pro",
        now,
      ),
    ).toBe(true);
    expect(
      hasEntitlement(
        { role: "user" },
        { ...paid, status: "canceled", cancelAtPeriodEnd: true },
        "pro",
        now,
      ),
    ).toBe(true);
    expect(
      hasEntitlement(
        { role: "user" },
        paid,
        "pro",
        Date.parse(paid.expiresAt!),
      ),
    ).toBe(false);
  });
  it("fails closed for incomplete, delinquent, invalid and undated subscriptions", () => {
    for (const status of [
      "canceled",
      "free",
      "past_due",
      "unpaid",
      "incomplete",
      "incomplete_expired",
      "paused",
    ] as const)
      expect(
        hasEntitlement({ role: "user" }, { ...paid, status }, "pro", now),
      ).toBe(false);
    expect(
      hasEntitlement(
        { role: "user" },
        { ...paid, expiresAt: null },
        "pro",
        now,
      ),
    ).toBe(false);
    expect(
      hasEntitlement(
        { role: "user" },
        { ...paid, expiresAt: "invalid" },
        "pro",
        now,
      ),
    ).toBe(false);
  });
});
