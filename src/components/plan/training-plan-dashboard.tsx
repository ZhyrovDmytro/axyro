"use client";

import { getPlanProgress } from "@/domain/training-plan/plan-progress";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

import { UiIcon } from "@/components/ui-icon";
import { exercises } from "@/content/exercises";
import {
  addDays,
  formatPlanDate,
  fromDateKey,
  toDateKey,
} from "@/domain/training-plan/date";
import {
  describePlanRebalance,
  rebalancePlanAroundGames,
} from "@/domain/training-plan/generate-training-plan";
import {
  buildNextTrainingPlan,
  getTrainingPlanContinuityState,
} from "@/domain/training-plan/plan-continuity";
import {
  getPlanWeekNumber,
  getProgressionPhase,
  progressionPhases,
  TRAINING_PLAN_DURATION_DAYS,
  TRAINING_PLAN_WEEK_COUNT,
} from "@/domain/training-plan/progression";
import type {
  PlannedWorkout,
  ProgressionPhase,
} from "@/domain/training-plan/training-plan.types";
import { formatSessionDurationMinutes } from "@/domain/workout/session-duration";
import {
  calculateSessionSectionDuration,
  flattenSessionSections,
} from "@/domain/workout/session-sections";
import { getWorkoutTrainingTitle } from "@/domain/workout/training-title";
import { useTrainingPlan } from "@/hooks/use-training-plan";
import { useUserPreferences } from "@/hooks/use-user-preferences";
import { createBrowserWorkoutActivityRepository } from "@/services/persistence/local-workout-activity-repository";
import { ActiveWorkoutCard } from "@/components/workout/active-workout-card";
import { useWorkoutActivityHistory } from "@/hooks/use-workout-activity-history";
import { formatDurationPreferenceMessage } from "@/lib/format";
import { getPlannedWorkoutStartHref } from "@/lib/planned-workout-navigation";

import { getCalendarTrainingStatus } from "./calendar-training-status";

const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function EditGameIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M13.5 5.5 18.5 10.5M4 20l4.25-.85L19 8.4a2.12 2.12 0 0 0-3-3L5.15 16.25 4 20Z" />
      <path d="M12 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6" />
    </svg>
  );
}

function DeleteGameIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M4 7h16M9 7V4h6v3m3 0-1 13H7L6 7m4 4v5m4-5v5" />
    </svg>
  );
}

const painLabels: Record<string, string> = {
  shoulder: "Shoulder",
  "elbow-forearm": "Elbow / forearm",
  "wrist-hand": "Wrist / hand",
  "neck-upper-back": "Neck / upper back",
  "lower-back": "Lower back",
  "hip-groin": "Hip / groin",
  knee: "Knee",
  "calf-achilles": "Calf / Achilles",
  "ankle-foot": "Ankle / foot",
};

const phaseContent: Record<
  ProgressionPhase,
  { weeks: string; label: string; arc: string; reason: string }
> = {
  foundation: {
    weeks: "Weeks 1–2",
    label: "Foundation",
    arc: "Learn the movements",
    reason: "Start controlled. Focus on learning the movements.",
  },
  build: {
    weeks: "Weeks 3–5",
    label: "Build",
    arc: "A little more work",
    reason: "We’ve added a little more work this week.",
  },
  peak: {
    weeks: "Weeks 6–7",
    label: "Peak",
    arc: "Your strongest training week",
    reason: "This is your strongest training week.",
  },
  consolidate: {
    weeks: "Weeks 8–9",
    label: "Consolidate",
    arc: "Reduce fatigue, keep sharp",
    reason: "Less volume this week so you can recover while staying sharp.",
  },
};

function sessionMinutes(session: PlannedWorkout) {
  return formatSessionDurationMinutes(session.estimatedDurationSeconds);
}

function durationMessage(session: PlannedWorkout) {
  return formatDurationPreferenceMessage({
    actualSeconds: session.estimatedDurationSeconds,
    targetSeconds: session.targetDurationSeconds,
    status: session.durationStatus,
  });
}

