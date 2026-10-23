import { describe, expect, it } from "vitest";

import { exerciseMediaSchema } from "./exercise.schema";
import { resolveExerciseMediaError } from "./exercise-media-state";

describe("exercise media failures", () => {
  it("uses the reviewed instructional fallback without reloading the session", () => {
    const media = exerciseMediaSchema.parse({
      type: "image",
      aspectRatio: "16 / 9",
      loop: false,
      version: "1",
      status: "production",
      fallback: "instructional",
      assetKey: "test-movement",
      requiredViews: ["front"],
      notes: "Fallback-only test media.",
    });

    expect(resolveExerciseMediaError(media)).toBe("fallback");
  });

  it("exposes a retryable error when no fallback exists", () => {
    const media = exerciseMediaSchema.parse({
      type: "video",
      uri: "/media/missing.mp4",
      aspectRatio: "16 / 9",
      loop: true,
      version: "1",
      status: "production",
      assetKey: "missing-video",
      requiredViews: ["front"],
      notes: "Missing media test.",
    });

    expect(resolveExerciseMediaError(media)).toBe("error");
  });
});
