import { expect, it } from "vitest";
import { getCalendarTrainingStatus } from "./calendar-training-status";

it("prioritizes recorded outcomes over today's training prompt", () => {
  expect(getCalendarTrainingStatus("completed", true)).toMatchObject({
    label: "Done",
    icon: "check",
    tone: "completed",
  });
  expect(getCalendarTrainingStatus("skipped", true)).toMatchObject({
    label: "Skipped",
    icon: "skip",
    tone: "skipped",
  });
  expect(getCalendarTrainingStatus("scheduled", true).label).toBe(
    "Train today",
  );
});

it("distinguishes missed and unfinished sessions from deliberately skipped training", () => {
  expect(getCalendarTrainingStatus("missed", false).label).toBe("Missed");
  expect(getCalendarTrainingStatus("incomplete", false).label).toBe(
    "Incomplete",
  );
  expect(getCalendarTrainingStatus("in-progress", false).label).toBe(
    "In progress",
  );
  expect(getCalendarTrainingStatus("cancelled", false).label).toBe("Cancelled");
  expect(getCalendarTrainingStatus("scheduled", false).label).toBe("Training");
});
