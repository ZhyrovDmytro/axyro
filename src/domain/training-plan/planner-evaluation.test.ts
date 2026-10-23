import { describe, expect, it } from "vitest";

import { exercises } from "@/content/exercises";
import { sportExerciseProfiles } from "@/content/sport-exercise-profiles";

import { representativeAthleteProfiles } from "./evaluation-profiles";
import { generateTrainingPlan } from "./generate-training-plan";
import { assessTrainingPlanQuality } from "./plan-quality";
import { getSessionDurationToleranceSeconds } from "@/domain/workout/session-duration";

describe("representative planner profiles", () => {
  it("keeps 30 varied profiles within hard constraints and duration tolerances", () => {
    expect(representativeAthleteProfiles).toHaveLength(30);

    for (const profile of representativeAthleteProfiles) {
      const plan = generateTrainingPlan(profile, new Date(2026, 8, 28, 12));
      const report = assessTrainingPlanQuality({
        plan,
        exerciseCatalog: exercises,
        sportProfiles: sportExerciseProfiles,
      });
      const tolerance = getSessionDurationToleranceSeconds(
        profile.sessionDurationMinutes * 60,
      );

      if (!report.valid) {
        throw new Error(
          JSON.stringify(
            {
              profile,
              hardErrors: report.hardErrors,
              sessions: plan.sessions.slice(0, 1).map((session) => ({
                duration: session.estimatedDurationSeconds,
                target: session.targetDurationSeconds,
                focus: session.workout.focus,
                items: session.workout.items.map((item) => item.exerciseId),
              })),
              invalidItems: plan.sessions.flatMap((session) =>
                session.workout.items
                  .filter((item) =>
                    report.hardErrors.some(
                      (error) =>
                        error.sessionId === session.id &&
                        error.exerciseId === item.exerciseId,
                    ),
                  )
                  .map((item) => ({
                    sessionId: session.id,
                    item,
                    planning: exercises.find(
                      (exercise) => exercise.id === item.exerciseId,
                    )?.planning,
                  })),
              ),
            },
            null,
            2,
          ),
        );
      }

      expect(plan.sessions.length).toBeGreaterThan(0);
      expect(report.softMetrics).toHaveLength(7);
      expect(report.softScore).toBeGreaterThan(0);
      for (const session of plan.sessions) {
        expect(Math.abs(session.durationDeltaSeconds)).toBeLessThanOrEqual(
          tolerance,
        );
      }
    }
  });
});
