import { z } from "zod";

import { exerciseSchema } from "@/domain/exercise/exercise.schema";

type ExerciseInput = z.input<typeof exerciseSchema>;

type PerformanceExerciseOptions = {
  id: string;
  name: string;
  description: string;
  instructions: [string, string, string];
  cues: [string, string, string];
  mistakes: [string, string];
  bodyAreas: ExerciseInput["bodyAreas"];
  roles: ExerciseInput["roles"];
  qualities: ExerciseInput["qualities"];
  targetedQualities: string[];
  sessionRoles?: ExerciseInput["sessionRoles"];
  preparationFor?: ExerciseInput["preparationFor"];
  recoveryFor?: ExerciseInput["recoveryFor"];
  laterality?: ExerciseInput["laterality"];
  switchTarget?: ExerciseInput["switchTarget"];
  equipment?: ExerciseInput["equipment"];
  setup?: ExerciseInput["setupRequirements"];
  workSeconds?: number;
  restSeconds?: number;
  rounds?: number;
  intensity?: ExerciseInput["sessionIntensity"];
  cadence?: "controlled" | "self_paced" | "explosive_reset";
  animationUrl?: string;
  posterUri?: string;
  animationAspectRatio?: string;
  videoUrl?: string;
  movementFrames?: ExerciseInput["movementFrames"];
};

function performanceExercise(
  options: PerformanceExerciseOptions,
): ExerciseInput {
  const laterality = options.laterality ?? "bilateral";
  const cadence = options.cadence ?? "controlled";
  return {
    id: options.id,
    slug: options.id,
    name: options.name,
    shortDescription: options.description,
    instructions: options.instructions,
    cues: options.cues,
    commonMistakes: options.mistakes,
    bodyAreas: options.bodyAreas,
    difficulty: options.intensity === "high" ? "intermediate" : "beginner",
    roles: options.roles,
    qualities: options.qualities,
    targetedQualities: options.targetedQualities,
    sessionRoles: options.sessionRoles ?? ["main"],
    preparationFor: options.preparationFor ?? [],
    recoveryFor: options.recoveryFor ?? [],
    sessionIntensity: options.intensity ?? "moderate",
    equipment: options.equipment ?? ["none"],
    setupRequirements: options.setup ?? ["floor"],
    laterality,
    ...(options.switchTarget ? { switchTarget: options.switchTarget } : {}),
    supportedModes: ["timed"],
    defaultPrescription: {
      workDurationSeconds: options.workSeconds ?? 30,
      restDurationSeconds: options.restSeconds ?? 25,
      rounds: options.rounds ?? 2,
      sideMode:
        laterality === "unilateral"
          ? "separate"
          : laterality === "alternating"
            ? "alternating"
            : "simultaneous",
      cadenceMode: cadence,
    },
    tempo:
      cadence === "explosive_reset"
        ? { mode: "explosive_reset", resetSeconds: { min: 2, max: 4 } }
        : cadence === "self_paced"
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
          ? {
              type: "video" as const,
              uri: options.videoUrl,
              aspectRatio: options.animationAspectRatio ?? "16 / 9",
              loop: true,
              version: "1",
            }
          : {}),
      requiredViews: ["front or three-quarter", "side for joint alignment"],
      notes: `Show the complete ${options.name.toLowerCase()} pattern at a safe, repeatable pace.`,
    },
    ...(options.movementFrames
      ? { movementFrames: options.movementFrames }
      : {}),
    defaultGuidance: {
      enabledByDefault: cadence !== "self_paced",
      pattern:
        cadence === "self_paced"
          ? { type: "none" }
          : { type: "words", cues: [options.cues[0], options.cues[1]] },
      secondsPerCue: cadence === "explosive_reset" ? 2 : 1.5,
    },
  };
}

