"use client";

import { useEffect, useId, useRef, useState } from "react";

import type {
  PerceivedDifficulty,
  FeedbackReason,
  SaveFeedbackEventInput,
  WorkoutFeedbackEvent,
} from "@/services/persistence/workout-activity-repository";

export const difficultyLabels = {
  TOO_EASY: "Too easy",
  SLIGHTLY_EASY: "A little easy",
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

type Difficulty = PerceivedDifficulty;
type Reason = FeedbackReason;
export type WorkoutFeedbackAnswer = Omit<
  SaveFeedbackEventInput,
  "completionId"
>;

const hardReasons: Reason[] = [
  "OVERALL_INTENSITY",
  "WORKOUT_TOO_LONG",
  "MUSCLE_FATIGUE",
  "TECHNIQUE_DIFFICULTY",
  "INSUFFICIENT_RECOVERY",
  "PAIN_OR_DISCOMFORT",
  "OTHER",
];
const easyReasons: Reason[] = [
  "OVERALL_INTENSITY",
  "EXERCISES_TOO_SIMPLE",
  "WORKOUT_TOO_SHORT",
  "TOO_MUCH_REST",
  "OTHER",
];

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
  exercises = [],
  onSave,
}: {
  initialFeedback?: WorkoutFeedbackEvent | null;
  exercises?: Array<{ id: string; name: string }>;
  onSave: (answer: WorkoutFeedbackAnswer) => WorkoutFeedbackEvent | null;
}) {
  const id = useId();
  const [difficulty, setDifficulty] = useState<Difficulty | null>(
    initialFeedback?.perceivedDifficulty ?? null,
  );
  const [reasons, setReasons] = useState<Reason[]>(
    initialFeedback?.reasons ?? [],
  );
  const [comment, setComment] = useState(initialFeedback?.comment ?? "");
  const [affectedExerciseIds, setAffectedExerciseIds] = useState<string[]>(
    initialFeedback?.affectedExerciseIds ?? [],
  );
  const [saved, setSaved] = useState(initialFeedback ?? null);
  const [editing, setEditing] = useState(!initialFeedback);
  const previousEditing = useRef(editing);
  const feedbackFocusTarget = useRef<HTMLButtonElement>(null);
  const [error, setError] = useState("");
  const difficult = difficulty === "HARD" || difficulty === "TOO_HARD";
  const pain = reasons.includes("PAIN_OR_DISCOMFORT");

  useEffect(() => {
    if (previousEditing.current !== editing) {
      feedbackFocusTarget.current?.focus();
      previousEditing.current = editing;
    }
  }, [editing]);

  function save(value: Difficulty, selectedReasons = reasons) {
    try {
      const result = onSave({
        perceivedDifficulty: value,
        reasons: value === "JUST_RIGHT" ? [] : selectedReasons,
        comment: comment.trim(),
        affectedExerciseIds: selectedReasons.some(
          (reason) =>
            reason === "PAIN_OR_DISCOMFORT" ||
            reason === "TECHNIQUE_DIFFICULTY",
        )
          ? affectedExerciseIds
          : [],
      });
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
        <form
          className="feedback-form"
          onSubmit={(event) => {
            event.preventDefault();
            if (difficulty) save(difficulty);
          }}
        >
          <fieldset className="workout-check-in">
            <legend className="sr-only">How did this workout feel?</legend>
            <div className="workout-check-in__options">
              {(Object.keys(difficultyLabels) as Difficulty[]).map((value) => (
                <button
                  ref={
                    difficulty === value ||
                    (!difficulty && value === "TOO_EASY")
                      ? feedbackFocusTarget
                      : undefined
                  }
                  aria-pressed={difficulty === value}
                  className="workout-check-in__option"
                  key={value}
                  type="button"
                  onClick={() => {
                    setDifficulty(value);
                    setReasons([]);
                    setAffectedExerciseIds([]);
                    if (value === "JUST_RIGHT") save(value, []);
                  }}
                >
                  <strong>{difficultyLabels[value]}</strong>
                </button>
              ))}
            </div>
          </fieldset>
          {difficulty && difficulty !== "JUST_RIGHT" && (
            <>
              <fieldset className="feedback-follow-up">
                <legend>
                  {difficult
                    ? "What made it difficult?"
                    : "What felt too easy?"}
                </legend>
                {(difficult ? hardReasons : easyReasons).map((reason) => (
                  <label key={reason}>
                    <input
                      type="checkbox"
                      checked={reasons.includes(reason)}
                      onChange={(event) =>
                        setReasons((current) =>
                          event.target.checked
                            ? [...current, reason]
                            : current.filter((item) => item !== reason),
                        )
                      }
                    />
                    {feedbackReasonLabels[reason]}
                  </label>
                ))}
              </fieldset>
              {(pain || reasons.includes("TECHNIQUE_DIFFICULTY")) &&
                exercises.length > 0 && (
                  <fieldset className="feedback-follow-up">
                    <legend>Which movements? (optional)</legend>
                    {exercises.map((exercise) => (
                      <label key={exercise.id}>
                        <input
                          type="checkbox"
                          checked={affectedExerciseIds.includes(exercise.id)}
                          onChange={(event) =>
                            setAffectedExerciseIds((current) =>
                              event.target.checked
                                ? [...current, exercise.id]
                                : current.filter(
                                    (item) => item !== exercise.id,
                                  ),
                            )
                          }
                        />
                        {exercise.name}
                      </label>
                    ))}
                  </fieldset>
                )}
            </>
          )}
          {difficulty && (
            <>
              <label className="feedback-comment" htmlFor={`${id}-comment`}>
                Anything else? (optional)
                <textarea
                  className="plan-input"
                  id={`${id}-comment`}
                  maxLength={500}
                  rows={3}
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                />
              </label>
              <button
                className="button button--primary button--full"
                type="submit"
              >
                {error ? "Try again" : "Save feedback"}
              </button>
            </>
          )}
          {error && <p role="alert">{error}</p>}
        </form>
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
      {(pain ||
        saved?.reasons?.includes("PAIN_OR_DISCOMFORT") ||
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
