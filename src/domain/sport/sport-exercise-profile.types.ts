import { z } from "zod";

import {
  sportExerciseProfileSchema,
  trainingFunctionSchema,
  movementRoleSchema,
  sportRelevanceSchema,
  sportSchema,
} from "./sport-exercise-profile.schema";

export type Sport = z.infer<typeof sportSchema>;
export type SportRelevance = z.infer<typeof sportRelevanceSchema>;
export type SportExerciseProfile = z.infer<typeof sportExerciseProfileSchema>;
export type MovementRole = z.infer<typeof movementRoleSchema>;
export type TrainingFunction = z.infer<typeof trainingFunctionSchema>;
