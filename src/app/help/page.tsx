import Link from "next/link";
import { publicMetadata } from "@/lib/publishing";

export const metadata = publicMetadata(
  "/help",
  "Help | Axyro",
  "Find help with signing in, managing Pro and controlling your training data.",
);

export default function HelpPage() {
  const contact = process.env.AXYRO_SUPPORT_EMAIL?.trim();
  return (
    <main className="page-shell account-shell">
      <article className="account-panel">
        <h1>Help with Axyro</h1>
        <section className="account-section">
          <h2>I can’t sign in</h2>
          <p>
            Used a password? Request a reset link with the email you registered.
            If you joined with Google, choose Google on the sign-in page.
          </p>
          <Link className="text-link" href="/forgot-password">
            Reset my password
          </Link>
        </section>
        <section className="account-section">
          <h2>Manage my subscription</h2>
          <p>
            Sign in to the account you used to subscribe. Open Manage
            subscription to update your payment method or cancel renewal.
          </p>
          <Link className="text-link" href="/account">
            Open my account
          </Link>
        </section>
        <section className="account-section">
          <h2>Manage my training data</h2>
          <p>
            Open Settings to reset your plan or remove training data. To delete
            your account, open Account and confirm deletion.
          </p>
          <Link className="text-link" href="/settings">
            Open settings
          </Link>
        </section>
        {contact && (
          <section className="account-section">
            <h2>Contact support</h2>
            <p>
              For account access, billing or privacy requests, email{" "}
              <a className="text-link" href={`mailto:${contact}`}>
                {contact}
              </a>
              . Leave out passwords and card details.
            </p>
          </section>
        )}
      </article>
    </main>
  );
}
