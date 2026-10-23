import type {
  BodyArea,
  Equipment,
  Exercise,
} from "@/domain/exercise/exercise.types";

import { calculateSessionDuration } from "./session-duration";
import type { SessionSection, Workout, WorkoutItem } from "./workout.types";

export const SESSION_SECTION_DURATION_BUDGETS = {
  5: {
    warmupMinimum: 40,
    warmupPreferred: 45,
    cooldownMinimum: 25,
    cooldownPreferred: 30,
  },
  10: {
    warmupMinimum: 90,
    warmupPreferred: 105,
    cooldownMinimum: 60,
    cooldownPreferred: 75,
  },
  15: {
    warmupMinimum: 120,
    warmupPreferred: 135,
    cooldownMinimum: 60,
    cooldownPreferred: 90,
  },
  20: {
    warmupMinimum: 150,
    warmupPreferred: 180,
    cooldownMinimum: 90,
    cooldownPreferred: 180,
  },
  30: {
    warmupMinimum: 240,
    warmupPreferred: 270,
    cooldownMinimum: 120,
    cooldownPreferred: 150,
  },
} as const;

export type SessionSectionDurationBudget = {
  warmupMinimum: number;
  warmupPreferred: number;
  cooldownMinimum: number;
  cooldownPreferred: number;
};

export function getSessionSectionDurationBudget(
  targetDurationSeconds: number,
): SessionSectionDurationBudget {
  const minutes = targetDurationSeconds / 60;
  const key =
    minutes <= 5
      ? 5
      : minutes <= 10
        ? 10
        : minutes <= 15
          ? 15
          : minutes <= 20
            ? 20
            : 30;
  return SESSION_SECTION_DURATION_BUDGETS[key];
}

export function flattenSessionSections(
  sections: readonly SessionSection[],
): WorkoutItem[] {
  return sections.flatMap((section) => section.items);
}

export function getSessionSection(
  sections: readonly SessionSection[],
  type: SessionSection["type"],
) {
  return sections.find((section) => section.type === type);
}

export function calculateSessionSectionsDuration(
  sections: readonly SessionSection[],
) {
  return calculateSessionDuration({ items: flattenSessionSections(sections) });
}

export function calculateSessionSectionDuration(section: SessionSection) {
  const lastItem = section.items.at(-1);
  const boundaryRecoverySeconds =
    section.type === "cooldown" ? 0 : (lastItem?.restAfterExerciseSeconds ?? 0);
  return (
    calculateSessionDuration({ items: section.items }) + boundaryRecoverySeconds
  );
}

/**
 * An isolated workout calculation does not count recovery after its final
 * item, while that recovery is real when the main block precedes cooldown.
 * Remove it from the fit target so the compiled section meets its budget.
 */
export function calculateMainWorkoutFitTarget(
  mainWorkout: Pick<Workout, "items">,
  mainSectionBudgetSeconds: number,
) {
  const boundaryRecoverySeconds =
    mainWorkout.items.at(-1)?.restAfterExerciseSeconds ?? 0;
  return Math.max(60, mainSectionBudgetSeconds - boundaryRecoverySeconds);
}

function availableExercise(
  exercise: Exercise,
  availableEquipment: ReadonlySet<Equipment>,
  excludedBodyAreas: ReadonlySet<BodyArea>,
) {
  return (
    exercise.sessionIntensity === "low" &&
    exercise.equipment.every(
      (equipment) => equipment === "none" || availableEquipment.has(equipment),
    ) &&
    exercise.bodyAreas.every((area) => !excludedBodyAreas.has(area))
  );
}

function rankedWarmups(
  mainExercises: readonly Exercise[],
  exerciseCatalog: readonly Exercise[],
  availableEquipment: ReadonlySet<Equipment>,
  excludedBodyAreas: ReadonlySet<BodyArea>,
) {
  const mainQualities = new Set(
    mainExercises.flatMap((exercise) => exercise.qualities),
  );
  const mainBodyAreas = new Set(
    mainExercises.flatMap((exercise) => exercise.bodyAreas),
  );
  return exerciseCatalog
    .filter(
      (exercise) =>
        exercise.sessionRoles.includes("warmup") &&
        availableExercise(exercise, availableEquipment, excludedBodyAreas),
    )
    .map((exercise) => ({
      exercise,
      score:
        exercise.preparationFor.filter((quality) => mainQualities.has(quality))
          .length *
          30 +
        exercise.bodyAreas.filter((area) => mainBodyAreas.has(area)).length *
          12 +
        Number(exercise.bodyAreas.includes("full-body")) * 4,
    }))
    .sort(
      (left, right) =>
        right.score - left.score ||
        left.exercise.id.localeCompare(right.exercise.id),
    );
}

