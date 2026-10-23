import { describe, expect, it } from "vitest";

import {
  LocalPreferencesRepository,
  preferencesStorageKey,
} from "./local-preferences-repository";
import { defaultUserPreferences } from "./preferences-repository";
import type { StorageLike } from "./storage";

function createMemoryStorage(): StorageLike & { values: Map<string, string> } {
  const values = new Map<string, string>();
  return {
    values,
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
}

describe("LocalPreferencesRepository", () => {
  it("persists audio, cadence, screen and effort preferences", () => {
    const storage = createMemoryStorage();
    const repository = new LocalPreferencesRepository(storage);

    repository.save({ audioEnabled: false });
    repository.save({ preferredIntensity: "challenging" });
    repository.save({ guidanceCadence: "slower", keepScreenAwake: false });

    expect(repository.load()).toEqual({
      audioEnabled: false,
      guidanceCadence: "slower",
      keepScreenAwake: false,
      preferredIntensity: "challenging",
    });
  });

  it("migrates preferences saved before cadence and wake lock settings", () => {
    const storage = createMemoryStorage();
    storage.values.set(
      preferencesStorageKey,
      JSON.stringify({ audioEnabled: false, preferredIntensity: "light" }),
    );

    expect(new LocalPreferencesRepository(storage).load()).toEqual({
      audioEnabled: false,
      guidanceCadence: "normal",
      keepScreenAwake: true,
      preferredIntensity: "light",
    });
  });

  it("falls back when stored data is malformed", () => {
    const storage = createMemoryStorage();
    storage.values.set(preferencesStorageKey, "not-json");

    expect(new LocalPreferencesRepository(storage).load()).toEqual(
      defaultUserPreferences,
    );
  });

  it("does not throw when browser storage is unavailable", () => {
    const storage: StorageLike = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    };
    const repository = new LocalPreferencesRepository(storage);

    expect(repository.load()).toEqual(defaultUserPreferences);
    expect(() => repository.save({ audioEnabled: false })).not.toThrow();
  });
});
