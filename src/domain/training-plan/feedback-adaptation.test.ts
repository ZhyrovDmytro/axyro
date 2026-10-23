import { describe, expect, it } from "vitest";

import { exercises } from "@/content/exercises";
import type { WorkoutFeedbackEvent } from "@/services/persistence/workout-activity-repository";
import { createWorkoutSessionSnapshot } from "@/domain/workout/create-workout-session-snapshot";
import {
  applyFeedbackAdaptation,
  deriveAdaptation,
  getRecentFeedbackForComparableSessions,
} from "./feedback-adaptation";
import {
  finalizeGeneratedTrainingPlan,
  generateTrainingPlan,
} from "./generate-training-plan";
import type { AthleteProfile, PlannedWorkout } from "./training-plan.types";

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

function feedbackFor(
  session: PlannedWorkout,
  rating: WorkoutFeedbackEvent["rating"],
  options: {
    id?: string;
    affectedArea?: WorkoutFeedbackEvent["affectedArea"];
    recordedAt?: string;
  } = {},
): WorkoutFeedbackEvent {
  const snapshot = createWorkoutSessionSnapshot({
    workout: session.workout,
    exercises,
    intensity: "standard",
    progressionWeek: session.weekNumber,
    progressionPhase: session.progressionPhase,
    targetDurationSeconds: session.targetDurationSeconds,
    estimatedDurationSeconds: session.estimatedDurationSeconds,
  });
  const id = options.id ?? `feedback-${session.id}-${rating}`;
  return {
    id,
    completionId: `completion-${id}`,
    sessionId: session.id,
    workoutId: session.workout.id,
    completedAt: "2026-09-28T09:20:00.000Z",
    recordedAt: options.recordedAt ?? "2026-09-28T09:21:00.000Z",
    rating,
    ...(options.affectedArea ? { affectedArea: options.affectedArea } : {}),
    snapshot,
  };
}

