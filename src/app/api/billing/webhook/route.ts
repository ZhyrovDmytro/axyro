import { confirmPurchase } from "@/services/billing/contract-confirmation";
import { z } from "zod";
import {
  readRequestText,
  RequestBodyTooLargeError,
} from "@/services/http/request-body";
import { verifyWebhook } from "@/services/billing/stripe";
import {
  billingError,
  billingOrigin,
  reconcileCustomer,
} from "@/services/billing/server";
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
        created: z.number().int().optional(),
        data: z.object({
          object: z
            .object({
              payment_status: z.string().optional(),
              metadata: z
                .object({
                  contract_version: z.string().optional(),
                  contract_origin: z.string().optional(),
                })
                .nullable()
                .optional(),
              customer: z
                .union([z.string(), z.object({ id: z.string() })])
                .nullable()
                .optional(),
            })
            .passthrough(),
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
    if (
      [
        "checkout.session.completed",
        "checkout.session.async_payment_succeeded",
      ].includes(event.type) &&
      event.data.object.metadata?.contract_version &&
      event.data.object.metadata.contract_origin === billingOrigin() &&
      event.data.object.payment_status === "paid"
    ) {
      await confirmPurchase(event.data.object, event.created);
    }
    return Response.json({ received: true });
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError)
      return Response.json({ error: "Request too large." }, { status: 413 });
    return billingError(error);
  }
}
