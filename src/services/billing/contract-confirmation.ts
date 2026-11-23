import { z } from "zod";

import { supabaseRequest } from "@/services/auth/server";
import { stripeRequest } from "./stripe";
import {
  billingEmailConfigured,
  sendBillingEmail,
} from "./transactional-email";

const version = "2026-11-23";
const confirmations = "rest/v1/billing_contract_confirmations";

export function checkoutContractFields(origin: string) {
  const {
    AXYRO_OPERATOR_NAME,
    AXYRO_OPERATOR_ADDRESS,
    AXYRO_OPERATOR_REGISTRATION,
    AXYRO_OPERATOR_PHONE,
    AXYRO_SUPPORT_EMAIL,
  } = process.env;
  if (
    !billingEmailConfigured() ||
    !AXYRO_OPERATOR_NAME ||
    !AXYRO_OPERATOR_ADDRESS ||
    !AXYRO_OPERATOR_REGISTRATION ||
    !AXYRO_OPERATOR_PHONE
  )
    return null;
  const operator = [
    AXYRO_OPERATOR_NAME,
    AXYRO_OPERATOR_ADDRESS,
    AXYRO_OPERATOR_REGISTRATION,
    AXYRO_OPERATOR_PHONE,
    AXYRO_SUPPORT_EMAIL,
  ].join("\n");
  if (operator.length > 500)
    throw new Error("Billing operator details are too long.");
  return {
    "metadata[contract_version]": version,
    "metadata[operator]": operator,
    "metadata[contract_origin]": origin,
    "consent_collection[terms_of_service]": "required",
    "adaptive_pricing[enabled]": "false",
    "custom_text[submit][message]":
      "By subscribing, you agree to pay the total shown today and every billing period until you cancel. You request immediate Pro access and retain your statutory withdrawal rights.",
  };
}

const checkout = z.object({
  id: z.string().regex(/^cs_[a-zA-Z0-9_]+$/),
  created: z.number().int(),
  payment_status: z.literal("paid"),
  amount_total: z.number().int().nonnegative(),
  currency: z.string().length(3),
  customer_details: z.object({ email: z.email() }),
  consent: z.object({ terms_of_service: z.literal("accepted") }),
  metadata: z.object({
    contract_version: z.literal(version),
    operator: z.string().min(1),
    contract_origin: z.url(),
  }),
});

export async function confirmPurchase(raw: unknown, completedAt?: number) {
  const purchase = checkout.parse(raw);
  const origin = purchase.metadata.contract_origin;
  const existing = z
    .array(z.object({ checkout_id: z.string() }))
    .parse(
      await supabaseRequest(
        `${confirmations}?checkout_id=eq.${purchase.id}&select=checkout_id`,
        { admin: true },
      ),
    );
  if (existing.length) return;

  const {
    data: [item],
  } = z
    .object({
      data: z
        .array(
          z.object({
            price: z.object({
              recurring: z.object({
                interval: z.enum(["month", "year"]),
                interval_count: z.number().int().positive(),
              }),
            }),
          }),
        )
        .length(1),
    })
    .parse(await stripeRequest(`checkout/sessions/${purchase.id}/line_items`));
  const { interval, interval_count: count } = item.price.recurring;
  const money = new Intl.NumberFormat("en", {
    style: "currency",
    currency: purchase.currency,
  });
  const amount = money.format(
    purchase.amount_total /
      10 ** (money.resolvedOptions().maximumFractionDigits ?? 2),
  );
  const period = count === 1 ? interval : `${count} ${interval}s`;
  await sendBillingEmail(
    purchase.customer_details.email,
    "Your Axyro Pro contract",
    [
      "Axyro Pro membership",
      `Purchase reference: ${purchase.id}`,
      `Purchased on: ${new Date((completedAt ?? purchase.created) * 1000).toISOString()}`,
      `Paid today: ${amount}`,
      `Renews at ${amount} every ${period} until cancelled. There is no free trial.`,
      "",
      purchase.metadata.operator,
      "",
      "Pro includes personalized plans and access to the full workout library while your membership is active. Use a current web browser and internet connection. Sign in with the account used to subscribe.",
      `Manage or cancel renewal at ${origin}/account. Cancelling renewal lets your paid period run to its end.`,
      "You requested immediate access and accepted the membership terms at purchase.",
      "",
      "You generally have 14 days from purchase to withdraw without giving a reason. Immediate access does not waive this right. Any refund due is sent within 14 days of your withdrawal using your original payment method unless you agree otherwise.",
      `Withdraw online at ${origin}/withdrawal or email the operator with a clear statement.`,
      "Optional model form: I withdraw from my Axyro Pro contract purchased on [date]. Name: [name]. Address: [address]. Account email: [email]. Date: [date].",
      "",
      "For service problems, contact the operator with your account email, the issue and the remedy you seek. Statutory remedies and mandatory consumer rights apply. The Czech Trade Inspection Authority provides out-of-court resolution at https://coi.gov.cz/en/information-about-adr/.",
      "Exercise at a comfortable effort and stop if you feel sharp pain. Account deletion removes your profile and training data and cancels your linked subscription.",
      `Membership terms version ${version}. Public terms: ${origin}/terms`,
      `Privacy notice: ${origin}/privacy`,
    ].join("\n"),
    `contract-${purchase.id}`,
  );
  await supabaseRequest(`${confirmations}?on_conflict=checkout_id`, {
    method: "POST",
    admin: true,
    prefer: "resolution=ignore-duplicates,return=minimal",
    body: { checkout_id: purchase.id },
  });
}
