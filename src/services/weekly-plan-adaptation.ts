import type { Exercise } from "@/domain/exercise/exercise.types";
import { getPlanWeekNumber } from "@/domain/training-plan/progression";
import type { TrainingPlan } from "@/domain/training-plan/training-plan.types";
import {
  assessTrainingWeek,
  buildWeeklyAdaptationProposal,
} from "@/domain/training-plan/weekly-adaptation";
import type {
  SessionActivity,
  WorkoutFeedbackEvent,
} from "@/services/persistence/workout-activity-repository";

/** Reconcile derived observations; prescriptions change only after explicit acceptance. */
export function reconcileTrainingWeeks({
  plan,
  activities,
  feedback,
  activePainFeedback = [],
  currentDateKey,
  entryWeek,
  exerciseCatalog,
}: {
  plan: TrainingPlan;
  activities: readonly SessionActivity[];
  feedback: readonly WorkoutFeedbackEvent[];
  activePainFeedback?: readonly WorkoutFeedbackEvent[];
  currentDateKey: string;
  entryWeek?: number;
  exerciseCatalog: readonly Exercise[];
}): TrainingPlan {
  const enteredWeek = Math.max(
    getPlanWeekNumber(plan.startDate, currentDateKey) ??
      (currentDateKey > plan.endDate ? 10 : 0),
    entryWeek ?? 0,
  );
  const statuses = new Map(
    activities
      .filter((activity) => activity.planId === plan.generatedAt)
      .map((activity) => [activity.sessionId, activity.status]),
  );
  const sessionsWithCurrentStatus = plan.sessions.map((session) => {
    const status = statuses.get(session.id);
    return session.status === "scheduled" && status && status !== "scheduled"
      ? { ...session, status }
      : session;
  });
  let next = sessionsWithCurrentStatus.some(
    (session, index) => session !== plan.sessions[index],
  )
    ? { ...plan, sessions: sessionsWithCurrentStatus }
    : plan;
  const weeks = [
    ...new Set(plan.sessions.map((session) => session.weekNumber)),
  ].sort((a, b) => a - b);
  for (const weekNumber of weeks) {
    const sessions = plan.sessions.filter(
      (session) => session.weekNumber === weekNumber,
    );
    const final = [...sessions]
      .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate))
      .at(-1);
    const finalCompleted =
      final &&
      (final.status === "completed" ||
        activities.some(
          (activity) =>
            activity.planId === plan.generatedAt &&
            activity.sessionId === final.id &&
            activity.status === "completed",
        ));
    const actionable = weekNumber < enteredWeek || Boolean(finalCompleted);
    const hasObservations = activities.some(
      (activity) =>
        activity.planId === plan.generatedAt &&
        sessions.some((session) => session.id === activity.sessionId) &&
        ["completed", "incomplete"].includes(activity.status),
    );
    if (!actionable && !hasObservations) continue;
    const oldAssessment = next.weeklyAssessments?.find(
      (assessment) => assessment.weekNumber === weekNumber,
    );
    const assessment = assessTrainingWeek({
      plan: next,
      weekNumber,
      activities,
      feedback,
      previousAssessment: next.weeklyAssessments?.find(
        (item) => item.weekNumber === weekNumber - 1,
      ),
    });
    const painState = activePainFeedback
      .map((event) => `${event.id}:${event.updatedAt ?? event.recordedAt}`)
      .sort()
      .join("|");
    assessment.fingerprint += `:${painState}`;
    assessment.actionable = actionable;
    const stalePending = next.weeklyAdaptationProposals?.some(
      (proposal) =>
        proposal.sourceWeek === weekNumber &&
        proposal.status === "PENDING" &&
        proposal.changes.some(
          (change) =>
            JSON.stringify(
              next.sessions.find((session) => session.id === change.sessionId),
            ) !== JSON.stringify(change.before),
        ),
    );
    if (
      oldAssessment?.fingerprint === assessment.fingerprint &&
      oldAssessment.actionable === actionable &&
      !stalePending
    )
      continue;
    let proposals = [...(next.weeklyAdaptationProposals ?? [])];
    const alreadyResolved = proposals.some(
      (proposal) =>
        proposal.sourceWeek === weekNumber &&
        ["ACCEPTED", "DECLINED"].includes(proposal.status),
    );
    proposals = proposals.map((proposal) =>
      proposal.sourceWeek === weekNumber && proposal.status === "PENDING"
        ? { ...proposal, status: "SUPERSEDED" as const }
        : proposal,
    );
    if (!alreadyResolved && actionable) {
      const proposal = buildWeeklyAdaptationProposal({
        assessment,
        plan: next,
        exerciseCatalog,
        feedback,
        activePainFeedback,
      });
      if (proposal) {
        const previousVersions = proposals.filter(
          (item) => item.sourceWeek === weekNumber,
        ).length;
        proposals.push({
          ...proposal,
          id: `${proposal.id}-${previousVersions}`,
        });
      }
    }
    next = {
      ...next,
      weeklyAssessments: [
        ...(next.weeklyAssessments ?? []).filter(
          (item) => item.weekNumber !== weekNumber,
        ),
        assessment,
      ],
      weeklyAdaptationProposals: proposals,
    };
  }
  return next;
}
