import { createBrowserUserStorage } from "./user-storage";
import {
  adaptationProfileSchema,
  defaultAdaptationProfile,
  type AdaptationProfile,
} from "@/domain/training-plan/adaptation-profile";

import type { AdaptationProfileRepository } from "./adaptation-profile-repository";
import type { StorageLike } from "./storage";

export const adaptationProfileStorageKey = "veyro.adaptation-profile.v1";

export class LocalAdaptationProfileRepository implements AdaptationProfileRepository {
  constructor(private readonly storage: StorageLike | null) {}

  load(): AdaptationProfile {
    if (!this.storage) return defaultAdaptationProfile;
    try {
      const serialized = this.storage.getItem(adaptationProfileStorageKey);
      if (!serialized) return defaultAdaptationProfile;
      const result = adaptationProfileSchema.safeParse(JSON.parse(serialized));
      return result.success ? result.data : defaultAdaptationProfile;
    } catch {
      return defaultAdaptationProfile;
    }
  }

  save(profile: AdaptationProfile): AdaptationProfile {
    const validated = adaptationProfileSchema.parse(profile);
    try {
      this.storage?.setItem(
        adaptationProfileStorageKey,
        JSON.stringify(validated),
      );
    } catch {
      // The in-memory value remains valid when storage is unavailable.
    }
    return validated;
  }

  clear() {
    try {
      this.storage?.removeItem?.(adaptationProfileStorageKey);
    } catch {
      // Storage can be blocked by browser privacy settings.
    }
  }
}

export function createBrowserAdaptationProfileRepository() {
  try {
    return new LocalAdaptationProfileRepository(createBrowserUserStorage());
  } catch {
    return new LocalAdaptationProfileRepository(null);
  }
}
