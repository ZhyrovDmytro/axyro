"use client";
import { useEffect } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { PaywallLink, usePaywallModal } from "./paywall-modal";
import { useEntitlement } from "./entitlement-provider";
import type { PaywallContext } from "./paywall";
export function ProGate({
  children,
  context = "plan",
  returnTo = "/plan",
  embedded = false,
  requirePro = true,
}: {
  children: React.ReactNode;
  context?: PaywallContext;
  returnTo?: string;
  embedded?: boolean;
  requirePro?: boolean;
}) {
  const { user, loading: authLoading } = useAuth();
  const { hasPro, loading } = useEntitlement();
  const Container = embedded ? "section" : "main";
  if (authLoading || (user && requirePro && loading))
    return (
      <Container className="page-shell" role="status">
        Checking membership…
      </Container>
    );
  if (!user || (requirePro && !hasPro))
    return (
      <AccessPrompt
        context={context}
        returnTo={returnTo}
        requirePro={requirePro}
        embedded={embedded}
      />
    );
  return children;
}

function AccessPrompt({
  context,
  returnTo,
  requirePro,
  embedded,
}: {
  context: PaywallContext;
  returnTo: string;
  requirePro: boolean;
  embedded: boolean;
}) {
  const open = usePaywallModal();
  const { user } = useAuth();
  useEffect(() => {
    open({ context, returnTo, requirePro });
  }, [open, context, returnTo, requirePro]);
  const Container = embedded ? "section" : "main";
  const Heading = embedded ? "h2" : "h1";
  return (
    <Container className="page-shell account-shell">
      <section className="account-panel">
        <Heading>
          {user ? "Pro access required" : "Sign in to continue"}
        </Heading>
        <p>Keep your plan and training together in your account.</p>
        <PaywallLink
          className="button button--primary"
          href={
            user
              ? `/upgrade?context=${context}&returnTo=${encodeURIComponent(returnTo)}`
              : `/signin?next=${encodeURIComponent(returnTo)}`
          }
          context={context}
          returnTo={returnTo}
          requirePro={requirePro}
        >
          {user ? "Explore Pro" : "Sign in"}
        </PaywallLink>
      </section>
    </Container>
  );
}
