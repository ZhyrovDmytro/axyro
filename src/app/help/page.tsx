import { AccountHelp } from "./account-help";
import { publicMetadata, supportEmail } from "@/lib/publishing";

export const metadata = publicMetadata(
  "/help",
  "Help | Axyro",
  "Find help with signing in, managing Pro and controlling your training data.",
);

export default function HelpPage() {
  return (
    <main className="page-shell account-shell">
      <article className="account-panel">
        <h1>Help with Axyro</h1>
        <AccountHelp />
        <section className="account-section">
          <h2>Contact support</h2>
          <p>
            For questions about Axyro, account access, billing or privacy, email{" "}
            <a className="text-link" href={`mailto:${supportEmail}`}>
              {supportEmail}
            </a>
            . Leave out passwords and card details.
          </p>
        </section>
      </article>
    </main>
  );
}
