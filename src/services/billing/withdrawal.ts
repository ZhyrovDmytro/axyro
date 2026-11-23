import { z } from "zod";

import { supabaseRequest } from "../auth/supabase-request";
import {
  billingEmailConfigured,
  sendBillingEmail,
} from "./transactional-email";

export const withdrawalInput = z.object({
  id: z.uuid(),
  name: z.string().trim().min(1).max(150),
  contract_reference: z.string().trim().min(1).max(250),
  email: z.email().max(254),
});
const withdrawal = withdrawalInput.extend({
  site_id: z.string().min(1),
  submitted_at: z.iso.datetime({ offset: true }),
  receipt_sent_at: z.string().nullable(),
  operator_notified_at: z.string().nullable(),
});
type Withdrawal = z.infer<typeof withdrawal>;
const table = "rest/v1/billing_withdrawals";

function withdrawalPath(site: string, id: string) {
  return `${table}?${new URLSearchParams({ site_id: `eq.${site}`, id: `eq.${id}` })}`;
}

export async function recordWithdrawal(
  site: string,
  input: z.infer<typeof withdrawalInput>,
) {
  await supabaseRequest(`${table}?on_conflict=site_id,id`, {
    admin: true,
    method: "POST",
    prefer: "resolution=ignore-duplicates,return=minimal",
    body: { ...input, site_id: site },
  });
  const [saved] = withdrawal
    .array()
    .parse(
      await supabaseRequest(withdrawalPath(site, input.id), { admin: true }),
    );
  if (
    !saved ||
    saved.email !== input.email ||
    saved.name !== input.name ||
    saved.contract_reference !== input.contract_reference
  )
    return null;
  return saved;
}

function withdrawalMessage(saved: Withdrawal) {
  return [
    "I withdraw from my Axyro Pro contract.",
    `Name: ${saved.name}`,
    `Purchase: ${saved.contract_reference}`,
    `Email: ${saved.email}`,
    `Submitted at: ${saved.submitted_at}`,
    `Reference: ${saved.id}`,
  ].join("\n");
}

export async function deliverWithdrawal(saved: Withdrawal) {
  const message = withdrawalMessage(saved);
  const reply = {
    message,
    receiptSent: Boolean(saved.receipt_sent_at),
    operatorNotified: Boolean(saved.operator_notified_at),
  };
  const support = process.env.AXYRO_SUPPORT_EMAIL;
  if (
    !support ||
    !billingEmailConfigured() ||
    (reply.receiptSent && reply.operatorNotified)
  )
    return reply;

  const path = withdrawalPath(saved.site_id, saved.id);
  await supabaseRequest(path, {
    admin: true,
    method: "PATCH",
    timeoutMs: 4000,
    prefer: "return=minimal",
    body: { last_delivery_attempt_at: new Date().toISOString() },
  }).catch(() => {
    // The submission is durable and a failed attempt update must not stop its receipt.
  });

  async function deliver(
    timestamp: "receipt_sent_at" | "operator_notified_at",
    to: string,
    subject: string,
  ) {
    if (saved[timestamp]) return true;
    await sendBillingEmail(
      to,
      subject,
      message,
      `withdrawal-${saved.site_id}-${saved.id}-${timestamp}`,
    );
    await supabaseRequest(path, {
      admin: true,
      method: "PATCH",
      timeoutMs: 4000,
      prefer: "return=minimal",
      body: { [timestamp]: new Date().toISOString() },
    });
    return true;
  }

  const [receipt, operator] = await Promise.allSettled([
    deliver("receipt_sent_at", saved.email, "Axyro received your withdrawal"),
    deliver("operator_notified_at", support, "Axyro Pro withdrawal received"),
  ]);
  return {
    message,
    receiptSent: receipt.status === "fulfilled" && receipt.value,
    operatorNotified: operator.status === "fulfilled" && operator.value,
  };
}

export async function retryWithdrawalEmail(site: string) {
  if (!billingEmailConfigured()) return { attempted: 0, pending: 0 };
  const filter = new URLSearchParams({
    site_id: `eq.${site}`,
    or: "(receipt_sent_at.is.null,operator_notified_at.is.null)",
    order: "last_delivery_attempt_at.asc.nullsfirst,submitted_at.asc",
    // Resend deduplicates sends for 24 hours. Older rows are reviewed by the operator.
    submitted_at: `gt.${new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString()}`,
    limit: "10",
  });
  const notices = withdrawal
    .array()
    .parse(
      await supabaseRequest(`${table}?${filter}`, {
        admin: true,
        timeoutMs: 4000,
      }),
    );
  const results = await Promise.all(notices.map(deliverWithdrawal));
  return {
    attempted: results.length,
    pending: results.filter(
      ({ receiptSent, operatorNotified }) => !receiptSent || !operatorNotified,
    ).length,
  };
}
