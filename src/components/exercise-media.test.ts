import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { exercises } from "@/content/exercises";
import { ExerciseMedia } from "./exercise-media";

const exercise = exercises.find(
  ({ id }) => id === "single-arm-prone-plate-over-obstacle",
);
const animatedExercise = exercises.find(({ id }) => id === "thread-the-needle");
const scapularPushUp = exercises.find(({ id }) => id === "scapular-push-up");
const sidePlankRotation = exercises.find(({ id }) => id === "side-plank-rotation");
const bentKneeSoleusRaise = exercises.find(({ id }) => id === "bent-knee-soleus-raise");
const bodyweightSquat = exercises.find(({ id }) => id === "bodyweight-squat");
const hipSwitch = exercises.find(({ id }) => id === "ninety-ninety-hip-switch");
const deadBug = exercises.find(({ id }) => id === "dead-bug");

if (!exercise) throw new Error("Video exercise fixture is missing.");
if (!animatedExercise) throw new Error("Animated exercise fixture is missing.");
if (!scapularPushUp) throw new Error("Scapular Push-Up fixture is missing.");
if (!sidePlankRotation) throw new Error("Side Plank fixture is missing.");
if (!bentKneeSoleusRaise) throw new Error("Bent-Knee Soleus Raise fixture is missing.");
if (!bodyweightSquat) throw new Error("Bodyweight Squat fixture is missing.");
if (!hipSwitch) throw new Error("90/90 Hip Switch fixture is missing.");
if (!deadBug) throw new Error("Dead Bug fixture is missing.");

