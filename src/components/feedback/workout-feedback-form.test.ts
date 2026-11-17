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
  it("provides exactly five difficulty choices and saves Just right immediately", () => {
    const onSave = vi.fn(() => saved);
    render(createElement(WorkoutFeedbackForm, { onSave }));
    expect(screen.getAllByRole("button")).toHaveLength(5);
    const justRight = screen.getByRole("button", { name: "Just right" });
    justRight.focus();
    fireEvent.click(justRight);
    expect(onSave).toHaveBeenCalledWith({
      perceivedDifficulty: "JUST_RIGHT",
      reasons: [],
      comment: "",
      affectedExerciseIds: [],
    });
    expect(screen.getByRole("status").textContent).toContain("Saved");
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Edit feedback" }),
    );
  });

  it("collects multiple hard reasons and a localized exercise without saving prematurely", () => {
    const onSave = vi.fn(() => ({
      ...saved,
      rating: "too-hard" as const,
      perceivedDifficulty: "TOO_HARD" as const,
      reasons: ["PAIN_OR_DISCOMFORT" as const],
    }));
    render(
      createElement(WorkoutFeedbackForm, {
        onSave,
        exercises: [{ id: "rotation", name: "Rotation" }],
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Too hard" }));
    expect(onSave).not.toHaveBeenCalled();
    fireEvent.click(
      screen.getByRole("checkbox", { name: "Pain or discomfort" }),
    );
    fireEvent.click(
      screen.getByRole("checkbox", { name: "Technique difficulty" }),
    );
    fireEvent.click(screen.getByRole("checkbox", { name: "Rotation" }));
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "Left side" },
    });
    const submit = screen.getByRole("button", { name: "Save feedback" });
    submit.focus();
    fireEvent.click(submit);
    expect(onSave).toHaveBeenCalledWith({
      perceivedDifficulty: "TOO_HARD",
      reasons: ["PAIN_OR_DISCOMFORT", "TECHNIQUE_DIFFICULTY"],
      comment: "Left side",
      affectedExerciseIds: ["rotation"],
    });
    expect(screen.getByText(/Do not push through pain/)).toBeTruthy();
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Edit feedback" }),
    );
  });

  it("shows easy-only reasons, limits comments, and allows retry after failure", () => {
    const onSave = vi
      .fn()
      .mockImplementationOnce(() => {
        throw new Error("full");
      })
      .mockReturnValue(saved);
    render(createElement(WorkoutFeedbackForm, { onSave }));
    fireEvent.click(screen.getByRole("button", { name: "A little easy" }));
    expect(
      screen.queryByRole("checkbox", { name: "Muscle fatigue" }),
    ).toBeNull();
    expect(
      screen.getByRole("checkbox", { name: "Too much rest" }),
    ).toBeTruthy();
    expect(screen.getByRole("textbox").getAttribute("maxlength")).toBe("500");
    fireEvent.click(screen.getByRole("button", { name: "Save feedback" }));
    expect(screen.getByRole("alert").textContent).toContain("try again");
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(onSave).toHaveBeenCalledTimes(2);
  });

  it("allows editing saved feedback with an optional note", () => {
    const onSave = vi.fn(() => saved);
    render(
      createElement(WorkoutFeedbackForm, { onSave, initialFeedback: saved }),
    );
    expect(document.activeElement).toBe(document.body);
    fireEvent.click(screen.getByRole("button", { name: "Edit feedback" }));
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Just right" }),
    );
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "Good session" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save feedback" }));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        comment: "Good session",
        perceivedDifficulty: "JUST_RIGHT",
      }),
    );
  });
});
