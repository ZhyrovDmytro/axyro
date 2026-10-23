import type { SessionLifecycleStatus } from "@/domain/session/session-lifecycle";
import type { IntensityLevel } from "@/domain/workout/intensity";

export type ActiveSessionStepStatus =
  "completed" | "skipped" | "current" | "pending";

export type ActiveWorkoutSessionState = {
  version: 1;
  lifecycleStatus: Extract<SessionLifecycleStatus, "in-progress">;
  sessionId: string;
  activityId?: string;
  planId?: string;
  workoutId: string;
  workoutName: string;
  resumeHref: string;
  exitHref: string;
  intensity: IntensityLevel;
  sequenceFingerprint: string;
  startedAt: string;
  lastPersistedAt: string;
  currentIndex: number;
  currentSection?: "warmup" | "main" | "cooldown";
  currentExerciseId?: string;
  currentExerciseIndex: number;
  currentExerciseCount: number;
  currentRound?: number;
  currentInterval: "ready" | "active" | "side-transition" | "rest";
  paused: boolean;
  pausedRemainingMs: number;
  activeDurationMs: number;
  completedSetKeys: string[];
  skippedWorkoutItemIds: string[];
  stepStatuses: ActiveSessionStepStatus[];
};

export type ActiveSessionLoadResult =
  | { kind: "none" }
  | { kind: "valid"; state: ActiveWorkoutSessionState }
  | { kind: "invalid" };

export interface WorkoutSessionRepository {
  loadActive(): ActiveSessionLoadResult;
  saveActive(state: ActiveWorkoutSessionState): ActiveWorkoutSessionState;
  clearActive(sessionId?: string): void;
}
