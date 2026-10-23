import { products } from "@/services/billing/stripe";
import { billingError } from "@/services/billing/server";
export async function GET() {
  try { return Response.json({ products: await products() }, { headers: { "Cache-Control": "no-store" } }); }
  catch (error) { return billingError(error); }
}
