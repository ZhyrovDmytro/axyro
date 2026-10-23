import { z } from "zod";

import { exercises } from "@/content/exercises";
import { sportExerciseProfileSchema } from "@/domain/sport/sport-exercise-profile.schema";
import type { MovementRole } from "@/domain/sport/sport-exercise-profile.types";

const padelReasons: Record<string, string> = {
  "lateral-weight-shift":
    "Practices shifting weight between the legs before lateral court movement and low-ball reaches.",
  "dynamic-court-march":
    "Provides gentle whole-body preparation before padel footwork and hitting drills.",
  "bodyweight-squat":
    "Builds leg and hip strength for lowering into a ready position and rising after low shots.",
  "reverse-lunge":
    "Builds strength and balance in a split stance for reaching a ball and recovering your position.",
  "single-arm-row":
    "Builds upper-back pulling strength to support shoulder control during repeated volleys and overheads.",
  "scapular-push-up":
    "Practices shoulder-blade control that supports the racket arm during volleys and overhead preparation.",
  "side-lying-db-external-rotation":
    "Strengthens the shoulder external rotators, which help control the racket arm through repeated swings.",
  "prone-y-raise":
    "Develops shoulder-blade control with the arms raised, supporting overhead preparation for bandejas and smashes.",
  "standing-single-arm-db-overhead-press":
    "Builds overhead pressing strength and trunk control for supporting the racket arm above the head.",
  "plank-shoulder-tap":
    "Trains the trunk to stay steady as arm support changes, a useful foundation for reaching volleys.",
  "push-up-plus":
    "Builds pressing strength and shoulder-blade control to support repeated racket-arm actions.",
  "single-arm-prone-plate-over-obstacle":
    "Practices controlled shoulder movement through an arc, supporting comfortable arm positioning for padel overheads.",
  "prone-foam-roller-overhead-shoulder-press":
    "Develops light-load shoulder endurance through an overhead path, supporting repeated overhead preparation.",
  "prone-foam-roller-plate-internal-external-rotation":
    "Practices shoulder rotation control used when positioning and slowing the racket arm during overhead shots.",
  "standing-dumbbell-wood-chop":
    "Practices coordinated hip and trunk rotation relevant to forehands, backhands and overheads; it is a strength drill, not a stroke technique drill.",
  "side-plank-rotation":
    "Builds side-trunk support with controlled rotation for reaching shots while keeping your body balanced.",
  "dead-bug":
    "Trains trunk control while opposite limbs move, supporting a steady torso during padel footwork.",
  "bird-dog":
    "Practices opposite-arm and leg coordination while keeping the pelvis steady, supporting balance during reaching shots.",
  "dumbbell-romanian-deadlift":
    "Builds hip and hamstring strength for a low ready stance and pushing back into position after a shot.",
  "bodyweight-hip-hinge":
    "Practices bending from the hips for low-ball preparation while keeping the back controlled.",
  "supported-split-squat":
    "Builds split-stance leg strength for lowering into a reaching shot and pushing back toward your court position.",
  "lateral-lunge":
    "Builds strength through a wide side step for reaching wide balls and pushing back toward the centre.",
  "split-stance-acceleration-march":
    "Rehearses forward lean and alternating leg drive used in the first steps toward a short ball.",
  "lateral-stick":
    "Practices slowing a sideways movement and finding balance before a wide shot or change of direction.",
  "single-leg-calf-raise":
    "Builds calf strength and endurance for repeated court push-offs and footwork.",
  "dumbbell-pronation-supination":
    "Builds controlled forearm rotation to support racket-face positioning; use court practice to learn stroke timing.",
  "dumbbell-wrist-extension":
    "Builds wrist-extensor strength and endurance for supporting the wrist while holding and swinging the racket.",
  "ninety-ninety-hip-switch":
    "Practices hip rotation for turning and settling into low, wide positions on court.",
  "open-book-rotation":
    "Practices upper-back rotation used when turning to prepare groundstrokes and overhead shots.",
  "fast-feet-step":
    "Builds tolerance for repeated quick foot contacts between shots; reacting to the ball still needs court practice.",
  "split-step-lateral-drive":
    "Practices quick two-foot lateral contacts relevant to split-step preparation; it does not train timing against an opponent.",
  "bent-knee-soleus-raise":
    "Builds calf capacity with bent knees to support repeated pushes from a low ready position.",
  "glute-bridge-march":
    "Builds hip support while alternating legs, helping develop pelvic control for running and reaching shots.",
  "short-lever-copenhagen-hold":
    "Strengthens the outer hips and pelvic control that support side-to-side movement and wide-ball recovery.",
  "wall-slide-lift-off":
    "Practices controlled overhead reach for preparing bandejas, viboras and smashes without excessive back arching.",
  "thread-the-needle":
    "Practices upper-back rotation for turning into groundstroke and overhead preparation.",
  "suitcase-march":
    "Challenges grip and resistance to sideways leaning while stepping, supporting balance during off-centre shots.",
  "squat-jump-stick":
    "Builds vertical leg power and controlled landings for jumping shots and returning to a balanced stance.",
  "pogo-hop":
    "Practices small, springy ankle contacts that support repeated split steps and quick push-offs.",
  "intermittent-lateral-shuffle":
    "Builds repeated lateral movement capacity for covering the court and recovering between shots.",
};

