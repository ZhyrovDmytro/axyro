// @vitest-environment jsdom
import { createElement } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { WorkoutFeedbackEvent } from "@/services/persistence/workout-activity-repository";
import { WorkoutFeedbackForm } from "./workout-feedback-form";

const saved: WorkoutFeedbackEvent = {
  id: "feedback-1",
  completionId: "completion-1",
  sessionId: "session-1",
  workoutId: "workout-1",
  completedAt: "2026-11-01T12:00:00.000Z",
  recordedAt: "2026-11-01T12:00:00.000Z",
  rating: "just-right",
  perceivedDifficulty: "JUST_RIGHT",
  reasons: [],
};
afterEach(cleanup);

describe("WorkoutFeedbackForm", () => {
  it.each([
    ["Easy", "SLIGHTLY_EASY"],
    ["Just right", "JUST_RIGHT"],
    ["Hard", "HARD"],
  ])("saves %s in one tap", (label, perceivedDifficulty) => {
    const onSave = vi.fn(() => saved);
    render(createElement(WorkoutFeedbackForm, { onSave }));
    expect(screen.getAllByRole("button")).toHaveLength(3);
    fireEvent.click(screen.getByRole("button", { name: label }));
    expect(onSave).toHaveBeenCalledWith({ perceivedDifficulty });
    expect(screen.getByRole("status").textContent).toContain("Saved");
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Edit feedback" }),
    );
  });

  it("allows editing a rating and retrying if storage fails", () => {
    const onSave = vi.fn().mockReturnValueOnce(null).mockReturnValue(saved);
    render(
      createElement(WorkoutFeedbackForm, { onSave, initialFeedback: saved }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Edit feedback" }));
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Easy" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Hard" }));
    expect(screen.getByRole("alert").textContent).toContain("try again");
    fireEvent.click(screen.getByRole("button", { name: "Hard" }));
    expect(onSave).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
