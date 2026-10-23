"use client";
import { useEntitlement } from "./entitlement-provider";
import { Paywall, type PaywallContext } from "./paywall";
export function ProGate({
  children,
  context = "plan",
  returnTo = "/plan",
  embedded = false,
}: {
  children: React.ReactNode;
  context?: PaywallContext;
  returnTo?: string;
  embedded?: boolean;
}) {
  const { hasPro, loading } = useEntitlement();
  const Container = embedded ? "section" : "main";
  if (loading)
    return (
      <Container className="page-shell" role="status">
        Checking membership…
      </Container>
    );
  return hasPro ? (
    children
  ) : (
    <Container className="page-shell account-shell">
      <Paywall context={context} returnTo={returnTo} embedded={embedded} />
    </Container>
  );
}
