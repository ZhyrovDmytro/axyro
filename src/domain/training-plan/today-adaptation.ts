import { isExercisePlanEligible } from "@/domain/content/catalog-quality";
import type {
  BodyArea,
  Equipment,
  Exercise,
} from "@/domain/exercise/exercise.types";
import { classifySessionDuration } from "@/domain/workout/session-duration";
import {
  buildWarmupSection,
  calculateSessionSectionDuration,
  calculateSessionSectionsDuration,
  flattenSessionSections,
  getSessionSection,
} from "@/domain/workout/session-sections";
import type {
  SessionSection,
  Workout,
  WorkoutItem,
} from "@/domain/workout/workout.types";

import { feedbackAffectedBodyAreas } from "./feedback-adaptation";
import { generateSessionPrescription } from "./generate-training-plan";
import type {
  PlannedWorkout,
  SessionAdaptation,
  SessionAdjustment,
} from "./training-plan.types";

type ReplacementContext = {
  exercise: Exercise;
  session: Pick<PlannedWorkout, "workout"> &
    Partial<Pick<PlannedWorkout, "sections">>;
  exerciseCatalog: readonly Exercise[];
  sectionType?: SessionSection["type"];
  availableEquipment?: readonly Equipment[];
  unavailableEquipment?: readonly Equipment[];
  excludedBodyAreas?: readonly BodyArea[];
};

export type ExerciseReplacementCandidate = {
  exercise: Exercise;
  score: number;
  sharedRoles: string[];
  sharedTargetedQualities: string[];
  sharedQualities: string[];
  sharedBodyAreas: BodyArea[];
};

export type TodayAdaptationResult = {
  workout: Workout;
  sections: SessionSection[];
  targetDurationSeconds: number;
  estimatedDurationSeconds: number;
  durationDeltaSeconds: number;
  adjustments: SessionAdjustment[];
  adaptations: SessionAdaptation[];
  affectedExerciseCount: number;
  replacedExerciseCount: number;
  removedExerciseCount: number;
  changedRoundCount: number;
  unresolvedExerciseCount: number;
};

function cloneWorkoutItem(item: WorkoutItem): WorkoutItem {
  return {
    ...item,
    prescription: { ...item.prescription },
    ...(item.notes ? { notes: [...item.notes] } : {}),
  };
}

function cloneWorkout(workout: Workout): Workout {
  return { ...workout, items: workout.items.map(cloneWorkoutItem) };
}

function cloneSections(sections: readonly SessionSection[]): SessionSection[] {
  return sections.map((section) => ({
    ...section,
    items: section.items.map(cloneWorkoutItem),
  }));
}

function difficultyDistance(left: Exercise, right: Exercise) {
  const order = { beginner: 0, intermediate: 1, advanced: 2 } as const;
  return Math.abs(order[left.difficulty] - order[right.difficulty]);
}

function defaultWorkSeconds(exercise: Exercise) {
  const prescription = exercise.defaultPrescription;
  return "workDurationSeconds" in prescription
    ? prescription.workDurationSeconds
    : (prescription.durationSeconds?.min ?? 30);
}

function shares<T>(left: readonly T[], right: readonly T[]) {
  const rightValues = new Set(right);
  return left.filter((value) => rightValues.has(value));
}

function equipmentIsAvailable(
  exercise: Exercise,
  unavailable: ReadonlySet<Equipment>,
  available?: ReadonlySet<Equipment>,
) {
  return exercise.equipment.every(
    (equipment) =>
      equipment === "none" ||
      (!unavailable.has(equipment) && (!available || available.has(equipment))),
  );
}

