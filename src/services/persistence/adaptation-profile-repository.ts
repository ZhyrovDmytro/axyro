import type { AdaptationProfile } from "@/domain/training-plan/adaptation-profile";

export interface AdaptationProfileRepository {
  load(): AdaptationProfile;
  save(profile: AdaptationProfile): AdaptationProfile;
  clear(): void;
}
