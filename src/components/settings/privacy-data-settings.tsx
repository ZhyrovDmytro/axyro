"use client";

import { AnalyticsSettings } from "@/components/settings/analytics-settings";
import { analyticsEnabled } from "@/lib/analytics";

import { trainingTagline } from "@/lib/brand-copy";
import { PaywallLink } from "@/components/membership/paywall-modal";
import Link from "next/link";
import { useAuth } from "@/components/auth/auth-provider";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";

import { intensityLevels, intensityPresets } from "@/domain/workout/intensity";
import { useUserPreferences } from "@/hooks/use-user-preferences";
import { useDialogFocusTrap } from "@/hooks/use-dialog-focus-trap";
import { useTrainingPlan } from "@/hooks/use-training-plan";
import { DurationOptions } from "@/components/workout/duration-options";
import { toDateKey } from "@/domain/training-plan/date";
import {
  parseDailyDuration,
  type DailyDuration,
} from "@/domain/workout/daily-duration";
import { createBrowserTrainingProfileRepository } from "@/services/persistence/local-training-profile-repository";
import { retryUserStorageSync } from "@/services/persistence/user-storage";
import { createBrowserUserDataService } from "@/services/persistence/user-data-service";

type Confirmation = "reset" | "delete" | null;

export function PrivacyDataSettings({ supportEmail }: { supportEmail: string }) {
  const { user, loading } = useAuth();
  const trainingDataLocation =
    user && !user.isDevelopmentAdmin
      ? "from this device and your synced account data"
      : "from this device";
  const router = useRouter();
  const { plan, profile, ready: planReady, setPlan } = useTrainingPlan();
  const activePlan = plan && plan.endDate >= toDateKey(new Date());
  const [savedDuration, setSavedDuration] = useState<DailyDuration | null>(
    null,
  );
  const [durationMessage, setDurationMessage] = useState("");
  const [confirmation, setConfirmation] = useState<Confirmation>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [savingDataAction, setSavingDataAction] = useState(false);
  const [exportError, setExportError] = useState(false);
  const confirmationDialogRef = useRef<HTMLElement>(null);
  const closeConfirmation = useCallback(() => {
    if (!savingDataAction) setConfirmation(null);
  }, [savingDataAction]);
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
    if (!profile || activePlan) return;
    try {
      const next = { ...profile, sessionDurationMinutes: minutes };
      if (plan) setPlan({ ...plan, profile: next });
      else createBrowserTrainingProfileRepository().save(next);
      setSavedDuration(minutes);
      setDurationMessage("Default session length saved.");
      setActionError(null);
    } catch {
      setActionError(
        "Your session length could not be changed safely. Your current plan is unchanged. Try another duration.",
      );
    }
  }

  function downloadTrainingData() {
    try {
      const json = createBrowserUserDataService(user?.id ?? null).exportTrainingData();
      const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = "axyro-training-data.json";
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setExportError(false);
    } catch {
      setExportError(true);
    }
  }

  async function finish(action: "reset" | "delete") {
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
    if (user && !user.isDevelopmentAdmin) {
      setSavingDataAction(true);
      const result = await retryUserStorageSync().catch(() => "failed");
      setSavingDataAction(false);
      if (result !== "saved") {
        setConfirmation(null);
        setActionError(result === "conflict"
          ? "Training data changed on another device. Reload and try again to apply this change to your account."
          : "Axyro could not confirm the change to your account. Try again or contact support.");
        return;
      }
    }
    setActionError(null);
    setConfirmation(null);
    router.replace(user ? "/plan/setup" : "/");
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

      {user && (
        <section className="context-card">
          <h2>Workout history</h2>
          <PaywallLink className="text-link" href="/activity" context="progress" returnTo="/activity">
            Activity
          </PaywallLink>
        </section>
      )}

      <section className="context-card">
        <h2>About Axyro</h2>
        <p>
          {trainingTagline} Try one complete starter workout free.
          Axyro Pro includes personalized plans and the full exercise library.
        </p>
        <p>
          Questions? Email <a className="text-link" href={`mailto:${supportEmail}`}>{supportEmail}</a>.
        </p>
      </section>

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
        {user &&
          (activePlan ? (
            <p>
              <Link className="text-link" href="/plan/refine?change=duration">
                Change session length
              </Link>
              {" · "}
              {plan.profile.sessionDurationMinutes} min
            </p>
          ) : (
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
          ))}
        {user && !profile && planReady && (
          <p>
            <Link className="text-link" href="/plan/setup">
              Set up your plan
            </Link>{" "}
            to choose its default session length.
          </p>
        )}
        {durationMessage && <p role="status">{durationMessage}</p>}
      </section>

      {analyticsEnabled && <AnalyticsSettings />}

      <section className="context-card">
        <h2>Data storage</h2>
        {user && !user.isDevelopmentAdmin ? (
          <>
            <p>
              Your account saves your profile, plan, workout history,
              preferences and active progress, with a separate copy on this
              device.
            </p>
            <p>
              Supabase stores account and training data. Stripe manages
              subscriptions. Optional AI planning sends structured training preferences to OpenAI through our server. Axyro has no
              advertising integration.
            </p>
            <p>
              Pain and discomfort reports are excluded from AI planning.
            </p>
          </>
        ) : (
          <p>Your workout history and preferences are stored on this device.</p>
        )}
        <Link className="text-link" href="/privacy">
          Read the privacy notice
        </Link>
      </section>

      <section className="context-card privacy-controls" id="privacy-rights">
        <h2>Privacy and data</h2>
        <div className="privacy-action-row">
          <div>
            <h3>Training data</h3>
            <p>Download your workouts and training data from this device as a JSON file.</p>
          </div>
          <button
            className="button button--secondary"
            type="button"
            disabled={loading || !ready}
            onClick={downloadTrainingData}
          >
            Download training data
          </button>
          {exportError && (
            <p className="form-error" role="alert">
              Your training data could not be downloaded from this browser.
            </p>
          )}
        </div>
        <div className="privacy-action-row">
          <div>
            <h3>Privacy requests</h3>
            <p>Request account records, a correction, or help exercising your privacy rights.</p>
          </div>
          <a
            className="text-link"
            href={`mailto:${supportEmail}?subject=Axyro%20privacy%20request`}
          >
            Send a privacy request
          </a>
        </div>
      </section>

      {user && plan && (
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
      )}

      <section className="context-card">
        <h2>Delete training data</h2>
        <p>
          {user
            ? `Deletes your training profile, plans, history, feedback, preferences, and active workout ${trainingDataLocation}.`
            : "Clears your workout data and preferences from this device."}
        </p>
        {user && !user.isDevelopmentAdmin && (
          <p>To close your account, go to <Link className="text-link" href="/account">Account</Link>. Use the privacy request link above for billing or other records.</p>
        )}
        <button
          className="text-button text-button--danger"
          type="button"
          onClick={() => {
            setActionError(null);
            setConfirmation("delete");
          }}
        >
          Delete training data
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
            <h2 id="data-confirmation-heading">
              {confirmation === "reset"
                ? "Reset your training plan?"
                : "Delete your training data?"}
            </h2>
            <p>
              {confirmation === "reset"
                ? "This removes your current and upcoming plan. Your completed workout history and saved profile stay available."
                : !user
                  ? "This permanently clears your workout data and preferences from this device."
                  : `This permanently removes your training profile, plans, workout history, feedback, preferences, and active workout ${trainingDataLocation}. It also removes custom workouts from this device.`}
            </p>
            <div className="button-row">
              <button
                className={
                  confirmation === "delete"
                    ? "text-button text-button--danger"
                    : "button button--primary"
                }
                type="button"
                disabled={savingDataAction}
                onClick={() => void finish(confirmation)}
              >
                {savingDataAction ? "Saving…" : confirmation === "reset" ? "Reset plan" : "Delete training data"}
              </button>
              <button
                className="button button--secondary"
                type="button"
                disabled={savingDataAction}
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
