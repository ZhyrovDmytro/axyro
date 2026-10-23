import { describe, expect, it } from "vitest";

import { addDays } from "./date";
import {
  assembleMainWorkout,
  describePlanRebalance,
  generateSessionPrescription,
  generateTrainingPlan,
  normalizeScheduledExerciseFlow,
  rebalancePlanAroundGames,
  UnsupportedPlanDurationError,
} from "./generate-training-plan";
import { workouts } from "@/content/workouts";
import { exercises } from "@/content/exercises";
import { sportExerciseProfiles } from "@/content/sport-exercise-profiles";
import { createWorkoutSessionSnapshot } from "@/domain/workout/create-workout-session-snapshot";
import type { WorkoutFeedbackEvent } from "@/services/persistence/workout-activity-repository";
import type { AthleteProfile } from "./training-plan.types";
import { getSessionDurationToleranceSeconds } from "@/domain/workout/session-duration";
import { exerciseMatchesDevelopmentArea } from "./profile-relevance";

const profile: AthleteProfile = {
  sport: "padel",
  experience: "intermediate",
  sessionsPerWeek: 3,
  sessionDurationMinutes: 20,
  preferredDays: ["monday", "wednesday", "friday"],
  equipment: ["bodyweight", "one-dumbbell"],
  goals: ["power", "injury-resilience"],
  developmentAreas: [],
  padelLimitations: ["weak-core-rotation", "slow-first-step"],
  painAreas: [],
  matches: [],
};

