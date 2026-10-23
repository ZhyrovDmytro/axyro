import type { Exercise } from "@/domain/exercise/exercise.types";
import type { MovementRole } from "@/domain/sport/sport-exercise-profile.types";
import type { SportExerciseProfile } from "@/domain/sport/sport-exercise-profile.types";
import type { Workout, WorkoutFamily } from "@/domain/workout/workout.types";

export type CatalogIssue = {
  severity: "error" | "warning";
  code: string;
  message: string;
  subjectId: string;
};

/** Specialized setup requirements are excluded from home training. */
export function isHomeExercise(exercise: Exercise) {
  return !exercise.setupRequirements.some(
    (requirement) =>
      requirement === "foam_roller" || requirement === "low_obstacle",
  );
}

export function hasUsableExerciseMedia(exercise: Exercise) {
  return (
    exercise.media.status === "production" &&
    Boolean(
      exercise.media.uri ||
      exercise.media.fallbackUri ||
      exercise.media.fallback === "instructional",
    )
  );
}

export function hasCompleteCoachingContent(exercise: Exercise) {
  return (
    exercise.instructions.length > 0 &&
    exercise.cues.length > 0 &&
    exercise.commonMistakes.length > 0
  );
}

export function isExercisePublishable(exercise: Exercise) {
  return (
    hasUsableExerciseMedia(exercise) && hasCompleteCoachingContent(exercise)
  );
}

/** Planner boundary: a session may only contain reviewed, production-ready content. */
export function isExercisePlanEligible(exercise: Exercise) {
  const defaults = exercise.defaultPrescription;
  const hasTimedDefault =
    "workDurationSeconds" in defaults || Boolean(defaults.durationSeconds);
  return (
    isExercisePublishable(exercise) &&
    isHomeExercise(exercise) &&
    hasTimedDefault &&
    exercise.planning.mediaStatus === "production" &&
    exercise.media.status === "production"
  );
}

export function isWorkoutPublishable(
  workout: Workout,
  exerciseCatalog: readonly Exercise[],
) {
  const publishableIds = new Set(
    exerciseCatalog
      .filter(
        (exercise) =>
          isExercisePublishable(exercise) && isHomeExercise(exercise),
      )
      .map((exercise) => exercise.id),
  );
  return (
    workout.publicationStatus === "published" &&
    workout.items.every((item) => publishableIds.has(item.exerciseId))
  );
}

