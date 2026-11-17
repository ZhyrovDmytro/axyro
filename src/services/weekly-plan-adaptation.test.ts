import { describe, expect, it } from "vitest";
import { exercises } from "@/content/exercises";
import { generateTrainingPlan } from "@/domain/training-plan/generate-training-plan";
import type { AthleteProfile } from "@/domain/training-plan/training-plan.types";
import { reconcileTrainingWeeks } from "./weekly-plan-adaptation";

const profile: AthleteProfile = {
  sport: "padel",
  experience: "intermediate",
  sessionsPerWeek: 3,
  sessionDurationMinutes: 10,
  preferredDays: ["monday", "wednesday", "friday"],
  equipment: ["bodyweight"],
  goals: ["movement-speed"],
  developmentAreas: [],
  padelLimitations: [],
  painAreas: [],
  matches: [],
};
function planFixture() {
  return generateTrainingPlan(profile, new Date(2026, 10, 2, 12));
}

describe("weekly plan reconciliation", () => {
  it("does not assess an unfinished current week", () => {
    const plan = planFixture();
    expect(
      reconcileTrainingWeeks({
        plan,
        activities: [],
        feedback: [],
        currentDateKey: "2026-11-03",
        exerciseCatalog: exercises,
      }),
    ).toBe(plan);
  });
  it("uses the plan week, assesses missed weeks without inventing difficulty and is idempotent", () => {
    const plan = planFixture();
    const input = {
      activities: [],
      feedback: [],
      currentDateKey: "2026-11-09",
      exerciseCatalog: exercises,
    };
    const next = reconcileTrainingWeeks({ ...input, plan });
    expect(next.weeklyAssessments).toHaveLength(1);
    expect(next.weeklyAssessments?.[0].assessment).toBe("INSUFFICIENT_DATA");
    expect(next.weeklyAdaptationProposals ?? []).toHaveLength(0);
    expect(reconcileTrainingWeeks({ ...input, plan: next })).toBe(next);
  });
  it("assesses on final scheduled completion before the calendar boundary", () => {
    const plan = planFixture();
    const sessions = plan.sessions.filter(
      (session) => session.weekNumber === 1,
    );
    const last = sessions.at(-1)!;
    const next = reconcileTrainingWeeks({
      plan: {
        ...plan,
        sessions: plan.sessions.map((session) =>
          session.id === last.id
            ? { ...session, status: "completed" }
            : session,
        ),
      },
      activities: [],
      feedback: [],
      currentDateKey: last.scheduledDate,
      exerciseCatalog: exercises,
    });
    expect(next.weeklyAssessments?.[0].weekNumber).toBe(1);
  });
  it("evaluates the previous week before an early next-week direct start", () => {
    const plan = planFixture();
    const next = reconcileTrainingWeeks({
      plan,
      activities: [],
      feedback: [],
      currentDateKey: "2026-11-03",
      entryWeek: 2,
      exerciseCatalog: exercises,
    });
    expect(next.weeklyAssessments).toHaveLength(1);
  });
});

import { LocalWorkoutActivityRepository } from "./persistence/local-workout-activity-repository";
import { createPlannedSessionSnapshot } from "@/domain/workout/create-workout-session-snapshot";
import { applyWeeklyAdaptationProposal } from "@/domain/training-plan/weekly-adaptation";

function finishedWeek() {
  const plan = planFixture();
  const saved = new Map<string, string>();
  const repository = new LocalWorkoutActivityRepository({
    getItem: (key) => saved.get(key) ?? null,
    setItem: (key, value) => {
      saved.set(key, value);
    },
  });
  repository.syncScheduledSessions(
    plan.generatedAt,
    plan.sessions.map((session) => ({
      sessionId: session.id,
      planId: plan.generatedAt,
      workoutId: session.workout.id,
      scheduledDate: session.scheduledDate,
      plannedSnapshot: createPlannedSessionSnapshot(session, exercises),
    })),
    plan.startDate,
  );
  for (const session of plan.sessions.filter((item) => item.weekNumber === 1)) {
    const snapshot = createPlannedSessionSnapshot(session, exercises);
    snapshot.items = snapshot.items.map((item) => ({
      ...item,
      status: "completed",
    }));
    const completion = repository.recordCompleted({
      sessionId: session.id,
      workoutId: session.workout.id,
      intensity: "standard",
      snapshot,
      completedAt: new Date(`${session.scheduledDate}T12:00:00Z`),
    });
    repository.saveFeedbackEvent({
      completionId: completion.id,
      perceivedDifficulty: "HARD",
      reasons: ["OVERALL_INTENSITY"],
    });
  }
  return { plan, repository };
}