describe("generateTrainingPlan", () => {
  it("turns normalized questionnaire matches into actionable plan events", () => {
    const plan = generateTrainingPlan(
      {
        ...profile,
        matches: [{ date: "2026-10-09", importance: "normal" }],
      },
      new Date(2026, 8, 28, 12),
    );

    expect(plan.games).toEqual([
      {
        id: "game-2026-10-09",
        date: "2026-10-09",
        label: "Padel match",
        importance: "normal",
      },
    ]);
    expect(
      plan.sessions.some((session) =>
        ["2026-10-08", "2026-10-09"].includes(session.scheduledDate),
      ),
    ).toBe(false);
  });

  it("creates 60 days on the athlete's preferred days", () => {
    const plan = generateTrainingPlan(profile, new Date(2026, 8, 28, 12));

    expect(plan.startDate).toBe("2026-09-28");
    expect(plan.endDate).toBe("2026-11-26");
    expect(plan.sessions).toHaveLength(26);
    expect(
      plan.sessions.every((session) =>
        [1, 3, 5].includes(
          new Date(`${session.scheduledDate}T12:00:00`).getDay(),
        ),
      ),
    ).toBe(true);
    expect(plan.sessions[0].workout.id).toBe("generated-session-1");
    expect(plan.sessions[0].sourceWorkoutId).toBe("generated-session-1");
  });

  it("covers every selected development area and padel capacity foundation each week", () => {
    const focusedProfile: AthleteProfile = {
      ...profile,
      sessionsPerWeek: 2,
      preferredDays: ["tuesday", "saturday"],
      developmentAreas: ["shoulders-upper-back", "elbow-forearm-grip"],
      padelLimitations: ["limited-bandeja-vibora-rotation", "weak-grip"],
    };
    const plan = generateTrainingPlan(
      focusedProfile,
      new Date(2026, 8, 28, 12),
    );
    const exerciseById = new Map(
      exercises.map((exercise) => [exercise.id, exercise]),
    );
    const profileByExerciseId = new Map(
      sportExerciseProfiles.map((sportProfile) => [
        sportProfile.exerciseId,
        sportProfile,
      ]),
    );

    expect(
      plan.sessions
        .filter((session) => session.weekNumber === 1)
        .map((session) => session.workout.name),
    ).toEqual(["Rotation & Stability", "Strength & Endurance"]);
    expect(
      plan.sessions
        .filter((session) => session.weekNumber === 1)
        .map((session) => session.workout.shortDescription),
    ).toEqual([
      "Supports stronger bandeja and víbora rotation.",
      "Supports steadier racket control.",
    ]);
    expect(
      plan.sessions
        .filter((session) => session.weekNumber === 2)
        .map((session) => session.workout.shortDescription),
    ).toEqual([
      "Builds shoulder and upper-back strength.",
      "Builds grip and forearm capacity.",
    ]);

    for (const weekNumber of [1, 2, 3, 4, 5, 6, 7, 8] as const) {
      const weekExercises = plan.sessions
        .filter((session) => session.weekNumber === weekNumber)
        .flatMap((session) => session.workout.items)
        .flatMap((item) => {
          const exercise = exerciseById.get(item.exerciseId);
          return exercise ? [exercise] : [];
        });

      for (const area of focusedProfile.developmentAreas) {
        expect(
          weekExercises.some((exercise) =>
            exerciseMatchesDevelopmentArea(
              area,
              exercise,
              profileByExerciseId.get(exercise.id),
            ),
          ),
        ).toBe(true);
      }
      expect(
        weekExercises.some(
          (exercise) =>
            profileByExerciseId.get(exercise.id)?.trainingFunction ===
            "capacity",
        ),
      ).toBe(true);
    }
  });

  it("does not rank an assigned padel priority into every weekly slot", () => {
    const focusedProfile: AthleteProfile = {
      ...profile,
      sessionsPerWeek: 3,
      goals: ["strength"],
      developmentAreas: [],
      padelLimitations: ["slow-net-approach"],
    };
    const sportProfileByExerciseId = new Map(
      sportExerciseProfiles.map((sportProfile) => [
        sportProfile.exerciseId,
        sportProfile,
      ]),
    );
    const workouts = Array.from({ length: 3 }, (_, slot) =>
      assembleMainWorkout({ profile: focusedProfile, slot }),
    );
    const addressesNetApproach = (
      workout: NonNullable<(typeof workouts)[number]>,
    ) =>
      workout.items.some((item) =>
        sportProfileByExerciseId
          .get(item.exerciseId)
          ?.problemsAddressed.includes("slow-net-approach"),
      );

    expect(workouts[0] && addressesNetApproach(workouts[0])).toBe(true);
    expect(
      workouts
        .slice(1)
        .every((workout) => workout && !addressesNetApproach(workout)),
    ).toBe(true);
  });

  it("keeps bodyweight-only plans free of dumbbell workouts", () => {
    const plan = generateTrainingPlan(
      { ...profile, equipment: ["bodyweight"] },
      new Date(2026, 8, 28, 12),
    );
    const exerciseById = new Map(
      exercises.map((exercise) => [exercise.id, exercise]),
    );
    expect(
      plan.sessions.every((session) =>
        session.workout.items.every((item) =>
          exerciseById
            .get(item.exerciseId)
            ?.equipment.every((equipment) => equipment === "none"),
        ),
      ),
    ).toBe(true);
  });

  it("avoids workouts that load a reported pain area", () => {
    const exerciseById = new Map(
      exercises.map((exercise) => [exercise.id, exercise]),
    );
    const shoulderSafe = generateTrainingPlan(
      { ...profile, painAreas: ["shoulder"] },
      new Date(2026, 8, 28, 12),
    );
    expect(
      shoulderSafe.sessions.every((session) =>
        session.workout.items.every(
          (item) =>
            !exerciseById
              .get(item.exerciseId)
              ?.planning.avoidForPainAreas.includes("shoulder"),
        ),
      ),
    ).toBe(true);

    const legSafe = generateTrainingPlan(
      { ...profile, painAreas: ["knee"] },
      new Date(2026, 8, 28, 12),
    );
    expect(
      legSafe.sessions.every((session) =>
        session.workout.items.every(
          (item) =>
            !exerciseById
              .get(item.exerciseId)
              ?.planning.avoidForPainAreas.includes("knee"),
        ),
      ),
    ).toBe(true);
  });

  it.each([10, 20, 30])(
    "constructs balanced sessions close to a %i-minute target",
    (targetMinutes) => {
      const plan = generateTrainingPlan(
        { ...profile, sessionDurationMinutes: targetMinutes },
        new Date(2026, 8, 28, 12),
      );
      const toleranceSeconds = getSessionDurationToleranceSeconds(
        targetMinutes * 60,
      );

      expect(plan.sessions.length).toBeGreaterThan(0);
      for (const session of plan.sessions) {
        expect(Math.abs(session.durationDeltaSeconds)).toBeLessThanOrEqual(
          toleranceSeconds,
        );
        expect(session.estimatedDurationSeconds).toBeGreaterThan(0);
        expect(session.targetDurationSeconds).toBe(targetMinutes * 60);
        expect(session.workout.items.length).toBeGreaterThanOrEqual(2);
        expect(session.workout.items.length).toBeGreaterThanOrEqual(4);
        expect(
          Math.max(...session.workout.items.map((item) => item.sets)),
        ).toBeLessThanOrEqual(3);
        expect(session.workout.items.some((item) => item.role === "core")).toBe(
          true,
        );
      }
    },
  );

  it("refuses to return a misleading plan when a constrained catalog cannot meet the target", () => {
    const source = workouts.find(
      (workout) => workout.id === "foundation-strength",
    );
    expect(source).toBeDefined();
    const mainItem = source!.items[0];
    const mainExercise = exercises.find(
      (exercise) => exercise.id === mainItem.exerciseId,
    );
    const warmup = exercises.find(
      (exercise) =>
        exercise.sessionRoles.includes("warmup") &&
        exercise.equipment.includes("none"),
    );
    const cooldown = exercises.find(
      (exercise) =>
        exercise.sessionRoles.includes("cooldown") &&
        exercise.equipment.includes("none"),
    );
    expect(mainExercise && warmup && cooldown).toBeTruthy();

    const constrainedWorkout = {
      ...source!,
      id: "constrained-duration",
      slug: "constrained-duration",
      items: [
        {
          ...mainItem,
          sets: 1,
          minSets: 1,
          maxSets: 1,
          minWorkSeconds: mainItem.prescription.durationSeconds,
          maxWorkSeconds: mainItem.prescription.durationSeconds,
        },
      ],
    };

    expect(() =>
      generateTrainingPlan(
        { ...profile, sessionDurationMinutes: 20 },
        new Date(2026, 8, 28, 12),
        [],
        {
          sourceWorkouts: [constrainedWorkout],
          exerciseCatalog: [mainExercise!, warmup!, cooldown!],
        },
      ),
    ).toThrow(UnsupportedPlanDurationError);
    expect(() =>
      generateTrainingPlan(
        { ...profile, sessionDurationMinutes: 20 },
        new Date(2026, 8, 28, 12),
        [],
        {
          sourceWorkouts: [constrainedWorkout],
          exerciseCatalog: [mainExercise!, warmup!, cooldown!],
        },
      ),
    ).toThrow(/closest compatible sessions are/i);
  });

  it("rejects generation when constraints leave no compatible session", () => {
    expect(() =>
      generateTrainingPlan(
        { ...profile, sessionDurationMinutes: 20 },
        new Date(2026, 8, 28, 12),
        [],
        { sourceWorkouts: [], exerciseCatalog: [] },
      ),
    ).toThrow(/no compatible sessions are available/i);
  });

  it("is deterministic and records duration adjustments", () => {
    const source = workouts.find(
      (workout) => workout.id === "foundation-strength",
    );
    expect(source).toBeDefined();

    const first = generateSessionPrescription(source!, 20);
    const second = generateSessionPrescription(source!, 20);

    expect(first).toEqual(second);
    expect(first.sections).toEqual([
      { type: "main", items: first.workout.items },
    ]);
    expect(first.adjustments.length).toBeGreaterThan(0);
    expect(
      first.adjustments.every(
        (adjustment) =>
          adjustment.source === "duration_fit" &&
          adjustment.reason === "target_duration",
      ),
    ).toBe(true);
    expect(
      new Set(first.workout.items.map((item) => item.exerciseId)).size,
    ).toBe(first.workout.items.length);
  });

  it("assembles the main workout from production-ready exercise metadata", () => {
    const workout = assembleMainWorkout({ profile, slot: 0 });
    const exerciseById = new Map(
      exercises.map((exercise) => [exercise.id, exercise]),
    );

    expect(workout).not.toBeNull();
    expect(workout?.items.length).toBeGreaterThanOrEqual(2);
    for (const item of workout?.items ?? []) {
      const selected = exerciseById.get(item.exerciseId)!;
      expect(selected.planning.mediaStatus).toBe("production");
      expect(selected.planning.sectionRoles).toContain("main");
      expect(item.minWorkSeconds).toBe(selected.planning.safeWorkSeconds.min);
      expect(item.maxWorkSeconds).toBe(selected.planning.safeWorkSeconds.max);
    }
  });

  it("turns physical focus and padel actions into selected exercises", () => {
    const shoulderFocused = assembleMainWorkout({
      profile: {
        ...profile,
        goals: ["court-endurance"],
        developmentAreas: ["shoulders-upper-back"],
        padelLimitations: ["weak-overhead-power"],
      },
      slot: 0,
    });
    const sportProfileByExerciseId = new Map(
      sportExerciseProfiles.map((item) => [item.exerciseId, item]),
    );

    expect(shoulderFocused).not.toBeNull();
    expect(
      shoulderFocused?.items.some((item) => {
        const sportProfile = sportProfileByExerciseId.get(item.exerciseId);
        return sportProfile?.bodyAreas.some((area) =>
          ["shoulders", "back"].includes(area),
        );
      }),
    ).toBe(true);
    expect(
      shoulderFocused?.items.some((item) =>
        sportProfileByExerciseId
          .get(item.exerciseId)
          ?.problemsAddressed.includes("weak-overhead-power"),
      ),
    ).toBe(true);
  });

  it("builds a stable 60-day arc without random exercise changes", () => {
    const first = generateTrainingPlan(profile, new Date(2026, 8, 28, 12));
    const second = generateTrainingPlan(profile, new Date(2026, 8, 28, 12));

    expect(first.sessions.map((session) => session.progressionPhase)).toEqual([
      "foundation",
      "foundation",
      "foundation",
      "foundation",
      "foundation",
      "foundation",
      "build",
      "build",
      "build",
      "build",
      "build",
      "build",
      "build",
      "build",
      "build",
      "peak",
      "peak",
      "peak",
      "peak",
      "peak",
      "peak",
      "consolidate",
      "consolidate",
      "consolidate",
      "consolidate",
      "consolidate",
    ]);
    expect(first.sessions).toEqual(second.sessions);

    for (let slot = 0; slot < profile.sessionsPerWeek; slot += 1) {
      const matchingSlot = [0, 1, 2, 3, 4, 5, 6, 7].map(
        (weekIndex) =>
          first.sessions[weekIndex * profile.sessionsPerWeek + slot],
      );
      expect(
        new Set(matchingSlot.map((session) => session.sourceWorkoutId)).size,
      ).toBe(1);
      expect(
        new Set(
          matchingSlot.map((session) =>
            session.workout.items.map((item) => item.exerciseId).join(","),
          ),
        ).size,
      ).toBe(1);
    }
  });

  it("does not add catch-up load after a missed workout", () => {
    const plan = generateTrainingPlan(profile, new Date(2026, 8, 28, 12));
    const nextSessionBefore = plan.sessions[1];
    const withMissedWorkout = {
      ...plan,
      sessions: plan.sessions.map((session, index) =>
        index === 0 ? { ...session, status: "skipped" as const } : session,
      ),
    };

    expect(withMissedWorkout.sessions[1]).toEqual(nextSessionBefore);
    expect(
      Math.abs(withMissedWorkout.sessions[1].durationDeltaSeconds),
    ).toBeLessThanOrEqual(2 * 60);
  });

  it("uses recent comparable feedback when a new plan is generated", () => {
    const previous = generateTrainingPlan(profile, new Date(2026, 7, 31, 12));
    const completed = previous.sessions[0];
    const event: WorkoutFeedbackEvent = {
      id: "feedback-from-previous-plan",
      completionId: "completion-from-previous-plan",
      sessionId: completed.id,
      workoutId: completed.workout.id,
      completedAt: "2026-09-01T09:20:00.000Z",
      recordedAt: "2026-09-01T09:21:00.000Z",
      rating: "too-easy",
      snapshot: createWorkoutSessionSnapshot({
        workout: completed.workout,
        exercises,
        intensity: "standard",
        progressionWeek: completed.weekNumber,
        progressionPhase: completed.progressionPhase,
        targetDurationSeconds: completed.targetDurationSeconds,
        estimatedDurationSeconds: completed.estimatedDurationSeconds,
      }),
    };

    const next = generateTrainingPlan(profile, new Date(2026, 8, 28, 12), [
      event,
    ]);

    expect(
      next.sessions
        .flatMap((session) => session.feedbackAdaptations)
        .some((adaptation) => adaptation.feedbackEventId === event.id),
    ).toBe(true);
    expect(
      next.sessions
        .flatMap((session) => session.adjustments)
        .some(
          (adjustment) =>
            adjustment.source === "feedback" &&
            adjustment.feedbackEventId === event.id,
        ),
    ).toBe(true);
  });

  it("records final reasons in generation-pipeline order", () => {
    const plan = generateTrainingPlan(profile, new Date(2026, 8, 28, 12));
    const sourceOrder = {
      base_prescription: 0,
      weekly_progression: 1,
      feedback: 2,
      safety: 2,
      duration_fit: 3,
      today_adaptation: 4,
    } as const;

    expect(
      plan.sessions.some((session) =>
        session.adjustments.some(
          (adjustment) => adjustment.source === "weekly_progression",
        ),
      ),
    ).toBe(true);
    for (const session of plan.sessions) {
      const order = session.adjustments.map(
        (adjustment) => sourceOrder[adjustment.source],
      );
      expect(order).toEqual([...order].sort((left, right) => left - right));
      expect(
        session.workout.items.every((item) => {
          const minWork =
            item.minWorkSeconds ?? item.prescription.durationSeconds;
          const maxWork =
            item.maxWorkSeconds ?? item.prescription.durationSeconds;
          const minSets = item.minSets ?? item.sets;
          const maxSets = item.maxSets ?? item.sets;
          return (
            item.prescription.durationSeconds >= minWork &&
            item.prescription.durationSeconds <= maxWork &&
            item.sets >= minSets &&
            item.sets <= maxSets
          );
        }),
      ).toBe(true);
    }
  });
});

