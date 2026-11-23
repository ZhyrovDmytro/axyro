import { assertSameOrigin } from "@/services/auth/server";
import { applicationOrigin } from "@/services/auth/security";
import {
  deliverWithdrawal,
  recordWithdrawal,
  withdrawalInput,
} from "@/services/billing/withdrawal";
import { enforceAuthRateLimit } from "@/services/http/rate-limit";
import {
  readRequestText,
  RequestBodyTooLargeError,
} from "@/services/http/request-body";

const headers = { "Cache-Control": "no-store" };

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
  } catch {
    return Response.json(
      { error: "Invalid origin." },
      { status: 403, headers },
    );
  }

  try {
    const parsed = withdrawalInput.safeParse(
      JSON.parse(await readRequestText(request, 4096)),
    );
    if (!parsed.success) {
      return Response.json(
        { error: "Check the name, purchase reference and email." },
        { status: 400, headers },
      );
    }
    const input = parsed.data;
    const limited = await enforceAuthRateLimit(
      request,
      "billing-withdrawal",
      input.email,
    );
    if (limited) return limited;

    const saved = await recordWithdrawal(
      process.env.SITE_ID || applicationOrigin(request),
      input,
    );
    if (!saved) {
      return Response.json(
        { error: "This confirmation reference is already in use." },
        { status: 409, headers },
      );
    }

    const { message, receiptSent } = await deliverWithdrawal(saved);
    return Response.json(
      {
        message,
        receiptSent,
      },
      { headers },
    );
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError)
      return Response.json(
        { error: "Request too large." },
        { status: 413, headers },
      );
    if (error instanceof SyntaxError)
      return Response.json(
        { error: "Invalid withdrawal details." },
        { status: 400, headers },
      );
    return Response.json(
      { error: "We couldn't confirm receipt. Try again or email support." },
      { status: 503, headers },
    );
  }
}
