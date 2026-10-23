import Link from "next/link";
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
          through Account → Manage subscription. Access continues through the
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
        <Link className="text-link" href="/privacy">
          Read the privacy notice
        </Link>
      </article>
    </main>
  );
}