const movementRolesByExerciseId: Record<string, MovementRole[]> = {
  "scapular-push-up": ["scapular_control", "shoulder_stability"],
  "side-lying-db-external-rotation": ["shoulder_stability", "deceleration"],
  "prone-y-raise": ["scapular_control", "shoulder_stability"],
  "standing-single-arm-db-overhead-press": [
    "overhead_strength",
    "core_stability",
  ],
  "plank-shoulder-tap": ["shoulder_stability", "anti_rotation"],
  "push-up-plus": ["scapular_control", "shoulder_stability"],
  "single-arm-prone-plate-over-obstacle": [
    "shoulder_mobility",
    "shoulder_stability",
  ],
  "prone-foam-roller-overhead-shoulder-press": [
    "overhead_strength",
    "scapular_control",
  ],
  "prone-foam-roller-plate-internal-external-rotation": [
    "shoulder_stability",
    "deceleration",
  ],
  "standing-dumbbell-wood-chop": ["rotational_power", "rotational_control"],
  "side-plank-rotation": ["rotational_control", "core_stability"],
  "dead-bug": ["core_stability", "anti_rotation"],
  "bird-dog": ["anti_rotation", "core_stability"],
};

const problemsByMovementRole: Partial<Record<MovementRole, string[]>> = {
  rotational_power: [
    "weak-core-rotation",
    "limited-bandeja-vibora-rotation",
    "weak-overhead-power",
  ],
  rotational_control: [
    "weak-core-rotation",
    "limited-bandeja-vibora-rotation",
    "unstable-volleys",
  ],
  anti_rotation: ["weak-core-rotation", "side-to-side-imbalance"],
  core_stability: ["side-to-side-imbalance"],
  shoulder_stability: [
    "weak-overhead-control",
    "shoulder-fatigue",
    "weak-overhead-power",
    "unstable-volleys",
  ],
  scapular_control: [
    "weak-overhead-control",
    "shoulder-fatigue",
    "weak-overhead-power",
  ],
  overhead_strength: ["weak-overhead-control", "weak-overhead-power"],
  single_leg_strength: ["poor-single-leg-balance", "difficulty-low-balls"],
  lateral_push: ["slow-lateral-movement", "slow-return-to-position"],
  lateral_shuffle: [
    "slow-lateral-movement",
    "slow-return-to-position",
    "late-split-step",
  ],
  change_of_direction: [
    "slow-return-to-position",
    "poor-deceleration",
    "slow-net-approach",
    "slow-lob-recovery",
    "late-split-step",
  ],
  acceleration: [
    "slow-first-step",
    "slow-net-approach",
    "slow-lob-recovery",
    "late-split-step",
  ],
  deceleration: ["poor-deceleration"],
  landing_control: ["poor-deceleration", "poor-single-leg-balance"],
  grip_endurance: ["weak-grip"],
  forearm_rotation: ["weak-grip"],
  hip_mobility: ["difficulty-low-balls"],
  shoulder_mobility: ["limited-overhead-mobility"],
  aerobic_conditioning: ["match-endurance"],
  interval_conditioning: ["match-endurance"],
};

