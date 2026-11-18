"use client";
import { useAuth } from "@/components/auth/auth-provider";
import { PaywallLink } from "./paywall-modal";
import { FREE_LIBRARY_LIMIT, GUEST_LIBRARY_LIMIT } from "@/lib/library-access";

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
        <h2 id="library-invitation-title">Unlock the full library with Pro.</h2>
        <p>
          {total - (user ? FREE_LIBRARY_LIMIT : GUEST_LIBRARY_LIMIT)} more
          exercises, with movement demos and clear technique cues. Explore the
          full library with Pro.
        </p>
        <div className="account-actions">
          <PaywallLink
            context="library"
            returnTo="/exercises"
            className="button button--dark"
            href="/upgrade?context=library&returnTo=/exercises"
          >
            Explore Pro
          </PaywallLink>
          {!user && (
            <>
              <PaywallLink
                context="library"
                returnTo="/exercises"
                requirePro={false}
                initialAuthMode="signup"
                className="button button--secondary"
                href="/signup?next=/exercises"
              >
                Create account
              </PaywallLink>
              <PaywallLink
                context="library"
                returnTo="/exercises"
                requirePro={false}
                className="button button--secondary"
                href="/signin?next=/exercises"
              >
                Sign in
              </PaywallLink>
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
