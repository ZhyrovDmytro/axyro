"use client";

import Link from "next/link";
import { useState } from "react";

import { useConfirmation } from "@/components/confirmation-dialog";

import { createBrowserWorkoutActivityRepository } from "@/services/persistence/local-workout-activity-repository";
import { createBrowserWorkoutSessionRepository } from "@/services/persistence/local-workout-session-repository";
import type { ActiveWorkoutSessionState } from "@/services/persistence/workout-session-repository";
import { useActiveWorkoutSession } from "@/hooks/use-active-workout-session";

function durationLabel(milliseconds: number) {
  return `${Math.max(1, Math.round(milliseconds / 60_000))} min completed`;
}

interface ActiveWorkoutCardProps {
  onDismiss?: (sessionId: string) => void;
}

export function ActiveWorkoutCard({ onDismiss }: ActiveWorkoutCardProps = {}) {
  const confirm = useConfirmation();
  const loaded = useActiveWorkoutSession();
  const [dismissedSessionId, setDismissedSessionId] = useState<string | null>(
    null,
  );
  const active: ActiveWorkoutSessionState | null =
    loaded?.kind === "valid" && loaded.state.sessionId !== dismissedSessionId
      ? loaded.state
      : null;

  if (!active) return null;
  const session = active;
  const started = new Date(active.startedAt);
  const stale = new Date().getTime() - started.getTime() > 24 * 60 * 60 * 1000;

  function clearWorkout() {
    createBrowserWorkoutSessionRepository().clearActive(session.sessionId);
    setDismissedSessionId(session.sessionId);
    onDismiss?.(session.sessionId);
  }

  function restartWorkout() {
    confirm({
      title: "Restart this workout?",
      description:
        "You’ll start from the beginning and lose your current progress.",
      action: "Restart workout",
      destructive: true,
      onConfirm() {
        createBrowserWorkoutActivityRepository().discardSession(
          session.sessionId,
        );
        createBrowserWorkoutSessionRepository().clearActive(session.sessionId);
        window.location.assign(session.resumeHref);
      },
    });
  }

  function markIncomplete() {
    confirm({
      title: "Save this workout as incomplete?",
      description:
        "It will stay in your activity and you’ll no longer be able to resume it.",
      action: "Save as incomplete",
      onConfirm() {
        createBrowserWorkoutActivityRepository().finalizeIncompleteSession(
          session.sessionId,
          undefined,
          Math.round(session.activeDurationMs / 1000),
        );
        clearWorkout();
      },
    });
  }

  function discardWorkout() {
    confirm({
      title: "Discard this unfinished workout?",
      description: "Your progress for this workout will be deleted.",
      action: "Discard workout",
      destructive: true,
      onConfirm() {
        createBrowserWorkoutActivityRepository().discardSession(
          session.sessionId,
        );
        clearWorkout();
      },
    });
  }

  return (
    <section
      className="active-workout-card"
      aria-labelledby="active-workout-heading"
    >
      <div className="active-workout-card__copy">
        <span className="active-workout-card__status">
          {stale ? "Paused earlier" : "In progress"}
        </span>
        <h2 id="active-workout-heading">{active.workoutName}</h2>
        <p>
          {durationLabel(active.activeDurationMs)} ·{" "}
          {active.currentSection === "warmup"
            ? "Warm-up"
            : active.currentSection === "cooldown"
              ? "Cooldown"
              : "Workout"}{" "}
          section
        </p>
        {stale && (
          <small>
            Started{" "}
            {started.toLocaleDateString(undefined, {
              weekday: "long",
              month: "short",
              day: "numeric",
            })}
            . Your timer is paused.
          </small>
        )}
      </div>
      <div className="active-workout-card__primary">
        <Link className="button button--primary" href={active.resumeHref}>
          Resume workout
        </Link>
        <div className="active-workout-card__actions">
          <button
            className="text-button"
            onClick={restartWorkout}
            type="button"
          >
            Restart
          </button>
          <button
            className="text-button"
            onClick={markIncomplete}
            type="button"
          >
            Save as incomplete
          </button>
          <button
            className="text-button active-workout-card__discard"
            onClick={discardWorkout}
            type="button"
          >
            Discard
          </button>
        </div>
      </div>
    </section>
  );
}
