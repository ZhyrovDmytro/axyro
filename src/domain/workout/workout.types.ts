import { z } from "zod";

import {
  prescriptionSchema,
  sessionSectionSchema,
  workoutItemSchema,
  workoutSchema,
  workoutFamilySchema,
} from "./workout.schema";

export type Prescription = z.infer<typeof prescriptionSchema>;
export type WorkoutItem = z.infer<typeof workoutItemSchema>;
export type Workout = z.infer<typeof workoutSchema>;
export type SessionSection = z.infer<typeof sessionSectionSchema>;
export type WorkoutFamily = z.infer<typeof workoutFamilySchema>;
