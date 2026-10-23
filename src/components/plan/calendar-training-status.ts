import type { UiIconName } from "@/components/ui-icon";
import type { SessionLifecycleStatus } from "@/domain/session/session-lifecycle";

type CalendarTrainingStatus = {
  label: string;
  compactLabel: string;
  icon?: UiIconName;
  tone: "training" | "completed" | "skipped";
};

export function getCalendarTrainingStatus(
  status: SessionLifecycleStatus,
  isToday: boolean,
): CalendarTrainingStatus {
  switch (status) {
    case "completed":
      return {
        label: "Done",
        compactLabel: "Done",
        icon: "check",
        tone: "completed",
      };
    case "skipped":
      return {
        label: "Skipped",
        compactLabel: "Skip",
        icon: "skip",
        tone: "skipped",
      };
    case "missed":
      return {
        label: "Missed",
        compactLabel: "Miss",
        icon: "incomplete",
        tone: "skipped",
      };
    case "cancelled":
      return {
        label: "Cancelled",
        compactLabel: "Cancel",
        icon: "close",
        tone: "skipped",
      };
    case "incomplete":
      return {
        label: "Incomplete",
        compactLabel: "Partial",
        icon: "incomplete",
        tone: "skipped",
      };
    case "in-progress":
      return {
        label: "In progress",
        compactLabel: "Active",
        icon: "play",
        tone: "training",
      };
    case "scheduled":
      return {
        label: isToday ? "Train today" : "Training",
        compactLabel: isToday ? "Today" : "Train",
        tone: "training",
      };
  }
}
