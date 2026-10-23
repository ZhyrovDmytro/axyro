import { z } from "zod";

import {
  athleteProfileSchema,
  durationStatusSchema,
  feedbackAdaptationChangeSchema,
  feedbackAdaptationSchema,
  gameEventSchema,
  planGenerationMetadataSchema,
  plannedWorkoutSchema,
  progressionChangeSchema,
  progressionPhaseSchema,
  progressionReasonSchema,
  sessionAdjustmentSchema,
  sessionAdaptationSchema,
  trainingPlanSchema,
} from "./training-plan.schema";

export type AthleteProfile = z.infer<typeof athleteProfileSchema>;
export type DurationStatus = z.infer<typeof durationStatusSchema>;
export type FeedbackAdaptationChange = z.infer<
  typeof feedbackAdaptationChangeSchema
>;
export type FeedbackAdaptation = z.infer<typeof feedbackAdaptationSchema>;
export type ProgressionPhase = z.infer<typeof progressionPhaseSchema>;
export type ProgressionChange = z.infer<typeof progressionChangeSchema>;
export type ProgressionReason = z.infer<typeof progressionReasonSchema>;
export type SessionAdjustment = z.infer<typeof sessionAdjustmentSchema>;
export type SessionAdaptation = z.infer<typeof sessionAdaptationSchema>;
export type GameEvent = z.infer<typeof gameEventSchema>;
export type PlanGenerationMetadata = z.infer<
  typeof planGenerationMetadataSchema
>;
export type PlannedWorkout = z.infer<typeof plannedWorkoutSchema>;
export type TrainingPlan = z.infer<typeof trainingPlanSchema>;
