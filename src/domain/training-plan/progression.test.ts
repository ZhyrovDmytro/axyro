import { describe, expect, it } from "vitest";

import { exercises } from "@/content/exercises";
import { workouts } from "@/content/workouts";
import { calculateSessionDuration } from "@/domain/workout/session-duration";

import { generateSessionPrescription } from "./generate-training-plan";
import {
  calculateEffectiveWorkSeconds,
  getProgressionPhase,
  getProgressionPrescription,
} from "./progression";

const source = workouts.find(
  (workout) => workout.id === "padel-core-rotation",
)!;
const baseline = generateSessionPrescription(source, 20).workout;

function prescription(week: number) {
  return getProgressionPrescription({
    week,
    baseline,
    exerciseCatalog: exercises,
    targetDurationSeconds: 20 * 60,
  });
}

describe("60-day progression policy", () => {
  it("maps the scheduled weeks to explicit phases", () => {
    expect([1, 2, 3, 4, 5, 6, 7, 8, 9].map(getProgressionPhase)).toEqual([
      "foundation",
      "foundation",
      "build",
      "build",
      "build",
      "peak",
      "peak",
      "consolidate",
      "consolidate",
    ]);
  });

  it("keeps foundation at baseline and progresses stimulus conservatively", () => {
    const foundation = prescription(1);
    const build = prescription(3);
    const peak = prescription(6);
    const consolidate = prescription(8);
    const foundationWork = calculateEffectiveWorkSeconds(foundation.workout);
    const buildWork = calculateEffectiveWorkSeconds(build.workout);
    const peakWork = calculateEffectiveWorkSeconds(peak.workout);
    const consolidateWork = calculateEffectiveWorkSeconds(consolidate.workout);

    expect(foundation.workout).toEqual(baseline);
    expect(foundation.progression.changes).toEqual([]);
    expect(buildWork).toBeGreaterThan(foundationWork);
    expect(peakWork).toBeGreaterThanOrEqual(buildWork);
    expect(consolidateWork).toBeLessThan(peakWork);
    expect(buildWork / foundationWork).toBeLessThanOrEqual(1.1);
    expect(peakWork / foundationWork).toBeLessThanOrEqual(1.2);
    expect(consolidateWork / peakWork).toBeGreaterThanOrEqual(0.75);
    expect(consolidateWork / peakWork).toBeLessThanOrEqual(0.85);
  });

  it.each([1, 2, 3, 4, 5, 6, 7, 8, 9])(
    "keeps week %i within the selected duration tolerance",
    (week) => {
      const duration = calculateSessionDuration(prescription(week).workout);
      expect(Math.abs(duration - 20 * 60)).toBeLessThanOrEqual(2 * 60);
    },
  );

  it("respects authored work and round bounds", () => {
    for (const week of [1, 2, 3, 4, 5, 6, 7, 8, 9]) {
      for (const item of prescription(week).workout.items) {
        expect(item.sets).toBeGreaterThanOrEqual(item.minSets ?? item.sets);
        expect(item.sets).toBeLessThanOrEqual(item.maxSets ?? item.sets);
        expect(item.prescription.durationSeconds).toBeGreaterThanOrEqual(
          item.minWorkSeconds ?? item.prescription.durationSeconds,
        );
        expect(item.prescription.durationSeconds).toBeLessThanOrEqual(
          item.maxWorkSeconds ?? item.prescription.durationSeconds,
        );
      }
    }
  });

  it("does not extend explosive work intervals", () => {
    const explosiveSource = workouts.find(
      (workout) => workout.id === "padel-first-step-power",
    )!;
    const explosiveBaseline = generateSessionPrescription(
      explosiveSource,
      10,
    ).workout;
    const explosiveItems = explosiveBaseline.items.filter((item) =>
      exercises
        .find((exercise) => exercise.id === item.exerciseId)
        ?.qualities.includes("explosiveness"),
    );
    expect(explosiveItems.length).toBeGreaterThan(0);
    for (const week of [3, 6]) {
      const progressed = getProgressionPrescription({
        week,
        baseline: explosiveBaseline,
        exerciseCatalog: exercises,
        targetDurationSeconds: 600,
      });
      for (const baselineItem of explosiveItems) {
        const item = progressed.workout.items.find(
          (candidate) => candidate.exerciseId === baselineItem.exerciseId,
        );
        if (item)
          expect(item.prescription.durationSeconds).toBeLessThanOrEqual(
            baselineItem.prescription.durationSeconds,
          );
      }
    }
  });

  it("returns identical prescriptions for identical inputs", () => {
    expect(prescription(3)).toEqual(prescription(3));
  });
});
