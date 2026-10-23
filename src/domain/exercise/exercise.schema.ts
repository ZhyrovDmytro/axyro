import { z } from "zod";

export const bodyAreaSchema = z.enum([
  "full-body",
  "legs",
  "glutes",
  "core",
  "shoulders",
  "chest",
  "back",
  "arms",
]);

export const trainingQualitySchema = z.enum([
  "strength",
  "power",
  "explosiveness",
  "stability",
  "rotation",
  "anti-rotation",
  "mobility",
  "endurance",
  "warm-up",
]);

export const exerciseRoleSchema = z.enum([
  "mobility",
  "activation",
  "strength",
  "stability",
  "power",
]);

export const difficultySchema = z.enum([
  "beginner",
  "intermediate",
  "advanced",
]);

export const equipmentSchema = z.enum([
  "none",
  "light_dumbbell",
  "dumbbell",
  "two_dumbbells",
]);

export const setupRequirementSchema = z.enum([
  "floor",
  "wall",
  "chair",
  "mat",
  "foam_roller",
  "low_obstacle",
]);

export const exerciseModeSchema = z.literal("timed");

export const sessionSectionTypeSchema = z.enum(["warmup", "main", "cooldown"]);

export const guidancePatternSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("alternating"),
    cues: z.array(z.string().min(1)).min(2),
  }),
  z.object({ type: z.literal("rep-count") }),
  z.object({
    type: z.literal("words"),
    cues: z.array(z.string().min(1)).min(1),
  }),
  z.object({ type: z.literal("none") }),
]);

export const guidanceConfigBaseSchema = z.object({
  enabledByDefault: z.boolean(),
  pattern: guidancePatternSchema,
  bpm: z.number().positive().max(300).optional(),
  secondsPerCue: z.number().positive().max(30).optional(),
});

export const guidanceConfigSchema = guidanceConfigBaseSchema.refine(
  (guidance) => !(guidance.bpm && guidance.secondsPerCue),
  {
    message: "Guidance can specify bpm or secondsPerCue, but not both.",
  },
);

const recommendationRangeSchema = z
  .object({
    min: z.number().int().positive(),
    max: z.number().int().positive(),
  })
  .refine((range) => range.max >= range.min, {
    message: "Recommendation maximum must be greater than or equal to minimum.",
  });

export const referencePrescriptionSchema = z
  .object({
    sets: recommendationRangeSchema,
    reps: recommendationRangeSchema.optional(),
    repsPerSide: recommendationRangeSchema.optional(),
    durationSeconds: recommendationRangeSchema.optional(),
    restSeconds: recommendationRangeSchema,
  })
  .refine(
    (prescription) =>
      [
        prescription.reps,
        prescription.repsPerSide,
        prescription.durationSeconds,
      ].filter(Boolean).length === 1,
    {
      message:
        "Default prescription must recommend exactly one of reps, repsPerSide, or durationSeconds.",
    },
  );

export const sideModeSchema = z.enum([
  "simultaneous",
  "separate",
  "alternating",
]);

export const switchTargetSchema = z.enum(["hand", "leg", "side"]);

export const cadenceModeSchema = z.enum([
  "controlled",
  "metronome",
  "alternating_metronome",
  "self_paced",
  "explosive_reset",
]);

export const mediaTypeSchema = z.enum(["video", "animation", "image"]);
export const mediaPublicationStatusSchema = z.enum(["production", "draft"]);

export const exerciseSpaceRequirementSchema = z.enum([
  "compact",
  "moderate",
  "large",
]);

export const exerciseNoiseLevelSchema = z.enum(["quiet", "moderate", "high"]);

export const exercisePainAreaSchema = z.enum([
  "shoulder",
  "elbow-forearm",
  "wrist-hand",
  "neck-upper-back",
  "lower-back",
  "hip-groin",
  "knee",
  "calf-achilles",
  "ankle-foot",
]);