describe("ExerciseMedia", () => {
  it.each([
    ["exercise", false],
    ["preview", true],
  ])("shows the Pogo Hop GIF in the %s view", (_, compact) => {
    const pogoHop = exercises.find(({ id }) => id === "pogo-hop");
    if (!pogoHop) throw new Error("Pogo Hop fixture is missing.");
    const markup = renderToStaticMarkup(
      createElement(ExerciseMedia, { exercise: pogoHop, compact }),
    );

    expect(markup).toContain("/images/exercises/animations/pogo-hop.gif");
    expect(markup).not.toContain("<video");
  });

  it.each([
    ["exercise", false],
    ["preview", true],
  ])("shows the Push-Up Plus GIF in the %s view", (_, compact) => {
    const pushUpPlus = exercises.find(({ id }) => id === "push-up-plus");
    if (!pushUpPlus) throw new Error("Push-Up Plus fixture is missing.");
    const markup = renderToStaticMarkup(
      createElement(ExerciseMedia, { exercise: pushUpPlus, compact }),
    );

    expect(markup).toContain("/images/exercises/animations/push-up-plus.gif");
    expect(markup).not.toContain("<video");
  });

  it.each([
    ["exercise", false],
    ["preview", true],
  ])("shows the Intermittent Lateral Shuffle GIF in the %s view", (_, compact) => {
    const shuffle = exercises.find(({ id }) => id === "intermittent-lateral-shuffle");
    if (!shuffle) throw new Error("Intermittent Lateral Shuffle fixture is missing.");
    const markup = renderToStaticMarkup(
      createElement(ExerciseMedia, { exercise: shuffle, compact }),
    );

    expect(markup).toContain("/images/exercises/animations/intermittent-lateral-shuffle.gif");
    expect(markup).not.toContain("<video");
  });

  it("shows an available video on the full exercise detail view", () => {
    const markup = renderToStaticMarkup(
      createElement(ExerciseMedia, { exercise }),
    );

    expect(markup).toContain("<video");
    expect(markup).toContain(
      "/videos/single-arm-prone-plate-over-obstacle-v2.mov",
    );
    expect(markup).toContain('preload="auto"');
    expect(markup).toContain("Play demo");
    expect(markup).toContain("Replay");
  });

  it("uses production videos in compact library and preview surfaces", () => {
    const markup = renderToStaticMarkup(
      createElement(ExerciseMedia, { exercise, compact: true }),
    );

    expect(markup).toContain("<video");
    expect(markup).toContain(
      "/videos/single-arm-prone-plate-over-obstacle-v2.mov",
    );
    expect(markup).toContain('preload="metadata"');
    expect(markup).not.toContain("Play demo");
    expect(markup).not.toContain("Replay");
  });

  it.each([
    ["main", { exercise: animatedExercise }, 'loading="eager"'],
    [
      "compact preview",
      { exercise: animatedExercise, compact: true },
      'loading="lazy"',
    ],
  ])("shows animated GIF media in the %s view", (_, props, loading) => {
    const markup = renderToStaticMarkup(createElement(ExerciseMedia, props));

    expect(markup).toContain(
      "/images/exercises/animations/thread-the-needle.gif",
    );
    expect(markup).toContain(loading);
    expect(markup).not.toContain("<video");
  });

  it.each([
    ["exercise", false],
    ["preview", true],
  ])("shows the Scapular Push-Up GIF in the %s view", (_, compact) => {
    const markup = renderToStaticMarkup(
      createElement(ExerciseMedia, { exercise: scapularPushUp, compact }),
    );

    expect(markup).toContain("/images/exercises/animations/scapular-push-up.gif");
    expect(markup).not.toContain("<video");
  });

  it.each([
    ["exercise", false],
    ["preview", true],
  ])("shows the Side Plank GIF in the %s view", (_, compact) => {
    const markup = renderToStaticMarkup(
      createElement(ExerciseMedia, { exercise: sidePlankRotation, compact }),
    );

    expect(markup).toContain("/images/exercises/animations/side-plank-rotation.gif");
    expect(markup).not.toContain("<video");
  });

  it.each([
    ["exercise", false],
    ["preview", true],
  ])("shows the Bent-Knee Soleus Raise GIF in the %s view", (_, compact) => {
    const markup = renderToStaticMarkup(
      createElement(ExerciseMedia, { exercise: bentKneeSoleusRaise, compact }),
    );

    expect(markup).toContain("/images/exercises/animations/bent-knee-soleus-raise.gif");
    expect(markup).not.toContain("<video");
  });

  it.each([
    ["exercise", false],
    ["preview", true],
  ])("shows the Bodyweight Squat GIF in the %s view", (_, compact) => {
    const markup = renderToStaticMarkup(
      createElement(ExerciseMedia, { exercise: bodyweightSquat, compact }),
    );

    expect(markup).toContain("/images/exercises/animations/bodyweight-squat.gif");
    expect(markup).not.toContain("<video");
  });

  it.each([
    ["exercise", false],
    ["preview", true],
  ])("shows the 90/90 Hip Switch GIF in the %s view", (_, compact) => {
    const markup = renderToStaticMarkup(
      createElement(ExerciseMedia, { exercise: hipSwitch, compact }),
    );

    expect(markup).toContain("/images/exercises/animations/ninety-ninety-hip-switch.gif");
    expect(markup).not.toContain("<video");
  });

  it.each([
    ["exercise", false],
    ["preview", true],
  ])("shows the Dead Bug GIF in the %s view", (_, compact) => {
    const markup = renderToStaticMarkup(
      createElement(ExerciseMedia, { exercise: deadBug, compact }),
    );

    expect(markup).toContain("/images/exercises/animations/dead-bug.gif");
    expect(markup).not.toContain("<video");
  });
  it.each([
    ["exercise", false],
    ["preview", true],
  ])("shows the Bird Dog GIF in the %s view", (_, compact) => {
    const birdDog = exercises.find(({ id }) => id === "bird-dog");
    if (!birdDog) throw new Error("Bird Dog fixture is missing.");
    const markup = renderToStaticMarkup(
      createElement(ExerciseMedia, { exercise: birdDog, compact }),
    );

    expect(markup).toContain("/images/exercises/animations/bird-dog.gif");
    expect(markup).not.toContain("<video");
  });

  it.each([
    ["exercise", false],
    ["preview", true],
  ])("shows the Dumbbell Forearm Rotation GIF in the %s view", (_, compact) => {
    const forearmRotation = exercises.find(
      ({ id }) => id === "dumbbell-pronation-supination",
    );
    if (!forearmRotation) throw new Error("Forearm Rotation fixture is missing.");
    const markup = renderToStaticMarkup(
      createElement(ExerciseMedia, { exercise: forearmRotation, compact }),
    );

    expect(markup).toContain(
      "/images/exercises/animations/dumbbell-pronation-supination.gif",
    );
    expect(markup).not.toContain("<video");
  });

  it.each([
    ["exercise", false],
    ["preview", true],
  ])("shows the Romanian Deadlift video in the %s view", (_, compact) => {
    const deadlift = exercises.find(
      ({ id }) => id === "dumbbell-romanian-deadlift",
    );
    if (!deadlift) throw new Error("Romanian Deadlift fixture is missing.");
    const markup = renderToStaticMarkup(
      createElement(ExerciseMedia, { exercise: deadlift, compact }),
    );

    expect(markup).toContain("/videos/dumbbell-romanian-deadlift.mov");
    expect(markup).toContain("<video");
    expect(markup).toContain('muted=""');
    expect(markup).toContain('loop=""');
  });

  it.each([
    ["exercise", false],
    ["preview", true],
  ])("shows the Dumbbell Wrist Extension GIF in the %s view", (_, compact) => {
    const wristExtension = exercises.find(
      ({ id }) => id === "dumbbell-wrist-extension",
    );
    if (!wristExtension) throw new Error("Wrist Extension fixture is missing.");
    const markup = renderToStaticMarkup(
      createElement(ExerciseMedia, { exercise: wristExtension, compact }),
    );

    expect(markup).toContain(
      "/images/exercises/animations/dumbbell-wrist-extension.gif",
    );
    expect(markup).not.toContain("<video");
  });

  it.each([
    ["exercise", false],
    ["preview", true],
  ])("shows the Plank Shoulder Tap GIF in the %s view", (_, compact) => {
    const shoulderTap = exercises.find(({ id }) => id === "plank-shoulder-tap");
    if (!shoulderTap) throw new Error("Plank Shoulder Tap fixture is missing.");
    const markup = renderToStaticMarkup(
      createElement(ExerciseMedia, { exercise: shoulderTap, compact }),
    );

    expect(markup).toContain("/images/exercises/animations/plank-shoulder-tap.gif");
    expect(shoulderTap.media.posterUri).toBe("/images/exercises/plank-shoulder-tap-preview.png");
    expect(markup).not.toContain("<video");
  });

  it.each([
    ["exercise", false],
    ["preview", true],
  ])("shows Side-to-Side Line Hops in the %s view", (_, compact) => {
    const hops = exercises.find(({ id }) => id === "split-step-lateral-drive");
    if (!hops) throw new Error("Side-to-Side Line Hops fixture is missing.");
    expect(hops.name).toBe("Side-to-Side Line Hops");
    expect(hops.laterality).toBe("bilateral");
    expect(hops.defaultPrescription).toMatchObject({
      sideMode: "simultaneous",
      cadenceMode: "self_paced",
      workDurationSeconds: 20,
      restDurationSeconds: 35,
    });
    expect(hops.defaultGuidance?.pattern.type).toBe("none");
    const markup = renderToStaticMarkup(
      createElement(ExerciseMedia, { exercise: hops, compact }),
    );
    expect(markup).toContain("/images/exercises/animations/side-to-side-line-hops.gif");
    expect(markup).not.toContain("Split-Step Lateral Drive");
  });

  it.each([
    ["exercise", false],
    ["preview", true],
  ])("shows the Fire Hydrant GIF in the %s view", (_, compact) => {
    const hydrant = exercises.find(({ id }) => id === "short-lever-copenhagen-hold");
    if (!hydrant) throw new Error("Fire Hydrant fixture is missing.");
    expect(hydrant.name).toBe("Fire Hydrant");
    expect(hydrant.setupRequirements).toEqual(["floor"]);
    expect(hydrant.defaultPrescription).toMatchObject({
      sideMode: "separate",
      cadenceMode: "controlled",
      workDurationSeconds: 20,
      restDurationSeconds: 30,
    });
    expect(hydrant.switchTarget).toBe("leg");
    const markup = renderToStaticMarkup(
      createElement(ExerciseMedia, { exercise: hydrant, compact }),
    );
    expect(markup).toContain("/images/exercises/animations/fire-hydrant.gif");
    expect(hydrant.media.posterUri).toBe("/images/exercises/fire-hydrant-preview.png");
    expect(markup).not.toContain("<video");
    expect(markup).not.toContain("Short-Lever Copenhagen Hold");
  });

});
