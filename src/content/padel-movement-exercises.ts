import type { z } from "zod";

import type { exerciseSchema } from "@/domain/exercise/exercise.schema";

type CatalogExercise = z.input<typeof exerciseSchema>;

type DraftOptions = {
  id: string;
  name: string;
  description: string;
  instructions: [string, string, string];
  cues: [string, string, string];
  mistakes: [string, string];
  bodyAreas: CatalogExercise["bodyAreas"];
  roles: CatalogExercise["roles"];
  qualities: CatalogExercise["qualities"];
  targetedQualities: string[];
  equipment?: CatalogExercise["equipment"];
  setup?: CatalogExercise["setupRequirements"];
  laterality?: CatalogExercise["laterality"];
  switchTarget?: CatalogExercise["switchTarget"];
  duration?: number;
  rest?: number;
  cadenceMode?: "controlled" | "self_paced" | "explosive_reset";
  variantOf?: string;
  easierVariantId?: string;
  harderVariantId?: string;
  equipmentFreeVariantId?: string;
  substitutionGroup: string;
  animationUrl?: string;
  animationAspectRatio?: string;
  posterUri?: string;
  videoUrl?: string;
};

function reviewedExercise(options: DraftOptions): CatalogExercise {
  const laterality = options.laterality ?? "bilateral";
  return {
    id: options.id,
    slug: options.id,
    name: options.name,
    shortDescription: options.description,
    instructions: options.instructions,
    cues: options.cues,
    commonMistakes: options.mistakes,
    bodyAreas: options.bodyAreas,
    difficulty: "beginner",
    roles: options.roles,
    qualities: options.qualities,
    targetedQualities: options.targetedQualities,
    equipment: options.equipment ?? ["none"],
    setupRequirements: options.setup ?? ["floor"],
    laterality,
    ...(options.switchTarget ? { switchTarget: options.switchTarget } : {}),
    supportedModes: ["timed"],
    defaultPrescription: {
      workDurationSeconds: options.duration ?? 30,
      restDurationSeconds: options.rest ?? 20,
      rounds: 2,
      sideMode: laterality === "unilateral" ? "separate" : "simultaneous",
      cadenceMode: options.cadenceMode ?? "controlled",
    },
    tempo:
      options.cadenceMode === "explosive_reset"
        ? { mode: "explosive_reset", resetSeconds: { min: 2, max: 4 } }
        : options.cadenceMode === "self_paced"
          ? { mode: "self_paced" }
          : { mode: "controlled", pattern: "2-1-2" },
    media: {
      assetKey: options.id,
      posterUri: options.posterUri,
      status: "production",
      fallback: "instructional",
      ...(options.animationUrl
        ? {
            type: "animation" as const,
            uri: options.animationUrl,
            aspectRatio: options.animationAspectRatio ?? "16 / 9",
            loop: true,
            version: "1",
          }
        : options.videoUrl
          ? { videoUrl: options.videoUrl }
          : {}),
      requiredViews: ["front or three-quarter", "side for joint alignment"],
      notes: `Record a silent, tightly framed loop that clearly shows ${options.name.toLowerCase()} setup and finish positions.`,
    },
    defaultGuidance: {
      enabledByDefault: true,
      pattern: { type: "words", cues: [options.cues[0], options.cues[1]] },
      secondsPerCue: 1.5,
    },
    variantOf: options.variantOf,
    easierVariantId: options.easierVariantId,
    harderVariantId: options.harderVariantId,
    equipmentFreeVariantId: options.equipmentFreeVariantId,
    substitutionGroup: options.substitutionGroup,
  };
}