const planningSecondsRangeSchema = z
  .object({
    min: z.number().int().nonnegative(),
    max: z.number().int().nonnegative(),
  })
  .refine((range) => range.max >= range.min, {
    message: "Planning range maximum must be greater than or equal to minimum.",
  });

export const exercisePlanningMetadataSchema = z.object({
  sectionRoles: z.array(sessionSectionTypeSchema).min(1),
  movementPatterns: z
    .array(z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/))
    .min(1),
  trainingQualities: z.array(trainingQualitySchema).min(1),
  spaceRequirement: exerciseSpaceRequirementSchema,
  noiseLevel: exerciseNoiseLevelSchema,
  safeWorkSeconds: planningSecondsRangeSchema.refine((range) => range.min > 0, {
    message: "Safe work duration must be positive.",
  }),
  safeRestSeconds: planningSecondsRangeSchema,
  avoidForPainAreas: z.array(exercisePainAreaSchema),
  regressionExerciseId: z.string().min(1).optional(),
  progressionExerciseId: z.string().min(1).optional(),
  mediaStatus: mediaPublicationStatusSchema,
});

const mediaUriSchema = z.union([z.string().url(), z.string().startsWith("/")]);

export const movementFrameSchema = z.object({
  uri: mediaUriSchema,
  alt: z.string().min(1),
  cue: z.string().min(1),
  kind: z.enum(["position", "reference"]),
});

export const movementFramesSchema = z.object({
  start: movementFrameSchema,
  end: movementFrameSchema,
});

const singleReferenceExerciseIds = new Set([
  "suitcase-hold",
  "suitcase-march",
  "thread-the-needle",
]);

const normalizedExerciseMediaSchema = z.object({
  type: mediaTypeSchema,
  uri: mediaUriSchema.optional(),
  posterUri: mediaUriSchema.optional(),
  fallbackUri: mediaUriSchema.optional(),
  fallback: z.literal("instructional").optional(),
  aspectRatio: z.string().regex(/^\d+(?:\.\d+)?\s*\/\s*\d+(?:\.\d+)?$/),
  durationSeconds: z.number().positive().max(300).optional(),
  loop: z.boolean(),
  attribution: z.string().min(1).optional(),
  version: z.string().min(1),
  status: mediaPublicationStatusSchema,
  /** @deprecated Author with uri; retained while existing content/tests migrate. */
  videoUrl: mediaUriSchema.optional(),
  /** @deprecated Author with posterUri; retained while existing content/tests migrate. */
  posterUrl: mediaUriSchema.optional(),
  /** @deprecated Author with durationSeconds. */
  loopDurationSeconds: z.number().positive().max(300).optional(),
  /** @deprecated Author with loop. */
  seamlessLoop: z.boolean().optional(),
  assetKey: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  requiredViews: z.array(z.string().min(1)).min(1),
  notes: z.string().min(1),
});

/**
 * Accepts the original authoring shape while exposing one normalized media
 * contract to the UI. This keeps content edits small while media is replaced.
 */
export const exerciseMediaSchema = z.preprocess((input) => {
  if (!input || typeof input !== "object") return input;
  const media = input as Record<string, unknown>;
  if ("type" in media) return media;
  const videoUrl =
    typeof media.videoUrl === "string" ? media.videoUrl : undefined;
  const posterUrl =
    typeof media.posterUrl === "string" ? media.posterUrl : undefined;
  return {
    type: videoUrl ? "video" : "image",
    uri: videoUrl ?? posterUrl,
    posterUri: posterUrl,
    fallbackUri: posterUrl,
    fallback:
      media.fallback ??
      (!videoUrl && !posterUrl && media.status === "production"
        ? "instructional"
        : undefined),
    aspectRatio: "16 / 9",
    durationSeconds: media.loopDurationSeconds,
    loop: media.seamlessLoop !== false,
    version: "1",
    status: media.status ?? "draft",
    videoUrl,
    posterUrl,
    loopDurationSeconds: media.loopDurationSeconds,
    seamlessLoop: media.seamlessLoop,
    assetKey: media.assetKey,
    requiredViews: media.requiredViews,
    notes: media.notes,
  };
}, normalizedExerciseMediaSchema);