export function getReplacementCandidates({
  exercise,
  session,
  exerciseCatalog,
  sectionType = "main",
  availableEquipment,
  unavailableEquipment = [],
  excludedBodyAreas = [],
}: ReplacementContext): ExerciseReplacementCandidate[] {
  const unavailable = new Set(unavailableEquipment);
  const available = availableEquipment
    ? new Set<Equipment>(availableEquipment)
    : undefined;
  const excluded = new Set(excludedBodyAreas);
  const sessionExerciseIds = new Set(
    (session.sections
      ? flattenSessionSections(session.sections)
      : session.workout.items
    ).map((item) => item.exerciseId),
  );
  const availableSetup = new Set(
    session.workout.items.flatMap(
      (item) =>
        exerciseCatalog.find((candidate) => candidate.id === item.exerciseId)
          ?.setupRequirements ?? [],
    ),
  );

  return exerciseCatalog
    .filter(
      (candidate) =>
        isExercisePlanEligible(candidate) &&
        candidate.id !== exercise.id &&
        !sessionExerciseIds.has(candidate.id) &&
        candidate.sessionRoles.includes(sectionType) &&
        equipmentIsAvailable(candidate, unavailable, available) &&
        candidate.bodyAreas.every((area) => !excluded.has(area)) &&
        candidate.setupRequirements.every((setup) => availableSetup.has(setup)),
    )
    .map((candidate) => {
      const sharedRoles = shares(exercise.roles, candidate.roles);
      const sharedTargetedQualities = shares(
        exercise.targetedQualities,
        candidate.targetedQualities,
      );
      const sharedQualities = shares(exercise.qualities, candidate.qualities);
      const sharedBodyAreas = shares(exercise.bodyAreas, candidate.bodyAreas);
      const primaryBodyAreaMatch =
        exercise.bodyAreas[0] === candidate.bodyAreas[0];
      const workDifference = Math.abs(
        defaultWorkSeconds(exercise) - defaultWorkSeconds(candidate),
      );
      const sessionFocusMatches = candidate.qualities.filter((quality) =>
        session.workout.focus.includes(quality),
      ).length;
      const score =
        sharedRoles.length * 40 +
        sharedTargetedQualities.length * 25 +
        Number(primaryBodyAreaMatch) * 20 +
        sharedBodyAreas.length * 8 +
        sharedQualities.length * 12 +
        Math.max(0, 10 - difficultyDistance(exercise, candidate) * 5) +
        Math.max(0, 8 - Math.floor(workDifference / 5)) +
        sessionFocusMatches * 5 +
        Number(exercise.laterality === candidate.laterality) * 3;
      return {
        exercise: candidate,
        score,
        sharedRoles,
        sharedTargetedQualities,
        sharedQualities,
        sharedBodyAreas,
      };
    })
    .filter(
      (candidate) =>
        candidate.sharedRoles.length > 0 ||
        candidate.sharedTargetedQualities.length > 0 ||
        candidate.sharedQualities.length > 0,
    )
    .sort(
      (left, right) =>
        right.score - left.score ||
        left.exercise.id.localeCompare(right.exercise.id),
    );
}

function replacementItem(
  item: WorkoutItem,
  replacement: Exercise,
): WorkoutItem {
  const preserved = { ...item };
  delete preserved.guidanceOverride;
  delete preserved.notes;
  const defaults = replacement.defaultPrescription;
  const defaultSets =
    "workDurationSeconds" in defaults ? defaults.rounds : defaults.sets.min;
  const defaultWork = defaultWorkSeconds(replacement);
  const perSide =
    "workDurationSeconds" in defaults
      ? defaults.sideMode === "separate"
      : replacement.laterality === "unilateral";
  return {
    ...preserved,
    exerciseId: replacement.id,
    prescription: {
      type: "timed",
      durationSeconds: item.prescription.durationSeconds,
      ...(perSide ? { perSide: true } : {}),
    },
    minSets: Math.min(item.sets, defaultSets),
    maxSets: Math.max(item.sets, defaultSets),
    minWorkSeconds: Math.min(item.prescription.durationSeconds, defaultWork),
    maxWorkSeconds: Math.max(item.prescription.durationSeconds, defaultWork),
  };
}

function updateExercise(
  workout: Workout,
  originalExerciseId: string,
  replacement: Exercise,
) {
  return {
    ...workout,
    items: workout.items.map((item) =>
      item.exerciseId === originalExerciseId
        ? replacementItem(item, replacement)
        : item,
    ),
  };
}

