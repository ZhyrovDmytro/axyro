import Link from "next/link";
import { connection } from "next/server";

import { publicMetadata, supportEmail } from "@/lib/publishing";
import { billingEmailConfigured } from "@/services/billing/transactional-email";

import { WithdrawalForm } from "./withdrawal-form";

export const metadata = publicMetadata(
  "/withdrawal",
  "Withdraw from your Pro contract | Axyro",
  "Exercise your right to withdraw from an Axyro Pro purchase.",
);

export default async function WithdrawalPage() {
  await connection();
  const showForm =
    process.env.NODE_ENV !== "production" || billingEmailConfigured();

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
        {showForm && <WithdrawalForm />}
        <p className="account-fine-print withdrawal-contact">
          {showForm
            ? "You can also email your withdrawal to "
            : "Email your withdrawal to "}
          <a className="text-link" href={`mailto:${supportEmail}`}>
            {supportEmail}
          </a>
          .
        </p>
      </article>
    </main>
  );
}
