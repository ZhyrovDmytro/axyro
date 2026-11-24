"use client";
import { PageSkeleton } from "@/components/page-skeleton";
import { usePaywallModal } from "@/components/membership/paywall-modal";

import { DurationOptions } from "@/components/workout/duration-options";
import { parseDailyDuration } from "@/domain/workout/daily-duration";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";

import { useAuth } from "@/components/auth/auth-provider";
import { useEntitlement } from "@/components/membership/entitlement-provider";
import { PlanCreationProgress } from "./plan-creation-progress";
import {
  generateTrainingPlan,
  UnsupportedPlanDurationError,
} from "@/domain/training-plan/generate-training-plan";
import { createBrowserPlanPreviewRepository } from "@/services/persistence/session-plan-preview-repository";

import { UiIcon } from "@/components/ui-icon";
import {
  athleteProfileSchema,
  athleteProfileDraftSchema,
  maxPadelPrioritiesPerStep,
  trainingGoalValues,
  weekdayValues,
  trainingPlanSchema,
} from "@/domain/training-plan/training-plan.schema";
import {
  developmentAreaOptions,
  hasPlanDumbbells,
  padelCapacityOptions,
  padelLimitationOptions,
  padelMovementOptions,
  padelPowerOptions,
  planEquipmentForChoice,
  planEquipmentOptions,
} from "@/domain/training-plan/questionnaire-context";
import type {
  AthleteProfile,
  TrainingPlan,
} from "@/domain/training-plan/training-plan.types";
import { toDateKey } from "@/domain/training-plan/date";
import { useTrainingPlan } from "@/hooks/use-training-plan";
import { createBrowserAdaptationProfileRepository } from "@/services/persistence/local-adaptation-profile-repository";
import { clearPlanDraft } from "@/services/persistence/user-storage";

const initialPadelSteps = [
  "sport",
  "goals",
  "weak-areas",
  "padel-movement",
  "padel-power",
  "padel-capacity",
  "schedule",
  "equipment",
  "review",
] as const;

const initialGeneralSteps = [
  "sport",
  "goals",
  "weak-areas",
  "schedule",
  "equipment",
  "review",
] as const;

type StepId =
  (typeof initialPadelSteps)[number] | (typeof initialGeneralSteps)[number];

