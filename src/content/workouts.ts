import { buildDailyWorkout } from "@/domain/workout/daily-duration";

import { z } from "zod";

import { exercises } from "./exercises";
import { workoutSchema } from "@/domain/workout/workout.schema";
import { isWorkoutPublishable } from "@/domain/content/catalog-quality";
import { padelPerformanceWorkouts } from "@/content/padel-performance-workouts";

const workoutCatalogSchema = z
  .array(workoutSchema)
  .superRefine((workouts, context) => {
    const exerciseIds = new Set(exercises.map((exercise) => exercise.id));
    const workoutIds = new Set<string>();
    const workoutSlugs = new Set<string>();

    workouts.forEach((workout, workoutIndex) => {
      if (workoutIds.has(workout.id)) {
        context.addIssue({
          code: "custom",
          message: `Duplicate workout id: ${workout.id}`,
          path: [workoutIndex, "id"],
        });
      }
      if (workoutSlugs.has(workout.slug)) {
        context.addIssue({
          code: "custom",
          message: `Duplicate workout slug: ${workout.slug}`,
          path: [workoutIndex, "slug"],
        });
      }

      const itemIds = new Set<string>();
      workout.items.forEach((item, itemIndex) => {
        if (!exerciseIds.has(item.exerciseId)) {
          context.addIssue({
            code: "custom",
            message: `Unknown exercise id: ${item.exerciseId}`,
            path: [workoutIndex, "items", itemIndex, "exerciseId"],
          });
        }
        if (itemIds.has(item.id)) {
          context.addIssue({
            code: "custom",
            message: `Duplicate workout item id: ${item.id}`,
            path: [workoutIndex, "items", itemIndex, "id"],
          });
        }
        itemIds.add(item.id);
      });

      workoutIds.add(workout.id);
      workoutSlugs.add(workout.slug);
    });
  });