const movementExerciseProfiles = [
  [
    "dumbbell-romanian-deadlift",
    ["legs", "glutes", "back"],
    ["hinge"],
    ["hip_hinge", "posterior_chain_strength"],
  ],
  [
    "bodyweight-hip-hinge",
    ["legs", "glutes", "back"],
    ["hinge", "movement_preparation"],
    ["hip_hinge", "movement_preparation"],
  ],
  [
    "supported-split-squat",
    ["legs", "glutes"],
    ["lunge", "single_leg_strength", "deceleration"],
    ["single_leg_strength", "braking_control"],
  ],
  [
    "lateral-lunge",
    ["legs", "glutes"],
    ["lunge", "lateral_push"],
    ["lateral_strength", "change_of_direction"],
  ],
  [
    "split-stance-acceleration-march",
    ["legs", "full-body"],
    ["acceleration"],
    ["first_step", "acceleration_power"],
  ],
  [
    "lateral-stick",
    ["legs", "glutes", "core"],
    ["deceleration", "landing_control"],
    ["lateral_deceleration", "balance"],
  ],
  [
    "single-leg-calf-raise",
    ["legs"],
    ["calf_ankle_strength", "single_leg_strength"],
    ["ankle_stability", "calf_endurance"],
  ],
  [
    "dumbbell-pronation-supination",
    ["arms"],
    ["forearm_rotation"],
    ["forearm_rotation", "wrist_control"],
  ],
  [
    "dumbbell-wrist-extension",
    ["arms"],
    ["grip_endurance"],
    ["wrist_strength", "forearm_endurance"],
  ],
  [
    "ninety-ninety-hip-switch",
    ["legs", "glutes"],
    ["hip_mobility", "recovery_mobility"],
    ["hip_rotation", "recovery_mobility"],
  ],
  [
    "open-book-rotation",
    ["back", "shoulders", "core"],
    ["thoracic_mobility", "recovery_mobility"],
    ["thoracic_rotation", "recovery_mobility"],
  ],
  [
    "fast-feet-step",
    ["legs", "full-body"],
    ["interval_conditioning", "movement_preparation"],
    ["interval_conditioning", "foot_speed"],
  ],
  [
    "lateral-weight-shift",
    ["legs", "glutes"],
    ["movement_preparation", "hip_mobility"],
    ["lateral_preparation"],
  ],
  [
    "dynamic-court-march",
    ["full-body", "legs"],
    ["movement_preparation"],
    ["general_preparation"],
  ],
  ["bodyweight-squat", ["legs", "glutes"], ["squat"], ["lower_body_strength"]],
  [
    "reverse-lunge",
    ["legs", "glutes"],
    ["lunge", "single_leg_strength"],
    ["split_stance_strength"],
  ],
  [
    "single-arm-row",
    ["back", "arms"],
    ["shoulder_stability"],
    ["upper_back_strength"],
  ],
] as const;

