import { z } from "zod";
import {
  assertSameOrigin,
  getAuthSession,
  supabaseRequest,
} from "@/services/auth/server";
import { getBillingAccess } from "@/services/billing/server";
import { userDataKeys } from "@/services/persistence/user-storage";

const dataSchema = z.partialRecord(
  z.enum(userDataKeys),
  z.string().max(2_000_000),
);
const rowSchema = z.object({ payload: dataSchema, revision: z.number().int() });
const headers = { "Cache-Control": "no-store" };

export async function GET() {
  const session = await getAuthSession();
  if (!session || session.user.isDevelopmentAdmin)
    return Response.json(
      { error: "Sign in required" },
      { status: 401, headers },
    );
  try {
    const rows = z
      .array(rowSchema)
      .parse(
        await supabaseRequest(
          `/rest/v1/user_training_data?user_id=eq.${session.user.id}&select=payload,revision`,
          { token: session.accessToken },
        ),
      );
    return Response.json(
      {
        userId: session.user.id,
        data: rows[0]?.payload ?? null,
        revision: rows[0]?.revision ?? 0,
      },
      { headers },
    );
  } catch {
    return Response.json(
      { error: "Training data is temporarily unavailable" },
      { status: 503, headers },
    );
  }
}

export async function PUT(request: Request) {
  try {
    assertSameOrigin(request);
  } catch {
    return Response.json({ error: "Invalid origin" }, { status: 403, headers });
  }
  const session = await getAuthSession();
  if (!session || session.user.isDevelopmentAdmin)
    return Response.json(
      { error: "Sign in required" },
      { status: 401, headers },
    );
  try {
    const text = await request.text();
    if (text.length > 4_000_000)
      return Response.json(
        { error: "Training data is too large" },
        { status: 413, headers },
      );
    const input = z
      .object({
        userId: z.string().uuid(),
        revision: z.number().int().nonnegative(),
        data: dataSchema,
      })
      .strict()
      .parse(JSON.parse(text));
    // The posted owner only detects requests queued before an account switch.
    if (input.userId !== session.user.id)
      return Response.json(
        { error: "Account changed" },
        { status: 403, headers },
      );
    const current = z
      .array(rowSchema)
      .parse(
        await supabaseRequest(
          `/rest/v1/user_training_data?user_id=eq.${session.user.id}&select=payload,revision`,
          { token: session.accessToken },
        ),
      );
    if (
      input.data["veyro.training-plan.v1"] !==
        current[0]?.payload["veyro.training-plan.v1"] &&
      input.data["veyro.training-plan.v1"] !== undefined
    ) {
      if (!(await getBillingAccess(session)).hasPro)
        return Response.json(
          { error: "Pro is required to save a personalized plan" },
          { status: 403, headers },
        );
    }
    const saved = await supabaseRequest(
      "/rest/v1/rpc/save_user_training_data",
      {
        method: "POST",
        token: session.accessToken,
        body: { next_payload: input.data, expected_revision: input.revision },
      },
    );
    if (saved !== true)
      return Response.json(
        {
          error:
            "Training data changed on another device. Reload before saving.",
        },
        { status: 409, headers },
      );
    return Response.json({ revision: input.revision + 1 }, { headers });
  } catch {
    return Response.json(
      { error: "Could not save training data" },
      { status: 400, headers },
    );
  }
}
