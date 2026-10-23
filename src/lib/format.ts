import type {
  DefaultPrescription,
  Equipment,
  Tempo,
} from "@/domain/exercise/exercise.types";
import type { WorkoutItem } from "@/domain/workout/workout.types";
import type { DurationStatus } from "@/domain/training-plan/training-plan.types";
import { formatSessionDurationMinutes } from "@/domain/workout/session-duration";

export function titleCase(value: string): string {
  return value
    .split(/[-_]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function formatEquipment(equipment: Equipment): string {
  const labels: Record<Equipment, string> = {
    none: "No equipment",
    light_dumbbell: "Light dumbbell",
    dumbbell: "One dumbbell",
    two_dumbbells: "Two dumbbells",
  };

  return labels[equipment];
}

export function formatDumbbellAvailability(
  equipment: readonly Equipment[],
  optionalEquipment: readonly Equipment[] = [],
): string {
  const hasDumbbell = equipment.some((item) => item !== "none");
  if (hasDumbbell) return "Dumbbell";
  return optionalEquipment.some((item) => item !== "none")
    ? "Dumbbells optional"
    : "No dumbbell";
}

function formatRange(range: { min: number; max: number }): string {
  return range.min === range.max
    ? String(range.min)
    : String(range.min) + "–" + String(range.max);
}

export function formatDefaultPrescription(
  prescription: DefaultPrescription,
  separateSides = false,
): string {
  if ("workDurationSeconds" in prescription) {
    const roundLabel =
      prescription.rounds === 1
        ? "1 round"
        : String(prescription.rounds) + " rounds";
    const sideLabel = prescription.sideMode === "separate" ? " / side" : "";
    return (
      roundLabel +
      " × " +
      prescription.workDurationSeconds +
      " sec" +
      sideLabel +
      " · " +
      prescription.restDurationSeconds +
      " sec rest"
    );
  }

  const sets = formatRange(prescription.sets) + " sets";
  const work = prescription.reps
    ? formatRange(prescription.reps) + " reps"
    : prescription.repsPerSide
      ? formatRange(prescription.repsPerSide) + " reps / side"
      : formatRange(prescription.durationSeconds!) +
        " sec" +
        (separateSides ? " / side" : "");
  const rest = formatRange(prescription.restSeconds) + " sec rest";
  return sets + " × " + work + " · " + rest;
}

export function formatTempo(tempo: Tempo): string {
  switch (tempo.mode) {
    case "controlled":
      return tempo.pattern ? "Controlled · " + tempo.pattern : "Controlled";
    case "metronome":
      return "Metronome · " + tempo.defaultBpm + " BPM";
    case "alternating_metronome":
      return (
        "Alternating · " +
        (tempo.bpmRange
          ? formatRange(tempo.bpmRange) + " BPM"
          : tempo.defaultBpm + " BPM")
      );
    case "self_paced":
      return "Self-paced";
    case "explosive_reset":
      return tempo.resetSeconds
        ? "Explosive with " + formatRange(tempo.resetSeconds) + " sec reset"
        : "Explosive with full reset";
  }
}

export function formatPrescription(item: WorkoutItem): string {
  const side = item.prescription.perSide ? " / side" : "";

  return `${item.sets} × ${item.prescription.durationSeconds} sec${side}`;
}

export function formatDurationPreferenceMessage({
  actualSeconds,
  targetSeconds,
  status,
}: {
  actualSeconds: number;
  targetSeconds: number;
  status: DurationStatus;
}): string {
  const actualMinutes = formatSessionDurationMinutes(actualSeconds);
  const targetMinutes = Math.round(targetSeconds / 60);

  if (status === "on_target") {
    return `Built for your ${targetMinutes}-minute preference.`;
  }
  if (status === "close") {
    return `Adjusted to ${actualMinutes} minutes, close to your ${targetMinutes}-minute preference.`;
  }
  return status === "shorter_than_requested"
    ? `Shorter than requested: this compatible session is ${actualMinutes} minutes, not your ${targetMinutes}-minute preference.`
    : `Longer than requested: this compatible session is ${actualMinutes} minutes, not your ${targetMinutes}-minute preference.`;
}
