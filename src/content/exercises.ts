import { z } from "zod";

import { padelCoreExercises } from "@/content/padel-core-exercises";
import { padelShoulderExercises } from "@/content/padel-shoulder-exercises";
import { padelMovementExercises } from "@/content/padel-movement-exercises";
import { padelPerformanceExercises } from "@/content/padel-performance-exercises";
import { sessionSupportExercises } from "@/content/session-support-exercises";
import { exerciseSchema } from "@/domain/exercise/exercise.schema";
import { isExercisePublishable } from "@/domain/content/catalog-quality";

export const exerciseCatalogSchema = z
  .array(exerciseSchema)
  .superRefine((exercises, context) => {
    const ids = new Set<string>();
    const slugs = new Set<string>();

    exercises.forEach((exercise, index) => {
      if (ids.has(exercise.id)) {
        context.addIssue({
          code: "custom",
          message: `Duplicate exercise id: ${exercise.id}`,
          path: [index, "id"],
        });
      }
      if (slugs.has(exercise.slug)) {
        context.addIssue({
          code: "custom",
          message: `Duplicate exercise slug: ${exercise.slug}`,
          path: [index, "slug"],
        });
      }
      ids.add(exercise.id);
      slugs.add(exercise.slug);
    });
  });

export const exercises = exerciseCatalogSchema.parse([
  ...sessionSupportExercises.map((exercise) => ({
    ...exercise,
    media: {
      ...exercise.media,
      status: "production",
      fallback: "instructional",
    },
  })),
  {
    id: "bodyweight-squat",
    slug: "bodyweight-squat",
    name: "Bodyweight Squat",
    shortDescription:
      "Build lower-body strength with a controlled squat pattern.",
    instructions: [
      "Stand with feet about shoulder-width apart.",
      "Sit the hips down and back while keeping the whole foot grounded.",
      "Drive through the floor to return to standing.",
    ],
    cues: ["Chest tall", "Knees track over toes", "Press the floor away"],
    commonMistakes: ["Heels lifting", "Knees collapsing inward"],
    bodyAreas: ["legs", "glutes"],
    difficulty: "beginner",
    roles: ["strength"],
    qualities: ["strength"],
    targetedQualities: ["lower-body-strength", "movement-control"],
    equipment: ["none"],
    setupRequirements: ["floor"],
    laterality: "bilateral",
    supportedModes: ["timed"],
    defaultPrescription: {
      sets: { min: 2, max: 2 },
      durationSeconds: { min: 30, max: 30 },
      restSeconds: { min: 30, max: 30 },
    },
    tempo: { mode: "controlled", pattern: "2-0-2" },
    media: {
      assetKey: "bodyweight-squat",
      type: "animation",
      uri: "/images/exercises/animations/bodyweight-squat.gif",
      aspectRatio: "800 / 595",
      loop: true,
      version: "1",
      status: "production",
      requiredViews: ["side or three-quarter"],
      notes: "Show full depth and whole-foot contact.",
    },
    defaultGuidance: {
      enabledByDefault: true,
      pattern: { type: "words", cues: ["down", "up"] },
      secondsPerCue: 1,
    },
  },
  {
    id: "reverse-lunge",
    slug: "reverse-lunge",
    name: "Reverse Lunge",
    shortDescription:
      "Train single-leg strength and control with a backward step.",
    instructions: [
      "Stand tall and step one foot back.",
      "Lower until both knees are comfortably bent.",
      "Push through the front foot to return to standing. Repeat on the same leg until prompted to switch; the clip demonstrates both sides.",
    ],
    cues: ["Stay tall", "Front foot stays planted", "Move with control"],
    commonMistakes: ["Front knee collapsing inward", "Rushing the return"],
    bodyAreas: ["legs", "glutes"],
    difficulty: "beginner",
    roles: ["strength", "stability"],
    qualities: ["strength", "stability"],
    targetedQualities: ["single-leg-strength", "movement-control"],
    equipment: ["none"],
    setupRequirements: ["floor"],
    laterality: "unilateral",
    switchTarget: "leg",
    supportedModes: ["timed"],
    defaultPrescription: {
      sets: { min: 2, max: 2 },
      durationSeconds: { min: 25, max: 25 },
      restSeconds: { min: 30, max: 30 },
    },
    tempo: { mode: "controlled", pattern: "2-0-2" },
    media: {
      assetKey: "reverse-lunge",
      type: "animation",
      uri: "/images/exercises/animations/reverse-lunge.gif",
      aspectRatio: "854 / 480",
      loop: true,
      version: "1",
      status: "production",
      requiredViews: ["side or three-quarter"],
      notes: "Show the step length and front-knee alignment.",
    },
    defaultGuidance: {
      enabledByDefault: true,
      pattern: { type: "alternating", cues: ["down", "stand"] },
      bpm: 60,
    },
  },
  {
    id: "dead-bug",
    slug: "dead-bug",
    name: "Dead Bug",
    shortDescription: "Challenge trunk control while moving opposite limbs.",
    instructions: [
      "Lie on your back with arms up and knees bent over the hips.",
      "Slowly extend the opposite arm and leg without arching the back.",
      "Return to center and switch sides.",
    ],
    cues: ["Ribs down", "Move slowly", "Keep the back gently grounded"],
    commonMistakes: ["Arching the lower back", "Moving too quickly"],
    bodyAreas: ["core"],
    difficulty: "beginner",
    roles: ["stability"],
    qualities: ["stability", "anti-rotation"],
    targetedQualities: ["trunk-control", "contralateral-coordination"],
    equipment: ["none"],
    setupRequirements: ["floor"],
    laterality: "alternating",
    supportedModes: ["timed"],
    defaultPrescription: {
      sets: { min: 2, max: 2 },
      durationSeconds: { min: 30, max: 30 },
      restSeconds: { min: 20, max: 20 },
    },
    tempo: { mode: "controlled", pattern: "2-0-2" },
    media: {
      assetKey: "dead-bug",
      type: "animation",
      uri: "/images/exercises/animations/dead-bug.gif",
      aspectRatio: "16 / 9",
      loop: true,
      version: "1",
      status: "production",
      requiredViews: ["side or three-quarter"],
      notes: "Show the trunk position throughout opposite-limb reaches.",
    },
    defaultGuidance: {
      enabledByDefault: true,
      pattern: { type: "words", cues: ["reach", "return"] },
      secondsPerCue: 1.5,
    },
  },
  {
    id: "single-arm-row",
    slug: "single-arm-row",
    name: "Single-arm Dumbbell Row",
    shortDescription: "Build upper-back strength one side at a time.",
    instructions: [
      "Hinge at the hips with both feet on the floor and support the free hand on a sturdy chair. The clip shows a bench-supported variation.",
      "Pull the dumbbell toward the hip without twisting the torso.",
      "Lower with control until the arm is long.",
    ],
    cues: ["Long spine", "Elbow toward hip", "Shoulders stay level"],
    commonMistakes: ["Shrugging the shoulder", "Rotating to lift the weight"],
    bodyAreas: ["back", "arms"],
    difficulty: "beginner",
    roles: ["strength", "stability"],
    qualities: ["strength", "stability"],
    targetedQualities: ["upper-back-strength", "trunk-stability"],
    equipment: ["dumbbell"],
    setupRequirements: ["chair"],
    laterality: "unilateral",
    switchTarget: "hand",
    supportedModes: ["timed"],
    defaultPrescription: {
      sets: { min: 2, max: 2 },
      durationSeconds: { min: 25, max: 25 },
      restSeconds: { min: 30, max: 30 },
    },
    tempo: { mode: "controlled", pattern: "2-1-2" },
    media: {
      assetKey: "single-arm-row",
      type: "animation",
      uri: "/images/exercises/animations/single-arm-row.gif",
      posterUri: "/images/exercises/single-arm-row-preview.png",
      aspectRatio: "1280 / 720",
      loop: true,
      version: "1",
      status: "production",
      requiredViews: ["side or three-quarter"],
      notes: "Show the supported hinge and shoulder path.",
    },
    defaultGuidance: {
      enabledByDefault: true,
      pattern: { type: "words", cues: ["pull", "lower"] },
      secondsPerCue: 1,
    },
  },
  ...padelCoreExercises,
  ...padelShoulderExercises,
  ...padelMovementExercises,
  ...padelPerformanceExercises,
]);

/** Exercises safe to expose in production discovery, plans, and playback. */
export const publishedExercises = exercises.filter(isExercisePublishable);