function ProgressionSummary({ session }: { session: PlannedWorkout }) {
  const safetyReason = session.adjustments.find(
    (adjustment) => adjustment.source === "safety",
  );
  const feedbackReasons = session.adjustments.filter(
    (adjustment) => adjustment.source === "feedback",
  );
  const todayReasons = session.adjustments.filter(
    (adjustment) => adjustment.source === "today_adaptation",
  );
  const todayExplanations = [
    todayReasons.some((reason) => reason.type === "shortened")
      ? "Shortened for the time you have available today while preserving the main movements."
      : null,
    todayReasons.some(
      (reason) =>
        reason.type === "equipment_replacement" ||
        (reason.type === "exercise_removed" &&
          "unavailableEquipment" in reason),
    )
      ? "Movements needing unavailable equipment were replaced or removed while keeping the session’s purpose."
      : null,
    todayReasons.some((reason) => reason.type === "exercise_replacement")
      ? "Your selected exercise was replaced with a compatible movement."
      : null,
    todayReasons.some(
      (reason) =>
        reason.type === "comfort_replacement" ||
        (reason.type === "exercise_removed" && "excludedBodyAreas" in reason),
    )
      ? "Exercises loading the area you flagged were replaced or removed for today."
      : null,
    todayReasons.some(
      (reason) =>
        reason.type === "lighter_work" || reason.type === "lighter_recovery",
    )
      ? "Today’s version uses slightly less work and a little more recovery."
      : null,
  ].filter((explanation): explanation is string => explanation !== null);
  const feedbackExplanation = feedbackReasons[0]
    ? feedbackReasons[0].rating === "too-easy"
      ? feedbackReasons[0].type === "decrease_recovery"
        ? "Your last comparable session felt easy, so one recovery interval is shorter."
        : feedbackReasons[0].type === "add_round"
          ? "Your last comparable session felt easy, so one appropriate round was added."
          : "Your last comparable session felt easy, so one work interval is slightly longer."
      : feedbackReasons[0].type === "increase_recovery"
        ? "Your last comparable session felt hard, so you have extra recovery."
        : feedbackReasons[0].type === "remove_round"
          ? "Your last comparable session felt hard, so one added round was removed."
          : "Your last comparable session felt hard, so one work interval is slightly shorter."
    : null;
  const safetyExplanation = safetyReason
    ? `Progression is paused for ${(painLabels[safetyReason.affectedArea] ?? "the affected area").toLowerCase()}. Review the flagged exercises before training.`
    : null;
  const weeklyExplanations = session.progression.changes
    .slice(0, 2)
    .map((change) => {
      const exerciseName =
        exercises.find((exercise) => exercise.id === change.exerciseId)?.name ??
        "This exercise";
      if (change.type === "work_duration_increased") {
        return `${exerciseName}: work intervals are ${change.seconds} seconds longer.`;
      }
      if (change.type === "work_duration_reduced") {
        return `${exerciseName}: work intervals are ${change.seconds} seconds shorter.`;
      }
      if (change.type === "round_added") {
        return `${exerciseName}: ${change.rounds} extra ${change.rounds === 1 ? "round" : "rounds"}.`;
      }
      if (change.type === "round_removed") {
        return `${exerciseName}: ${change.rounds} fewer ${change.rounds === 1 ? "round" : "rounds"}.`;
      }
      if (!("recovery" in change)) {
        return `${exerciseName}: progression adjusted this week.`;
      }
      const recoveryPoint =
        change.recovery === "between_sets"
          ? "between sets"
          : "before the next exercise";
      return change.type === "recovery_reduced"
        ? `${exerciseName}: ${change.seconds} seconds less recovery ${recoveryPoint}.`
        : `${exerciseName}: ${change.seconds} seconds more recovery ${recoveryPoint}.`;
    });
  if (
    weeklyExplanations.length === 0 &&
    !feedbackExplanation &&
    !safetyExplanation &&
    todayExplanations.length === 0
  ) {
    return null;
  }
  return (
    <div
      className={`progression-summary${feedbackExplanation ? " progression-summary--feedback" : ""}${safetyExplanation ? " progression-summary--pain" : ""}`}
    >
      <strong>
        {todayExplanations.length > 0
          ? "Adapted for today"
          : safetyExplanation || feedbackExplanation
            ? "Adjusted for you"
            : "Progressed this week"}
      </strong>
      {weeklyExplanations.map((explanation) => (
        <p key={explanation}>{explanation}</p>
      ))}
      {feedbackExplanation && <p>{feedbackExplanation}</p>}
      {safetyExplanation && <p>{safetyExplanation}</p>}
      {todayExplanations.map((explanation) => (
        <p key={explanation}>{explanation}</p>
      ))}
    </div>
  );
}

