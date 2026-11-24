"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { PageSkeleton } from "@/components/page-skeleton";
import { UiIcon } from "@/components/ui-icon";
import { useAuth } from "@/components/auth/auth-provider";
import { exercises } from "@/content/exercises";
import { formatPlanDate, toDateKey } from "@/domain/training-plan/date";
import {
  adjustmentWindow,
  maxReplacementExercises,
  planProfileOnDate,
  proposePlanAdjustments,
  type AdjustmentScope,
  type PlanAdjustment as Adjustment,
} from "@/domain/training-plan/plan-adjustment";
import { getPlanWeekNumber } from "@/domain/training-plan/progression";
import {
  developmentAreaOptions,
  hasPlanDumbbells,
  planEquipmentForChoice,
  planEquipmentOptions,
  padelMovementOptions,
  padelPowerOptions,
  padelCapacityOptions,
} from "@/domain/training-plan/questionnaire-context";
import {
  athleteProfileDraftSchema,
  weekdayValues,
} from "@/domain/training-plan/training-plan.schema";
import type {
  AthleteProfile,
  TrainingPlan,
} from "@/domain/training-plan/training-plan.types";
import { DurationOptions } from "@/components/workout/duration-options";
import { parseDailyDuration } from "@/domain/workout/daily-duration";
import { useTrainingPlan } from "@/hooks/use-training-plan";
import { createBrowserAdaptationProfileRepository } from "@/services/persistence/local-adaptation-profile-repository";
import { createBrowserTrainingPlanRepository } from "@/services/persistence/local-training-plan-repository";
import { createBrowserWorkoutActivityRepository } from "@/services/persistence/local-workout-activity-repository";
import { createBrowserWorkoutSessionRepository } from "@/services/persistence/local-workout-session-repository";
import styles from "./plan-adjustment.module.css";

const questions = [
  "schedule",
  "duration",
  "equipment",
  "demand",
  "focus",
] as const;
type Question = (typeof questions)[number];
type ScopedQuestion = "schedule" | "duration" | "equipment";
const labels: Record<Question, string> = {
  schedule: "Training days",
  duration: "Session length",
  equipment: "Equipment",
  demand: "Workout difficulty",
  focus: "Training focus",
};
type Draft = {
  profile: AthleteProfile;
  scopes: Record<ScopedQuestion, AdjustmentScope>;
  answered: Question[];
  demand: "lighter" | "harder" | "movement" | null;
  exerciseIds: string[];
};
const categories = [
  { label: "Court movement", options: padelMovementOptions },
  { label: "Power and control", options: padelPowerOptions },
  { label: "Mobility and capacity", options: padelCapacityOptions },
] as const;
const headings: Record<Question, string> = {
  schedule: "Which days can you train now?",
  duration: "How much time can you set aside?",
  equipment: "What equipment will you have?",
  demand: "How should we adjust your workouts?",
  focus: "What should upcoming workouts prioritize?",
};

