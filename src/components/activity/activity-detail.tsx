"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { UiIcon, type UiIconName } from "@/components/ui-icon";
import { formatPlanDate, toDateKey } from "@/domain/training-plan/date";
import { intensityPresets } from "@/domain/workout/intensity";
import { useTrainingPlan } from "@/hooks/use-training-plan";
import { createBrowserWorkoutActivityRepository } from "@/services/persistence/local-workout-activity-repository";
import type {
  SessionActivity,
  WorkoutFeedbackEvent,
  WorkoutSessionSnapshot,
} from "@/services/persistence/workout-activity-repository";

const statusContent: Record<
  SessionActivity["status"],
  { icon: UiIconName; label: string }
> = {
  scheduled: { icon: "scheduled", label: "Scheduled" },
  "in-progress": { icon: "play", label: "In progress" },
  completed: { icon: "check", label: "Completed" },
  skipped: { icon: "skip", label: "Skipped" },
  missed: { icon: "minus", label: "Missed" },
  cancelled: { icon: "close", label: "Cancelled" },
  incomplete: { icon: "incomplete", label: "Incomplete" },
};

const feedbackLabels = {
  "too-easy": "Too easy",
  "just-right": "Just right",
  "too-hard": "Too hard",
  "pain-or-discomfort": "Pain or discomfort",
} as const;

function duration(seconds: number) {
  const whole = Math.max(0, Math.round(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

function adaptationLabels(snapshot: WorkoutSessionSnapshot) {
  return (snapshot.todayAdaptations ?? []).map((adaptation) => {
    switch (adaptation.type) {
      case "less_time":
        return `Shortened to ${Math.round(adaptation.requestedDurationSeconds / 60)} min because less time was available.`;
      case "equipment_unavailable":
        return "Adjusted for equipment that was unavailable.";
      case "body_area_discomfort":
        return "Adjusted around soreness or discomfort reported before training.";
      case "replace_exercise":
        return "A selected exercise was replaced before training.";
      case "lighter_session":
        return "Made lighter for this session.";
    }
  });
}

export function ActivityDetail({ activityId }: { activityId: string }) {
  useTrainingPlan();
  const [activity, setActivity] = useState<
    SessionActivity | null | undefined
  >();
  const [feedback, setFeedback] = useState<WorkoutFeedbackEvent | null>(null);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const repository = createBrowserWorkoutActivityRepository();
      const found = repository.getActivityById(
        activityId,
        toDateKey(new Date()),
      );
      setActivity(found);
      setFeedback(
        found?.completionId
          ? repository.getFeedbackForCompletion(found.completionId)
          : null,
      );
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [activityId]);

  if (activity === undefined) {
    return <main className="page-shell activity-page">Loading activity…</main>;
  }
  if (!activity) {
    return (
      <main className="page-shell activity-page">
        <h1>Activity not found.</h1>
        <Link className="button button--primary" href="/activity">
          Back to Activity
        </Link>
      </main>
    );
  }

  const snapshot =
    activity.executedSnapshot ??
    activity.adaptedSnapshot ??
    activity.plannedSnapshot;
  const plannedSeconds = activity.plannedSnapshot?.targetDurationSeconds;
  const adapted = activity.adaptedSnapshot !== undefined;
  const originalByItemId = new Map(
    (activity.plannedSnapshot?.items ?? []).map((item) => [
      item.workoutItemId,
      item,
    ]),
  );

  return (
    <main className="page-shell page-shell--inner activity-detail-page">
      <Link className="back-link" href="/activity">
        <UiIcon name="arrow-left" /> Activity
      </Link>
      <header className="activity-detail-hero">
        <p className="kicker">{formatPlanDate(activity.scheduledDate)}</p>
        <h1>{snapshot?.workoutName ?? "Workout"}</h1>
        <span className={`activity-status activity-status--${activity.status}`}>
          <UiIcon name={statusContent[activity.status].icon} />
          {statusContent[activity.status].label}
        </span>
      </header>

      <dl className="activity-detail-stats">
        <div>
          <dt>Planned</dt>
          <dd>
            {plannedSeconds !== undefined
              ? `${Math.round(plannedSeconds / 60)} min`
              : "—"}
          </dd>
        </div>
        <div>
          <dt>Actual</dt>
          <dd>
            {activity.status === "completed" &&
            activity.actualDurationSeconds !== undefined
              ? duration(activity.actualDurationSeconds)
              : "—"}
          </dd>
        </div>
        <div>
          <dt>Phase</dt>
          <dd>
            {snapshot?.progressionWeek && snapshot.progressionPhase
              ? `Week ${snapshot.progressionWeek} · ${snapshot.progressionPhase}`
              : "—"}
          </dd>
        </div>
        <div>
          <dt>Effort</dt>
          <dd>
            {activity.intensity
              ? intensityPresets[activity.intensity].label
              : "—"}
          </dd>
        </div>
      </dl>

      {adapted && activity.adaptedSnapshot && (
        <section className="activity-detail-panel">
          <p className="kicker">Adapted before workout</p>
          <h2>
            {Math.round(activity.adaptedSnapshot.estimatedDurationSeconds / 60)}{" "}
            min session
          </h2>
          <ul>
            {adaptationLabels(activity.adaptedSnapshot).map((label) => (
              <li key={label}>{label}</li>
            ))}
          </ul>
        </section>
      )}

      {snapshot && (
        <div className="activity-sections">
          {(["warmup", "main", "cooldown"] as const).map((section) => {
            const items = snapshot.items.filter(
              (item) => item.section === section,
            );
            if (items.length === 0) return null;
            return (
              <section key={section}>
                <p className="kicker">
                  {section === "warmup"
                    ? "Warm-up"
                    : section === "cooldown"
                      ? "Cooldown"
                      : "Workout"}
                </p>
                <ul>
                  {items.map((item, index) => {
                    const original = item.workoutItemId
                      ? originalByItemId.get(item.workoutItemId)
                      : undefined;
                    const replaced =
                      original && original.exerciseId !== item.exerciseId;
                    return (
                      <li
                        key={`${item.workoutItemId ?? item.exerciseId}-${index}`}
                      >
                        <UiIcon
                          name={
                            activity.status !== "completed"
                              ? "scheduled"
                              : item.status === "skipped"
                                ? "minus"
                                : "check"
                          }
                        />
                        <div>
                          <strong>
                            {item.exerciseName ?? item.exerciseId}
                          </strong>
                          <small>
                            {activity.status !== "completed"
                              ? "Planned"
                              : item.status === "skipped"
                                ? "Skipped"
                                : `${item.completedSets ?? item.sets} of ${item.sets} sets completed`}
                          </small>
                          {replaced && (
                            <small>
                              Replaced{" "}
                              {original.exerciseName ?? original.exerciseId}
                            </small>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      )}

      {feedback && (
        <section className="activity-detail-panel">
          <p className="kicker">How did it feel?</p>
          <h2>{feedbackLabels[feedback.rating]}</h2>
        </section>
      )}
    </main>
  );
}