const stepLabels: Record<StepId, string> = {
  sport: "Sport",
  "padel-movement": "Court movement",
  "padel-power": "Power & control",
  "padel-capacity": "Mobility & capacity",
  "weak-areas": "Strength focus",
  goals: "Goals",
  schedule: "Schedule",
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
  // Retained for stored-profile compatibility; experience does not restrict planning.
  experience: "beginner",
  sessionsPerWeek: 3,
  sessionDurationMinutes: 10,
  preferredDays: ["monday", "wednesday", "friday"],
  equipment: ["bodyweight"],
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

export function PlanOnboarding() {
  const router = useRouter();
  const openAccess = usePaywallModal();
  const { user } = useAuth();
  const { hasPro, loading: membershipLoading } = useEntitlement();
  const continued = useRef(false);
  const restoredReview = useRef(false);
  const previousDumbbellEquipment = useRef<AthleteProfile["equipment"]>([]);
  const generationRequest = useRef<AbortController | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const stepHeadingRef = useRef<HTMLHeadingElement>(null);
  const draftKey = `veyro.plan-draft.${user?.id ?? "guest"}`;
  const {
    plan,
    profile: savedProfile,
    ready,
    savePlanDurably,
  } = useTrainingPlan();
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [balancedShortcut, setBalancedShortcut] = useState(() => {
    try {
      return window.sessionStorage.getItem(`${draftKey}.balanced`) === "1";
    } catch {
      return false;
    }
  });
  const [profileOverride, setProfileOverride] = useState<AthleteProfile | null>(
    () => {
      if (typeof window === "undefined") return null;
      try {
        const query = new URLSearchParams(window.location.search);
        const own = window.sessionStorage.getItem(draftKey);
        const guest =
          user && query.get("resume") === "1" && query.get("generate") === "1"
            ? window.sessionStorage.getItem("veyro.plan-draft.guest")
            : null;
        const parsed = athleteProfileDraftSchema.safeParse(
          JSON.parse(guest ?? own ?? "null"),
        );
        if (guest && parsed.success) {
          window.sessionStorage.setItem(draftKey, JSON.stringify(parsed.data));
          clearPlanDraft(null);
        }
        return parsed.success ? parsed.data : null;
      } catch {
        return null;
      }
    },
  );
  const [error, setError] = useState("");
  const [editingReview, setEditingReview] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationComplete, setGenerationComplete] = useState(false);
  const sourceProfile =
    profileOverride ?? plan?.profile ?? savedProfile ?? initialProfile;
  const profile = {
    ...sourceProfile,
    sessionDurationMinutes: parseDailyDuration(
      sourceProfile.sessionDurationMinutes,
    ),
  };
  const equipmentChoice =
    planEquipmentOptions[hasPlanDumbbells(profile.equipment) ? 1 : 0];
  const steps: readonly StepId[] =
    profile.sport === "padel" ? initialPadelSteps : initialGeneralSteps;
  const stepKey = `${draftKey}.initial.step`;
  const [step, setStep] = useState(() => {
    if (!profileOverride) return 0;
    try {
      const stored = window.sessionStorage.getItem(stepKey);
      const index = steps.findIndex((item) => item === stored);
      return index < 0 ? 0 : index;
    } catch {
      return 0;
    }
  });
  const currentStep = steps[step];
  const serializedProfile = JSON.stringify(profile);
  useEffect(() => {
    if (!ready) return;
    try {
      window.sessionStorage.setItem(draftKey, serializedProfile);
      window.sessionStorage.setItem(stepKey, currentStep);
      window.sessionStorage.setItem(
        `${draftKey}.balanced`,
        balancedShortcut ? "1" : "0",
      );
    } catch {
      // Setup remains usable when the browser blocks session storage.
    }
  }, [
    balancedShortcut,
    currentStep,
    draftKey,
    ready,
    serializedProfile,
    stepKey,
  ]);
  useEffect(() => () => generationRequest.current?.abort(), []);
  useEffect(() => {
    if (ready) {
      stepHeadingRef.current?.focus({ preventScroll: true });
      window.scrollTo({ top: 0, behavior: "instant" });
    }
  }, [currentStep, ready]);
  useEffect(() => {
    if (membershipLoading || !profileOverride || restoredReview.current) return;
    const query = new URLSearchParams(window.location.search);
    if (query.get("resume") !== "1" && query.get("checkout") !== "success")
      return;
    const timer = window.setTimeout(() => {
      restoredReview.current = true;
      setStep(steps.length - 1);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [hasPro, membershipLoading, profileOverride, steps.length]);
  useEffect(() => {
    if (
      continued.current ||
      membershipLoading ||
      !ready ||
      !user ||
      !profileOverride ||
      step !== steps.length - 1
    )
      return;
    const query = new URLSearchParams(window.location.search);
    if (query.get("resume") !== "1" && query.get("checkout") !== "success")
      return;
    // Submit only after the restored review step has committed its current handler.
    if (!hasPro && query.get("generate") !== "1") return;
    const timer = window.setTimeout(() => {
      continued.current = true;
      formRef.current?.requestSubmit();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [
    user,
    hasPro,
    membershipLoading,
    profileOverride,
    ready,
    step,
    steps.length,
  ]);
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

  function editAnswer(target: StepId, label: string) {
    const index = steps.indexOf(target);
    if (index < 0) return null;
    return (
      <button
        className="text-button"
        type="button"
        aria-label={`Edit ${label}`}
        disabled={saving}
        onClick={() => {
          cancelGeneration();
          setError("");
          setEditingReview(true);
          setStep(index);
        }}
      >
        Edit
      </button>
    );
  }

  function cancelGeneration() {
    generationRequest.current?.abort();
    generationRequest.current = null;
    setIsGenerating(false);
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

  async function goForward(event: FormEvent) {
    event.preventDefault();
    if (generationRequest.current || savingRef.current || membershipLoading)
      return;
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
      if (currentStep === "weak-areas" && !editingReview)
        setBalancedShortcut(false);
      setStep((current) => (editingReview ? steps.length - 1 : current + 1));
      setEditingReview(false);
      return;
    }

    const result = athleteProfileSchema.safeParse(profile);
    if (!result.success) {
      setError("Check your answers before creating the plan.");
      return;
    }
    if (!user) {
      try {
        window.sessionStorage.setItem(draftKey, JSON.stringify(result.data));
      } catch {
        setError(
          "Allow browser storage to keep your answers through sign-in, then try again.",
        );
        return;
      }
      const returnTo = "/plan/setup?resume=1&generate=1";
      window.history.replaceState(null, "", returnTo);
      openAccess({ context: "plan", returnTo, requirePro: false });
      return;
    }
    const today = new Date();
    const adaptationProfile = createBrowserAdaptationProfileRepository().load();
    setIsGenerating(true);
    setGenerationComplete(false);
    setError("");
    const startedAt = performance.now();
    const controller = new AbortController();
    generationRequest.current = controller;
    let nextPlan: TrainingPlan;
    try {
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => resolve()),
      );
      if (controller.signal.aborted) return;
      if (!hasPro || result.data.painAreas.length > 0) {
        nextPlan = generateTrainingPlan(result.data, today, [], {
          adaptationProfile,
        });
      } else {
        const response = await fetch("/api/training-plan", {
          signal: controller.signal,
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            profile: result.data,
            today: toDateKey(today),
            adaptationProfile,
          }),
        });
        if (response.status === 422) {
          if (controller.signal.aborted) return;
          setError(
            "No plan fits these answers yet. Try a shorter session or review your available equipment. Your answers are saved so you can return later.",
          );
          generationRequest.current = null;
          setIsGenerating(false);
          return;
        }
        if (!response.ok) throw new Error("Planner request failed.");
        const payload: unknown = await response.json();
        const parsed = trainingPlanSchema.safeParse(
          payload && typeof payload === "object" && "plan" in payload
            ? payload.plan
            : null,
        );
        if (!parsed.success) throw new Error("Planner response was invalid.");
        if (controller.signal.aborted) return;
        nextPlan = parsed.data;
      }
      // Keep fast local previews readable without inventing percentage progress.
      await new Promise<void>((resolve) =>
        window.setTimeout(
          resolve,
          Math.max(0, 600 - (performance.now() - startedAt)),
        ),
      );
      if (controller.signal.aborted) return;
      if (
        !hasPro &&
        (!user || !createBrowserPlanPreviewRepository(user.id).save(nextPlan))
      ) {
        throw new Error("Preview storage unavailable");
      }
      if (hasPro) {
        savingRef.current = true;
        setSaving(true);
        await savePlanDurably(nextPlan, user.id, plan);
        clearPlanDraft(user.id);
      }
    } catch (error) {
      generationRequest.current = null;
      if (controller.signal.aborted) return;
      setError(
        error instanceof UnsupportedPlanDurationError
          ? "No plan fits these answers yet. Try a shorter session or review your available equipment. Your answers are saved so you can return later."
          : "Your plan could not be created. Check your connection and browser storage, then try again. Your answers are still here.",
      );
      setIsGenerating(false);
      return;
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
    setGenerationComplete(true);
    await new Promise<void>((resolve) => window.setTimeout(resolve, 250));
    if (!controller.signal.aborted) router.push("/plan");
  }

  if (!ready) {
    return (
      <PageSkeleton
        title="Your training profile"
        message="Loading your profile…"
        layout="form"
      />
    );
  }

  return (
    <main className="onboarding-shell">
      <header className="onboarding-header">
        <button
          className="back-link back-link--button"
          disabled={step === 0 || saving}
          onClick={() => {
            cancelGeneration();
            setError("");
            setEditingReview(false);
            setStep((current) =>
              editingReview
                ? steps.length - 1
                : balancedShortcut &&
                    profile.sport === "padel" &&
                    currentStep === "schedule"
                  ? steps.indexOf("weak-areas")
                  : Math.max(0, current - 1),
            );
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
          disabled={saving}
          onClick={() => {
            cancelGeneration();
            router.push("/plan");
          }}
          type="button"
        >
          Exit
        </button>
      </header>
      <div className="onboarding-progress" aria-hidden="true">
        <span style={{ transform: `scaleX(${(step + 1) / steps.length})` }} />
      </div>

      <form
        ref={formRef}
        className="onboarding-card"
        data-generating={isGenerating || undefined}
        onSubmit={goForward}
      >
        {isGenerating && <PlanCreationProgress complete={generationComplete} />}
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
          Your plan · {stepLabels[currentStep]}
        </p>

        {currentStep === "sport" && (
          <fieldset>
            <legend>What sport are you training for?</legend>
            <p className="question-help">
              Training days start at 10 minutes. You can switch to 5 or 20
              later.
            </p>
            {!hasPro && (
              <p className="question-help">
                Setup is free. A free account keeps your preview in this tab.
                Pro unlocks your schedule and guided sessions.
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
            <legend>When can you train?</legend>
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
            <div className="plan-select">
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
              <UiIcon name="chevron-down" />
            </div>
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
            <legend>What equipment will you have?</legend>
            <p className="question-help">
              Bodyweight exercises are always available.
            </p>
            <div className="choice-grid choice-grid--equipment">
              {planEquipmentOptions.map(({ value, label }) => (
                <Choice
                  checked={equipmentChoice.value === value}
                  key={value}
                  name="equipment"
                  onChange={() => {
                    if (value === "without-dumbbells")
                      previousDumbbellEquipment.current = profile.equipment;
                    patchProfile({
                      equipment: planEquipmentForChoice(
                        value,
                        previousDumbbellEquipment.current,
                      ),
                    });
                  }}
                  value={value}
                >
                  {label}
                </Choice>
              ))}
            </div>
          </fieldset>
        )}

        {currentStep === "review" && (
          <section aria-labelledby="review-heading">
            <h1 id="review-heading" ref={stepHeadingRef} tabIndex={-1}>
              Your next 60 days, shaped around what matters to you.
            </h1>
            <p className="question-help">
              We’ll create {profile.sessionsPerWeek} sessions each week on your
              chosen days, prioritizing the physical areas and padel actions you
              selected.
            </p>
            <dl className="review-list">
              <div>
                <dt>Sport</dt>
                <dd>
                  {profile.sport === "padel" ? "Padel" : "General training"}
                </dd>
              </div>
              <div>
                <dt>Priorities {editAnswer("goals", "priorities")}</dt>
                <dd>
                  {profile.goals.map((goal) => goalLabels[goal]).join(", ")}
                </dd>
              </div>
              <div>
                <dt>
                  Physical focus {editAnswer("weak-areas", "physical focus")}
                </dt>
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
                  <dt>
                    Padel focus {editAnswer("padel-movement", "court movement")}{" "}
                    {editAnswer("padel-power", "power and control")}{" "}
                    {editAnswer("padel-capacity", "mobility and capacity")}
                  </dt>
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
              <div>
                <dt>Weekly rhythm {editAnswer("schedule", "schedule")}</dt>
                <dd>
                  {profile.preferredDays
                    .map((day) => dayLabels[day])
                    .join(" · ")}{" "}
                  · {profile.sessionDurationMinutes} min
                </dd>
              </div>
              <div>
                <dt>Equipment {editAnswer("equipment", "equipment")}</dt>
                <dd>{equipmentChoice.label}</dd>
              </div>
            </dl>
            <div className="plan-transparency">
              <strong>How this preview works</strong>
              <p>
                Axyro always compiles and validates the plan with deterministic
                rules based on sport, priorities, schedule and equipment. When AI planning is enabled, it
                proposes the exercise mix; Axyro still owns timing, safety and
                progression. Technique labels do not limit your exercise pool.
                Choose effort before you start. You can change spoken guidance
                cadence during the workout.
              </p>
            </div>
            <p className="safety-note">
              {hasPro
                ? "Your plan and workout history are saved to your account with an isolated copy on this device. When AI planning is enabled, setup answers and a compact adaptation profile are sent through Axyro’s server route to OpenAI."
                : "A free account is required to keep this preview in this browser tab. Pro unlocks your schedule and guided sessions and saves your active plan to your account."}{" "}
              You can reset the plan or delete local Axyro data in Settings.
            </p>
          </section>
        )}

        {profile.sport === "padel" &&
          currentStep === "weak-areas" &&
          !editingReview && (
            <div>
              {profile.padelLimitations.length > 0 && (
                <p className="question-help">
                  Balanced training clears the detailed Padel priorities you
                  selected.
                </p>
              )}
              <button
                className="button button--secondary button--full"
                type="button"
                onClick={() => {
                  patchProfile({ padelLimitations: [] });
                  setBalancedShortcut(true);
                  setStep(steps.indexOf("schedule"));
                }}
              >
                Use balanced padel training
              </button>
            </div>
          )}

        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <button
          className="button button--primary button--full onboarding-continue"
          disabled={isGenerating || saving || membershipLoading}
          type="submit"
        >
          {saving
            ? "Saving your plan…"
            : isGenerating
              ? "Building your plan…"
              : currentStep === "review"
                ? plan
                  ? "Build next 60 days"
                  : "Create My Plan"
                : editingReview
                  ? "Save answer"
                  : "Continue"}
        </button>
      </form>
    </main>
  );
}