describe("weekly feedback integration", () => {
  it.each(["ACCEPTED", "DECLINED"] as const)(
    "persists %s once and never reopens the same recommendation",
    (decision) => {
      const { plan, repository } = finishedWeek();
      const input = {
        activities: repository.getActivityHistory("2026-11-09"),
        feedback: repository.getRecentFeedback(100),
        currentDateKey: "2026-11-09",
        exerciseCatalog: exercises,
      };
      const next = reconcileTrainingWeeks({ ...input, plan });
      const proposal = next.weeklyAdaptationProposals?.find(
        (item) => item.status === "PENDING",
      );
      expect(proposal).toBeDefined();
      const resolved = applyWeeklyAdaptationProposal(
        next,
        proposal!.id,
        decision,
      );
      expect(reconcileTrainingWeeks({ ...input, plan: resolved })).toBe(
        resolved,
      );
      expect(
        applyWeeklyAdaptationProposal(resolved, proposal!.id, decision),
      ).toBe(resolved);
      expect(resolved.sessions).toEqual(
        decision === "DECLINED" ? next.sessions : expect.any(Array),
      );
      if (decision === "ACCEPTED")
        expect(resolved.sessions).not.toEqual(plan.sessions);
    },
  );
  it("recalculates edited feedback and supersedes a pending proposal", () => {
    const { plan, repository } = finishedWeek();
    const input = {
      activities: repository.getActivityHistory("2026-11-09"),
      currentDateKey: "2026-11-09",
      exerciseCatalog: exercises,
    };
    const next = reconcileTrainingWeeks({
      ...input,
      feedback: repository.getRecentFeedback(100),
      plan,
    });
    for (const event of repository.getRecentFeedback(100))
      repository.saveFeedbackEvent({
        completionId: event.completionId,
        perceivedDifficulty: "JUST_RIGHT",
        reasons: [],
      });
    const revised = reconcileTrainingWeeks({
      ...input,
      feedback: repository.getRecentFeedback(100),
      plan: next,
    });
    expect(revised.weeklyAssessments?.[0].assessment).toBe("APPROPRIATE");
    expect(
      revised.weeklyAdaptationProposals?.filter(
        (item) => item.status === "PENDING",
      ),
    ).toHaveLength(0);
    expect(revised.weeklyAdaptationProposals?.[0].status).toBe("SUPERSEDED");
    expect(revised.sessions).toEqual(next.sessions);
  });
  it("rebuilds a stale pending proposal after upcoming prescription edits", () => {
    const { plan, repository } = finishedWeek();
    const input = {
      activities: repository.getActivityHistory("2026-11-09"),
      feedback: repository.getRecentFeedback(100),
      currentDateKey: "2026-11-09",
      exerciseCatalog: exercises,
    };
    const next = reconcileTrainingWeeks({ ...input, plan });
    const first = next.weeklyAdaptationProposals![0];
    const revised = reconcileTrainingWeeks({
      ...input,
      plan: {
        ...next,
        sessions: next.sessions.map((session) =>
          session.id === first.changes[0].sessionId
            ? { ...session, isEdited: true }
            : session,
        ),
      },
    });
    expect(
      revised.weeklyAdaptationProposals?.find((item) => item.id === first.id)
        ?.status,
    ).toBe("SUPERSEDED");
    expect(
      revised.weeklyAdaptationProposals?.find(
        (item) => item.status === "PENDING",
      )?.id,
    ).not.toBe(first.id);
  });
});

it("accumulates feedback during the week without proposing early plan changes", () => {
  const { plan, repository } = finishedWeek();
  const first = plan.sessions.find((session) => session.weekNumber === 1)!;
  const activities = repository
    .getActivityHistory(first.scheduledDate)
    .filter((activity) => activity.sessionId === first.id);
  const feedback = repository
    .getRecentFeedback(100)
    .filter((event) => event.sessionId === first.id);
  const next = reconcileTrainingWeeks({
    plan,
    activities,
    feedback,
    currentDateKey: first.scheduledDate,
    exerciseCatalog: exercises,
  });
  expect(next.weeklyAssessments?.[0].explicitFeedbackCount).toBe(1);
  expect(next.weeklyAdaptationProposals).toHaveLength(0);
  expect(next.sessions.map((session) => session.workout)).toEqual(
    plan.sessions.map((session) => session.workout),
  );
});

it("makes an already-calculated assessment actionable when a week is entered", () => {
  const { plan, repository } = finishedWeek();
  const finalId = plan.sessions
    .filter((session) => session.weekNumber === 1)
    .at(-1)!.id;
  const activities = repository
    .getActivityHistory(plan.startDate)
    .filter((activity) => activity.sessionId !== finalId);
  const feedback = repository
    .getRecentFeedback(100)
    .filter((event) => event.sessionId !== finalId);
  const duringWeek = reconcileTrainingWeeks({
    plan,
    activities,
    feedback,
    currentDateKey: plan.startDate,
    exerciseCatalog: exercises,
  });
  expect(duringWeek.weeklyAdaptationProposals).toHaveLength(0);
  const boundary = reconcileTrainingWeeks({
    plan: duringWeek,
    activities,
    feedback,
    currentDateKey: "2026-11-09",
    exerciseCatalog: exercises,
  });
  expect(
    boundary.weeklyAdaptationProposals?.filter(
      (proposal) => proposal.status === "PENDING",
    ),
  ).toHaveLength(1);
});

it("does not adapt a workout already running even when the plan status is stale", () => {
  const { plan, repository } = finishedWeek();
  const target = plan.sessions.find((session) => session.weekNumber === 2)!;
  repository.markSessionStarted(target.id, target.workout.id, "standard");
  const next = reconcileTrainingWeeks({
    plan,
    activities: repository.getActivityHistory("2026-11-09"),
    feedback: repository.getRecentFeedback(100),
    currentDateKey: "2026-11-09",
    exerciseCatalog: exercises,
  });
  expect(
    next.sessions.find((session) => session.id === target.id)?.status,
  ).toBe("in-progress");
  expect(
    next.weeklyAdaptationProposals
      ?.flatMap((proposal) => proposal.changes)
      .some((change) => change.sessionId === target.id),
  ).toBe(false);
  expect(
    next.sessions.find((session) => session.id === target.id)?.workout,
  ).toEqual(target.workout);
});
