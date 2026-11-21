import { describe, expect, it } from "vitest";
import { addDays } from "./date";
import { representativeAthleteProfiles } from "./evaluation-profiles";
import { generateTrainingPlan } from "./generate-training-plan";
import {
  planAvoidedExercisesOnDate,
  planProfileOnDate,
  proposePlanAdjustment,
  proposePlanAdjustments,
  type PlanAdjustment,
} from "./plan-adjustment";
import { trainingPlanSchema } from "./training-plan.schema";
import { exercises } from "@/content/exercises";

const today = "2026-10-12";
function fixture() {
  return generateTrainingPlan(
    {
      ...representativeAthleteProfiles[2],
      padelLimitations: [],
      equipment: ["bodyweight", "two-dumbbells"],
      matches: [{ date: "2026-10-18", importance: "important" }],
    },
    new Date(2026, 8, 28, 12),
  );
}
const propose = (
  plan: ReturnType<typeof fixture>,
  request: PlanAdjustment,
  activeSessionId?: string,
) =>
  proposePlanAdjustment({
    plan,
    request,
    today,
    activities: [],
    revisionId: "test",
    activeSessionId,
  });

describe("active block adjustments", () => {
  it("reschedules only the selected week and preserves workout identity, history and recovery dates", () => {
    const plan = fixture();
    plan.sessions[0].status = "completed";
    const active = plan.sessions.find(
      ({ scheduledDate }) => scheduledDate >= today,
    )!;
    const update = propose(
      plan,
      { kind: "schedule", days: ["tuesday", "thursday"], scope: "week" },
      active.id,
    );
    expect(update.plan).toMatchObject({
      startDate: plan.startDate,
      endDate: plan.endDate,
      generatedAt: plan.generatedAt,
      profile: plan.profile,
      games: plan.games,
    });
    expect(update.plan.sessions).toContain(active);
    expect(update.plan.sessions).toContain(plan.sessions[0]);
    for (const session of plan.sessions.filter(
      (session) => session.scheduledDate > update.end,
    ))
      expect(update.plan.sessions).toContain(session);
    const moved = update.changes.find(({ action }) => action === "Move")!;
    expect(moved).toBeDefined();
    expect(
      update.plan.sessions.find(({ id }) => id === moved.id)?.workout,
    ).toEqual(plan.sessions.find(({ id }) => id === moved.id)?.workout);
    expect(update.changes.filter(({ action }) => action === "Add")).toEqual([]);
  });

  it("keeps dates and stores temporary duration separately from saved defaults", () => {
    const plan = fixture();
    const update = propose(plan, {
      kind: "duration",
      minutes: 10,
      scope: "week",
    });
    expect(update.changes.length).toBeGreaterThan(0);
    const saved = trainingPlanSchema.parse(update.plan);
    expect(saved.profile.sessionDurationMinutes).toBe(20);
    expect(planProfileOnDate(saved, today).sessionDurationMinutes).toBe(10);
    expect(
      planProfileOnDate(saved, addDays(update.end, 1)).sessionDurationMinutes,
    ).toBe(20);
    for (const change of update.changes) {
      const after = saved.sessions.find(({ id }) => id === change.id)!;
      expect(after.scheduledDate).toBe(
        plan.sessions.find(({ id }) => id === change.id)!.scheduledDate,
      );
      expect(after.targetDurationSeconds).toBe(600);
      expect(Math.abs(after.durationDeltaSeconds)).toBeLessThanOrEqual(60);
    }
  });

  it("keeps compatible sessions intact and restores default equipment after the temporary window", () => {
    const plan = fixture();
    const weighted = plan.sessions.find(
      (session) =>
        session.scheduledDate >= today &&
        session.workout.items.some(({ exerciseId }) =>
          exercises
            .find(({ id }) => id === exerciseId)
            ?.equipment.some((item) => item !== "none"),
        ),
    )!;
    expect(weighted).toBeDefined();
    const update = proposePlanAdjustment({
      plan,
      request: { kind: "equipment", equipment: ["bodyweight"], scope: "week" },
      today: weighted.scheduledDate,
      activities: [],
      revisionId: "test",
    });
    expect(update.changes.length).toBeGreaterThan(0);
    for (const change of update.changes) {
      const session = update.plan.sessions.find(({ id }) => id === change.id)!;
      expect(
        session.sections
          .flatMap(({ items }) => items)
          .every(({ exerciseId }) =>
            exercises
              .find(({ id }) => id === exerciseId)
              ?.equipment.every((value) => value === "none"),
          ),
      ).toBe(true);
    }
    expect(planProfileOnDate(update.plan, update.start).equipment).toEqual([
      "bodyweight",
    ]);
    expect(
      planProfileOnDate(update.plan, addDays(update.end, 1)).equipment,
    ).toEqual(plan.profile.equipment);
  });

  it("requires consent before removing incompatible workouts and preserves protected sessions", () => {
    const plan = fixture();
    const past = plan.sessions[0];
    past.status = "completed";
    const active = plan.sessions.find(
      ({ scheduledDate }) => scheduledDate === today,
    )!;
    const requests: PlanAdjustment[] = [
      {
        kind: "comfort",
        areas: ["neck-upper-back", "lower-back", "hip-groin", "shoulder"],
      },
      { kind: "focus", areas: ["core-lower-back"], priorities: [] },
    ];
    const input = {
      plan,
      today,
      requests,
      activities: [],
      activeSessionId: active.id,
      revisionId: "test",
    };
    const blocked = proposePlanAdjustments(input);
    expect(blocked.canApply).toBe(false);
    expect(blocked.conflicts.length).toBeGreaterThan(0);
    expect(
      blocked.conflicts.every(
        ({ date, action }) => date > today && action === "Remove workout",
      ),
    ).toBe(true);
    expect(blocked.plan.sessions).toHaveLength(plan.sessions.length);

    const keys = blocked.conflicts.map(({ key }) => key);
    expect(
      proposePlanAdjustments({ ...input, resolvedConflicts: keys.slice(1) })
        .canApply,
    ).toBe(false);
    const reviewed = proposePlanAdjustments({
      ...input,
      resolvedConflicts: keys,
    });
    expect(reviewed.conflicts).toEqual([]);
    expect(reviewed.canApply).toBe(true);
    expect(
      reviewed.changes.filter(({ action }) => action === "Remove"),
    ).toHaveLength(keys.length);
    expect(reviewed.plan.profile.painAreas).toEqual([
      "neck-upper-back",
      "lower-back",
      "hip-groin",
      "shoulder",
    ]);
    expect(reviewed.plan.sessions).toContain(past);
    expect(reviewed.plan.sessions).toContain(active);
    expect(reviewed.plan.games).toEqual(plan.games);
    expect(plan.sessions.length - reviewed.plan.sessions.length).toBe(
      keys.length,
    );
  });

  it("leaves an incompatible new training day open only with consent", () => {
    const plan = fixture();
    plan.sessions = plan.sessions.filter(
      ({ scheduledDate }) => scheduledDate < today,
    );
    plan.profile.painAreas = [
      "neck-upper-back",
      "lower-back",
      "hip-groin",
      "shoulder",
    ];
    const request: PlanAdjustment = {
      kind: "schedule",
      days: ["tuesday"],
      scope: "ongoing",
    };
    const input = {
      plan,
      today,
      request,
      activities: [],
      revisionId: "test",
    };
    const blocked = proposePlanAdjustment(input);
    expect(blocked.canApply).toBe(false);
    expect(blocked.conflicts.length).toBeGreaterThan(0);
    expect(
      blocked.conflicts.every(({ action }) => action === "Leave day open"),
    ).toBe(true);

    const resolved = proposePlanAdjustment({
      ...input,
      resolvedConflicts: blocked.conflicts.map(({ key }) => key),
    });
    expect(resolved.canApply).toBe(true);
    expect(resolved.plan.profile.preferredDays).toEqual(["tuesday"]);
    expect(resolved.plan.sessions).toEqual(plan.sessions);
  });

  it("keeps a lighter week in budget and does not compound a repeated reduction", () => {
    const plan = fixture();
    const update = propose(plan, { kind: "lighter" });
    expect(update.changes.length).toBeGreaterThan(0);
    for (const change of update.changes) {
      expect(
        update.plan.sessions.find(({ id }) => id === change.id)
          ?.estimatedDurationSeconds,
      ).toBe(
        plan.sessions.find(({ id }) => id === change.id)
          ?.estimatedDurationSeconds,
      );
    }
    expect(propose(update.plan, { kind: "lighter" }).changes).toEqual([]);
  });

  it("makes the next week harder within the existing time, work and recovery bounds", () => {
    const plan = fixture();
    const active = plan.sessions.find(
      ({ scheduledDate }) => scheduledDate === today,
    )!;
    const update = propose(plan, { kind: "harder" }, active.id);
    const saved = trainingPlanSchema.parse(update.plan);

    expect(update.changes.length).toBeGreaterThan(0);
    expect(update.end).toBe(addDays(today, 6));
    expect(update.plan.sessions).toContain(active);
    expect(saved.profile).toEqual(trainingPlanSchema.parse(plan).profile);
    expect(saved.adjustmentWindows).toContainEqual(
      expect.objectContaining({
        kind: "harder",
        start: today,
        end: update.end,
      }),
    );
    for (const change of update.changes) {
      const original = plan.sessions.find(({ id }) => id === change.id)!;
      const adjusted = saved.sessions.find(({ id }) => id === change.id)!;
      expect(adjusted.estimatedDurationSeconds).toBe(
        original.estimatedDurationSeconds,
      );
      expect(
        adjusted.workout.items.some(
          (item, index) =>
            item.prescription.durationSeconds >
            original.workout.items[index].prescription.durationSeconds,
        ),
      ).toBe(true);
      adjusted.workout.items.forEach((item, index) => {
        const previous = original.workout.items[index];
        const exercise = exercises.find(({ id }) => id === item.exerciseId)!;
        expect(item.exerciseId).toBe(previous.exerciseId);
        if (
          exercise.qualities.includes("explosiveness") ||
          exercise.tempo.mode === "explosive_reset"
        ) {
          expect(item).toEqual(previous);
        }
        if (
          item.prescription.durationSeconds >
          previous.prescription.durationSeconds
        ) {
          expect(item.prescription.durationSeconds).toBeLessThanOrEqual(
            Math.min(
              previous.maxWorkSeconds!,
              exercise.planning.safeWorkSeconds.max,
            ),
          );
          const reducedBreaks = (
            ["restAfterSetSeconds", "restAfterExerciseSeconds"] as const
          ).filter((field) => (item[field] ?? 0) < (previous[field] ?? 0));
          expect(reducedBreaks.length).toBeGreaterThan(0);
          for (const field of reducedBreaks) {
            expect(item[field]).toBeGreaterThanOrEqual(
              Math.max(5, exercise.planning.safeRestSeconds.min),
            );
          }
        }
      });
    }
    expect(propose(saved, { kind: "harder" }, active.id).changes).toEqual([]);
  });

  it("rejects requests to replace more than five distinct exercises", () => {
    const exerciseIds = exercises.slice(0, 6).map(({ id }) => id);
    expect(() => propose(fixture(), { kind: "movement", exerciseIds })).toThrow(
      "Select up to 5 exercises to replace.",
    );
  });

  it("keeps the reviewed diff stable across unrelated edits and invalidates it for a changed prescription", () => {
    const plan = fixture();
    const request = { kind: "duration", minutes: 10, scope: "week" } as const;
    const baseline = propose(plan, request);
    const outside = plan.sessions.at(-1)!;
    outside.workout.name = "Later manual workout";
    expect(propose(plan, request).fingerprint).toBe(baseline.fingerprint);
    plan.sessions.find(
      ({ id }) => id === baseline.changes[0].id,
    )!.workout.name = "Competing edit";
    expect(propose(plan, request).fingerprint).not.toBe(baseline.fingerprint);
  });
});

