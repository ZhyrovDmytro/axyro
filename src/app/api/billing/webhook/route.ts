import { z } from "zod";
import {
  readRequestText,
  RequestBodyTooLargeError,
} from "@/services/http/request-body";
import { verifyWebhook } from "@/services/billing/stripe";
import { billingError, reconcileCustomer } from "@/services/billing/server";
export const runtime = "nodejs";
export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret)
    return Response.json(
      { error: "Webhook is not configured." },
      { status: 503 },
    );
  try {
    const body = await readRequestText(request, 1_000_000);
    if (
      !verifyWebhook(
        body,
        request.headers.get("stripe-signature") ?? "",
        secret,
      )
    )
      return Response.json({ error: "Invalid signature." }, { status: 400 });
    const event = z
      .object({
        type: z.string(),
        data: z.object({
          object: z.object({
            customer: z
              .union([z.string(), z.object({ id: z.string() })])
              .nullable()
              .optional(),
          }),
        }),
      })
      .parse(JSON.parse(body));
    if (
      [
        "checkout.session.completed",
        "checkout.session.async_payment_succeeded",
        "customer.subscription.created",
        "customer.subscription.updated",
        "customer.subscription.deleted",
        "invoice.paid",
        "invoice.payment_failed",
      ].includes(event.type)
    ) {
      const customer = event.data.object.customer;
      if (customer)
        await reconcileCustomer(
          typeof customer === "string" ? customer : customer.id,
        );
    }
    return Response.json({ received: true });
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError)
      return Response.json({ error: "Request too large." }, { status: 413 });
    return billingError(error);
  }
}