function mappedBodyAreas(adaptations: readonly SessionAdaptation[]) {
  return new Set<BodyArea>(
    adaptations.flatMap((adaptation) => {
      if (adaptation.type !== "body_area_discomfort") return [];
      return adaptation.bodyAreas.flatMap((area) =>
        area === "other" ? [] : feedbackAffectedBodyAreas[area],
      );
    }),
  );
}

function existingSafetyBodyAreas(
  session: PlannedWorkout,
  exerciseById: ReadonlyMap<string, Exercise>,
) {
  return session.adjustments.flatMap((adjustment) =>
    adjustment.source === "safety"
      ? adjustment.affectedArea === "other"
        ? (exerciseById.get(adjustment.exerciseId)?.bodyAreas ?? [])
        : feedbackAffectedBodyAreas[adjustment.affectedArea]
      : [],
  );
}

function adaptationEquipment(adaptations: readonly SessionAdaptation[]) {
  return new Set<Equipment>(
    adaptations.flatMap((adaptation) =>
      adaptation.type === "equipment_unavailable"
        ? adaptation.equipmentIds
        : [],
    ),
  );
}

function replaceInvalidExercises({
  workout,
  session,
  exerciseCatalog,
  availableEquipment,
  unavailableEquipment,
  excludedBodyAreas,
  reason,
  sectionType,
  adjustments,
}: {
  workout: Workout;
  session: PlannedWorkout;
  exerciseCatalog: readonly Exercise[];
  availableEquipment: ReadonlySet<Equipment>;
  unavailableEquipment: ReadonlySet<Equipment>;
  excludedBodyAreas: ReadonlySet<BodyArea>;
  reason: "equipment" | "comfort";
  sectionType: SessionSection["type"];
  adjustments: SessionAdjustment[];
}) {
  const exerciseById = new Map(
    exerciseCatalog.map((exercise) => [exercise.id, exercise]),
  );
  let next = workout;
  let affectedExerciseCount = 0;
  let replacedExerciseCount = 0;
  let removedExerciseCount = 0;
  for (const item of workout.items) {
    const exercise = exerciseById.get(item.exerciseId);
    if (!exercise) continue;
    const equipmentBlocked = exercise.equipment.some((equipment) =>
      unavailableEquipment.has(equipment),
    );
    const bodyAreaBlocked = exercise.bodyAreas.some((area) =>
      excludedBodyAreas.has(area),
    );
    if (
      (reason === "equipment" && !equipmentBlocked) ||
      (reason === "comfort" && !bodyAreaBlocked)
    ) {
      continue;
    }
    affectedExerciseCount += 1;
    const replacement = getReplacementCandidates({
      exercise,
      session: {
        workout: next,
        sections: [
          { type: sectionType, items: next.items },
          ...session.sections.filter(
            (section) =>
              section.type !== sectionType &&
              (sectionType === "main" || section.type === "main"),
          ),
        ],
      },
      exerciseCatalog,
      sectionType,
      availableEquipment: [...availableEquipment],
      unavailableEquipment: [...unavailableEquipment],
      excludedBodyAreas: [...excludedBodyAreas],
    })[0]?.exercise;
    if (replacement) {
      next = updateExercise(next, exercise.id, replacement);
      adjustments.push({
        source: "today_adaptation",
        type:
          reason === "equipment"
            ? "equipment_replacement"
            : "comfort_replacement",
        originalExerciseId: exercise.id,
        replacementExerciseId: replacement.id,
        ...(reason === "equipment"
          ? { unavailableEquipment: [...unavailableEquipment] }
          : {
              excludedBodyAreas: session.todayAdaptations.flatMap(
                (adaptation) =>
                  adaptation.type === "body_area_discomfort"
                    ? adaptation.bodyAreas
                    : [],
              ),
            }),
      });
      replacedExerciseCount += 1;
    } else if (next.items.length > 1) {
      next = {
        ...next,
        items: next.items.filter((candidate) => candidate.id !== item.id),
      };
      adjustments.push({
        source: "today_adaptation",
        type: "exercise_removed",
        exerciseId: exercise.id,
        ...(reason === "equipment"
          ? { unavailableEquipment: [...unavailableEquipment] }
          : {
              excludedBodyAreas: session.todayAdaptations.flatMap(
                (adaptation) =>
                  adaptation.type === "body_area_discomfort"
                    ? adaptation.bodyAreas
                    : [],
              ),
            }),
      });
      removedExerciseCount += 1;
    }
  }
  return {
    workout: next,
    affectedExerciseCount,
    replacedExerciseCount,
    removedExerciseCount,
  };
}

