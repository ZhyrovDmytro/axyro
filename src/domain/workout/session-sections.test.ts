import { describe, expect, it } from "vitest";

import { exercises } from "@/content/exercises";
import { generateTrainingPlan } from "@/domain/training-plan/generate-training-plan";
import type { AthleteProfile } from "@/domain/training-plan/training-plan.types";

import {
  calculateSessionSectionDuration,
  calculateSessionSectionsDuration,
  flattenSessionSections,
  getSessionSection,
  getSessionSectionDurationBudget,
  validateGeneratedSessionSections,
} from "./session-sections";

const profile: AthleteProfile = {
  sport: "padel",
  experience: "intermediate",
  sessionsPerWeek: 3,
  sessionDurationMinutes: 20,
  preferredDays: ["monday", "wednesday", "friday"],
  equipment: ["bodyweight", "one-dumbbell", "two-dumbbells"],
  goals: ["power", "injury-resilience"],
  developmentAreas: [],
  padelLimitations: ["weak-core-rotation", "weak-overhead-control"],
  painAreas: [],
  matches: [],
};

describe("generated session sections", () => {
  it.each([10, 15, 20, 30])(
    "builds warm-up, main and cooldown inside a %i-minute target",
    (sessionMinutes) => {
      const plan = generateTrainingPlan(
        { ...profile, sessionDurationMinutes: sessionMinutes },
        new Date(2026, 8, 28, 12),
      );
      const budget = getSessionSectionDurationBudget(sessionMinutes * 60);

      for (const session of plan.sessions) {
        expect(session.sections.map((section) => section.type)).toEqual([
          "warmup",
          "main",
          "cooldown",
        ]);
        expect(
          calculateSessionSectionDuration(session.sections[0]),
        ).toBeGreaterThanOrEqual(budget.warmupMinimum);
        expect(
          calculateSessionSectionDuration(session.sections[2]),
        ).toBeGreaterThanOrEqual(budget.cooldownMinimum);
        expect(session.sections[1].items.length).toBeGreaterThan(0);
        expect(calculateSessionSectionsDuration(session.sections)).toBe(
          session.estimatedDurationSeconds,
        );
        expect(
          session.sections.reduce(
            (total, section) =>
              total + calculateSessionSectionDuration(section),
            0,
          ),
        ).toBe(session.estimatedDurationSeconds);
        expect(
          validateGeneratedSessionSections({
            sections: session.sections,
            targetDurationSeconds: session.targetDurationSeconds,
            exerciseCatalog: exercises,
          }),
        ).toEqual([]);
        const tolerance = sessionMinutes <= 15 ? 60 : 120;
        expect(Math.abs(session.durationDeltaSeconds)).toBeLessThanOrEqual(
          tolerance,
        );
      }
    },
  );

  it("selects preparation relevant to the assembled main exercises", () => {
    const plan = generateTrainingPlan(
      {
        ...profile,
        sessionsPerWeek: 4,
        preferredDays: ["monday", "wednesday", "friday", "sunday"],
      },
      new Date(2026, 8, 28, 12),
    );
    const exerciseById = new Map(
      exercises.map((exercise) => [exercise.id, exercise]),
    );
    for (const session of plan.sessions.slice(0, 4)) {
      const mainQualities = new Set(
        session.workout.items.flatMap(
          (item) => exerciseById.get(item.exerciseId)?.qualities ?? [],
        ),
      );
      const warmups =
        getSessionSection(session.sections, "warmup")?.items ?? [];
      expect(warmups.length).toBeGreaterThan(0);
      expect(
        warmups.some((item) =>
          (exerciseById.get(item.exerciseId)?.preparationFor ?? []).some(
            (quality) => mainQualities.has(quality),
          ),
        ),
      ).toBe(true);
    }
  });

  it("keeps support sections deterministic and free of excluded body areas", () => {
    const first = generateTrainingPlan(
      { ...profile, painAreas: ["shoulder"] },
      new Date(2026, 8, 28, 12),
    );
    const second = generateTrainingPlan(
      { ...profile, painAreas: ["shoulder"] },
      new Date(2026, 8, 28, 12),
    );
    const exerciseById = new Map(
      exercises.map((exercise) => [exercise.id, exercise]),
    );

    expect(first.sessions.map((session) => session.sections)).toEqual(
      second.sessions.map((session) => session.sections),
    );
    expect(
      first.sessions.every((session) =>
        flattenSessionSections(session.sections).every((item) =>
          exerciseById
            .get(item.exerciseId)
            ?.bodyAreas.every(
              (area) => area !== "shoulders" && area !== "arms",
            ),
        ),
      ),
    ).toBe(true);
  });

  it("keeps expansion in the main section rather than support sections", () => {
    const shortPlan = generateTrainingPlan(
      { ...profile, sessionDurationMinutes: 15 },
      new Date(2026, 8, 28, 12),
    );
    const longPlan = generateTrainingPlan(
      { ...profile, sessionDurationMinutes: 30 },
      new Date(2026, 8, 28, 12),
    );
    const short = shortPlan.sessions[0];
    const long = longPlan.sessions[0];
    const supportGrowth =
      calculateSessionSectionDuration(long.sections[0]) +
      calculateSessionSectionDuration(long.sections[2]) -
      calculateSessionSectionDuration(short.sections[0]) -
      calculateSessionSectionDuration(short.sections[2]);
    const mainGrowth =
      calculateSessionSectionDuration(long.sections[1]) -
      calculateSessionSectionDuration(short.sections[1]);

    expect(mainGrowth).toBeGreaterThan(supportGrowth);
  });

  it("assigns boundary recovery to the section that prescribed it", () => {
    const plan = generateTrainingPlan(profile, new Date(2026, 8, 28, 12));
    const session = plan.sessions[0];

    expect(
      session.sections.reduce(
        (total, section) => total + calculateSessionSectionDuration(section),
        0,
      ),
    ).toBe(calculateSessionSectionsDuration(session.sections));
  });

  it("keeps support prescriptions out of 60-day progressive overload", () => {
    const plan = generateTrainingPlan(profile, new Date(2026, 8, 28, 12));
    const sourceWorkoutId = plan.sessions[0].sourceWorkoutId;
    const matching = plan.sessions.filter(
      (session) => session.sourceWorkoutId === sourceWorkoutId,
    );
    const supportDurationsByWeek = matching.map((session) =>
      session.sections
        .filter((section) => section.type !== "main")
        .map((section) => calculateSessionSectionDuration(section)),
    );

    for (const supportDurations of supportDurationsByWeek.slice(1)) {
      expect(supportDurations).toEqual(supportDurationsByWeek[0]);
    }
  });
});

