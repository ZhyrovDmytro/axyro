import { describe, expect, it } from "vitest";

import { exercises } from "@/content/exercises";
import type { Exercise } from "@/domain/exercise/exercise.types";
import {
  calculateSessionSectionDuration,
  flattenSessionSections,
  getSessionSection,
  getSessionSectionDurationBudget,
} from "@/domain/workout/session-sections";

import { generateTrainingPlan } from "./generate-training-plan";
import {
  applyTodayAdaptationsToSession,
  deriveTodayAdaptedSession,
  getReplacementCandidates,
  resetTodayAdaptations,
} from "./today-adaptation";
import type { AthleteProfile, PlannedWorkout } from "./training-plan.types";

const profile: AthleteProfile = {
  sport: "padel",
  experience: "intermediate",
  sessionsPerWeek: 3,
  sessionDurationMinutes: 20,
  preferredDays: ["monday", "wednesday", "friday"],
  equipment: ["bodyweight", "one-dumbbell", "two-dumbbells"],
  goals: ["power", "injury-resilience"],
  developmentAreas: [],
  padelLimitations: ["weak-core-rotation", "weak-overhead-control"],
  painAreas: [],
  matches: [],
};

function generatedSession(
  sourceWorkoutId: string,
  phase?: PlannedWorkout["progressionPhase"],
) {
  const plan = generateTrainingPlan(profile, new Date(2026, 8, 28, 12));
  const session = plan.sessions.find(
    (candidate) =>
      candidate.sourceWorkoutId === sourceWorkoutId &&
      (!phase || candidate.progressionPhase === phase),
  );
  expect(session).toBeDefined();
  return session!;
}

function exercise(exerciseId: string) {
  const match = exercises.find((candidate) => candidate.id === exerciseId);
  expect(match).toBeDefined();
  return match!;
}

function cloneExercise(
  source: Exercise,
  id: string,
  changes: Partial<Exercise> = {},
): Exercise {
  return {
    ...source,
    ...changes,
    id,
    slug: id,
    name: id,
  };
}