function applyLighterSession(
  workout: Workout,
  exerciseById: ReadonlyMap<string, Exercise>,
  adjustments: SessionAdjustment[],
) {
  const eligible = workout.items
    .filter((item) => {
      const exercise = exerciseById.get(item.exerciseId);
      return (
        exercise &&
        !exercise.qualities.includes("warm-up") &&
        item.prescription.durationSeconds >
          (item.minWorkSeconds ?? item.prescription.durationSeconds)
      );
    })
    .sort(
      (left, right) =>
        (right.priority ?? 50) - (left.priority ?? 50) ||
        left.id.localeCompare(right.id),
    )
    .slice(0, 2);
  if (eligible.length === 0) return workout;
  const eligibleIds = new Set(eligible.map((item) => item.id));
  const deltaSeconds = Math.min(
    5,
    ...eligible.map(
      (item) =>
        item.prescription.durationSeconds -
        (item.minWorkSeconds ?? item.prescription.durationSeconds),
    ),
  );
  let next = {
    ...workout,
    items: workout.items.map((item) =>
      eligibleIds.has(item.id)
        ? {
            ...item,
            prescription: {
              ...item.prescription,
              durationSeconds: item.prescription.durationSeconds - deltaSeconds,
            },
          }
        : item,
    ),
  };
  adjustments.push({
    source: "today_adaptation",
    type: "lighter_work",
    exerciseIds: eligible.map((item) => item.exerciseId),
    deltaSeconds,
  });
  const recoveryItem = next.items.find(
    (item) => eligibleIds.has(item.id) && item.sets > 1,
  );
  if (recoveryItem) {
    next = {
      ...next,
      items: next.items.map((item) =>
        item.id === recoveryItem.id
          ? {
              ...item,
              restAfterSetSeconds: (item.restAfterSetSeconds ?? 0) + 5,
            }
          : item,
      ),
    };
    adjustments.push({
      source: "today_adaptation",
      type: "lighter_recovery",
      exerciseId: recoveryItem.exerciseId,
      deltaSeconds: 5,
    });
  }
  return next;
}

