import { OperatorDetails } from "@/components/operator-details";
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
        <p>Last updated 23 November 2026</p>
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
        <OperatorDetails />
        <h2>Withdrawing from a purchase</h2>
        <p>EU consumers generally have 14 days from entering an online service
          contract to withdraw without giving a reason. Cancelling renewal stops
          future charges. You can <Link className="text-link" href="/withdrawal">withdraw from the contract online</Link> or email
          the operator with a clear statement before the deadline.</p>
        <p>You may use this wording: “I withdraw from my Axyro Pro contract
          ordered on [date]. My name is [name], my address is [address] and
          my account email is [email].” Include the date of your notice.
          Any refund due is payable within 14 days of notice, using the original
          payment method unless you agree otherwise.</p>
        <h2>If the service does not work as agreed</h2>
        <p>Email the operator with the account email, a description of the
          problem and the remedy you seek. You may request that the service be
          brought into conformity and, where statutory conditions are met, a
          price reduction or termination. Your mandatory consumer rights in
          your country of habitual residence remain available.</p>
        <p>If we cannot resolve your complaint directly, you can apply for
          out-of-court resolution within one year of first raising it with us.
          See the <a className="text-link" href="https://coi.gov.cz/en/information-about-adr/">Czech Trade Inspection Authority’s dispute resolution service</a>.</p>
        <h2>Training and account deletion</h2>
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
