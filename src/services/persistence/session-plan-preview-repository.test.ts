import { describe, expect, it } from "vitest";
import { generateTrainingPlan } from "@/domain/training-plan/generate-training-plan";
import { athleteProfileSchema } from "@/domain/training-plan/training-plan.schema";
import { createPlanPreviewRepository } from "./session-plan-preview-repository";

const plan = generateTrainingPlan(
  athleteProfileSchema.parse({
    sport: "padel",
    experience: "beginner",
    sessionsPerWeek: 3,
    sessionDurationMinutes: 10,
    preferredDays: ["monday", "wednesday", "friday"],
    equipment: ["bodyweight"],
    goals: ["movement-speed"],
    matches: [],
  }),
  new Date("2026-11-02T12:00:00"),
);

describe("session plan preview", () => {
  it("keeps previews separate from other accounts and active plans", () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => {
        values.set(key, value);
      },
      removeItem: (key: string) => {
        values.delete(key);
      },
    };
    const own = createPlanPreviewRepository("alice", storage);
    expect(own.save(plan)).toBe(true);
    expect(own.load()).toEqual(plan);
    expect(createPlanPreviewRepository("bob", storage).load()).toBeNull();
    expect(values.has("veyro.training-plan.v1")).toBe(false);
  });
  it("rejects corrupt previews and reports unavailable storage", () => {
    expect(
      createPlanPreviewRepository("alice", {
        getItem: () => '{"invalid":true}',
        setItem: () => {},
      }).load(),
    ).toBeNull();
    expect(createPlanPreviewRepository("alice", null).save(plan)).toBe(false);
    expect(
      createPlanPreviewRepository("alice", {
        getItem: () => null,
        setItem: () => {
          throw new Error("Quota exceeded");
        },
      }).save(plan),
    ).toBe(false);
  });
});
