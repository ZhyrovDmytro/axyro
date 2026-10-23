import { describe, expect, it } from "vitest";

import {
  deleteAllUserData,
  resetTrainingPlanData,
  axyroUserDataStorageKeys,
} from "./user-data-service";

function memoryStorage() {
  const values = new Map<string, string>(
    axyroUserDataStorageKeys.map((key) => [key, JSON.stringify({})]),
  );
  return {
    values,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  };
}

describe("user data service", () => {
  it("deletes every Axyro user-data key", () => {
    const storage = memoryStorage();

    expect(deleteAllUserData(storage)).toBe(true);
    expect(storage.values.size).toBe(0);
  });

  it("resets the plan without deleting profile or preferences", () => {
    const storage = memoryStorage();

    expect(
      resetTrainingPlanData(storage, new Date("2026-10-02T12:00:00.000Z")),
    ).toBe(true);
    expect(storage.values.has("veyro.training-plan.v1")).toBe(false);
    expect(storage.values.has("veyro.active-workout.v1")).toBe(false);
    expect(storage.values.has("veyro.training-profile.v2")).toBe(true);
    expect(storage.values.has("veyro.preferences.v1")).toBe(true);
  });

  it("attempts every deletion and reports blocked storage", () => {
    const attempted: string[] = [];
    const storage = {
      getItem: () => null,
      setItem: () => undefined,
      removeItem: (key: string) => {
        attempted.push(key);
        if (key === "veyro.training-plan.v1") throw new Error("blocked");
      },
    };

    expect(deleteAllUserData(storage)).toBe(false);
    expect(attempted).toEqual(axyroUserDataStorageKeys);
  });
});
