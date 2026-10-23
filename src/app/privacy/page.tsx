import type { Metadata } from "next";
import Link from "next/link";

import { UiIcon } from "@/components/ui-icon";

export const metadata: Metadata = {
  title: "Privacy notice | Axyro",
  description: "How Axyro handles training data and optional AI planning.",
};

export default function PrivacyPage() {
  return (
    <main className="page-shell page-shell--inner">
      <Link className="back-link" href="/settings">
        <UiIcon name="arrow-left" /> Privacy &amp; data settings
      </Link>
      <header className="page-intro">
        <p className="kicker">Privacy notice</p>
        <h1>Your training belongs to your account.</h1>
        <p>
          This notice describes the current implementation and is not legal
          advice.
        </p>
      </header>
      <section className="instruction-grid">
        <article className="instruction-section">
          <h2>What is stored</h2>
          <p>
            Sport, goals, experience, schedule, duration, equipment, optional
            discomfort areas, plans, workout progress, history, feedback, and
            audio/effort preferences.
          </p>
          <p>
            Accounts store your email, display name and optional provider
            avatar. Authentication credentials are managed by Supabase; payment
            details are managed by Stripe. Axyro does not store your password or
            card number.
          </p>
        </article>
        <article className="instruction-section">
          <h2>Why it is used</h2>
          <p>
            To generate compatible sessions, remember progress, adapt future
            training conservatively, and resume interrupted workouts. Optional
            discomfort areas only exclude affected loading and pause conflicting
            progression; Axyro does not diagnose or treat pain.
          </p>
        </article>
        <article className="instruction-section">
          <h2>Storage and sharing</h2>
          <p>
            Axyro stores account-owned training data in Supabase with an
            isolated browser cache. Guest workout settings and progress remain
            in this browser. Supabase handles account identity and Google login;
            Stripe handles subscriptions. There is no advertising or analytics
            integration.
          </p>
          <p>
            If the operator enables AI planning, setup answers and the compact
            adaptation profile are sent through a server-only route to OpenAI to
            propose exercise IDs. Workout history and the API key are not sent
            to the browser or included in that model request. With AI planning
            disabled, plan generation stays deterministic.
          </p>
        </article>
        <article className="instruction-section">
          <h2>Retention and control</h2>
          <p>
            Your training data remains when Pro expires. Account deletion
            removes the account and linked profile/training records and cancels
            the linked Stripe subscription. Settings can reset training data.
            Provider billing records and infrastructure backups follow the
            operator’s retention policies. Unattributed data from earlier
            local-only versions is preserved separately and never automatically
            assigned to an account.
          </p>
        </article>
      </section>
    </main>
  );
}
