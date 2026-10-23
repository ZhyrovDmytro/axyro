import type { z } from "zod";

import type { workoutSchema } from "@/domain/workout/workout.schema";

type WorkoutInput = z.input<typeof workoutSchema>;
type WorkoutItemInput = WorkoutInput["items"][number];

function item(
  id: string,
  exerciseId: string,
  options: {
    work?: number;
    sets?: number;
    perSide?: boolean;
    role?: WorkoutItemInput["role"];
    priority?: number;
    rest?: number;
  } = {},
): WorkoutItemInput {
  const work = options.work ?? 30;
  const sets = options.sets ?? 2;
  return {
    id,
    exerciseId,
    sets,
    role: options.role ?? "core",
    priority: options.priority ?? 80,
    minSets: Math.max(1, sets - 1),
    maxSets: Math.min(20, sets + 2),
    minWorkSeconds: Math.max(10, work - 10),
    maxWorkSeconds: work + 10,
    prescription: {
      type: "timed",
      durationSeconds: work,
      ...(options.perSide ? { perSide: true } : {}),
    },
    restAfterSetSeconds: options.rest ?? 25,
    restAfterExerciseSeconds: 20,
  };
}

export const padelPerformanceWorkouts: WorkoutInput[] = [
  {
    id: "padel-lower-body-foundation",
    slug: "padel-lower-body-foundation",
    name: "Padel Lower-Body Foundation",
    shortDescription:
      "Build the single-leg, lateral, and posterior-chain strength needed for low positions, stops, and recoveries.",
    difficulty: "beginner",
    focus: ["strength", "stability"],
    primaryFamily: "lower-body-strength",
    families: ["lower-body-strength", "single-leg-stability"],
    publicationStatus: "published",
    estimatedMinutes: 18,
    items: [
      item("lower-squat", "bodyweight-squat", { sets: 3, priority: 100 }),
      item("lower-split-squat", "supported-split-squat", {
        perSide: true,
        priority: 95,
      }),
      item("lower-lateral-lunge", "lateral-lunge", {
        perSide: true,
        priority: 90,
      }),
    ],
  },
  {
    id: "padel-lateral-braking",
    slug: "padel-lateral-braking",
    name: "Lateral Strength & Braking",
    shortDescription:
      "Train side-to-side force production, controlled stopping, and re-acceleration for padel direction changes.",
    difficulty: "intermediate",
    focus: ["power", "stability", "explosiveness"],
    primaryFamily: "deceleration",
    families: ["deceleration", "lateral-movement", "single-leg-stability"],
    publicationStatus: "published",
    estimatedMinutes: 14,
    items: [
      item("brake-lunge", "lateral-lunge", { perSide: true, priority: 100 }),
      item("brake-stick", "lateral-stick", { work: 20, sets: 3, rest: 35 }),
    ],
  },
  {
    id: "padel-first-step-power",
    slug: "padel-first-step-power",
    name: "Explosive First Step",
    shortDescription:
      "Build lower-body power and ankle reactivity with short vertical and lateral hopping intervals.",
    difficulty: "intermediate",
    focus: ["power", "explosiveness", "stability"],
    primaryFamily: "acceleration",
    families: ["acceleration", "lateral-movement"],
    publicationStatus: "published",
    estimatedMinutes: 12,
    items: [
      item("first-pogo", "pogo-hop", { work: 15, sets: 3, rest: 35 }),
      item("first-jump", "squat-jump-stick", { work: 15, sets: 3, rest: 40 }),
      item("first-drive", "split-step-lateral-drive", {
        work: 20,
        sets: 3,
        rest: 35,
      }),
    ],
  },
  {
    id: "padel-calf-ankle-resilience",
    slug: "padel-calf-ankle-resilience",
    name: "Calf & Ankle Resilience",
    shortDescription:
      "Build calf, soleus, and ankle capacity for split steps, short accelerations, and low-position braking.",
    difficulty: "beginner",
    focus: ["strength", "endurance", "stability"],
    primaryFamily: "single-leg-stability",
    families: ["single-leg-stability", "acceleration"],
    publicationStatus: "published",
    estimatedMinutes: 15,
    items: [
      item("calf-straight", "single-leg-calf-raise", {
        work: 35,
        perSide: true,
        priority: 100,
      }),
      item("calf-soleus", "bent-knee-soleus-raise", { work: 35, priority: 95 }),
      item("calf-pogo", "pogo-hop", {
        work: 15,
        sets: 3,
        role: "accessory",
        rest: 35,
      }),
    ],
  },
  {
    id: "padel-knee-hip-control",
    slug: "padel-knee-hip-control",
    name: "Knee & Hip Control",
    shortDescription:
      "Build single-leg alignment, outer-hip strength, and hip stability for low and wide court positions.",
    difficulty: "intermediate",
    focus: ["strength", "stability"],
    primaryFamily: "single-leg-stability",
    families: ["single-leg-stability", "lower-body-strength"],
    publicationStatus: "published",
    estimatedMinutes: 18,
    items: [
      item("knee-split", "supported-split-squat", {
        perSide: true,
        sets: 3,
        priority: 100,
      }),
      item("knee-stick", "lateral-stick", { work: 20, sets: 3, rest: 30 }),
      item("knee-copenhagen", "short-lever-copenhagen-hold", {
        work: 20,
        perSide: true,
        priority: 90,
      }),
    ],
  },
  {
    id: "padel-shoulder-overhead-durability",
    slug: "padel-shoulder-overhead-durability",
    name: "Shoulder & Overhead Durability",
    shortDescription:
      "Build rotator-cuff, scapular, and upper-back capacity for repeated overhead actions and volleys.",
    difficulty: "intermediate",
    focus: ["strength", "stability", "mobility", "endurance"],
    primaryFamily: "overhead-strength",
    families: ["overhead-strength", "mobility"],
    publicationStatus: "published",
    estimatedMinutes: 18,
    items: [
      item("shoulder-slide", "wall-slide-lift-off", {
        work: 35,
        priority: 100,
      }),
      item("shoulder-rotation", "side-lying-db-external-rotation", {
        perSide: true,
        priority: 95,
      }),
      item(
        "shoulder-prone-press",
        "prone-foam-roller-overhead-shoulder-press",
        {
          sets: 1,
          work: 30,
          priority: 90,
        },
      ),
      item(
        "shoulder-prone-rotation",
        "prone-foam-roller-plate-internal-external-rotation",
        {
          sets: 1,
          work: 30,
          priority: 85,
        },
      ),
      item("shoulder-prone-arc", "single-arm-prone-plate-over-obstacle", {
        sets: 1,
        work: 30,
        perSide: true,
        role: "accessory",
        priority: 80,
      }),
      item("shoulder-scap", "scapular-push-up", { role: "accessory" }),
      item("shoulder-thread", "thread-the-needle", {
        work: 30,
        perSide: true,
        role: "accessory",
      }),
    ],
  },
  {
    id: "padel-elbow-forearm-capacity",
    slug: "padel-elbow-forearm-capacity",
    name: "Forearm, Grip & Elbow Capacity",
    shortDescription:
      "Build wrist-extensor, forearm-rotation, grip, and upper-back capacity for repeated racket handling.",
    difficulty: "beginner",
    focus: ["strength", "endurance", "stability"],
    primaryFamily: "grip-forearm",
    families: ["grip-forearm", "overhead-strength"],
    publicationStatus: "published",
    estimatedMinutes: 14,
    items: [
      item("forearm-extension", "dumbbell-wrist-extension", {
        work: 35,
        perSide: true,
        priority: 100,
      }),
      item("forearm-rotation", "dumbbell-pronation-supination", {
        work: 35,
        perSide: true,
        priority: 95,
      }),
      item("forearm-row", "single-arm-row", {
        perSide: true,
        role: "accessory",
      }),
    ],
  },
  {
    id: "padel-back-trunk-resilience",
    slug: "padel-back-trunk-resilience",
    name: "Back & Trunk Resilience",
    shortDescription:
      "Combine upper-back mobility, posterior-chain strength, and trunk control for repeated rotation and recovery.",
    difficulty: "beginner",
    focus: ["strength", "stability", "mobility", "anti-rotation"],
    primaryFamily: "rotational-core",
    families: ["rotational-core", "mobility", "lower-body-strength"],
    publicationStatus: "published",
    estimatedMinutes: 17,
    items: [
      item("back-open-book", "open-book-rotation", {
        perSide: true,
        priority: 100,
      }),
      item("back-thread", "thread-the-needle", { perSide: true, priority: 95 }),
      item("back-dead-bug", "dead-bug", { priority: 90 }),
      item("back-bridge", "glute-bridge-march", { role: "accessory" }),
      item("back-bird-dog", "bird-dog", { role: "accessory" }),
    ],
  },
  {
    id: "padel-core-kinetic-chain",
    slug: "padel-core-kinetic-chain",
    name: "Rotational Core & Kinetic Chain",
    shortDescription:
      "Train force transfer from the legs through the hips and trunk instead of isolating rotation alone.",
    difficulty: "intermediate",
    focus: ["rotation", "power", "anti-rotation", "stability"],
    primaryFamily: "rotational-core",
    families: ["rotational-core", "lower-body-strength"],
    publicationStatus: "published",
    estimatedMinutes: 22,
    items: [
      item("chain-chop", "standing-dumbbell-wood-chop", {
        perSide: true,
        priority: 95,
      }),
      item("chain-march", "suitcase-march", {
        perSide: true,
        role: "accessory",
      }),
      item("chain-bird-dog", "bird-dog", { role: "accessory" }),
    ],
  },
  {
    id: "padel-footwork-patterns",
    slug: "padel-footwork-patterns",
    name: "Padel Footwork Patterns",
    shortDescription:
      "Practice quick ground contacts and lateral rhythm with line hops and pogo hops.",
    difficulty: "intermediate",
    focus: ["power", "stability", "endurance"],
    primaryFamily: "lateral-movement",
    families: ["lateral-movement", "acceleration", "deceleration"],
    publicationStatus: "published",
    estimatedMinutes: 11,
    items: [
      item("footwork-drive", "split-step-lateral-drive", {
        work: 20,
        sets: 3,
        priority: 100,
        rest: 35,
      }),
      item("footwork-pogo", "pogo-hop", {
        work: 15,
        role: "accessory",
      }),
    ],
  },
  {
    id: "padel-intermittent-conditioning",
    slug: "padel-intermittent-conditioning",
    name: "Padel Intermittent Conditioning",
    shortDescription:
      "Build repeat-effort capacity using short padel movement bursts and complete, controlled recoveries.",
    difficulty: "intermediate",
    focus: ["endurance", "power", "stability"],
    primaryFamily: "conditioning",
    families: ["conditioning", "lateral-movement"],
    publicationStatus: "published",
    estimatedMinutes: 18,
    items: [
      item("condition-shuffle", "intermittent-lateral-shuffle", {
        work: 20,
        sets: 4,
        priority: 100,
      }),
      item("condition-drive", "split-step-lateral-drive", {
        work: 20,
        sets: 3,
        priority: 90,
      }),
      item("condition-pogo", "pogo-hop", {
        work: 15,
        sets: 3,
        priority: 85,
      }),
      item("condition-fast-feet", "fast-feet-step", {
        work: 20,
        sets: 3,
        role: "accessory",
      }),
    ],
  },
  {
    id: "padel-full-body-performance",
    slug: "padel-full-body-performance",
    name: "Full-Body Padel Performance",
    shortDescription:
      "Combine foundational strength, lateral power, trunk transfer, shoulder capacity, and padel movement patterns.",
    difficulty: "intermediate",
    focus: ["strength", "power", "rotation", "stability"],
    primaryFamily: "lower-body-strength",
    families: [
      "lower-body-strength",
      "rotational-core",
      "overhead-strength",
      "lateral-movement",
    ],
    publicationStatus: "published",
    estimatedMinutes: 28,
    items: [
      item("full-split", "supported-split-squat", {
        sets: 3,
        perSide: true,
        priority: 100,
      }),
      item("full-bound", "lateral-stick", { work: 20, sets: 3, priority: 90 }),
      item("full-chop", "standing-dumbbell-wood-chop", {
        perSide: true,
        priority: 85,
      }),
      item("full-row", "single-arm-row", { perSide: true, priority: 80 }),
      item("full-shoulder", "side-lying-db-external-rotation", {
        perSide: true,
        role: "accessory",
      }),
      item("full-march", "suitcase-march", {
        work: 30,
        perSide: true,
        role: "accessory",
      }),
    ],
  },
];