export function validateExerciseCatalog(
  exerciseCatalog: readonly Exercise[],
  assetExists?: (publicPath: string) => boolean,
): CatalogIssue[] {
  const issues: CatalogIssue[] = [];
  const ids = new Set(exerciseCatalog.map((exercise) => exercise.id));
  const seenIds = new Set<string>();
  const seenSlugs = new Set<string>();
  const referenceFields = [
    "variantOf",
    "easierVariantId",
    "harderVariantId",
    "equipmentFreeVariantId",
  ] as const;
  const planningReferenceFields = [
    "regressionExerciseId",
    "progressionExerciseId",
  ] as const;

  for (const exercise of exerciseCatalog) {
    if (seenIds.has(exercise.id)) {
      issues.push({
        severity: "error",
        code: "duplicate-id",
        subjectId: exercise.id,
        message: `Duplicate exercise id: ${exercise.id}.`,
      });
    }
    if (seenSlugs.has(exercise.slug)) {
      issues.push({
        severity: "error",
        code: "duplicate-slug",
        subjectId: exercise.id,
        message: `Duplicate exercise slug: ${exercise.slug}.`,
      });
    }
    seenIds.add(exercise.id);
    seenSlugs.add(exercise.slug);

    if (!hasCompleteCoachingContent(exercise)) {
      issues.push({
        severity: "error",
        code: "incomplete-coaching",
        subjectId: exercise.id,
        message:
          "Setup, technique cues, and safety/mistake guidance are required.",
      });
    }
    if (!hasUsableExerciseMedia(exercise)) {
      issues.push({
        severity: "warning",
        code: "draft-media",
        subjectId: exercise.id,
        message:
          "Exercise remains development-only until production media or a reviewed fallback is supplied.",
      });
    }
    for (const field of referenceFields) {
      const referencedId = exercise[field];
      if (
        referencedId &&
        (!ids.has(referencedId) || referencedId === exercise.id)
      ) {
        issues.push({
          severity: "error",
          code: "invalid-variant-link",
          subjectId: exercise.id,
          message: `${field} points to an unknown or self-referencing exercise: ${referencedId}.`,
        });
      }
    }
    for (const field of planningReferenceFields) {
      const referencedId = exercise.planning[field];
      if (
        referencedId &&
        (!ids.has(referencedId) || referencedId === exercise.id)
      ) {
        issues.push({
          severity: "error",
          code: "invalid-planning-variant-link",
          subjectId: exercise.id,
          message: `planning.${field} points to an unknown or self-referencing exercise: ${referencedId}.`,
        });
      }
    }
    if (exercise.planning.mediaStatus !== exercise.media.status) {
      issues.push({
        severity: "error",
        code: "media-readiness-mismatch",
        subjectId: exercise.id,
        message: "Planning media status must match the canonical media status.",
      });
    }
    if (assetExists) {
      for (const uri of [
        exercise.media.uri,
        exercise.media.posterUri,
        exercise.media.fallbackUri,
        exercise.movementFrames.start.uri,
        exercise.movementFrames.end.uri,
      ]) {
        if (uri?.startsWith("/") && !assetExists(uri)) {
          issues.push({
            severity: "error",
            code: "missing-local-asset",
            subjectId: exercise.id,
            message: `Local media asset does not exist: ${uri}.`,
          });
        }
      }
    }
  }
  return issues;
}

export function validateWorkoutCatalog(
  workoutCatalog: readonly Workout[],
  exerciseCatalog: readonly Exercise[],
): CatalogIssue[] {
  const issues: CatalogIssue[] = [];
  const exerciseIds = new Set(exerciseCatalog.map((exercise) => exercise.id));
  for (const workout of workoutCatalog) {
    for (const item of workout.items) {
      if (!exerciseIds.has(item.exerciseId)) {
        issues.push({
          severity: "error",
          code: "unknown-workout-exercise",
          subjectId: workout.id,
          message: `Workout references unknown exercise: ${item.exerciseId}.`,
        });
      }
    }
    if (
      workout.publicationStatus === "published" &&
      !isWorkoutPublishable(workout, exerciseCatalog)
    ) {
      issues.push({
        severity: "error",
        code: "unpublishable-workout",
        subjectId: workout.id,
        message:
          "Published workout references exercise content that is not publishable.",
      });
    }
  }
  return issues;
}

export type ContentInventory = {
  exercises: { total: number; published: number; draft: number };
  media: Record<"video" | "animation" | "image", number>;
  movementRoles: Partial<Record<MovementRole, number>>;
  workoutFamilies: Partial<Record<WorkoutFamily, number>>;
};

export function createContentInventory(
  exerciseCatalog: readonly Exercise[],
  profiles: readonly SportExerciseProfile[],
  workoutCatalog: readonly Workout[],
): ContentInventory {
  const published = exerciseCatalog.filter(isExercisePublishable).length;
  const media: ContentInventory["media"] = { video: 0, animation: 0, image: 0 };
  for (const exercise of exerciseCatalog) media[exercise.media.type] += 1;
  const movementRoles: ContentInventory["movementRoles"] = {};
  for (const profile of profiles) {
    for (const role of profile.movementRoles)
      movementRoles[role] = (movementRoles[role] ?? 0) + 1;
  }
  const workoutFamilies: ContentInventory["workoutFamilies"] = {};
  for (const workout of workoutCatalog) {
    for (const family of workout.families ?? [])
      workoutFamilies[family] = (workoutFamilies[family] ?? 0) + 1;
  }
  return {
    exercises: {
      total: exerciseCatalog.length,
      published,
      draft: exerciseCatalog.length - published,
    },
    media,
    movementRoles,
    workoutFamilies,
  };
}
