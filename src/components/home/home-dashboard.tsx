"use client";

import { getPlanProgress } from "@/domain/training-plan/plan-progress";

import Link from "next/link";
import { useEntitlement } from "@/components/membership/entitlement-provider";
import { useState } from "react";

import { UiIcon } from "@/components/ui-icon";
import { ActiveWorkoutCard } from "@/components/workout/active-workout-card";
import { RecentWorkout } from "@/components/workout/recent-workout";
import { starterWorkouts as workouts } from "@/content/workouts";
import { formatPlanDate, toDateKey } from "@/domain/training-plan/date";
import {
  getPlanWeekNumber,
  TRAINING_PLAN_WEEK_COUNT,
} from "@/domain/training-plan/progression";
import type {
  AthleteProfile,
  ProgressionPhase,
} from "@/domain/training-plan/training-plan.types";
import { formatSessionDurationMinutes } from "@/domain/workout/session-duration";
import { flattenSessionSections } from "@/domain/workout/session-sections";
import { getWorkoutTrainingTitle } from "@/domain/workout/training-title";
import { useActiveWorkoutSession } from "@/hooks/use-active-workout-session";
import { useTrainingPlan } from "@/hooks/use-training-plan";
import { useUserPreferences } from "@/hooks/use-user-preferences";
import { useWorkoutActivityHistory } from "@/hooks/use-workout-activity-history";
import { getPlannedWorkoutStartHref } from "@/lib/planned-workout-navigation";

const goalLabels: Record<AthleteProfile["goals"][number], string> = {
  "movement-speed": "Faster movement",
  "court-endurance": "Court endurance",
  power: "Explosive power",
  strength: "Strength",
  "injury-resilience": "Resilience",
};

const equipmentLabels: Record<AthleteProfile["equipment"][number], string> = {
  bodyweight: "Bodyweight",
  "one-dumbbell": "One dumbbell",
  "two-dumbbells": "Two dumbbells",
};

const phaseContent: Record<
  ProgressionPhase,
  { label: string; description: string }
> = {
  foundation: {
    label: "Foundation",
    description: "Learn the movements and build a controlled base.",
  },
  build: {
    label: "Build",
    description: "Add a little more useful work without extending your week.",
  },
  peak: {
    label: "Peak",
    description: "Your strongest training week inside the same time budget.",
  },
  consolidate: {
    label: "Consolidate",
    description: "Reduce fatigue while keeping the movement patterns sharp.",
  },
};

const workoutSummaries = workouts.map(
  ({ id, slug, name, shortDescription }) => ({
    id,
    slug,
    name,
    shortDescription,
  }),
);

