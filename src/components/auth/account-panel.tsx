"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { authRequest, useAuth } from "./auth-provider";
import { PasswordField } from "./password-field";
import { UiIcon } from "@/components/ui-icon";
import { useEntitlement } from "@/components/membership/entitlement-provider";
import { removeUserStorage } from "@/services/persistence/user-storage";

export function AccountPanel() {
  const router = useRouter();
  const { user, refresh, signOut } = useAuth();
  const { hasPro, subscription, loading } = useEntitlement();
  const [error, setError] = useState("");
  const [passwordNotice, setPasswordNotice] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [pending, setPending] = useState<"account" | "password" | null>(null);
  const busy = pending !== null;
  const [deleting, setDeleting] = useState(false);
  async function action(task: () => Promise<void>) {
    if (busy) return;
    setPending("account");
    setError("");
    try {
      await task();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Please try again.");
    } finally {
      setPending(null);
    }
  }
  if (!user)
    return (
      <main className="page-shell account-shell">
        <section className="account-panel">
          <p className="kicker">Your account</p>
          <h1>Keep your training with you.</h1>
          <p className="lede">
            Sign in to save your profile and training across devices.
          </p>
          <div className="account-actions">
            <Link className="button button--dark" href="/signin?next=/account">
              Sign in
            </Link>
            <Link
              className="button button--secondary"
              href="/signup?next=/account"
            >
              Create account
            </Link>
          </div>
          <p>
            <Link className="text-link" href="/settings">
              Workout settings
            </Link>
          </p>
        </section>
      </main>
    );
  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    await action(async () => {
      await authRequest("profile", { displayName: data.get("displayName") });
      await refresh();
    });
  }
  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    setPasswordNotice("");
    setPasswordError("");
    setError("");
    if (data.get("password") !== data.get("confirmPassword")) {
      setPasswordError("Passwords must match.");
      return;
    }
    setPending("password");
    try {
      await authRequest("password", {
        currentPassword: data.get("currentPassword"),
        password: data.get("password"),
        confirmPassword: data.get("confirmPassword"),
      });
      form.reset();
      setPasswordNotice("Your password has been updated.");
    } catch (error) {
      setPasswordError(
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setPending(null);
    }
  }

  async function manage() {
    await action(async () => {
      const response = await fetch("/api/billing/portal", { method: "POST" });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error ?? "Subscription management unavailable.");
      window.location.assign(data.url);
    });
  }
  async function remove(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    await action(async () => {
      await authRequest("delete", { confirmation: data.get("confirmation") });
      removeUserStorage(user!.id);
      window.localStorage.setItem("axyro:identity-event", String(Date.now()));
      await refresh();
      router.push("/");
      router.refresh();
    });
  }
  return (
    <main className="page-shell account-shell">
      <section className="account-panel">
        <p className="kicker">Account</p>
        <div className="account-heading">
          <div>
            <h1>{user.displayName || "Your account"}</h1>
            <p>{user.email}</p>
          </div>
          <span className="pill pill--dark">
            {loading ? "Checking…" : hasPro ? "PRO" : "FREE"}
            {user.role === "admin" ? " · Admin" : ""}
          </span>
        </div>
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
        {user.isDevelopmentAdmin && (
          <p className="safety-note">
            Development administrator. This account is unavailable in
            production.
          </p>
        )}
        <section className="account-section">
          <h2>Personal information</h2>
          <form className="account-form" onSubmit={saveProfile}>
            <label>
              Name
              <input
                name="displayName"
                autoComplete="name"
                defaultValue={user.displayName}
                maxLength={100}
                required
              />
            </label>
            <label>
              Email
              <input type="email" value={user.email} readOnly />
            </label>
            <button
              className="button button--primary"
              disabled={busy || user.isDevelopmentAdmin}
            >
              Save name
            </button>
          </form>
        </section>
        <section className="account-section">
          <h2>Membership</h2>
          <p>
            {hasPro
              ? "Pro · Your personal training workspace"
              : "Free · One complete starter workout"}
          </p>
          {subscription?.expiresAt && (
            <p>
              {subscription.cancelAtPeriodEnd
                ? "Access until"
                : "Current period ends"}{" "}
              {new Date(subscription.expiresAt).toLocaleDateString()}
            </p>
          )}
          {subscription?.status === "past_due" && (
            <p>
              There’s a payment problem. Update your payment method to restore
              Pro.
            </p>
          )}
          {user.role === "admin" ? (
            <p>Administrator access includes Pro.</p>
          ) : loading ? (
            <p role="status">Checking membership…</p>
          ) : hasPro || (subscription && subscription.status !== "free") ? (
            <button
              className="button button--dark"
              disabled={busy}
              onClick={() => void manage()}
            >
              Manage subscription
            </button>
          ) : (
            <Link
              className="button button--dark"
              href="/upgrade?returnTo=/account"
            >
              Upgrade to Pro
            </Link>
          )}
        </section>
        <section className="account-section">
          <h2>Security</h2>
          {user.providers.includes("email") && !user.isDevelopmentAdmin ? (
            <details className="account-security">
              <summary>Change password</summary>
              <p>Use 10–128 characters for your new password.</p>
              <form
                className="account-form"
                onSubmit={changePassword}
                onChange={() => setPasswordNotice("")}
                aria-busy={pending === "password"}
                aria-describedby={
                  passwordError ? "password-change-error" : undefined
                }
              >
                <fieldset className="account-form__fields" disabled={busy}>
                  <legend className="sr-only">Change your password</legend>
                  <PasswordField
                    label="Current password"
                    name="currentPassword"
                    autoComplete="current-password"
                  />
                  <PasswordField
                    label="New password"
                    name="password"
                    autoComplete="new-password"
                    minLength={10}
                  />
                  <PasswordField
                    label="Confirm new password"
                    name="confirmPassword"
                    autoComplete="new-password"
                    minLength={10}
                  />
                  <button className="button button--primary" disabled={busy}>
                    {pending === "password" && (
                      <span className="button-spinner" aria-hidden="true" />
                    )}
                    {pending === "password"
                      ? "Updating password…"
                      : "Update password"}
                  </button>
                </fieldset>
                {passwordError && (
                  <p
                    id="password-change-error"
                    className="form-error"
                    role="alert"
                  >
                    {passwordError}
                  </p>
                )}
                {(pending === "password" || passwordNotice) && (
                  <p className="password-feedback" role="status">
                    {passwordNotice && <UiIcon name="check" />}
                    {pending === "password"
                      ? "Updating your password…"
                      : passwordNotice}
                  </p>
                )}
              </form>
            </details>
          ) : (
            <p>
              {user.isDevelopmentAdmin
                ? "Development session"
                : `Signed in with ${user.providers.join(", ")}. Manage your password with your sign-in provider.`}
            </p>
          )}
        </section>
        <section className="account-section">
          <h2>Training preferences</h2>
          <Link className="text-link" href="/settings">
            Audio, effort and data controls
          </Link>
        </section>
        <section className="account-section">
          <h2>Account controls</h2>
          <button
            className="button button--secondary"
            disabled={busy}
            onClick={() => void action(signOut)}
          >
            Sign out
          </button>
          {!user.isDevelopmentAdmin && (
            <button
              className="text-link account-danger"
              onClick={() => setDeleting(!deleting)}
              aria-expanded={deleting}
            >
              Delete account
            </button>
          )}
          {deleting && (
            <form className="account-form account-deletion" onSubmit={remove}>
              <h3>Permanently delete your account?</h3>
              <p>
                Your account, training plan, workout history and stored profile
                information will be deleted. Your linked Stripe subscription
                will be cancelled immediately. This cannot be undone.
              </p>
              <label>
                Type DELETE to confirm
                <input
                  name="confirmation"
                  pattern="DELETE"
                  required
                  autoComplete="off"
                />
              </label>
              <button className="button button--dark" disabled={busy}>
                Permanently delete account
              </button>
              <button
                className="text-link"
                type="button"
                onClick={() => setDeleting(false)}
              >
                Keep my account
              </button>
            </form>
          )}
        </section>
      </section>
    </main>
  );
}
