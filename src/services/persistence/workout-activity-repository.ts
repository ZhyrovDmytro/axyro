import type {
  BodyArea,
  TrainingQuality,
} from "@/domain/exercise/exercise.types";
import type {
  ProgressionPhase,
  SessionAdaptation,
} from "@/domain/training-plan/training-plan.types";
import type { IntensityLevel } from "@/domain/workout/intensity";
import {
  sessionLifecycleStatuses,
  type SessionLifecycleStatus,
} from "@/domain/session/session-lifecycle";

export const perceivedDifficultyValues = [
  "TOO_EASY",
  "SLIGHTLY_EASY",
  "JUST_RIGHT",
  "HARD",
  "TOO_HARD",
] as const;
export type PerceivedDifficulty = (typeof perceivedDifficultyValues)[number];
export const feedbackReasonValues = [
  "OVERALL_INTENSITY",
  "WORKOUT_TOO_LONG",
  "MUSCLE_FATIGUE",
  "TECHNIQUE_DIFFICULTY",
  "INSUFFICIENT_RECOVERY",
  "PAIN_OR_DISCOMFORT",
  "EXERCISES_TOO_SIMPLE",
  "WORKOUT_TOO_SHORT",
  "TOO_MUCH_REST",
  "OTHER",
] as const;
export type FeedbackReason = (typeof feedbackReasonValues)[number];

export const workoutFeedbackValues = [
  "too-easy",
  "just-right",
  "too-hard",
  "pain-or-discomfort",
] as const;

export type WorkoutFeedback = (typeof workoutFeedbackValues)[number];

export const feedbackAffectedAreaValues = [
  "shoulder",
  "elbow-forearm",
  "wrist-hand",
  "neck-upper-back",
  "lower-back",
  "hip-groin",
  "knee",
  "calf-achilles",
  "ankle-foot",
  "other",
] as const;

export type FeedbackAffectedArea = (typeof feedbackAffectedAreaValues)[number];

export type WorkoutSessionSnapshot = {
  workoutName: string;
  focus: TrainingQuality[];
  bodyAreas: BodyArea[];
  items: Array<{
    section: "warmup" | "main" | "cooldown";
    status: "planned" | "completed" | "skipped";
    workoutItemId?: string;
    exerciseId: string;
    exerciseName?: string;
    sets: number;
    completedSets?: number;
    workDurationSeconds: number;
    perSide: boolean;
    restAfterSetSeconds: number;
    restAfterExerciseSeconds: number;
  }>;
  progressionWeek?: number;
  progressionPhase?: ProgressionPhase;
  targetDurationSeconds: number;
  estimatedDurationSeconds: number;
  originalSession?: {
    targetDurationSeconds: number;
    estimatedDurationSeconds: number;
    items: Array<{
      section: "warmup" | "main" | "cooldown";
      status: "planned" | "completed" | "skipped";
      workoutItemId?: string;
      exerciseId: string;
      exerciseName?: string;
      sets: number;
      workDurationSeconds: number;
      perSide: boolean;
      restAfterSetSeconds: number;
      restAfterExerciseSeconds: number;
    }>;
  };
  todayAdaptations?: SessionAdaptation[];
};

export type WorkoutActivity = {
  workoutId: string;
  lastStartedAt: string;
  lastCompletedAt?: string;
  completionCount: number;
  lastIntensity: IntensityLevel;
};

export type CompletedWorkoutSession = {
  id: string;
  activityId?: string;
  sessionId: string;
  workoutId: string;
  startedAt?: string;
  completedAt: string;
  intensity: IntensityLevel;
  snapshot?: WorkoutSessionSnapshot;
  actualDurationSeconds?: number;
};

export const sessionActivityStatuses = sessionLifecycleStatuses;

export type SessionActivityStatus = SessionLifecycleStatus;

export type SessionActivity = {
  resumedAfterInterruption?: boolean;
  rescheduleCount?: number;
  originalScheduledDate?: string;
  id: string;
  planId?: string;
  sessionId: string;
  workoutId: string;
  scheduledDate: string;
  status: SessionActivityStatus;
  plannedSnapshot?: WorkoutSessionSnapshot;
  adaptedSnapshot?: WorkoutSessionSnapshot;
  executedSnapshot?: WorkoutSessionSnapshot;
  startedAt?: string;
  completedAt?: string;
  skippedAt?: string;
  missedAt?: string;
  cancelledAt?: string;
  incompleteAt?: string;
  actualDurationSeconds?: number;
  intensity?: IntensityLevel;
  completionId?: string;
};

export type ScheduledSessionActivityInput = {
  sessionId: string;
  planId: string;
  workoutId: string;
  scheduledDate: string;
  plannedSnapshot: WorkoutSessionSnapshot;
  adaptedSnapshot?: WorkoutSessionSnapshot;
};