export function TrainingPlanDashboard({
  view = "overview",
}: {
  view?: "overview" | "workspace";
}) {
  const { plan, ready, setPlan, updatePlan, needsCatalogRefresh } =
    useTrainingPlan();
  const { preferredIntensity, ready: preferencesReady } = useUserPreferences();
  const [selectedDate, setSelectedDate] = useState("");
  const [visibleSessionCount, setVisibleSessionCount] = useState(6);
  const [rebalanceResult, setRebalanceResult] = useState("");
  const [gameLabel, setGameLabel] = useState("Padel match");
  const [isGameDialogOpen, setIsGameDialogOpen] = useState(false);
  const weeklyMatchTrigger = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    if (!isGameDialogOpen) weeklyMatchTrigger.current?.focus();
  }, [isGameDialogOpen]);
  const [gamePendingDeletionId, setGamePendingDeletionId] = useState<
    string | null
  >(null);
  const [keepPainExclusions, setKeepPainExclusions] = useState(false);
  const today = toDateKey(new Date());
  const activityHistory = useWorkoutActivityHistory(today);

  const calendarDays = useMemo(() => {
    if (!plan) return [];
    const first = fromDateKey(plan.startDate);
    const mondayOffset = (first.getDay() + 6) % 7;
    const calendarLength =
      Math.ceil((mondayOffset + TRAINING_PLAN_DURATION_DAYS) / 7) * 7;
    return Array.from({ length: calendarLength }, (_, index) => {
      const offset = index - mondayOffset;
      const date = addDays(plan.startDate, offset);
      return { date, inPlan: date >= plan.startDate && date <= plan.endDate };
    });
  }, [plan]);

  if (!ready) {
    return (
      <main className="page-shell plan-loading" aria-live="polite">
        Loading your plan…
      </main>
    );
  }

  if (!plan) {
    return (
      <main className="page-shell plan-empty">
        <section>
          {needsCatalogRefresh && (
            <p role="status">
              Your saved plan uses exercises that have been retired. Create an
              updated plan from the 50-exercise library. Your activity history
              is preserved.
            </p>
          )}
          <h1>Train for the way you play.</h1>
          <p className="lede">
            Start with 10 minutes on your training days. A few answers shape
            your next 60 days, with 5- and 20-minute options when you need them.
          </p>
          <div className="plan-benefits" aria-label="Plan features">
            <div>
              <span>01</span>
              <strong>Built around your week</strong>
              <p>Choose realistic days and session length.</p>
            </div>
            <div>
              <span>02</span>
              <strong>Ready for match days</strong>
              <p>Add games and rebalance recovery.</p>
            </div>
            <div>
              <span>03</span>
              <strong>Always editable</strong>
              <p>Move sessions or tailor every interval.</p>
            </div>
          </div>
          <div className="button-row">
            <Link className="button button--primary" href="/plan/setup">
              Create my plan <UiIcon name="arrow-right" />
            </Link>
            <Link className="text-link" href="/workouts">
              Try a quick workout
            </Link>
          </div>
          <small className="plan-local-note">
            About 2 minutes · Saved only on this device
          </small>
        </section>
      </main>
    );
  }

  const upcoming = [...plan.sessions]
    .filter(
      (session) =>
        session.status === "scheduled" && session.scheduledDate >= today,
    )
    .sort((left, right) =>
      left.scheduledDate.localeCompare(right.scheduledDate),
    );
  const selectedGame = plan.games.find((game) => game.date === selectedDate);
  const gamePendingDeletion = plan.games.find(
    (game) => game.id === gamePendingDeletionId,
  );
  const selectedSession = plan.sessions.find(
    (session) => session.scheduledDate === selectedDate,
  );
  const todaySession = upcoming.find(
    (session) => session.scheduledDate === today,
  );
  const currentWeekNumber = getPlanWeekNumber(plan.startDate, today);
  const planActivities = activityHistory.filter(
    (activity) => activity.planId === plan.generatedAt,
  );
  const missed = planActivities.filter(
    (activity) => activity.status === "missed",
  );
  const planComplete =
    getTrainingPlanContinuityState(plan, today) === "PLAN_COMPLETE";

  const gameDialog = selectedDate && isGameDialogOpen && (
    <div
      className="dialog-backdrop"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) {
          setIsGameDialogOpen(false);
        }
      }}
      role="presentation"
    >
      <form
        aria-labelledby="game-dialog-label game-dialog-heading"
        aria-modal="true"
        className="game-dialog"
        onKeyDown={(event) => {
          if (event.key === "Escape") setIsGameDialogOpen(false);
          if (event.key === "Tab") {
            const controls =
              event.currentTarget.querySelectorAll<HTMLElement>(
                "button, input",
              );
            const first = controls[0];
            const last = controls[controls.length - 1];
            if (event.shiftKey && document.activeElement === first) {
              event.preventDefault();
              last?.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
              event.preventDefault();
              first?.focus();
            }
          }
        }}
        onSubmit={addGame}
        role="dialog"
      >
        <div className="game-dialog__heading">
          <div>
            <p className="kicker" id="game-dialog-label">
              {selectedGame ? "Edit game" : "Add game"}
            </p>
            <h2 id="game-dialog-heading">{formatPlanDate(selectedDate)}</h2>
          </div>
          <button
            aria-label="Close game dialog"
            onClick={() => setIsGameDialogOpen(false)}
            type="button"
          >
            <UiIcon name="close" />
          </button>
        </div>
        <label className="game-dialog__field">
          <span>Game name</span>
          <input
            autoFocus
            className="plan-input"
            maxLength={80}
            onChange={(event) => setGameLabel(event.target.value)}
            value={gameLabel}
          />
        </label>
        <p className="game-dialog__note">
          We’ll protect recovery before this game when you rebalance your plan.
        </p>
        <div className="game-dialog__actions">
          <button
            className="button button--primary button--small"
            type="submit"
          >
            {selectedGame ? "Update game" : "Save game"}
          </button>
          <button
            className="button button--secondary button--small"
            onClick={() => setIsGameDialogOpen(false)}
            type="button"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );

  if (view === "overview") {
    const nextSession = todaySession ?? upcoming[0];
    const todayDate = fromDateKey(today);
    const mondayOffset = (todayDate.getDay() + 6) % 7;
    const weekStart = addDays(today, -mondayOffset);
    const weekDates = Array.from({ length: 7 }, (_, index) =>
      addDays(weekStart, index),
    );
    const { completedCount, extraCount } = getPlanProgress(
      plan,
      activityHistory,
    );
    const totalCount = plan.sessions.length;
    const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

    return (
      <main className="page-shell page-shell--inner plan-overview">
        <header className="plan-overview__header">
          <div>
            <h1>What’s next?</h1>
          </div>
          <Link className="text-link" href="/plan/refine">
            Adjust my plan
          </Link>
        </header>

        <div className="daily-plan-note">
          <div>
            <strong>
              {plan.profile.sessionDurationMinutes} minutes, made for your day.
            </strong>
            <p>
              10 is our daily default. Choose 5 or 20 whenever your schedule
              changes.
            </p>
          </div>
          <Link className="text-link" href="/plan/refine">
            Change session length <UiIcon name="arrow-right" />
          </Link>
        </div>
        <section
          className="plan-next-session"
          aria-labelledby="next-session-heading"
        >
          <div>
            <p className="kicker">
              {todaySession
                ? "Today’s workout"
                : nextSession
                  ? `Next · ${formatPlanDate(nextSession.scheduledDate, { weekday: "long", month: "short", day: "numeric" })}`
                  : "Training block"}
            </p>
            <h2 id="next-session-heading">
              {nextSession
                ? getWorkoutTrainingTitle(nextSession.workout)
                : "You’re all caught up."}
            </h2>
            <p>
              {nextSession
                ? `${sessionMinutes(nextSession)} min · ${flattenSessionSections(nextSession.sections).length} exercises · ${nextSession.workout.difficulty}`
                : "There are no scheduled sessions left in this block."}
            </p>
          </div>
          <div className="button-row">
            {nextSession && (
              <Link
                className="button button--primary"
                href={
                  todaySession
                    ? getPlannedWorkoutStartHref(
                        nextSession.id,
                        preferredIntensity,
                        preferencesReady,
                      )
                    : `/plan/workouts/${nextSession.id}/edit`
                }
              >
                {todaySession ? "Start workout" : "Review next workout"}
                <UiIcon name="arrow-right" />
              </Link>
            )}
            <Link className="button button--secondary" href="/workouts">
              Choose a quick workout
            </Link>
          </div>
        </section>

        <section className="plan-week" aria-labelledby="this-week-heading">
          <div className="section-heading section-heading--compact">
            <div>
              <p className="kicker">Your rhythm</p>
              <h2 id="this-week-heading">This week</h2>
            </div>
            {plan.games.length > 0 && (
              <button
                className="button button--small rebalance-button"
                onClick={rebalancePlan}
                type="button"
              >
                <span aria-hidden="true" className="rebalance-button__icon">
                  <UiIcon name="sparkle" />
                </span>
                <span>
                  <strong>Rebalance plan</strong>
                  <small>Around your games</small>
                </span>
              </button>
            )}
          </div>
          {rebalanceResult && (
            <p role="status" className="calendar-help">
              {rebalanceResult}
            </p>
          )}
          <ol className="plan-week__days">
            {weekDates.map((date) => {
              const session = plan.sessions.find(
                (candidate) =>
                  candidate.scheduledDate === date &&
                  candidate.status !== "skipped",
              );
              const game = plan.games.find(
                (candidate) => candidate.date === date,
              );
              const isToday = date === today;
              return (
                <li
                  className={`${session ? "has-session" : ""}${game ? " has-game" : ""}${isToday ? " is-today" : ""}`}
                  key={date}
                >
                  <span>
                    {formatPlanDate(date, { weekday: "short" })}
                    <small>{fromDateKey(date).getDate()}</small>
                  </span>
                  <div className="plan-week__summary">
                    <strong>
                      {session
                        ? getWorkoutTrainingTitle(session.workout)
                        : game
                          ? game.label
                          : "Recovery"}
                    </strong>
                    <small>
                      {session
                        ? `${sessionMinutes(session)} min${session.status !== "scheduled" ? ` · ${session.status === "in-progress" ? "In progress" : session.status === "completed" ? "Done" : session.status === "missed" ? "Missed" : session.status === "incomplete" ? "Incomplete" : "Cancelled"}` : ""}`
                        : game
                          ? "Match day"
                          : isToday
                            ? "Today"
                            : "No workout"}
                    </small>
                    {game && session && (
                      <>
                        <small>{game.label} · Match day</small>
                        <span className="plan-week__overlap">
                          Training + match · Same day
                        </span>
                      </>
                    )}
                  </div>
                  <div className="plan-week__match">
                    {session?.status === "scheduled" && (
                      <details className="plan-week__move">
                        <summary>Move training</summary>
                        <form
                          onSubmit={(event) => {
                            event.preventDefault();
                            const date = String(
                              new FormData(event.currentTarget).get("date"),
                            );
                            if (moveSession(session, date)) {
                              event.currentTarget
                                .closest("details")
                                ?.removeAttribute("open");
                            }
                          }}
                        >
                          <label>
                            New training date
                            <input
                              className="plan-input"
                              type="date"
                              name="date"
                              defaultValue={
                                session.scheduledDate < today
                                  ? today
                                  : session.scheduledDate
                              }
                              min={today}
                              max={plan.endDate}
                              required
                            />
                          </label>
                          <button
                            className="button button--primary button--small"
                            type="submit"
                          >
                            Save date
                          </button>
                        </form>
                      </details>
                    )}
                    <button
                      aria-label={`${game ? "Edit" : "Add"} match on ${formatPlanDate(date)}`}
                      className="button button--secondary button--small"
                      onClick={(event) => {
                        weeklyMatchTrigger.current = event.currentTarget;
                        setSelectedDate(date);
                        setGameLabel(game?.label ?? "Padel match");
                        setIsGameDialogOpen(true);
                      }}
                      type="button"
                    >
                      <UiIcon name={game ? "scheduled" : "plus"} />
                      {game ? "Edit match" : "Add match"}
                    </button>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>

        <section className="plan-progress" aria-labelledby="progress-heading">
          <div>
            <p className="kicker">60-day progress</p>
            <h2 id="progress-heading">
              {completedCount} of {totalCount} planned sessions complete
            </h2>
            {extraCount > 0 && (
              <p>
                +{extraCount} extra {extraCount === 1 ? "session" : "sessions"}{" "}
                completed
              </p>
            )}
            <div
              aria-label={`${Math.round(progress)}% complete`}
              aria-valuemax={100}
              aria-valuemin={0}
              aria-valuenow={Math.round(progress)}
              className="plan-progress__track"
              role="progressbar"
            >
              <span style={{ width: `${progress}%` }} />
            </div>
            <p>
              Week{" "}
              {Math.min(
                TRAINING_PLAN_WEEK_COUNT,
                Math.max(1, currentWeekNumber ?? 1),
              )}{" "}
              of {TRAINING_PLAN_WEEK_COUNT} · {upcoming.length} sessions ahead
            </p>
          </div>
          <Link className="text-link" href="/activity">
            View activity <UiIcon name="arrow-right" />
          </Link>
        </section>

        {gameDialog}

        <nav className="plan-workspace-links" aria-label="Plan workspace">
          <Link className="button button--primary" href="/plan/calendar">
            View full calendar <UiIcon name="arrow-right" />
          </Link>
          {plan.profile.sport === "padel" && (
            <Link className="button button--secondary" href="/plan/refine">
              Refine my plan
            </Link>
          )}
        </nav>
      </main>
    );
  }

  function rebalancePlan() {
    updatePlan((current) => {
      const next = rebalancePlanAroundGames(current);
      setRebalanceResult(describePlanRebalance(current, next));
      return next;
    });
  }

  function addGame(event: FormEvent) {
    event.preventDefault();
    if (!selectedDate || !plan) return;
    const importance = selectedGame?.importance ?? "normal";
    updatePlan((current) => ({
      ...current,
      profile: {
        ...current.profile,
        matches: [
          ...current.profile.matches.filter(
            (match) => match.date !== selectedDate,
          ),
          { date: selectedDate, importance },
        ].sort((left, right) => left.date.localeCompare(right.date)),
      },
      games: [
        ...current.games.filter((game) => game.date !== selectedDate),
        {
          id: `game-${selectedDate}`,
          date: selectedDate,
          label: gameLabel.trim() || "Match",
          importance,
        },
      ].sort((left, right) => left.date.localeCompare(right.date)),
    }));
    setIsGameDialogOpen(false);
  }

  function removeSession(session: PlannedWorkout) {
    if (!window.confirm("Cancel this planned session?")) return;
    createBrowserWorkoutActivityRepository().cancelSession(session.id);
    updatePlan((current) => ({
      ...current,
      sessions: current.sessions.filter((item) => item.id !== session.id),
    }));
  }

  function skipSession(session: PlannedWorkout) {
    if (!window.confirm("Skip this workout?")) return;
    createBrowserWorkoutActivityRepository().skipSession(session.id);
    updatePlan((current) => ({
      ...current,
      sessions: current.sessions.map((item) =>
        item.id === session.id ? { ...item, status: "skipped" } : item,
      ),
    }));
  }

  function moveSession(session: PlannedWorkout, date: string) {
    if (!plan || date < today || date > plan.endDate) return false;
    const conflict = plan?.sessions.some(
      (candidate) =>
        candidate.id !== session.id &&
        candidate.status === "scheduled" &&
        candidate.scheduledDate === date,
    );
    if (conflict) {
      window.alert(
        `You already have a workout on ${formatPlanDate(date)}. Choose another day.`,
      );
      return false;
    }
    createBrowserWorkoutActivityRepository().rescheduleSession(
      session.id,
      date,
    );
    updatePlan((current) => ({
      ...current,
      sessions: current.sessions.map((item) =>
        item.id === session.id
          ? { ...item, scheduledDate: date, status: "scheduled" }
          : item,
      ),
    }));
    return true;
  }

  function removeGame(gameId: string) {
    updatePlan((current) => {
      const removed = current.games.find((game) => game.id === gameId);
      return {
        ...current,
        profile: {
          ...current.profile,
          matches: removed
            ? current.profile.matches.filter(
                (match) => match.date !== removed.date,
              )
            : current.profile.matches,
        },
        games: current.games.filter((game) => game.id !== gameId),
      };
    });
    setIsGameDialogOpen(false);
    setGamePendingDeletionId(null);
  }

  return (
    <main className="page-shell page-shell--inner plan-page">
      <section className="plan-hero">
        <div>
          <p className="kicker">Plan workspace</p>
          <h1>Your full plan.</h1>
          <p className="lede">
            {plan.profile.sessionsPerWeek} training days a week ·{" "}
            {plan.profile.sessionDurationMinutes}-minute target ·{" "}
            {plan.profile.sport === "padel"
              ? "Padel focus"
              : "General foundations"}
          </p>
          <p className="plan-block-range">
            {formatPlanDate(plan.startDate, { month: "short", day: "numeric" })}{" "}
            — {formatPlanDate(plan.endDate, { month: "short", day: "numeric" })}
            {" · "}
            {upcoming.length} sessions ahead
          </p>
          <Link className="text-link" href="/plan">
            <UiIcon name="arrow-left" /> Back to plan overview
          </Link>
        </div>
      </section>

      <ActiveWorkoutCard />

      {todaySession && (
        <section
          className="plan-today-card"
          aria-labelledby="plan-today-heading"
        >
          <div>
            <p className="kicker">Training today</p>
            <h2 id="plan-today-heading">
              {getWorkoutTrainingTitle(todaySession.workout)}
            </h2>
            <p>
              {sessionMinutes(todaySession)} min ·{" "}
              {flattenSessionSections(todaySession.sections).length} exercises ·{" "}
              {todaySession.workout.difficulty}
            </p>
          </div>
          <div className="button-row">
            <Link
              className="button button--primary"
              href={getPlannedWorkoutStartHref(
                todaySession.id,
                preferredIntensity,
                preferencesReady,
              )}
            >
              Start workout <UiIcon name="arrow-right" />
            </Link>
            <Link
              className="button button--secondary"
              href={`/plan/workouts/${todaySession.id}/edit`}
            >
              Review workout
            </Link>
          </div>
        </section>
      )}

      {missed.length > 0 && (
        <section
          className="missed-workout-card"
          aria-labelledby="missed-heading"
        >
          <p className="kicker">Plan continuity</p>
          <h2 id="missed-heading">
            {missed.length === 1
              ? "You missed a workout"
              : `You have ${missed.length} missed workouts`}
          </h2>
          {missed.length === 1 ? (
            (() => {
              const activity = missed[0];
              const session = plan.sessions.find(
                (item) => item.id === activity.sessionId,
              );
              if (!session)
                return <p>Review Activity to decide what to do next.</p>;
              return (
                <>
                  <p>
                    {getWorkoutTrainingTitle(session.workout)} ·{" "}
                    {sessionMinutes(session)} min
                  </p>
                  <div className="button-row">
                    <button
                      className="button button--primary"
                      onClick={() => moveSession(session, today)}
                      type="button"
                    >
                      Do it today
                    </button>
                    <details>
                      <summary className="button button--secondary">
                        Reschedule
                      </summary>
                      <form
                        onSubmit={(event) => {
                          event.preventDefault();
                          const date = String(
                            new FormData(event.currentTarget).get("date"),
                          );
                          moveSession(session, date);
                        }}
                      >
                        <label>
                          New date
                          <input
                            className="plan-input"
                            min={today}
                            name="date"
                            required
                            type="date"
                          />
                        </label>
                        <button
                          className="button button--primary button--small"
                          type="submit"
                        >
                          Move workout
                        </button>
                      </form>
                    </details>
                    <button
                      className="text-button"
                      onClick={() => skipSession(session)}
                      type="button"
                    >
                      Skip it
                    </button>
                  </div>
                </>
              );
            })()
          ) : (
            <p>
              Review the dates below or open Activity. Nothing has been added to
              a future workout automatically.
            </p>
          )}
          {missed.length > 1 && (
            <Link className="button button--secondary" href="/activity">
              Review plan
            </Link>
          )}
        </section>
      )}

      {planComplete && (
        <section
          className="plan-complete-card"
          aria-labelledby="plan-complete-heading"
        >
          <p className="kicker">60 days complete</p>
          <h2 id="plan-complete-heading">Your training block is complete.</h2>
          <dl className="completion-stats">
            <div>
              <dt>Completed</dt>
              <dd>
                {
                  planActivities.filter(
                    (activity) => activity.status === "completed",
                  ).length
                }
              </dd>
            </div>
            <div>
              <dt>Skipped</dt>
              <dd>
                {
                  planActivities.filter(
                    (activity) => activity.status === "skipped",
                  ).length
                }
              </dd>
            </div>
            <div>
              <dt>Missed</dt>
              <dd>{missed.length}</dd>
            </div>
            <div>
              <dt>Trained</dt>
              <dd>
                {formatSessionDurationMinutes(
                  planActivities.reduce(
                    (total, activity) =>
                      total + (activity.actualDurationSeconds ?? 0),
                    0,
                  ),
                )}{" "}
                min
              </dd>
            </div>
          </dl>
          {plan.profile.painAreas.length > 0 && (
            <label className="plan-complete-card__check">
              <input
                checked={keepPainExclusions}
                onChange={(event) =>
                  setKeepPainExclusions(event.target.checked)
                }
                type="checkbox"
              />
              I still need my current pain/discomfort exclusions
            </label>
          )}
          <p>
            Your next block keeps your sport, goals, physical focus, padel
            priorities, equipment, level, schedule and duration. Recent workout
            feedback is applied conservatively.
          </p>
          <div className="button-row">
            <button
              className="button button--primary"
              onClick={() => {
                const repository = createBrowserWorkoutActivityRepository();
                setPlan(
                  buildNextTrainingPlan({
                    previousPlan: plan,
                    now: new Date(),
                    recentFeedback: repository.getRecentFeedbackForAdaptation(),
                    keepPainExclusions,
                  }),
                );
              }}
              type="button"
            >
              Build next 60 days
            </button>
            <Link className="button button--secondary" href="/activity">
              Review activity
            </Link>
          </div>
        </section>
      )}

      <div className="plan-dashboard-grid">
        <section className="calendar-card" aria-labelledby="calendar-heading">
          <div className="calendar-heading">
            <div>
              <p className="kicker">Plan at a glance</p>
              <h2 id="calendar-heading">Next 60 days</h2>
            </div>
            {plan.games.length > 0 && (
              <button
                className="button button--small rebalance-button"
                onClick={rebalancePlan}
                type="button"
              >
                <span aria-hidden="true" className="rebalance-button__icon">
                  <UiIcon name="sparkle" />
                </span>
                <span>
                  <strong>Rebalance plan</strong>
                  <small>Around your games</small>
                </span>
              </button>
            )}
          </div>
          {rebalanceResult && (
            <p role="status" className="calendar-help">
              {rebalanceResult}
            </p>
          )}
          <p className="calendar-help">
            Tap a training day to see the workout, or any date to add a match.
            Upcoming training is orange; checks mark completed workouts.
          </p>
          <div
            className="calendar-grid"
            role="grid"
            aria-label="60-day training calendar"
          >
            {weekDays.map((day) => (
              <span className="calendar-weekday" key={day} role="columnheader">
                {day}
              </span>
            ))}
            {calendarDays.map(({ date, inPlan }) => {
              const session = plan.sessions.find(
                (item) => item.scheduledDate === date,
              );
              const game = plan.games.find((item) => item.date === date);
              const isSelected = selectedDate === date;
              const isToday = date === today;
              const trainingStatus = session
                ? getCalendarTrainingStatus(session.status, isToday)
                : null;
              return (
                <button
                  aria-current={isToday ? "date" : undefined}
                  aria-label={`${isToday ? "Today, " : ""}${formatPlanDate(date)}${session ? `, ${trainingStatus?.label}, training: ${getWorkoutTrainingTitle(session.workout)}` : ""}${game ? `, ${game.label}` : ""}`}
                  aria-selected={isSelected}
                  className={`calendar-day${!inPlan ? " calendar-day--outside" : ""}${session ? " calendar-day--training" : ""}${game ? " calendar-day--game" : ""}${trainingStatus ? ` calendar-day--${trainingStatus.tone}` : ""}${isSelected ? " calendar-day--selected" : ""}${isToday ? " calendar-day--today" : ""}`}
                  disabled={!inPlan || date < today}
                  key={date}
                  onClick={() => {
                    setSelectedDate(date);
                    setGameLabel(game?.label ?? "Padel match");
                    setIsGameDialogOpen(false);
                  }}
                  role="gridcell"
                  type="button"
                >
                  <span>{fromDateKey(date).getDate()}</span>
                  <small className="calendar-day__labels">
                    {trainingStatus && (
                      <span className="calendar-day__status">
                        {trainingStatus.icon && (
                          <UiIcon name={trainingStatus.icon} />
                        )}
                        <span className="calendar-status-text">
                          {trainingStatus.label}
                        </span>
                        <span className="calendar-status-compact">
                          {trainingStatus.compactLabel}
                        </span>
                      </span>
                    )}
                    {game && <span className="calendar-day__match">Match</span>}
                    {!session && !game && isToday ? "Today" : null}
                  </small>
                </button>
              );
            })}
          </div>
          {selectedDate && (
            <section
              aria-label={`Selected day: ${formatPlanDate(selectedDate)}`}
              className="selected-calendar-day"
            >
              <div className="selected-calendar-day__heading">
                <div>
                  <span>Selected day</span>
                  <strong>{formatPlanDate(selectedDate)}</strong>
                </div>
                <button
                  aria-label="Close selected day"
                  onClick={() => {
                    setIsGameDialogOpen(false);
                    setSelectedDate("");
                  }}
                  type="button"
                >
                  <UiIcon name="close" />
                </button>
              </div>

              {selectedSession && (
                <div className="calendar-workout-selection">
                  <Link
                    aria-label={`View ${getWorkoutTrainingTitle(selectedSession.workout)} exercises`}
                    className="calendar-workout-preview"
                    href={`/plan/workouts/${selectedSession.id}/edit`}
                  >
                    <div className="calendar-workout-preview__topline">
                      <span>
                        {selectedSession.status === "completed"
                          ? "Completed workout"
                          : selectedSession.status === "skipped"
                            ? "Skipped workout"
                            : "Planned workout"}
                      </span>
                      {selectedSession.isEdited && <span>Edited</span>}
                      {selectedSession.todayAdaptations.length > 0 && (
                        <span>Adapted today</span>
                      )}
                    </div>
                    <strong>
                      {getWorkoutTrainingTitle(selectedSession.workout)}
                    </strong>
                    <div className="calendar-workout-preview__meta">
                      <span>{sessionMinutes(selectedSession)} min</span>
                      <span>
                        {
                          flattenSessionSections(selectedSession.sections)
                            .length
                        }{" "}
                        exercises
                      </span>
                      <span>{selectedSession.workout.difficulty}</span>
                    </div>
                    <div className="session-section-summary">
                      {selectedSession.sections.map((section) => (
                        <span key={section.type}>
                          {section.type === "warmup"
                            ? "Warm-up"
                            : section.type === "cooldown"
                              ? "Cooldown"
                              : "Workout"}{" "}
                          ·{" "}
                          {formatSessionDurationMinutes(
                            calculateSessionSectionDuration(section),
                          )}{" "}
                          min
                        </span>
                      ))}
                    </div>
                    {selectedSession.durationStatus !== "on_target" && (
                      <small>{durationMessage(selectedSession)}</small>
                    )}
                    <ProgressionSummary session={selectedSession} />
                    <span className="calendar-workout-preview__action">
                      View exercises <UiIcon name="arrow-right" />
                    </span>
                  </Link>
                  {selectedSession.scheduledDate === today &&
                    selectedSession.status === "scheduled" && (
                      <Link
                        className="button button--primary button--full"
                        href={getPlannedWorkoutStartHref(
                          selectedSession.id,
                          preferredIntensity,
                          preferencesReady,
                        )}
                      >
                        Start today’s workout
                      </Link>
                    )}
                  <button
                    className="cancel-calendar-training"
                    onClick={() => {
                      removeSession(selectedSession);
                      setSelectedDate("");
                    }}
                    type="button"
                  >
                    Cancel training
                  </button>
                </div>
              )}

              {!selectedSession && !selectedGame && (
                <p className="selected-calendar-day__empty">
                  No training or game is planned for this day.
                </p>
              )}

              {selectedGame && (
                <div className="selected-game-summary">
                  <div className="selected-game-summary__content">
                    <span>Game</span>
                    <strong>{selectedGame.label}</strong>
                  </div>
                  <div
                    aria-label="Game actions"
                    className="selected-game-summary__actions"
                    role="group"
                  >
                    <button
                      aria-label={`Edit ${selectedGame.label}`}
                      onClick={() => {
                        setGameLabel(selectedGame.label);
                        setIsGameDialogOpen(true);
                      }}
                      title="Edit game"
                      type="button"
                    >
                      <EditGameIcon />
                    </button>
                    <button
                      aria-label={`Delete ${selectedGame.label}`}
                      className="selected-game-summary__delete"
                      onClick={() => setGamePendingDeletionId(selectedGame.id)}
                      title="Delete match"
                      type="button"
                    >
                      <DeleteGameIcon />
                    </button>
                  </div>
                </div>
              )}

              {!selectedGame && (
                <button
                  className="button button--secondary button--small selected-day-game-action"
                  onClick={() => {
                    setGameLabel("Padel match");
                    setIsGameDialogOpen(true);
                  }}
                  type="button"
                >
                  <UiIcon name="plus" />
                  Add game
                </button>
              )}
            </section>
          )}
          {gameDialog}
          {gamePendingDeletion && (
            <div
              className="dialog-backdrop"
              onMouseDown={(event) => {
                if (event.currentTarget === event.target) {
                  setGamePendingDeletionId(null);
                }
              }}
              role="presentation"
            >
              <section
                aria-describedby="delete-game-description"
                aria-labelledby="delete-game-heading"
                aria-modal="true"
                className="delete-game-dialog"
                onKeyDown={(event) => {
                  if (event.key === "Escape") setGamePendingDeletionId(null);
                }}
                role="dialog"
              >
                <p className="kicker">Delete match</p>
                <h2 id="delete-game-heading">Delete this match?</h2>
                <p id="delete-game-description">
                  “{gamePendingDeletion.label}” on{" "}
                  {formatPlanDate(gamePendingDeletion.date)} will be removed
                  from your plan. This can’t be undone.
                </p>
                <div className="delete-game-dialog__actions">
                  <button
                    autoFocus
                    className="button button--secondary button--small"
                    onClick={() => setGamePendingDeletionId(null)}
                    type="button"
                  >
                    Cancel
                  </button>
                  <button
                    className="button button--danger button--small"
                    onClick={() => removeGame(gamePendingDeletion.id)}
                    type="button"
                  >
                    Delete match
                  </button>
                </div>
              </section>
            </div>
          )}
          <div className="calendar-legend" aria-label="Calendar legend">
            <span>
              <i className="legend-train" /> Training
            </span>
            <span>
              <i className="legend-game" /> Match
            </span>
            <span>
              <UiIcon name="check" className="legend-done" /> Done
            </span>
            <span>
              <UiIcon name="skip" className="legend-skipped" /> Skipped
            </span>
          </div>
        </section>

        <aside className="plan-context" aria-labelledby="matches-heading">
          <p className="kicker">Court calendar</p>
          <h2 id="matches-heading">Upcoming games</h2>
          {plan.games.length === 0 ? (
            <p>
              No games added yet. Select a calendar date to protect recovery
              around a match.
            </p>
          ) : (
            <ul className="game-list">
              {plan.games.map((game) => (
                <li key={game.id}>
                  <span>
                    <strong>{game.label}</strong>
                    <small>{formatPlanDate(game.date)}</small>
                  </span>
                  <button
                    aria-label={`Delete ${game.label} on ${formatPlanDate(game.date)}`}
                    className="game-remove-button"
                    onClick={() => setGamePendingDeletionId(game.id)}
                    type="button"
                  >
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="smart-note">
            <UiIcon name="sparkle" />
            <div>
              <strong>Make room for your matches</strong>
              <p>
                Match dates help protect recovery around your games. Workout
                feedback helps shape future sessions.
              </p>
            </div>
          </div>
        </aside>
      </div>

      <section
        className="plan-explanation"
        aria-labelledby="plan-explanation-heading"
      >
        <h2 id="plan-explanation-heading">Why this plan fits you</h2>
        <p>
          Your training days, equipment and priorities shape this schedule. Each
          session includes movement and recovery within your{" "}
          {plan.profile.sessionDurationMinutes}-minute target. Match dates help
          protect recovery around your games.
        </p>
        <div className="button-row">
          <Link className="text-link" href="/plan/refine">
            Refine your priorities <UiIcon name="arrow-right" />
          </Link>
          <Link className="text-link" href="/activity">
            View activity <UiIcon name="arrow-right" />
          </Link>
        </div>
        <section className="plan-arc" aria-labelledby="plan-arc-heading">
          <div className="section-heading section-heading--compact">
            <div>
              <p className="kicker">60-day plan</p>
              <h2 id="plan-arc-heading">Your training arc</h2>
            </div>
          </div>
          <div className="plan-arc__weeks">
            {progressionPhases.map((phase) => {
              const content = phaseContent[phase];
              const isCurrent = currentWeekNumber
                ? getProgressionPhase(currentWeekNumber) === phase
                : false;
              return (
                <article
                  aria-current={isCurrent ? "step" : undefined}
                  className={isCurrent ? "is-current" : undefined}
                  key={phase}
                >
                  <span>{content.weeks}</span>
                  <strong>{content.label}</strong>
                  <p>{content.arc}</p>
                  {isCurrent && <small>Current week</small>}
                </article>
              );
            })}
          </div>
        </section>
      </section>

      <section className="upcoming-section" aria-labelledby="upcoming-heading">
        <div className="section-heading">
          <div>
            <p className="kicker">Coming up</p>
            <h2 id="upcoming-heading">Your sessions</h2>
          </div>
          <span>{upcoming.length} planned</span>
        </div>
        {upcoming.length === 0 ? (
          <div className="empty-card">
            <h3>
              {plan.profile.painAreas.length > 0
                ? "No suitable sessions yet."
                : "Your plan is clear."}
            </h3>
            <p>
              {plan.profile.painAreas.length > 0
                ? "Your current pain flags rule out the available placeholder workouts. We won’t work around them automatically—update the profile after the area has been assessed."
                : "Update your profile to build a fresh schedule."}
            </p>
          </div>
        ) : (
          <div className="session-list" id="upcoming-session-list">
            {upcoming.slice(0, visibleSessionCount).map((session, index) => (
              <article className="session-card" key={session.id}>
                <div className="session-date">
                  <span>
                    {formatPlanDate(session.scheduledDate, {
                      weekday: "short",
                    })}
                  </span>
                  <strong>
                    {fromDateKey(session.scheduledDate).getDate()}
                  </strong>
                  <small>
                    {formatPlanDate(session.scheduledDate, { month: "short" })}
                  </small>
                </div>
                <div className="session-main">
                  <div className="tag-row">
                    <span className="pill pill--dark">
                      {index === 0 ? "Next" : "Planned"}
                    </span>
                    {session.isEdited && <span className="pill">Edited</span>}
                    {session.todayAdaptations.length > 0 && (
                      <span className="pill">Adapted today</span>
                    )}
                  </div>
                  <h3>{getWorkoutTrainingTitle(session.workout)}</h3>
                  <div className="session-meta">
                    <span>{sessionMinutes(session)} min</span>
                    <span>
                      {flattenSessionSections(session.sections).length}{" "}
                      exercises
                    </span>
                    <span>{session.workout.difficulty}</span>
                  </div>
                  <div className="session-section-summary">
                    {session.sections.map((section) => (
                      <span key={section.type}>
                        {section.type === "warmup"
                          ? "Warm-up"
                          : section.type === "cooldown"
                            ? "Cooldown"
                            : "Workout"}{" "}
                        ·{" "}
                        {formatSessionDurationMinutes(
                          calculateSessionSectionDuration(section),
                        )}{" "}
                        min
                      </span>
                    ))}
                  </div>
                  {session.durationStatus !== "on_target" && (
                    <small>{durationMessage(session)}</small>
                  )}
                  <ProgressionSummary session={session} />
                </div>
                <div className="session-actions">
                  {session.scheduledDate === today ? (
                    <Link
                      className="button button--primary button--small"
                      href={getPlannedWorkoutStartHref(
                        session.id,
                        preferredIntensity,
                        preferencesReady,
                      )}
                    >
                      Start workout
                    </Link>
                  ) : (
                    <Link
                      className="button button--secondary button--small"
                      href={`/plan/workouts/${session.id}/edit`}
                    >
                      {index === 0 ? "Review session" : "Review"}
                    </Link>
                  )}
                  <details>
                    <summary>Move</summary>
                    <form
                      onSubmit={(event) => {
                        event.preventDefault();
                        const data = new FormData(event.currentTarget);
                        const date = String(data.get("date"));
                        moveSession(session, date);
                        (
                          event.currentTarget
                            .parentElement as HTMLDetailsElement | null
                        )?.removeAttribute("open");
                      }}
                    >
                      <label>
                        New date
                        <input
                          className="plan-input"
                          defaultValue={session.scheduledDate}
                          max={plan.endDate}
                          min={today}
                          name="date"
                          required
                          type="date"
                        />
                      </label>
                      <button
                        className="button button--primary button--small"
                        type="submit"
                      >
                        Save
                      </button>
                    </form>
                  </details>
                  <button
                    className="text-button"
                    onClick={() => skipSession(session)}
                    type="button"
                  >
                    Skip session
                  </button>
                  <button
                    className="text-button text-button--danger"
                    onClick={() => removeSession(session)}
                    type="button"
                  >
                    Cancel
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
        {upcoming.length > 6 && (
          <div className="session-list-more">
            <p role="status">
              Showing {Math.min(visibleSessionCount, upcoming.length)} of{" "}
              {upcoming.length} planned sessions
            </p>
            <button
              className="button button--secondary"
              aria-controls="upcoming-session-list"
              disabled={visibleSessionCount >= upcoming.length}
              onClick={() =>
                setVisibleSessionCount((count) =>
                  Math.min(count + 6, upcoming.length),
                )
              }
              type="button"
            >
              {visibleSessionCount >= upcoming.length
                ? "All sessions shown"
                : `Show next ${Math.min(6, upcoming.length - visibleSessionCount)} sessions`}
            </button>
          </div>
        )}
      </section>
    </main>
  );
}
