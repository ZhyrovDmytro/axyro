"use client";

import { usePathname } from "next/navigation";
import { Fragment } from "react";
import { PageSkeleton } from "@/components/page-skeleton";
import { useAuth } from "./auth-provider";

const accountPageTitles: Record<string, string> = {
  "/account": "Your account",
  "/settings": "Settings",
  "/signin": "Sign in",
  "/signup": "Create account",
  "/forgot-password": "Reset password",
  "/reset-password": "Update password",
  "/plan/setup": "Your training profile",
};

export function AccountContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, loading, error, refresh } = useAuth();
  // These routes do not create repositories or read saved training settings.
  const independent =
    pathname === "/workouts" ||
    pathname === "/exercises" ||
    pathname.startsWith("/exercises/") ||
    pathname === "/rehub" ||
    pathname === "/help" ||
    pathname === "/privacy" ||
    pathname === "/terms";

  // HomeEntry renders the public landing page until an account is available.
  if (independent || (pathname === "/" && !user && !error)) return children;
  if (loading) {
    const title =
      accountPageTitles[pathname] ??
      (pathname.startsWith("/plan")
        ? "Your training plan"
        : pathname.startsWith("/activity")
          ? "Your activity"
          : pathname.startsWith("/workouts/")
            ? "Your workout"
            : "Your training");
    return (
      <PageSkeleton
        title={title}
        message="Loading your account…"
        layout={
          pathname.endsWith("/start")
            ? "player"
            : pathname.startsWith("/activity")
              ? "list"
              : accountPageTitles[pathname]
                ? "form"
                : "dashboard"
        }
      />
    );
  }
  if (error)
    return (
      <main className="page-shell">
        <p role="alert">{error}</p>
        <button className="button button--dark" onClick={() => void refresh()}>
          Try again
        </button>
      </main>
    );
  return <Fragment key={user?.id ?? "guest"}>{children}</Fragment>;
}
