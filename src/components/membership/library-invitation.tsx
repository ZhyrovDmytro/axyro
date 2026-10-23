"use client";
import Link from "next/link";
import { useAuth } from "@/components/auth/auth-provider";
import { FREE_LIBRARY_LIMIT } from "@/lib/library-access";

export function LibraryInvitation({ total }: { total: number }) {
  const { user } = useAuth();
  return (
    <section
      className="library-invitation"
      aria-labelledby="library-invitation-title"
    >
      <div className="exercise-grid library-overflow" aria-hidden="true">
        <span />
        <span />
      </div>
      <div className="library-invitation-copy">
        <h2 id="library-invitation-title">There’s more to explore.</h2>
        <p>
          {total - FREE_LIBRARY_LIMIT} more exercises, with movement demos and
          clear technique cues. Explore the full library with Pro.
        </p>
        <div className="account-actions">
          {user ? (
            <Link
              className="button button--dark"
              href="/upgrade?context=library&returnTo=/exercises"
            >
              Explore Pro
            </Link>
          ) : (
            <>
              <Link
                className="button button--dark"
                href="/signup?next=/exercises"
              >
                Create account
              </Link>
              <Link
                className="button button--secondary"
                href="/signin?next=/exercises"
              >
                Sign in
              </Link>
            </>
          )}
        </div>
        {!user && (
          <p className="account-fine-print">
            Creating an account is free. Full-library access requires Pro.
          </p>
        )}
      </div>
    </section>
  );
}
