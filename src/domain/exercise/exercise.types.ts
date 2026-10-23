import { z } from "zod";

import {
  bodyAreaSchema,
  cadenceModeSchema,
  defaultPrescriptionSchema,
  difficultySchema,
  equipmentSchema,
  exerciseRoleSchema,
  exerciseModeSchema,
  exerciseSchema,
  exerciseMediaSchema,
  movementFrameSchema,
  movementFramesSchema,
  exerciseNoiseLevelSchema,
  exercisePainAreaSchema,
  exercisePlanningMetadataSchema,
  exerciseSpaceRequirementSchema,
  guidanceConfigSchema,
  guidancePatternSchema,
  sideModeSchema,
  setupRequirementSchema,
  switchTargetSchema,
  sessionSectionTypeSchema,
  trainingQualitySchema,
  tempoSchema,
  timedDefaultPrescriptionSchema,
} from "./exercise.schema";

export type BodyArea = z.infer<typeof bodyAreaSchema>;
export type Equipment = z.infer<typeof equipmentSchema>;
export type SetupRequirement = z.infer<typeof setupRequirementSchema>;
export type Difficulty = z.infer<typeof difficultySchema>;
export type ExerciseRole = z.infer<typeof exerciseRoleSchema>;
export type ExerciseMode = z.infer<typeof exerciseModeSchema>;
export type SessionSectionType = z.infer<typeof sessionSectionTypeSchema>;
export type TrainingQuality = z.infer<typeof trainingQualitySchema>;
export type DefaultPrescription = z.infer<typeof defaultPrescriptionSchema>;
export type TimedDefaultPrescription = z.infer<
  typeof timedDefaultPrescriptionSchema
>;
export type SideMode = z.infer<typeof sideModeSchema>;
export type SwitchTarget = z.infer<typeof switchTargetSchema>;
export type CadenceMode = z.infer<typeof cadenceModeSchema>;
export type Tempo = z.infer<typeof tempoSchema>;
export type GuidancePattern = z.infer<typeof guidancePatternSchema>;
export type GuidanceConfig = z.infer<typeof guidanceConfigSchema>;
export type Exercise = z.infer<typeof exerciseSchema>;
export type ExerciseMedia = z.infer<typeof exerciseMediaSchema>;
export type MovementFrame = z.infer<typeof movementFrameSchema>;
export type MovementFrames = z.infer<typeof movementFramesSchema>;
export type ExercisePlanningMetadata = z.infer<
  typeof exercisePlanningMetadataSchema
>;
export type ExerciseSpaceRequirement = z.infer<
  typeof exerciseSpaceRequirementSchema
>;
export type ExerciseNoiseLevel = z.infer<typeof exerciseNoiseLevelSchema>;
export type ExercisePainArea = z.infer<typeof exercisePainAreaSchema>;
