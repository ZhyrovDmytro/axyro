// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearUserStorageIdentity,
  createBrowserUserStorage,
  initializeUserStorage,
  scopedStorageKey,
  flushUserStorage,
  retryUserStorageSync,
  clearPlanDraft,
} from "./user-storage";
const key = "veyro.preferences.v1";

beforeEach(() => {
  clearUserStorageIdentity();
  localStorage.clear();
  vi.restoreAllMocks();
});

afterEach(() => vi.unstubAllGlobals());

describe("identity-owned browser persistence", () => {
  it("clears only the current owner's setup draft and progress", () => {
    sessionStorage.setItem("veyro.plan-draft.alice", "answers");
    sessionStorage.setItem("veyro.plan-draft.alice.initial.step", "goals");
    sessionStorage.setItem("veyro.plan-draft.alice.refine.step", "schedule");
    sessionStorage.setItem("veyro.plan-draft.bob", "other answers");
    expect(clearPlanDraft("alice")).toBe(true);
    expect(sessionStorage.getItem("veyro.plan-draft.alice")).toBeNull();
    expect(sessionStorage.getItem("veyro.plan-draft.alice.initial.step")).toBeNull();
    expect(sessionStorage.getItem("veyro.plan-draft.alice.refine.step")).toBeNull();
    expect(sessionStorage.getItem("veyro.plan-draft.bob")).toBe("other answers");
  });
  it("retries a failed save with local changes without reloading older cloud data", async () => {
    const owner = "a0000000-0000-4000-8000-000000000000";
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({ userId: owner, data: { [key]: "old" }, revision: 2 }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 503 }))
      .mockResolvedValueOnce(Response.json({ revision: 3 }));
    vi.stubGlobal("fetch", fetchMock);
    await initializeUserStorage(owner);
    const storage = createBrowserUserStorage()!;
    storage.setItem(key, "latest");
    await flushUserStorage();
    expect(await retryUserStorageSync()).toBe("saved");
    expect(storage.getItem(key)).toBe("latest");
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(JSON.parse(fetchMock.mock.calls[2][1].body)).toEqual({
      userId: owner,
      data: { [key]: "latest" },
      revision: 2,
    });
  });

  it("keeps local changes on conflict without overwriting the newer cloud version", async () => {
    const owner = "a0000000-0000-4000-8000-000000000000";
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({ userId: owner, data: {}, revision: 2 }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 409 }));
    vi.stubGlobal("fetch", fetchMock);
    await initializeUserStorage(owner);
    const storage = createBrowserUserStorage()!;
    storage.setItem(key, "latest");
    await flushUserStorage();
    expect(await retryUserStorageSync()).toBe("conflict");
    expect(storage.getItem(key)).toBe("latest");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
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
      vi.fn().mockResolvedValue(
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
