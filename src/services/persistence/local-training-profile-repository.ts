import { createBrowserUserStorage } from "./user-storage";
import { athleteProfileSchema } from "@/domain/training-plan/training-plan.schema";
import type { AthleteProfile } from "@/domain/training-plan/training-plan.types";
import type { StorageLike } from "./storage";

export const trainingProfileStorageKey = "veyro.training-profile.v2";

export class LocalTrainingProfileRepository {
  constructor(private readonly storage: StorageLike | null) {}

  load(): AthleteProfile | null {
    if (!this.storage) return null;
    try {
      const serialized = this.storage.getItem(trainingProfileStorageKey);
      if (!serialized) return null;
      const parsed = athleteProfileSchema.safeParse(JSON.parse(serialized));
      if (!parsed.success) return null;
      const minimized = JSON.stringify(parsed.data);
      if (minimized !== serialized) {
        try {
          this.storage.setItem(trainingProfileStorageKey, minimized);
        } catch {
          // A valid profile remains usable when a privacy setting blocks migration writes.
        }
      }
      return parsed.data;
    } catch {
      return null;
    }
  }

  save(profile: AthleteProfile) {
    const validated = athleteProfileSchema.parse(profile);
    try {
      this.storage?.setItem(
        trainingProfileStorageKey,
        JSON.stringify(validated),
      );
    } catch {
      // The in-memory onboarding flow remains usable when storage is blocked.
    }
    return validated;
  }
}

export function createBrowserTrainingProfileRepository() {
  try {
    return new LocalTrainingProfileRepository(createBrowserUserStorage());
  } catch {
    return new LocalTrainingProfileRepository(null);
  }
}
