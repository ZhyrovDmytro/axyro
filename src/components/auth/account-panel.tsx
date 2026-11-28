"use client";
import { LoadingStatus } from "@/components/loading-status";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { authRequest, useAuth } from "./auth-provider";
import { PasswordField } from "./password-field";
import { UiIcon } from "@/components/ui-icon";
import { useEntitlement } from "@/components/membership/entitlement-provider";
import { removeUserStorage } from "@/services/persistence/user-storage";

function openDialog(dialog: HTMLDialogElement | null) {
  dialog?.showModal();
}

function openPasswordDialog(dialog: HTMLDialogElement | null) {
  dialog?.showModal();
  dialog
    ?.querySelector<HTMLInputElement>('input[name="currentPassword"]')
    ?.focus();
}

export function AccountPanel() {
  const router = useRouter();
  const { user, refresh, signOut, developmentAdminEnabled } = useAuth();
  const { hasPro, subscription, loading } = useEntitlement();
  const [error, setError] = useState("");
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [passwordNotice, setPasswordNotice] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const preview = developmentAdminEnabled || user?.role === "admin";
  const busy = pending !== null;
  const [deleting, setDeleting] = useState(false);
  async function action(message: string, task: () => Promise<void>) {
    if (busy) return;
    setPending(message);
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
      <main className="page-shell page-shell--inner settings-page account-page">
        <header className="page-intro">
          <h1>Keep your training with you.</h1>
          <p>Sign in to save your profile and training across devices.</p>
        </header>
        <section className="context-card">
          <h2>Your account</h2>
          <div className="button-row">
            <Link
              className="button button--primary"
              href="/signin?next=/account"
            >
              Sign in
            </Link>
            <Link
              className="button button--secondary"
              href="/signup?next=/account"
            >
              Create account
            </Link>
          </div>
        </section>
        <AccountResources />
      </main>
    );
  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (preview) return;
    const data = new FormData(event.currentTarget);
    await action("Saving your name…", async () => {
      await authRequest("profile", { displayName: data.get("displayName") });
      await refresh();
    });
  }
  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (preview) return;
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
    await action("Opening subscription management…", async () => {
      const response = await fetch("/api/billing/portal", { method: "POST" });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error ?? "Subscription management unavailable.");
      window.location.assign(data.url);
    });
  }
  async function remove(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (preview) return;
    const data = new FormData(event.currentTarget);
    await action("Deleting your account…", async () => {
      await authRequest("delete", { confirmation: data.get("confirmation") });
      removeUserStorage(user!.id);
      window.localStorage.setItem("axyro:identity-event", String(Date.now()));
      await refresh();
      router.push("/");
      router.refresh();
    });
  }
  return (
    <main className="page-shell page-shell--inner settings-page account-page">
      <header className="page-intro account-heading">
        <div>
          <h1>{user.displayName || "Your account"}</h1>
          <p>{user.email}</p>
        </div>
        <span className="pill pill--dark">
          {loading ? "Checking…" : hasPro ? "PRO" : "FREE"}
          {user.role === "admin" ? " · Admin" : ""}
        </span>
      </header>
      {error && !deleting && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      {pending && pending !== "password" && (
        <LoadingStatus>{pending}</LoadingStatus>
      )}
      {preview && (
        <p className="safety-note">
          Account changes are disabled in development and for administrators.
        </p>
      )}
      <section className="context-card">
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
          <button className="button button--primary" disabled={busy || preview}>
            Save name
          </button>
        </form>
      </section>
      <section className="context-card">
        <h2>Membership</h2>
        {!loading && (
          <p>
            {hasPro
              ? "Pro · Your personal training workspace"
              : "Free · One complete starter workout"}
          </p>
        )}
        {subscription?.expiresAt && (
          <p>
            {subscription.cancelAtPeriodEnd
              ? "Renewal cancelled. Access until"
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
          <>
            <p>Administrator access includes Pro.</p>
            <button className="button button--secondary" disabled>
              Manage subscription on Stripe
            </button>
          </>
        ) : loading ? (
          <LoadingStatus>Checking membership…</LoadingStatus>
        ) : hasPro || (subscription && subscription.status !== "free") ? (
          <button
            className="button button--primary"
            disabled={busy || preview}
            onClick={() => void manage()}
          >
            {hasPro && !subscription?.cancelAtPeriodEnd
              ? "Manage or cancel subscription"
              : "Manage subscription"}{" "}
            on Stripe
          </button>
        ) : (
          <Link
            className="button button--primary"
            href="/upgrade?returnTo=/account"
          >
            Upgrade to Pro
          </Link>
        )}
        <Link
          className="text-link membership-withdrawal-link"
          href="/withdrawal"
        >
          Withdraw from your Pro contract
        </Link>
      </section>
      <section className="context-card">
        <h2>Security</h2>
        {preview || user.providers.includes("email") ? (
          <>
            <button
              className="button button--secondary button--small"
              type="button"
              aria-haspopup="dialog"
              disabled={busy}
              onClick={() => {
                setPasswordError("");
                setPasswordNotice("");
                setPasswordOpen(true);
              }}
            >
              Change password
            </button>
            {passwordOpen && (
              <dialog
                ref={openPasswordDialog}
                className="continuity-dialog account-security"
                aria-labelledby="password-title"
                onClose={() => setPasswordOpen(false)}
                onCancel={(event) => {
                  if (busy) event.preventDefault();
                }}
              >
                <div className="dialog-heading">
                  <h2 id="password-title">Change password</h2>
                  <button
                    type="button"
                    aria-label="Close password dialog"
                    disabled={busy}
                    onClick={(event) =>
                      event.currentTarget.closest("dialog")?.close()
                    }
                  >
                    <UiIcon name="close" />
                  </button>
                </div>
                <p>
                  {preview
                    ? "You can try this form. Password updates are disabled for this session."
                    : "Use 10–128 characters for your new password."}
                </p>
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
                    <div className="button-row">
                      <button
                        className="button button--primary"
                        disabled={busy || preview}
                      >
                        {pending === "password" && (
                          <span className="button-spinner" aria-hidden="true" />
                        )}
                        {pending === "password"
                          ? "Updating password…"
                          : "Update password"}
                      </button>
                      <button
                        type="button"
                        className="button button--secondary"
                        onClick={(event) =>
                          event.currentTarget.closest("dialog")?.close()
                        }
                      >
                        {passwordNotice ? "Done" : "Cancel"}
                      </button>
                    </div>
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
              </dialog>
            )}
          </>
        ) : (
          <p>
            {user.isDevelopmentAdmin
              ? "Development session"
              : `Signed in with ${user.providers.join(", ")}. Manage your password with your sign-in provider.`}
          </p>
        )}
      </section>
      <AccountResources />
      <section className="context-card">
        <h2>Sign out</h2>
        <div className="button-row">
          <button
            className="button button--secondary"
            disabled={busy}
            onClick={() => void action("Signing out…", signOut)}
          >
            Sign out
          </button>
        </div>
      </section>
      <section className="context-card">
        <h2>Account deletion</h2>
        <p>Permanently remove your account and training data.</p>
        <button
          className="text-button text-button--danger"
          onClick={() => {
            setError("");
            setDeleting(true);
          }}
          disabled={busy}
          aria-haspopup="dialog"
        >
          Delete account
        </button>
        {deleting && (
          <dialog
            ref={openDialog}
            className="continuity-dialog"
            aria-labelledby="delete-account-title"
            onClose={() => setDeleting(false)}
            onCancel={(event) => {
              if (busy) event.preventDefault();
            }}
          >
            <form className="account-form account-deletion" onSubmit={remove}>
              <h2 id="delete-account-title">
                Permanently delete your account?
              </h2>
              <p>
                Your account, training plan, workout history and stored profile
                information will be deleted. Your linked Stripe subscription
                will be cancelled immediately. This cannot be undone.
              </p>
              {error && (
                <p role="alert" className="form-error">
                  {error}
                </p>
              )}
              {busy && <p role="status">Deleting your account…</p>}
              <label>
                Type DELETE to confirm
                <input
                  name="confirmation"
                  pattern="DELETE"
                  required
                  autoComplete="off"
                />
              </label>
              <button
                className="button button--dark"
                disabled={busy || preview}
              >
                Permanently delete account
              </button>
              <button
                className="text-link"
                type="button"
                disabled={busy}
                onClick={(event) =>
                  event.currentTarget.closest("dialog")?.close()
                }
              >
                Keep my account
              </button>
            </form>
          </dialog>
        )}
      </section>
    </main>
  );
}

function AccountResources() {
  return (
    <section className="context-card">
      <h2>Settings and help</h2>
      <nav className="account-resources" aria-label="Settings and help">
        <Link className="text-link" href="/settings">
          Workout settings
        </Link>
        <Link className="text-link" href="/help">
          Help with Axyro
        </Link>
      </nav>
    </section>
  );
}
