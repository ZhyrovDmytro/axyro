"use client";

import { PageSkeleton } from "@/components/page-skeleton";
import type { CSSProperties } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";

import { OptionalEquipmentNote } from "@/components/optional-equipment-note";
import { RecoveryVisual } from "@/components/player/recovery-visual";
import { advanceExpiredPhases } from "@/domain/session/phase-advancement";
import type { SessionEvent } from "@/domain/session/session.types";
import { ExerciseMedia } from "@/components/exercise-media";
import { UiIcon } from "@/components/ui-icon";
import { getExerciseInstructionContent } from "@/domain/exercise/exercise-instructions";
import {
  selectCurrentStep,
  selectNextExerciseId,
  selectUpcomingStep,
  selectProgressPercent,
} from "@/domain/session/selectors";
import {
  createSessionState,
  sessionReducer,
} from "@/domain/session/session.reducer";
import type { Exercise } from "@/domain/exercise/exercise.types";
import type {
  ProgressionPhase,
  SessionAdaptation,
} from "@/domain/training-plan/training-plan.types";
import { WorkoutFeedbackForm } from "@/components/feedback/workout-feedback-form";
import {
  getSequenceDurationSeconds,
  intensityPresets,
  type IntensityLevel,
} from "@/domain/workout/intensity";
import type { SessionStep } from "@/domain/workout/session-step.types";
import type { SessionSection, Workout } from "@/domain/workout/workout.types";
import { flattenSessionSections } from "@/domain/workout/session-sections";
import { createWorkoutSessionSnapshot } from "@/domain/workout/create-workout-session-snapshot";
import { usePhaseTimer } from "@/hooks/use-phase-timer";
import { useIntervalSignals } from "@/hooks/use-interval-signals";
import { useDialogFocusTrap } from "@/hooks/use-dialog-focus-trap";
import { useScreenWakeLock } from "@/hooks/use-screen-wake-lock";
import { useWorkoutMediaCache } from "@/hooks/use-workout-media-cache";
import { useUserPreferences } from "@/hooks/use-user-preferences";
import { useWorkoutActivity } from "@/hooks/use-workout-activity";
import { titleCase } from "@/lib/format";
import type {} from "@/services/persistence/workout-activity-repository";
import { createBrowserWorkoutActivityRepository } from "@/services/persistence/local-workout-activity-repository";
import { createBrowserWorkoutSessionRepository } from "@/services/persistence/local-workout-session-repository";
import type {
  ActiveSessionLoadResult,
  ActiveWorkoutSessionState,
} from "@/services/persistence/workout-session-repository";
import { useActiveWorkoutSession } from "@/hooks/use-active-workout-session";

type WorkoutPlayerProps = {
  workout: Workout;
  sections?: SessionSection[];
  exercises: Exercise[];
  sequence: SessionStep[];
  intensity: IntensityLevel;
  exitHref?: string;
  completionHref?: string;
  onComplete?: () => void;
  activityContext?: {
    activityId: string;
    sessionId: string;
    progressionWeek: number;
    progressionPhase: ProgressionPhase;
    targetDurationSeconds: number;
    originalSession: {
      workout: Workout;
      sections: SessionSection[];
      targetDurationSeconds: number;
      estimatedDurationSeconds: number;
    };
    todayAdaptations: SessionAdaptation[];
    planId: string;
  };
};

const guidanceCadenceMultipliers = {
  slower: 0.8,
  normal: 1,
  faster: 1.25,
} as const;

function sequenceFingerprint(sequence: readonly SessionStep[]) {
  return JSON.stringify(
    sequence.map((step) =>
      step.type === "completed"
        ? { type: step.type }
        : {
            type: step.type,
            exerciseId: step.exerciseId,
            workoutItemId: step.workoutItemId,
            durationSeconds: stepDurationSeconds(step),
            ...(step.type === "active" ? { setNumber: step.setNumber } : {}),
          },
    ),
  );
}

