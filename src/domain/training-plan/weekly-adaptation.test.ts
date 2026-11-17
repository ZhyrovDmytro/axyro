import { describe, expect, it } from "vitest";
import { exercises } from "@/content/exercises";
import { generateTrainingPlan } from "./generate-training-plan";
import {
  applyWeeklyAdaptationProposal,
  assessTrainingWeek,
  buildWeeklyAdaptationProposal,
} from "./weekly-adaptation";
import { trainingPlanSchema } from "./training-plan.schema";
import { resetTodayAdaptations } from "./today-adaptation";
import type { AthleteProfile } from "./training-plan.types";
import type {
  PerceivedDifficulty,
  SessionActivity,
  WorkoutFeedbackEvent,
} from "@/services/persistence/workout-activity-repository";

const profile: AthleteProfile = {
  sport: "padel",
  experience: "intermediate",
  sessionsPerWeek: 3,
  sessionDurationMinutes: 20,
  preferredDays: ["monday", "wednesday", "friday"],
  equipment: ["bodyweight", "one-dumbbell"],
  goals: ["strength", "injury-resilience"],
  developmentAreas: [],
  padelLimitations: [],
  painAreas: [],
  matches: [],
};
const plan = generateTrainingPlan(profile, new Date(2026, 8, 28, 12));
const week = plan.sessions.filter((session) => session.weekNumber === 1);
function inputs(ratings: PerceivedDifficulty[]) {
  const activities: SessionActivity[] = week.map((session, index) => ({
    id: `activity-${index}`,
    planId: plan.generatedAt,
    sessionId: session.id,
    workoutId: session.workout.id,
    scheduledDate: session.scheduledDate,
    status: index < ratings.length ? "completed" : "missed",
    completionId: `completion-${index}`,
  }));
  const feedback: WorkoutFeedbackEvent[] = ratings.map(
    (perceivedDifficulty, index) => ({
      id: `feedback-${index}`,
      completionId: `completion-${index}`,
      sessionId: week[index].id,
      workoutId: week[index].workout.id,
      planId: plan.generatedAt,
      planWeek: 1,
      completedAt: `${week[index].scheduledDate}T12:00:00.000Z`,
      recordedAt: `${week[index].scheduledDate}T12:01:00.000Z`,
      rating:
        perceivedDifficulty === "JUST_RIGHT"
          ? "just-right"
          : perceivedDifficulty.includes("EASY")
            ? "too-easy"
            : "too-hard",
      perceivedDifficulty,
      reasons: [],
      workoutCompletionPercent: 100,
    }),
  );
  return {
    plan,
    weekNumber: 1,
    activities,
    feedback,
    now: new Date("2026-10-05T12:00:00Z"),
  };
}

