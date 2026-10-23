"use client";

import { DurationOptions } from "@/components/workout/duration-options";
import { parseDailyDuration } from "@/domain/workout/daily-duration";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";

import { useAuth } from "@/components/auth/auth-provider";
import { useEntitlement } from "@/components/membership/entitlement-provider";
import { Paywall } from "@/components/membership/paywall";

import { UiIcon } from "@/components/ui-icon";
import {
  athleteProfileSchema,
  maxPadelPrioritiesPerStep,
  trainingGoalValues,
  weekdayValues,
  trainingPlanSchema,
} from "@/domain/training-plan/training-plan.schema";
import {
  developmentAreaOptions,
  padelCapacityOptions,
  padelLimitationOptions,
  padelMovementOptions,
  padelPowerOptions,
  painOptions,
} from "@/domain/training-plan/questionnaire-context";
import type {
  AthleteProfile,
  TrainingPlan,
} from "@/domain/training-plan/training-plan.types";
import { toDateKey } from "@/domain/training-plan/date";
import { useTrainingPlan } from "@/hooks/use-training-plan";
import { createBrowserAdaptationProfileRepository } from "@/services/persistence/local-adaptation-profile-repository";

const initialPadelSteps = [
  "sport",
  "goals",
  "weak-areas",
  "padel-movement",
  "padel-power",
  "padel-capacity",
  "pain",
  "schedule",
  "equipment",
  "review",
] as const;

const initialGeneralSteps = [
  "sport",
  "goals",
  "weak-areas",
  "pain",
  "schedule",
  "equipment",
  "review",
] as const;

const refinementPadelSteps = [
  "schedule",
  "weak-areas",
  "padel-movement",
  "padel-power",
  "padel-capacity",
  "matches",
  "review",
] as const;

const refinementGeneralSteps = [
  "schedule",
  "weak-areas",
  "pain",
  "review",
] as const;

type StepId =
  | (typeof initialPadelSteps)[number]
  | (typeof initialGeneralSteps)[number]
  | (typeof refinementPadelSteps)[number]
  | (typeof refinementGeneralSteps)[number];

const stepLabels: Record<StepId, string> = {
  sport: "Sport",
  "padel-movement": "Court movement",
  "padel-power": "Power & control",
  "padel-capacity": "Mobility & capacity",
  "weak-areas": "Strength focus",
  pain: "Comfort",
  goals: "Goals",
  schedule: "Schedule",
  matches: "Matches",
  equipment: "Equipment",
  review: "Review",
};

const goalLabels: Record<(typeof trainingGoalValues)[number], string> = {
  "movement-speed": "Move faster and better",
  "court-endurance": "Last longer on court",
  power: "Build explosive power",
  strength: "Get stronger",
  "injury-resilience": "Build resilience",
};

type PadelPriorityStep = "padel-movement" | "padel-power" | "padel-capacity";
type PadelLimitationOption = (typeof padelLimitationOptions)[number];

const padelOptionsByStep: Record<
  PadelPriorityStep,
  readonly PadelLimitationOption[]
> = {
  "padel-movement": padelMovementOptions,
  "padel-power": padelPowerOptions,
  "padel-capacity": padelCapacityOptions,
};

function isPadelPriorityStep(step: StepId): step is PadelPriorityStep {
  return (
    step === "padel-movement" ||
    step === "padel-power" ||
    step === "padel-capacity"
  );
}

const dayLabels: Record<(typeof weekdayValues)[number], string> = {
  monday: "Mon",
  tuesday: "Tue",
  wednesday: "Wed",
  thursday: "Thu",
  friday: "Fri",
  saturday: "Sat",
  sunday: "Sun",
};

const initialProfile: AthleteProfile = {
  sport: "padel",
  experience: "beginner",
  sessionsPerWeek: 3,
  sessionDurationMinutes: 10,
  preferredDays: ["monday", "wednesday", "friday"],
  equipment: ["bodyweight", "one-dumbbell"],
  goals: ["movement-speed"],
  developmentAreas: [],
  padelLimitations: [],
  painAreas: [],
  matches: [],
};