describe("rebalancePlanAroundGames", () => {
  it("moves planned sessions away from a game and its previous day", () => {
    const plan = generateTrainingPlan(profile, new Date(2026, 8, 28, 12));
    const gameDate = plan.sessions[1].scheduledDate;
    const next = rebalancePlanAroundGames({
      ...plan,
      games: [
        {
          id: "game-1",
          date: gameDate,
          label: "League match",
          importance: "normal",
        },
      ],
    });

    expect(
      next.sessions.some((session) => session.scheduledDate === gameDate),
    ).toBe(false);
    expect(
      next.sessions.some(
        (session) => session.scheduledDate === addDays(gameDate, -1),
      ),
    ).toBe(false);
    expect(next.lastRebalancedAt).toBeTruthy();
  });
});

describe("rebalance feedback", () => {
  it("explains why an in-progress match-day workout stays in place", () => {
    const plan = generateTrainingPlan(profile, new Date(2026, 8, 28, 12));
    plan.sessions = [{ ...plan.sessions[0], status: "in-progress" }];
    plan.games = [
      {
        id: "match",
        date: plan.sessions[0].scheduledDate,
        label: "Match",
        importance: "normal",
      },
    ];
    const next = rebalancePlanAroundGames(plan);
    expect(next.sessions).toEqual(plan.sessions);
    expect(describePlanRebalance(plan, next)).toContain("already in progress");
    expect(describePlanRebalance(plan, next)).toContain("No workouts moved.");
  });

  it("reports a moved workout and then explains a repeated click", () => {
    const plan = generateTrainingPlan(profile, new Date(2026, 8, 28, 12));
    plan.sessions = [plan.sessions[0]];
    plan.games = [
      {
        id: "match",
        date: plan.sessions[0].scheduledDate,
        label: "Match",
        importance: "normal",
      },
    ];
    const next = rebalancePlanAroundGames(plan);
    expect(next.sessions[0].scheduledDate).not.toBe(plan.games[0].date);
    expect(describePlanRebalance(plan, next)).toContain("Moved 1 workout");
    expect(
      describePlanRebalance(next, rebalancePlanAroundGames(next)),
    ).toContain("already clear");
  });

  it("reports when all nearby dates are blocked", () => {
    const plan = generateTrainingPlan(profile, new Date(2026, 8, 28, 12));
    plan.sessions = [plan.sessions[0]];
    plan.games = Array.from({ length: 6 }, (_, index) => ({
      id: String(index),
      date: addDays(plan.sessions[0].scheduledDate, index),
      label: "Match",
      importance: "normal" as const,
    }));
    const next = rebalancePlanAroundGames(plan);
    expect(next.sessions).toEqual(plan.sessions);
    expect(describePlanRebalance(plan, next)).toContain(
      "no free date within four days",
    );
  });
});

