import type { AthleteProfile } from "./training-plan.types";

const experiences = ["beginner", "intermediate", "advanced"] as const;
const goals = [
  "movement-speed",
  "court-endurance",
  "power",
  "strength",
  "injury-resilience",
] as const;
const limitations = [
  "slow-first-step",
  "slow-lateral-movement",
  "weak-core-rotation",
  "poor-deceleration",
  "match-endurance",
] as const;

/**
 * Stable, non-identifying fixtures for deterministic and live-model planner
 * evaluation. Keep this set broad enough to expose duration, safety, equipment,
 * relevance, and variety regressions before changing prompts or model versions.
 */
export const representativeAthleteProfiles: AthleteProfile[] = Array.from(
  { length: 30 },
  (_, index) => {
    const sessionsPerWeek = index % 2 === 0 ? 3 : 2;
    const sport = index % 5 === 0 ? "other" : "padel";
    return {
      sport,
      experience: experiences[index % experiences.length],
      sessionsPerWeek,
      sessionDurationMinutes: [5, 10, 20][index % 3],
      preferredDays:
        sessionsPerWeek === 3
          ? ["monday", "wednesday", "friday"]
          : ["tuesday", "saturday"],
      equipment:
        index % 3 === 0
          ? ["bodyweight"]
          : index % 3 === 1
            ? ["bodyweight", "one-dumbbell"]
            : ["bodyweight", "two-dumbbells"],
      goals: [goals[index % goals.length]],
      developmentAreas: [],
      padelLimitations:
        sport === "padel" ? [limitations[index % limitations.length]] : [],
      painAreas:
        index % 11 === 0 ? ["knee"] : index % 7 === 0 ? ["shoulder"] : [],
      matches:
        sport === "padel" && index % 6 === 0
          ? [{ date: "2026-10-09", importance: "important" }]
          : [],
    } satisfies AthleteProfile;
  },
);