export const timedDefaultPrescriptionSchema = z.object({
  workDurationSeconds: z.number().int().positive().max(3600),
  restDurationSeconds: z.number().int().nonnegative().max(900),
  rounds: z.number().int().positive().max(20),
  sideMode: sideModeSchema,
  cadenceMode: cadenceModeSchema,
});

export const defaultPrescriptionSchema = z.union([
  timedDefaultPrescriptionSchema,
  referencePrescriptionSchema,
]);

export const tempoSchema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("controlled"),
    pattern: z
      .string()
      .regex(/^\d+(?:-\d+)+(?:-[a-z]+)?$/)
      .optional(),
  }),
  z.object({
    mode: z.literal("metronome"),
    defaultBpm: z.number().positive().max(300),
  }),
  z.object({
    mode: z.literal("alternating_metronome"),
    defaultBpm: z.number().positive().max(300),
    bpmRange: recommendationRangeSchema.optional(),
    cues: z.array(z.string().min(1)).min(2),
  }),
  z.object({ mode: z.literal("self_paced") }),
  z.object({
    mode: z.literal("explosive_reset"),
    resetSeconds: recommendationRangeSchema.optional(),
  }),
]);

const exerciseAuthoringSchema = z
  .object({
    id: z.string().min(1),
    slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    name: z.string().min(1),
    shortDescription: z.string().min(1),
    instructions: z.array(z.string().min(1)).min(1),
    cues: z.array(z.string().min(1)).min(1),
    commonMistakes: z.array(z.string().min(1)),
    bodyAreas: z.array(bodyAreaSchema).min(1),
    difficulty: difficultySchema,
    roles: z.array(exerciseRoleSchema).min(1),
    qualities: z.array(trainingQualitySchema).min(1),
    targetedQualities: z
      .array(z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/))
      .min(1),
    sessionRoles: z.array(sessionSectionTypeSchema).min(1).default(["main"]),
    preparationFor: z.array(trainingQualitySchema).default([]),
    recoveryFor: z.array(bodyAreaSchema).default([]),
    sessionIntensity: z.enum(["low", "moderate", "high"]).default("moderate"),
    equipment: z.array(equipmentSchema).min(1),
    optionalEquipment: z.array(equipmentSchema.exclude(["none"])).optional(),
    setupRequirements: z.array(setupRequirementSchema),
    laterality: z.enum([
      "bilateral",
      "unilateral",
      "alternating",
      "configurable",
    ]),
    switchTarget: switchTargetSchema.optional(),
    supportedModes: z.array(exerciseModeSchema).min(1),
    defaultPrescription: defaultPrescriptionSchema,
    tempo: tempoSchema,
    media: exerciseMediaSchema,
    movementFrames: movementFramesSchema.optional(),
    variantOf: z.string().min(1).optional(),
    easierVariantId: z.string().min(1).optional(),
    harderVariantId: z.string().min(1).optional(),
    equipmentFreeVariantId: z.string().min(1).optional(),
    substitutionGroup: z
      .string()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .optional(),
    defaultGuidance: guidanceConfigSchema.optional(),
    planning: exercisePlanningMetadataSchema.optional(),
  })
  .superRefine((exercise, context) => {
    if (exercise.laterality === "unilateral" && !exercise.switchTarget) {
      context.addIssue({
        code: "custom",
        message: "Unilateral exercises must declare a switch target.",
        path: ["switchTarget"],
      });
    }
    if (exercise.planning) {
      const defaults = exercise.defaultPrescription;
      const work =
        "workDurationSeconds" in defaults
          ? defaults.workDurationSeconds
          : defaults.durationSeconds?.min;
      const rest =
        "restDurationSeconds" in defaults
          ? defaults.restDurationSeconds
          : defaults.restSeconds.min;
      if (exercise.planning.mediaStatus !== exercise.media.status) {
        context.addIssue({
          code: "custom",
          message: "Planning media status must match exercise media status.",
          path: ["planning", "mediaStatus"],
        });
      }
      if (
        work !== undefined &&
        (work < exercise.planning.safeWorkSeconds.min ||
          work > exercise.planning.safeWorkSeconds.max)
      ) {
        context.addIssue({
          code: "custom",
          message:
            "Default work duration must be inside the safe planning range.",
          path: ["planning", "safeWorkSeconds"],
        });
      }
      if (
        rest < exercise.planning.safeRestSeconds.min ||
        rest > exercise.planning.safeRestSeconds.max
      ) {
        context.addIssue({
          code: "custom",
          message:
            "Default rest duration must be inside the safe planning range.",
          path: ["planning", "safeRestSeconds"],
        });
      }
    }
  });

