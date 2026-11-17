import { createHmac } from "node:crypto";
import { isIP } from "node:net";
import { z } from "zod";
import { supabaseRequest } from "@/services/auth/server";
import { developmentAdminEnabled } from "@/services/auth/security";

const quotas = {
  "auth-client": [30, 900],
  "auth-signin": [10, 900],
  "auth-signup": [5, 900],
  "auth-recover": [3, 900],
  "auth-password": [5, 900],
  "auth-delete": [3, 900],
  planner: [6, 3600],
  billing: [10, 900],
} as const;

function protectionUnavailable() {
  return Response.json(
    {
      error: "Request protection is temporarily unavailable. Please try again.",
    },
    {
      status: 503,
      headers: { "Retry-After": "30", "Cache-Control": "no-store" },
    },
  );
}

export async function enforceAuthRateLimit(
  request: Request,
  action: "auth-signin" | "auth-signup" | "auth-recover",
  email: string,
): Promise<Response | null> {
  if (developmentAdminEnabled()) return null;
  // Netlify owns this header and the read-only SITE_ID runtime variable.
  const ip = request.headers.get("x-nf-client-connection-ip") ?? "";
  if (!process.env.SITE_ID || !isIP(ip)) return protectionUnavailable();
  const limited = await enforceRateLimit("auth-client", ip);
  return limited ?? enforceRateLimit(action, `${ip}\0${email}`);
}

/** Shared counters are mandatory in production; an unavailable limiter denies work. */
export async function enforceRateLimit(
  action: keyof typeof quotas,
  subject: string,
): Promise<Response | null> {
  if (developmentAdminEnabled()) return null;
  try {
    const key =
      process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!key) throw new Error("Rate limiting is unavailable");
    const digest = createHmac("sha256", key)
      .update(`${process.env.APP_URL ?? ""}\0${subject.trim().toLowerCase()}`)
      .digest("hex");
    const [limit, seconds] = quotas[action];
    const retryAfter = z
      .number()
      .int()
      .min(0)
      .max(86400)
      .parse(
        await supabaseRequest("rest/v1/rpc/consume_api_rate_limit", {
          admin: true,
          method: "POST",
          body: {
            p_bucket: `${action}:${digest}`,
            p_max_requests: limit,
            p_window_seconds: seconds,
          },
        }),
      );
    if (retryAfter === 0) return null;
    return Response.json(
      { error: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfter),
          "Cache-Control": "no-store",
        },
      },
    );
  } catch {
    return protectionUnavailable();
  }
}