function Choice({
  checked,
  children,
  description,
  name,
  onChange,
  type = "radio",
  value,
}: {
  checked: boolean;
  children: React.ReactNode;
  description?: string;
  name: string;
  onChange: () => void;
  type?: "radio" | "checkbox";
  value: string;
}) {
  return (
    <label className={`plan-choice${checked ? " plan-choice--selected" : ""}`}>
      <input
        checked={checked}
        name={name}
        onChange={onChange}
        type={type}
        value={value}
      />
      <span>
        <strong>{children}</strong>
        {description && <small>{description}</small>}
      </span>
    </label>
  );
}

export function PlanOnboarding({
  mode = "initial",
}: {
  mode?: "initial" | "refine";
}) {
  const router = useRouter();
  const { user } = useAuth();
  const { hasPro, loading: membershipLoading } = useEntitlement();
  const [showPaywall, setShowPaywall] = useState(false);
  const continued = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);
  const stepHeadingRef = useRef<HTMLHeadingElement>(null);
  const draftKey = `veyro.plan-draft.${user?.id ?? "guest"}`;
  const { plan, profile: savedProfile, ready, setPlan } = useTrainingPlan();
  const [step, setStep] = useState(0);
  const [profileOverride, setProfileOverride] = useState<AthleteProfile | null>(
    () => {
      if (typeof window === "undefined") return null;
      try {
        const query = new URLSearchParams(window.location.search);
        const own = window.sessionStorage.getItem(draftKey);
        const guest =
          user && query.get("resume") === "1"
            ? window.sessionStorage.getItem("veyro.plan-draft.guest")
            : null;
        const parsed = athleteProfileSchema.safeParse(
          JSON.parse(own ?? guest ?? "null"),
        );
        if (guest && parsed.success) {
          window.sessionStorage.setItem(draftKey, JSON.stringify(parsed.data));
          window.sessionStorage.removeItem("veyro.plan-draft.guest");
        }
        return parsed.success ? parsed.data : null;
      } catch {
        return null;
      }
    },
  );
  const [error, setError] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [matchDate, setMatchDate] = useState("");
  const [matchImportance, setMatchImportance] =
    useState<AthleteProfile["matches"][number]["importance"]>("normal");
  const sourceProfile =
    profileOverride ?? plan?.profile ?? savedProfile ?? initialProfile;
  const profile = {
    ...sourceProfile,
    sessionDurationMinutes: parseDailyDuration(
      sourceProfile.sessionDurationMinutes,
    ),
  };
  const steps: readonly StepId[] =
    mode === "refine"
      ? profile.sport === "padel"
        ? refinementPadelSteps
        : refinementGeneralSteps
      : profile.sport === "padel"
        ? initialPadelSteps
        : initialGeneralSteps;
  const currentStep = steps[step];
  useEffect(() => {
    if (ready && !showPaywall) {
      stepHeadingRef.current?.focus({ preventScroll: true });
      window.scrollTo({ top: 0, behavior: "instant" });
    }
  }, [currentStep, ready, showPaywall]);
  useEffect(() => {
    if (membershipLoading || !profileOverride) return;
    const query = new URLSearchParams(window.location.search);
    if (query.get("resume") !== "1" && query.get("checkout") !== "success")
      return;
    const timer = window.setTimeout(() => {
      setStep(steps.length - 1);
      if (!hasPro) setShowPaywall(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [hasPro, membershipLoading, profileOverride, steps.length]);
  useEffect(() => {
    if (
      continued.current ||
      membershipLoading ||
      !ready ||
      !hasPro ||
      !profileOverride ||
      step !== steps.length - 1
    )
      return;
    const query = new URLSearchParams(window.location.search);
    if (query.get("resume") !== "1" && query.get("checkout") !== "success")
      return;
    // Submit only after the restored review step has committed its current handler.
    const timer = window.setTimeout(() => {
      continued.current = true;
      formRef.current?.requestSubmit();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [hasPro, membershipLoading, profileOverride, ready, step, steps.length]);
  const currentPadelOptions = isPadelPriorityStep(currentStep)
    ? padelOptionsByStep[currentStep]
    : [];
  const currentPadelSelectionCount = currentPadelOptions.filter((option) =>
    profile.padelLimitations.includes(option.value),
  ).length;

  function patchProfile(update: Partial<AthleteProfile>) {
    setProfileOverride((current) => ({
      ...(current ?? plan?.profile ?? savedProfile ?? initialProfile),
      ...update,
    }));
    setError("");
  }

  function toggleGoal(goal: AthleteProfile["goals"][number]) {
    const selected = profile.goals.includes(goal);
    if (!selected && profile.goals.length === 3) {
      setError("Choose up to three priorities.");
      return;
    }
    patchProfile({
      goals: selected
        ? profile.goals.filter((item) => item !== goal)
        : [...profile.goals, goal],
    });
  }

  function toggleDay(day: AthleteProfile["preferredDays"][number]) {
    const selected = profile.preferredDays.includes(day);
    if (!selected && profile.preferredDays.length === profile.sessionsPerWeek) {
      setError(
        `Choose ${profile.sessionsPerWeek} training days, or change your weekly frequency.`,
      );
      return;
    }
    patchProfile({
      preferredDays: selected
        ? profile.preferredDays.filter((item) => item !== day)
        : [...profile.preferredDays, day],
    });
  }

  function togglePadelLimitation(
    limitation: AthleteProfile["padelLimitations"][number],
  ) {
    const selected = profile.padelLimitations.includes(limitation);
    if (!selected && currentPadelSelectionCount >= maxPadelPrioritiesPerStep) {
      setError("Choose up to three priorities on this step.");
      return;
    }
    patchProfile({
      padelLimitations: selected
        ? profile.padelLimitations.filter((item) => item !== limitation)
        : [...profile.padelLimitations, limitation],
    });
  }

  function toggleDevelopmentArea(
    area: AthleteProfile["developmentAreas"][number],
  ) {
    const selected = profile.developmentAreas.includes(area);
    if (!selected && profile.developmentAreas.length === 3) {
      setError(
        "Choose up to three physical areas so the plan can stay focused.",
      );
      return;
    }
    patchProfile({
      developmentAreas: selected
        ? profile.developmentAreas.filter((item) => item !== area)
        : [...profile.developmentAreas, area],
    });
  }

  function togglePainArea(area: AthleteProfile["painAreas"][number]) {
    const selected = profile.painAreas.includes(area);
    patchProfile({
      painAreas: selected
        ? profile.painAreas.filter((item) => item !== area)
        : [...profile.painAreas, area],
    });
  }

  function addMatch() {
    if (!matchDate) {
      setError("Choose a match date first.");
      return;
    }
    patchProfile({
      matches: [
        ...profile.matches.filter((match) => match.date !== matchDate),
        { date: matchDate, importance: matchImportance },
      ].sort((left, right) => left.date.localeCompare(right.date)),
    });
    setMatchDate("");
    setMatchImportance("normal");
  }

  async function goForward(event: FormEvent) {
    event.preventDefault();
    if (currentStep === "goals" && profile.goals.length === 0) {
      setError("Choose at least one priority.");
      return;
    }
    if (
      currentStep === "schedule" &&
      profile.preferredDays.length !== profile.sessionsPerWeek
    ) {
      setError(`Choose exactly ${profile.sessionsPerWeek} training days.`);
      return;
    }
    if (step < steps.length - 1) {
      setError("");
      setStep((current) => current + 1);
      return;
    }

    const result = athleteProfileSchema.safeParse(profile);
    if (!result.success) {
      setError("Check your answers before creating the plan.");
      return;
    }
    if (!hasPro) {
      try {
        window.sessionStorage.setItem(draftKey, JSON.stringify(result.data));
      } catch {
        /* Continue without device storage. */
      }
      setShowPaywall(true);
      return;
    }
    const today = new Date();
    const adaptationProfile = createBrowserAdaptationProfileRepository().load();
    setIsGenerating(true);
    setError("");
    let nextPlan: TrainingPlan;
    try {
      const response = await fetch("/api/training-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile: result.data,
          today: toDateKey(today),
          adaptationProfile,
        }),
      });
      if (!response.ok) throw new Error("Planner request failed.");
      const payload: unknown = await response.json();
      const parsed = trainingPlanSchema.safeParse(
        payload && typeof payload === "object" && "plan" in payload
          ? payload.plan
          : null,
      );
      if (!parsed.success) throw new Error("Planner response was invalid.");
      nextPlan = parsed.data;
    } catch {
      setError(
        "Your plan could not be created. Check your connection and membership, then try again. Your answers are still here.",
      );
      setIsGenerating(false);
      return;
    }
    try {
      window.sessionStorage.removeItem(draftKey);
    } catch {
      /* Storage may be unavailable. */
    }
    setPlan(nextPlan);
    try {
      router.push("/plan");
    } finally {
      setIsGenerating(false);
    }
  }

  if (showPaywall && !hasPro) {
    return (
      <main className="page-shell account-shell">
        <p className="safety-note">
          Your answers are saved in this browser. Pro unlocks your personal
          plan.
        </p>
        <Paywall
          context="plan"
          returnTo={`${mode === "refine" ? "/plan/refine" : "/plan/setup"}?resume=1`}
        />
        <button className="text-link" onClick={() => setShowPaywall(false)}>
          Back to my answers
        </button>
      </main>
    );
  }

  if (!ready) {
    return (
      <main className="onboarding-shell plan-loading" aria-live="polite">
        Loading your profile…
      </main>
    );
  }

  if (mode === "refine" && !plan) {
    return (
      <main className="page-shell plan-empty">
        <section>
          <p className="kicker">Optional refinement</p>
          <h1>Create your first plan before tuning it.</h1>
          <p className="lede">
            Start with the essentials, then add padel-specific priorities and
            match dates once your first session is ready.
          </p>
          <Link className="button button--dark" href="/plan/setup">
            Create my plan <UiIcon name="arrow-right" />
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="onboarding-shell">
      <header className="onboarding-header">
        <button
          className="back-link back-link--button"
          disabled={step === 0}
          onClick={() => {
            setError("");
            setStep((current) => Math.max(0, current - 1));
          }}
          type="button"
        >
          <UiIcon name="arrow-left" /> Back
        </button>
        <span>
          {step + 1} of {steps.length}
        </span>
        <button
          className="text-button"
          onClick={() => router.push("/plan")}
          type="button"
        >
          Exit
        </button>
      </header>
      <div className="onboarding-progress" aria-hidden="true">
        <span style={{ transform: `scaleX(${(step + 1) / steps.length})` }} />
      </div>

      <form ref={formRef} className="onboarding-card" onSubmit={goForward}>
        {currentStep !== "review" && (
          <h1
            className="sr-only"
            id="setup-step-heading"
            ref={stepHeadingRef}
            tabIndex={-1}
          >
            Step {step + 1} of {steps.length}: {stepLabels[currentStep]} setup
          </h1>
        )}
        <p className="onboarding-step-label">
          {mode === "refine" ? "Refine your plan" : "Your plan"} ·{" "}
          {stepLabels[currentStep]}
        </p>

        {currentStep === "sport" && (
          <fieldset>
            <legend>Ten minutes. Built around you.</legend>
            <p className="question-help">
              Start with 10 minutes on your training days. You can choose 5 or
              20 later. First, choose your sport.
            </p>
            {!hasPro && (
              <p className="question-help">
                Setup is free. We’ll save your answers; a Pro subscription is
                required to create and use your personal plan.
              </p>
            )}
            <div className="choice-grid">
              <Choice
                checked={profile.sport === "padel"}
                description="Court movement, rotation and shoulder control"
                name="sport"
                onChange={() => patchProfile({ sport: "padel" })}
                value="padel"
              >
                Padel
              </Choice>
              <Choice
                checked={profile.sport === "other"}
                description="A balanced general training structure"
                name="sport"
                onChange={() =>
                  patchProfile({ sport: "other", padelLimitations: [] })
                }
                value="other"
              >
                Another sport
              </Choice>
            </div>
          </fieldset>
        )}

        {currentStep === "padel-movement" && (
          <fieldset>
            <legend>Which court movements should feel faster?</legend>
            <p className="question-help">
              Choose up to three situations where you most often arrive late or
              lose position. These choices directly increase matching footwork
              and strength work in your plan.{" "}
              <span aria-live="polite">
                {currentPadelSelectionCount} of {maxPadelPrioritiesPerStep}
                {" selected on this step."}
              </span>
            </p>
            <div className="choice-grid">
              {padelMovementOptions.map((option) => (
                <Choice
                  checked={profile.padelLimitations.includes(option.value)}
                  description={option.description}
                  key={option.value}
                  name="padel-challenges"
                  onChange={() => togglePadelLimitation(option.value)}
                  type="checkbox"
                  value={option.value}
                >
                  {option.label}
                </Choice>
              ))}
            </div>
          </fieldset>
        )}

        {currentStep === "padel-power" && (
          <fieldset>
            <legend>Which padel actions do you want to improve?</legend>
            <p className="question-help">
              Choose up to three shots or actions that should gain more power,
              rotation or control.{" "}
              <span aria-live="polite">
                {currentPadelSelectionCount} of {maxPadelPrioritiesPerStep}
                {" selected on this step."}
              </span>
            </p>
            <div className="choice-grid">
              {padelPowerOptions.map((option) => (
                <Choice
                  checked={profile.padelLimitations.includes(option.value)}
                  description={option.description}
                  key={option.value}
                  name="padel-challenges"
                  onChange={() => togglePadelLimitation(option.value)}
                  type="checkbox"
                  value={option.value}
                >
                  {option.label}
                </Choice>
              ))}
            </div>
          </fieldset>
        )}

        {currentStep === "padel-capacity" && (
          <fieldset>
            <legend>What fades or feels restricted?</legend>
            <p className="question-help">
              Choose up to three priorities for mobility, balance or how you
              feel late in a match.{" "}
              <span aria-live="polite">
                {currentPadelSelectionCount} of {maxPadelPrioritiesPerStep}
                {" selected on this step."}
              </span>
            </p>
            <div className="choice-grid">
              {padelCapacityOptions.map((option) => (
                <Choice
                  checked={profile.padelLimitations.includes(option.value)}
                  description={option.description}
                  key={option.value}
                  name="padel-challenges"
                  onChange={() => togglePadelLimitation(option.value)}
                  type="checkbox"
                  value={option.value}
                >
                  {option.label}
                </Choice>
              ))}
            </div>
          </fieldset>
        )}

        {currentStep === "weak-areas" && (
          <fieldset>
            <legend>Which areas feel weak or need more development?</legend>
            <p className="question-help">
              Optional. Choose up to three areas that feel underprepared—not
              areas that are painful today. We’ll prioritize exercises that
              build them progressively.
            </p>
            <div className="choice-grid">
              <Choice
                checked={profile.developmentAreas.length === 0}
                description="Keep the plan evenly balanced"
                name="development-balanced"
                onChange={() => patchProfile({ developmentAreas: [] })}
                value="none"
              >
                No specific weak area
              </Choice>
              {developmentAreaOptions.map((option) => (
                <Choice
                  checked={profile.developmentAreas.includes(option.value)}
                  description={option.description}
                  key={option.value}
                  name="development-areas"
                  onChange={() => toggleDevelopmentArea(option.value)}
                  type="checkbox"
                  value={option.value}
                >
                  {option.label}
                </Choice>
              ))}
            </div>
          </fieldset>
        )}

        {currentStep === "pain" && (
          <fieldset>
            <legend>
              Is anything painful, sore or uncomfortable right now?
            </legend>
            <p className="question-help">
              Optional safety check. These areas will be protected or avoided;
              they will not be treated as areas to strengthen. Use the previous
              step for a non-painful weak area you want to develop.
            </p>
            <div className="choice-grid choice-grid--compact">
              <Choice
                checked={profile.painAreas.length === 0}
                name="pain-free"
                onChange={() => patchProfile({ painAreas: [] })}
                value="none"
              >
                None / skip
              </Choice>
              {painOptions.map((option) => (
                <Choice
                  checked={profile.painAreas.includes(option.value)}
                  key={option.value}
                  name="pain-areas"
                  onChange={() => togglePainArea(option.value)}
                  type="checkbox"
                  value={option.value}
                >
                  {option.label}
                </Choice>
              ))}
            </div>
            <p className="safety-note">
              Axyro does not diagnose or treat pain. Stop if a movement causes
              pain or increasing discomfort; seek qualified care for new,
              severe, worsening, or persistent symptoms.
            </p>
          </fieldset>
        )}

        {currentStep === "goals" && (
          <fieldset>
            <legend>What do you want to improve?</legend>
            <p className="question-help">
              Choose up to three. Your first month balances your priorities.
            </p>
            <div className="choice-grid">
              {trainingGoalValues.map((goal) => (
                <Choice
                  checked={profile.goals.includes(goal)}
                  key={goal}
                  name="goals"
                  onChange={() => toggleGoal(goal)}
                  type="checkbox"
                  value={goal}
                >
                  {goalLabels[goal]}
                </Choice>
              ))}
            </div>
          </fieldset>
        )}

        {currentStep === "schedule" && (
          <fieldset>
            <legend>Make it fit your week.</legend>
            <p className="question-help">
              A realistic plan beats a perfect plan you cannot follow.
            </p>
            <p className="editable-note">
              <span aria-hidden="true">↻</span>
              You can adjust your weekly frequency, training days and session
              length later from your plan.
            </p>
            <label className="field-label" htmlFor="frequency">
              Strength sessions per week
            </label>
            <select
              className="plan-input"
              id="frequency"
              onChange={(event) => {
                const sessionsPerWeek = Number(
                  event.target.value,
                ) as AthleteProfile["sessionsPerWeek"];
                patchProfile({
                  sessionsPerWeek,
                  preferredDays: profile.preferredDays.slice(
                    0,
                    sessionsPerWeek,
                  ),
                });
              }}
              value={profile.sessionsPerWeek}
            >
              {[1, 2, 3, 4, 5].map((value) => (
                <option key={value} value={value}>
                  {value} {value === 1 ? "session" : "sessions"}
                </option>
              ))}
            </select>
            <span className="field-label">
              Preferred days · choose {profile.sessionsPerWeek}
            </span>
            <div className="day-picker">
              {weekdayValues.map((day) => (
                <label
                  className={
                    profile.preferredDays.includes(day)
                      ? "day-chip day-chip--selected"
                      : "day-chip"
                  }
                  key={day}
                >
                  <input
                    checked={profile.preferredDays.includes(day)}
                    name="days"
                    onChange={() => toggleDay(day)}
                    type="checkbox"
                  />
                  {dayLabels[day]}
                </label>
              ))}
            </div>
            <DurationOptions
              value={profile.sessionDurationMinutes}
              onChange={(sessionDurationMinutes) =>
                patchProfile({ sessionDurationMinutes })
              }
            />
          </fieldset>
        )}

        {currentStep === "equipment" && (
          <fieldset>
            <legend>What can you train with?</legend>
            <p className="question-help">
              We will only schedule workouts that fit what you have.
            </p>
            <div className="choice-grid">
              {(
                [
                  [
                    "bodyweight",
                    "Bodyweight",
                    "Floor, wall or chair when needed",
                  ],
                  ["one-dumbbell", "One dumbbell", "Light to moderate weight"],
                  ["two-dumbbells", "Two dumbbells", "A matching light pair"],
                ] as const
              ).map(([value, label, description]) => (
                <Choice
                  checked={profile.equipment.includes(value)}
                  description={description}
                  key={value}
                  name="equipment"
                  onChange={() => {
                    const selected = profile.equipment.includes(value);
                    const equipment = selected
                      ? profile.equipment.filter((item) => item !== value)
                      : [...profile.equipment, value];
                    if (equipment.length > 0) patchProfile({ equipment });
                  }}
                  type="checkbox"
                  value={value}
                >
                  {label}
                </Choice>
              ))}
            </div>
            <p className="question-help">
              We only include exercises compatible with the equipment you
              select.
            </p>
          </fieldset>
        )}

        {currentStep === "matches" && (
          <fieldset>
            <legend>Any upcoming padel matches?</legend>
            <p className="question-help">
              Optional. Match dates help keep hard training away from
              competition. Importance controls how much recovery space the plan
              protects.
            </p>
            <label className="field-label" htmlFor="match-date">
              Match date
            </label>
            <input
              className="plan-input"
              id="match-date"
              onChange={(event) => setMatchDate(event.target.value)}
              type="date"
              value={matchDate}
            />
            <label className="field-label" htmlFor="match-importance">
              Importance
            </label>
            <select
              className="plan-input"
              id="match-importance"
              onChange={(event) =>
                setMatchImportance(
                  event.target
                    .value as AthleteProfile["matches"][number]["importance"],
                )
              }
              value={matchImportance}
            >
              <option value="normal">Normal</option>
              <option value="important">Important</option>
            </select>
            <button
              className="button button--secondary"
              onClick={addMatch}
              type="button"
            >
              Add match
            </button>
            {profile.matches.length > 0 && (
              <dl className="review-list">
                {profile.matches.map((match) => (
                  <div key={match.date}>
                    <dt>{match.date}</dt>
                    <dd>
                      {match.importance === "important"
                        ? "Important"
                        : "Normal"}
                      {" · "}
                      <button
                        className="text-button"
                        onClick={() =>
                          patchProfile({
                            matches: profile.matches.filter(
                              (candidate) => candidate.date !== match.date,
                            ),
                          })
                        }
                        type="button"
                      >
                        Remove
                      </button>
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </fieldset>
        )}

        {currentStep === "review" && (
          <section aria-labelledby="review-heading">
            <h1 id="review-heading" ref={stepHeadingRef} tabIndex={-1}>
              {mode === "refine"
                ? "Your plan, tuned to your game."
                : "Your next 60 days, shaped around what matters to you."}
            </h1>
            <p className="question-help">
              {mode === "refine"
                ? "These details change exercise ranking and protect recovery around your matches."
                : `We’ll create ${profile.sessionsPerWeek} sessions each week on your chosen days, prioritizing the physical areas and padel actions you selected.`}
            </p>
            {mode === "refine" && (
              <>
                <label className="field-label" htmlFor="experience">
                  Playing experience
                </label>
                <select
                  className="plan-input"
                  id="experience"
                  onChange={(event) =>
                    patchProfile({
                      experience: event.target
                        .value as AthleteProfile["experience"],
                    })
                  }
                  value={profile.experience}
                >
                  <option value="beginner">I’m just starting</option>
                  <option value="intermediate">I have some experience</option>
                  <option value="advanced">I’m experienced</option>
                </select>
              </>
            )}
            <dl className="review-list">
              <div>
                <dt>Sport</dt>
                <dd>
                  {profile.sport === "padel" ? "Padel" : "General training"}
                </dd>
              </div>
              <div>
                <dt>Priorities</dt>
                <dd>
                  {profile.goals.map((goal) => goalLabels[goal]).join(", ")}
                </dd>
              </div>
              <div>
                <dt>Physical focus</dt>
                <dd>
                  {profile.developmentAreas.length > 0
                    ? profile.developmentAreas
                        .map(
                          (area) =>
                            developmentAreaOptions.find(
                              (option) => option.value === area,
                            )?.label,
                        )
                        .join(", ")
                    : "Balanced development"}
                </dd>
              </div>
              {profile.sport === "padel" && (
                <div>
                  <dt>Padel focus</dt>
                  <dd>
                    {profile.padelLimitations.length > 0
                      ? profile.padelLimitations
                          .map(
                            (limitation) =>
                              padelLimitationOptions.find(
                                (option) => option.value === limitation,
                              )?.label,
                          )
                          .join(", ")
                      : "Balanced development"}
                  </dd>
                </div>
              )}
              {profile.sport === "padel" && (
                <div>
                  <dt>Current safety exclusions</dt>
                  <dd>
                    {profile.painAreas.length > 0
                      ? profile.painAreas
                          .map(
                            (area) =>
                              painOptions.find(
                                (option) => option.value === area,
                              )?.label,
                          )
                          .join(", ")
                      : "None reported"}
                  </dd>
                </div>
              )}
              <div>
                <dt>Weekly rhythm</dt>
                <dd>
                  {profile.preferredDays
                    .map((day) => dayLabels[day])
                    .join(" · ")}{" "}
                  · {profile.sessionDurationMinutes} min
                </dd>
              </div>
              <div>
                <dt>Equipment</dt>
                <dd>
                  {profile.equipment.length} setup
                  {profile.equipment.length === 1 ? "" : "s"} available
                </dd>
              </div>
              {profile.sport === "padel" && (
                <div>
                  <dt>Matches</dt>
                  <dd>
                    {profile.matches.length > 0
                      ? `${profile.matches.length} added`
                      : "None added"}
                  </dd>
                </div>
              )}
            </dl>
            <div className="plan-transparency">
              <strong>How this preview works</strong>
              <p>
                Axyro always compiles and validates the plan with deterministic
                rules based on sport, priorities, experience, schedule,
                equipment and any optional discomfort selections. When AI
                planning is enabled, it proposes the exercise mix; Axyro still
                owns timing, safety and progression.
              </p>
            </div>
            <p className="safety-note">
              Your plan and workout history are saved to your account with an
              isolated copy on this device. If AI planning is enabled, setup
              answers and a compact adaptation profile are sent through
              Axyro&apos;s server route to OpenAI. You can reset the plan or
              delete all local Axyro data in Settings.
            </p>
          </section>
        )}

        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <button
          className="button button--primary button--full onboarding-continue"
          disabled={isGenerating}
          type="submit"
        >
          {isGenerating
            ? "Building your plan…"
            : currentStep === "review"
              ? mode === "refine"
                ? "Save plan refinements"
                : plan
                  ? "Rebuild my 60-day plan"
                  : "Create My Plan"
              : "Continue"}
        </button>
      </form>
    </main>
  );
}