function rankedCooldowns(
  mainExercises: readonly Exercise[],
  exerciseCatalog: readonly Exercise[],
  availableEquipment: ReadonlySet<Equipment>,
  excludedBodyAreas: ReadonlySet<BodyArea>,
) {
  const mainBodyAreas = new Set(
    mainExercises.flatMap((exercise) => exercise.bodyAreas),
  );
  return exerciseCatalog
    .filter(
      (exercise) =>
        exercise.sessionRoles.includes("cooldown") &&
        availableExercise(exercise, availableEquipment, excludedBodyAreas),
    )
    .map((exercise) => ({
      exercise,
      score:
        exercise.recoveryFor.filter(
          (area) => area === "full-body" || mainBodyAreas.has(area),
        ).length *
          24 +
        Number(exercise.recoveryFor.includes("full-body")) * 5,
    }))
    .sort(
      (left, right) =>
        right.score - left.score ||
        left.exercise.id.localeCompare(right.exercise.id),
    );
}

function supportItem(
  exercise: Exercise,
  section: "warmup" | "cooldown",
  durationSeconds: number,
): WorkoutItem {
  const defaults = exercise.defaultPrescription;
  const perSide =
    "workDurationSeconds" in defaults
      ? defaults.sideMode === "separate"
      : exercise.laterality === "unilateral";
  return {
    id: `${section}-${exercise.id}`,
    exerciseId: exercise.id,
    sets: 1,
    prescription: {
      type: "timed",
      durationSeconds,
      ...(perSide ? { perSide: true } : {}),
    },
    role: "core",
    priority: 100,
    minSets: 1,
    maxSets: 1,
    minWorkSeconds: durationSeconds,
    maxWorkSeconds: durationSeconds,
  };
}

function sectionItems(
  candidates: readonly Exercise[],
  section: "warmup" | "cooldown",
  preferredSeconds: number,
  count: number,
) {
  const selected = candidates.slice(
    0,
    Math.max(1, Math.min(count, candidates.length)),
  );
  if (selected.length === 0) {
    throw new Error(`No compatible ${section} exercise is available.`);
  }
  if (selected.length < count && process.env.NODE_ENV === "development") {
    console.warn(
      `[session-sections] Using ${selected.length} compatible ${section} exercise(s); ${count} preferred.`,
    );
  }
  const workSeconds = Math.max(
    20,
    Math.round((preferredSeconds - selected.length * 5) / selected.length / 5) *
      5,
  );
  return selected.map((exercise) =>
    supportItem(exercise, section, workSeconds),
  );
}

export function reserveSupportExerciseIds(
  exerciseCatalog: readonly Exercise[],
) {
  const warmups = exerciseCatalog.filter(
    (exercise) =>
      exercise.sessionRoles.includes("warmup") &&
      exercise.sessionIntensity === "low",
  );
  const cooldown = exerciseCatalog.find(
    (exercise) =>
      exercise.sessionRoles.includes("cooldown") &&
      exercise.sessionIntensity === "low",
  );
  const warmup =
    warmups.find((exercise) => exercise.id === cooldown?.id) ?? warmups[0];
  return new Set(
    [warmup?.id, cooldown?.id].filter((id): id is string => Boolean(id)),
  );
}

export function buildSessionSections({
  mainWorkout,
  exerciseCatalog,
  targetDurationSeconds,
  availableEquipment = [],
  excludedBodyAreas = [],
}: {
  mainWorkout: Workout;
  exerciseCatalog: readonly Exercise[];
  targetDurationSeconds: number;
  availableEquipment?: readonly Equipment[];
  excludedBodyAreas?: readonly BodyArea[];
}): SessionSection[] {
  const cooldown = buildCooldownSection({
    mainWorkout,
    exerciseCatalog,
    targetDurationSeconds,
    availableEquipment,
    excludedBodyAreas,
  });
  const warmup = buildWarmupSection({
    mainWorkout,
    exerciseCatalog,
    targetDurationSeconds,
    availableEquipment,
    excludedBodyAreas,
  });
  return [warmup, { type: "main", items: mainWorkout.items }, cooldown];
}

type SupportSectionInput = {
  mainWorkout: Workout;
  exerciseCatalog: readonly Exercise[];
  targetDurationSeconds: number;
  availableEquipment?: readonly Equipment[];
  excludedBodyAreas?: readonly BodyArea[];
};

export function buildWarmupSection({
  mainWorkout,
  exerciseCatalog,
  targetDurationSeconds,
  availableEquipment = [],
  excludedBodyAreas = [],
}: SupportSectionInput): SessionSection {
  const exerciseById = new Map(
    exerciseCatalog.map((exercise) => [exercise.id, exercise]),
  );
  const mainExercises = mainWorkout.items.flatMap((item) => {
    const exercise = exerciseById.get(item.exerciseId);
    return exercise ? [exercise] : [];
  });
  const usedIds = new Set(mainWorkout.items.map((item) => item.exerciseId));
  const supportCatalog = exerciseCatalog.filter(
    (exercise) => !usedIds.has(exercise.id),
  );
  const available = new Set<Equipment>(["none", ...availableEquipment]);
  const excluded = new Set(excludedBodyAreas);
  const budget = getSessionSectionDurationBudget(targetDurationSeconds);
  const targetMinutes = targetDurationSeconds / 60;
  const warmupCount =
    targetMinutes <= 5
      ? 1
      : targetMinutes <= 10
        ? 2
        : targetMinutes <= 20
          ? 3
          : 4;
  const warmups = rankedWarmups(
    mainExercises,
    supportCatalog,
    available,
    excluded,
  ).map((candidate) => candidate.exercise);
  return {
    type: "warmup",
    items: sectionItems(warmups, "warmup", budget.warmupPreferred, warmupCount),
  };
}

