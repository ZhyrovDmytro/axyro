import { z } from "zod";

import {
  guidanceConfigBaseSchema,
  sessionSectionTypeSchema,
  trainingQualitySchema,
} from "../exercise/exercise.schema";

export const workoutFamilySchema = z.enum([
  "rotational-core",
  "overhead-strength",
  "lower-body-strength",
  "lateral-movement",
  "acceleration",
  "deceleration",
  "single-leg-stability",
  "grip-forearm",
  "mobility",
  "conditioning",
  "recovery",
]);

export const prescriptionSchema = z.object({
  type: z.literal("timed"),
  durationSeconds: z.number().int().positive().max(3600),
  perSide: z.boolean().optional(),
});

export const workoutItemSchema = z
  .object({
    id: z.string().min(1),
    exerciseId: z.string().min(1),
    sets: z.number().int().positive().max(20),
    prescription: prescriptionSchema,
    restAfterSetSeconds: z.number().int().nonnegative().max(900).optional(),
    restAfterExerciseSeconds: z
      .number()
      .int()
      .nonnegative()
      .max(900)
      .optional(),
    guidanceOverride: guidanceConfigBaseSchema.partial().optional(),
    notes: z.array(z.string().min(1)).optional(),
    role: z.enum(["core", "accessory", "optional"]).optional(),
    priority: z.number().int().min(0).max(100).optional(),
    minSets: z.number().int().positive().max(20).optional(),
    maxSets: z.number().int().positive().max(20).optional(),
    minWorkSeconds: z.number().int().positive().max(3600).optional(),
    maxWorkSeconds: z.number().int().positive().max(3600).optional(),
  })
  .superRefine((item, context) => {
    const minSets = item.minSets ?? item.sets;
    const maxSets = item.maxSets ?? item.sets;
    const minWorkSeconds =
      item.minWorkSeconds ?? item.prescription.durationSeconds;
    const maxWorkSeconds =
      item.maxWorkSeconds ?? item.prescription.durationSeconds;

    if (minSets > item.sets || item.sets > maxSets) {
      context.addIssue({
        code: "custom",
        message: "Authored sets must be within the construction bounds.",
        path: ["sets"],
      });
    }
    if (
      minWorkSeconds > item.prescription.durationSeconds ||
      item.prescription.durationSeconds > maxWorkSeconds
    ) {
      context.addIssue({
        code: "custom",
        message:
          "Authored work duration must be within the construction bounds.",
        path: ["prescription", "durationSeconds"],
      });
    }
  });

export const workoutSchema = z.object({
  access: z.enum(["free", "pro"]).optional(),
  id: z.string().min(1),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  name: z.string().min(1),
  shortDescription: z.string().min(1),
  difficulty: z.enum(["beginner", "intermediate", "advanced"]),
  focus: z.array(trainingQualitySchema).min(1),
  primaryFamily: workoutFamilySchema.optional(),
  families: z.array(workoutFamilySchema).min(1).optional(),
  publicationStatus: z.enum(["published", "draft"]).optional(),
  timingMode: z.literal("fixed-budget").optional(),
  estimatedMinutes: z.number().int().positive().max(300),
  items: z.array(workoutItemSchema).min(1),
});

export const sessionSectionSchema = z.object({
  type: sessionSectionTypeSchema,
  items: z.array(workoutItemSchema).min(1),
});

export const sessionSectionsSchema = z
  .array(sessionSectionSchema)
  .length(3)
  .superRefine((sections, context) => {
    const expected = ["warmup", "main", "cooldown"] as const;
    expected.forEach((type, index) => {
      if (sections[index]?.type !== type) {
        context.addIssue({
          code: "custom",
          message: `Session section ${index + 1} must be ${type}.`,
          path: [index, "type"],
        });
      }
    });
  });