it("replaces multiple exercises within the window and preserves saved defaults", () => {
  const plan = fixture();
  const session = plan.sessions.find(
    ({ scheduledDate }) => scheduledDate >= today,
  )!;
  const exerciseIds = [
    ...new Set(session.workout.items.map(({ exerciseId }) => exerciseId)),
  ].slice(0, 2);
  expect(exerciseIds).toHaveLength(2);
  const result = propose(plan, { kind: "movement", exerciseIds });
  expect(result.changes.map(({ id }) => id)).toContain(session.id);
  const saved = trainingPlanSchema.parse(result.plan);
  expect(saved.profile).toEqual(trainingPlanSchema.parse(plan).profile);
  expect(planAvoidedExercisesOnDate(saved, result.start)).toEqual(exerciseIds);
  expect(planAvoidedExercisesOnDate(saved, addDays(result.end, 1))).toEqual([]);
  for (const session of saved.sessions.filter(
    ({ scheduledDate, status }) =>
      status === "scheduled" &&
      scheduledDate >= result.start &&
      scheduledDate <= result.end,
  )) {
    const scheduledIds = session.sections.flatMap(({ items }) =>
      items.map(({ exerciseId }) => exerciseId),
    );
    for (const id of exerciseIds) expect(scheduledIds).not.toContain(id);
  }
});

it("still reads a previously saved single-exercise adjustment", () => {
  const plan = fixture();
  const exerciseId = plan.sessions[0].workout.items[0].exerciseId;
  const saved = trainingPlanSchema.parse({
    ...plan,
    adjustmentWindows: [
      {
        start: today,
        end: addDays(today, 6),
        kind: "movement",
        profile: {},
        exerciseId,
        sessionIds: [],
      },
    ],
  });
  expect(planAvoidedExercisesOnDate(saved, today)).toEqual([exerciseId]);
});
