import type { BodyArea, Exercise } from "@/domain/exercise/exercise.types";
import {
  calculateSessionDuration,
  classifySessionDuration,
  getSessionDurationToleranceSeconds,
} from "@/domain/workout/session-duration";
import type { Workout, WorkoutItem } from "@/domain/workout/workout.types";
import type {
  FeedbackAdaptation,
  FeedbackAdaptationChange,
  PlannedWorkout,
  TrainingPlan,
} from "./training-plan.types";
import type {
  FeedbackAffectedArea,
  WorkoutFeedbackEvent,
} from "@/services/persistence/workout-activity-repository";

export type FeedbackAdaptationProposal = {
  source: "feedback";
  feedbackEventId: string;
  rating: "too-easy" | "too-hard" | "pain-or-discomfort";
  type: FeedbackAdaptation["type"];
  affectedArea?: FeedbackAffectedArea;
  targets: Array<{
    sessionId: string;
    adaptation: FeedbackAdaptation;
  }>;
};

const WORK_STEP_SECONDS = 5;
const RECOVERY_STEP_SECONDS = 5;
const MIN_RECOVERY_SECONDS = 10;

export const feedbackAffectedBodyAreas: Record<
  Exclude<FeedbackAffectedArea, "other">,
  BodyArea[]
> = {
  shoulder: ["shoulders", "arms"],
  "elbow-forearm": ["arms", "shoulders"],
  "wrist-hand": ["arms", "shoulders"],
  "neck-upper-back": ["shoulders", "back"],
  "lower-back": ["back", "core"],
  "hip-groin": ["legs", "glutes"],
  knee: ["legs"],
  "calf-achilles": ["legs"],
  "ankle-foot": ["legs"],
};

function itemBounds(item: WorkoutItem) {
  return {
    minSets: item.minSets ?? item.sets,
    maxSets: item.maxSets ?? item.sets,
    minWorkSeconds: item.minWorkSeconds ?? item.prescription.durationSeconds,
    maxWorkSeconds: item.maxWorkSeconds ?? item.prescription.durationSeconds,
    priority: item.priority ?? 50,
  };
}

function correctionEligible(exercise: Exercise | undefined) {
  if (!exercise) return false;
  const techniqueFirst = exercise.roles.some((role) =>
    ["mobility", "activation"].includes(role),
  );
  const explosive = exercise.qualities.some((quality) =>
    ["power", "explosiveness"].includes(quality),
  );
  return (
    !techniqueFirst &&
    !explosive &&
    exercise.roles.some((role) => ["strength", "stability"].includes(role))
  );
}

function updateItem(
  workout: Workout,
  itemId: string,
  update: (item: WorkoutItem) => WorkoutItem,
) {
  return {
    ...workout,
    items: workout.items.map((item) =>
      item.id === itemId ? update(item) : item,
    ),
  };
}

function exerciseBodyAreas(
  exerciseId: string,
  exerciseById: ReadonlyMap<string, Exercise>,
) {
  return exerciseById.get(exerciseId)?.bodyAreas ?? [];
}

function painAreasForEvent(event: WorkoutFeedbackEvent): Set<BodyArea> {
  if (!event.affectedArea || event.affectedArea === "other") {
    return new Set(event.snapshot?.bodyAreas ?? []);
  }
  return new Set(feedbackAffectedBodyAreas[event.affectedArea]);
}

