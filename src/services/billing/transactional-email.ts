import { z } from "zod";

export function billingEmailConfigured() {
  return !!(
    process.env.AXYRO_BILLING_EMAIL_API_KEY &&
    process.env.AXYRO_BILLING_FROM_EMAIL &&
    process.env.AXYRO_SUPPORT_EMAIL
  );
}

export async function sendBillingEmail(
  to: string,
  subject: string,
  message: string,
  idempotencyKey: string,
) {
  if (!billingEmailConfigured())
    throw new Error("Billing email is unavailable.");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.AXYRO_BILLING_EMAIL_API_KEY}`,
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify({
      from: process.env.AXYRO_BILLING_FROM_EMAIL,
      reply_to: process.env.AXYRO_SUPPORT_EMAIL,
      to: [to],
      subject,
      text: message,
    }),
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error("Billing email could not be sent.");
  z.object({ id: z.string() }).parse(await response.json());
}