describe("weekly assessment", () => {
  it("continues programmed progression for three appropriate workouts", () => {
    const assessment = assessTrainingWeek(
      inputs(["JUST_RIGHT", "JUST_RIGHT", "JUST_RIGHT"]),
    );
    expect(assessment.assessment).toBe("APPROPRIATE");
    expect(assessment.confidence).toBe("HIGH");
    expect(
      buildWeeklyAdaptationProposal({
        assessment,
        plan,
        exerciseCatalog: exercises,
      }),
    ).toBeNull();
  });
  it.each([
    [["HARD", "HARD", "TOO_HARD"], "SIGNIFICANTLY_TOO_HARD", -15],
    [["TOO_EASY", "TOO_EASY", "SLIGHTLY_EASY"], "SIGNIFICANTLY_TOO_EASY", 10],
    [["HARD", "JUST_RIGHT", "HARD"], "SLIGHTLY_TOO_HARD", -7],
  ] as const)(
    "combines consistent observations %j",
    (ratings, expected, adjustment) => {
      const assessment = assessTrainingWeek(inputs([...ratings]));
      expect(assessment.assessment).toBe(expected);
      expect(assessment.suggestedAdjustment).toBe(adjustment);
      expect(assessment.confidence).toBe("HIGH");
    },
  );
  it.each(["TOO_HARD", "TOO_EASY", "JUST_RIGHT"] as const)(
    "does not extrapolate one %s workout or missed sessions",
    (rating) => {
      const assessment = assessTrainingWeek(inputs([rating]));
      expect(assessment.assessment).toBe("INSUFFICIENT_DATA");
      expect(assessment.confidence).toBe("LOW");
      expect(assessment.suggestedAdjustment).toBe(0);
    },
  );
  it("detects easy ratings conflicting with incomplete workouts", () => {
    const data = inputs(["TOO_EASY", "TOO_EASY", "TOO_EASY"]);
    data.feedback.forEach((event) => {
      event.workoutCompletionPercent = 60;
    });
    const assessment = assessTrainingWeek(data);
    expect(assessment.confidence).toBe("LOW");
    expect(assessment.suggestedAdjustment).toBe(0);
  });
  it("lowers confidence for repeated early termination despite appropriate ratings", () => {
    const data = inputs(["JUST_RIGHT", "JUST_RIGHT", "JUST_RIGHT"]);
    data.feedback.forEach((event) => {
      event.workoutCompletionPercent = 60;
    });
    expect(assessTrainingWeek(data).confidence).toBe("LOW");
  });
  it("keeps localized technique difficulty separate from systemic difficulty", () => {
    const data = inputs(["TOO_HARD", "JUST_RIGHT", "JUST_RIGHT"]);
    data.feedback[0].reasons = ["TECHNIQUE_DIFFICULTY"];
    data.feedback[0].affectedExerciseIds = [
      week[0].workout.items[0].exerciseId,
    ];
    const assessment = assessTrainingWeek(data);
    expect(assessment.suggestedAdjustment).toBe(0);
    expect(assessment.affectedExerciseIds).toContain(
      week[0].workout.items[0].exerciseId,
    );
  });
  it("vetoes increases for any pain signal", () => {
    const data = inputs(["TOO_EASY", "TOO_EASY", "TOO_EASY"]);
    data.feedback[0].reasons = ["PAIN_OR_DISCOMFORT"];
    data.feedback[0].affectedExerciseIds = [
      week[0].workout.items[0].exerciseId,
    ];
    const assessment = assessTrainingWeek(data);
    expect(assessment.suggestedAdjustment).toBeLessThanOrEqual(0);
    expect(assessment.painSignalCount).toBe(1);
  });
  it("uses preceding trends conservatively without reversing appropriate progression", () => {
    const previous = assessTrainingWeek(inputs(["HARD", "HARD", "HARD"]));
    const current = assessTrainingWeek({
      ...inputs(["HARD", "HARD", "HARD"]),
      previousAssessment: previous,
    });
    expect(current.weightedDifficultySignal).toBeGreaterThan(
      previous.weightedDifficultySignal,
    );
    expect(
      assessTrainingWeek({
        ...inputs(["JUST_RIGHT", "JUST_RIGHT", "JUST_RIGHT"]),
        previousAssessment: previous,
      }).suggestedAdjustment,
    ).toBe(0);
  });
  it("reproduces assessment state and invalidates it when feedback changes", () => {
    const data = inputs(["HARD", "HARD", "HARD"]);
    const first = assessTrainingWeek(data);
    expect(assessTrainingWeek(data)).toEqual(first);
    data.feedback[0].perceivedDifficulty = "JUST_RIGHT";
    expect(assessTrainingWeek(data).fingerprint).not.toBe(first.fingerprint);
  });
  it("ignores feedback from another plan", () => {
    const data = inputs(["HARD", "HARD", "HARD"]);
    data.feedback.forEach((event) => {
      event.planId = "another-plan";
    });
    expect(assessTrainingWeek(data).explicitFeedbackCount).toBe(0);
  });
});

