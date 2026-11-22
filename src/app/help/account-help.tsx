"use client";

import Link from "next/link";
import { useAuth } from "@/components/auth/auth-provider";

export function AccountHelp() {
  const { user, loading } = useAuth();
  if (loading || !user)
    return (
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
    );
  return (
    <>
      <section className="account-section">
        <h2>Manage my subscription</h2>
        <p>
          In Account, open Manage subscription to update your payment method or
          cancel renewal.
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
    </>
  );
}