const performanceExerciseProfiles = [
  [
    "split-step-lateral-drive",
    ["legs", "glutes", "full-body"],
    ["calf_ankle_strength", "landing_control", "change_of_direction"],
    ["split_step", "general_padel"],
    ["reactive_ankle_strength", "foot_speed", "landing_control"],
    "performance",
  ],
  [
    "bent-knee-soleus-raise",
    ["legs"],
    ["calf_ankle_strength"],
    ["split_step", "low_ready_position"],
    ["soleus_capacity", "lower_leg_endurance"],
    "capacity",
  ],
  [
    "glute-bridge-march",
    ["glutes", "core"],
    ["hinge", "core_stability", "anti_rotation"],
    ["general_padel", "force_transfer"],
    ["posterior_chain_strength", "pelvic_control"],
    "capacity",
  ],
  [
    "short-lever-copenhagen-hold",
    ["glutes", "legs", "core"],
    ["single_leg_strength", "core_stability"],
    ["wide_ball_recovery", "low_ball"],
    ["hip_abductor_strength", "pelvic_control", "lateral_stability"],
    "capacity",
  ],
  [
    "wall-slide-lift-off",
    ["shoulders", "back"],
    ["shoulder_mobility", "scapular_control", "shoulder_stability"],
    ["overhead", "bandeja", "vibora"],
    ["overhead_mobility", "scapular_control"],
    "mobility",
  ],
  [
    "thread-the-needle",
    ["back", "shoulders", "core"],
    ["thoracic_mobility", "rotational_control"],
    ["overhead", "rotation", "recovery"],
    ["thoracic_rotation", "upper_back_mobility"],
    "mobility",
  ],
  [
    "suitcase-march",
    ["full-body", "core", "arms"],
    ["grip_endurance", "anti_rotation", "single_leg_strength"],
    ["force_transfer", "off_balance"],
    ["kinetic_chain", "single_leg_control"],
    "performance",
  ],
  [
    "squat-jump-stick",
    ["legs", "glutes"],
    ["landing_control", "deceleration", "acceleration"],
    ["split_step", "jump", "first_step"],
    ["lower_body_power", "landing_control"],
    "performance",
  ],
  [
    "pogo-hop",
    ["legs"],
    ["calf_ankle_strength", "acceleration", "movement_preparation"],
    ["split_step", "first_step"],
    ["reactive_ankle_strength", "foot_speed"],
    "performance",
  ],
  [
    "intermittent-lateral-shuffle",
    ["full-body", "legs"],
    ["interval_conditioning", "lateral_shuffle", "deceleration"],
    ["repeat_effort", "court_coverage"],
    ["repeat_effort", "lateral_endurance"],
    "performance",
  ],
] as const;

export const sportExerciseProfileCatalogSchema = z
  .array(sportExerciseProfileSchema)
  .superRefine((profiles, context) => {
    const exerciseIds = new Set(exercises.map((exercise) => exercise.id));
    const associations = new Set<string>();

    profiles.forEach((profile, index) => {
      if (!exerciseIds.has(profile.exerciseId)) {
        context.addIssue({
          code: "custom",
          message: `Unknown exercise id: ${profile.exerciseId}`,
          path: [index, "exerciseId"],
        });
      }

      const association = `${profile.sport}:${profile.exerciseId}`;
      if (associations.has(association)) {
        context.addIssue({
          code: "custom",
          message: `Duplicate sport exercise profile: ${association}`,
          path: [index, "exerciseId"],
        });
      }
      associations.add(association);
    });
  });

