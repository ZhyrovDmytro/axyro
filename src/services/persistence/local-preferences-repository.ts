import { createBrowserUserStorage } from "./user-storage";
import { z } from "zod";

import { intensityLevels } from "@/domain/workout/intensity";
import {
  defaultUserPreferences,
  type PreferencesRepository,
  type UserPreferences,
} from "@/services/persistence/preferences-repository";
import type { StorageLike } from "@/services/persistence/storage";

export const preferencesStorageKey = "veyro.preferences.v1";

const preferencesSchema = z.object({
  audioEnabled: z.boolean(),
  guidanceCadence: z.enum(["slower", "normal", "faster"]).default("normal"),
  keepScreenAwake: z.boolean().default(true),
  preferredIntensity: z.enum(intensityLevels),
});

export class LocalPreferencesRepository implements PreferencesRepository {
  constructor(private readonly storage: StorageLike | null) {}

  load(): UserPreferences {
    if (!this.storage) return defaultUserPreferences;

    try {
      const serialized = this.storage.getItem(preferencesStorageKey);
      if (!serialized) return defaultUserPreferences;

      const result = preferencesSchema.safeParse(JSON.parse(serialized));
      return result.success ? result.data : defaultUserPreferences;
    } catch {
      return defaultUserPreferences;
    }
  }

  save(update: Partial<UserPreferences>): UserPreferences {
    const preferences = { ...this.load(), ...update };

    try {
      this.storage?.setItem(preferencesStorageKey, JSON.stringify(preferences));
    } catch {
      // Browser privacy settings and storage quotas must not interrupt a workout.
    }

    return preferences;
  }
}

export function createBrowserPreferencesRepository(): PreferencesRepository {
  try {
    return new LocalPreferencesRepository(createBrowserUserStorage());
  } catch {
    return new LocalPreferencesRepository(null);
  }
}
