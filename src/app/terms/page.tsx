import Link from "next/link";
import { publicMetadata } from "@/lib/publishing";

export const metadata = publicMetadata(
  "/terms",
  "Membership terms | Axyro",
  "How free workouts, Pro subscriptions, cancellation and account deletion work.",
);

export default function TermsPage() {
  return (
    <main className="page-shell account-shell">
      <article className="account-panel">
        <p className="kicker">Axyro</p>
        <h1>Membership terms</h1>
        <p>
          One designated starter workout is available free. Pro includes
          personalized plans and access to the full training library while your
          subscription is active.
        </p>
        <p>
          Subscription prices, billing period and renewal terms are shown by
          Stripe before purchase. No free subscription trial is offered. Cancel
          through Account → Membership in the Stripe customer portal. Access continues through the
          paid period unless the provider reports a payment problem or
          termination.
        </p>
        <p>
          Training is general fitness guidance. Choose a comfortable effort,
          allow recovery days and stop if movement causes sharp pain.
        </p>
        <p>
          Account deletion removes your stored profile and training data and
          cancels the linked Stripe subscription immediately. You must
          explicitly confirm deletion.
        </p>
        <p>
          <Link className="text-link" href="/help">
            Get help with billing or account access
          </Link>
        </p>
        <Link className="text-link" href="/privacy">
          Read the privacy notice
        </Link>
      </article>
    </main>
  );
}
