import { assertSameOrigin, getAuthSession } from "@/services/auth/server";
import {
  billingError,
  billingRow,
  reconcileCustomer,
  getBillingAccess,
} from "@/services/billing/server";
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const session = await getAuthSession();
    if (!session)
      return Response.json({ error: "Sign in first." }, { status: 401 });
    const row = await billingRow(session.user.id);
    if (row) await reconcileCustomer(row.customer_id);
    const { subscription, hasPro } = await getBillingAccess(session);
    return Response.json({ subscription, hasPro });
  } catch (error) {
    return billingError(error);
  }
}
