// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearUserStorageIdentity,
  createBrowserUserStorage,
  initializeUserStorage,
  scopedStorageKey,
} from "./user-storage";
const key = "veyro.preferences.v1";

beforeEach(() => {
  clearUserStorageIdentity();
  localStorage.clear();
  vi.restoreAllMocks();
});

afterEach(() => vi.unstubAllGlobals());

describe("identity-owned browser persistence", () => {
  it("never adopts unattributed legacy data", async () => {
    localStorage.setItem(key, "legacy");
    await initializeUserStorage(null);
    expect(createBrowserUserStorage()?.getItem(key)).toBeNull();
    expect(localStorage.getItem(key)).toBe("legacy");
  });
  it("invalidates repositories captured by the previous identity", async () => {
    await initializeUserStorage(null);
    const guest = createBrowserUserStorage()!;
    guest.setItem(key, "guest");
    await initializeUserStorage("development-admin");
    const admin = createBrowserUserStorage()!;
    expect(admin.getItem(key)).toBeNull();
    guest.setItem(key, "stale callback");
    expect(guest.getItem(key)).toBeNull();
    expect(localStorage.getItem(scopedStorageKey(null, key))).toBe("guest");
  });
  it("does not persist personalized guest profiles or plans", async () => {
    await initializeUserStorage(null);
    const guest = createBrowserUserStorage()!;
    guest.setItem("veyro.training-plan.v1", "{}");
    guest.setItem("veyro.training-profile.v2", "{}");
    expect(guest.getItem("veyro.training-plan.v1")).toBeNull();
    expect(guest.getItem("veyro.training-profile.v2")).toBeNull();
  });
  it("hydrates only the authenticated owner's cloud data", async () => {
    const owner = "a0000000-0000-4000-8000-000000000000";
    localStorage.setItem(scopedStorageKey(owner, key), "old");
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          Response.json({
            userId: owner,
            data: { [key]: "cloud" },
            revision: 2,
          }),
        ),
    );
    await initializeUserStorage(owner);
    expect(createBrowserUserStorage()?.getItem(key)).toBe("cloud");
  });
  it("fails closed when the server reports a different user", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          Response.json({ userId: "another-owner", data: {}, revision: 1 }),
        ),
    );
    await expect(
      initializeUserStorage("a0000000-0000-4000-8000-000000000000"),
    ).rejects.toThrow("Account changed");
    expect(createBrowserUserStorage()).toBeNull();
  });
});