function comparableScore(
  event: WorkoutFeedbackEvent,
  session: PlannedWorkout,
  exerciseById: ReadonlyMap<string, Exercise>,
) {
  if (!event.snapshot) return 0;
  const sourceExerciseIds = new Set(
    event.snapshot.items.map((item) => item.exerciseId),
  );
  const exerciseOverlap = session.workout.items.filter((item) =>
    sourceExerciseIds.has(item.exerciseId),
  ).length;
  const sourceFocus = new Set(event.snapshot.focus);
  const focusOverlap = session.workout.focus.filter((focus) =>
    sourceFocus.has(focus),
  ).length;
  const sourceBodyAreas = new Set(event.snapshot.bodyAreas);
  const sessionBodyAreas = new Set(
    session.workout.items.flatMap((item) =>
      exerciseBodyAreas(item.exerciseId, exerciseById),
    ),
  );
  const bodyAreaOverlap = [...sessionBodyAreas].filter((area) =>
    sourceBodyAreas.has(area),
  ).length;
  return exerciseOverlap * 4 + focusOverlap * 2 + bodyAreaOverlap;
}

export function getRecentFeedbackForComparableSessions({
  recentFeedback,
  upcomingSessions,
  exerciseCatalog,
}: {
  recentFeedback: readonly WorkoutFeedbackEvent[];
  upcomingSessions: readonly PlannedWorkout[];
  exerciseCatalog: readonly Exercise[];
}) {
  const exerciseById = new Map(
    exerciseCatalog.map((exercise) => [exercise.id, exercise]),
  );
  return [...recentFeedback]
    .sort((left, right) => right.recordedAt.localeCompare(left.recordedAt))
    .filter((event) =>
      upcomingSessions.some(
        (session) => comparableScore(event, session, exerciseById) > 0,
      ),
    );
}

function proposalForTooEasy(
  event: WorkoutFeedbackEvent,
  session: PlannedWorkout,
  exerciseById: ReadonlyMap<string, Exercise>,
): FeedbackAdaptation | null {
  const tolerance = getSessionDurationToleranceSeconds(
    session.targetDurationSeconds,
  );
  const maximumDuration = session.targetDurationSeconds + tolerance;
  const progressionBlockedExerciseIds = new Set(
    session.feedbackAdaptations.flatMap((adaptation) =>
      adaptation.changes.flatMap((change) =>
        change.type === "block_progression" ? [change.exerciseId] : [],
      ),
    ),
  );
  const eligibleItems = session.workout.items
    .filter(
      (item) =>
        correctionEligible(exerciseById.get(item.exerciseId)) &&
        !progressionBlockedExerciseIds.has(item.exerciseId),
    )
    .sort(
      (left, right) =>
        itemBounds(right).priority - itemBounds(left).priority ||
        left.id.localeCompare(right.id),
    );

  for (const item of eligibleItems) {
    if (item.prescription.durationSeconds >= itemBounds(item).maxWorkSeconds) {
      continue;
    }
    const deltaSeconds = Math.min(
      WORK_STEP_SECONDS,
      itemBounds(item).maxWorkSeconds - item.prescription.durationSeconds,
    );
    const next = updateItem(session.workout, item.id, (current) => ({
      ...current,
      prescription: {
        ...current.prescription,
        durationSeconds: current.prescription.durationSeconds + deltaSeconds,
      },
    }));
    if (calculateSessionDuration(next) <= maximumDuration) {
      return {
        source: "feedback",
        feedbackEventId: event.id,
        rating: "too-easy",
        type: "increase_work_duration",
        changes: [
          {
            type: "increase_work_duration",
            workoutItemId: item.id,
            exerciseId: item.exerciseId,
            deltaSeconds,
          },
        ],
      };
    }
  }

  const sessionIsAtUpperDuration =
    calculateSessionDuration(session.workout) >= maximumDuration;
  for (const item of eligibleItems) {
    if (sessionIsAtUpperDuration) break;
    if (item.sets >= itemBounds(item).maxSets) continue;
    const next = updateItem(session.workout, item.id, (current) => ({
      ...current,
      sets: current.sets + 1,
    }));
    if (calculateSessionDuration(next) <= maximumDuration) {
      return {
        source: "feedback",
        feedbackEventId: event.id,
        rating: "too-easy",
        type: "add_round",
        changes: [
          {
            type: "add_round",
            workoutItemId: item.id,
            exerciseId: item.exerciseId,
            deltaRounds: 1,
          },
        ],
      };
    }
  }

  for (const item of eligibleItems) {
    const setRecovery = item.restAfterSetSeconds ?? 0;
    if (setRecovery > MIN_RECOVERY_SECONDS) {
      return {
        source: "feedback",
        feedbackEventId: event.id,
        rating: "too-easy",
        type: "decrease_recovery",
        changes: [
          {
            type: "decrease_recovery",
            workoutItemId: item.id,
            exerciseId: item.exerciseId,
            recovery: "between_sets",
            deltaSeconds: Math.min(
              RECOVERY_STEP_SECONDS,
              setRecovery - MIN_RECOVERY_SECONDS,
            ),
          },
        ],
      };
    }
  }
  return null;
}

