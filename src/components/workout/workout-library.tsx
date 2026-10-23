"use client";

import { useMemo, useState } from "react";

import { WorkoutCard } from "@/components/workout-card";
import type { Workout } from "@/domain/workout/workout.types";
import { getWorkoutExercises } from "@/lib/catalog";

type Category =
  | "all"
  | "quick"
  | "full"
  | "lower-body"
  | "core"
  | "shoulders"
  | "padel"
  | "no-equipment";

const categories: Array<{ id: Category; label: string; group?: string }> = [
  { id: "all", label: "All workouts" },
  { id: "quick", label: "Quick sessions" },
  { id: "full", label: "Full workouts" },
  { id: "lower-body", label: "Lower body", group: "By body area" },
  { id: "core", label: "Core", group: "By body area" },
  { id: "shoulders", label: "Shoulders", group: "By body area" },
  { id: "padel", label: "Padel-specific" },
  { id: "no-equipment", label: "No equipment" },
];

function belongsToCategory(workout: Workout, category: Category) {
  const exercises = getWorkoutExercises(workout);
  const areas = new Set(exercises.flatMap((exercise) => exercise.bodyAreas));
  switch (category) {
    case "all":
      return true;
    case "quick":
      return workout.estimatedMinutes <= 10;
    case "full":
      return workout.estimatedMinutes > 10;
    case "lower-body":
      return areas.has("legs") || areas.has("glutes");
    case "core":
      return areas.has("core");
    case "shoulders":
      return areas.has("shoulders");
    case "padel":
      return workout.name.toLocaleLowerCase().includes("padel");
    case "no-equipment":
      return exercises.every((exercise) => exercise.equipment.includes("none"));
  }
}

export function WorkoutLibrary({
  workouts,
  showCategories = true,
}: {
  workouts: Workout[];
  showCategories?: boolean;
}) {
  const [category, setCategory] = useState<Category>("all");
  const visibleWorkouts = useMemo(
    () => workouts.filter((workout) => belongsToCategory(workout, category)),
    [category, workouts],
  );

  return (
    <section aria-labelledby="all-workouts-heading">
      <div className="section-heading section-heading--compact">
        <h2 id="all-workouts-heading">
          {showCategories ? "Browse by focus." : "Workouts"}
        </h2>
        <span className="result-count" aria-live="polite">
          {visibleWorkouts.length} session
          {visibleWorkouts.length === 1 ? "" : "s"}
        </span>
      </div>
      {showCategories && (
        <div className="workout-category-row" aria-label="Workout categories">
          {categories.map((option) => (
            <button
              aria-pressed={category === option.id}
              key={option.id}
              onClick={() => setCategory(option.id)}
              type="button"
            >
              {option.group && <small>{option.group}</small>}
              <span>{option.label}</span>
            </button>
          ))}
        </div>
      )}
      {visibleWorkouts.length ? (
        <div className="workout-grid">
          {visibleWorkouts.map((workout, index) => (
            <WorkoutCard
              workout={workout}
              featured={index === 0}
              key={workout.id}
            />
          ))}
        </div>
      ) : (
        <div className="empty-state" role="status">
          <h2>More sessions are coming.</h2>
          <p>
            This category is part of the catalog structure, but it does not have
            a published workout yet.
          </p>
          <button
            className="text-button"
            onClick={() => setCategory("all")}
            type="button"
          >
            Show all workouts
          </button>
        </div>
      )}
    </section>
  );
}
