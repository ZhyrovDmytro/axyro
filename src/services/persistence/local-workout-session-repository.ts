import { createBrowserUserStorage } from "./user-storage";
import { z } from "zod";

import { intensityLevels } from "@/domain/workout/intensity";
import type { StorageLike } from "@/services/persistence/storage";
import type {
  ActiveSessionLoadResult,
  ActiveWorkoutSessionState,
  WorkoutSessionRepository,
} from "@/services/persistence/workout-session-repository";

export const activeWorkoutSessionStorageKey = "veyro.active-workout.v1";

const activeWorkoutSessionSchema = z.object({
  version: z.literal(1),
  lifecycleStatus: z.literal("in-progress"),
  sessionId: z.string().min(1),
  activityId: z.string().min(1).optional(),
  planId: z.string().min(1).optional(),
  workoutId: z.string().min(1),
  workoutName: z.string().min(1),
  resumeHref: z.string().startsWith("/"),
  exitHref: z.string().startsWith("/"),
  intensity: z.enum(intensityLevels),
  sequenceFingerprint: z.string().min(1),
  startedAt: z.string().datetime(),
  lastPersistedAt: z.string().datetime(),
  currentIndex: z.number().int().nonnegative(),
  currentSection: z.enum(["warmup", "main", "cooldown"]).optional(),
  currentExerciseId: z.string().min(1).optional(),
  currentExerciseIndex: z.number().int().positive(),
  currentExerciseCount: z.number().int().positive(),
  currentRound: z.number().int().positive().optional(),
  currentInterval: z.enum(["ready", "active", "side-transition", "rest"]),
  paused: z.boolean(),
  pausedRemainingMs: z.number().int().nonnegative(),
  activeDurationMs: z.number().int().nonnegative(),
  completedSetKeys: z.array(z.string()),
  skippedWorkoutItemIds: z.array(z.string()),
  stepStatuses: z.array(z.enum(["completed", "skipped", "current", "pending"])),
});

export class LocalWorkoutSessionRepository implements WorkoutSessionRepository {
  constructor(private readonly storage: StorageLike | null) {}

  loadActive(): ActiveSessionLoadResult {
    if (!this.storage) return { kind: "none" };
    try {
      const serialized = this.storage.getItem(activeWorkoutSessionStorageKey);
      if (!serialized) return { kind: "none" };
      const parsed = activeWorkoutSessionSchema.safeParse(
        JSON.parse(serialized) as unknown,
      );
      return parsed.success
        ? { kind: "valid", state: parsed.data }
        : { kind: "invalid" };
    } catch {
      return { kind: "invalid" };
    }
  }

  saveActive(state: ActiveWorkoutSessionState) {
    const validated = activeWorkoutSessionSchema.parse(state);
    try {
      this.storage?.setItem(
        activeWorkoutSessionStorageKey,
        JSON.stringify(validated),
      );
    } catch {
      // The live workout remains usable if browser storage is unavailable.
    }
    return validated;
  }

  clearActive(sessionId?: string) {
    try {
      if (sessionId) {
        const current = this.loadActive();
        if (current.kind === "valid" && current.state.sessionId !== sessionId) {
          return;
        }
      }
      this.storage?.removeItem?.(activeWorkoutSessionStorageKey);
    } catch {
      // Clearing continuity is best-effort when storage is blocked.
    }
  }
}

export function createBrowserWorkoutSessionRepository(): WorkoutSessionRepository {
  try {
    return new LocalWorkoutSessionRepository(createBrowserUserStorage());
  } catch {
    return new LocalWorkoutSessionRepository(null);
  }
}