function proposalForTooHard(
  event: WorkoutFeedbackEvent,
  session: PlannedWorkout,
  exerciseById: ReadonlyMap<string, Exercise>,
): FeedbackAdaptation | null {
  const tolerance = getSessionDurationToleranceSeconds(
    session.targetDurationSeconds,
  );
  const minimumDuration = session.targetDurationSeconds - tolerance;
  const maximumDuration = session.targetDurationSeconds + tolerance;
  const progressionBlockedExerciseIds = new Set(
    session.feedbackAdaptations.flatMap((adaptation) =>
      adaptation.changes.flatMap((change) =>
        change.type === "block_progression" ? [change.exerciseId] : [],
      ),
    ),
  );
  const eligibleItems = session.workout.items
    .filter(
      (item) =>
        correctionEligible(exerciseById.get(item.exerciseId)) &&
        !progressionBlockedExerciseIds.has(item.exerciseId),
    )
    .sort(
      (left, right) =>
        itemBounds(right).priority - itemBounds(left).priority ||
        left.id.localeCompare(right.id),
    );

  for (const item of eligibleItems) {
    if (item.prescription.durationSeconds <= itemBounds(item).minWorkSeconds) {
      continue;
    }
    const deltaSeconds = Math.min(
      WORK_STEP_SECONDS,
      item.prescription.durationSeconds - itemBounds(item).minWorkSeconds,
    );
    const next = updateItem(session.workout, item.id, (current) => ({
      ...current,
      prescription: {
        ...current.prescription,
        durationSeconds: current.prescription.durationSeconds - deltaSeconds,
      },
    }));
    if (calculateSessionDuration(next) >= minimumDuration) {
      return {
        source: "feedback",
        feedbackEventId: event.id,
        rating: "too-hard",
        type: "decrease_work_duration",
        changes: [
          {
            type: "decrease_work_duration",
            workoutItemId: item.id,
            exerciseId: item.exerciseId,
            deltaSeconds,
          },
        ],
      };
    }
  }

  const addedRoundExerciseIds = new Set(
    session.progression.changes
      .filter((change) => change.type === "round_added")
      .map((change) => change.exerciseId),
  );
  for (const item of eligibleItems) {
    if (
      !addedRoundExerciseIds.has(item.exerciseId) ||
      item.sets <= itemBounds(item).minSets
    ) {
      continue;
    }
    const next = updateItem(session.workout, item.id, (current) => ({
      ...current,
      sets: current.sets - 1,
    }));
    if (calculateSessionDuration(next) >= minimumDuration) {
      return {
        source: "feedback",
        feedbackEventId: event.id,
        rating: "too-hard",
        type: "remove_round",
        changes: [
          {
            type: "remove_round",
            workoutItemId: item.id,
            exerciseId: item.exerciseId,
            deltaRounds: 1,
          },
        ],
      };
    }
  }

  for (const item of eligibleItems) {
    if (!item.restAfterSetSeconds || item.sets <= 1) continue;
    const next = updateItem(session.workout, item.id, (current) => ({
      ...current,
      restAfterSetSeconds:
        (current.restAfterSetSeconds ?? 0) + RECOVERY_STEP_SECONDS,
    }));
    if (calculateSessionDuration(next) <= maximumDuration) {
      return {
        source: "feedback",
        feedbackEventId: event.id,
        rating: "too-hard",
        type: "increase_recovery",
        changes: [
          {
            type: "increase_recovery",
            workoutItemId: item.id,
            exerciseId: item.exerciseId,
            recovery: "between_sets",
            deltaSeconds: RECOVERY_STEP_SECONDS,
          },
        ],
      };
    }
  }
  return null;
}

