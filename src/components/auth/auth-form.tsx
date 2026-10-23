"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { authRequest, useAuth } from "./auth-provider";

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
  const [visible, setVisible] = useState(false);
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
          "Check your email to verify your account. Open the link in this browser, then continue your setup.",
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
    <main className="page-shell account-shell">
      <section className="account-panel">
        <h1>{title}</h1>
        <p className="lede">
          {mode === "signup"
            ? "One real workout free forever. A personal plan when you’re ready for Pro."
            : mode === "recover"
              ? "We’ll email you a secure link to reset your password."
              : "Your training, ready when you are."}
        </p>
        {(mode === "signin" || mode === "signup") && configured && (
          <>
            <a
              className="button button--secondary button--full"
              href={`/api/auth/oauth?provider=google&next=${encodeURIComponent(target)}`}
            >
              Continue with Google
            </a>
            <p className="auth-divider">or use email</p>
          </>
        )}
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
            aria-describedby={error ? "auth-error" : undefined}
          >
            {mode === "signup" && (
              <label>
                Name
                <input
                  name="displayName"
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
                  autoComplete="email"
                  required
                  maxLength={254}
                />
              </label>
            )}
            {mode !== "recover" && (
              <>
                <label>
                  Password
                  <div className="password-field">
                    <input
                      aria-label="Password"
                      name="password"
                      type={visible ? "text" : "password"}
                      autoComplete={
                        mode === "signin" ? "current-password" : "new-password"
                      }
                      required
                      minLength={mode === "signin" ? 1 : 10}
                      maxLength={128}
                    />
                    <button
                      type="button"
                      aria-label={visible ? "Hide password" : "Show password"}
                      onClick={() => setVisible(!visible)}
                    >
                      {visible ? "Hide" : "Show"}
                    </button>
                  </div>
                </label>
                {(mode === "signup" || mode === "password") && (
                  <p className="account-fine-print">
                    Use 10–128 characters for your password.
                  </p>
                )}
                {(mode === "signup" || mode === "password") && (
                  <label>
                    Confirm password
                    <input
                      name="confirmPassword"
                      type={visible ? "text" : "password"}
                      autoComplete="new-password"
                      required
                      minLength={10}
                      maxLength={128}
                    />
                  </label>
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
              </p>
            )}
            <button
              className="button button--dark button--full"
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
        {mode === "signin" && (
          <>
            <Link className="text-link" href="/forgot-password">
              Forgot password?
            </Link>
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
        <p className="account-fine-print">
          <Link href="/terms">Terms</Link> ·{" "}
          <Link href="/privacy">Privacy</Link>
        </p>
      </section>
    </main>
  );
}
