"use client";

import Link from "next/link";
import { useAuth } from "@/components/auth/auth-provider";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";

import { intensityLevels, intensityPresets } from "@/domain/workout/intensity";
import { useUserPreferences } from "@/hooks/use-user-preferences";
import { useDialogFocusTrap } from "@/hooks/use-dialog-focus-trap";
import { createBrowserUserDataService } from "@/services/persistence/user-data-service";

type Confirmation = "reset" | "delete" | null;

export function PrivacyDataSettings() {
  const { user } = useAuth();
  const router = useRouter();
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

  function finish(action: "reset" | "delete") {
    const service = createBrowserUserDataService();
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
        <p className="kicker">Settings</p>
        <h1>Make each workout yours.</h1>
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
          <p className="kicker">Workout guidance</p>
          <h2 id="guidance-settings-heading">Audio and tempo</h2>
        </div>
        <label className="setting-row">
          <span>
            <strong>Audio signals</strong>
            <small>
              Five countdown tones and a distinct tone at each interval change.
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
            <small>
              Ask supported browsers to keep the display on while the timer
              runs.
            </small>
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
          <p className="kicker">Workout defaults</p>
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
      </section>

      <section className="context-card">
        <h2>Data storage</h2>
        <p>
          Signed-in training profiles, plans, workout history, preferences and
          active progress are saved to your account with an isolated copy on
          this device. Guests can try the free starter workout locally. Supabase
          manages identity and training storage; Stripe manages subscriptions.
          Optional AI planning sends setup answers and a compact adaptation
          profile through the server to OpenAI. There is no advertising or
          analytics integration.
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
          Axyro is a mobile-first guided home workout app. One complete starter
          workout is free. An account keeps your training with you; Pro unlocks
          personalized plans and the full library.
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
