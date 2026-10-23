import type { Workout } from "./workout.types";

const qualityLabels: Record<Workout["focus"][number], string> = {
  strength: "Strength",
  power: "Power",
  explosiveness: "Explosive movement",
  stability: "Stability",
  rotation: "Rotation",
  "anti-rotation": "Core control",
  mobility: "Mobility",
  endurance: "Endurance",
  "warm-up": "Warm-up",
};

const genericSessionName = new RegExp(
  "^(?:(?:mon(?:day)?|tue(?:sday)?|wed(?:nesday)?|thu(?:rsday)?|fri(?:day)?|sat(?:urday)?|sun(?:day)?)\\s+)?(?:(?:personalized|weekly)\\s+)?(?:training\\s+)?(?:session|workout)(?:\\s+\\d+)?$",
  "i",
);

export function formatTrainingTitle(focus: Workout["focus"]): string {
  const labels = [
    ...new Set(
      focus
        .filter((quality) => quality !== "warm-up")
        .map((quality) => qualityLabels[quality]),
    ),
  ].slice(0, 2);

  return labels.length > 0 ? labels.join(" & ") : "Movement session";
}

export function getWorkoutTrainingTitle(workout: Workout): string {
  const name = workout.name.trim();
  return genericSessionName.test(name)
    ? formatTrainingTitle(workout.focus)
    : name;
}

export function getWorkoutOutcomeTitle(workout: Workout): string {
  const description = workout.shortDescription.trim().replace(/[.!?]+$/, "");
  const outcome = description.replace(/^(?:supports|builds|develops)\s+/i, "");

  return outcome.length > 0
    ? `${outcome.charAt(0).toLocaleUpperCase("en")}${outcome.slice(1)}`
    : getWorkoutTrainingTitle(workout);
}