function standaloneSessionId(workoutId: string) {
  const suffix =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.round(Math.random() * 1_000_000)}`;
  return `standalone-${workoutId}-${suffix}`;
}

function phaseLabel(step: SessionStep): string {
  switch (step.type) {
    case "ready":
      return "Get ready";
    case "active":
      return "Work";
    case "side-transition":
      return `Switch ${step.switchTarget}`;
    case "rest":
      return "Rest";
    case "completed":
      return "Complete";
  }
}

function stepDurationSeconds(step: SessionStep): number {
  if (step.type === "completed") return 0;
  return step.type === "active"
    ? step.prescription.durationSeconds
    : step.durationSeconds;
}

function stepExerciseId(step: SessionStep): string | undefined {
  if (step.type === "completed") return undefined;
  return step.exerciseId;
}

function formatTimer(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}

function cadenceSeconds(
  exercise: Exercise | undefined,
  intensity: IntensityLevel,
  guidanceCadenceMultiplier: number,
): number {
  const guidance = exercise?.defaultGuidance;
  const baseSeconds =
    guidance?.secondsPerCue ?? (guidance?.bpm ? 60 / guidance.bpm : 1);
  return (
    baseSeconds /
    (intensityPresets[intensity].cadenceMultiplier * guidanceCadenceMultiplier)
  );
}

function PhaseInstruction({ step }: { step: SessionStep }) {
  switch (step.type) {
    case "ready":
      if (step.sectionStart && step.sectionType === "main") {
        return (
          <div className="phase-message" aria-live="polite">
            <strong>Get ready to move</strong>
            <span>Your work interval starts after the count-in.</span>
          </div>
        );
      }
      if (step.sectionStart && step.sectionType === "cooldown") {
        return (
          <div className="phase-message" aria-live="polite">
            <strong>Main work complete</strong>
            <span>The cooldown starts automatically after the count-in.</span>
          </div>
        );
      }
      return (
        <div className="phase-message">
          <strong>Set your position</strong>
          <span>
            The work interval starts automatically after the count-in.
          </span>
        </div>
      );
    case "active":
      return (
        <div className="active-instruction">
          <p className="set-label">
            Set {step.setNumber} of {step.totalSets}
            {step.side ? ` · ${titleCase(step.side)} side` : ""}
          </p>
          <p className="movement-direction">
            Repeat the movement with control until time ends.
          </p>
        </div>
      );
    case "side-transition":
      return (
        <div className="phase-message">
          <strong>
            Switch to your {step.to} {step.switchTarget}
          </strong>
          <span>The next interval begins automatically.</span>
        </div>
      );
    case "rest":
      return (
        <div className="phase-message">
          <strong>Recover and breathe</strong>
          <span>
            {step.after === "set"
              ? "Another set is next."
              : "A new exercise is next."}
          </span>
        </div>
      );
    case "completed":
      return null;
  }
}

export function WorkoutPlayer(props: WorkoutPlayerProps) {
  const continuity = useActiveWorkoutSession();

  if (!continuity) {
    return (
      <PageSkeleton
        title="Your workout"
        message="Restoring your workout…"
        layout="player"
      />
    );
  }

  return <WorkoutPlayerRuntime {...props} continuity={continuity} />;
}

function WorkoutPlayerRuntime({
  workout,
  sections = [{ type: "main", items: workout.items }],
  exercises,
  sequence,
  intensity,
  exitHref,
  completionHref,
  onComplete,
  activityContext,
  continuity,
}: WorkoutPlayerProps & { continuity: ActiveSessionLoadResult }) {
  const router = useRouter();
  const [initialContinuity] = useState(continuity);
  const continuityRepository = useMemo(
    () => createBrowserWorkoutSessionRepository(),
    [],
  );
  const fingerprint = useMemo(() => sequenceFingerprint(sequence), [sequence]);
  const saved =
    initialContinuity.kind === "valid" ? initialContinuity.state : null;
  const [sessionId] = useState(
    () =>
      activityContext?.sessionId ??
      (saved?.workoutId === workout.id
        ? saved.sessionId
        : standaloneSessionId(workout.id)),
  );
  const isSameSavedSession = saved?.sessionId === sessionId;
  const canRestore = Boolean(
    isSameSavedSession &&
    saved?.sequenceFingerprint === fingerprint &&
    saved.currentIndex >= 0 &&
    saved.currentIndex < sequence.length &&
    sequence[saved.currentIndex]?.type !== "completed",
  );
  const invalidRestore =
    initialContinuity.kind === "invalid" || (isSameSavedSession && !canRestore);
  const restored = canRestore ? saved : null;
  const [state, dispatchSession] = useReducer(sessionReducer, undefined, () =>
    createSessionState(sequence, restored ?? undefined),
  );
  const [phaseStart, setPhaseStart] = useState<{
    phaseKey: number;
    atMs: number;
  } | null>(null);
  const dispatch = (event: SessionEvent) => {
    setPhaseStart(null);
    dispatchSession(event);
  };
  const completionReported = useRef(false);
  const [startedAt] = useState(
    () => restored?.startedAt ?? new Date().toISOString(),
  );
  const [mountedAtMs] = useState(() => Date.now());
  const sessionTiming = useRef({
    activeDurationMs: restored?.activeDurationMs ?? 0,
    runningStartedAtMs: restored ? null : (mountedAtMs as number | null),
  });
  const [actualDurationSeconds, setActualDurationSeconds] = useState<
    number | undefined
  >();
  const [completedSetKeys, setCompletedSetKeys] = useState<Set<string>>(
    new Set(restored?.completedSetKeys ?? []),
  );
  const [skippedWorkoutItemIds, setSkippedWorkoutItemIds] = useState<
    Set<string>
  >(new Set(restored?.skippedWorkoutItemIds ?? []));
  const [showExitConfirmation, setShowExitConfirmation] = useState(false);
  const [showGuidanceSettings, setShowGuidanceSettings] = useState(false);
  const [audioSupported, setAudioSupported] = useState<boolean | null>(null);
  const [techniqueStepIndex, setTechniqueStepIndex] = useState<number | null>(
    null,
  );
  const step = selectCurrentStep(state);
  const showTechnique = techniqueStepIndex === state.currentIndex;
  const progress = selectProgressPercent(state);
  const {
    audioEnabled,
    guidanceCadence,
    keepScreenAwake,
    ready: preferencesReady,
    setAudioEnabled,
    setGuidanceCadence,
    setKeepScreenAwake,
  } = useUserPreferences({ sessionIntensity: intensity });
  const guidanceCadenceMultiplier = guidanceCadenceMultipliers[guidanceCadence];
  const wakeLockStatus = useScreenWakeLock(
    preferencesReady &&
      keepScreenAwake &&
      state.status === "running" &&
      step.type !== "completed",
  );
  const mediaCache = useWorkoutMediaCache(exercises);
  const techniqueDialogRef = useRef<HTMLElement>(null);
  const exitDialogRef = useRef<HTMLElement>(null);
  const guidanceDialogRef = useRef<HTMLElement>(null);
  const closeTechnique = useCallback(() => setTechniqueStepIndex(null), []);
  const closeExitConfirmation = useCallback(
    () => setShowExitConfirmation(false),
    [],
  );
  const closeGuidanceSettings = useCallback(
    () => setShowGuidanceSettings(false),
    [],
  );
  useDialogFocusTrap(showTechnique, techniqueDialogRef, closeTechnique);
  useDialogFocusTrap(
    showExitConfirmation,
    exitDialogRef,
    closeExitConfirmation,
  );
  useDialogFocusTrap(
    showGuidanceSettings,
    guidanceDialogRef,
    closeGuidanceSettings,
  );
  const estimatedDurationSeconds = getSequenceDurationSeconds(sequence);
  const sessionSnapshot = useMemo(
    () =>
      createWorkoutSessionSnapshot({
        workout,
        sections,
        exercises,
        intensity,
        targetDurationSeconds:
          activityContext?.targetDurationSeconds ?? estimatedDurationSeconds,
        estimatedDurationSeconds,
        completedSetKeys,
        skippedWorkoutItemIds,
        ...(activityContext
          ? {
              progressionWeek: activityContext.progressionWeek,
              progressionPhase: activityContext.progressionPhase,
              originalSession: activityContext.originalSession,
              todayAdaptations: activityContext.todayAdaptations,
            }
          : {}),
      }),
    [
      activityContext,
      estimatedDurationSeconds,
      exercises,
      intensity,
      sections,
      completedSetKeys,
      skippedWorkoutItemIds,
      workout,
    ],
  );
  const activeDurationMs = useCallback((now: number) => {
    const timing = sessionTiming.current;
    return (
      timing.activeDurationMs +
      (timing.runningStartedAtMs === null
        ? 0
        : Math.max(0, now - timing.runningStartedAtMs))
    );
  }, []);
  const captureActualDurationIfFinishing = (now: number) => {
    if (sequence[state.currentIndex + 1]?.type !== "completed") return;
    setActualDurationSeconds(
      Math.max(1, Math.round(activeDurationMs(now) / 1000)),
    );
  };
  const { recordFeedback } = useWorkoutActivity({
    activityId: activityContext?.activityId,
    sessionId,
    workoutId: workout.id,
    intensity,
    snapshot: sessionSnapshot,
    completed: step.type === "completed",
    actualDurationSeconds,
    startedAt,
    resumedAfterInterruption: Boolean(restored),
  });
  const { remainingMs, remainingSeconds } = usePhaseTimer({
    phaseKey: state.currentIndex,
    durationSeconds: stepDurationSeconds(step),
    paused: state.status === "paused",
    enabled: step.type !== "completed",
    initialRemainingMs: restored?.pausedRemainingMs,
    startedAtMs:
      phaseStart?.phaseKey === state.currentIndex ? phaseStart.atMs : undefined,
    onComplete: (completedAtMs, observedAtMs) => {
      const advancement = advanceExpiredPhases(
        sequence,
        state.currentIndex,
        completedAtMs,
        observedAtMs,
      );
      setCompletedSetKeys((current) => {
        const next = new Set(current);
        sequence
          .slice(state.currentIndex, advancement.nextIndex)
          .forEach((finished, offset) => {
            if (finished.type !== "active") return;
            const laterSide = sequence
              .slice(state.currentIndex + offset + 1)
              .some(
                (candidate) =>
                  candidate.type === "active" &&
                  candidate.workoutItemId === finished.workoutItemId &&
                  candidate.setNumber === finished.setNumber,
              );
            if (!laterSide)
              next.add(`${finished.workoutItemId}:${finished.setNumber}`);
          });
        return next;
      });
      if (sequence[advancement.nextIndex]?.type === "completed") {
        setActualDurationSeconds(
          Math.max(
            1,
            Math.round(
              activeDurationMs(advancement.currentPhaseStartedAtMs) / 1000,
            ),
          ),
        );
      }
      setPhaseStart({
        phaseKey: advancement.nextIndex,
        atMs: advancement.currentPhaseStartedAtMs,
      });
      dispatchSession({
        type: "COMPLETE_PHASE",
        nextIndex: advancement.nextIndex,
      });
    },
  });
  useIntervalSignals({
    sequence,
    phaseKey: state.currentIndex,
    remainingMs,
    paused: state.status === "paused",
    enabled: preferencesReady && audioEnabled,
    phaseStartedAtMs:
      phaseStart?.phaseKey === state.currentIndex ? phaseStart.atMs : undefined,
  });
  const exerciseById = new Map(
    exercises.map((exercise) => [exercise.id, exercise]),
  );
  const currentExerciseId = stepExerciseId(step);
  const currentExercise = currentExerciseId
    ? exerciseById.get(currentExerciseId)
    : undefined;
  const instructionContent = currentExercise
    ? getExerciseInstructionContent(currentExercise)
    : undefined;
  const upcomingStep = selectUpcomingStep(state);
  const nextExerciseId =
    upcomingStep?.type === "active"
      ? upcomingStep.exerciseId
      : selectNextExerciseId(state);
  const nextExercise = nextExerciseId
    ? exerciseById.get(nextExerciseId)
    : undefined;
  const intensityPreset = intensityPresets[intensity];
  const plannedMinutes = Math.max(1, Math.ceil(estimatedDurationSeconds / 60));
  const sessionItems = flattenSessionSections(sections);
  const sectionLabel =
    step.type === "completed"
      ? "Workout"
      : step.sectionType === "warmup"
        ? "Warm-up"
        : step.sectionType === "cooldown"
          ? "Cooldown"
          : "Workout";
  const cadenceStyle = {
    "--cadence-seconds": `${cadenceSeconds(currentExercise, intensity, guidanceCadenceMultiplier)}s`,
  } as CSSProperties;
  const remainingMsRef = useRef(remainingMs);
  useEffect(() => {
    remainingMsRef.current = remainingMs;
  }, [remainingMs]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setAudioSupported("AudioContext" in window);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, []);

  const saveContinuity = useCallback(
    (forcePaused = false) => {
      if (
        sequence[state.currentIndex]?.type === "completed" ||
        invalidRestore ||
        (saved && !isSameSavedSession)
      ) {
        return;
      }
      const currentStep = sequence[state.currentIndex];
      if (!currentStep || currentStep.type === "completed") return;
      const now = Date.now();
      const stepStatuses = sequence.map((candidate, index) => {
        if (index === state.currentIndex) return "current" as const;
        if (index > state.currentIndex) return "pending" as const;
        if (
          candidate.type !== "completed" &&
          skippedWorkoutItemIds.has(candidate.workoutItemId)
        ) {
          return "skipped" as const;
        }
        return "completed" as const;
      });
      const next: ActiveWorkoutSessionState = {
        version: 1,
        lifecycleStatus: "in-progress",
        sessionId,
        ...(activityContext?.activityId
          ? { activityId: activityContext.activityId }
          : {}),
        ...(activityContext?.planId ? { planId: activityContext.planId } : {}),
        workoutId: workout.id,
        workoutName: workout.name,
        resumeHref: activityContext
          ? `/plan/workouts/${sessionId}/start?intensity=${intensity}`
          : `/workouts/${workout.slug}/start?intensity=${intensity}&minutes=${workout.estimatedMinutes}`,
        exitHref:
          exitHref ?? (activityContext ? "/plan" : `/workouts/${workout.slug}`),
        intensity,
        sequenceFingerprint: fingerprint,
        startedAt,
        lastPersistedAt: new Date(now).toISOString(),
        currentIndex: state.currentIndex,
        currentSection: currentStep.sectionType,
        ...(stepExerciseId(currentStep)
          ? { currentExerciseId: stepExerciseId(currentStep) }
          : {}),
        currentExerciseIndex: currentStep.sectionExerciseIndex,
        currentExerciseCount: currentStep.sectionExerciseCount,
        ...(currentStep.type === "active"
          ? { currentRound: currentStep.setNumber }
          : {}),
        currentInterval: currentStep.type,
        paused: forcePaused || state.status === "paused",
        pausedRemainingMs: Math.max(0, Math.round(remainingMsRef.current)),
        activeDurationMs: activeDurationMs(now),
        completedSetKeys: [...completedSetKeys],
        skippedWorkoutItemIds: [...skippedWorkoutItemIds],
        stepStatuses,
      };
      continuityRepository.saveActive(next);
    },
    [
      activeDurationMs,
      activityContext,
      completedSetKeys,
      continuityRepository,
      exitHref,
      fingerprint,
      intensity,
      invalidRestore,
      isSameSavedSession,
      saved,
      sequence,
      sessionId,
      skippedWorkoutItemIds,
      state.currentIndex,
      state.status,
      startedAt,
      workout.id,
      workout.estimatedMinutes,
      workout.name,
      workout.slug,
    ],
  );

  useEffect(() => {
    const timing = sessionTiming.current;
    const now = Date.now();
    if (state.status === "paused" && timing.runningStartedAtMs !== null) {
      timing.activeDurationMs += now - timing.runningStartedAtMs;
      timing.runningStartedAtMs = null;
    }
    if (state.status === "running" && timing.runningStartedAtMs === null) {
      timing.runningStartedAtMs = now;
    }
  }, [state.status]);

  useEffect(() => {
    saveContinuity();
  }, [saveContinuity]);

  useEffect(() => {
    const preservePausedState = () => saveContinuity(true);
    const handleVisibility = () => {
      if (document.visibilityState !== "hidden") return;
      saveContinuity();
    };
    window.addEventListener("pagehide", preservePausedState);
    window.addEventListener("beforeunload", preservePausedState);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.removeEventListener("pagehide", preservePausedState);
      window.removeEventListener("beforeunload", preservePausedState);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [saveContinuity]);

  useEffect(() => {
    if (step.type === "completed" && !completionReported.current) {
      completionReported.current = true;
      continuityRepository.clearActive(sessionId);
      onComplete?.();
    }
  }, [continuityRepository, onComplete, sessionId, step.type]);

  if (saved && !isSameSavedSession) {
    return (
      <main className="page-shell plan-empty">
        <section>
          <p className="kicker">Workout in progress</p>
          <h1>You already have a workout in progress.</h1>
          <p>
            <strong>{saved.workoutName}</strong> · Started{" "}
            {new Date(saved.startedAt).toLocaleDateString()}
          </p>
          <div className="button-row">
            <Link className="button button--primary" href={saved.resumeHref}>
              Resume workout
            </Link>
            <button
              className="button button--secondary"
              onClick={() => {
                createBrowserWorkoutActivityRepository().finalizeIncompleteSession(
                  saved.sessionId,
                  undefined,
                  Math.round(saved.activeDurationMs / 1000),
                );
                continuityRepository.clearActive(saved.sessionId);
                window.location.reload();
              }}
              type="button"
            >
              End and start new workout
            </button>
            <button
              className="text-button"
              onClick={() => router.back()}
              type="button"
            >
              Cancel
            </button>
          </div>
        </section>
      </main>
    );
  }

  if (invalidRestore) {
    return (
      <main className="page-shell plan-empty">
        <section>
          <p className="kicker">Saved workout</p>
          <h1>We couldn’t restore your exact workout position.</h1>
          <p>
            The workout content may have changed or the saved state is invalid.
          </p>
          <div className="button-row">
            <button
              className="button button--primary"
              onClick={() => {
                continuityRepository.clearActive();
                window.location.reload();
              }}
              type="button"
            >
              Restart workout
            </button>
            <button
              className="button button--secondary"
              onClick={() => {
                continuityRepository.clearActive();
                router.push(exitHref ?? "/");
              }}
              type="button"
            >
              End workout
            </button>
          </div>
        </section>
      </main>
    );
  }

  if (step.type === "completed") {
    return (
      <main className="completion-screen">
        <div className="completion-mark" aria-hidden="true">
          <UiIcon name="check" />
        </div>
        <p className="kicker">Workout complete</p>
        <h1>Strong work.</h1>
        <p className="completion-lede">
          You finished {workout.name} at {intensityPreset.label.toLowerCase()}{" "}
          effort.
        </p>
        <dl className="completion-stats">
          <div>
            <dt>Movements</dt>
            <dd>{new Set(sessionItems.map((item) => item.exerciseId)).size}</dd>
          </div>
          <div>
            <dt>Sets</dt>
            <dd>
              {sessionItems.reduce((total, item) => total + item.sets, 0)}
            </dd>
          </div>
          <div>
            <dt>Planned time</dt>
            <dd>{plannedMinutes} min</dd>
          </div>
        </dl>
        <WorkoutFeedbackForm onSave={recordFeedback} />
        <Link
          className="button button--primary button--full completion-primary-action"
          href={completionHref ?? "/"}
        >
          Done
        </Link>
        <section
          className="completion-secondary-actions"
          aria-labelledby="completion-options-heading"
        >
          <h2 id="completion-options-heading">More options</h2>
          <div>
            <button
              className="button button--secondary"
              onClick={() => dispatch({ type: "PREVIOUS" })}
            >
              Back to last step
            </button>
            <button
              className="button button--secondary"
              onClick={() => dispatch({ type: "RESTART" })}
            >
              Repeat workout
            </button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="player-shell">
      <header className="player-header">
        <button
          className="player-exit"
          aria-label="Exit workout"
          onClick={() => {
            dispatch({ type: "PAUSE" });
            saveContinuity(true);
            setShowExitConfirmation(true);
          }}
          type="button"
        >
          <UiIcon name="close" />
        </button>
        <div className="player-heading">
          <span>
            {sectionLabel} · {step.sectionExerciseIndex} of{" "}
            {step.sectionExerciseCount}
          </span>
        </div>
        <button
          aria-label="Audio guidance"
          aria-pressed={audioEnabled}
          className="player-audio"
          onClick={() => setAudioEnabled(!audioEnabled)}
          type="button"
        >
          <UiIcon name={audioEnabled ? "volume" : "volume-off"} />
          {audioEnabled ? "Audio on" : "Audio off"}
        </button>
        <button
          aria-label="Open workout guidance settings"
          className="player-options"
          onClick={() => setShowGuidanceSettings(true)}
          type="button"
        >
          <UiIcon name="settings" />
        </button>
        <span className="player-progress-value">{progress}%</span>
      </header>

      <div
        className="player-progress-track"
        role="progressbar"
        aria-label="Workout progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress}
      >
        <span style={{ transform: `scaleX(${progress / 100})` }} />
      </div>

      <section
        className={`player-stage${state.status === "paused" ? " player-stage--paused" : ""}`}
      >
        <div className="player-media">
          <div
            className={`player-reference${step.type === "rest" ? " player-reference--recovering" : ""}`}
            aria-hidden={step.type === "rest" || undefined}
            inert={step.type === "rest" || undefined}
          >
            {currentExercise ? (
              <ExerciseMedia key={currentExercise.id} exercise={currentExercise} player />
            ) : (
              <div className="media-placeholder" />
            )}
          </div>
          {step.type === "rest" && (
            <RecoveryVisual paused={state.status === "paused"} />
          )}
          {step.type === "ready" && (
            <span className="player-ready-label" role="status">
              Get ready
            </span>
          )}
          {step.type === "active" && (
            <div
              className="cadence-visual"
              style={cadenceStyle}
              aria-label="Visual movement cadence"
            >
              <span />
              <span />
            </div>
          )}
        </div>

        <div className="player-content">
          <div className="player-status">
            <h1>
              {step.type === "rest"
                ? "Recovery"
                : (currentExercise?.name ?? "Prepare to move")}
            </h1>
            <div
              className="countdown"
              role="timer"
              aria-label={`${remainingSeconds} seconds remaining`}
            >
              <strong>{formatTimer(remainingSeconds)}</strong>
              <span>
                {state.status === "paused" ? "Paused" : phaseLabel(step)}
              </span>
            </div>
            <PhaseInstruction step={step} />
            {currentExercise && step.type !== "rest" && (
              <OptionalEquipmentNote exercise={currentExercise} />
            )}
          </div>

          {instructionContent && step.type === "active" && (
            <div className="player-coaching">
              <div className="player-cue">
                <span>Focus</span>
                <p>{instructionContent.techniqueCues[0]}</p>
              </div>
              <button
                className="player-technique-trigger"
                onClick={() => setTechniqueStepIndex(state.currentIndex)}
                type="button"
              >
                Technique
                <UiIcon name="chevron-up" />
              </button>
            </div>
          )}

          <div
            className="player-controls"
            aria-label="Workout controls"
            role="group"
          >
            <button
              disabled={state.currentIndex === 0}
              onClick={() => dispatch({ type: "PREVIOUS" })}
            >
              <UiIcon name="arrow-left" />
              Previous
            </button>
            <button
              onClick={() =>
                dispatch({
                  type: state.status === "paused" ? "RESUME" : "PAUSE",
                })
              }
            >
              <UiIcon name={state.status === "paused" ? "play" : "pause"} />
              {state.status === "paused" ? "Resume" : "Pause"}
            </button>
            <button
              onClick={() => {
                if (step.type === "active") {
                  setSkippedWorkoutItemIds((current) =>
                    new Set(current).add(step.workoutItemId),
                  );
                }
                captureActualDurationIfFinishing(Date.now());
                dispatch({ type: "NEXT" });
              }}
            >
              Skip
              <UiIcon name="arrow-right" />
            </button>
          </div>

          {state.status === "paused" && (
            <section
              className="pause-card"
              aria-live="polite"
              aria-labelledby="paused-heading"
            >
              <p className="kicker">Session paused</p>
              <h2 id="paused-heading">Timer stopped.</h2>
              <button
                className="button button--primary button--full"
                onClick={() => dispatch({ type: "RESUME" })}
              >
                Resume workout
              </button>
            </section>
          )}
        </div>
      </section>

      <div className="player-dock">
        <div className="next-preview">
          {upcomingStep?.type === "rest" ? (
            <RecoveryVisual compact />
          ) : upcomingStep?.type !== "completed" && nextExercise ? (
            <ExerciseMedia key={nextExercise.id} exercise={nextExercise} compact preload="auto" />
          ) : null}
          <div className="next-preview-copy">
            <span>Up next</span>
            <strong>
              {upcomingStep?.type === "rest"
                ? "Recovery"
                : upcomingStep?.type === "completed"
                  ? "Finish workout"
                  : (nextExercise?.name ?? "Finish workout")}
            </strong>
            {upcomingStep?.type === "rest" && (
              <small>
                {upcomingStep.durationSeconds} seconds · Take a breath
              </small>
            )}
          </div>
        </div>
      </div>

      {showTechnique && instructionContent && (
        <div className="technique-backdrop" role="presentation">
          <section
            aria-labelledby="technique-heading"
            aria-modal="true"
            className="technique-sheet"
            ref={techniqueDialogRef}
            role="dialog"
            tabIndex={-1}
          >
            <div className="technique-sheet__header">
              <div>
                <p className="kicker">Movement guide</p>
                <h2 id="technique-heading">Technique</h2>
              </div>
              <button
                aria-label="Close technique"
                className="player-exit"
                onClick={closeTechnique}
                type="button"
              >
                <UiIcon name="close" />
              </button>
            </div>
            <div className="technique-sheet__content">
              <div>
                <span>Setup</span>
                <p>{instructionContent.setup}</p>
              </div>
              <div>
                <span>Do</span>
                <p>{instructionContent.techniqueCues[0]}</p>
              </div>
              <div>
                <span>Watch for</span>
                <p>{instructionContent.safetyCues[0]}</p>
              </div>
            </div>
          </section>
        </div>
      )}
      {showGuidanceSettings && (
        <div className="dialog-backdrop" role="presentation">
          <section
            aria-labelledby="guidance-settings-heading"
            aria-modal="true"
            className="continuity-dialog player-settings-dialog"
            ref={guidanceDialogRef}
            role="dialog"
            tabIndex={-1}
          >
            <div className="technique-sheet__header">
              <div>
                <p className="kicker">During this workout</p>
                <h2 id="guidance-settings-heading">Guidance settings</h2>
              </div>
              <button
                aria-label="Close guidance settings"
                className="player-exit"
                onClick={closeGuidanceSettings}
                type="button"
              >
                <UiIcon name="close" />
              </button>
            </div>
            <label className="setting-row">
              <span>
                <strong>Audio signals</strong>
                <small>
                  {audioSupported === null
                    ? "Checking browser support…"
                    : audioSupported
                      ? "Five countdown tones, then a distinct transition tone."
                      : "Audio is unavailable; visual cues remain active."}
                </small>
              </span>
              <input
                checked={preferencesReady && audioEnabled}
                disabled={!preferencesReady || audioSupported === false}
                onChange={(event) => setAudioEnabled(event.target.checked)}
                type="checkbox"
              />
            </label>
            <fieldset className="setting-fieldset" disabled={!preferencesReady}>
              <legend>Visual movement tempo</legend>
              <div className="segmented-control">
                {(["slower", "normal", "faster"] as const).map((cadence) => (
                  <button
                    aria-pressed={guidanceCadence === cadence}
                    key={cadence}
                    onClick={() => setGuidanceCadence(cadence)}
                    type="button"
                  >
                    {cadence[0].toUpperCase() + cadence.slice(1)}
                  </button>
                ))}
              </div>
              <small>
                Changes the visual rhythm without changing interval length or
                countdown tones.
              </small>
            </fieldset>
            <label className="setting-row">
              <span>
                <strong>Keep screen awake</strong>
                <small>
                  {wakeLockStatus === "active"
                    ? "Active while the workout runs."
                    : wakeLockStatus === "unsupported"
                      ? "Not supported by this browser."
                      : wakeLockStatus === "blocked"
                        ? "Browser permission was not available."
                        : "Activates when the timer is running."}
                </small>
              </span>
              <input
                checked={preferencesReady && keepScreenAwake}
                disabled={!preferencesReady || wakeLockStatus === "unsupported"}
                onChange={(event) => setKeepScreenAwake(event.target.checked)}
                type="checkbox"
              />
            </label>
            <div className="offline-media-row">
              <span>
                <strong>Current workout media</strong>
                <small role="status">
                  {mediaCache.status === "ready"
                    ? "Saved for this browser’s offline cache."
                    : mediaCache.status === "caching"
                      ? "Saving available media…"
                      : mediaCache.status === "error"
                        ? "Some media could not be saved. Try again online."
                        : mediaCache.status === "unsupported"
                          ? "Offline caching is unavailable in this browser."
                          : "Save the available clips and images for this workout."}
                </small>
              </span>
              <button
                className="button button--secondary button--small"
                disabled={
                  mediaCache.status === "caching" ||
                  mediaCache.status === "ready"
                }
                onClick={() => void mediaCache.cache()}
                type="button"
              >
                {mediaCache.status === "caching"
                  ? "Saving…"
                  : mediaCache.status === "ready"
                    ? "Saved"
                    : "Save offline"}
              </button>
            </div>
          </section>
        </div>
      )}
      {showExitConfirmation && (
        <div className="dialog-backdrop" role="presentation">
          <section
            aria-labelledby="leave-workout-heading"
            aria-modal="true"
            className="continuity-dialog"
            ref={exitDialogRef}
            role="dialog"
            tabIndex={-1}
          >
            <p className="kicker">Workout paused</p>
            <h2 id="leave-workout-heading">Leave workout?</h2>
            <p>Your progress is saved. You can resume later.</p>
            <div className="button-row">
              <button
                className="button button--primary"
                onClick={closeExitConfirmation}
                type="button"
              >
                Continue workout
              </button>
              <button
                className="button button--secondary"
                onClick={() => {
                  saveContinuity(true);
                  router.push(exitHref ?? `/workouts/${workout.slug}`);
                }}
                type="button"
              >
                Save &amp; exit
              </button>
              <button
                className="text-button text-button--danger"
                onClick={() => {
                  createBrowserWorkoutActivityRepository().finalizeIncompleteSession(
                    sessionId,
                    sessionSnapshot,
                    Math.round(activeDurationMs(Date.now()) / 1000),
                  );
                  continuityRepository.clearActive(sessionId);
                  router.push(exitHref ?? `/workouts/${workout.slug}`);
                }}
                type="button"
              >
                Save as incomplete
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
