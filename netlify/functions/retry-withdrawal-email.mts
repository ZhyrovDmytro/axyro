import { retryWithdrawalEmail } from "../../src/services/billing/withdrawal";

export const config = { schedule: "*/5 * * * *" };

export default async function retryPendingWithdrawalEmails() {
  if (!process.env.SITE_ID) return new Response(null, { status: 503 });
  try {
    const result = await retryWithdrawalEmail(process.env.SITE_ID);
    if (result.pending) {
      console.warn("Withdrawal emails still pending", result.pending);
    }
    return new Response(null, { status: 204 });
  } catch {
    console.error("Withdrawal email retry failed");
    return new Response(null, { status: 503 });
  }
}
