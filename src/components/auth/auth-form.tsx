"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { authRequest, useAuth } from "./auth-provider";
import { PasswordField } from "./password-field";
import { UiIcon } from "@/components/ui-icon";

type Mode = "signin" | "signup" | "recover" | "password";
export function AuthForm({
  mode,
  next = "/plan/setup",
  initialError = "",
}: {
  mode: Mode;
  next?: string;
  initialError?: string;
}) {
  const { configured, developmentAdminEnabled, refresh } = useAuth();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(initialError);
  const [message, setMessage] = useState("");
  const target =
    next.startsWith("/") && !next.startsWith("//") && !next.includes("\\")
      ? next
      : "/plan/setup";
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const password = String(data.get("password") ?? "");
    if (
      (mode === "signup" || mode === "password") &&
      password !== data.get("confirmPassword")
    ) {
      setError("Passwords must match.");
      return;
    }
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await authRequest(mode, {
        email: data.get("email"),
        password,
        displayName: data.get("displayName"),
        confirmPassword: data.get("confirmPassword"),
        next: target,
      });
      if (mode === "recover") {
        setMessage(
          "If an account exists for that email, a reset link is on its way. Open it in this browser.",
        );
        return;
      }
      if (mode === "signup" && !result.user) {
        setMessage(
          "Check your email for a confirmation link if this is a new account. Look in spam too, and open the link in this browser.",
        );
        return;
      }
      window.localStorage.setItem("axyro:identity-event", String(Date.now()));
      await refresh();
      router.push(mode === "password" ? "/account" : target);
      router.refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }
  const title = {
    signin: "Welcome back",
    signup: "Create your account",
    recover: "Reset your password",
    password: "Choose a new password",
  }[mode];
  return (
    <main className="page-shell auth-shell">
      <aside className="auth-story" aria-label="Training with Axyro">
        {mode !== "signin" && (
          <Link className="auth-back" href="/">
            <UiIcon name="arrow-left" /> Back to Axyro
          </Link>
        )}
        <p className="auth-story__title">
          Train anywhere.
          <br />
          Win on court.
        </p>
        <div className="auth-story__image" />
        <div className="auth-story__caption">
          <p>Your next session starts here.</p>
          <span>Guided home workouts. 5, 10 or 20 minutes.</span>
        </div>
      </aside>
      <section
        className="account-panel auth-panel"
        aria-labelledby="auth-title"
      >
        {mode !== "signin" && (
          <Link className="auth-back auth-back--mobile" href="/">
            <UiIcon name="arrow-left" /> Back to Axyro
          </Link>
        )}
        <h1 id="auth-title">{title}</h1>
        <p className="lede">
          {mode === "signup"
            ? "One real workout free forever. A personal plan when you’re ready for Pro."
            : mode === "recover"
              ? "We’ll email you a secure link to reset your password."
              : mode === "password"
                ? "Choose a password to keep your account secure."
                : "Your training, ready when you are."}
        </p>
        {!configured && (
          <p className="safety-note">
            Account services are temporarily unavailable. You can still try the
            free workout.
            {developmentAdminEnabled &&
              mode === "signin" &&
              " Development sign-in is available below."}{" "}
            <Link className="text-link" href="/workouts/foundation-strength">
              Try the free workout
            </Link>
          </p>
        )}
        {(configured || (developmentAdminEnabled && mode === "signin")) && (
          <form
            onSubmit={submit}
            className="account-form"
            aria-busy={busy}
            aria-describedby={error ? "auth-error" : undefined}
          >
            {mode === "signup" && (
              <label>
                Name
                <input
                  name="displayName"
                  placeholder="Your name"
                  autoComplete="name"
                  required
                  maxLength={100}
                />
              </label>
            )}
            {mode !== "password" && (
              <label>
                {developmentAdminEnabled && mode === "signin"
                  ? "Email or development login"
                  : "Email"}
                <input
                  name="email"
                  type={
                    developmentAdminEnabled && mode === "signin"
                      ? "text"
                      : "email"
                  }
                  placeholder={
                    developmentAdminEnabled && mode === "signin"
                      ? "Email or login"
                      : "you@example.com"
                  }
                  autoCapitalize="none"
                  spellCheck={false}
                  autoComplete="email"
                  required
                  maxLength={254}
                />
              </label>
            )}
            {mode !== "recover" && (
              <>
                <div className="auth-password-group">
                  <PasswordField
                    label="Password"
                    name="password"
                    autoComplete={
                      mode === "signin" ? "current-password" : "new-password"
                    }
                    minLength={mode === "signin" ? 1 : 10}
                    hint={
                      mode === "signin" ? undefined : "Use 10–128 characters."
                    }
                  />
                  {mode === "signin" && (
                    <Link
                      className="text-link auth-forgot"
                      href="/forgot-password"
                    >
                      Forgot password?
                    </Link>
                  )}
                </div>
                {(mode === "signup" || mode === "password") && (
                  <PasswordField
                    label="Confirm password"
                    name="confirmPassword"
                    autoComplete="new-password"
                    minLength={10}
                  />
                )}
              </>
            )}
            {error && (
              <p id="auth-error" role="alert" className="form-error">
                {error}
              </p>
            )}
            {message && (
              <p role="status" className="safety-note">
                {message}
                {mode === "signup" && (
                  <>
                    {" "}
                    Already registered?{" "}
                    <Link
                      className="text-link"
                      href={`/signin?next=${encodeURIComponent(target)}`}
                    >
                      Sign in
                    </Link>{" "}
                    or{" "}
                    <Link className="text-link" href="/forgot-password">
                      reset your password
                    </Link>
                    .
                  </>
                )}
              </p>
            )}
            <button
              className="button button--primary button--full"
              disabled={
                busy ||
                (!configured && !(developmentAdminEnabled && mode === "signin"))
              }
            >
              {busy
                ? "Please wait…"
                : {
                    signin: "Sign in",
                    signup: "Create account",
                    recover: "Send reset link",
                    password: "Update password",
                  }[mode]}
            </button>
          </form>
        )}
        {(mode === "signin" || mode === "signup") && configured && (
          <div className="auth-social">
            <p className="auth-divider">or continue with</p>
            <a
              className="button button--secondary button--full"
              href={`/api/auth/oauth?provider=google&next=${encodeURIComponent(target)}`}
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor">
                <path d="M21.6 12.2c0-.7-.1-1.4-.2-2.1H12v4h5.4a4.7 4.7 0 0 1-2 3.1v2.6h3.3c1.9-1.8 2.9-4.4 2.9-7.6ZM12 22c2.7 0 5-.9 6.7-2.4l-3.3-2.6c-.9.6-2 .9-3.4.9-2.6 0-4.8-1.7-5.6-4.1H3v2.7A10 10 0 0 0 12 22ZM6.4 13.8a6 6 0 0 1 0-3.6V7.5H3a10 10 0 0 0 0 9l3.4-2.7ZM12 6.1c1.5 0 2.8.5 3.8 1.5l2.9-2.9A9.6 9.6 0 0 0 12 2a10 10 0 0 0-9 5.5l3.4 2.7C7.2 7.8 9.4 6.1 12 6.1Z" />
              </svg>
              Continue with Google
            </a>
          </div>
        )}
        <div className="auth-navigation">
          {mode === "signin" && (
            <>
              <p>
                Don’t have an account?{" "}
                <Link
                  className="text-link"
                  href={`/signup?next=${encodeURIComponent(target)}`}
                >
                  Create account
                </Link>
              </p>
            </>
          )}
          {mode === "signup" && (
            <p>
              Already have an account?{" "}
              <Link
                className="text-link"
                href={`/signin?next=${encodeURIComponent(target)}`}
              >
                Sign in
              </Link>
            </p>
          )}
          {mode === "recover" && (
            <Link
              className="text-link"
              href={`/signin?next=${encodeURIComponent(target)}`}
            >
              Back to sign in
            </Link>
          )}
        </div>
        <p className="account-fine-print auth-legal">
          <Link href="/terms">Terms</Link> ·{" "}
          <Link href="/privacy">Privacy</Link>
        </p>
      </section>
    </main>
  );
}
