import { publishedExercises } from "@/content/exercises";
import { getSessionDurationToleranceSeconds } from "@/domain/workout/session-duration";
import {
  calculateMainWorkoutFitTarget,
  calculateSessionSectionDuration,
  validateGeneratedSessionSections,
} from "@/domain/workout/session-sections";
import type { DailyDuration } from "@/domain/workout/daily-duration";
import type {
  SessionActivity,
  WorkoutFeedbackEvent,
} from "@/services/persistence/workout-activity-repository";

import {
  defaultAdaptationProfile,
  type AdaptationProfile,
} from "./adaptation-profile";
import {
  addDays,
  crossesPlanAdjustmentWindow,
  formatPlanDate,
  fromDateKey,
  preferredDayIndexes,
} from "./date";
import {
  buildDefaultWorkoutItem,
  gameRecoveryDays,
  generateSessionPrescription,
  generateTrainingPlan,
  getBlockedBodyAreas,
  profileExerciseEquipment,
  refreshPlannedWorkoutDuration,
} from "./generate-training-plan";
import { isCompatiblePlanExercise } from "./model-exercise-candidates";
import { questionnaireFocusForSlot } from "./questionnaire-context";
import { getPlanWeekNumber } from "./progression";
import { getReplacementCandidates } from "./today-adaptation";
import { athleteProfileSchema } from "./training-plan.schema";
import type {
  AthleteProfile,
  PlannedWorkout,
  TrainingPlan,
} from "./training-plan.types";

export const maxReplacementExercises = 5;

export type AdjustmentScope = "week" | "ongoing";
export type PlanAdjustment =
  | {
      kind: "schedule";
      days: AthleteProfile["preferredDays"];
      scope: AdjustmentScope;
    }
  | { kind: "duration"; minutes: DailyDuration; scope: AdjustmentScope }
  | {
      kind: "equipment";
      equipment: AthleteProfile["equipment"];
      scope: AdjustmentScope;
    }
  | { kind: "comfort"; areas: AthleteProfile["painAreas"] }
  | {
      kind: "focus";
      areas: AthleteProfile["developmentAreas"];
      priorities: AthleteProfile["padelLimitations"];
    }
  | { kind: "lighter" | "harder" }
  | { kind: "movement"; exerciseIds: string[] };

type Change = {
  id: string;
  date: string;
  action: "Add" | "Move" | "Update" | "Remove" | "Leave open";
  title: string;
  detail: string;
};
type AdjustmentConflict = {
  key: string;
  date: string;
  title: string;
  action: "Remove workout" | "Leave day open";
};
const byId = new Map(
  publishedExercises.map((exercise) => [exercise.id, exercise]),
);

export function adjustmentWindow(
  plan: TrainingPlan,
  today: string,
  scope: AdjustmentScope,
) {
  const weekEnd = addDays(today, 6);
  return {
    start: today,
    end: scope === "week" && weekEnd < plan.endDate ? weekEnd : plan.endDate,
  };
}

export function planProfileOnDate(
  plan: TrainingPlan,
  date: string,
): AthleteProfile {
  return (plan.adjustmentWindows ?? []).reduce(
    (profile, entry) =>
      date >= entry.start && date <= entry.end
        ? { ...profile, ...entry.profile }
        : profile,
    plan.profile,
  );
}

export function planAvoidedExercisesOnDate(
  plan: TrainingPlan,
  date: string,
): string[] {
  return (plan.adjustmentWindows ?? []).flatMap((entry) =>
    date >= entry.start && date <= entry.end
      ? (entry.exerciseIds ?? (entry.exerciseId ? [entry.exerciseId] : []))
      : [],
  );
}

function sameDays(
  a: AthleteProfile["preferredDays"],
  b: AthleteProfile["preferredDays"],
) {
  return a.length === b.length && a.every((day) => b.includes(day));
}

function adjustmentPatch(request: PlanAdjustment): Partial<AthleteProfile> {
  switch (request.kind) {
    case "schedule":
      return {
        preferredDays: request.days,
        sessionsPerWeek: request.days.length,
      };
    case "duration":
      return { sessionDurationMinutes: request.minutes };
    case "equipment":
      return { equipment: request.equipment };
    case "comfort":
      return { painAreas: request.areas };
    case "focus":
      return {
        developmentAreas: request.areas,
        padelLimitations: request.priorities,
      };
    default:
      return {};
  }
}

