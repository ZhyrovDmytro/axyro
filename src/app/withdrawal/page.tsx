import Link from "next/link";

import { publicMetadata, supportEmail } from "@/lib/publishing";
import { WithdrawalForm } from "./withdrawal-form";

export const metadata = publicMetadata(
  "/withdrawal",
  "Withdraw from your Pro contract | Axyro",
  "Exercise your right to withdraw from an Axyro Pro purchase.",
);

export default function WithdrawalPage() {
  return (
    <main className="page-shell account-shell">
      <article className="account-panel withdrawal-panel">
        <h1>Withdraw from your Pro contract</h1>
        <p>
          You can generally withdraw within 14 days of purchase. To stop future
          renewals, go to{" "}
          <Link className="text-link" href="/account">
            Membership
          </Link>
          .
        </p>
        <WithdrawalForm />
        <p className="account-fine-print withdrawal-contact">
          You can also send your withdrawal by email to{" "}
          <a className="text-link" href={`mailto:${supportEmail}`}>
            {supportEmail}
          </a>
          .
        </p>
      </article>
    </main>
  );
}
