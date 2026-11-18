"use client";

import { LoadingStatus } from "@/components/loading-status";
import { ProGate } from "@/components/membership/pro-gate";
import { useEffect, useState, useSyncExternalStore } from "react";
import type { ReactNode } from "react";
import { useEntitlement } from "@/components/membership/entitlement-provider";
import { exercises } from "@/content/exercises";
import { toDateKey } from "@/domain/training-plan/date";
import type { TrainingPlan } from "@/domain/training-plan/training-plan.types";
import { applyWeeklyAdaptationProposal } from "@/domain/training-plan/weekly-adaptation";
import { reconcileTrainingWeeks } from "@/services/weekly-plan-adaptation";
import {
  createBrowserTrainingPlanRepository,
  trainingPlanStorageKey,
} from "@/services/persistence/local-training-plan-repository";
import {
  createBrowserWorkoutActivityRepository,
  workoutActivityStorageKey,
} from "@/services/persistence/local-workout-activity-repository";
import {
  createBrowserUserStorage,
  userStorageChangedEvent,
} from "@/services/persistence/user-storage";

function subscribe(onChange: () => void) {
  window.addEventListener(userStorageChangedEvent, onChange);
  window.addEventListener("storage", onChange);
  window.addEventListener("focus", onChange);
  return () => {
    window.removeEventListener(userStorageChangedEvent, onChange);
    window.removeEventListener("storage", onChange);
    window.removeEventListener("focus", onChange);
  };
}
function activitySnapshot() {
  try {
    const storage = createBrowserUserStorage();
    return `${toDateKey(new Date())}:${storage?.getItem(workoutActivityStorageKey) ?? ""}:${storage?.getItem(trainingPlanStorageKey) ?? ""}`;
  } catch {
    return "";
  }
}

export function WeeklyPlanAdaptation({
  plan,
  updatePlan,
  entryWeek,
  children,
}: {
  plan: TrainingPlan;
  updatePlan: (update: (current: TrainingPlan) => TrainingPlan) => void;
  entryWeek?: number;
  children?: ReactNode;
}) {
  const { hasPro, loading, refresh } = useEntitlement();
  const activity = useSyncExternalStore(subscribe, activitySnapshot, () => "");
  const [evaluatedPlan, setEvaluatedPlan] = useState<TrainingPlan | null>(null);
  // Completion updates the plan; keep its mounted player alive until feedback is saved.
  const [admitted, setAdmitted] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!hasPro || loading) return;
    const timeout = window.setTimeout(() => {
      try {
        const repository = createBrowserWorkoutActivityRepository();
        const current = createBrowserTrainingPlanRepository().load();
        if (!current) throw new Error("Plan unavailable");
        const next = reconcileTrainingWeeks({
          plan: current,
          activities: repository.getActivityHistory(toDateKey(new Date())),
          feedback: repository.getRecentFeedback(100),
          activePainFeedback: repository.getActivePainFeedback(),
          currentDateKey: toDateKey(new Date()),
          entryWeek,
          exerciseCatalog: exercises,
        });
        const changed = JSON.stringify(next) !== JSON.stringify(plan);
        if (changed) updatePlan(() => next);
        setEvaluatedPlan(changed ? next : plan);
        if (
          entryWeek !== undefined &&
          !next.weeklyAdaptationProposals?.some(
            (proposal) =>
              proposal.status === "PENDING" &&
              proposal.targetWeek === entryWeek,
          )
        ) {
          setAdmitted(true);
        }
      } catch {
        setError(
          "Your weekly review could not be loaded. Reload to try again.",
        );
      }
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [activity, entryWeek, hasPro, loading, plan, updatePlan]);

  const pending =
    plan.weeklyAdaptationProposals?.filter(
      (proposal) =>
        proposal.status === "PENDING" &&
        (entryWeek === undefined || proposal.targetWeek === entryWeek),
    ) ?? [];
  async function resolve(
    proposalId: string,
    decision: "ACCEPTED" | "DECLINED",
  ) {
    setSaving(true);
    setError("");
    try {
      if (!(await refresh())) throw new Error("Membership unavailable");
      // Re-read after the entitlement request so an edited prescription cannot be overwritten.
      const repository = createBrowserTrainingPlanRepository();
      const current = repository.load();
      if (!current || current.generatedAt !== plan.generatedAt)
        throw new Error("Plan changed");
      const activityRepository = createBrowserWorkoutActivityRepository();
      const reviewed = reconcileTrainingWeeks({
        plan: current,
        activities: activityRepository.getActivityHistory(
          toDateKey(new Date()),
        ),
        feedback: activityRepository.getRecentFeedback(100),
        activePainFeedback: activityRepository.getActivePainFeedback(),
        currentDateKey: toDateKey(new Date()),
        entryWeek,
        exerciseCatalog: exercises,
      });
      if (
        !reviewed.weeklyAdaptationProposals?.some(
          (proposal) =>
            proposal.id === proposalId && proposal.status === "PENDING",
        )
      ) {
        repository.saveDurably(reviewed);
        updatePlan(() => reviewed);
        throw new Error("Feedback changed");
      }
      const next = applyWeeklyAdaptationProposal(
        reviewed,
        proposalId,
        decision,
      );
      repository.saveDurably(next);
      updatePlan(() => next);
    } catch {
      setError(
        "Your choice could not be saved. Reload your plan and try again.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (!hasPro)
    return entryWeek === undefined ? null : loading ? (
      <LoadingStatus>Checking your plan access…</LoadingStatus>
    ) : (
      <ProGate returnTo="/plan">{children}</ProGate>
    );
  if (entryWeek !== undefined && admitted) return <>{children}</>;
  if (entryWeek !== undefined && evaluatedPlan !== plan) {
    return error ? (
      <p role="alert">{error}</p>
    ) : (
      <LoadingStatus>Reviewing your training week…</LoadingStatus>
    );
  }
  return (
    <>
      {pending.map((proposal) => (
        <section
          className="completion-reflection weekly-adaptation"
          key={proposal.id}
          aria-label="Weekly plan adjustment"
        >
          <p className="kicker">Week {proposal.targetWeek}</p>
          <h2>Your plan can be adjusted</h2>
          <p>
            {proposal.overallAdjustmentPercent > 0
              ? "Recent workouts felt easier than expected. We recommend a small step forward this week."
              : proposal.overallAdjustmentPercent < 0
                ? "Last week felt harder than expected. We recommend making this week slightly lighter."
                : "We recommend adjusting the movements that caused difficulty."}{" "}
            Your training goals stay the same.
          </p>
          <ul>
            {proposal.reasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
          <details>
            <summary>Review changes</summary>
            <ul>
              {proposal.changes.map((change) => (
                <li key={change.sessionId}>
                  {change.before.workout.name}: {change.summary}
                </li>
              ))}
            </ul>
          </details>
          <div className="button-row">
            <button
              className="button button--primary"
              type="button"
              disabled={saving}
              onClick={() => void resolve(proposal.id, "ACCEPTED")}
            >
              {saving ? "Saving your choice…" : "Adjust my plan"}
            </button>
            <button
              className="button button--secondary"
              type="button"
              disabled={saving}
              onClick={() => void resolve(proposal.id, "DECLINED")}
            >
              Keep current plan
            </button>
          </div>
        </section>
      ))}
      {error && <p role="alert">{error}</p>}
      {saving && <LoadingStatus>Saving your choice…</LoadingStatus>}
      {(entryWeek === undefined || pending.length === 0) && children}
    </>
  );
}