function OptionList<T extends string>({
  legend,
  options,
  values,
  onToggle,
  compactDays = false,
  limit,
}: {
  legend: string;
  options: readonly { value: T; label: string }[];
  values: readonly T[];
  onToggle: (value: T) => void;
  compactDays?: boolean;
  limit?: number;
}) {
  return (
    <fieldset className={styles.field}>
      <legend>{legend}</legend>
      {limit !== undefined && (
        <p className={styles.selectionCount} role="status">
          {values.length} of {limit} selected
        </p>
      )}
      <div className={compactDays ? styles.dayOptions : styles.options}>
        {options.map(({ value, label }) => (
          <label key={value} className={styles.option}>
            <input
              type="checkbox"
              aria-label={label}
              checked={values.includes(value)}
              disabled={
                limit !== undefined &&
                values.length >= limit &&
                !values.includes(value)
              }
              onChange={() => onToggle(value)}
            />
            <span>{compactDays ? label.slice(0, 3) : label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function toggle<T>(items: readonly T[], item: T, max = Infinity): T[] {
  if (items.includes(item)) return items.filter((value) => value !== item);
  return items.length < max ? [...items, item] : [...items];
}

function requestFrom(reason: Question, draft: Draft): Adjustment | null {
  const { profile, scopes } = draft;
  switch (reason) {
    case "schedule":
      return {
        kind: reason,
        days: weekdayValues.filter((day) =>
          profile.preferredDays.includes(day),
        ),
        scope: scopes.schedule,
      };
    case "duration":
      return {
        kind: reason,
        minutes: parseDailyDuration(profile.sessionDurationMinutes),
        scope: scopes.duration,
      };
    case "equipment":
      return {
        kind: reason,
        equipment: profile.equipment,
        scope: scopes.equipment,
      };
    case "focus":
      return {
        kind: reason,
        areas: profile.developmentAreas,
        priorities: profile.padelLimitations,
      };
    case "demand":
      return draft.demand === "movement" && draft.exerciseIds.length > 0
        ? { kind: "movement", exerciseIds: draft.exerciseIds }
        : draft.demand === "lighter" || draft.demand === "harder"
          ? { kind: draft.demand }
          : null;
    default:
      return null;
  }
}

export function PlanAdjustment({
  initialDuration,
}: {
  initialDuration: boolean;
}) {
  const trainingPlan = useTrainingPlan();
  const { user } = useAuth();
  const today = toDateKey(new Date());
  if (!trainingPlan.ready)
    return (
      <PageSkeleton
        title="Adjust your plan"
        message="Loading your current block…"
        layout="form"
      />
    );
  const { plan } = trainingPlan;
  if (!plan || !user || today > plan.endDate) {
    return (
      <main className="page-shell plan-empty">
        <section>
          <h1>
            {plan
              ? "Your training block has ended"
              : "You don’t have an active plan"}
          </h1>
          <Link
            className="button button--primary"
            href={plan ? "/plan" : "/plan/setup"}
          >
            {plan ? "Back to plan" : "Create a plan"}
          </Link>
        </section>
      </main>
    );
  }
  return (
    <AdjustmentForm
      key={`${user.id}:${plan.generatedAt}`}
      plan={plan}
      owner={user.id}
      today={today}
      initialDuration={initialDuration}
      save={trainingPlan.savePlanDurably}
    />
  );
}

function AdjustmentForm({
  plan,
  owner,
  today,
  initialDuration,
  save,
}: {
  plan: TrainingPlan;
  owner: string;
  today: string;
  initialDuration: boolean;
  save: ReturnType<typeof useTrainingPlan>["savePlanDurably"];
}) {
  const router = useRouter();
  const heading = useRef<HTMLHeadingElement>(null);
  const saving = useRef(false);
  const conflictHeading = useRef<HTMLHeadingElement>(null);
  const revisionId = useRef<string | null>(null);
  const [base] = useState(() =>
    JSON.stringify([plan.profile, plan.adjustmentWindows]),
  );
  const key = `veyro.plan-draft.${owner}.adjustment${initialDuration ? ".duration" : ""}`;
  const [baseline] = useState<Draft>(() => ({
    profile: initialDuration ? plan.profile : planProfileOnDate(plan, today),
    scopes: {
      schedule: "week",
      duration: initialDuration ? "ongoing" : "week",
      equipment: "week",
    },
    answered: [],
    demand: null,
    exerciseIds: [],
  }));
  const steps = initialDuration ? (["duration"] as const) : questions;
  const [stored] = useState(() => {
    try {
      return JSON.parse(window.sessionStorage.getItem(key) ?? "null");
    } catch {
      return null;
    }
  });
  const restore =
    stored?.block === plan.generatedAt &&
    stored?.base === base &&
    stored?.initialDuration === initialDuration;
  const [draft, updateDraft] = useState<Draft>(() => {
    const defaults = baseline;
    if (!restore) return defaults;
    try {
      const profile = athleteProfileDraftSchema.safeParse(
        stored?.draft?.profile,
      );
      if (!profile.success) return defaults;
      return {
        profile: profile.data,
        scopes: {
          schedule:
            stored.draft.scopes?.schedule === "ongoing" ? "ongoing" : "week",
          duration:
            stored.draft.scopes?.duration === "ongoing" ? "ongoing" : "week",
          equipment:
            stored.draft.scopes?.equipment === "ongoing" ? "ongoing" : "week",
        },
        answered: questions.filter(
          (question) =>
            Array.isArray(stored.draft.answered) &&
            stored.draft.answered.includes(question),
        ),
        demand:
          stored.draft.demand === "movement" ||
          stored.draft.demand === "lighter" ||
          stored.draft.demand === "harder"
            ? stored.draft.demand
            : null,
        exerciseIds: Array.isArray(stored.draft.exerciseIds)
          ? stored.draft.exerciseIds.filter(
              (id: unknown) => typeof id === "string",
            )
          : typeof stored.draft.exerciseId === "string" &&
              stored.draft.exerciseId
            ? [stored.draft.exerciseId]
            : [],
      };
    } catch {
      return defaults;
    }
  });
  const [step, setStep] = useState(() =>
    restore && Number.isInteger(stored.step)
      ? Math.max(0, Math.min(steps.length - 1, stored.step))
      : 0,
  );
  const [editing, setEditing] = useState(false);
  const [review, setReview] = useState<ReturnType<
    typeof proposePlanAdjustments
  > | null>(null);
  const [conflicts, setConflicts] = useState<
    NonNullable<typeof review>["conflicts"]
  >([]);
  const [resolvedConflicts, setResolvedConflicts] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [recentFeedback] = useState(() =>
    createBrowserWorkoutActivityRepository()
      .getRecentFeedbackForAdaptation()
      .find(
        (item) =>
          item.planId === plan.generatedAt &&
          (item.rating === "too-hard" || item.affectedExerciseIds?.length),
      ),
  );
  useEffect(() => {
    try {
      window.sessionStorage.setItem(
        key,
        JSON.stringify({
          block: plan.generatedAt,
          base,
          draft,
          step,
          initialDuration,
        }),
      );
    } catch {}
  }, [base, draft, key, plan.generatedAt, step, initialDuration]);
  useEffect(() => {
    heading.current?.focus();
  }, [step]);

  useEffect(() => {
    if (conflicts.length) conflictHeading.current?.focus();
  }, [conflicts]);

  const { profile } = draft;
  const reason: Question | undefined = steps[step];
  const atReview = step === steps.length;
  const scoped =
    reason === "schedule" || reason === "duration" || reason === "equipment";
  const scope = scoped ? draft.scopes[reason] : "ongoing";
  const range = adjustmentWindow(
    plan,
    today,
    scoped ? scope : reason === "demand" ? "week" : "ongoing",
  );
  const dates = `${formatPlanDate(range.start)} – ${formatPlanDate(range.end)}`;
  const next = [...plan.sessions]
    .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate))
    .find(
      ({ status, scheduledDate }) =>
        (status === "scheduled" || status === "in-progress") &&
        scheduledDate >= today,
    );
  const movementRange = adjustmentWindow(plan, today, "week");
  const relevantIds = new Set(
    plan.sessions
      .filter(
        ({ scheduledDate, status }) =>
          status === "scheduled" &&
          scheduledDate >= movementRange.start &&
          scheduledDate <= movementRange.end,
      )
      .flatMap(({ sections }) =>
        sections.flatMap(({ items }) =>
          items.map(({ exerciseId }) => exerciseId),
        ),
      ),
  );
  const movementChoices = exercises.filter(({ id }) => relevantIds.has(id));
  const selectedExerciseIds = [...new Set(draft.exerciseIds)]
    .filter((id) => relevantIds.has(id))
    .slice(0, maxReplacementExercises);
  function setDraft(update: (current: Draft) => Draft) {
    if (conflicts.length) setConflicts([]);
    if (resolvedConflicts.length) setResolvedConflicts([]);
    updateDraft(update);
  }
  function markAnswered(current: Draft): Question[] {
    return reason && !current.answered.includes(reason)
      ? [...current.answered, reason]
      : current.answered;
  }
  const patchProfile = (patch: Partial<AthleteProfile>) =>
    setDraft((current) => ({
      ...current,
      answered: markAnswered(current),
      profile: { ...current.profile, ...patch },
    }));
  const requests = (
    ["equipment", "schedule", "focus", "duration", "demand"] as const
  ).flatMap((question) => {
    if (!draft.answered.includes(question)) return [];
    const request = requestFrom(question, {
      ...draft,
      exerciseIds: selectedExerciseIds,
    });
    const current = requestFrom(
      question,
      request && "scope" in request && request.scope === "ongoing"
        ? { ...draft, profile: plan.profile }
        : { ...draft, ...baseline, scopes: draft.scopes },
    );
    return request && JSON.stringify(request) !== JSON.stringify(current)
      ? [{ question, request }]
      : [];
  });
  const hasDumbbells = hasPlanDumbbells(profile.equipment);
  const ready =
    (reason !== "schedule" || profile.preferredDays.length > 0) &&
    (reason !== "demand" ||
      draft.demand !== "movement" ||
      selectedExerciseIds.length > 0) &&
    conflicts.every(({ key }) => resolvedConflicts.includes(key));

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!ready || saving.current) return;
    if (!atReview && step < steps.length - 1 && !editing && !conflicts.length) {
      setError("");
      setStep(step + 1);
      return;
    }
    setError("");
    try {
      const latest = createBrowserTrainingPlanRepository().load();
      if (!latest || latest.generatedAt !== plan.generatedAt)
        throw new Error(
          "Your active block changed. Return to your plan and start again.",
        );
      const activity = createBrowserWorkoutActivityRepository();
      const active = createBrowserWorkoutSessionRepository().loadActive();
      revisionId.current ??= crypto.randomUUID();
      const proposed = proposePlanAdjustments({
        plan: latest,
        requests: requests.map(({ request }) => request),
        today: toDateKey(new Date()),
        revisionId: revisionId.current,
        resolvedConflicts,
        activities: activity.getActivityHistory(),
        activeSessionId:
          active.kind === "valid" ? active.state.sessionId : undefined,
        recentFeedback: activity.getRecentFeedbackForAdaptation(),
        adaptationProfile: createBrowserAdaptationProfileRepository().load(),
      });
      if (proposed.conflicts.length) {
        setConflicts(proposed.conflicts);
        if (atReview) {
          setReview(null);
          setStep(steps.length - 1);
        }
        return;
      }
      setConflicts([]);
      if (!atReview || review?.fingerprint !== proposed.fingerprint) {
        if (atReview)
          setError(
            "Your plan changed since this preview. Check the updated dates before applying.",
          );
        setReview(proposed);
        setEditing(false);
        setStep(steps.length);
        heading.current?.focus();
        return;
      }
      if (!proposed.canApply) return;
      saving.current = true;
      setBusy(true);
      await save(proposed.plan, owner, latest);
      try {
        window.sessionStorage.removeItem(key);
      } catch {}
      router.push(
        `/plan?adjusted=${encodeURIComponent(proposed.changes[0]?.date ?? proposed.start)}&count=${proposed.changes.length}${proposed.temporarySettingsChanged ? "&temporary=1" : ""}`,
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not save your changes. Please try again.",
      );
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }

  function back() {
    setError("");
    setConflicts([]);
    if (atReview || conflicts.length) setResolvedConflicts([]);
    setEditing(false);
    setStep(Math.max(0, step - 1));
  }

  return (
    <main className={styles.shell}>
      {step === 0 && (
        <Link href="/plan" className="back-link">
          <UiIcon name="arrow-left" /> Training plan
        </Link>
      )}
      <div className={styles.layout} data-first={step === 0 || undefined}>
        <header className={styles.intro}>
          {step > 0 && (
            <button
              type="button"
              className={styles.back}
              onClick={back}
              disabled={busy}
            >
              <UiIcon name="arrow-left" /> Back
            </button>
          )}
          {!initialDuration && (
            <div className={styles.progress}>
              <span>
                Step {step + 1} of {steps.length + 1} ·{" "}
                {reason ? labels[reason] : "Review"}
              </span>
              <progress
                aria-label="Adjustment progress"
                value={step + 1}
                max={steps.length + 1}
              />
            </div>
          )}
          <h1 ref={heading} tabIndex={-1}>
            {atReview ? "Review changes" : reason && headings[reason]}
          </h1>
        </header>
        <aside className={styles.context} aria-label="Current plan">
          <div className={styles.week}>
            Week {getPlanWeekNumber(plan.startDate, today) ?? 1}
            <span>Ends {formatPlanDate(plan.endDate)}</span>
          </div>
          <div className={styles.rhythm}>
            <ul role="list" aria-label="Saved training days">
              {weekdayValues.map((day) => {
                const scheduled = plan.profile.preferredDays.includes(day);
                return (
                  <li key={day} data-scheduled={scheduled || undefined}>
                    <span aria-hidden="true">{day.slice(0, 2)}</span>
                    <span className="sr-only">
                      {day}
                      {scheduled ? ", training" : ", rest"}
                    </span>
                  </li>
                );
              })}
            </ul>
            <span>{plan.profile.sessionDurationMinutes} min</span>
          </div>
          {next && (
            <div className={styles.next}>
              <span>Next workout · {formatPlanDate(next.scheduledDate)}</span>
              <strong>{next.workout.name}</strong>
            </div>
          )}
        </aside>
        <form className={styles.form} onSubmit={submit}>
          {reason && (
            <>
              {reason === "schedule" && (
                <>
                  <OptionList
                    legend="Training days"
                    compactDays
                    options={weekdayValues.map((value) => ({
                      value,
                      label: value[0].toUpperCase() + value.slice(1),
                    }))}
                    values={profile.preferredDays}
                    onToggle={(day) =>
                      patchProfile({
                        preferredDays: toggle(profile.preferredDays, day, 5),
                      })
                    }
                  />
                  <p className={styles.note} aria-live="polite">
                    {profile.preferredDays.length} of 5 possible training days
                  </p>
                </>
              )}
              {reason === "duration" && (
                <DurationOptions
                  concise
                  legend="Session length"
                  value={parseDailyDuration(profile.sessionDurationMinutes)}
                  onChange={(minutes) =>
                    patchProfile({ sessionDurationMinutes: minutes })
                  }
                />
              )}
              {reason === "equipment" && (
                <fieldset className={styles.field}>
                  <legend className="sr-only">Available equipment</legend>
                  <div className={styles.options}>
                    {planEquipmentOptions.map(({ value, label }) => (
                      <label className={styles.option} key={value}>
                        <input
                          type="radio"
                          name="equipment"
                          value={value}
                          checked={
                            hasDumbbells === (value === "with-dumbbells")
                          }
                          onChange={() =>
                            patchProfile({
                              equipment: planEquipmentForChoice(
                                value,
                                baseline.profile.equipment,
                              ),
                            })
                          }
                        />
                        <span>{label}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              )}
              {reason === "focus" && (
                <>
                  <OptionList
                    legend="Physical focus · up to 3"
                    options={developmentAreaOptions}
                    values={profile.developmentAreas}
                    onToggle={(item) =>
                      patchProfile({
                        developmentAreas: toggle(
                          profile.developmentAreas,
                          item,
                          3,
                        ),
                      })
                    }
                  />
                  {profile.sport === "padel" && (
                    <details className={styles.padel}>
                      <summary>
                        Padel priorities{" "}
                        {profile.padelLimitations.length > 0 &&
                          `· ${profile.padelLimitations.length} selected`}
                      </summary>
                      <button
                        type="button"
                        className="text-button"
                        onClick={() => patchProfile({ padelLimitations: [] })}
                      >
                        Use balanced Padel training
                      </button>
                      {categories.map(({ label, options }) => (
                        <OptionList<AthleteProfile["padelLimitations"][number]>
                          key={label}
                          legend={label}
                          options={options}
                          values={profile.padelLimitations}
                          onToggle={(item) => {
                            if (
                              !profile.padelLimitations.includes(item) &&
                              options.filter(({ value }) =>
                                profile.padelLimitations.includes(value),
                              ).length >= 3
                            ) {
                              setError(
                                "Choose up to three priorities in each group.",
                              );
                              return;
                            }
                            setError("");
                            patchProfile({
                              padelLimitations: toggle(
                                profile.padelLimitations,
                                item,
                              ),
                            });
                          }}
                        />
                      ))}
                    </details>
                  )}
                </>
              )}
              {reason === "demand" && (
                <>
                  {recentFeedback && (
                    <p className={styles.note}>
                      {recentFeedback.affectedExerciseIds?.length
                        ? `Recent feedback mentioned ${exercises.find(({ id }) => id === recentFeedback.affectedExerciseIds?.[0])?.name ?? "a movement"}.`
                        : "You recently marked a workout as too hard."}
                    </p>
                  )}
                  <fieldset
                    className={`${styles.field} ${styles.difficultyOptions}`}
                    aria-label="Workout difficulty"
                  >
                    {(
                      [
                        [
                          null,
                          "Keep workouts as planned",
                          "Keep the same exercises and timing.",
                        ],
                        [
                          "lighter",
                          "Make workouts lighter",
                          "Shorter work intervals and more rest. Same session length.",
                        ],
                        [
                          "harder",
                          "Make workouts harder",
                          "Longer work intervals and less rest. Same session length.",
                        ],
                        [
                          "movement",
                          "Replace exercises",
                          `Swap up to ${maxReplacementExercises} exercises in upcoming workouts.`,
                        ],
                      ] as const
                    ).map(([value, label, description]) => (
                      <label key={label} className={styles.option}>
                        <input
                          type="radio"
                          name="difficulty"
                          aria-label={label}
                          aria-describedby={`difficulty-${value ?? "keep"}`}
                          checked={draft.demand === value}
                          disabled={
                            value === "movement" && movementChoices.length === 0
                          }
                          onChange={() =>
                            setDraft((current) => ({
                              ...current,
                              answered: markAnswered(current),
                              demand: value,
                            }))
                          }
                        />
                        <span>
                          <strong>{label}</strong>
                          <small id={`difficulty-${value ?? "keep"}`}>
                            {description}
                          </small>
                        </span>
                      </label>
                    ))}
                  </fieldset>
                  {!movementChoices.length && (
                    <p className={styles.note}>
                      No exercises are scheduled in the next 7 days.
                    </p>
                  )}
                  {draft.demand === "movement" &&
                    movementChoices.length > 0 && (
                      <OptionList
                        legend="Exercises to replace"
                        options={movementChoices.map(({ id, name }) => ({
                          value: id,
                          label: name,
                        }))}
                        values={selectedExerciseIds}
                        limit={maxReplacementExercises}
                        onToggle={(id) =>
                          setDraft((current) => ({
                            ...current,
                            exerciseIds: toggle(
                              selectedExerciseIds,
                              id,
                              maxReplacementExercises,
                            ),
                          }))
                        }
                      />
                    )}
                </>
              )}
              {scoped && (
                <fieldset className={styles.field}>
                  <legend>How long should this apply?</legend>
                  <div className={styles.options}>
                    {(
                      [
                        ["week", "For the next 7 days"],
                        ["ongoing", "Ongoing"],
                      ] as const
                    ).map(([value, label]) => (
                      <label className={styles.option} key={value}>
                        <input
                          type="radio"
                          name="scope"
                          checked={scope === value}
                          onChange={() =>
                            setDraft((current) => ({
                              ...current,
                              answered: markAnswered(current),
                              scopes: { ...current.scopes, [reason]: value },
                            }))
                          }
                        />
                        <span>{label}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              )}
              {(reason !== "demand" || draft.demand) && (
                <div className={styles.dateBand}>
                  <UiIcon name="scheduled" />
                  <span>{dates}</span>
                  {((scoped && scope === "ongoing") ||
                    reason === "focus") && (
                    <small>Also updates your saved default</small>
                  )}
                </div>
              )}
            </>
          )}
          {atReview && review && (
            <>
              {requests.length > 0 && !initialDuration && (
                <div
                  className={styles.editLinks}
                  aria-label="Edit selected adjustments"
                >
                  {requests.map(({ question }) => (
                    <button
                      type="button"
                      className="text-button"
                      key={question}
                      disabled={busy}
                      onClick={() => {
                        setError("");
                        setResolvedConflicts([]);
                        setEditing(true);
                        setStep(questions.indexOf(question));
                      }}
                    >
                      Edit {labels[question].toLowerCase()}
                    </button>
                  ))}
                </div>
              )}
              <div className={styles.dateBand}>
                <UiIcon name="scheduled" />
                <span>
                  {formatPlanDate(review.start)} – {formatPlanDate(review.end)}
                </span>
                <small>
                  {review.changes.length}{" "}
                  {review.changes.length === 1 ? "change" : "changes"}
                  {review.defaultsChanged ? " · Updates saved defaults" : ""}
                </small>
              </div>
              {review.changes.length ? (
                <ol
                  className={styles.impact}
                  role="list"
                  aria-label="Affected workouts"
                >
                  {review.changes.map((entry) => (
                    <li key={entry.id}>
                      <time dateTime={entry.date}>
                        {formatPlanDate(entry.date)}
                      </time>
                      <div>
                        <strong>
                          {entry.action} · {entry.title}
                        </strong>
                        <p>{entry.detail}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className={styles.note}>
                  {review.canApply
                    ? review.temporarySettingsChanged
                      ? "Your workouts already fit these settings. They apply only during the dates shown."
                      : "Your upcoming workouts already fit. This will save your new default."
                    : "No upcoming workouts would change in this period. Edit your answers to try a different adjustment."}
                </p>
              )}
            </>
          )}
          {conflicts.length > 0 && (
            <section
              className={styles.conflicts}
              aria-labelledby="adjustment-conflicts"
            >
              <h2 id="adjustment-conflicts" ref={conflictHeading} tabIndex={-1}>
                {conflicts.length === 1
                  ? "One date needs your attention"
                  : "Some dates need your attention"}
              </h2>
              <p className={styles.note}>
                No compatible workout fits these dates with your current
                answers. Choose how to handle each date or edit your answers.
              </p>
              {conflicts.map(({ key, date, title, action }) => (
                <label key={key} className={styles.option}>
                  <input
                    type="checkbox"
                    checked={resolvedConflicts.includes(key)}
                    onChange={() =>
                      setResolvedConflicts((current) => toggle(current, key))
                    }
                  />
                  <span>
                    <strong>{action}</strong>
                    <small>
                      {formatPlanDate(date)} · {title}
                    </small>
                  </span>
                </label>
              ))}
            </section>
          )}
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <button
            type="submit"
            className={`button button--primary ${styles.submit}`}
            disabled={busy || !ready || (atReview && !review?.canApply)}
          >
            {busy
              ? "Saving changes…"
              : atReview
                ? review?.changes.length
                  ? "Apply to upcoming workouts"
                  : review?.temporarySettingsChanged
                    ? "Save temporary settings"
                    : "Save default"
                : step === steps.length - 1 || editing || conflicts.length > 0
                  ? "Review changes"
                  : "Continue"}{" "}
            <UiIcon name="arrow-right" />
          </button>
        </form>
      </div>
    </main>
  );
}
