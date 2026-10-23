import type { IntensityLevel } from "@/domain/workout/intensity";

export type UserPreferences = {
  audioEnabled: boolean;
  guidanceCadence: "slower" | "normal" | "faster";
  keepScreenAwake: boolean;
  preferredIntensity: IntensityLevel;
};

export const defaultUserPreferences: UserPreferences = {
  audioEnabled: true,
  guidanceCadence: "normal",
  keepScreenAwake: true,
  preferredIntensity: "standard",
};

export interface PreferencesRepository {
  load(): UserPreferences;
  save(update: Partial<UserPreferences>): UserPreferences;
}
