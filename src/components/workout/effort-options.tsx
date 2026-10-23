"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";

import { DurationOptions } from "./duration-options";
import {
  buildDailyWorkout,
  applyBudgetedEffort,
  type DailyDuration,
} from "@/domain/workout/daily-duration";
import { ExerciseMedia } from "@/components/exercise-media";
import type { Exercise } from "@/domain/exercise/exercise.types";
import { buildWorkoutSequence } from "@/domain/workout/build-workout-sequence";
import {
  getSequenceDurationSeconds,
  intensityLevels,
  intensityPresets,
  type IntensityLevel,
} from "@/domain/workout/intensity";
import type { SessionSection, Workout } from "@/domain/workout/workout.types";
import { useUserPreferences } from "@/hooks/use-user-preferences";

type EffortOptionsProps = {
  workout: Workout;
  exercises: Exercise[];
  compositionExercises?: Exercise[];
  sections?: SessionSection[];
  selectedIntensity?: IntensityLevel;
  onIntensityChange?: (level: IntensityLevel) => void;
  getStartHref?: (level: IntensityLevel) => string;
  startLabel?: string;
  onStart?: () => void;
  startNotice?: string;
  secondaryActions?: ReactNode;
  reviewExerciseIds?: ReadonlySet<string>;
};

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes === 0) return `${remainingSeconds} sec`;
  if (remainingSeconds === 0) return `${minutes} min`;
  return `${minutes} min ${remainingSeconds} sec`;
}

function TimingValue({
  label,
  seconds,
  suffix,
}: {
  label: string;
  seconds: number;
  suffix?: string;
}) {
  return (
    <span className="plan-timing-value">
      <small>{label}</small>
      <strong>
        {seconds} sec{suffix}
      </strong>
    </span>
  );
}

export function WorkoutConfigurator({
  workout,
  exercises,
  compositionExercises = exercises,
  sections,
  selectedIntensity: controlledIntensity,
  onIntensityChange,
  getStartHref,
  startLabel,
  onStart,
  startNotice = "Intervals and rests advance automatically.",
  secondaryActions,
  reviewExerciseIds,
}: EffortOptionsProps) {
  const { preferredIntensity, ready, setPreferredIntensity } =
    useUserPreferences();
  const [selectedOverride, setSelectedOverride] =
    useState<IntensityLevel | null>(null);
  const selectedIntensity =
    controlledIntensity ??
    selectedOverride ??
    (ready ? preferredIntensity : "standard");
  const [dailyMinutes, setDailyMinutes] = useState<DailyDuration>(10);
  const isDailyWorkout = !getStartHref;
  const selectedPreset = intensityPresets[selectedIntensity];
  const composedWorkout = isDailyWorkout
    ? buildDailyWorkout(workout, dailyMinutes, selectedIntensity)
    : applyBudgetedEffort(workout, selectedIntensity, compositionExercises);

  function selectIntensity(level: IntensityLevel) {
    if (onIntensityChange) {
      onIntensityChange(level);
    } else {
      setSelectedOverride(level);
      setPreferredIntensity(level);
    }
  }

  const exerciseById = new Map(
    compositionExercises.map((exercise) => [exercise.id, exercise]),
  );
  const composedSections = sections?.map((section) =>
    section.type === "main"
      ? { ...section, items: composedWorkout.items }
      : section,
  );
  const overviewItems =
    composedSections?.flatMap((section) => section.items) ??
    composedWorkout.items;
  const selectedDuration = getSequenceDurationSeconds(
    buildWorkoutSequence(
      composedWorkout,
      compositionExercises,
      composedSections,
    ),
  );

  return (
    <div className="detail-layout">
      <section className="start-panel" aria-labelledby="ready-heading">
        <div className="start-panel__heading">
          <div>
            <h2 id="ready-heading">Train at your level.</h2>
          </div>
          <div className="selected-workout-duration" aria-live="polite">
            <span>Timed duration</span>
            <strong>{formatDuration(selectedDuration)}</strong>
          </div>
        </div>

        {isDailyWorkout && (
          <DurationOptions value={dailyMinutes} onChange={setDailyMinutes} />
        )}
        <div className="effort-options" aria-label="Workout effort">
          {intensityLevels.map((level) => {
            const preset = intensityPresets[level];
            const selected = level === selectedIntensity;
            return (
              <button
                aria-pressed={selected}
                className={`effort-option${selected ? " effort-option--selected" : ""}`}
                key={level}
                onClick={() => selectIntensity(level)}
                type="button"
              >
                <strong>{preset.label}</strong>
                <span>
                  {
                    {
                      light: "More recovery",
                      standard: "Balanced work and rest",
                      challenging: "More movement",
                    }[level]
                  }
                </span>
                <small>
                  {selected
                    ? "Selected"
                    : level === "standard"
                      ? "Recommended"
                      : "Select"}
                </small>
              </button>
            );
          })}
        </div>

        <footer className="workout-start-action">
          <Link
            className="button button--primary button--full start-workout-button"
            href={
              getStartHref?.(selectedIntensity) ??
              `/workouts/${workout.slug}/start?intensity=${selectedIntensity}&minutes=${dailyMinutes}`
            }
            onClick={onStart}
          >
            {startLabel ?? `Start workout · ${selectedPreset.label}`}
          </Link>
          <small>{startNotice}</small>
        </footer>

        <div className="effort-summary" aria-live="polite">
          <p>
            {
              "Effort changes the balance of movement and recovery within this session’s time budget."
            }
          </p>
        </div>
        {secondaryActions}
      </section>

      <section
        aria-labelledby="session-contents-heading"
        className="workout-overview"
      >
        <header className="workout-overview__heading">
          <span>
            <strong id="session-contents-heading">Exercise overview</strong>
            <small>Movements and interval timing</small>
          </span>
          <span>{overviewItems.length} intervals</span>
        </header>
        <ol className="workout-plan" aria-live="polite">
          {overviewItems.map((item, index) => {
            const exercise = exerciseById.get(item.exerciseId);
            if (!exercise) return null;

            const workSeconds = item.prescription.durationSeconds;
            const setRestSeconds = item.restAfterSetSeconds;
            const exerciseRestSeconds = item.restAfterExerciseSeconds;

            return (
              <li key={item.id}>
                <span className="plan-index">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div className="plan-media">
                  <ExerciseMedia exercise={exercise} compact />
                </div>
                <div className="plan-content">
                  <div className="plan-copy">
                    {reviewExerciseIds?.has(item.exerciseId) && (
                      <span className="pain-review-flag">
                        Review before training
                      </span>
                    )}
                    <Link href={`/exercises/${exercise.slug}`}>
                      {exercise.name}
                    </Link>
                    <p>{exercise.shortDescription}</p>
                  </div>
                  <div className="plan-timing">
                    <span className="plan-timing-value">
                      <small>Rounds</small>
                      <strong>{item.sets}</strong>
                      <span>
                        {isDailyWorkout ? "Guided interval" : "Unchanged"}
                      </span>
                    </span>
                    <TimingValue
                      label="Work"
                      seconds={workSeconds}
                      suffix={item.prescription.perSide ? " / side" : ""}
                    />
                    {setRestSeconds !== undefined && (
                      <TimingValue
                        label="Between sets"
                        seconds={setRestSeconds}
                      />
                    )}
                    {exerciseRestSeconds !== undefined &&
                      index < overviewItems.length - 1 && (
                        <TimingValue
                          label="Before next"
                          seconds={exerciseRestSeconds}
                        />
                      )}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}
