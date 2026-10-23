import { assertSameOrigin, getAuthSession } from "@/services/auth/server";
import { billingError, billingOrigin, billingRow } from "@/services/billing/server";
import { stripeRequest, stripeUrlSchema } from "@/services/billing/stripe";
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const session = await getAuthSession();
    if (!session) return Response.json({ error: "Sign in first." }, { status: 401 });
    const row = await billingRow(session.user.id);
    if (!row) return Response.json({ error: "No subscription to manage." }, { status: 404 });
    return Response.json(stripeUrlSchema.parse(await stripeRequest("billing_portal/sessions", new URLSearchParams({ customer: row.customer_id, return_url: `${billingOrigin()}/account` }))));
  } catch (error) { return billingError(error); }
}
