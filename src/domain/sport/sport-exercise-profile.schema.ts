import { z } from "zod";

import { bodyAreaSchema } from "@/domain/exercise/exercise.schema";

export const sportSchema = z.enum([
  "padel",
  "tennis",
  "badminton",
  "pickleball",
  "table_tennis",
]);

export const sportRelevanceSchema = z.enum(["foundation", "high", "core"]);

export const trainingFunctionSchema = z.enum([
  "capacity",
  "performance",
  "transfer",
  "mobility",
  "recovery",
]);

export const movementRoleSchema = z.enum([
  "rotational_power",
  "rotational_control",
  "anti_rotation",
  "core_stability",
  "shoulder_stability",
  "scapular_control",
  "overhead_strength",
  "squat",
  "hinge",
  "lunge",
  "single_leg_strength",
  "lateral_push",
  "lateral_shuffle",
  "change_of_direction",
  "acceleration",
  "deceleration",
  "landing_control",
  "calf_ankle_strength",
  "grip_endurance",
  "forearm_rotation",
  "hip_mobility",
  "thoracic_mobility",
  "shoulder_mobility",
  "aerobic_conditioning",
  "interval_conditioning",
  "recovery_mobility",
  "movement_preparation",
]);

const tagSchema = z.string().regex(/^[a-z0-9]+(?:_[a-z0-9]+)*$/);
const problemTagSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const sportExerciseProfileSchema = z.object({
  sport: sportSchema,
  exerciseId: z.string().min(1),
  bodyAreas: z.array(bodyAreaSchema).min(1),
  relevance: sportRelevanceSchema,
  priority: z.number().int().positive(),
  movementTags: z.array(tagSchema).min(1),
  movementRoles: z
    .array(movementRoleSchema)
    .min(1)
    .default(["movement_preparation"]),
  goals: z.array(tagSchema).min(1),
  problemsAddressed: z.array(problemTagSchema).default([]),
  trainingFunction: trainingFunctionSchema.default("capacity"),
  sportSpecificReason: z.string().min(1),
});
