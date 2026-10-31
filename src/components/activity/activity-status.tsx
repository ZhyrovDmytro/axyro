import { UiIcon, type UiIconName } from "@/components/ui-icon";
import type { SessionLifecycleStatus } from "@/domain/session/session-lifecycle";

const statusContent: Record<
  SessionLifecycleStatus,
  { icon: UiIconName; label: string }
> = {
  scheduled: { icon: "scheduled", label: "Scheduled" },
  "in-progress": { icon: "play", label: "In progress" },
  completed: { icon: "check", label: "Completed" },
  skipped: { icon: "skip", label: "Skipped" },
  missed: { icon: "minus", label: "Missed" },
  cancelled: { icon: "close", label: "Cancelled" },
  incomplete: { icon: "incomplete", label: "Incomplete" },
};

export function ActivityStatus({ status }: { status: SessionLifecycleStatus }) {
  const content = statusContent[status];
  return (
    <span className={`activity-status activity-status--${status}`}>
      <UiIcon name={content.icon} />
      {content.label}
    </span>
  );
}
