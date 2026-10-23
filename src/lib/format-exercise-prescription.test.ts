import { expect, it } from "vitest";
import { exercises } from "@/content/exercises";
import { formatDefaultPrescription } from "./format";

it.each([
  ["bodyweight-squat", false],
  ["dead-bug", false],
  ["reverse-lunge", true],
  ["single-arm-row", true],
  ["bird-dog", false],
  ["side-plank-rotation", true],
] as const)(
  "labels separate-side intervals correctly for %s",
  (id, perSide) => {
    const exercise = exercises.find((item) => item.id === id)!;
    const text = formatDefaultPrescription(
      exercise.defaultPrescription,
      exercise.laterality === "unilateral",
    );
    expect(text.includes("/ side")).toBe(perSide);
  },
);
