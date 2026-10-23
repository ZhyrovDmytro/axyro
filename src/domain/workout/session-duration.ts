import type { Workout } from "./workout.types";

export const SESSION_TIMING = {
  initialReadySeconds: 5,
  exerciseTransitionSeconds: 5,
  sideTransitionSeconds: 4,
  warmupSeconds: 0,
  cooldownSeconds: 0,
} as const;

export const SESSION_DURATION_TOLERANCE = {
  ratio: 0.1,
  maximumSeconds: 2 * 60,
  onTargetSeconds: 30,
} as const;

export function getSessionDurationToleranceSeconds(
  targetDurationSeconds: number,
): number {
  return Math.min(
    SESSION_DURATION_TOLERANCE.maximumSeconds,
    Math.round(targetDurationSeconds * SESSION_DURATION_TOLERANCE.ratio),
  );
}

export type SessionDurationStatus =
  "on_target" | "close" | "shorter_than_requested" | "longer_than_requested";

export type SessionDurationBreakdown = {
  warmupSeconds: number;
  workSeconds: number;
  intraExerciseRestSeconds: number;
  exerciseTransitionSeconds: number;
  sideTransitionSeconds: number;
  cooldownSeconds: number;
  totalSeconds: number;
};

export function calculateSessionDurationBreakdown(
  workout: Pick<Workout, "items">,
): SessionDurationBreakdown {
  let workSeconds = 0;
  let intraExerciseRestSeconds = 0;
  let sideTransitionSeconds = 0;

  workout.items.forEach((item, itemIndex) => {
    const sideCount = item.prescription.perSide ? 2 : 1;
    workSeconds += item.prescription.durationSeconds * sideCount * item.sets;
    intraExerciseRestSeconds +=
      (item.restAfterSetSeconds ?? 0) * Math.max(0, item.sets - 1);

    if (item.prescription.perSide) {
      sideTransitionSeconds += SESSION_TIMING.sideTransitionSeconds * item.sets;
    }

    if (itemIndex < workout.items.length - 1) {
      intraExerciseRestSeconds += item.restAfterExerciseSeconds ?? 0;
    }
  });

  const exerciseTransitionSeconds =
    workout.items.length === 0
      ? 0
      : SESSION_TIMING.initialReadySeconds +
        Math.max(0, workout.items.length - 1) *
          SESSION_TIMING.exerciseTransitionSeconds;
  const totalSeconds =
    SESSION_TIMING.warmupSeconds +
    workSeconds +
    intraExerciseRestSeconds +
    exerciseTransitionSeconds +
    sideTransitionSeconds +
    SESSION_TIMING.cooldownSeconds;

  return {
    warmupSeconds: SESSION_TIMING.warmupSeconds,
    workSeconds,
    intraExerciseRestSeconds,
    exerciseTransitionSeconds,
    sideTransitionSeconds,
    cooldownSeconds: SESSION_TIMING.cooldownSeconds,
    totalSeconds,
  };
}

export function calculateSessionDuration(
  workout: Pick<Workout, "items">,
): number {
  return calculateSessionDurationBreakdown(workout).totalSeconds;
}

export function formatSessionDurationMinutes(seconds: number): number {
  return Math.max(1, Math.round(seconds / 60));
}

export function classifySessionDuration(
  estimatedDurationSeconds: number,
  targetDurationSeconds: number,
): SessionDurationStatus {
  const delta = estimatedDurationSeconds - targetDurationSeconds;
  const tolerance = getSessionDurationToleranceSeconds(targetDurationSeconds);
  if (Math.abs(delta) <= SESSION_DURATION_TOLERANCE.onTargetSeconds) {
    return "on_target";
  }
  if (Math.abs(delta) <= tolerance) return "close";
  return delta < 0 ? "shorter_than_requested" : "longer_than_requested";
}
