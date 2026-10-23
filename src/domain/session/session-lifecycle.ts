import { z } from "zod";

export const sessionLifecycleStatuses = [
  "scheduled",
  "in-progress",
  "completed",
  "skipped",
  "missed",
  "cancelled",
  "incomplete",
] as const;

export const sessionLifecycleStatusSchema = z.enum(sessionLifecycleStatuses);

export type SessionLifecycleStatus = z.infer<
  typeof sessionLifecycleStatusSchema
>;