function painAdaptationForSession(
  event: WorkoutFeedbackEvent,
  session: PlannedWorkout,
  exerciseById: ReadonlyMap<string, Exercise>,
): FeedbackAdaptation | null {
  if (!event.affectedArea) return null;
  const blockedAreas = painAreasForEvent(event);
  const affectedItems = session.workout.items.filter((item) =>
    exerciseBodyAreas(item.exerciseId, exerciseById).some((area) =>
      blockedAreas.has(area),
    ),
  );
  if (affectedItems.length === 0) return null;
  const changes: FeedbackAdaptationChange[] = [];
  for (const item of affectedItems) {
    const progressionChanges = session.progression.changes.filter(
      (change) => change.exerciseId === item.exerciseId,
    );
    for (const change of progressionChanges) {
      if (change.type === "work_duration_increased") {
        const deltaSeconds = Math.min(
          change.seconds,
          item.prescription.durationSeconds - itemBounds(item).minWorkSeconds,
        );
        if (deltaSeconds > 0) {
          changes.push({
            type: "decrease_work_duration",
            workoutItemId: item.id,
            exerciseId: item.exerciseId,
            deltaSeconds,
          });
        }
      } else if (change.type === "round_added") {
        const deltaRounds = Math.min(
          change.rounds,
          item.sets - itemBounds(item).minSets,
        );
        if (deltaRounds > 0) {
          changes.push({
            type: "remove_round",
            workoutItemId: item.id,
            exerciseId: item.exerciseId,
            deltaRounds,
          });
        }
      } else if (change.type === "recovery_reduced") {
        changes.push({
          type: "increase_recovery",
          workoutItemId: item.id,
          exerciseId: item.exerciseId,
          recovery: change.recovery,
          deltaSeconds: change.seconds,
        });
      }
    }
    changes.push({ type: "block_progression", exerciseId: item.exerciseId });
  }
  return {
    source: "feedback",
    feedbackEventId: event.id,
    rating: "pain-or-discomfort",
    type: "pain_progression_block",
    affectedArea: event.affectedArea,
    changes,
  };
}