it.each([5, 10, 20])(
  "keeps main exercises unique and separate from support in a %i-minute session",
  (minutes) => {
    const plan = generateTrainingPlan(
      { ...profile, sessionDurationMinutes: minutes },
      new Date(2026, 8, 28, 12),
    );
    for (const session of plan.sessions) {
      const mainIds = session.workout.items.map((item) => item.exerciseId);
      expect(mainIds, session.id).toEqual([...new Set(mainIds)]);
      const support = session.sections
        .filter((section) => section.type !== "main")
        .flatMap((section) => section.items);
      expect(support.every((item) => !mainIds.includes(item.exerciseId))).toBe(
        true,
      );
    }
  },
);

it("allows warm-up and cooldown to reuse the same compatible exercise", () => {
  const plan = generateTrainingPlan(
    { ...profile, painAreas: ["knee"] },
    new Date(2026, 8, 28, 12),
  );
  for (const session of plan.sessions) {
    expect(session.sections[0].items[0].exerciseId).toBe(
      session.sections[2].items[0].exerciseId,
    );
    expect(
      validateGeneratedSessionSections({
        sections: session.sections,
        targetDurationSeconds: session.targetDurationSeconds,
        exerciseCatalog: exercises,
      }),
    ).toEqual([]);
  }
});
