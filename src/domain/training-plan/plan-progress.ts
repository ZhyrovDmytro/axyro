import type { SessionActivity } from "@/services/persistence/workout-activity-repository";
import { toDateKey } from "./date";
import type { TrainingPlan } from "./training-plan.types";

/** Keep scheduled-day completion separate from additional training. */
export function getPlanProgress(
  plan: Pick<
    TrainingPlan,
    "generatedAt" | "startDate" | "endDate" | "sessions"
  >,
  activities: readonly SessionActivity[],
) {
  const sessions = new Map(
    plan.sessions.map((session) => [session.id, session]),
  );
  const completed = new Set<string>();
  const extras = new Set<string>();
  for (const activity of activities) {
    if (activity.status !== "completed") continue;
    if (activity.planId && activity.planId !== plan.generatedAt) continue;
    const session =
      activity.planId === plan.generatedAt
        ? sessions.get(activity.sessionId)
        : undefined;
    const performedDate = activity.startedAt ?? activity.completedAt;
    const date = performedDate
      ? toDateKey(new Date(performedDate))
      : activity.scheduledDate;
    if (session && date === activity.scheduledDate) {
      completed.add(session.id);
    } else if (date >= plan.startDate && date <= plan.endDate) {
      extras.add(activity.completionId ?? activity.id);
    }
  }
  return { completedCount: completed.size, extraCount: extras.size };
}
