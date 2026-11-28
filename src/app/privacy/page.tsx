import { OperatorDetails } from "@/components/operator-details";
import { publicMetadata, supportEmail } from "@/lib/publishing";
import Link from "next/link";
import { analyticsEnabled } from "@/lib/analytics";

export const metadata = publicMetadata(
  "/privacy",
  "Privacy notice | Axyro",
  "How Axyro handles training data and optional AI planning.",
);

export default function PrivacyPage() {
  return (
    <main className="page-shell section-page legal-page privacy-notice">
      <header className="page-intro">
        <h1 className="section-title">Privacy notice</h1>
        <time dateTime="2026-11-28">Updated 28 November 2026</time>
        <p>
          How Axyro stores your workout history, handles account data and uses
          your planning preferences.
        </p>
      </header>
      <nav className="privacy-contents" aria-label="Privacy notice contents">
        <ul>
          <li>
            <Link href="#your-rights">Your rights</Link>
          </li>
          <li>
            <Link href="#browser-storage">Browser storage</Link>
          </li>
          <li>
            <Link href="#data-sharing">Data sharing</Link>
          </li>
          <li>
            <Link href="#retention">Data retention</Link>
          </li>
        </ul>
      </nav>
      <div className="legal-copy">
        <OperatorDetails />
        <article className="instruction-section" id="browser-storage">
          <h2>Cookies and browser storage</h2>
          <p>
            Signing in sets two session cookies, axyro-access and axyro-refresh,
            for up to 30 days each time the session is refreshed. Short-lived
            sign-in and password-recovery cookies expire within ten minutes.
            Blocking these cookies can prevent sign-in or password recovery.
          </p>
          <p>
            Plan setup uses session storage for drafts in the current tab. Local
            storage remembers workout preferences, progress and saved plans
            across visits. Custom workout definitions stay in the browser where
            you save them. You can clear these in your browser’s site-data
            settings. Clearing a guest workout removes its local copy. Checkout
            and Google sign-in open the respective provider’s service when you
            choose them.
          </p>
        </article>
        <article className="instruction-section">
          <h2>Legal grounds</h2>
          <p>
            We use account, subscription and ordinary workout data to provide
            the features you request under our agreement with you. Without the
            required account or payment details we cannot provide the
            corresponding signed-in or paid features. We use security counters
            in our legitimate interest in preventing abuse and keep legally
            required billing records to comply with accounting and tax
            obligations.
          </p>
        </article>
        <article className="instruction-section" id="your-rights">
          <h2>Your GDPR rights</h2>
          <p>
            You can request access, correction, deletion, restriction or, where
            applicable, a portable copy of your data. You can also object to
            processing based on legitimate interests.
          </p>
          <p>
            We may need to confirm your identity. We respond within one month
            and will tell you within that month if a complex request needs more
            time.
          </p>
          <p>
            You can complain to the supervisory authority where you live or
            work, where the alleged infringement occurred, or to the Czech
            authority, the{" "}
            <a className="text-link" href="https://uoou.gov.cz/">
              Úřad pro ochranu osobních údajů
            </a>
            .
          </p>
          <div className="privacy-notice-actions">
            <a
              className="button button--secondary"
              href={`mailto:${supportEmail}?subject=Axyro%20privacy%20request`}
            >
              Send a privacy request
            </a>
            <Link className="text-link" href="/settings#privacy-rights">
              Download device training data
            </Link>
          </div>
        </article>
        <article className="instruction-section">
          <h2>What is stored</h2>
          <p>
            Sport, goals, schedule, duration, equipment, plans, workout
            progress, history, feedback, and audio/effort preferences.
          </p>
          <p>
            Accounts store your email, display name and optional provider
            avatar. Authentication credentials are managed by Supabase; payment
            details are managed by Stripe. Axyro does not store your password or
            card number.
          </p>
          <p>
            Abuse protection uses request counts and reset times in Supabase.
            Counter identifiers are derived from your connecting IP address,
            email or account ID; the counters do not store those original
            values.
          </p>
        </article>
        <article className="instruction-section">
          <h2>Why it is used</h2>
          <p>
            To generate compatible sessions, remember progress, resume
            interrupted workouts and suggest changes to your plan. If you rate a
            workout Easy, Just right or Hard, we save your rating with the
            session. We use ratings across sessions to suggest adjustments for
            you to review.
          </p>
        </article>
        <article className="instruction-section" id="data-sharing">
          <h2>Storage and sharing</h2>
          <p>
            Axyro stores account-owned training data in Supabase with an
            isolated browser cache. Guest workout settings and progress remain
            in this browser. Supabase handles account identity and Google login;
            Resend delivers confirmation and password-reset emails. Netlify
            hosts Axyro and serves workout media. Stripe handles subscriptions.
            There is no advertising integration.
          </p>
          <p>
            If the operator enables AI planning, structured training goals,
            scheduling and equipment preferences are sent through a server-only
            route to OpenAI to propose exercise IDs. Pain reports, workout
            feedback, workout history and the API key are not sent to the
            browser or included in that model request. With AI planning
            disabled, plan generation stays deterministic.
          </p>
        </article>
        {analyticsEnabled && (
          <article className="instruction-section" id="workout-analytics">
            <h2>Optional workout analytics</h2>
            <p>
              With your consent, we count workout starts and finishes to
              understand how often the player is used. Each report contains only
              the event name. Netlify handles the request and may process
              connection information in its infrastructure logs.
            </p>
            <p>
              We store your choice in this browser under axyro.analytics.v1
              until you clear site data or change it. You can withdraw consent
              at any time in{" "}
              <Link className="text-link" href="/settings#analytics">
                Settings
              </Link>
              . Withdrawal stops future reporting and does not affect processing
              before withdrawal.
            </p>
          </article>
        )}
        <article className="instruction-section" id="retention">
          <h2>Retention and control</h2>
          <p>
            If you withdraw from a purchase, we record your name, contract
            reference, email address and submission time to handle the
            withdrawal and meet consumer-law obligations. Resend delivers the
            confirmation to the address you provide.
          </p>
          <p>
            Your training data remains when Pro expires. Account deletion
            removes the account and linked profile/training records and cancels
            the linked Stripe subscription. Settings can reset training data.
            Separate billing records and infrastructure backups may remain after
            account deletion. Unattributed data from earlier local-only versions
            is preserved separately and never automatically assigned to an
            account.
          </p>
          <p>
            Security counters stop applying after 15 minutes, or one hour for
            plan generation. Expired counters are removed during later request
            processing.
          </p>
        </article>
        <div className="legal-links">
          <Link className="text-link" href="/settings">
            Privacy &amp; data settings
          </Link>
          <Link className="text-link" href="/help">
            Get help with your data
          </Link>
        </div>
      </div>
    </main>
  );
}