function DiscoverHome() {
  return (
    <div className="home-landing">
      <section className="home-landing-hero" aria-labelledby="hero-title">
        <div className="home-landing-copy">
          <h1 id="hero-title">Your daily 10. Make it count.</h1>
          <p className="lede">
            Ten minutes of guided movement, built around you. Train at home with
            bodyweight or dumbbells. Need a shorter or longer session? Choose 5
            or 20 minutes.
          </p>
          <div className="home-landing-actions">
            <Link className="button button--primary" href="/plan/setup">
              Build my 10-minute plan <UiIcon name="arrow-right" />
            </Link>
            <Link className="text-link" href="/workouts">
              Or start a quick workout
            </Link>
          </div>
          <ul className="home-trust-list" aria-label="Plan setup details">
            <li>
              <UiIcon name="check" /> About two minutes to set up
            </li>
            <li>
              <UiIcon name="check" /> One complete workout free
            </li>
            <li>
              <UiIcon name="check" /> Personalized plans with Pro
            </li>
          </ul>
        </div>

        <aside className="home-week-preview" aria-label="Example training week">
          <div className="home-week-preview__heading">
            <div>
              <span>Example week</span>
              <strong>Training shaped around match day</strong>
            </div>
            <span className="home-week-preview__badge">10 min a day</span>
          </div>
          <ol className="home-week-preview__days">
            <li>
              <time>Mon</time>
              <div>
                <strong>Foundation strength</strong>
                <span>Shoulders · Core · 10 min</span>
              </div>
              <span className="home-week-preview__type">Train</span>
            </li>
            <li>
              <time>Wed</time>
              <div>
                <strong>Movement and control</strong>
                <span>Footwork · Balance · 10 min</span>
              </div>
              <span className="home-week-preview__type">Train</span>
            </li>
            <li className="is-recovery">
              <time>Fri</time>
              <div>
                <strong>Recovery protected</strong>
                <span>No hard training before your match</span>
              </div>
              <span className="home-week-preview__type">Rest</span>
            </li>
            <li className="is-match">
              <time>Sat</time>
              <div>
                <strong>Match day</strong>
                <span>Your schedule stays clear</span>
              </div>
              <span className="home-week-preview__type">Play</span>
            </li>
          </ol>
          <p>
            Your real plan uses the days, priorities and matches you choose.
          </p>
        </aside>
      </section>

      <section className="home-benefits" aria-labelledby="benefits-heading">
        <div className="home-section-intro">
          <h2 id="benefits-heading">Less planning. More useful training.</h2>
          <p>
            Every part of the plan is designed to remove decisions once it is
            time to move.
          </p>
        </div>
        <div className="home-benefit-list">
          <article>
            <span className="home-benefit-icon" aria-hidden="true">
              <UiIcon name="route" />
            </span>
            <div>
              <strong>Fits the week you actually have</strong>
              <p>
                Start with 10 minutes. Choose 5 for a busy day or 20 when you
                have more time. Your training days and recovery still shape the
                week.
              </p>
            </div>
          </article>
          <article>
            <span className="home-benefit-icon" aria-hidden="true">
              <UiIcon name="scheduled" />
            </span>
            <div>
              <strong>Protects recovery around matches</strong>
              <p>
                Add match dates and Axyro keeps strength work away from match
                day and the day before.
              </p>
            </div>
          </article>
          <article>
            <span className="home-benefit-icon" aria-hidden="true">
              <UiIcon name="play" />
            </span>
            <div>
              <strong>Guides the session from start to finish</strong>
              <p>
                Video, large timers, automatic work and rest, and optional
                countdown tones keep your hands off the screen.
              </p>
            </div>
          </article>
        </div>
      </section>

      <section
        className="home-player-proof"
        aria-labelledby="player-proof-heading"
      >
        <div>
          <h2 id="player-proof-heading">Know what to do. Keep moving.</h2>
          <p>
            Each session opens in the guided player with the current movement,
            exact interval, set progress and what comes next.
          </p>
          <ul>
            <li>Muted looping movement reference</li>
            <li>Automatic work, side switches and recovery</li>
            <li>Light, Standard or Challenging effort</li>
            <li>Spoken cadence that can be muted at any time</li>
          </ul>
        </div>
        <div className="home-player-preview" aria-label="Guided player preview">
          <div className="home-player-preview__topline">
            <span>Workout · Set 2 of 3</span>
            <span>Audio on</span>
          </div>
          <div className="home-player-preview__movement">
            <span>Standing rotation</span>
            <strong>00:27</strong>
            <small>Controlled turn · steady return</small>
          </div>
          <div className="home-player-preview__progress" aria-hidden="true">
            <span />
          </div>
          <div className="home-player-preview__footer">
            <span>Next</span>
            <strong>20 sec recovery</strong>
          </div>
        </div>
      </section>

      <section className="home-how-it-works" aria-labelledby="how-heading">
        <div className="home-section-intro">
          <h2 id="how-heading">From a few answers to your next session.</h2>
          <p>No spreadsheet, manual timer or workout building required.</p>
        </div>
        <ol>
          <li>
            <span>1</span>
            <div>
              <strong>Tell Axyro what matters</strong>
              <p>
                Choose goals, days, equipment, match dates and current comfort.
              </p>
            </div>
          </li>
          <li>
            <span>2</span>
            <div>
              <strong>Review your 60-day plan</strong>
              <p>See the schedule, progression and purpose of every session.</p>
            </div>
          </li>
          <li>
            <span>3</span>
            <div>
              <strong>Press start and follow along</strong>
              <p>The player handles timing, recovery, sides and cadence.</p>
            </div>
          </li>
        </ol>
      </section>

      <section className="home-final-cta" aria-labelledby="home-cta-heading">
        <div>
          <h2 id="home-cta-heading">Make the next session obvious.</h2>
          <p>
            Ten minutes at a time. A 60-day plan with room for training, matches
            and recovery.
          </p>
        </div>
        <Link className="button button--primary" href="/plan/setup">
          Create my plan <UiIcon name="arrow-right" />
        </Link>
      </section>
    </div>
  );
}

