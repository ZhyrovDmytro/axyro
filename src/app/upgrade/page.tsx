import { Paywall } from "@/components/membership/paywall";
export default async function UpgradePage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string; context?: string }>;
}) {
  const query = await searchParams;
  const context =
    query.context === "workout" ||
    query.context === "progress" ||
    query.context === "library"
      ? query.context
      : "plan";
  const returnTo =
    query.returnTo?.startsWith("/") &&
    !query.returnTo.startsWith("//") &&
    !query.returnTo.includes("\\")
      ? query.returnTo
      : "/plan/setup";
  return (
    <main className="page-shell account-shell">
      <Paywall context={context} returnTo={returnTo} />
    </main>
  );
}