export function deriveTodayAdaptedSession({
  session,
  adaptations,
  exerciseCatalog,
}: {
  session: PlannedWorkout;
  adaptations: readonly SessionAdaptation[];
  exerciseCatalog: readonly Exercise[];
}): TodayAdaptationResult {
  const original = session.originalSessionSnapshot;
  const exerciseById = new Map(
    exerciseCatalog.map((exercise) => [exercise.id, exercise]),
  );
  const unavailableEquipment = adaptationEquipment(adaptations);
  const availableEquipment = new Set<Equipment>(
    flattenSessionSections(original.sections).flatMap(
      (item) => exerciseById.get(item.exerciseId)?.equipment ?? [],
    ),
  );
  unavailableEquipment.forEach((equipment) =>
    availableEquipment.delete(equipment),
  );
  const excludedBodyAreas = mappedBodyAreas(adaptations);
  existingSafetyBodyAreas(session, exerciseById).forEach((area) =>
    excludedBodyAreas.add(area),
  );
  let sections = cloneSections(original.sections);
  let workout = {
    ...cloneWorkout(original.workout),
    items: getSessionSection(sections, "main")?.items ?? original.workout.items,
  };
  const adjustments: SessionAdjustment[] = [];
  const affectedExerciseCount = flattenSessionSections(
    original.sections,
  ).filter((item) => {
    const current = exerciseById.get(item.exerciseId);
    return (
      current &&
      (current.equipment.some((equipment) =>
        unavailableEquipment.has(equipment),
      ) ||
        current.bodyAreas.some((area) => excludedBodyAreas.has(area)))
    );
  }).length;
  let replacedExerciseCount = 0;
  let removedExerciseCount = 0;
  let replacedMainExercise = false;

  for (const reason of ["comfort", "equipment"] as const) {
    sections = sections.map((section) => {
      const result = replaceInvalidExercises({
        workout: { ...workout, items: section.items },
        session: { ...session, sections, todayAdaptations: [...adaptations] },
        exerciseCatalog,
        availableEquipment,
        unavailableEquipment,
        excludedBodyAreas,
        reason,
        sectionType: section.type,
        adjustments,
      });
      replacedExerciseCount += result.replacedExerciseCount;
      removedExerciseCount += result.removedExerciseCount;
      return { ...section, items: result.workout.items };
    });
  }
  workout = {
    ...workout,
    items: getSessionSection(sections, "main")?.items ?? workout.items,
  };

  for (const adaptation of adaptations) {
    if (adaptation.type !== "replace_exercise") continue;
    const current = exerciseById.get(adaptation.exerciseId);
    const replacement = exerciseById.get(adaptation.replacementExerciseId);
    if (!current || !replacement) continue;
    const valid = getReplacementCandidates({
      exercise: current,
      session: { workout, sections },
      exerciseCatalog,
      sectionType: "main",
      availableEquipment: [...availableEquipment],
      unavailableEquipment: [...unavailableEquipment],
      excludedBodyAreas: [...excludedBodyAreas],
    }).some((candidate) => candidate.exercise.id === replacement.id);
    if (!valid) continue;
    sections = sections.map((section) => ({
      ...section,
      items: updateExercise(
        { ...workout, items: section.items },
        current.id,
        replacement,
      ).items,
    }));
    workout = {
      ...workout,
      items: getSessionSection(sections, "main")?.items ?? workout.items,
    };
    adjustments.push({
      source: "today_adaptation",
      type: "exercise_replacement",
      originalExerciseId: current.id,
      replacementExerciseId: replacement.id,
    });
    replacedMainExercise = true;
    replacedExerciseCount += 1;
  }

  if (replacedMainExercise) {
    const warmup = buildWarmupSection({
      mainWorkout: workout,
      exerciseCatalog,
      targetDurationSeconds: original.targetDurationSeconds,
      availableEquipment: [...availableEquipment],
      excludedBodyAreas: [...excludedBodyAreas],
    });
    sections = sections.map((section) =>
      section.type === "warmup" ? warmup : section,
    );
  }

  if (adaptations.some((adaptation) => adaptation.type === "lighter_session")) {
    workout = applyLighterSession(workout, exerciseById, adjustments);
    sections = sections.map((section) =>
      section.type === "main" ? { ...section, items: workout.items } : section,
    );
  }

  const lessTime = adaptations.find(
    (adaptation) => adaptation.type === "less_time",
  );
  let targetDurationSeconds = original.targetDurationSeconds;
  let durationAdjustments: SessionAdjustment[] = [];
  if (lessTime?.type === "less_time") {
    targetDurationSeconds = Math.min(
      lessTime.requestedDurationSeconds,
      original.targetDurationSeconds,
    );
    const protectedExerciseIds = new Set(
      workout.items.flatMap((item) => {
        const exercise = exerciseById.get(item.exerciseId);
        return exercise?.qualities.includes("warm-up") ? [item.exerciseId] : [];
      }),
    );
    const fittingCatalog = exerciseCatalog.filter(
      (exercise) =>
        isExercisePlanEligible(exercise) &&
        equipmentIsAvailable(
          exercise,
          unavailableEquipment,
          availableEquipment,
        ) &&
        exercise.bodyAreas.every((area) => !excludedBodyAreas.has(area)),
    );
    const supportDurationSeconds = sections
      .filter((section) => section.type !== "main")
      .reduce(
        (total, section) => total + calculateSessionSectionDuration(section),
        0,
      );
    const mainTargetDurationSeconds = Math.max(
      60,
      targetDurationSeconds - supportDurationSeconds,
    );
    const fitted = generateSessionPrescription(
      workout,
      mainTargetDurationSeconds / 60,
      fittingCatalog.filter(
        (exercise) =>
          !sections.some(
            (section) =>
              section.type !== "main" &&
              section.items.some((item) => item.exerciseId === exercise.id),
          ),
      ),
      protectedExerciseIds,
    );
    workout = fitted.workout;
    sections = sections.map((section) =>
      section.type === "main" ? { ...section, items: workout.items } : section,
    );
    durationAdjustments = fitted.adjustments;
    adjustments.push({
      source: "today_adaptation",
      type: "shortened",
      originalDurationSeconds: original.estimatedDurationSeconds,
      requestedDurationSeconds: targetDurationSeconds,
    });
  }

  const estimatedDurationSeconds = calculateSessionSectionsDuration(sections);
  const originalRounds = new Map(
    original.workout.items.map((item) => [item.id, item.sets]),
  );
  const unresolvedExerciseCount = flattenSessionSections(sections).filter(
    (item) => {
      const current = exerciseById.get(item.exerciseId);
      return (
        !current ||
        !equipmentIsAvailable(
          current,
          unavailableEquipment,
          availableEquipment,
        ) ||
        current.bodyAreas.some((area) => excludedBodyAreas.has(area))
      );
    },
  ).length;
  const inheritedReasons = original.adjustments.filter(
    (adjustment) => adjustment.source !== "duration_fit",
  );
  const inheritedDurationReasons = original.adjustments.filter(
    (adjustment) => adjustment.source === "duration_fit",
  );
  return {
    workout: {
      ...workout,
      estimatedMinutes: Math.max(1, Math.round(estimatedDurationSeconds / 60)),
    },
    sections,
    targetDurationSeconds,
    estimatedDurationSeconds,
    durationDeltaSeconds: estimatedDurationSeconds - targetDurationSeconds,
    adjustments: [
      ...inheritedReasons,
      ...adjustments,
      ...inheritedDurationReasons,
      ...durationAdjustments,
    ],
    adaptations: [...adaptations],
    affectedExerciseCount,
    replacedExerciseCount,
    removedExerciseCount,
    changedRoundCount: workout.items.filter(
      (item) => originalRounds.get(item.id) !== item.sets,
    ).length,
    unresolvedExerciseCount,
  };
}

