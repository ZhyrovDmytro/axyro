import type { StorageLike } from "./storage";

export const userStorageChangedEvent = "axyro:user-storage-changed";
export const userDataKeys = [
  "veyro.training-profile.v2",
  "veyro.training-plan.v1",
  "veyro.workout-activity.v1",
  "veyro.active-workout.v1",
  "veyro.preferences.v1",
  "veyro.adaptation-profile.v1",
] as const;
export type UserDataSnapshot = Partial<
  Record<(typeof userDataKeys)[number], string>
>;
let identity: string | null | undefined;
let generation = 0;
let syncQueue = Promise.resolve();
let syncTimer: ReturnType<typeof setTimeout> | undefined;
let syncEnabled = false;
let revision = 0;
let pendingSync: (() => void) | undefined;
let syncFailure: "failed" | "conflict" | null = null;

function browserStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}
export function scopedStorageKey(userId: string | null, key: string) {
  return `veyro.owner.${encodeURIComponent(userId ?? "guest")}.${key}`;
}
function notify() {
  if (typeof window !== "undefined")
    window.dispatchEvent(new Event(userStorageChangedEvent));
}
export function clearUserStorageIdentity() {
  generation += 1;
  identity = undefined;
  syncEnabled = false;
  clearTimeout(syncTimer);
  pendingSync = undefined;
  syncFailure = null;
  notify();
}
function snapshot(storage: Storage, userId: string): UserDataSnapshot {
  const data: UserDataSnapshot = {};
  for (const key of userDataKeys) {
    const value = storage.getItem(scopedStorageKey(userId, key));
    if (value !== null) data[key] = value;
  }
  return data;
}
function scheduleSync(storage: Storage, userId: string, version: number) {
  clearTimeout(syncTimer);
  pendingSync = () => {
    pendingSync = undefined;
    const data = snapshot(storage, userId);
    syncQueue = syncQueue
      .catch(() => undefined)
      .then(async () => {
        if (generation !== version || identity !== userId || !syncEnabled)
          return;
        try {
          const body = JSON.stringify({ userId, data, revision });
          const response = await fetch("/api/user-data", {
            method: "PUT",
            // Browsers cap keepalive request bodies at 64 KiB.
            keepalive: new Blob([body]).size <= 60_000,
            headers: { "Content-Type": "application/json" },
            body,
          });
          if (response.status === 409 && generation === version) {
            syncEnabled = false;
            syncFailure = "conflict";
          }
          if (!response.ok) throw new Error("Cloud save failed");
          const saved = (await response.json()) as { revision: number };
          if (generation === version) {
            revision = saved.revision;
            syncFailure = null;
            window.dispatchEvent(new Event("axyro:sync-success"));
          }
        } catch {
          // Keep the isolated local copy; a subsequent write retries synchronization.
          if (generation === version) {
            syncFailure ??= "failed";
            window.dispatchEvent(new Event("axyro:sync-error"));
          }
        }
      });
  };
  syncTimer = setTimeout(() => pendingSync?.(), 300);
}

export async function flushUserStorage() {
  clearTimeout(syncTimer);
  pendingSync?.();
  await syncQueue;
}

export async function retryUserStorageSync(): Promise<
  "saved" | "failed" | "conflict"
> {
  const storage = browserStorage();
  const version = generation;
  if (!storage || !identity) return "failed";
  if (syncFailure === "conflict") return "conflict";
  if (!syncEnabled) return "failed";
  scheduleSync(storage, identity, version);
  await flushUserStorage();
  return generation === version ? (syncFailure ?? "saved") : "failed";
}

export async function confirmTrainingPlanSave(
  owner: string,
  written: string,
  previous: string | null,
) {
  if (owner === "development-admin" && identity === owner) return;
  const storage = browserStorage();
  const version = generation;
  if (!storage || identity !== owner) throw new Error("Account changed.");
  const key = scopedStorageKey(owner, "veyro.training-plan.v1");
  const result = await retryUserStorageSync();
  if (result === "saved" && storage.getItem(key) === written) return;

  if (generation === version && storage.getItem(key) === written) {
    if (previous === null) storage.removeItem(key);
    else storage.setItem(key, previous);
    notify();
  }
  throw new Error(
    result === "conflict"
      ? "Training data changed in another tab or device. Reload before saving."
      : "Could not save your plan to your account. Please try again.",
  );
}

/** Factories capture their owner, so stale callbacks cannot write to a new account. */
export function createBrowserUserStorage(
  expectedOwner?: string,
): StorageLike | null {
  const storage = browserStorage();
  if (
    !storage ||
    identity === undefined ||
    (expectedOwner !== undefined && identity !== expectedOwner)
  )
    return null;
  const owner = identity;
  const version = generation;
  const allowed = (key: string) =>
    owner !== null ||
    ![
      "veyro.training-profile.v2",
      "veyro.training-plan.v1",
      "veyro.adaptation-profile.v1",
    ].includes(key);
  return {
    getItem(key) {
      if (generation !== version || !allowed(key)) return null;
      return storage.getItem(scopedStorageKey(owner, key));
    },
    setItem(key, value) {
      if (generation !== version || !allowed(key)) return;
      const scopedKey = scopedStorageKey(owner, key);
      if (storage.getItem(scopedKey) === value) return;
      storage.setItem(scopedKey, value);
      notify();
      if (owner && syncEnabled) scheduleSync(storage, owner, version);
    },
    removeItem(key) {
      if (generation !== version || !allowed(key)) return;
      storage.removeItem(scopedStorageKey(owner, key));
      notify();
      if (owner && syncEnabled) scheduleSync(storage, owner, version);
    },
  };
}

export async function initializeUserStorage(userId: string | null) {
  clearUserStorageIdentity();
  const version = generation;
  const storage = browserStorage();
  if (storage && userId && userId !== "development-admin") {
    // Never claim unscoped legacy data: a shared browser cannot prove its owner.
    const response = await fetch("/api/user-data", { cache: "no-store" });
    if (!response.ok)
      throw new Error("Could not load your training data. Please retry.");
    const result = (await response.json()) as {
      userId: string;
      data: UserDataSnapshot | null;
      revision: number;
    };
    if (generation !== version) return;
    if (result.userId !== userId)
      throw new Error("Account changed while loading training data.");
    revision = result.revision;
    if (result.data) {
      for (const key of userDataKeys) {
        const value = result.data[key];
        if (typeof value === "string")
          storage.setItem(scopedStorageKey(userId, key), value);
        else storage.removeItem(scopedStorageKey(userId, key));
      }
    }
  }
  if (generation !== version) return;
  identity = userId;
  syncEnabled = Boolean(userId && userId !== "development-admin");
  notify();
}

/** Remove this account's cache after server-confirmed account deletion. */
export function removeUserStorage(userId: string) {
  const storage = browserStorage();
  for (const key of userDataKeys)
    storage?.removeItem(scopedStorageKey(userId, key));
  clearPlanDraft(userId);
  clearUserStorageIdentity();
}

export function clearPlanDraft(userId: string | null): boolean {
  try {
    const key = `veyro.plan-draft.${userId ?? "guest"}`;
    for (const suffix of [
      "",
      ".initial.step",
      ".refine.step",
      ".preview",
      ".balanced",
      ".refinement",
      ".adjustment",
      ".adjustment.duration",
      ".refinement.refine.step",
    ]) {
      window.sessionStorage.removeItem(key + suffix);
    }
    return true;
  } catch {
    return false;
  }
}