export const workouts = workoutCatalogSchema.parse([
  ...padelPerformanceWorkouts,
  {
    id: "foundation-strength",
    access: "free",
    slug: "foundation-strength",
    name: "Foundation Strength",
    shortDescription:
      "A short full-body strength session for controlled movement.",
    difficulty: "beginner",
    focus: ["strength", "stability"],
    primaryFamily: "lower-body-strength",
    families: ["lower-body-strength", "single-leg-stability"],
    publicationStatus: "published",
    estimatedMinutes: 7,
    items: [
      {
        id: "foundation-squats",
        exerciseId: "bodyweight-squat",
        sets: 2,
        role: "core",
        priority: 100,
        minSets: 1,
        maxSets: 8,
        minWorkSeconds: 20,
        maxWorkSeconds: 50,
        prescription: { type: "timed", durationSeconds: 30 },
        restAfterSetSeconds: 30,
        restAfterExerciseSeconds: 20,
      },
      {
        id: "foundation-rows",
        exerciseId: "single-arm-row",
        sets: 2,
        role: "core",
        priority: 90,
        minSets: 1,
        maxSets: 8,
        minWorkSeconds: 20,
        maxWorkSeconds: 45,
        prescription: { type: "timed", durationSeconds: 25, perSide: true },
        restAfterSetSeconds: 30,
        restAfterExerciseSeconds: 20,
      },
      {
        id: "foundation-dead-bug",
        exerciseId: "dead-bug",
        sets: 2,
        role: "accessory",
        priority: 70,
        minSets: 1,
        maxSets: 8,
        minWorkSeconds: 20,
        maxWorkSeconds: 50,
        prescription: { type: "timed", durationSeconds: 30 },
        restAfterSetSeconds: 20,
      },
    ],
  },
  {
    id: "lower-body-control",
    slug: "lower-body-control",
    name: "Lower-body Control",
    shortDescription:
      "A compact session for leg strength, balance, and stability.",
    difficulty: "beginner",
    focus: ["strength", "stability"],
    primaryFamily: "single-leg-stability",
    families: ["single-leg-stability", "lower-body-strength"],
    publicationStatus: "published",
    estimatedMinutes: 5,
    items: [
      {
        id: "control-lunges",
        exerciseId: "reverse-lunge",
        sets: 2,
        role: "core",
        priority: 100,
        minSets: 1,
        maxSets: 9,
        minWorkSeconds: 20,
        maxWorkSeconds: 60,
        prescription: { type: "timed", durationSeconds: 25, perSide: true },
        restAfterSetSeconds: 30,
        restAfterExerciseSeconds: 20,
      },
      {
        id: "control-squats",
        exerciseId: "bodyweight-squat",
        sets: 2,
        role: "core",
        priority: 90,
        minSets: 1,
        maxSets: 9,
        minWorkSeconds: 20,
        maxWorkSeconds: 60,
        prescription: { type: "timed", durationSeconds: 30 },
        restAfterSetSeconds: 30,
      },
    ],
  },
  {
    id: "padel-shoulder-control",
    slug: "padel-shoulder-control",
    name: "Padel Shoulder Control",
    shortDescription:
      "A focused shoulder-control circuit for repeated overhead padel actions.",
    difficulty: "intermediate",
    focus: ["mobility", "stability", "endurance"],
    primaryFamily: "overhead-strength",
    families: ["overhead-strength", "mobility"],
    publicationStatus: "draft",
    estimatedMinutes: 4,
    items: [
      {
        id: "padel-plate-over-obstacle",
        exerciseId: "single-arm-prone-plate-over-obstacle",
        sets: 1,
        role: "core",
        priority: 100,
        minSets: 1,
        maxSets: 8,
        minWorkSeconds: 20,
        maxWorkSeconds: 60,
        prescription: {
          type: "timed",
          durationSeconds: 30,
          perSide: true,
        },
        restAfterExerciseSeconds: 15,
        notes: ["Use a very light load and a comfortable overhead range."],
      },
      {
        id: "padel-foam-roller-overhead-press",
        exerciseId: "prone-foam-roller-overhead-shoulder-press",
        sets: 1,
        role: "core",
        priority: 90,
        minSets: 1,
        maxSets: 8,
        minWorkSeconds: 20,
        maxWorkSeconds: 60,
        prescription: { type: "timed", durationSeconds: 30 },
        restAfterExerciseSeconds: 20,
        notes: ["Keep both arms moving symmetrically under control."],
      },
      {
        id: "padel-foam-roller-shoulder-rotation",
        exerciseId: "prone-foam-roller-plate-internal-external-rotation",
        sets: 1,
        role: "core",
        priority: 80,
        minSets: 1,
        maxSets: 8,
        minWorkSeconds: 20,
        maxWorkSeconds: 60,
        prescription: { type: "timed", durationSeconds: 30 },
        notes: ["Use very light resistance and avoid forcing the range."],
      },
    ],
  },
  {
    id: "padel-core-rotation",
    slug: "padel-core-rotation",
    name: "Padel Core Rotation",
    shortDescription:
      "A focused dumbbell session for rotational power, control, balance, and anti-rotation strength.",
    difficulty: "intermediate",
    focus: ["power", "rotation", "anti-rotation", "stability"],
    primaryFamily: "rotational-core",
    families: ["rotational-core", "single-leg-stability"],
    publicationStatus: "published",
    estimatedMinutes: 20,
    items: [
      {
        id: "padel-core-standing-wood-chop",
        exerciseId: "standing-dumbbell-wood-chop",
        sets: 3,
        role: "core",
        priority: 95,
        minSets: 1,
        maxSets: 5,
        minWorkSeconds: 20,
        maxWorkSeconds: 40,
        prescription: { type: "timed", durationSeconds: 25, perSide: true },
        restAfterSetSeconds: 20,
        restAfterExerciseSeconds: 20,
        notes: [
          "Follow the sequence legs, hips, torso, then arms.",
          "Allow the feet to pivot through the diagonal rotation.",
        ],
      },
      {
        id: "padel-core-side-plank-rotation",
        exerciseId: "side-plank-rotation",
        sets: 3,
        role: "core",
        priority: 85,
        minSets: 1,
        maxSets: 5,
        minWorkSeconds: 20,
        maxWorkSeconds: 40,
        prescription: { type: "timed", durationSeconds: 25, perSide: true },
        restAfterSetSeconds: 20,
        restAfterExerciseSeconds: 20,
        notes: ["Move slowly and keep the hips lifted throughout."],
      },
      {
        id: "padel-core-dead-bug",
        exerciseId: "dead-bug",
        sets: 3,
        role: "core",
        priority: 80,
        minSets: 1,
        maxSets: 5,
        minWorkSeconds: 20,
        maxWorkSeconds: 45,
        prescription: { type: "timed", durationSeconds: 30 },
        restAfterSetSeconds: 20,
        restAfterExerciseSeconds: 15,
        notes: ["Resist extension and keep the lower back controlled."],
      },
      {
        id: "padel-core-bird-dog",
        exerciseId: "bird-dog",
        sets: 2,
        role: "accessory",
        priority: 45,
        minSets: 1,
        maxSets: 5,
        minWorkSeconds: 20,
        maxWorkSeconds: 45,
        prescription: { type: "timed", durationSeconds: 30 },
        restAfterSetSeconds: 20,
        notes: ["Keep the pelvis level and resist unwanted rotation."],
      },
    ],
  },
]);

/** Workouts whose full exercise chain meets the production content contract. */
export const publishedWorkouts = workouts.filter((workout) =>
  isWorkoutPublishable(workout, exercises),
);

/**
 * Small, non-personalized quick starts for people who want to move immediately.
 * Personalized plans are assembled from the exercise catalog instead of this list.
 */
const starterWorkoutIds = new Set([
  "foundation-strength",
  "lower-body-control",
  "padel-shoulder-overhead-durability",
  "padel-core-rotation",
  "padel-elbow-forearm-capacity",
  "padel-calf-ankle-resilience",
]);

export const starterWorkouts = publishedWorkouts
  .filter((workout) => starterWorkoutIds.has(workout.id))
  .sort(
    (left, right) =>
      [...starterWorkoutIds].indexOf(left.id) -
      [...starterWorkoutIds].indexOf(right.id),
  )
  .map((workout) => buildDailyWorkout(workout));