const painAreasByBodyArea = {
  "full-body": [],
  legs: ["knee", "calf-achilles", "ankle-foot"],
  glutes: ["hip-groin"],
  core: ["lower-back"],
  shoulders: ["shoulder", "neck-upper-back"],
  chest: ["shoulder"],
  back: ["neck-upper-back", "lower-back"],
  arms: ["shoulder", "elbow-forearm", "wrist-hand"],
} as const satisfies Record<
  z.infer<typeof bodyAreaSchema>,
  readonly z.infer<typeof exercisePainAreaSchema>[]
>;

/**
 * Normalizes the existing catalog into the planner contract. New content can
 * author `planning` explicitly; legacy reviewed entries receive deterministic
 * metadata from fields that already describe the same movement.
 */
export const exerciseSchema = exerciseAuthoringSchema.transform((exercise) => {
  const usesSingleReference = singleReferenceExerciseIds.has(exercise.id);
  const startFrameUri = `/images/exercises/positions/${exercise.id}-start.png`;
  const movementFrames = exercise.movementFrames ?? {
    start: {
      uri: startFrameUri,
      alt: usesSingleReference
        ? `${exercise.name} movement reference`
        : `${exercise.name} start position`,
      cue: exercise.instructions[0],
      kind: usesSingleReference
        ? ("reference" as const)
        : ("position" as const),
    },
    end: {
      uri: usesSingleReference
        ? startFrameUri
        : `/images/exercises/positions/${exercise.id}-end.png`,
      alt: usesSingleReference
        ? `${exercise.name} movement reference`
        : `${exercise.name} finish position`,
      cue: exercise.instructions[exercise.instructions.length - 1],
      kind: usesSingleReference
        ? ("reference" as const)
        : ("position" as const),
    },
  };

  if (exercise.planning) {
    return { ...exercise, movementFrames, planning: exercise.planning };
  }

  const defaults = exercise.defaultPrescription;
  const work =
    "workDurationSeconds" in defaults
      ? defaults.workDurationSeconds
      : (defaults.durationSeconds?.min ?? 30);
  const rest =
    "restDurationSeconds" in defaults
      ? defaults.restDurationSeconds
      : defaults.restSeconds.min;
  const avoidForPainAreas = [
    ...new Set(exercise.bodyAreas.flatMap((area) => painAreasByBodyArea[area])),
  ];

  return {
    ...exercise,
    movementFrames,
    planning: {
      sectionRoles: exercise.sessionRoles,
      movementPatterns: exercise.targetedQualities,
      trainingQualities: exercise.qualities,
      spaceRequirement: "compact" as const,
      noiseLevel:
        exercise.sessionIntensity === "high"
          ? ("moderate" as const)
          : ("quiet" as const),
      safeWorkSeconds: {
        min: Math.max(10, work - 10),
        max: work + 10,
      },
      safeRestSeconds: {
        min: Math.max(0, rest - 10),
        max: rest + 15,
      },
      avoidForPainAreas,
      ...(exercise.easierVariantId
        ? { regressionExerciseId: exercise.easierVariantId }
        : {}),
      ...(exercise.harderVariantId
        ? { progressionExerciseId: exercise.harderVariantId }
        : {}),
      mediaStatus: exercise.media.status,
    },
  };
});