describe("feedback adaptation", () => {
  it("makes one bounded change to the next comparable session after too easy", () => {
    const plan = generateTrainingPlan(profile, new Date(2026, 8, 28, 12));
    const event = feedbackFor(plan.sessions[0], "too-easy");

    const proposal = deriveAdaptation({
      recentFeedback: [event],
      upcomingSessions: plan.sessions.slice(1),
      exerciseCatalog: exercises,
    });

    expect(proposal).not.toBeNull();
    expect(proposal?.rating).toBe("too-easy");
    expect(proposal?.targets).toHaveLength(1);
    expect(proposal?.targets[0].adaptation.changes).toHaveLength(1);

    const next = applyFeedbackAdaptation(plan, proposal!);
    const targetBefore = plan.sessions.find(
      (session) => session.id === proposal?.targets[0].sessionId,
    )!;
    const targetAfter = next.sessions.find(
      (session) => session.id === proposal?.targets[0].sessionId,
    )!;
    const tolerance = targetAfter.targetDurationSeconds <= 900 ? 60 : 120;
    expect(targetAfter.estimatedDurationSeconds).toBeLessThanOrEqual(
      targetAfter.targetDurationSeconds + tolerance,
    );
    expect(targetAfter.feedbackAdaptations).toHaveLength(1);
    expect(targetAfter.feedbackAdaptations[0].feedbackEventId).toBe(event.id);
    expect(targetAfter.workout).not.toEqual(targetBefore.workout);
    expect(
      targetAfter.workout.items.every(
        (item) =>
          item.prescription.durationSeconds <=
          (item.maxWorkSeconds ?? item.prescription.durationSeconds),
      ),
    ).toBe(true);
    expect(
      next.sessions.filter(
        (session, index) => session.workout !== plan.sessions[index].workout,
      ),
    ).toHaveLength(1);
  });

  it("keeps normal progression unchanged after just right", () => {
    const plan = generateTrainingPlan(profile, new Date(2026, 8, 28, 12));
    const event = feedbackFor(plan.sessions[0], "just-right");

    expect(
      deriveAdaptation({
        recentFeedback: [event],
        upcomingSessions: plan.sessions.slice(1),
        exerciseCatalog: exercises,
      }),
    ).toBeNull();
    expect(
      plan.sessions.some((session) => session.progression.changes.length > 0),
    ).toBe(true);
  });

  it("slightly reduces a comparable session after too hard without resetting it", () => {
    const plan = generateTrainingPlan(profile, new Date(2026, 8, 28, 12));
    const completed = plan.sessions.find(
      (session) => session.progressionPhase === "build",
    )!;
    const event = feedbackFor(completed, "too-hard");
    const upcoming = plan.sessions.filter(
      (session) => session.scheduledDate > completed.scheduledDate,
    );

    const proposal = deriveAdaptation({
      recentFeedback: [event],
      upcomingSessions: upcoming,
      exerciseCatalog: exercises,
    });

    expect(proposal).not.toBeNull();
    expect(proposal?.targets).toHaveLength(1);
    expect(proposal?.targets[0].adaptation.changes).toHaveLength(1);
    expect([
      "decrease_work_duration",
      "remove_round",
      "increase_recovery",
    ]).toContain(proposal?.type);
    const next = applyFeedbackAdaptation(plan, proposal!);
    const changed = next.sessions.find(
      (session) => session.id === proposal?.targets[0].sessionId,
    )!;
    expect(changed.workout.items).toHaveLength(
      plan.sessions.find((session) => session.id === changed.id)!.workout.items
        .length,
    );
    expect(
      next.sessions.filter(
        (session, index) => session.workout !== plan.sessions[index].workout,
      ),
    ).toHaveLength(1);
  });

  it("blocks and reverses progression for future sessions loading a pain area", () => {
    const plan = generateTrainingPlan(profile, new Date(2026, 8, 28, 12));
    const source = plan.sessions[0];
    const event = feedbackFor(source, "pain-or-discomfort", {
      affectedArea: "lower-back",
    });

    const proposal = deriveAdaptation({
      recentFeedback: [event],
      upcomingSessions: plan.sessions.slice(1),
      exerciseCatalog: exercises,
    });

    expect(proposal?.type).toBe("pain_progression_block");
    expect(proposal?.affectedArea).toBe("lower-back");
    expect(proposal?.targets.length).toBeGreaterThan(0);
    expect(
      proposal?.targets.every((target) =>
        target.adaptation.changes.some(
          (change) => change.type === "block_progression",
        ),
      ),
    ).toBe(true);
    expect(
      proposal?.targets.some(
        (target) =>
          plan.sessions.find((session) => session.id === target.sessionId)
            ?.progressionPhase === "peak" &&
          target.adaptation.changes.some(
            (change) => change.type !== "block_progression",
          ),
      ),
    ).toBe(true);
    const next = applyFeedbackAdaptation(plan, proposal!);
    expect(
      next.sessions
        .flatMap((session) => session.feedbackAdaptations)
        .some(
          (adaptation) =>
            adaptation.rating === "pain-or-discomfort" &&
            adaptation.affectedArea === "lower-back",
        ),
    ).toBe(true);
    const finalized = finalizeGeneratedTrainingPlan(next, exercises);
    for (const session of finalized.sessions) {
      const safetyExerciseIds = new Set(
        session.adjustments.flatMap((adjustment) =>
          adjustment.source === "safety" ? [adjustment.exerciseId] : [],
        ),
      );
      expect(
        session.adjustments.some(
          (adjustment) =>
            adjustment.source === "duration_fit" &&
            safetyExerciseIds.has(adjustment.exerciseId),
        ),
      ).toBe(false);
    }
  });

  it("prioritizes pain safety over a newer effort adjustment", () => {
    const plan = generateTrainingPlan(profile, new Date(2026, 8, 28, 12));
    const pain = feedbackFor(plan.sessions[0], "pain-or-discomfort", {
      id: "pain",
      affectedArea: "lower-back",
      recordedAt: "2026-09-28T09:21:00.000Z",
    });
    const easy = feedbackFor(plan.sessions[0], "too-easy", {
      id: "easy",
      recordedAt: "2026-09-29T09:21:00.000Z",
    });

    expect(
      deriveAdaptation({
        recentFeedback: [easy, pain],
        upcomingSessions: plan.sessions.slice(1),
        exerciseCatalog: exercises,
      }),
    ).toMatchObject({
      feedbackEventId: "pain",
      type: "pain_progression_block",
    });
  });

  it("is deterministic, ignores unrelated sessions, and does not reapply an event", () => {
    const plan = generateTrainingPlan(profile, new Date(2026, 8, 28, 12));
    const event = feedbackFor(plan.sessions[0], "too-easy", {
      id: "stable-id",
    });
    const args = {
      recentFeedback: [event],
      upcomingSessions: plan.sessions.slice(1),
      exerciseCatalog: exercises,
    };
    const first = deriveAdaptation(args);
    const second = deriveAdaptation(args);
    expect(first).toEqual(second);

    const applied = applyFeedbackAdaptation(plan, first!);
    expect(
      deriveAdaptation({
        ...args,
        upcomingSessions: applied.sessions.slice(1),
      }),
    ).toBeNull();
    const unrelated = plan.sessions.find(
      (session) =>
        !first?.targets.some((target) => target.sessionId === session.id),
    )!;
    expect(
      applied.sessions.find((session) => session.id === unrelated.id),
    ).toEqual(unrelated);
  });

  it("returns comparable history in recency order", () => {
    const plan = generateTrainingPlan(profile, new Date(2026, 8, 28, 12));
    const older = feedbackFor(plan.sessions[0], "too-hard", {
      id: "older",
      recordedAt: "2026-09-28T09:00:00.000Z",
    });
    const newer = feedbackFor(plan.sessions[0], "too-easy", {
      id: "newer",
      recordedAt: "2026-09-29T09:00:00.000Z",
    });

    expect(
      getRecentFeedbackForComparableSessions({
        recentFeedback: [older, newer],
        upcomingSessions: plan.sessions.slice(1),
        exerciseCatalog: exercises,
      }).map((event) => event.id),
    ).toEqual(["newer", "older"]);
  });
});