function preserveSnapshot(
  session: PlannedWorkout,
  refresh: PlannedWorkout,
): PlannedWorkout {
  return {
    ...refresh,
    originalSessionSnapshot: {
      workout: refresh.workout,
      sections: refresh.sections,
      targetDurationSeconds: refresh.targetDurationSeconds,
      estimatedDurationSeconds: refresh.estimatedDurationSeconds,
      durationDeltaSeconds: refresh.durationDeltaSeconds,
      durationStatus: refresh.durationStatus,
      adjustments: refresh.adjustments,
    },
    weeklyAdaptedSessionSnapshot: undefined,
    todayAdaptations: [],
    isEdited: session.isEdited,
  };
}

export function proposePlanAdjustment({
  plan,
  request,
  today,
  activities,
  activeSessionId,
  recentFeedback,
  adaptationProfile,
  revisionId,
  resolvedConflicts = [],
}: {
  plan: TrainingPlan;
  request: PlanAdjustment;
  today: string;
  activities: readonly SessionActivity[];
  activeSessionId?: string;
  recentFeedback?: readonly WorkoutFeedbackEvent[];
  adaptationProfile?: AdaptationProfile;
  revisionId: string;
  resolvedConflicts?: readonly string[];
}) {
  if (today > plan.endDate) throw new Error("This training block has ended.");
  const requestedMovements = new Set(
    request.kind === "movement" ? request.exerciseIds : [],
  );
  if (requestedMovements.size > maxReplacementExercises)
    throw new Error(
      `Select up to ${maxReplacementExercises} exercises to replace.`,
    );
  const temporary =
    "scope" in request
      ? request.scope === "week"
      : request.kind !== "comfort" && request.kind !== "focus";
  const { start, end } = adjustmentWindow(
    plan,
    today,
    temporary ? "week" : "ongoing",
  );
  const patch = adjustmentPatch(request);
  const profile = athleteProfileSchema.parse({ ...plan.profile, ...patch });
  const statuses = new Map(
    activities
      .filter((activity) => activity.planId === plan.generatedAt)
      .map((activity) => [activity.sessionId, activity]),
  );
  const canChange = (session: PlannedWorkout) =>
    session.status === "scheduled" &&
    session.id !== activeSessionId &&
    session.scheduledDate >= start &&
    session.scheduledDate <= end &&
    (statuses.get(session.id)?.status ?? "scheduled") === "scheduled";
  const upcoming = plan.sessions
    .filter(canChange)
    .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate));
  const changed = new Map<string, PlannedWorkout | null>();
  const changes: Change[] = [];
  const conflicts: AdjustmentConflict[] = [];
  const show = (
    session: PlannedWorkout,
    action: Change["action"],
    detail: string,
    next?: PlannedWorkout,
  ) => {
    changed.set(session.id, next ?? null);
    changes.push({
      id: session.id,
      date: next?.scheduledDate ?? session.scheduledDate,
      action,
      title: next?.workout.name ?? session.workout.name,
      detail:
        session.isEdited && action !== "Add"
          ? `${detail} This is a workout you edited.`
          : detail,
    });
  };

  const resolveConflict = (date: string, session?: PlannedWorkout) => {
    const key = JSON.stringify([session?.id ?? null, date]);
    const title = session?.workout.name ?? "New training day";
    if (!resolvedConflicts.includes(key)) {
      conflicts.push({
        key,
        date: session?.scheduledDate ?? date,
        title,
        action: session ? "Remove workout" : "Leave day open",
      });
    } else if (session) {
      show(session, "Remove", "No compatible workout fits your changes");
    } else {
      changes.push({
        id: key,
        date,
        title,
        action: "Leave open",
        detail: "No compatible workout fits your changes",
      });
    }
  };

  const existingWindows = plan.adjustmentWindows ?? [];
  const nextWindows = existingWindows.filter(
    (entry) => entry.end >= today && (temporary || entry.kind !== request.kind),
  );
  const effective = (date: string) => ({
    ...planProfileOnDate(
      {
        ...plan,
        profile: temporary ? plan.profile : profile,
        adjustmentWindows: nextWindows,
      },
      date,
    ),
    ...patch,
  });
  const avoidedOnDate = (date: string) =>
    new Set([
      ...(adaptationProfile?.avoidExercises ?? []),
      ...planAvoidedExercisesOnDate(plan, date),
      ...requestedMovements,
    ]);
  const protectedDates = gameRecoveryDays(plan);
  const occupied = new Set(
    plan.sessions
      .filter(
        (session) =>
          !canChange(session) ||
          (request.kind === "schedule" &&
            Boolean(statuses.get(session.id)?.rescheduleCount)),
      )
      .map((session) => session.scheduledDate),
  );
  const candidates = new Map<string, TrainingPlan>();
  const rebuilt = (current: AthleteProfile, date: string) => {
    const avoidExercises = [...avoidedOnDate(date)];
    const key = JSON.stringify([current, avoidExercises]);
    const cached = candidates.get(key);
    if (cached) return cached;
    const blockedAreas = getBlockedBodyAreas(current);
    const fresh = generateTrainingPlan(
      { ...current, matches: [] },
      fromDateKey(plan.startDate),
      recentFeedback,
      {
        allowPartial: true,
        exerciseCatalog: publishedExercises.filter((exercise) =>
          exercise.bodyAreas.every((area) => !blockedAreas.has(area)),
        ),
        adaptationProfile: {
          ...(adaptationProfile ?? defaultAdaptationProfile),
          avoidExercises,
        },
      },
    );
    candidates.set(key, fresh);
    return fresh;
  };
  const generatedFor = (session: PlannedWorkout, current: AthleteProfile) => {
    const options = rebuilt(current, session.scheduledDate).sessions.filter(
      (candidate) => candidate.weekNumber === session.weekNumber,
    );
    const replacement =
      options.find(
        (candidate) => candidate.scheduledDate === session.scheduledDate,
      ) ??
      options.find(
        (candidate) => candidate.sourceWorkoutId === session.sourceWorkoutId,
      ) ??
      options[0];
    if (!replacement) return;
    return {
      ...replacement,
      id: session.id,
      scheduledDate: session.scheduledDate,
      isEdited: session.isEdited,
    };
  };

  function fit(
    session: PlannedWorkout,
    current: AthleteProfile,
    minutes: number,
  ) {
    const target = minutes * 60;
    const avoid = avoidedOnDate(session.scheduledDate);
    const blockedAreas = getBlockedBodyAreas(current);
    const catalog = publishedExercises.filter(
      (exercise) =>
        !avoid.has(exercise.id) &&
        exercise.bodyAreas.every((area) => !blockedAreas.has(area)) &&
        exercise.sessionRoles.some((section) =>
          isCompatiblePlanExercise(exercise, current, section),
        ),
    );
    const support = session.sections.filter(({ type }) => type !== "main");
    const supportSeconds = support.reduce(
      (total, section) => total + calculateSessionSectionDuration(section),
      0,
    );
    const supportIds = new Set(
      support.flatMap((section) =>
        section.items.map(({ exerciseId }) => exerciseId),
      ),
    );
    const workout = generateSessionPrescription(
      session.workout,
      calculateMainWorkoutFitTarget(
        session.workout,
        Math.max(60, target - supportSeconds),
      ) / 60,
      catalog.filter((exercise) => !supportIds.has(exercise.id)),
    ).workout;
    const updated = refreshPlannedWorkoutDuration({
      ...session,
      workout,
      targetDurationSeconds: target,
    });
    const errors = validateGeneratedSessionSections({
      sections: updated.sections,
      targetDurationSeconds: target,
      exerciseCatalog: catalog,
      availableEquipment: profileExerciseEquipment(current),
    });
    return !errors.length &&
      Math.abs(updated.durationDeltaSeconds) <=
        getSessionDurationToleranceSeconds(target)
      ? preserveSnapshot(session, updated)
      : generatedFor(session, current);
  }

  const scheduleChanged =
    request.kind === "schedule" &&
    ((!temporary && !sameDays(plan.profile.preferredDays, request.days)) ||
      upcoming.some(
        ({ scheduledDate }) =>
          !sameDays(
            planProfileOnDate(plan, scheduledDate).preferredDays,
            request.days,
          ),
      ));
  if (request.kind === "schedule" && scheduleChanged) {
    const days = new Set(preferredDayIndexes(profile));
    const weeks = new Map<number, string[]>();
    for (let date = start; date <= end; date = addDays(date, 1)) {
      const week = getPlanWeekNumber(plan.startDate, date);
      if (!week) continue;
      const dates = weeks.get(week) ?? [];
      if (
        days.has(fromDateKey(date).getDay()) &&
        !occupied.has(date) &&
        !protectedDates.has(date)
      )
        dates.push(date);
      weeks.set(week, dates);
    }
    for (const [week, dates] of weeks) {
      const inWeek = (session: PlannedWorkout) =>
        getPlanWeekNumber(plan.startDate, session.scheduledDate) === week;
      const movable = upcoming.filter(
        (session) =>
          inWeek(session) && !statuses.get(session.id)?.rescheduleCount,
      );
      const fixed = plan.sessions.filter(
        (session) =>
          inWeek(session) &&
          !movable.includes(session) &&
          session.status !== "cancelled" &&
          session.status !== "skipped",
      ).length;
      const slots = Math.max(0, profile.sessionsPerWeek - fixed);
      const kept = movable
        .filter((session) => dates.includes(session.scheduledDate))
        .slice(0, slots);
      const free = dates.filter(
        (date) => !kept.some((session) => session.scheduledDate === date),
      );
      let remaining = slots - kept.length;
      for (const session of movable.filter(
        (session) => !kept.includes(session),
      )) {
        const index =
          remaining > 0
            ? free.findIndex(
                (date) =>
                  !crossesPlanAdjustmentWindow(
                    { adjustmentWindows: nextWindows },
                    session.scheduledDate,
                    date,
                  ),
              )
            : -1;
        const date = index >= 0 ? free.splice(index, 1)[0] : undefined;
        if (date) {
          remaining -= 1;
          const current = effective(date);
          const moved = { ...session, scheduledDate: date };
          const avoid = avoidedOnDate(date);
          const blockedAreas = getBlockedBodyAreas(current);
          const compatible = session.sections.every((section) =>
            section.items.every(({ exerciseId }) => {
              const exercise = byId.get(exerciseId);
              return (
                exercise &&
                !avoid.has(exerciseId) &&
                exercise.bodyAreas.every((area) => !blockedAreas.has(area)) &&
                isCompatiblePlanExercise(exercise, current, section.type)
              );
            }),
          );
          const next =
            compatible &&
            session.targetDurationSeconds ===
              current.sessionDurationMinutes * 60
              ? moved
              : generatedFor(moved, current);
          if (!next) {
            resolveConflict(date, session);
            continue;
          }
          show(
            session,
            "Move",
            `From ${formatPlanDate(session.scheduledDate)}${next === moved ? ". Same workout." : ". Updated to fit the new date."}`,
            next,
          );
        } else show(session, "Remove", "Outside your revised training days");
      }
      if (!temporary) {
        for (const date of free.slice(0, remaining)) {
          const current = effective(date);
          const source = rebuilt(current, date).sessions.find(
            (session) => session.scheduledDate === date,
          );
          if (!source) {
            resolveConflict(date);
            continue;
          }
          const next = { ...source, id: `adjusted-${date}-${revisionId}` };
          show(next, "Add", "Fits your revised training days", next);
        }
      }
    }
  } else {
    for (const session of upcoming) {
      const current = effective(session.scheduledDate);
      const avoid = avoidedOnDate(session.scheduledDate);
      const blockedAreas = getBlockedBodyAreas(current);
      const allowed = (
        id: string,
        section: PlannedWorkout["sections"][number]["type"],
      ) => {
        const exercise = byId.get(id);
        return Boolean(
          exercise &&
          !avoid.has(id) &&
          exercise.bodyAreas.every((area) => !blockedAreas.has(area)) &&
          isCompatiblePlanExercise(exercise, current, section),
        );
      };
      let next: PlannedWorkout | undefined;
      let detail = "";
      if (
        request.kind === "duration" &&
        session.targetDurationSeconds !== request.minutes * 60
      ) {
        next = fit(session, current, request.minutes);
        if (!next) {
          resolveConflict(session.scheduledDate, session);
          continue;
        }
        detail = `${Math.round(session.targetDurationSeconds / 60)} min → ${request.minutes} min`;
      } else if (request.kind === "focus") {
        if (session.isEdited) continue;
        const slot = Math.max(
          0,
          Number(session.sourceWorkoutId.match(/-session-(\d+)$/)?.[1] ?? 1) -
            1,
        );
        if (
          JSON.stringify(questionnaireFocusForSlot(plan.profile, slot)) ===
          JSON.stringify(questionnaireFocusForSlot(current, slot))
        )
          continue;
        const generated = generatedFor(session, current);
        if (!generated) {
          resolveConflict(session.scheduledDate, session);
          continue;
        }
        if (
          JSON.stringify(
            generated.workout.items.map((item) => item.exerciseId),
          ) ===
          JSON.stringify(session.workout.items.map((item) => item.exerciseId))
        )
          continue;
        next = generated;
        detail = `New focus replaces ${session.workout.name}`;
      } else if (
        request.kind === "equipment" ||
        request.kind === "comfort" ||
        request.kind === "movement"
      ) {
        const conflict = (
          id: string,
          section: PlannedWorkout["sections"][number]["type"],
        ) =>
          request.kind === "movement"
            ? requestedMovements.has(id)
            : !allowed(id, section);
        if (
          !session.sections.some((section) =>
            section.items.some((item) =>
              conflict(item.exerciseId, section.type),
            ),
          )
        )
          continue;
        const used = new Set(
          session.sections.flatMap((section) =>
            section.items.map((item) => item.exerciseId),
          ),
        );
        const swaps: string[] = [];
        let unavailable = false;
        const sections = session.sections.map((section) => ({
          ...section,
          items: section.items.map((item) => {
            if (!conflict(item.exerciseId, section.type)) return item;
            const original = byId.get(item.exerciseId);
            const replacement =
              original &&
              getReplacementCandidates({
                exercise: original,
                session,
                exerciseCatalog: publishedExercises,
                sectionType: section.type,
                availableEquipment: profileExerciseEquipment(current),
                constraints: { profile: current, avoidExercises: [...avoid] },
              }).find(
                ({ exercise }) =>
                  !used.has(exercise.id) && allowed(exercise.id, section.type),
              )?.exercise;
            const defaults =
              replacement &&
              buildDefaultWorkoutItem(session.workout, replacement);
            if (!replacement || !defaults) {
              unavailable = true;
              return item;
            }
            used.add(replacement.id);
            swaps.push(`${original.name} → ${replacement.name}`);
            return {
              ...defaults,
              id: item.id,
              role: item.role,
              priority: item.priority,
            };
          }),
        }));
        const main = sections.find((section) => section.type === "main");
        const replaced = refreshPlannedWorkoutDuration({
          ...session,
          sections,
          workout: {
            ...session.workout,
            items: main?.items ?? session.workout.items,
          },
        });
        if (
          unavailable ||
          Math.abs(replaced.durationDeltaSeconds) >
            getSessionDurationToleranceSeconds(session.targetDurationSeconds)
        ) {
          next = generatedFor(session, current);
          if (!next) {
            resolveConflict(session.scheduledDate, session);
            continue;
          }
          const replacedNames = [...used]
            .filter((id) => requestedMovements.has(id))
            .map((id) => byId.get(id)?.name ?? id);
          detail =
            request.kind === "movement"
              ? `Replaces ${session.workout.name} to avoid ${replacedNames.join(", ")}`
              : `Replaces ${session.workout.name} to fit your updated ${request.kind === "equipment" ? "equipment" : "comfort settings"}`;
        } else {
          next = preserveSnapshot(session, replaced);
          detail = swaps.join(" · ");
        }
      } else if (request.kind === "lighter" || request.kind === "harder") {
        const harder = request.kind === "harder";
        if (
          (harder && protectedDates.has(session.scheduledDate)) ||
          session.weeklyAdaptedSessionSnapshot ||
          session.todayAdaptations.some(
            ({ type }) => type === "lighter_session",
          ) ||
          existingWindows.some(
            (entry) =>
              entry.kind === request.kind &&
              entry.sessionIds.includes(session.id),
          )
        )
          continue;
        const items = session.workout.items.map((item) => {
          const exercise = byId.get(item.exerciseId);
          if (!exercise) return item;
          if (
            harder &&
            (exercise.qualities.includes("explosiveness") ||
              exercise.tempo.mode === "explosive_reset")
          )
            return item;
          const bounds = exercise.planning;
          const work = item.prescription.durationSeconds;
          const recovery = item.restAfterExerciseSeconds ?? 0;
          const intervals = item.sets * (item.prescription.perSide ? 2 : 1);
          const hasExerciseBreak =
            item !== session.workout.items.at(-1) ||
            session.sections.some(
              (section) => section.type === "cooldown" && section.items.length,
            );
          if (harder) {
            const minRest = Math.max(5, bounds.safeRestSeconds.min);
            const exerciseHeadroom = hasExerciseBreak
              ? Math.max(0, recovery - minRest)
              : 0;
            const setRest = item.restAfterSetSeconds ?? 0;
            const setBreaks = item.sets - 1;
            const setHeadroom = Math.max(0, setRest - minRest);
            const maxIncrease = Math.min(
              Math.round(work * 0.15),
              Math.min(
                item.maxWorkSeconds ?? work,
                bounds.safeWorkSeconds.max,
              ) - work,
              Math.floor(
                (exerciseHeadroom + setHeadroom * setBreaks) / intervals,
              ),
            );
            for (let increase = maxIncrease; increase > 0; increase--) {
              const extraWork = increase * intervals;
              const setReduction = setBreaks
                ? Math.min(setHeadroom, Math.floor(extraWork / setBreaks))
                : 0;
              const exerciseReduction = extraWork - setReduction * setBreaks;
              if (exerciseReduction > exerciseHeadroom) continue;
              return {
                ...item,
                prescription: {
                  ...item.prescription,
                  durationSeconds: work + increase,
                },
                restAfterSetSeconds: setReduction
                  ? setRest - setReduction
                  : item.restAfterSetSeconds,
                restAfterExerciseSeconds: exerciseReduction
                  ? recovery - exerciseReduction
                  : item.restAfterExerciseSeconds,
              };
            }
            return item;
          }
          if (!hasExerciseBreak) return item;
          const reduction = Math.max(
            0,
            Math.min(
              Math.round(work * 0.2),
              work - bounds.safeWorkSeconds.min,
              Math.floor((bounds.safeRestSeconds.max - recovery) / intervals),
            ),
          );
          return reduction
            ? {
                ...item,
                prescription: {
                  ...item.prescription,
                  durationSeconds: work - reduction,
                },
                restAfterExerciseSeconds: recovery + reduction * intervals,
              }
            : item;
        });
        const updated = refreshPlannedWorkoutDuration({
          ...session,
          workout: { ...session.workout, items },
        });
        if (
          items.every((item, index) => item === session.workout.items[index]) ||
          updated.estimatedDurationSeconds !== session.estimatedDurationSeconds
        )
          continue;
        next = preserveSnapshot(session, updated);
        detail = harder
          ? "More work and less recovery at the same duration"
          : "Less work and more recovery at the same duration";
      }
      if (next) {
        if (
          next.workout.name !== session.workout.name &&
          !detail.includes(session.workout.name)
        )
          detail += ` · Replaces ${session.workout.name}`;
        show(session, "Update", detail, next);
      }
    }
  }

  const fields = Object.entries(patch) as [keyof AthleteProfile, unknown][];
  const defaultsChanged =
    !temporary &&
    (request.kind !== "schedule" || scheduleChanged) &&
    fields.some(
      ([key, value]) =>
        JSON.stringify(value) !== JSON.stringify(plan.profile[key]),
    );
  const temporarySettingsChanged =
    temporary &&
    (request.kind !== "schedule" || scheduleChanged) &&
    upcoming.some(({ scheduledDate }) => {
      const current = planProfileOnDate(plan, scheduledDate);
      return fields.some(
        ([key, value]) =>
          JSON.stringify(value) !== JSON.stringify(current[key]),
      );
    });
  if (
    !temporary &&
    request.kind === "schedule" &&
    upcoming.length > 0 &&
    upcoming.every(({ id }) => changed.get(id) === null) &&
    changes.every(
      ({ action, detail }) =>
        action === "Remove" &&
        detail.startsWith("Outside your revised training days"),
    )
  ) {
    throw new Error(
      "There are no available training dates in the remaining block. Try different training days.",
    );
  }
  const sessions = plan.sessions.flatMap((session) =>
    changed.has(session.id) ? (changed.get(session.id) ?? []) : session,
  );
  const existingIds = new Set(plan.sessions.map(({ id }) => id));
  for (const [id, session] of changed)
    if (session && !existingIds.has(id)) sessions.push(session);
  const temporaryKind =
    request.kind !== "comfort" && request.kind !== "focus"
      ? request.kind
      : null;
  const windows = [
    ...nextWindows,
    ...(temporaryKind &&
    temporary &&
    (changes.length || temporarySettingsChanged)
      ? [
          {
            start,
            end,
            kind: temporaryKind,
            profile: patch,
            ...(request.kind === "movement"
              ? { exerciseIds: [...requestedMovements] }
              : {}),
            sessionIds: [...changed.keys()],
          },
        ]
      : []),
  ];
  // Including both prescriptions detects a competing edit even when the displayed date and title agree.
  const fingerprint = JSON.stringify({
    changes,
    defaultsChanged,
    temporarySettingsChanged,
    previousDefaults: Object.keys(patch).map(
      (key) => plan.profile[key as keyof AthleteProfile],
    ),
    before: plan.sessions.filter(({ id }) => changed.has(id)),
    after: [...changed.values()],
    avoidedExercises: [...requestedMovements],
    patch,
  });
  return {
    start,
    end,
    defaultsChanged,
    temporarySettingsChanged,
    fingerprint,
    canApply:
      conflicts.length === 0 &&
      Boolean(
        changes.length ||
        temporarySettingsChanged ||
        (defaultsChanged && upcoming.length),
      ),
    conflicts: conflicts.sort((a, b) => a.date.localeCompare(b.date)),
    changes: changes.sort((a, b) => a.date.localeCompare(b.date)),
    plan: {
      ...plan,
      profile: temporary ? plan.profile : profile,
      sessions: sessions.sort((a, b) =>
        a.scheduledDate.localeCompare(b.scheduledDate),
      ),
      adjustmentWindows: windows,
    } satisfies TrainingPlan,
  };
}

