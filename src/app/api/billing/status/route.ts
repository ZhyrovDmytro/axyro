import { getBillingAccess, billingError } from "@/services/billing/server";
export async function GET() {
  try {
    const { subscription, hasPro } = await getBillingAccess();
    return Response.json({ subscription, hasPro }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return billingError(error); }
}