export type WorkoutFeedbackEvent = {
  perceivedDifficulty?: PerceivedDifficulty;
  reasons?: FeedbackReason[];
  comment?: string;
  affectedExerciseIds?: string[];
  planId?: string;
  planWeek?: number;
  createdAt?: string;
  updatedAt?: string;
  workoutCompletionPercent?: number;
  actualDurationSeconds?: number;
  expectedDurationSeconds?: number;
  id: string;
  completionId: string;
  sessionId: string;
  workoutId: string;
  completedAt: string;
  recordedAt: string;
  rating: WorkoutFeedback;
  affectedArea?: FeedbackAffectedArea;
  snapshot?: WorkoutSessionSnapshot;
};

export type FeedbackAdaptationDecision = "applied" | "kept" | "cleared";

export type WorkoutFeedbackDecisionEvent = {
  id: string;
  feedbackEventId: string;
  decision: FeedbackAdaptationDecision;
  recordedAt: string;
};

export type RecordCompletedWorkoutInput = {
  activityId?: string;
  sessionId: string;
  workoutId: string;
  intensity: IntensityLevel;
  snapshot: WorkoutSessionSnapshot;
  startedAt?: Date;
  actualDurationSeconds?: number;
  completedAt?: Date;
};

export type SaveFeedbackEventInput = {
  completionId: string;
  perceivedDifficulty?: PerceivedDifficulty;
  reasons?: FeedbackReason[];
  comment?: string;
  affectedExerciseIds?: string[];
  rating?: WorkoutFeedback;
  affectedArea?: FeedbackAffectedArea;
  recordedAt?: Date;
};

export type SaveFeedbackDecisionInput = {
  feedbackEventId: string;
  decision: FeedbackAdaptationDecision;
  recordedAt?: Date;
};

export type SaveInWorkoutDiscomfortInput = {
  sessionId: string;
  workoutId: string;
  affectedArea: FeedbackAffectedArea;
  snapshot: WorkoutSessionSnapshot;
  recordedAt?: Date;
};

export interface WorkoutActivityRepository {
  list(): WorkoutActivity[];
  listCompletions(): CompletedWorkoutSession[];
  getActivityHistory(currentDateKey?: string): SessionActivity[];
  getActivityById(
    activityId: string,
    currentDateKey?: string,
  ): SessionActivity | null;
  getActivitiesForDateRange(
    startDate: string,
    endDate: string,
    currentDateKey?: string,
  ): SessionActivity[];
  getFeedbackForSession(sessionId: string): WorkoutFeedbackEvent[];
  getFeedbackForCompletion(completionId: string): WorkoutFeedbackEvent | null;
  getRecentFeedback(limit?: number): WorkoutFeedbackEvent[];
  getRecentFeedbackForAdaptation(limit?: number): WorkoutFeedbackEvent[];
  getActivePainFeedback(): WorkoutFeedbackEvent[];
  recordStarted(
    workoutId: string,
    intensity: IntensityLevel,
    startedAt?: Date,
  ): WorkoutActivity;
  syncScheduledSessions(
    planId: string,
    sessions: readonly ScheduledSessionActivityInput[],
    currentDateKey: string,
    changedAt?: Date,
  ): SessionActivity[];
  markSessionStarted(
    sessionId: string,
    workoutId: string,
    intensity: IntensityLevel,
    startedAt?: Date,
    resumedAfterInterruption?: boolean,
  ): SessionActivity | null;
  skipSession(sessionId: string, skippedAt?: Date): SessionActivity | null;
  cancelSession(sessionId: string, cancelledAt?: Date): SessionActivity | null;
  markSessionMissed(sessionId: string, missedAt?: Date): SessionActivity | null;
  finalizeIncompleteSession(
    sessionId: string,
    executedSnapshot: WorkoutSessionSnapshot | undefined,
    actualDurationSeconds: number,
    incompleteAt?: Date,
  ): SessionActivity | null;
  discardSession(sessionId: string): void;
  rescheduleSession(
    sessionId: string,
    scheduledDate: string,
  ): SessionActivity | null;
  recordCompleted(input: RecordCompletedWorkoutInput): CompletedWorkoutSession;
  saveFeedbackEvent(input: SaveFeedbackEventInput): WorkoutFeedbackEvent | null;
  saveInWorkoutDiscomfort(
    input: SaveInWorkoutDiscomfortInput,
  ): WorkoutFeedbackEvent;
  clearPainFeedbackBlock(feedbackEventId: string, recordedAt?: Date): void;
  saveFeedbackDecision(
    input: SaveFeedbackDecisionInput,
  ): WorkoutFeedbackDecisionEvent | null;
}

export function scheduledSessionActivityId(planId: string, sessionId: string) {
  return `planned-${planId}-${sessionId}`;
}