export function proposePlanAdjustments({
  requests,
  ...input
}: Omit<Parameters<typeof proposePlanAdjustment>[0], "request"> & {
  requests: readonly PlanAdjustment[];
}): ReturnType<typeof proposePlanAdjustment> {
  const results: ReturnType<typeof proposePlanAdjustment>[] = [];
  let plan = input.plan;
  for (const request of requests) {
    const result = proposePlanAdjustment({ ...input, plan, request });
    if (result.conflicts.length) return result;
    results.push(result);
    if (result.canApply) plan = result.plan;
  }
  if (results.length === 1) return results[0];

  const before = new Map(
    input.plan.sessions.map((session) => [session.id, session]),
  );
  const after = new Map(plan.sessions.map((session) => [session.id, session]));
  const bySession = new Map<string, Change>();
  for (const result of results) {
    for (const change of result.changes) bySession.set(change.id, change);
  }
  const changes = [...bySession]
    .flatMap(([id, change]): Change[] => {
      if (change.action === "Leave open") return [change];
      const previous = before.get(id);
      const next = after.get(id);
      if (JSON.stringify(previous) === JSON.stringify(next)) return [];
      const session = next ?? previous!;
      const moved = Boolean(
        previous && next && previous.scheduledDate !== next.scheduledDate,
      );
      const timeChanged =
        previous &&
        next &&
        previous.targetDurationSeconds !== next.targetDurationSeconds;
      const detail = [
        ...(moved && change.action !== "Move"
          ? [`From ${formatPlanDate(previous!.scheduledDate)}`]
          : []),
        ...(timeChanged && !change.detail.includes(" min → ")
          ? [
              `${Math.round(previous.targetDurationSeconds / 60)} min → ${Math.round(next.targetDurationSeconds / 60)} min`,
            ]
          : []),
        change.detail,
      ].join(" · ");
      return [
        {
          ...change,
          date: session.scheduledDate,
          title: session.workout.name,
          detail: detail || change.detail,
          action: !previous
            ? "Add"
            : !next
              ? "Remove"
              : moved
                ? "Move"
                : "Update",
        },
      ];
    })
    .sort((a, b) => a.date.localeCompare(b.date));
  const defaultsChanged = results.some(
    (result) => result.defaultsChanged && result.canApply,
  );
  const temporarySettingsChanged = results.some(
    (result) => result.temporarySettingsChanged,
  );
  const affected = results.filter((result) => result.canApply);
  return {
    start: input.today,
    end:
      affected
        .map(({ end }) => end)
        .sort()
        .at(-1) ?? input.today,
    changes,
    defaultsChanged,
    temporarySettingsChanged,
    plan: { ...plan, adjustmentWindows: plan.adjustmentWindows ?? [] },
    fingerprint: JSON.stringify(results.map(({ fingerprint }) => fingerprint)),
    canApply: affected.length > 0,
    conflicts: [],
  };
}
