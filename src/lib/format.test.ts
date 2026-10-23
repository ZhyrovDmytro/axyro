import { expect, it } from "vitest";
import { formatDumbbellAvailability } from "./format";

it("distinguishes required, optional and unused weights including mixed workouts", () => {
  expect(formatDumbbellAvailability(["none"])).toBe("No dumbbell");
  expect(formatDumbbellAvailability(["none"], ["light_dumbbell"])).toBe(
    "Dumbbells optional",
  );
  expect(
    formatDumbbellAvailability(["none", "dumbbell"], ["light_dumbbell"]),
  ).toBe("Dumbbell");
});
