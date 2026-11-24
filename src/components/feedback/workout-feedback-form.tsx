"use client";

import { useEffect, useId, useRef, useState } from "react";

import type {
  PerceivedDifficulty,
  SaveFeedbackEventInput,
  WorkoutFeedbackEvent,
} from "@/services/persistence/workout-activity-repository";

export const difficultyLabels = {
  TOO_EASY: "Too easy",
  SLIGHTLY_EASY: "Easy",
  JUST_RIGHT: "Just right",
  HARD: "Hard",
  TOO_HARD: "Too hard",
} as const;

export const feedbackReasonLabels = {
  OVERALL_INTENSITY: "Overall intensity",
  WORKOUT_TOO_LONG: "Workout too long",
  MUSCLE_FATIGUE: "Muscle fatigue",
  TECHNIQUE_DIFFICULTY: "Technique difficulty",
  INSUFFICIENT_RECOVERY: "Not enough recovery",
  PAIN_OR_DISCOMFORT: "Pain or discomfort",
  EXERCISES_TOO_SIMPLE: "Exercises too simple",
  WORKOUT_TOO_SHORT: "Workout too short",
  TOO_MUCH_REST: "Too much rest",
  OTHER: "Other",
} as const;

const difficultyChoices = ["SLIGHTLY_EASY", "JUST_RIGHT", "HARD"] as const;

export type WorkoutFeedbackAnswer = Omit<
  SaveFeedbackEventInput,
  "completionId"
>;

export function feedbackDifficultyLabel(event: WorkoutFeedbackEvent) {
  return event.perceivedDifficulty
    ? difficultyLabels[event.perceivedDifficulty]
    : event.rating === "pain-or-discomfort"
      ? "Pain or discomfort"
      : event.rating === "too-easy"
        ? "Too easy"
        : event.rating === "too-hard"
          ? "Too hard"
          : "Just right";
}

export function WorkoutFeedbackForm({
  initialFeedback,
  onSave,
}: {
  initialFeedback?: WorkoutFeedbackEvent | null;
  onSave: (answer: WorkoutFeedbackAnswer) => WorkoutFeedbackEvent | null;
}) {
  const id = useId();
  const [saved, setSaved] = useState(initialFeedback ?? null);
  const [editing, setEditing] = useState(!initialFeedback);
  const previousEditing = useRef(editing);
  const feedbackFocusTarget = useRef<HTMLButtonElement>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (previousEditing.current !== editing) {
      feedbackFocusTarget.current?.focus();
      previousEditing.current = editing;
    }
  }, [editing]);

  function save(value: PerceivedDifficulty) {
    try {
      const result = onSave({ perceivedDifficulty: value });
      if (!result) throw new Error("Feedback could not be saved.");
      setSaved(result);
      setEditing(false);
      setError("");
    } catch {
      setError("Your feedback could not be saved. Please try again.");
    }
  }

  return (
    <section
      className="completion-reflection"
      aria-labelledby={`${id}-heading`}
    >
      <header>
        <h2 id={`${id}-heading`}>How did this workout feel?</h2>
      </header>
      {editing ? (
        <>
          <fieldset className="workout-check-in">
            <legend className="sr-only">Workout difficulty</legend>
            <div className="workout-check-in__options">
              {difficultyChoices.map((value, index) => (
                <button
                  ref={index === 0 ? feedbackFocusTarget : undefined}
                  className="workout-check-in__option"
                  key={value}
                  type="button"
                  onClick={() => save(value)}
                >
                  <strong>{difficultyLabels[value]}</strong>
                </button>
              ))}
            </div>
          </fieldset>
          {error && <p role="alert">{error}</p>}
        </>
      ) : (
        saved && (
          <div className="feedback-result">
            <h3>{feedbackDifficultyLabel(saved)}</h3>
            {(saved.reasons?.length ?? 0) > 0 && (
              <p>
                {saved.reasons
                  ?.map((reason) => feedbackReasonLabels[reason])
                  .join(" · ")}
              </p>
            )}
            {saved.comment && <p>{saved.comment}</p>}
            <p role="status">
              Saved. Your feedback stays with this completed session.
            </p>
            <button
              ref={feedbackFocusTarget}
              className="button button--secondary button--small"
              type="button"
              onClick={() => setEditing(true)}
            >
              Edit feedback
            </button>
          </div>
        )
      )}
      {(saved?.reasons?.includes("PAIN_OR_DISCOMFORT") ||
        saved?.rating === "pain-or-discomfort") && (
        <p className="workout-check-in__status" role="status">
          Do not push through pain. Stop movements that cause discomfort and
          seek qualified advice if it persists. We’ll avoid increasing those
          movements automatically.
        </p>
      )}
    </section>
  );
}
