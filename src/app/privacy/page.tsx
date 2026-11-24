import { OperatorDetails } from "@/components/operator-details";
import { publicMetadata } from "@/lib/publishing";
import Link from "next/link";

export const metadata = publicMetadata(
  "/privacy",
  "Privacy notice | Axyro",
  "How Axyro handles training data and optional AI planning.",
);

export default function PrivacyPage() {
  return (
    <main className="page-shell section-page legal-page">
      <header className="page-intro">
        <h1 className="section-title">Privacy notice</h1>
        <p>Last updated 22 November 2026</p>
        <p>
          How Axyro stores your workout history, handles account data and uses
          your planning preferences.
        </p>
      </header>
      <div className="legal-copy">
        <OperatorDetails />
        <article className="instruction-section">
          <h2>Cookies and browser storage</h2>
          <p>Signing in sets two session cookies, axyro-access and axyro-refresh,
            for up to 30 days each time the session is refreshed. Short-lived
            sign-in and password-recovery cookies expire within ten minutes.
            Blocking these cookies can prevent sign-in or password recovery.</p>
          <p>Plan setup uses session storage for drafts in the current tab. Local
            storage remembers workout preferences, progress and saved plans across
            visits. You can clear these in your browser’s site-data settings.
            Clearing a guest workout removes its local copy. Checkout and Google
            sign-in open the respective provider’s service when you choose them.</p>
        </article>
        <article className="instruction-section">
          <h2>Legal grounds and your rights</h2>
          <p>We use account, subscription and ordinary workout data to provide
            the features you request under our agreement with you. Without the
            required account or payment details we cannot provide the corresponding
            signed-in or paid features. We use security counters in our legitimate
            interest in preventing abuse and keep legally required billing records
            to comply with accounting and tax obligations.</p>
          <p>Contact the operator to request access, correction, deletion,
            restriction or, where applicable, a portable copy of your data. You
            can object to processing based on legitimate interests. We normally
            respond within one month. You can also complain to the supervisory
            authority where you live or work, or to the Czech authority,
            the <a className="text-link" href="https://uoou.gov.cz/">Úřad pro ochranu osobních údajů</a>.</p>
        </article>
        <article className="instruction-section">
          <h2>What is stored</h2>
          <p>
            Sport, goals, schedule, duration, equipment, plans, workout progress, history, feedback, and audio/effort
            preferences.
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
            To generate compatible sessions, remember progress, resume interrupted workouts and suggest changes to your plan. If you
            rate a workout Easy, Just right or Hard, we save your rating with
            the session. We use ratings across sessions to suggest adjustments
            for you to review.
          </p>
        </article>
        <article className="instruction-section">
          <h2>Storage and sharing</h2>
          <p>
            Axyro stores account-owned training data in Supabase with an
            isolated browser cache. Guest workout settings and progress remain
            in this browser. Supabase handles account identity and Google login;
            Resend delivers confirmation and password-reset emails. Netlify hosts Axyro and serves workout media. Stripe handles subscriptions. There is no advertising or analytics
            integration.
          </p>
          <p>
            If the operator enables AI planning, structured training goals, scheduling and equipment preferences are sent through a server-only route to OpenAI to
            propose exercise IDs. Pain reports, workout feedback, workout history and the API key are not sent
            to the browser or included in that model request. With AI planning
            disabled, plan generation stays deterministic.
          </p>
        </article>
        <article className="instruction-section">
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
            Separate billing records and infrastructure backups may remain after account deletion. Unattributed data from earlier
            local-only versions is preserved separately and never automatically
            assigned to an account.
          </p>
          <p>
            Security counters stop applying after 15 minutes, or one hour for
            plan generation. Expired counters are removed during later request
            processing.
          </p>
        </article>
        <div className="legal-links">
          <Link className="text-link" href="/settings">Privacy &amp; data settings</Link>
          <Link className="text-link" href="/help">Get help with your data</Link>
        </div>
      </div>
    </main>
  );
}
