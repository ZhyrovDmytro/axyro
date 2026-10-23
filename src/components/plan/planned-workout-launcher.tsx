"use client";

import { applyBudgetedEffort } from "@/domain/workout/daily-duration";
import Link from "next/link";

import { WorkoutPlayer } from "@/components/player/workout-player";
import { exercises } from "@/content/exercises";
import { buildWorkoutSequence } from "@/domain/workout/build-workout-sequence";
import {
  applyFeedbackAdaptation,
  deriveAdaptation,
} from "@/domain/training-plan/feedback-adaptation";
import { parseIntensityLevel } from "@/domain/workout/intensity";
import { finalizeGeneratedTrainingPlan } from "@/domain/training-plan/generate-training-plan";
import { useTrainingPlan } from "@/hooks/use-training-plan";
import { flattenSessionSections } from "@/domain/workout/session-sections";
import { scheduledSessionActivityId } from "@/services/persistence/workout-activity-repository";

export function PlannedWorkoutLauncher({
  intensityQuery,
  sessionId,
}: {
  intensityQuery?: string | string[];
  sessionId: string;
}) {
  const { plan, ready, updatePlan } = useTrainingPlan();
  if (!ready)
    return (
      <main className="player-shell player-loading">
        Preparing your workout…
      </main>
    );
  const session = plan?.sessions.find((item) => item.id === sessionId);
  if (!plan || !session)
    return (
      <main className="page-shell plan-empty">
        <section>
          <h1>Session not found.</h1>
          <Link className="button button--primary" href="/plan">
            Back to plan
          </Link>
        </section>
      </main>
    );

  const exerciseById = new Map(
    exercises.map((exercise) => [exercise.id, exercise]),
  );
  const intensity = parseIntensityLevel(intensityQuery);
  const composedWorkout = applyBudgetedEffort(
    session.workout,
    intensity,
    exercises,
  );
  const composedSections = session.sections.map((section) =>
    section.type === "main"
      ? { ...section, items: composedWorkout.items }
      : section,
  );
  const composedExercises = flattenSessionSections(composedSections).flatMap(
    (item) => {
      const exercise = exerciseById.get(item.exerciseId);
      return exercise ? [exercise] : [];
    },
  );
  const sequence = buildWorkoutSequence(
    composedWorkout,
    composedExercises,
    composedSections,
  );

  return (
    <WorkoutPlayer
      activityContext={{
        planId: plan.generatedAt,
        activityId: scheduledSessionActivityId(plan.generatedAt, session.id),
        sessionId: session.id,
        progressionWeek: session.weekNumber,
        progressionPhase: session.progressionPhase,
        targetDurationSeconds: session.targetDurationSeconds,
        originalSession: {
          workout: session.originalSessionSnapshot.workout,
          sections: session.originalSessionSnapshot.sections,
          targetDurationSeconds:
            session.originalSessionSnapshot.targetDurationSeconds,
          estimatedDurationSeconds:
            session.originalSessionSnapshot.estimatedDurationSeconds,
        },
        todayAdaptations: session.todayAdaptations,
      }}
      completionHref="/plan"
      exercises={composedExercises}
      exitHref={`/plan/workouts/${session.id}/edit`}
      intensity={intensity}
      onComplete={() =>
        updatePlan((current) => ({
          ...current,
          sessions: current.sessions.map((item) =>
            item.id === session.id ? { ...item, status: "completed" } : item,
          ),
        }))
      }
      onFeedbackRecorded={(event) =>
        deriveAdaptation({
          recentFeedback: [event],
          upcomingSessions: (plan?.sessions ?? []).filter(
            (item) =>
              item.id !== session.id &&
              item.scheduledDate >= session.scheduledDate,
          ),
          exerciseCatalog: exercises,
        })
      }
      onApplyFeedbackAdaptation={(proposal) =>
        updatePlan((current) =>
          finalizeGeneratedTrainingPlan(
            applyFeedbackAdaptation(current, proposal),
            exercises,
          ),
        )
      }
      sequence={sequence}
      sections={composedSections}
      workout={composedWorkout}
    />
  );
}