export const padelPerformanceExercises = z.array(exerciseSchema).parse([
  performanceExercise({
    id: "split-step-lateral-drive",
    name: "Side-to-Side Line Hops",
    movementFrames: {
      start: {
        uri: "/images/exercises/side-to-side-line-hops-preview.png",
        alt: "Side-to-Side Line Hops movement reference",
        cue: "Keep both feet together and knees softly bent.",
        kind: "reference",
      },
      end: {
        uri: "/images/exercises/side-to-side-line-hops-preview.png",
        alt: "Side-to-Side Line Hops movement reference",
        cue: "Land softly and continue side to side.",
        kind: "reference",
      },
    },
    animationUrl: "/images/exercises/animations/side-to-side-line-hops.gif",
    posterUri: "/images/exercises/side-to-side-line-hops-preview.png",
    animationAspectRatio: "1280 / 720",
    description:
      "Build quick lateral footwork with small two-foot hops across an imaginary line.",
    instructions: [
      "Stand with feet close together and knees softly bent beside an imaginary line.",
      "Hop sideways across the line with both feet taking off and landing together.",
      "Continue with small side-to-side hops at your own pace, landing softly with bent knees.",
    ],
    cues: ["Small hops", "Feet together", "Land softly"],
    mistakes: ["Jumping too high or too far", "Landing with stiff knees"],
    bodyAreas: ["legs", "glutes", "full-body"],
    roles: ["power", "stability"],
    qualities: ["power", "explosiveness", "stability"],
    targetedQualities: [
      "lateral-reactivity",
      "ankle-reactivity",
      "landing-control",
    ],
    laterality: "bilateral",
    workSeconds: 20,
    restSeconds: 35,
    rounds: 3,
    intensity: "high",
    cadence: "self_paced",
  }),
  performanceExercise({
    id: "bent-knee-soleus-raise",
    name: "Bent-Knee Soleus Raise",
    description:
      "Build lower-calf capacity for low ready positions, repeated pushes, and braking.",
    instructions: [
      "Bend both knees into a comfortable partial squat. Use a wall for balance if needed; the clip shows a deeper unsupported version.",
      "Keep the knee angle steady while lifting both heels.",
      "Pause at the top and lower the heels slowly while keeping the knees bent.",
    ],
    cues: ["Stay low", "Rise straight up", "Lower slowly"],
    mistakes: [
      "Straightening the knees",
      "Rolling onto the outside of the feet",
    ],
    bodyAreas: ["legs"],
    roles: ["strength", "stability"],
    qualities: ["strength", "endurance", "stability"],
    targetedQualities: [
      "soleus-capacity",
      "bent-knee-calf-strength",
      "lower-leg-endurance",
    ],
    setup: ["floor", "wall"],
    workSeconds: 35,
    restSeconds: 25,
    animationUrl: "/images/exercises/animations/bent-knee-soleus-raise.gif",
    animationAspectRatio: "400 / 298",
  }),
  performanceExercise({
    id: "glute-bridge-march",
    name: "Glute Bridge March",
    description:
      "Train posterior-chain strength and pelvic control while the legs alternate.",
    instructions: [
      "Lie on the back with feet planted and lift into a comfortable bridge.",
      "Keep the pelvis level while lifting one bent leg. Use a smaller march than the clip if needed to keep the hips steady.",
      "Replace the foot quietly and alternate without losing hip height.",
    ],
    cues: ["Hips level", "Small march", "Ribs down"],
    mistakes: ["Arching the lower back", "Letting the pelvis rotate"],
    bodyAreas: ["glutes", "core"],
    roles: ["strength", "stability"],
    qualities: ["strength", "stability", "anti-rotation"],
    targetedQualities: ["posterior-chain", "pelvic-control", "hip-stability"],
    laterality: "alternating",
    animationUrl: "/images/exercises/animations/glute-bridge-march.gif",
  }),
  performanceExercise({
    id: "short-lever-copenhagen-hold",
    name: "Fire Hydrant",
    animationUrl: "/images/exercises/animations/fire-hydrant.gif",
    posterUri: "/images/exercises/fire-hydrant-preview.png",
    animationAspectRatio: "800 / 450",
    movementFrames: {
      start: {
        uri: "/images/exercises/fire-hydrant-preview.png",
        alt: "Fire Hydrant movement reference",
        cue: "Keep hands under shoulders and hips steady.",
        kind: "reference",
      },
      end: {
        uri: "/images/exercises/fire-hydrant-preview.png",
        alt: "Fire Hydrant movement reference",
        cue: "Lift the bent knee sideways, then lower under control.",
        kind: "reference",
      },
    },
    description:
      "Train the outer hips and side glutes with controlled bent-knee lifts on all fours.",
    instructions: [
      "Start on all fours with hands under shoulders and knees under hips.",
      "Keep one knee bent and lift it out to the side without turning the pelvis or arching the back.",
      "Lower under control and repeat until the interval ends, then change sides when prompted.",
    ],
    cues: ["Lift sideways", "Lower slowly", "Hips stay level"],
    mistakes: ["Rotating the torso to lift higher", "Arching the lower back"],
    bodyAreas: ["glutes", "legs", "core"],
    roles: ["strength", "stability"],
    qualities: ["strength", "stability"],
    targetedQualities: [
      "hip-abductor-strength",
      "pelvic-control",
      "hip-stability",
    ],
    laterality: "unilateral",
    switchTarget: "leg",
    setup: ["floor"],
    workSeconds: 20,
    restSeconds: 30,
    cadence: "controlled",
  }),
  performanceExercise({
    id: "wall-slide-lift-off",
    sessionRoles: ["warmup", "main", "cooldown"],
    recoveryFor: ["shoulders", "back"],
    preparationFor: ["strength", "stability", "rotation"],
    intensity: "low",
    name: "Wall Slide with Lift-Off",
    description:
      "Build usable overhead range with scapular control for repeated overhead play.",
    instructions: [
      "Stand with forearms against a wall and ribs stacked over the pelvis.",
      "Slide the arms upward without shrugging or arching the lower back.",
      "Gently lift the hands away, return them to the wall, and slide down.",
    ],
    cues: ["Ribs down", "Slide tall", "Lift softly"],
    mistakes: ["Arching the lower back", "Forcing range through the shoulder"],
    bodyAreas: ["shoulders", "back"],
    roles: ["mobility", "stability"],
    qualities: ["mobility", "stability"],
    targetedQualities: [
      "overhead-mobility",
      "scapular-control",
      "serratus-strength",
    ],
    setup: ["wall"],
    workSeconds: 35,
    restSeconds: 20,
    animationUrl: "/images/exercises/animations/wall-slide-lift-off.gif",
    movementFrames: {
      start: {
        uri: "/images/exercises/positions/wall-slide-lift-off-start-v2.png",
        alt: "Wall Slide with Lift-Off start position",
        cue: "Stand with forearms against a wall and ribs stacked over the pelvis.",
        kind: "position",
      },
      end: {
        uri: "/images/exercises/positions/wall-slide-lift-off-end.png",
        alt: "Wall Slide with Lift-Off finish position",
        cue: "Gently lift the hands away, return them to the wall, and slide down.",
        kind: "position",
      },
    },
  }),
  performanceExercise({
    id: "thread-the-needle",
    name: "Thread the Needle",
    description:
      "Develop controlled upper-back rotation while the hips and lower back stay quiet.",
    instructions: [
      "Start on hands and knees with the spine long.",
      "Reach one arm under the body and rotate through the upper back.",
      "Return through centre and open the arm comfortably toward the ceiling.",
    ],
    cues: ["Rotate high", "Hips stay quiet", "Breathe through range"],
    mistakes: [
      "Shifting the hips sideways",
      "Forcing the shoulder to the floor",
    ],
    bodyAreas: ["back", "shoulders", "core"],
    roles: ["mobility"],
    qualities: ["mobility", "rotation"],
    targetedQualities: [
      "thoracic-rotation",
      "upper-back-mobility",
      "shoulder-trunk-control",
    ],
    laterality: "unilateral",
    switchTarget: "side",
    cadence: "self_paced",
    animationUrl: "/images/exercises/animations/thread-the-needle.gif",
  }),
  performanceExercise({
    id: "suitcase-march",
    name: "Suitcase March",
    description:
      "Integrate unilateral grip, trunk control, and single-leg stability.",
    instructions: [
      "Stand tall holding one light dumbbell beside the thigh.",
      "March slowly without leaning or letting the pelvis rotate.",
      "Alternate the legs and place each foot quietly. Keep the weight in the same hand until prompted to switch.",
    ],
    cues: ["Stay tall", "March quietly", "Keep hips level"],
    mistakes: ["Leaning toward the weight", "Rushing the steps"],
    bodyAreas: ["full-body", "core", "arms"],
    roles: ["strength", "stability"],
    qualities: ["strength", "stability", "anti-rotation"],
    targetedQualities: [
      "trunk-control",
      "grip-endurance",
      "single-leg-control",
    ],
    laterality: "unilateral",
    switchTarget: "hand",
    equipment: ["light_dumbbell"],
    animationUrl: "/images/exercises/animations/suitcase-march.gif",
  }),
  performanceExercise({
    id: "squat-jump-stick",
    animationUrl: "/images/exercises/animations/squat-jump-stick.gif",
    animationAspectRatio: "854 / 480",
    posterUri: "/images/exercises/squat-jump-stick-preview.png",
    name: "Squat Jump and Stick",
    description:
      "Develop lower-body power together with quiet, controlled landing mechanics.",
    instructions: [
      "Load into a shallow squat with the whole foot grounded.",
      "Jump vertically with a fast drive through the floor.",
      "Land softly, hold the position briefly, and reset before repeating.",
    ],
    cues: ["Drive", "Land softly", "Own the landing"],
    mistakes: [
      "Letting the knees collapse inward",
      "Repeating before balance returns",
    ],
    bodyAreas: ["legs", "glutes"],
    roles: ["power", "stability"],
    qualities: ["power", "explosiveness", "stability"],
    targetedQualities: ["lower-body-power", "landing-control", "deceleration"],
    workSeconds: 15,
    restSeconds: 40,
    rounds: 3,
    intensity: "high",
    cadence: "explosive_reset",
  }),
  performanceExercise({
    id: "pogo-hop",
    animationUrl: "/images/exercises/animations/pogo-hop.gif",
    animationAspectRatio: "1280 / 720",
    name: "Pogo Hop",
    description:
      "Build reactive ankle stiffness for repeated split steps and short accelerations.",
    instructions: [
      "Stand tall with knees softly bent and feet under the hips.",
      "Make small rhythmic hops using the ankles more than the knees.",
      "Stay quiet on landing and stop before the contacts become heavy.",
    ],
    cues: ["Quick floor", "Stay tall", "Land quietly"],
    mistakes: [
      "Turning the drill into deep jumps",
      "Continuing after rhythm is lost",
    ],
    bodyAreas: ["legs"],
    roles: ["power"],
    qualities: ["power", "endurance"],
    targetedQualities: ["ankle-reactivity", "split-step", "elastic-strength"],
    workSeconds: 15,
    restSeconds: 35,
    rounds: 3,
    intensity: "high",
    cadence: "self_paced",
  }),
  performanceExercise({
    id: "intermittent-lateral-shuffle",
    animationUrl:
      "/images/exercises/animations/intermittent-lateral-shuffle.gif",
    animationAspectRatio: "1280 / 797",
    name: "Intermittent Lateral Shuffle",
    description:
      "Build repeat-effort conditioning with short lateral bursts and controlled recoveries.",
    instructions: [
      "Set a small safe lane and begin in an athletic stance.",
      "Shuffle side to side without crossing the feet. The clip adds a low hand reach at each end; reach only as low as you can control.",
      "Brake under the body, maintain posture, and use the programmed recovery.",
    ],
    cues: ["Stay low", "Push the floor", "Brake under control"],
    mistakes: [
      "Crossing the feet",
      "Turning every interval into an all-out sprint",
    ],
    bodyAreas: ["full-body", "legs"],
    roles: ["power", "stability"],
    qualities: ["endurance", "power", "stability"],
    targetedQualities: [
      "repeat-effort",
      "lateral-conditioning",
      "change-of-direction",
    ],
    workSeconds: 20,
    restSeconds: 25,
    rounds: 4,
    intensity: "high",
    cadence: "self_paced",
  }),
]);
