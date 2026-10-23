import { z } from "zod";

import { adaptationProfileSchema } from "./adaptation-profile";
import { athleteProfileSchema } from "./training-plan.schema";

export const modelPlanIntentSchema = z.object({
  explanation: z.string().min(1).max(600),
  sessions: z
    .array(
      z.object({
        name: z.string().min(1).max(80),
        selectedExerciseIds: z.array(z.string().min(1)).min(2).max(4),
      }),
    )
    .min(1)
    .max(5),
});

export function modelPlanIntentSchemaForCandidates(
  candidateIds: readonly string[],
) {
  if (candidateIds.length === 0) {
    throw new Error("At least one candidate exercise is required.");
  }
  const candidateIdSchema = z.enum(candidateIds as [string, ...string[]]);
  return z.object({
    explanation: z.string().min(1).max(600),
    sessions: z
      .array(
        z.object({
          name: z.string().min(1).max(80),
          selectedExerciseIds: z.array(candidateIdSchema).min(2).max(4),
        }),
      )
      .min(1)
      .max(5),
  });
}

export const aiPlanRequestSchema = z.object({
  profile: athleteProfileSchema.refine(
    (profile) => [5, 10, 20].includes(profile.sessionDurationMinutes),
    {
      message: "Choose 5, 10 or 20 minutes.",
      path: ["sessionDurationMinutes"],
    },
  ),
  today: z.string().date(),
  adaptationProfile: adaptationProfileSchema,
});

export type ModelPlanIntent = z.infer<typeof modelPlanIntentSchema>;
export type AiPlanRequest = z.infer<typeof aiPlanRequestSchema>;