export const sportExerciseProfiles = sportExerciseProfileCatalogSchema.parse(
  [
    {
      sport: "padel",
      exerciseId: "scapular-push-up",
      relevance: "core",
      priority: 1,
      movementTags: ["overhead", "smash", "bandeja", "vibora", "general_padel"],
      goals: [
        "scapular_control",
        "serratus_activation",
        "overhead_stability",
        "resilience",
      ],
    },
    {
      sport: "padel",
      exerciseId: "side-lying-db-external-rotation",
      relevance: "core",
      priority: 2,
      movementTags: ["smash", "bandeja", "vibora", "overhead"],
      goals: [
        "rotator_cuff_strength",
        "shoulder_stability",
        "deceleration_capacity",
        "resilience",
      ],
    },
    {
      sport: "padel",
      exerciseId: "prone-y-raise",
      relevance: "core",
      priority: 3,
      movementTags: ["overhead", "smash", "bandeja", "vibora"],
      goals: [
        "scapular_stability",
        "lower_trapezius_strength",
        "overhead_control",
        "resilience",
      ],
    },
    {
      sport: "padel",
      exerciseId: "standing-single-arm-db-overhead-press",
      relevance: "core",
      priority: 5,
      movementTags: ["smash", "overhead", "bandeja", "vibora"],
      goals: [
        "overhead_strength",
        "unilateral_shoulder_stability",
        "trunk_integration",
      ],
    },
    {
      sport: "padel",
      exerciseId: "plank-shoulder-tap",
      relevance: "core",
      priority: 7,
      movementTags: ["general_padel", "overhead"],
      goals: [
        "shoulder_stability",
        "anti_rotation",
        "shoulder_core_integration",
      ],
    },
    {
      sport: "padel",
      exerciseId: "push-up-plus",
      relevance: "high",
      priority: 13,
      movementTags: ["general_padel", "overhead"],
      goals: ["pressing_strength", "serratus_strength", "scapular_control"],
    },
    {
      sport: "padel",
      exerciseId: "single-arm-prone-plate-over-obstacle",
      relevance: "foundation",
      priority: 16,
      movementTags: ["smash", "bandeja", "vibora", "overhead_preparation"],
      goals: [
        "overhead_shoulder_control",
        "scapular_control",
        "comfortable_overhead_range",
        "resilience",
      ],
    },
    {
      sport: "padel",
      exerciseId: "prone-foam-roller-overhead-shoulder-press",
      relevance: "high",
      priority: 17,
      movementTags: ["smash", "bandeja", "vibora", "overhead_preparation"],
      goals: [
        "overhead_control",
        "strength_endurance",
        "scapular_stability",
        "resilience",
      ],
    },
    {
      sport: "padel",
      exerciseId: "prone-foam-roller-plate-internal-external-rotation",
      relevance: "high",
      priority: 18,
      movementTags: [
        "smash",
        "bandeja",
        "vibora",
        "overhead_preparation",
        "overhead_deceleration_control",
      ],
      goals: [
        "rotator_cuff_control",
        "internal_external_rotation",
        "posterior_shoulder_control",
        "scapular_stability",
        "resilience",
      ],
    },
    {
      sport: "padel",
      exerciseId: "standing-dumbbell-wood-chop",
      bodyAreas: ["core", "full-body"],
      relevance: "core",
      priority: 2,
      movementTags: ["forehand", "backhand", "smash", "general_padel"],
      goals: ["diagonal_rotation", "hip_torso_sequencing", "rotational_force"],
    },
    {
      sport: "padel",
      exerciseId: "side-plank-rotation",
      bodyAreas: ["core"],
      relevance: "high",
      priority: 4,
      movementTags: ["forehand", "backhand", "change_of_direction"],
      goals: [
        "lateral_stability",
        "thoracic_rotation",
        "shoulder_core_integration",
      ],
    },
    {
      sport: "padel",
      exerciseId: "dead-bug",
      bodyAreas: ["core"],
      relevance: "high",
      priority: 5,
      movementTags: ["general_padel", "change_of_direction", "off_balance"],
      goals: ["anti_extension", "trunk_control", "limb_coordination"],
    },
    {
      sport: "padel",
      exerciseId: "bird-dog",
      bodyAreas: ["core", "back"],
      relevance: "high",
      priority: 7,
      movementTags: ["general_padel", "change_of_direction", "off_balance"],
      goals: ["anti_rotation", "contralateral_coordination", "balance"],
    },
    ...movementExerciseProfiles.map(
      ([exerciseId, bodyAreas, movementRoles, goals], index) => ({
        sport: "padel" as const,
        exerciseId,
        bodyAreas: [...bodyAreas],
        relevance: "foundation" as const,
        priority: 30 + index,
        movementTags: ["general_padel"],
        movementRoles: [...movementRoles],
        goals: [...goals],
      }),
    ),
    ...performanceExerciseProfiles.map(
      (
        [
          exerciseId,
          bodyAreas,
          movementRoles,
          movementTags,
          goals,
          trainingFunction,
        ],
        index,
      ) => ({
        sport: "padel" as const,
        exerciseId,
        bodyAreas: [...bodyAreas],
        relevance: "core" as const,
        priority: 60 + index,
        movementTags: [...movementTags],
        movementRoles: [...movementRoles],
        goals: [...goals],
        trainingFunction,
      }),
    ),
  ].map((profile) => ({
    ...profile,
    sportSpecificReason: padelReasons[profile.exerciseId],
    bodyAreas: "bodyAreas" in profile ? profile.bodyAreas : ["shoulders"],
    movementRoles:
      "movementRoles" in profile
        ? profile.movementRoles
        : movementRolesByExerciseId[profile.exerciseId],
    problemsAddressed: [
      ...new Set(
        ("movementRoles" in profile
          ? profile.movementRoles
          : movementRolesByExerciseId[profile.exerciseId]
        ).flatMap((role) => problemsByMovementRole[role] ?? []),
      ),
    ],
  })),
);
