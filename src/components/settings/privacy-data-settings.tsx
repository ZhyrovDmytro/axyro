"use client";

import Link from "next/link";
import { useAuth } from "@/components/auth/auth-provider";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";

import { intensityLevels, intensityPresets } from "@/domain/workout/intensity";
import { useUserPreferences } from "@/hooks/use-user-preferences";
import { useDialogFocusTrap } from "@/hooks/use-dialog-focus-trap";
import { useTrainingPlan } from "@/hooks/use-training-plan";
import { DurationOptions } from "@/components/workout/duration-options";
import { changePlanSessionDuration } from "@/domain/training-plan/generate-training-plan";
import { toDateKey } from "@/domain/training-plan/date";
import {
  parseDailyDuration,
  type DailyDuration,
} from "@/domain/workout/daily-duration";
import { createBrowserTrainingProfileRepository } from "@/services/persistence/local-training-profile-repository";
import { createBrowserWorkoutActivityRepository } from "@/services/persistence/local-workout-activity-repository";
import { createBrowserAdaptationProfileRepository } from "@/services/persistence/local-adaptation-profile-repository";
import { createBrowserUserDataService } from "@/services/persistence/user-data-service";

type Confirmation = "reset" | "delete" | null;

export function PrivacyDataSettings() {
  const { user } = useAuth();
  const router = useRouter();
  const { plan, profile, ready: planReady, setPlan } = useTrainingPlan();
  const [savedDuration, setSavedDuration] = useState<DailyDuration | null>(
    null,
  );
  const [durationMessage, setDurationMessage] = useState("");
  const [confirmation, setConfirmation] = useState<Confirmation>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const confirmationDialogRef = useRef<HTMLElement>(null);
  const closeConfirmation = useCallback(() => setConfirmation(null), []);
  useDialogFocusTrap(
    Boolean(confirmation),
    confirmationDialogRef,
    closeConfirmation,
  );
  const {
    audioEnabled,
    guidanceCadence,
    keepScreenAwake,
    preferredIntensity,
    ready,
    setAudioEnabled,
    setGuidanceCadence,
    setKeepScreenAwake,
    setPreferredIntensity,
  } = useUserPreferences();

  function changeDuration(minutes: DailyDuration) {
    if (!profile) return;
    try {
      if (plan) {
        setPlan(
          changePlanSessionDuration(
            plan,
            minutes,
            toDateKey(new Date()),
            createBrowserWorkoutActivityRepository().getRecentFeedbackForAdaptation(),
            createBrowserAdaptationProfileRepository().load(),
          ),
        );
      } else {
        createBrowserTrainingProfileRepository().save({
          ...profile,
          sessionDurationMinutes: minutes,
        });
      }
      setSavedDuration(minutes);
      setDurationMessage(
        "Session length saved. Upcoming scheduled workouts use this target.",
      );
      setActionError(null);
    } catch {
      setActionError(
        "Your session length could not be changed safely. Your current plan is unchanged. Try another duration.",
      );
    }
  }

  function finish(action: "reset" | "delete") {
    const service = createBrowserUserDataService(user?.id ?? null);
    const succeeded =
      action === "reset" ? service.resetTrainingPlan() : service.deleteAll();
    if (!succeeded) {
      setActionError(
        action === "reset"
          ? "Axyro could not fully reset the plan because this browser blocked storage access. You can clear this site's data in your browser settings."
          : "Axyro could not remove all local data because this browser blocked storage access. Clear this site's data in your browser settings to finish deletion.",
      );
      setConfirmation(null);
      return;
    }
    setActionError(null);
    setConfirmation(null);
    router.replace("/plan/setup");
    router.refresh();
  }

  return (
    <main className="page-shell page-shell--inner settings-page">
      <header className="page-intro">
        <h1>Settings</h1>
        <p>
          Set your usual guidance and effort.{" "}
          {user && !user.isDevelopmentAdmin
            ? "Your preferences save to your account and this device."
            : "Your preferences save on this device."}
        </p>
      </header>

      {actionError && (
        <p className="form-error" role="alert">
          {actionError}
        </p>
      )}

      <section
        className="context-card settings-group"
        aria-labelledby="guidance-settings-heading"
      >
        <div>
          <h2 id="guidance-settings-heading">Audio and tempo</h2>
        </div>
        <label className="setting-row">
          <span>
            <strong>Audio signals</strong>
            <small>
              Countdown tones and a distinct sound when the interval changes.
            </small>
          </span>
          <input
            type="checkbox"
            checked={ready && audioEnabled}
            disabled={!ready}
            onChange={(event) => setAudioEnabled(event.target.checked)}
          />
        </label>
        <fieldset className="setting-fieldset" disabled={!ready}>
          <legend>Default visual tempo</legend>
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
            Tempo is separate from workout effort and can also be changed in the
            player.
          </small>
        </fieldset>
        <label className="setting-row">
          <span>
            <strong>Keep screen awake</strong>
            <small>Keep the display on during workouts, where supported.</small>
          </span>
          <input
            type="checkbox"
            checked={ready && keepScreenAwake}
            disabled={!ready}
            onChange={(event) => setKeepScreenAwake(event.target.checked)}
          />
        </label>
      </section>

      <section
        className="context-card settings-group"
        aria-labelledby="effort-settings-heading"
      >
        <div>
          <h2 id="effort-settings-heading">Preferred effort</h2>
        </div>
        <div
          className="segmented-control"
          aria-label="Preferred workout effort"
        >
          {intensityLevels.map((level) => (
            <button
              aria-pressed={preferredIntensity === level}
              disabled={!ready}
              key={level}
              onClick={() => setPreferredIntensity(level)}
              type="button"
            >
              {intensityPresets[level].label}
            </button>
          ))}
        </div>
        <p>{intensityPresets[preferredIntensity].description}</p>
        <fieldset
          className="setting-fieldset"
          disabled={!planReady || !profile}
        >
          <legend className="sr-only">Default session length</legend>
          <DurationOptions
            legend="Default session length"
            value={
              savedDuration ??
              parseDailyDuration(profile?.sessionDurationMinutes)
            }
            onChange={changeDuration}
          />
        </fieldset>
        {!profile && planReady && (
          <p>
            <Link className="text-link" href="/plan/setup">
              Set up your plan
            </Link>{" "}
            to choose its default session length.
          </p>
        )}
        <p>
          Changing the length rebuilds upcoming scheduled workouts. Past and
          in-progress workouts keep their original length.
        </p>
        {durationMessage && <p role="status">{durationMessage}</p>}
      </section>

      <section className="context-card">
        <h2>Data storage</h2>
        <p>
          Your account saves your profile, plan, workout history, preferences
          and active progress, with a separate copy on this device. Guest
          workouts are saved on this device.
        </p>
        <p>
          Supabase stores account and training data. Stripe manages
          subscriptions. Optional AI planning sends setup answers and an
          adaptation profile to OpenAI through our server. Axyro has no
          advertising or analytics integration.
        </p>
        <p>
          Optional discomfort information is used only to avoid affected
          exercise loading and automatic progression. Axyro does not diagnose or
          treat pain.
        </p>
        <Link className="text-link" href="/privacy">
          Read the privacy notice
        </Link>
      </section>

      <section className="context-card">
        <h2>About Axyro</h2>
        <p>
          Guided home workouts for padel. Try one complete starter workout free.
          Axyro Pro includes personalized plans and the full exercise library.
        </p>
      </section>

      <section className="context-card">
        <h2>Reset training plan</h2>
        <p>
          Removes the current and upcoming plan and any active workout. Your
          saved profile, completed workout history, feedback, and preferences
          remain available.
        </p>
        <button
          className="button button--secondary"
          type="button"
          onClick={() => {
            setActionError(null);
            setConfirmation("reset");
          }}
        >
          Reset training plan
        </button>
      </section>

      <section className="context-card">
        <h2>Delete all my data</h2>
        <p>
          Removes all user-generated state stored by Axyro in this browser,
          including your profile, plans, history, feedback, preferences, and
          active workout.
        </p>
        <button
          className="text-button text-button--danger"
          type="button"
          onClick={() => {
            setActionError(null);
            setConfirmation("delete");
          }}
        >
          Delete all my data
        </button>
      </section>

      {confirmation && (
        <div className="dialog-backdrop" role="presentation">
          <section
            className="continuity-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="data-confirmation-heading"
            ref={confirmationDialogRef}
            tabIndex={-1}
          >
            <p className="kicker">Privacy &amp; data</p>
            <h2 id="data-confirmation-heading">
              {confirmation === "reset"
                ? "Reset your training plan?"
                : "Delete all your Axyro data?"}
            </h2>
            <p>
              {confirmation === "reset"
                ? "This removes your current and upcoming plan. Your completed workout history and saved profile stay available."
                : "This removes your training profile, plans, workout history, feedback, preferences, and active workout stored by Axyro on this device. This cannot be undone."}
            </p>
            <div className="button-row">
              <button
                className={
                  confirmation === "delete"
                    ? "text-button text-button--danger"
                    : "button button--primary"
                }
                type="button"
                onClick={() => finish(confirmation)}
              >
                {confirmation === "reset" ? "Reset plan" : "Delete all data"}
              </button>
              <button
                className="button button--secondary"
                type="button"
                onClick={closeConfirmation}
              >
                Cancel
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
