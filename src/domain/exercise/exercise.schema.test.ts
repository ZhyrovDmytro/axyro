import { describe, expect, it } from "vitest";

import { exerciseCatalogSchema, exercises } from "@/content/exercises";
import { padelCoreExercises } from "@/content/padel-core-exercises";
import { padelShoulderExercises } from "@/content/padel-shoulder-exercises";
import { tempoSchema, timedDefaultPrescriptionSchema } from "./exercise.schema";

describe("exercise catalog", () => {
  it("normalizes every exercise into planner-ready metadata", () => {
    expect(
      exercises.every(
        (exercise) =>
          exercise.planning.sectionRoles.length > 0 &&
          exercise.planning.movementPatterns.length > 0 &&
          exercise.planning.trainingQualities.length > 0 &&
          exercise.planning.safeWorkSeconds.max >=
            exercise.planning.safeWorkSeconds.min &&
          exercise.planning.safeRestSeconds.max >=
            exercise.planning.safeRestSeconds.min &&
          exercise.planning.mediaStatus === exercise.media.status,
      ),
    ).toBe(true);
  });

  it("gives every exercise start and finish movement frames", () => {
    expect(
      exercises.every(
        (exercise) =>
          exercise.movementFrames.start.uri.length > 0 &&
          exercise.movementFrames.start.cue.length > 0 &&
          exercise.movementFrames.end.uri.length > 0 &&
          exercise.movementFrames.end.cue.length > 0,
      ),
    ).toBe(true);
  });

  it("uses the repaired single-athlete start frame for wall slide lift-offs", () => {
    const exercise = exercises.find(
      (candidate) => candidate.id === "wall-slide-lift-off",
    );

    expect(exercise?.movementFrames.start.uri).toBe(
      "/images/exercises/positions/wall-slide-lift-off-start-v2.png",
    );
    expect(exercise?.movementFrames.end.uri).toBe(
      "/images/exercises/positions/wall-slide-lift-off-end.png",
    );
  });

  it("defines the wall-supported acceleration march", () => {
    const exercise = exercises.find(
      ({ id }) => id === "split-stance-acceleration-march",
    );

    expect(exercise).toMatchObject({
      name: "Wall Acceleration March",
      shortDescription:
        "Practice wall-supported acceleration posture, alternating knee drive, and active ground contact.",
      setupRequirements: ["wall", "floor"],
      laterality: "alternating",
      media: {
        type: "animation",
        uri: "/images/exercises/animations/wall-acceleration-march.gif",
      },
    });
  });

  it("contains 9 production Padel shoulder exercises with stable media keys", () => {
    expect(padelShoulderExercises).toHaveLength(9);
    expect(
      new Set(padelShoulderExercises.map((exercise) => exercise.id)).size,
    ).toBe(9);
    expect(
      new Set(padelShoulderExercises.map((exercise) => exercise.media.assetKey))
        .size,
    ).toBe(9);
    expect(
      padelShoulderExercises.every(
        (exercise) =>
          exercise.media.requiredViews.length > 0 &&
          ("restDurationSeconds" in exercise.defaultPrescription
            ? exercise.defaultPrescription.restDurationSeconds >= 0
            : exercise.defaultPrescription.restSeconds.min > 0),
      ),
    ).toBe(true);
  });

  it("uses timed defaults and seamless-loop media for the additional pack", () => {
    const exerciseIds = [
      "single-arm-prone-plate-over-obstacle",
      "prone-foam-roller-overhead-shoulder-press",
      "prone-foam-roller-plate-internal-external-rotation",
    ];
    const additions = padelShoulderExercises.filter((exercise) =>
      exerciseIds.includes(exercise.id),
    );

    expect(additions).toHaveLength(3);
    additions.forEach((exercise) => {
      expect(
        timedDefaultPrescriptionSchema.parse(exercise.defaultPrescription),
      ).toMatchObject({
        workDurationSeconds: 30,
        rounds: 1,
        cadenceMode: "controlled",
      });
      expect(exercise.media).toMatchObject({
        loopDurationSeconds: 4,
        seamlessLoop: true,
      });
    });
  });

  it("contains three timed Padel core additions and two reference images", () => {
    expect(padelCoreExercises).toHaveLength(3);
    expect(
      padelCoreExercises.every(
        (exercise) =>
          timedDefaultPrescriptionSchema.safeParse(exercise.defaultPrescription)
            .success,
      ),
    ).toBe(true);
    expect(
      padelCoreExercises.filter((exercise) => exercise.media.posterUri),
    ).toHaveLength(2);
  });

  it.each([
    [
      "single-arm-prone-plate-over-obstacle",
      "/videos/single-arm-prone-plate-over-obstacle-v2.mov",
    ],
    [
      "prone-foam-roller-overhead-shoulder-press",
      "/videos/prone-foam-roller-overhead-shoulder-press-v2.mov",
    ],
    [
      "prone-foam-roller-plate-internal-external-rotation",
      "/videos/prone-foam-roller-plate-internal-external-rotation-v2.mov",
    ],
  ])("serves the bundled movement reference for %s", (exerciseId, videoUrl) => {
    const exercise = exercises.find(({ id }) => id === exerciseId);

    expect(exercise?.media.videoUrl).toBe(videoUrl);
  });

  it.each([
    ["bodyweight-squat", "/images/exercises/animations/bodyweight-squat.gif"],
    ["dead-bug", "/images/exercises/animations/dead-bug.gif"],
    [
      "bodyweight-hip-hinge",
      "/images/exercises/animations/bodyweight-hip-hinge.gif",
    ],
    [
      "glute-bridge-march",
      "/images/exercises/animations/glute-bridge-march.gif",
    ],
    ["lateral-lunge", "/images/exercises/animations/lateral-lunge.gif"],
    ["ninety-ninety-hip-switch", "/images/exercises/animations/ninety-ninety-hip-switch.gif"],
    ["bent-knee-soleus-raise", "/images/exercises/animations/bent-knee-soleus-raise.gif"],
    ["scapular-push-up", "/images/exercises/animations/scapular-push-up.gif"],
    ["side-plank-rotation", "/images/exercises/animations/side-plank-rotation.gif"],
    ["suitcase-march", "/images/exercises/animations/suitcase-march.gif"],
    ["thread-the-needle", "/images/exercises/animations/thread-the-needle.gif"],
    [
      "wall-slide-lift-off",
      "/images/exercises/animations/wall-slide-lift-off.gif",
    ],
  ])("serves the animated movement reference for %s", (exerciseId, uri) => {
    const exercise = exercises.find(({ id }) => id === exerciseId);

    expect(exercise?.media).toMatchObject({
      type: "animation",
      uri,
    });
  });

  it("rejects duplicate stable IDs", () => {
    expect(() =>
      exerciseCatalogSchema.parse([exercises[0], exercises[0]]),
    ).toThrow("Duplicate exercise id");
  });
});

describe("tempo schema", () => {
  it.each([
    { mode: "controlled", pattern: "2-1-3" },
    { mode: "metronome", defaultBpm: 60 },
    {
      mode: "alternating_metronome",
      defaultBpm: 50,
      cues: ["1", "2"],
    },
    { mode: "self_paced" },
    { mode: "explosive_reset", resetSeconds: { min: 3, max: 5 } },
  ])("supports $mode guidance", (tempo) => {
    expect(tempoSchema.parse(tempo)).toEqual(tempo);
  });
});