export const padelMovementExercises: CatalogExercise[] = [
  reviewedExercise({
    id: "dumbbell-romanian-deadlift",
    name: "Dumbbell Romanian Deadlift",
    description:
      "Develop hip-hinge strength for low positions and acceleration.",
    instructions: [
      "Hold light dumbbells in front of the thighs.",
      "Push the hips back with a long spine and soft knees.",
      "Drive the floor away and stand tall.",
    ],
    cues: ["Hips back", "Weights stay close", "Squeeze to stand"],
    mistakes: ["Rounding the back", "Turning the movement into a squat"],
    bodyAreas: ["legs", "glutes", "back"],
    roles: ["strength"],
    qualities: ["strength"],
    targetedQualities: ["hip-hinge", "posterior-chain-strength"],
    equipment: ["two_dumbbells"],
    equipmentFreeVariantId: "bodyweight-hip-hinge",
    videoUrl: "/videos/dumbbell-romanian-deadlift.mov",
    substitutionGroup: "hip-hinge",
  }),
  reviewedExercise({
    id: "bodyweight-hip-hinge",
    name: "Bodyweight Hip Hinge",
    description: "Practice loading the hips while keeping the trunk organized.",
    instructions: [
      "Stand tall with soft knees and arms resting beside the thighs.",
      "Push the hips back until you feel a comfortable hamstring stretch, keeping the back long.",
      "Press the feet down to return upright.",
    ],
    cues: ["Push the hips back", "Long spine", "Finish tall"],
    mistakes: ["Bending mostly at the knees", "Overarching at the top"],
    bodyAreas: ["legs", "glutes", "back"],
    roles: ["activation", "strength"],
    qualities: ["strength", "warm-up"],
    targetedQualities: ["hip-hinge", "movement-control"],
    animationUrl: "/images/exercises/animations/bodyweight-hip-hinge.gif",
    harderVariantId: "dumbbell-romanian-deadlift",
    substitutionGroup: "hip-hinge",
  }),
  reviewedExercise({
    id: "supported-split-squat",
    name: "Split Squat",
    description: "Build single-leg strength and balance in a split stance.",
    instructions: [
      "Take a split stance with your rear heel lifted and torso tall.",
      "Lower straight down through a comfortable range.",
      "Push through the front foot to rise.",
    ],
    cues: ["Tall torso", "Front foot heavy", "Lower with control"],
    mistakes: ["Narrowing the stance", "Front knee falling inward"],
    bodyAreas: ["legs", "glutes"],
    roles: ["strength", "stability"],
    qualities: ["strength", "stability"],
    targetedQualities: ["single-leg-strength", "deceleration-control"],
    setup: ["floor"],
    laterality: "unilateral",
    switchTarget: "leg",
    harderVariantId: "reverse-lunge",
    substitutionGroup: "split-stance-strength",
    animationUrl: "/images/exercises/animations/split-squat.gif",
    animationAspectRatio: "1281 / 720",
    posterUri: "/images/exercises/split-squat-preview.png",
  }),
  reviewedExercise({
    id: "lateral-lunge",
    name: "Lateral Lunge",
    description:
      "Build strength for wide lateral pushes and low court positions.",
    instructions: [
      "Step wide to one side with both feet forward.",
      "Sit into the stepping hip while the other leg stays long.",
      "Push the floor away to return to center.",
    ],
    cues: ["Step wide", "Load the hip", "Push back"],
    mistakes: [
      "Twisting the knee away from the direction of the toes",
      "Knee collapsing inward",
    ],
    bodyAreas: ["legs", "glutes"],
    roles: ["strength"],
    qualities: ["strength", "stability"],
    targetedQualities: ["lateral-strength", "change-of-direction"],
    laterality: "unilateral",
    switchTarget: "leg",
    substitutionGroup: "lateral-strength",
    animationUrl: "/images/exercises/animations/lateral-lunge.gif",
  }),
  reviewedExercise({
    id: "split-stance-acceleration-march",
    name: "Wall Acceleration March",
    description:
      "Practice wall-supported acceleration posture, alternating knee drive, and active ground contact.",
    instructions: [
      "Place both hands on a wall and lean forward with the body in one long line.",
      "Drive one knee toward hip height while pushing the stance foot down and back.",
      "Lower the foot under control and alternate legs without losing the forward lean.",
    ],
    cues: ["Body stays long", "Drive the knee", "Push the floor back"],
    mistakes: [
      "Bending at the hips",
      "Losing pressure through the stance foot",
    ],
    bodyAreas: ["legs", "full-body"],
    roles: ["activation", "power"],
    qualities: ["power", "stability"],
    targetedQualities: ["acceleration", "first-step"],
    setup: ["wall", "floor"],
    laterality: "alternating",
    cadenceMode: "controlled",
    substitutionGroup: "acceleration-pattern",
    animationUrl: "/images/exercises/animations/wall-acceleration-march.gif",
  }),
  reviewedExercise({
    id: "lateral-stick",
    name: "Lateral Step and Stick",
    description: "Develop lateral braking and balance after a short push.",
    instructions: [
      "Push sideways from an athletic stance.",
      "Land on the outside leg with the hip back.",
      "Hold a balanced finish before stepping back to reset. Repeat toward the same landing leg until prompted to switch; the clip alternates.",
    ],
    cues: ["Push sideways", "Land quietly", "Own the stop"],
    mistakes: ["Knee falling inward", "Taking another step to regain balance"],
    bodyAreas: ["legs", "glutes", "core"],
    roles: ["stability", "power"],
    qualities: ["stability", "power"],
    targetedQualities: ["deceleration", "lateral-control"],
    laterality: "unilateral",
    switchTarget: "leg",
    cadenceMode: "explosive_reset",
    substitutionGroup: "lateral-deceleration",
    animationUrl: "/images/exercises/animations/lateral-stick.gif",
    animationAspectRatio: "854 / 480",
  }),
  reviewedExercise({
    id: "single-leg-calf-raise",
    name: "Single-leg Calf Raise",
    description:
      "Build calf strength and endurance with controlled single-leg heel raises.",
    instructions: [
      "Stand beside a wall on one foot.",
      "Rise onto the ball of the foot without rolling outward.",
      "Lower the heel slowly to the floor.",
    ],
    cues: ["Grow tall", "Big toe heavy", "Lower slowly"],
    mistakes: ["Ankle rolling outward", "Bouncing through the bottom"],
    bodyAreas: ["legs"],
    roles: ["strength", "stability"],
    qualities: ["strength", "endurance"],
    targetedQualities: ["calf-strength", "ankle-stability"],
    setup: ["wall", "floor"],
    laterality: "unilateral",
    switchTarget: "leg",
    substitutionGroup: "calf-ankle-strength",
    animationUrl: "/images/exercises/animations/single-leg-calf-raise.gif",
    animationAspectRatio: "854 / 480",
    posterUri: "/images/exercises/single-leg-calf-raise-preview.png",
  }),
  reviewedExercise({
    id: "dumbbell-pronation-supination",
    name: "Dumbbell Forearm Rotation",
    description:
      "Strengthen controlled forearm rotation through a comfortable range.",
    instructions: [
      "Sit with the forearm supported and hold one end of a light dumbbell.",
      "Rotate the palm slowly up and down.",
      "Stop before the elbow or shoulder joins the movement.",
    ],
    cues: ["Forearm supported", "Rotate slowly", "Use a light load"],
    mistakes: ["Moving from the shoulder", "Forcing the end range"],
    bodyAreas: ["arms"],
    roles: ["strength", "stability"],
    qualities: ["strength", "mobility"],
    targetedQualities: ["forearm-rotation", "wrist-control"],
    equipment: ["light_dumbbell"],
    setup: ["chair"],
    laterality: "unilateral",
    switchTarget: "hand",
    substitutionGroup: "forearm-rotation",
    animationUrl:
      "/images/exercises/animations/dumbbell-pronation-supination.gif",
    animationAspectRatio: "16 / 9",
  }),
  reviewedExercise({
    id: "dumbbell-wrist-extension",
    name: "Dumbbell Wrist Extension",
    description: "Build wrist extensor capacity with a light controlled load.",
    instructions: [
      "Sit and support the forearm on your thigh with the palm down and wrist free to move. The clip uses a padded support.",
      "Lift the back of the hand without moving the forearm.",
      "Lower slowly through a comfortable range.",
    ],
    cues: ["Forearm still", "Small range", "Lower slowly"],
    mistakes: ["Using a heavy load", "Lifting the elbow"],
    bodyAreas: ["arms"],
    roles: ["strength"],
    qualities: ["strength", "endurance"],
    targetedQualities: ["wrist-strength", "forearm-endurance"],
    equipment: ["light_dumbbell"],
    setup: ["chair"],
    laterality: "unilateral",
    switchTarget: "hand",
    substitutionGroup: "wrist-strength",
    animationUrl: "/images/exercises/animations/dumbbell-wrist-extension.gif",
    animationAspectRatio: "16 / 9",
  }),
  reviewedExercise({
    id: "ninety-ninety-hip-switch",
    name: "90/90 Hip Switch",
    description:
      "Practice controlled hip rotation through a comfortable seated range.",
    instructions: [
      "Sit with both knees bent and feet wider than the hips.",
      "Lower both knees together toward one side.",
      "Return through center and switch sides.",
    ],
    cues: ["Sit tall", "Move from the hips", "Stay comfortable"],
    mistakes: ["Forcing the knees down", "Rushing through a restricted range"],
    bodyAreas: ["legs", "glutes"],
    roles: ["mobility"],
    qualities: ["mobility"],
    targetedQualities: ["hip-rotation", "recovery-mobility"],
    setup: ["floor", "mat"],
    laterality: "alternating",
    cadenceMode: "self_paced",
    substitutionGroup: "hip-mobility",
    animationUrl: "/images/exercises/animations/ninety-ninety-hip-switch.gif",
    animationAspectRatio: "752 / 560",
  }),
  reviewedExercise({
    id: "open-book-rotation",
    name: "Open-book Rotation",
    description:
      "Practice comfortable upper-back rotation in a supported side-lying position.",
    instructions: [
      "Lie on one side with hips and knees bent.",
      "Reach the top arm across the body and open toward the floor behind you.",
      "Return slowly without forcing the shoulder down.",
    ],
    cues: ["Knees together", "Follow the hand", "Breathe out"],
    mistakes: [
      "Letting the knees separate",
      "Forcing the shoulder to the floor",
    ],
    bodyAreas: ["back", "shoulders", "core"],
    roles: ["mobility"],
    qualities: ["mobility", "rotation"],
    targetedQualities: ["thoracic-rotation", "recovery-mobility"],
    setup: ["floor", "mat"],
    laterality: "unilateral",
    switchTarget: "side",
    cadenceMode: "self_paced",
    substitutionGroup: "thoracic-mobility",
    animationUrl: "/images/exercises/animations/open-book-rotation.gif",
    animationAspectRatio: "1280 / 720",
  }),
  reviewedExercise({
    id: "fast-feet-step",
    name: "Fast Feet Step",
    description:
      "Train short repeatable foot contacts for interval conditioning.",
    instructions: [
      "Stand in a compact athletic stance.",
      "Make quick alternating foot contacts in place.",
      "Stay relaxed through the shoulders and stop before form fades.",
    ],
    cues: ["Light contacts", "Hips quiet", "Relax the shoulders"],
    mistakes: ["Stomping the floor", "Holding the breath"],
    bodyAreas: ["legs", "full-body"],
    roles: ["power"],
    qualities: ["endurance", "explosiveness"],
    targetedQualities: ["interval-conditioning", "foot-speed"],
    laterality: "alternating",
    cadenceMode: "self_paced",
    duration: 30,
    substitutionGroup: "footwork-conditioning",
    animationUrl: "/images/exercises/animations/fast-feet-step.gif",
    animationAspectRatio: "854 / 480",
    posterUri: "/images/exercises/fast-feet-step-preview.png",
  }),
];
