import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getAuthSession } from "./server";
import { getBillingAccess } from "@/services/billing/server";
/** Server component guard; refresh happens in a Route Handler that can set cookies. */
export async function requireProPage(
  next: string,
  context: "plan" | "workout" = "plan",
) {
  const session = await getAuthSession({ refresh: false });
  if (!session) {
    if ((await cookies()).has("axyro-refresh"))
      redirect(`/api/auth/refresh?next=${encodeURIComponent(next)}`);
    redirect(`/signin?next=${encodeURIComponent(next)}`);
  }
  const access = await getBillingAccess(session);
  if (!access.hasPro)
    redirect(
      `/upgrade?context=${context}&returnTo=${encodeURIComponent(next)}`,
    );
  return session.user;
}
