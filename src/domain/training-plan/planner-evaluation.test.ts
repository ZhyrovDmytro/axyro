import { describe, expect, it } from "vitest";

import { exercises } from "@/content/exercises";
import { sportExerciseProfiles } from "@/content/sport-exercise-profiles";

import { representativeAthleteProfiles } from "./evaluation-profiles";
import { generateTrainingPlan } from "./generate-training-plan";
import { assessTrainingPlanQuality } from "./plan-quality";
import { getSessionDurationToleranceSeconds } from "@/domain/workout/session-duration";

describe("representative planner profiles", () => {
  it("schedules the curated catalog across finalized 60-day blocks", () => {
    const usage = new Map<
      string,
      {
        sections: Record<"warmup" | "main" | "cooldown", number>;
        example: string;
      }
    >();
    const rotations: string[] = [];
    const openingWeeks: string[] = [];
    representativeAthleteProfiles.forEach((profile, index) => {
      const plan = generateTrainingPlan(profile, new Date(2026, 8, 28, 12));
      const weeks = new Map<number, Set<string>>();
      const block = new Set<string>();
      for (const session of plan.sessions) {
        if ((index === 2 || index === 5) && session.weekNumber === 1) {
          openingWeeks.push(
            `P${index + 1} ${session.scheduledDate}: ${session.workout.items.map(({ exerciseId }) => exerciseId).join(", ")}`,
          );
        }
        const week = weeks.get(session.weekNumber) ?? new Set<string>();
        weeks.set(session.weekNumber, week);
        for (const section of session.sections) {
          for (const { exerciseId } of section.items) {
            block.add(exerciseId);
            week.add(exerciseId);
            const entry = usage.get(exerciseId) ?? {
              sections: { warmup: 0, main: 0, cooldown: 0 },
              example: `P${index + 1}, W${session.weekNumber}, ${session.scheduledDate}, ${section.type}`,
            };
            entry.sections[section.type] += 1;
            usage.set(exerciseId, entry);
          }
        }
      }
      rotations.push(
        `P${index + 1} | ${block.size} | ${[...weeks.values()].map((week) => week.size).join(", ")}`,
      );
    });
    if (process.env.REPORT_PLANNER_COVERAGE === "1") {
      console.log(
        [...usage.entries()]
          .sort()
          .map(
            ([id, { sections, example }]) =>
              `| ${id} | ${sections.warmup} / ${sections.main} / ${sections.cooldown} | ${example} |`,
          )
          .join("\n"),
      );
      console.log(rotations.map((row) => `| ${row} |`).join("\n"));
      console.log(openingWeeks.join("\n"));
    }
    expect(
      exercises.map(({ id }) => id).filter((id) => !usage.has(id)),
    ).toEqual([]);
  });

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