export function HomeDashboard() {
  const { hasPro } = useEntitlement();
  const { plan, ready, needsCatalogRefresh } = useTrainingPlan();
  const activeSession = useActiveWorkoutSession();
  const [dismissedSessionId, setDismissedSessionId] = useState<string | null>(
    null,
  );
  const hasActiveWorkout =
    activeSession?.kind === "valid" &&
    activeSession.state.sessionId !== dismissedSessionId;
  const { preferredIntensity, ready: preferencesReady } = useUserPreferences();
  const today = toDateKey(new Date());
  const activity = useWorkoutActivityHistory(today);

  if (!ready) {
    return (
      <main className="page-shell home-loading" aria-live="polite">
        <span className="sr-only">Loading your training…</span>
        <div className="home-loading__line home-loading__line--short" />
        <div className="home-loading__line home-loading__line--title" />
        <div className="home-loading__line" />
        <div className="home-loading__panel" />
      </main>
    );
  }

  if (!plan || !hasPro) {
    return (
      <main className="page-shell">
        <ActiveWorkoutCard />
        {needsCatalogRefresh && (
          <p className="daily-plan-note" role="status">
            Your saved plan needs an update for the current exercise library.
            Create a new plan; your activity history is preserved.
          </p>
        )}
        <DiscoverHome />
        <RecentWorkout workouts={workoutSummaries} />
      </main>
    );
  }

  const scheduled = plan.sessions
    .filter(
      (session) =>
        session.status === "scheduled" && session.scheduledDate >= today,
    )
    .sort((left, right) =>
      left.scheduledDate.localeCompare(right.scheduledDate),
    );
  const todaySession = scheduled.find(
    (session) => session.scheduledDate === today,
  );
  const nextSession = todaySession ?? scheduled[0];
  const nextGame = [...plan.games]
    .filter((game) => game.date >= today)
    .sort((left, right) => left.date.localeCompare(right.date))[0];
  const { completedCount, extraCount } = getPlanProgress(plan, activity);
  const currentWeek =
    getPlanWeekNumber(plan.startDate, today) ??
    nextSession?.weekNumber ??
    TRAINING_PLAN_WEEK_COUNT;
  const currentPhase =
    nextSession?.progressionPhase ??
    plan.sessions.find((session) => session.weekNumber === currentWeek)
      ?.progressionPhase ??
    "consolidate";
  const phase = phaseContent[currentPhase];
  const activityBySessionId = new Map(
    activity
      .filter((item) => item.planId === plan.generatedAt)
      .map((item) => [item.sessionId, item.status]),
  );
  const currentWeekSessions = plan.sessions
    .filter((session) => session.weekNumber === currentWeek)
    .sort((left, right) =>
      left.scheduledDate.localeCompare(right.scheduledDate),
    );
  const upcomingEvents = [
    ...scheduled.map((session) => ({
      id: `session-${session.id}`,
      date: session.scheduledDate,
      kind: "Training" as const,
      title: getWorkoutTrainingTitle(session.workout),
      detail: `${formatSessionDurationMinutes(session.estimatedDurationSeconds)} min · Week ${session.weekNumber}`,
    })),
    ...plan.games
      .filter((game) => game.date >= today)
      .map((game) => ({
        id: `game-${game.id}`,
        date: game.date,
        kind: "Match" as const,
        title: game.label,
        detail:
          game.importance === "important" ? "Important match" : "Match day",
      })),
  ]
    .sort((left, right) => left.date.localeCompare(right.date))
    .slice(0, 4);
  const progress = Math.min(
    100,
    Math.round((completedCount / Math.max(1, plan.sessions.length)) * 100),
  );

  return (
    <main className="page-shell home-today">
      {hasActiveWorkout && (
        <ActiveWorkoutCard onDismiss={setDismissedSessionId} />
      )}

      <section className="today-hero" aria-labelledby="today-heading">
        <div className="today-hero__copy">
          <p className="today-status">
            Today ·{" "}
            {formatPlanDate(today, {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </p>
          <h1 id="today-heading">
            {hasActiveWorkout
              ? "Finish what you started."
              : todaySession
                ? "Your daily movement is ready."
                : "Your day, at a glance."}
          </h1>
          <p className="lede">
            {hasActiveWorkout
              ? "Resume your paused workout above. Today’s plan stays visible here when you are ready for it."
              : todaySession
                ? `${getWorkoutTrainingTitle(todaySession.workout)} is scheduled today. Review the movements, choose your effort and start when you’re ready.`
                : nextSession
                  ? `No training is scheduled today. Your next session is ${formatPlanDate(nextSession.scheduledDate, { weekday: "long" })}.`
                  : "Your 60-day plan is complete. Review the work you finished and decide what comes next."}
          </p>
          <div className="button-row">
            {todaySession ? (
              <>
                {!hasActiveWorkout && (
                  <Link
                    className="button button--primary"
                    href={getPlannedWorkoutStartHref(
                      todaySession.id,
                      preferredIntensity,
                      preferencesReady,
                    )}
                  >
                    Start today’s workout <UiIcon name="arrow-right" />
                  </Link>
                )}
                <Link
                  className="button button--secondary"
                  href={`/plan/workouts/${todaySession.id}/edit`}
                >
                  Review today’s training
                </Link>
              </>
            ) : nextSession ? (
              <Link
                className="button button--dark"
                href={`/plan/workouts/${nextSession.id}/edit`}
              >
                Review next training <UiIcon name="arrow-right" />
              </Link>
            ) : (
              <Link className="button button--dark" href="/plan">
                Review completed block <UiIcon name="arrow-right" />
              </Link>
            )}
          </div>
        </div>

        {nextSession ? (
          <article className="today-session-card">
            <span>{todaySession ? "Today’s training" : "Next training"}</span>
            <strong>{getWorkoutTrainingTitle(nextSession.workout)}</strong>
            <div>
              <span>
                {formatSessionDurationMinutes(
                  nextSession.estimatedDurationSeconds,
                )}{" "}
                min
              </span>
              <span>
                {flattenSessionSections(nextSession.sections).length} exercises
              </span>
              <span>{nextSession.workout.difficulty}</span>
            </div>
          </article>
        ) : (
          <article className="today-session-card today-session-card--complete">
            <span>Block complete</span>
            <strong>{completedCount} sessions finished</strong>
            <p>
              Your activity remains available while you review or rebuild the
              the next 60 days.
            </p>
          </article>
        )}
      </section>

      <section className="home-block-status" aria-labelledby="block-heading">
        <div className="home-block-status__summary">
          <span>
            Week {currentWeek} of {TRAINING_PLAN_WEEK_COUNT}
          </span>
          <h2 id="block-heading">{phase.label}</h2>
          <p>{phase.description}</p>
          <div
            className="home-block-progress"
            role="progressbar"
            aria-label="60-day plan completion"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
          >
            <span style={{ transform: `scaleX(${progress / 100})` }} />
          </div>
          <strong>
            {completedCount} of {plan.sessions.length} planned sessions
            completed
          </strong>
          {extraCount > 0 && (
            <p>
              +{extraCount} extra {extraCount === 1 ? "session" : "sessions"}{" "}
              completed
            </p>
          )}
        </div>

        <div className="home-block-status__facts">
          <article>
            <span>Next match</span>
            <strong>
              {nextGame
                ? formatPlanDate(nextGame.date, {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })
                : "Nothing scheduled"}
            </strong>
            <p>
              {nextGame?.label ??
                "Add a match so Axyro can protect the surrounding recovery."}
            </p>
          </article>
          <article>
            <span>Weekly rhythm</span>
            <strong>
              {plan.profile.sessionsPerWeek} sessions ·{" "}
              {plan.profile.sessionDurationMinutes} min
            </strong>
            <p>
              {plan.profile.preferredDays
                .map((day) => day[0].toUpperCase() + day.slice(1))
                .join(" · ")}
            </p>
          </article>
          <article>
            <span>Plan focus</span>
            <strong>
              {plan.profile.goals.map((goal) => goalLabels[goal]).join(" · ")}
            </strong>
            <p>
              {plan.profile.equipment
                .map((equipment) => equipmentLabels[equipment])
                .join(" · ")}
            </p>
          </article>
        </div>
      </section>

      <section className="home-plan-grid">
        <div className="home-week" aria-labelledby="week-heading">
          <div className="home-section-heading">
            <div>
              <span>This week</span>
              <h2 id="week-heading">Your training rhythm</h2>
            </div>
            <Link className="text-link" href="/plan">
              Open full plan <UiIcon name="arrow-right" />
            </Link>
          </div>
          <div className="home-week__sessions">
            {currentWeekSessions.map((session) => {
              const status =
                activityBySessionId.get(session.id) ?? session.status;
              return (
                <article key={session.id}>
                  <time dateTime={session.scheduledDate}>
                    {formatPlanDate(session.scheduledDate, {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}
                  </time>
                  <div>
                    <strong>{getWorkoutTrainingTitle(session.workout)}</strong>
                    <span>
                      {formatSessionDurationMinutes(
                        session.estimatedDurationSeconds,
                      )}{" "}
                      min · {flattenSessionSections(session.sections).length}{" "}
                      exercises
                    </span>
                  </div>
                  <span className={`home-session-status is-${status}`}>
                    {status === "completed"
                      ? "Completed"
                      : session.scheduledDate === today
                        ? "Today"
                        : status === "scheduled"
                          ? "Scheduled"
                          : status}
                  </span>
                </article>
              );
            })}
          </div>
        </div>

        <aside className="home-upcoming" aria-labelledby="upcoming-heading">
          <div className="home-section-heading">
            <div>
              <span>Coming up</span>
              <h2 id="upcoming-heading">Next on your calendar</h2>
            </div>
          </div>
          {upcomingEvents.length > 0 ? (
            <ol>
              {upcomingEvents.map((event) => (
                <li key={event.id}>
                  <time dateTime={event.date}>
                    {formatPlanDate(event.date, {
                      month: "short",
                      day: "numeric",
                    })}
                  </time>
                  <div>
                    <span>{event.kind}</span>
                    <strong>{event.title}</strong>
                    <small>{event.detail}</small>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <p className="home-upcoming__empty">
              No more training or matches are scheduled in this block.
            </p>
          )}
        </aside>
      </section>

      <section className="home-plan-links" aria-label="Plan actions">
        <div>
          <strong>Need to change the plan?</strong>
          <p>
            Move sessions, add matches or refine your priorities from the plan
            workspace.
          </p>
        </div>
        <div>
          <Link className="button button--secondary" href="/plan">
            Manage plan
          </Link>
          <Link className="text-link" href="/activity">
            View activity <UiIcon name="arrow-right" />
          </Link>
        </div>
      </section>

      <RecentWorkout workouts={workoutSummaries} />

      <section className="home-library-route" aria-label="Workout library">
        <div>
          <strong>Need a simple session outside the plan?</strong>
          <p>
            Choose a basic quick start without changing your 60-day schedule.
          </p>
        </div>
        <Link className="text-link" href="/workouts">
          Open quick starts <UiIcon name="arrow-right" />
        </Link>
      </section>
    </main>
  );
}