export function deriveAdaptation({
  recentFeedback,
  upcomingSessions,
  exerciseCatalog,
}: {
  recentFeedback: readonly WorkoutFeedbackEvent[];
  upcomingSessions: readonly PlannedWorkout[];
  exerciseCatalog: readonly Exercise[];
}): FeedbackAdaptationProposal | null {
  const exerciseById = new Map(
    exerciseCatalog.map((exercise) => [exercise.id, exercise]),
  );
  const orderedSessions = [...upcomingSessions]
    .filter((session) => session.status === "scheduled")
    .sort((left, right) =>
      left.scheduledDate.localeCompare(right.scheduledDate),
    );
  const relevantFeedback = getRecentFeedbackForComparableSessions({
    recentFeedback,
    upcomingSessions: orderedSessions,
    exerciseCatalog,
  }).sort(
    (left, right) =>
      Number(right.rating === "pain-or-discomfort") -
        Number(left.rating === "pain-or-discomfort") ||
      right.recordedAt.localeCompare(left.recordedAt),
  );

  for (const event of relevantFeedback) {
    if (event.rating === "just-right") continue;
    if (
      orderedSessions.some((session) =>
        session.feedbackAdaptations.some(
          (adaptation) => adaptation.feedbackEventId === event.id,
        ),
      )
    ) {
      continue;
    }

    if (event.rating === "pain-or-discomfort") {
      const targets = orderedSessions.flatMap((session) => {
        const adaptation = painAdaptationForSession(
          event,
          session,
          exerciseById,
        );
        return adaptation ? [{ sessionId: session.id, adaptation }] : [];
      });
      if (targets.length > 0) {
        return {
          source: "feedback",
          feedbackEventId: event.id,
          rating: event.rating,
          type: "pain_progression_block",
          ...(event.affectedArea ? { affectedArea: event.affectedArea } : {}),
          targets,
        };
      }
      continue;
    }

    const comparableSessions = orderedSessions
      .map((session) => ({
        session,
        score: comparableScore(event, session, exerciseById),
      }))
      .filter(({ score }) => score > 0)
      .sort(
        (left, right) =>
          left.session.scheduledDate.localeCompare(
            right.session.scheduledDate,
          ) || right.score - left.score,
      );
    for (const { session } of comparableSessions) {
      const adaptation =
        event.rating === "too-easy"
          ? proposalForTooEasy(event, session, exerciseById)
          : proposalForTooHard(event, session, exerciseById);
      if (adaptation) {
        return {
          source: "feedback",
          feedbackEventId: event.id,
          rating: event.rating,
          type: adaptation.type,
          targets: [{ sessionId: session.id, adaptation }],
        };
      }
    }
  }
  return null;
}

function applyChange(workout: Workout, change: FeedbackAdaptationChange) {
  if (change.type === "block_progression") return workout;
  return updateItem(workout, change.workoutItemId, (item) => {
    switch (change.type) {
      case "increase_work_duration":
        return {
          ...item,
          prescription: {
            ...item.prescription,
            durationSeconds:
              item.prescription.durationSeconds + change.deltaSeconds,
          },
        };
      case "decrease_work_duration":
        return {
          ...item,
          prescription: {
            ...item.prescription,
            durationSeconds:
              item.prescription.durationSeconds - change.deltaSeconds,
          },
        };
      case "add_round":
        return { ...item, sets: item.sets + change.deltaRounds };
      case "remove_round":
        return { ...item, sets: item.sets - change.deltaRounds };
      case "increase_recovery":
      case "decrease_recovery": {
        const field =
          change.recovery === "between_sets"
            ? "restAfterSetSeconds"
            : "restAfterExerciseSeconds";
        return {
          ...item,
          [field]:
            (item[field] ?? 0) +
            (change.type === "increase_recovery"
              ? change.deltaSeconds
              : -change.deltaSeconds),
        };
      }
    }
  });
}

export function applyFeedbackAdaptation(
  plan: TrainingPlan,
  proposal: FeedbackAdaptationProposal,
): TrainingPlan {
  const adaptationBySession = new Map(
    proposal.targets.map((target) => [target.sessionId, target.adaptation]),
  );
  return {
    ...plan,
    sessions: plan.sessions.map((session) => {
      const adaptation = adaptationBySession.get(session.id);
      if (!adaptation) return session;
      if (
        session.feedbackAdaptations.some(
          (existing) => existing.feedbackEventId === adaptation.feedbackEventId,
        )
      ) {
        return session;
      }
      const workout = adaptation.changes.reduce(
        (current, change) => applyChange(current, change),
        session.workout,
      );
      const estimatedDurationSeconds = calculateSessionDuration(workout);
      return {
        ...session,
        workout: {
          ...workout,
          estimatedMinutes: Math.max(
            1,
            Math.round(estimatedDurationSeconds / 60),
          ),
        },
        estimatedDurationSeconds,
        durationDeltaSeconds:
          estimatedDurationSeconds - session.targetDurationSeconds,
        durationStatus: classifySessionDuration(
          estimatedDurationSeconds,
          session.targetDurationSeconds,
        ),
        feedbackAdaptations: [...session.feedbackAdaptations, adaptation],
      };
    }),
  };
}