describe("weekly safety and behavioral context", () => {
  it("shortens bounded work instead of extending recovery after repeated too-long feedback", () => {
    const data = inputs(["HARD", "HARD", "HARD"]);
    data.feedback.forEach((event) => {
      event.reasons = ["WORKOUT_TOO_LONG"];
    });
    const assessment = assessTrainingWeek(data);
    const proposal = buildWeeklyAdaptationProposal({
      assessment,
      plan,
      exerciseCatalog: exercises,
    });
    expect(proposal).not.toBeNull();
    for (const change of proposal!.changes) {
      expect(change.after.estimatedDurationSeconds).toBeLessThan(
        change.before.estimatedDurationSeconds,
      );
      expect(change.after.targetDurationSeconds).toBe(
        change.before.targetDurationSeconds,
      );
      expect(Math.abs(change.after.durationDeltaSeconds)).toBeLessThanOrEqual(
        120,
      );
      for (const item of change.after.workout.items) {
        const before = change.before.workout.items.find(
          (source) => source.id === item.id,
        )!;
        expect(item.restAfterSetSeconds).toBe(before.restAfterSetSeconds);
        expect(item.prescription.durationSeconds).toBeGreaterThanOrEqual(
          Math.max(
            item.minWorkSeconds ?? 1,
            exercises.find((exercise) => exercise.id === item.exerciseId)!
              .planning.safeWorkSeconds.min,
          ),
        );
      }
    }
  });
  it("does not count repeated completions of one planned session as several observations", () => {
    const data = inputs(["TOO_EASY"]);
    data.feedback.push({
      ...data.feedback[0],
      id: "replay",
      completionId: "wrong-completion",
    });
    const assessment = assessTrainingWeek(data);
    expect(assessment.explicitFeedbackCount).toBe(1);
    expect(assessment.suggestedAdjustment).toBe(0);
  });
  it("uses repeated lighter requests only as corroboration and preserves equipment/time context", () => {
    const data = inputs(["HARD", "HARD", "HARD"]);
    data.activities.forEach((activity) => {
      activity.executedSnapshot = {
        workoutName: "Session",
        focus: [],
        bodyAreas: [],
        items: [],
        targetDurationSeconds: 1200,
        estimatedDurationSeconds: 1200,
        todayAdaptations: [{ type: "lighter_session" }],
      };
    });
    const withLighter = assessTrainingWeek(data);
    const baseline = assessTrainingWeek(inputs(["HARD", "HARD", "HARD"]));
    expect(withLighter.weightedDifficultySignal).toBeGreaterThan(
      baseline.weightedDifficultySignal,
    );
    data.activities.forEach((activity) => {
      activity.executedSnapshot!.todayAdaptations = [
        { type: "equipment_unavailable", equipmentIds: ["dumbbell"] },
      ];
    });
    expect(assessTrainingWeek(data).weightedDifficultySignal).toBe(
      baseline.weightedDifficultySignal,
    );
  });
  it("tracks repeated skipping as a localized issue without globally reducing appropriate training", () => {
    const data = inputs(["JUST_RIGHT", "JUST_RIGHT", "JUST_RIGHT"]);
    const exerciseId = week[0].workout.items[0].exerciseId;
    data.activities.forEach((activity) => {
      activity.executedSnapshot = {
        workoutName: "Session",
        focus: [],
        bodyAreas: [],
        items: [
          {
            section: "main",
            status: "skipped",
            exerciseId,
            sets: 2,
            workDurationSeconds: 30,
            perSide: false,
            restAfterSetSeconds: 10,
            restAfterExerciseSeconds: 10,
          },
        ],
        targetDurationSeconds: 1200,
        estimatedDurationSeconds: 1200,
      };
    });
    const assessment = assessTrainingWeek(data);
    expect(assessment.affectedExerciseIds).toContain(exerciseId);
    expect(assessment.suggestedAdjustment).toBe(0);
  });
  it("retains unresolved pain across later weeks and rejects progression from easy feedback", () => {
    const data = inputs(["TOO_EASY", "TOO_EASY", "TOO_EASY"]);
    const activePain = {
      ...data.feedback[0],
      reasons: ["PAIN_OR_DISCOMFORT" as const],
      affectedExerciseIds: plan.sessions
        .filter((session) => session.weekNumber === 2)
        .flatMap((session) =>
          session.workout.items.map((item) => item.exerciseId),
        ),
    };
    const assessment = assessTrainingWeek(data);
    const proposal = buildWeeklyAdaptationProposal({
      assessment,
      plan,
      exerciseCatalog: exercises,
      activePainFeedback: [activePain],
    });
    expect(proposal).not.toBeNull();
    for (const change of proposal!.changes) {
      for (const item of change.after.workout.items) {
        const before = change.before.workout.items.find(
          (source) => source.id === item.id,
        )!;
        if (item.exerciseId === before.exerciseId) {
          expect(item.prescription.durationSeconds).toBeLessThanOrEqual(
            before.prescription.durationSeconds,
          );
          expect(item.sets).toBeLessThanOrEqual(before.sets);
        }
      }
    }
  });
  it("does not blame unrelated lower-body movements for a localized shoulder report", () => {
    const data = inputs(["HARD", "JUST_RIGHT", "JUST_RIGHT"]);
    const shoulder = exercises.find((exercise) =>
      exercise.bodyAreas.includes("shoulders"),
    )!;
    const legs = exercises.find(
      (exercise) =>
        exercise.bodyAreas.includes("legs") &&
        !exercise.bodyAreas.includes("shoulders"),
    )!;
    data.feedback[0].reasons = ["PAIN_OR_DISCOMFORT"];
    data.feedback[0].affectedArea = "shoulder";
    data.feedback[0].snapshot = {
      workoutName: "Mixed",
      focus: [],
      bodyAreas: ["shoulders", "legs"],
      items: [shoulder, legs].map((exercise) => ({
        section: "main",
        status: "completed",
        exerciseId: exercise.id,
        sets: 1,
        workDurationSeconds: 30,
        perSide: false,
        restAfterSetSeconds: 0,
        restAfterExerciseSeconds: 0,
      })),
      targetDurationSeconds: 1200,
      estimatedDurationSeconds: 1200,
    };
    const assessment = assessTrainingWeek(data);
    expect(assessment.painExerciseIds).toContain(shoulder.id);
    expect(assessment.painExerciseIds).not.toContain(legs.id);
  });
});

