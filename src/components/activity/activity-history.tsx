"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { UiIcon, type UiIconName } from "@/components/ui-icon";
import { formatPlanDate, toDateKey } from "@/domain/training-plan/date";
import { useTrainingPlan } from "@/hooks/use-training-plan";
import { createBrowserWorkoutActivityRepository } from "@/services/persistence/local-workout-activity-repository";
import type {
  SessionActivity,
  WorkoutFeedback,
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

const feedbackLabels: Record<WorkoutFeedback, string> = {
  "too-easy": "Too easy",
  "just-right": "Just right",
  "too-hard": "Too hard",
  "pain-or-discomfort": "Pain or discomfort",
};

function plannedSeconds(activity: SessionActivity) {
  return activity.plannedSnapshot?.targetDurationSeconds;
}

function minutes(seconds: number) {
  return `${Math.max(1, Math.round(seconds / 60))} min`;
}

function actualDuration(seconds: number) {
  const whole = Math.max(0, Math.round(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

export function ActivityHistory() {
  useTrainingPlan();
  const [activities, setActivities] = useState<SessionActivity[] | null>(null);
  const [feedback, setFeedback] = useState<Record<string, WorkoutFeedback>>({});
  const today = toDateKey(new Date());

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const repository = createBrowserWorkoutActivityRepository();
      const history = repository
        .getActivityHistory(today)
        .filter((activity) => activity.scheduledDate <= today);
      setActivities(history);
      setFeedback(
        Object.fromEntries(
          history.flatMap((activity) => {
            const event = activity.completionId
              ? repository.getFeedbackForCompletion(activity.completionId)
              : null;
            return event ? [[activity.id, event.rating]] : [];
          }),
        ),
      );
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [today]);

  const groups = useMemo(() => {
    const grouped = new Map<string, SessionActivity[]>();
    for (const activity of activities ?? []) {
      const label = formatPlanDate(`${activity.scheduledDate.slice(0, 7)}-01`, {
        month: "long",
        year: "numeric",
      });
      grouped.set(label, [...(grouped.get(label) ?? []), activity]);
    }
    return [...grouped.entries()];
  }, [activities]);

  if (activities === null) {
    return <main className="page-shell activity-page">Loading activity…</main>;
  }

  return (
    <main className="page-shell page-shell--inner activity-page">
      <header className="activity-hero">
        <p className="kicker">Your training record</p>
        <h1>Activity</h1>
        <p>What was planned, what changed, and what you completed.</p>
      </header>

      {groups.length === 0 ? (
        <section className="activity-empty">
          <h2>Your activity will appear here.</h2>
          <p>
            Complete, skip, or pass a planned training day to build your record.
          </p>
          <Link className="button button--primary" href="/plan">
            View plan
          </Link>
        </section>
      ) : (
        <div className="activity-groups">
          {groups.map(([label, group]) => (
            <section aria-labelledby={`activity-${label}`} key={label}>
              <h2 id={`activity-${label}`}>{label}</h2>
              <div className="activity-list">
                {group.map((activity) => {
                  const snapshot =
                    activity.executedSnapshot ??
                    activity.adaptedSnapshot ??
                    activity.plannedSnapshot;
                  const planned = plannedSeconds(activity);
                  const status = statusContent[activity.status];
                  return (
                    <Link
                      className="activity-card"
                      href={`/activity/${encodeURIComponent(activity.id)}`}
                      key={activity.id}
                    >
                      <time dateTime={activity.scheduledDate}>
                        {formatPlanDate(activity.scheduledDate, {
                          month: "short",
                          day: "numeric",
                        })}
                      </time>
                      <div className="activity-card__body">
                        <strong>{snapshot?.workoutName ?? "Workout"}</strong>
                        <span
                          className={`activity-status activity-status--${activity.status}`}
                        >
                          <UiIcon name={status.icon} />
                          {status.label}
                        </span>
                        <p>
                          {planned !== undefined
                            ? `${minutes(planned)} planned`
                            : "Planned —"}
                          {activity.status === "completed"
                            ? ` · ${activity.actualDurationSeconds !== undefined ? `${actualDuration(activity.actualDurationSeconds)} actual` : "Actual —"}`
                            : ""}
                        </p>
                        {feedback[activity.id] && (
                          <small>{feedbackLabels[feedback[activity.id]]}</small>
                        )}
                      </div>
                      <UiIcon name="arrow-right" />
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