export function applyTodayAdaptationsToSession(
  session: PlannedWorkout,
  adaptations: readonly SessionAdaptation[],
  exerciseCatalog: readonly Exercise[],
): PlannedWorkout {
  const result = deriveTodayAdaptedSession({
    session,
    adaptations,
    exerciseCatalog,
  });
  if (result.unresolvedExerciseCount > 0) return session;
  return {
    ...session,
    workout: result.workout,
    sections: result.sections,
    targetDurationSeconds: result.targetDurationSeconds,
    estimatedDurationSeconds: result.estimatedDurationSeconds,
    durationDeltaSeconds: result.durationDeltaSeconds,
    durationStatus: classifySessionDuration(
      result.estimatedDurationSeconds,
      result.targetDurationSeconds,
    ),
    adjustments: result.adjustments,
    todayAdaptations: result.adaptations,
  };
}

export function resetTodayAdaptations(session: PlannedWorkout): PlannedWorkout {
  const original = session.originalSessionSnapshot;
  return {
    ...session,
    workout: cloneWorkout(original.workout),
    sections: cloneSections(original.sections),
    targetDurationSeconds: original.targetDurationSeconds,
    estimatedDurationSeconds: original.estimatedDurationSeconds,
    durationDeltaSeconds: original.durationDeltaSeconds,
    durationStatus: original.durationStatus,
    adjustments: [...original.adjustments],
    todayAdaptations: [],
  };
}

export function getTodaySessionEquipment(
  workout: Workout,
  exerciseCatalog: readonly Exercise[],
  sections: readonly SessionSection[] = [
    { type: "main", items: workout.items },
  ],
) {
  const exerciseById = new Map(
    exerciseCatalog.map((exercise) => [exercise.id, exercise]),
  );
  return [
    ...new Set(
      flattenSessionSections(sections).flatMap(
        (item) => exerciseById.get(item.exerciseId)?.equipment ?? [],
      ),
    ),
  ].filter(
    (equipment): equipment is Exclude<Equipment, "none"> =>
      equipment !== "none",
  );
}