describe("today session adaptation", () => {
  it("fits a 20-minute session close to 15 minutes without truncating an exercise", () => {
    const session = generatedSession("generated-session-1");

    const result = deriveTodayAdaptedSession({
      session,
      adaptations: [{ type: "less_time", requestedDurationSeconds: 15 * 60 }],
      exerciseCatalog: exercises,
    });

    expect(result.targetDurationSeconds).toBe(15 * 60);
    expect(Math.abs(result.durationDeltaSeconds)).toBeLessThanOrEqual(60);
    expect(result.workout.items.length).toBeGreaterThanOrEqual(2);
    expect(
      result.workout.items.every(
        (item) =>
          item.prescription.durationSeconds >=
            (item.minWorkSeconds ?? item.prescription.durationSeconds) &&
          item.prescription.durationSeconds <=
            (item.maxWorkSeconds ?? item.prescription.durationSeconds),
      ),
    ).toBe(true);
    expect(
      result.adjustments.some(
        (adjustment) =>
          adjustment.source === "today_adaptation" &&
          adjustment.type === "shortened",
      ),
    ).toBe(true);
  });

  it("preserves warm-up movements and essential session roles when shortening", () => {
    const session = generatedSession("generated-session-1");
    const warmupExerciseIds =
      getSessionSection(session.sections, "warmup")?.items.map(
        (item) => item.exerciseId,
      ) ?? [];
    const essentialExerciseIds = session.workout.items
      .filter((item) => item.role === "core")
      .map((item) => item.exerciseId);

    const result = deriveTodayAdaptedSession({
      session,
      adaptations: [{ type: "less_time", requestedDurationSeconds: 15 * 60 }],
      exerciseCatalog: exercises,
    });
    const resultIds = new Set(
      flattenSessionSections(result.sections).map((item) => item.exerciseId),
    );
    const budget = getSessionSectionDurationBudget(
      result.targetDurationSeconds,
    );
    const resultWarmup = getSessionSection(result.sections, "warmup")!;
    const resultCooldown = getSessionSection(result.sections, "cooldown")!;

    expect(warmupExerciseIds.length).toBeGreaterThan(0);
    expect(warmupExerciseIds.every((id) => resultIds.has(id))).toBe(true);
    expect(essentialExerciseIds.some((id) => resultIds.has(id))).toBe(true);
    expect(
      calculateSessionSectionDuration(resultWarmup),
    ).toBeGreaterThanOrEqual(budget.warmupMinimum);
    expect(
      calculateSessionSectionDuration(resultCooldown),
    ).toBeGreaterThanOrEqual(budget.cooldownMinimum);
  });

  it("changes only exercises requiring unavailable equipment", () => {
    const session = generatedSession("generated-session-1");
    const originalByItemId = new Map(
      session.workout.items.map((item) => [item.id, item]),
    );

    const result = deriveTodayAdaptedSession({
      session,
      adaptations: [
        { type: "equipment_unavailable", equipmentIds: ["dumbbell"] },
      ],
      exerciseCatalog: exercises,
    });

    for (const item of flattenSessionSections(result.sections)) {
      const original = originalByItemId.get(item.id);
      if (!original) continue;
      const originalExercise = exercise(original.exerciseId);
      if (!originalExercise.equipment.includes("dumbbell")) {
        expect(item).toEqual(original);
      }
      expect(exercise(item.exerciseId).equipment).not.toContain("dumbbell");
    }
  });

  it("ranks a same-role and same-goal replacement above a generic body-area match", () => {
    const source = exercise("standing-dumbbell-wood-chop");
    const semanticMatch = cloneExercise(source, "semantic-match", {
      equipment: ["none"],
    });
    const genericCoreMatch = cloneExercise(source, "generic-core-match", {
      equipment: ["none"],
      roles: ["strength"],
      qualities: ["stability"],
      targetedQualities: ["trunk-control"],
    });
    const session = generatedSession("generated-session-1");

    const candidates = getReplacementCandidates({
      exercise: source,
      session,
      exerciseCatalog: [source, genericCoreMatch, semanticMatch],
      availableEquipment: [],
      unavailableEquipment: ["dumbbell"],
    });

    expect(candidates[0].exercise.id).toBe(semanticMatch.id);
    expect(candidates[0].sharedRoles.length).toBeGreaterThan(0);
    expect(candidates[0].sharedTargetedQualities.length).toBeGreaterThan(0);
    expect(candidates[0].sharedBodyAreas.length).toBeGreaterThan(0);
  });

  it("filters unavailable equipment and excluded body areas from replacements", () => {
    const source = exercise("standing-dumbbell-wood-chop");
    const safe = cloneExercise(source, "safe-match", {
      bodyAreas: ["core"],
      equipment: ["none"],
    });
    const unavailable = cloneExercise(source, "unavailable-match", {
      bodyAreas: ["core"],
      equipment: ["two_dumbbells"],
    });
    const excluded = cloneExercise(source, "excluded-match", {
      bodyAreas: ["core", "shoulders"],
      equipment: ["none"],
    });
    const session = generatedSession("generated-session-1");

    const candidates = getReplacementCandidates({
      exercise: source,
      session,
      exerciseCatalog: [source, safe, unavailable, excluded],
      availableEquipment: [],
      unavailableEquipment: ["dumbbell"],
      excludedBodyAreas: ["shoulders"],
    });

    expect(candidates.map((candidate) => candidate.exercise.id)).toEqual([
      safe.id,
    ]);
  });

  it("replaces one exercise without recalculating unrelated content", () => {
    const session = generatedSession("generated-session-1");
    const source = exercise("standing-dumbbell-wood-chop");
    const replacement = cloneExercise(source, "bodyweight-wood-chop", {
      equipment: ["none"],
    });
    const catalog = [...exercises, replacement];

    const result = deriveTodayAdaptedSession({
      session,
      adaptations: [
        {
          type: "replace_exercise",
          exerciseId: source.id,
          replacementExerciseId: replacement.id,
        },
      ],
      exerciseCatalog: catalog,
    });

    expect(
      result.workout.items.find((item) => item.exerciseId === replacement.id),
    ).toBeDefined();
    expect(
      result.workout.items.filter(
        (item) =>
          item.exerciseId !== replacement.id && item.exerciseId !== source.id,
      ),
    ).toEqual(
      session.workout.items.filter((item) => item.exerciseId !== source.id),
    );
  });

  it("keeps a selected discomfort area out of replacements and duration fitting", () => {
    const session = generatedSession("generated-session-1", "peak");

    const result = deriveTodayAdaptedSession({
      session,
      adaptations: [
        { type: "body_area_discomfort", bodyAreas: ["shoulder"] },
        { type: "less_time", requestedDurationSeconds: 15 * 60 },
      ],
      exerciseCatalog: exercises,
    });

    expect(
      flattenSessionSections(result.sections).every(
        (item) => !exercise(item.exerciseId).bodyAreas.includes("shoulders"),
      ),
    ).toBe(true);
    expect(
      result.adjustments.some(
        (adjustment) =>
          adjustment.source === "weekly_progression" &&
          adjustment.phase === "peak",
      ),
    ).toBe(true);
  });

  it("honors an existing pain-feedback block before a today duration fit", () => {
    const session = generatedSession("generated-session-2", "peak");
    const shoulderItem = session.workout.items.find((item) =>
      exercise(item.exerciseId).bodyAreas.includes("shoulders"),
    );
    expect(shoulderItem).toBeDefined();
    const safetyAdjustment = {
      source: "safety" as const,
      type: "block_progression" as const,
      exerciseId: shoulderItem!.exerciseId,
      feedbackEventId: "recent-shoulder-pain",
      affectedArea: "shoulder" as const,
    };
    const safetySession: PlannedWorkout = {
      ...session,
      adjustments: [...session.adjustments, safetyAdjustment],
      originalSessionSnapshot: {
        ...session.originalSessionSnapshot,
        adjustments: [
          ...session.originalSessionSnapshot.adjustments,
          safetyAdjustment,
        ],
      },
    };

    const result = deriveTodayAdaptedSession({
      session: safetySession,
      adaptations: [{ type: "less_time", requestedDurationSeconds: 15 * 60 }],
      exerciseCatalog: exercises,
    });

    expect(
      flattenSessionSections(result.sections).every(
        (item) => !exercise(item.exerciseId).bodyAreas.includes("shoulders"),
      ),
    ).toBe(true);
    expect(
      result.adjustments.some(
        (adjustment) =>
          adjustment.source === "safety" &&
          adjustment.feedbackEventId === "recent-shoulder-pain",
      ),
    ).toBe(true);
  });

  it("reduces today's stimulus without changing the baseline or training focus", () => {
    const session = generatedSession("generated-session-1");
    const result = deriveTodayAdaptedSession({
      session,
      adaptations: [{ type: "lighter_session" }],
      exerciseCatalog: exercises,
    });

    expect(result.estimatedDurationSeconds).toBeLessThan(
      session.originalSessionSnapshot.estimatedDurationSeconds,
    );
    expect(result.workout.focus).toEqual(
      session.originalSessionSnapshot.workout.focus,
    );
    expect(session.originalSessionSnapshot.workout).toEqual(session.workout);
    const applied = applyTodayAdaptationsToSession(
      session,
      [{ type: "lighter_session" }],
      exercises,
    );
    expect(applied.originalSessionSnapshot).toEqual(
      session.originalSessionSnapshot,
    );
  });

  it("combines less time and unavailable equipment deterministically", () => {
    const session = generatedSession("generated-session-1");
    const adaptations = [
      {
        type: "equipment_unavailable" as const,
        equipmentIds: ["dumbbell" as const],
      },
      {
        type: "less_time" as const,
        requestedDurationSeconds: 15 * 60,
      },
    ];

    const first = deriveTodayAdaptedSession({
      session,
      adaptations,
      exerciseCatalog: exercises,
    });
    const second = deriveTodayAdaptedSession({
      session,
      adaptations,
      exerciseCatalog: exercises,
    });

    expect(first).toEqual(second);
    expect(Math.abs(first.durationDeltaSeconds)).toBeLessThanOrEqual(60);
    expect(
      flattenSessionSections(first.sections).every(
        (item) => !exercise(item.exerciseId).equipment.includes("dumbbell"),
      ),
    ).toBe(true);
  });

  it("resets exactly to the immutable original prescription", () => {
    const session = generatedSession("generated-session-1");
    const adapted = applyTodayAdaptationsToSession(
      session,
      [
        { type: "lighter_session" },
        { type: "less_time", requestedDurationSeconds: 15 * 60 },
      ],
      exercises,
    );

    const reset = resetTodayAdaptations(adapted);

    expect(reset.workout).toEqual(session.originalSessionSnapshot.workout);
    expect(reset.targetDurationSeconds).toBe(
      session.originalSessionSnapshot.targetDurationSeconds,
    );
    expect(reset.adjustments).toEqual(
      session.originalSessionSnapshot.adjustments,
    );
    expect(reset.todayAdaptations).toEqual([]);
  });
});
