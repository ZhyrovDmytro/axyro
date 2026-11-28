"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { analyticsPreferenceKey, readAnalyticsConsent } from "@/lib/analytics";

const preferenceChanged = "axyro:analytics-preference";

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(preferenceChanged, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(preferenceChanged, onChange);
  };
}

export function AnalyticsSettings() {
  const consent = useSyncExternalStore(
    subscribe,
    readAnalyticsConsent,
    () => null,
  );
  const [error, setError] = useState(false);

  function save(choice: "allowed" | "declined") {
    try {
      window.localStorage.setItem(analyticsPreferenceKey, choice);
      window.dispatchEvent(new Event(preferenceChanged));
      setError(false);
    } catch {
      setError(true);
    }
  }

  return (
    <section className="context-card privacy-controls" id="analytics">
      <h2>Optional workout analytics</h2>
      <p>
        Share workout starts and finishes with Axyro. This choice applies to
        this browser.
      </p>
      <p role="status">
        {error
          ? "Your choice could not be saved."
          : consent === "allowed"
            ? "Analytics is on."
            : "Analytics is off."}
      </p>
      <div
        className="privacy-choice"
        role="group"
        aria-label="Workout analytics consent"
      >
        <button
          className="button button--secondary"
          type="button"
          aria-pressed={consent === "allowed"}
          onClick={() => save("allowed")}
        >
          Allow analytics
        </button>
        <button
          className="button button--secondary"
          type="button"
          aria-pressed={consent === "declined"}
          onClick={() => save("declined")}
        >
          Decline analytics
        </button>
      </div>
      <Link className="text-link" href="/privacy#workout-analytics">
        Read about workout analytics
      </Link>
    </section>
  );
}
