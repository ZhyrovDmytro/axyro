export const analyticsEnabled =
  process.env.NEXT_PUBLIC_AXYRO_ANALYTICS === "true";

export const analyticsPreferenceKey = "axyro.analytics.v1";
export const analyticsEvents = [
  "workout_started",
  "workout_completed",
] as const;
type AnalyticsEvent = (typeof analyticsEvents)[number];

export function readAnalyticsConsent(): "allowed" | "declined" | null {
  try {
    const choice = window.localStorage.getItem(analyticsPreferenceKey);
    return choice === "allowed" || choice === "declined" ? choice : null;
  } catch {
    return null;
  }
}

export function trackWorkoutEvent(event: AnalyticsEvent) {
  if (!analyticsEnabled || readAnalyticsConsent() !== "allowed") return;
  void fetch("/api/analytics", {
    method: "POST",
    body: event,
    credentials: "omit",
    referrerPolicy: "no-referrer",
    keepalive: true,
  }).catch(() => {});
}