it("updates overlapping unstarted sessions while preserving recorded and in-progress workouts", () => {
  const plan = generateTrainingPlan(profile, new Date(2026, 8, 28, 12));
  for (const session of plan.sessions.slice(0, 3)) {
    const support = session.sections[0].items[0];
    session.workout.items.push({ ...support, id: "legacy-overlap" });
    session.sections[1].items = session.workout.items;
  }
  plan.sessions[1].status = "in-progress";
  plan.sessions[2].status = "completed";
  const next = normalizeScheduledExerciseFlow(plan);
  expect(next.sessions[1]).toBe(plan.sessions[1]);
  expect(next.sessions[2]).toBe(plan.sessions[2]);
  const mainIds = new Set(
    next.sessions[0].workout.items.map((item) => item.exerciseId),
  );
  expect(
    next.sessions[0].sections
      .filter((section) => section.type !== "main")
      .flatMap((section) => section.items)
      .every((item) => !mainIds.has(item.exerciseId)),
  ).toBe(true);
  expect(Math.abs(next.sessions[0].durationDeltaSeconds)).toBeLessThanOrEqual(
    getSessionDurationToleranceSeconds(next.sessions[0].targetDurationSeconds),
  );
  expect(normalizeScheduledExerciseFlow(next)).toBe(next);
});

it("consolidates duplicate saved main exercises without exceeding authored set bounds", () => {
  const plan = generateTrainingPlan(profile, new Date(2026, 8, 28, 12));
  const session = plan.sessions[0];
  const item = session.workout.items[0];
  session.workout.items.push({ ...item, id: "duplicate-main" });
  const next = normalizeScheduledExerciseFlow(plan).sessions[0];
  expect(
    new Set(next.workout.items.map((candidate) => candidate.exerciseId)).size,
  ).toBe(next.workout.items.length);
  expect(
    next.workout.items.find(
      (candidate) => candidate.exerciseId === item.exerciseId,
    )?.sets,
  ).toBeLessThanOrEqual(item.maxSets ?? 20);
  expect(Math.abs(next.durationDeltaSeconds)).toBeLessThanOrEqual(
    getSessionDurationToleranceSeconds(next.targetDurationSeconds),
  );
});