export function buildCooldownSection({
  mainWorkout,
  exerciseCatalog,
  targetDurationSeconds,
  availableEquipment = [],
  excludedBodyAreas = [],
}: SupportSectionInput): SessionSection {
  const exerciseById = new Map(
    exerciseCatalog.map((exercise) => [exercise.id, exercise]),
  );
  const mainExercises = mainWorkout.items.flatMap((item) => {
    const exercise = exerciseById.get(item.exerciseId);
    return exercise ? [exercise] : [];
  });
  const usedIds = new Set(mainWorkout.items.map((item) => item.exerciseId));
  const supportCatalog = exerciseCatalog.filter(
    (exercise) => !usedIds.has(exercise.id),
  );
  const available = new Set<Equipment>(["none", ...availableEquipment]);
  const excluded = new Set(excludedBodyAreas);
  const budget = getSessionSectionDurationBudget(targetDurationSeconds);
  const targetMinutes = targetDurationSeconds / 60;
  const cooldownCount = targetMinutes <= 10 ? 1 : targetMinutes <= 20 ? 2 : 3;
  const cooldowns = rankedCooldowns(
    mainExercises,
    supportCatalog,
    available,
    excluded,
  ).map((candidate) => candidate.exercise);
  return {
    type: "cooldown",
    items: sectionItems(
      cooldowns,
      "cooldown",
      budget.cooldownPreferred,
      cooldownCount,
    ),
  };
}

export function validateGeneratedSessionSections({
  sections,
  targetDurationSeconds,
  exerciseCatalog,
  availableEquipment,
  excludedBodyAreas = [],
}: {
  sections: readonly SessionSection[];
  targetDurationSeconds: number;
  exerciseCatalog?: readonly Exercise[];
  availableEquipment?: readonly Equipment[];
  excludedBodyAreas?: readonly BodyArea[];
}) {
  const budget = getSessionSectionDurationBudget(targetDurationSeconds);
  const warmup = getSessionSection(sections, "warmup");
  const main = getSessionSection(sections, "main");
  const cooldown = getSessionSection(sections, "cooldown");
  const errors: string[] = [];
  if (
    sections.length !== 3 ||
    sections[0]?.type !== "warmup" ||
    sections[1]?.type !== "main" ||
    sections[2]?.type !== "cooldown"
  ) {
    errors.push("Sections must be ordered warmup, main, cooldown.");
  }
  if (!warmup) errors.push("Warm-up section is missing.");
  if (!main?.items.length) errors.push("Main section requires an exercise.");
  if (!cooldown) errors.push("Cooldown section is missing.");
  if (
    warmup &&
    calculateSessionSectionDuration(warmup) < budget.warmupMinimum
  ) {
    errors.push("Warm-up is shorter than its minimum duration.");
  }
  if (
    cooldown &&
    calculateSessionSectionDuration(cooldown) < budget.cooldownMinimum
  ) {
    errors.push("Cooldown is shorter than its minimum duration.");
  }
  const mainIds = main?.items.map((item) => item.exerciseId) ?? [];
  if (new Set(mainIds).size !== mainIds.length) {
    errors.push(
      "Main workout exercises must be unique; use sets for additional work.",
    );
  }
  if (
    sections.some(
      (section) =>
        section.type !== "main" &&
        section.items.some((item) => mainIds.includes(item.exerciseId)),
    )
  ) {
    errors.push(
      "Main workout exercises must not repeat in warm-up or cooldown.",
    );
  }
  if (exerciseCatalog) {
    const exerciseById = new Map(
      exerciseCatalog.map((exercise) => [exercise.id, exercise]),
    );
    const equipment = availableEquipment
      ? new Set<Equipment>(["none", ...availableEquipment])
      : undefined;
    const excluded = new Set(excludedBodyAreas);
    for (const section of sections) {
      for (const item of section.items) {
        const exercise = exerciseById.get(item.exerciseId);
        if (!exercise) {
          errors.push(
            `${section.type} references unknown exercise ${item.exerciseId}.`,
          );
          continue;
        }
        if (!exercise.sessionRoles.includes(section.type)) {
          errors.push(`${exercise.id} is not valid for ${section.type}.`);
        }
        if (section.type !== "main" && exercise.sessionIntensity !== "low") {
          errors.push(`${exercise.id} is too intense for ${section.type}.`);
        }
        if (
          equipment &&
          exercise.equipment.some((item) => !equipment.has(item))
        ) {
          errors.push(`${exercise.id} requires unavailable equipment.`);
        }
        if (exercise.bodyAreas.some((area) => excluded.has(area))) {
          errors.push(`${exercise.id} conflicts with an excluded body area.`);
        }
      }
    }
  }
  return errors;
}