describe("weekly proposal lifecycle", () => {
  const assessment = assessTrainingWeek(inputs(["HARD", "HARD", "TOO_HARD"]));
  const proposal = buildWeeklyAdaptationProposal({
    assessment,
    plan,
    exerciseCatalog: exercises,
    now: new Date("2026-10-05T12:00:00Z"),
  });
  it("updates only the next week's unchanged scheduled sessions with validated audit snapshots", () => {
    expect(proposal).not.toBeNull();
    const pending = {
      ...plan,
      weeklyAssessments: [assessment],
      weeklyAdaptationProposals: [proposal!],
    };
    const accepted = applyWeeklyAdaptationProposal(
      pending,
      proposal!.id,
      "ACCEPTED",
    );
    expect(trainingPlanSchema.safeParse(accepted).success).toBe(true);
    expect(
      accepted.sessions.filter((session) => session.weekNumber !== 2),
    ).toEqual(plan.sessions.filter((session) => session.weekNumber !== 2));
    for (const change of proposal!.changes) {
      const actual = accepted.sessions.find(
        (session) => session.id === change.sessionId,
      )!;
      expect(actual).toEqual(change.after);
      expect(actual.originalSessionSnapshot).toEqual(
        change.before.originalSessionSnapshot,
      );
      expect(resetTodayAdaptations(actual).sections).toEqual(actual.sections);
    }
    expect(
      applyWeeklyAdaptationProposal(accepted, proposal!.id, "ACCEPTED"),
    ).toBe(accepted);
  });
  it("declines without changing prescriptions and does not apply twice", () => {
    const pending = { ...plan, weeklyAdaptationProposals: [proposal!] };
    const declined = applyWeeklyAdaptationProposal(
      pending,
      proposal!.id,
      "DECLINED",
    );
    expect(declined.sessions).toBe(plan.sessions);
    expect(
      applyWeeklyAdaptationProposal(declined, proposal!.id, "ACCEPTED"),
    ).toBe(declined);
  });
  it("rejects the whole stale acceptance atomically", () => {
    const pending = {
      ...plan,
      weeklyAdaptationProposals: [proposal!],
      sessions: plan.sessions.map((session) =>
        session.id === proposal!.changes[0].sessionId
          ? { ...session, status: "in-progress" as const }
          : session,
      ),
    };
    expect(() =>
      applyWeeklyAdaptationProposal(pending, proposal!.id, "ACCEPTED"),
    ).toThrow("changed");
    expect(pending.weeklyAdaptationProposals[0].status).toBe("PENDING");
  });
});

it("retains repeated technique difficulty when no exercise localization was selected", () => {
  const data = inputs(["HARD", "TOO_HARD", "HARD"]);
  data.feedback.forEach((event) => {
    event.reasons = ["TECHNIQUE_DIFFICULTY"];
  });
  const assessment = assessTrainingWeek(data);
  expect(assessment.assessment).toBe("SIGNIFICANTLY_TOO_HARD");
  expect(assessment.suggestedAdjustment).toBeLessThan(0);
});
