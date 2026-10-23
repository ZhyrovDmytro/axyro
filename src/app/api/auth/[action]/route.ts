import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  authConfigured,
  beginPkce,
  clearSession,
  getAuthSession,
  setDevelopmentSession,
  setProviderSession,
  supabaseRequest,
  supabaseUrl,
  assertSameOrigin,
} from "@/services/auth/server";
import { developmentAdminEnabled, safeNext } from "@/services/auth/security";

const password = z.string().min(10).max(128);
const email = z.string().email().max(254);
const credentials = z.object({
  email: z.string().min(1).max(254),
  password: z.string().min(1).max(128),
});
const registration = z
  .object({
    email,
    password,
    displayName: z.string().trim().min(1).max(100),
    confirmPassword: z.string(),
    next: z.string().optional(),
  })
  .refine((value) => value.password === value.confirmPassword);
const passwordChange = z
  .object({
    password,
    confirmPassword: z.string(),
    currentPassword: z.string().optional(),
  })
  .refine((value) => value.password === value.confirmPassword);
function json(value: unknown, status = 200) {
  return NextResponse.json(value, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function GET(
  request: Request,
  context: { params: Promise<{ action: string }> },
) {
  const { action } = await context.params;
  if (action === "refresh") {
    const next = safeNext(new URL(request.url).searchParams.get("next"));
    const session = await getAuthSession();
    return NextResponse.redirect(
      new URL(
        session ? next : `/signin?next=${encodeURIComponent(next)}`,
        request.url,
      ),
    );
  }
  if (action === "session") {
    const session = await getAuthSession();
    return json({
      user: session?.user ?? null,
      configured: authConfigured(),
      developmentAdminEnabled: developmentAdminEnabled(),
    });
  }
  if (action === "oauth") {
    try {
      const url = new URL(request.url);
      if (url.searchParams.get("provider") !== "google")
        return json({ error: "Unsupported provider" }, 400);
      const next = safeNext(url.searchParams.get("next"));
      const challenge = await beginPkce(next);
      const authorize = new URL("/auth/v1/authorize", supabaseUrl());
      authorize.search = new URLSearchParams({
        provider: "google",
        redirect_to: `${url.origin}/auth/callback`,
        code_challenge: challenge,
        code_challenge_method: "s256",
      }).toString();
      return NextResponse.redirect(authorize);
    } catch {
      return NextResponse.redirect(
        new URL("/signin?error=configuration", request.url),
      );
    }
  }
  return json({ error: "Not found" }, 404);
}

export async function POST(
  request: Request,
  context: { params: Promise<{ action: string }> },
) {
  try {
    assertSameOrigin(request);
  } catch {
    return json({ error: "Request origin is not allowed" }, 403);
  }
  if (Number(request.headers.get("content-length") ?? 0) > 16384)
    return json({ error: "Request too large" }, 413);
  const { action } = await context.params;
  try {
    const body: unknown = await request.json().catch(() => ({}));
    if (action === "signin") {
      const input = credentials.parse(body);
      if (
        input.email === "admin" &&
        input.password === "admin" &&
        developmentAdminEnabled()
      ) {
        await setDevelopmentSession();
        return json({ user: (await getAuthSession())?.user });
      }
      email.parse(input.email);
      await setProviderSession(
        await supabaseRequest("/auth/v1/token?grant_type=password", {
          method: "POST",
          body: input,
        }),
      );
      return json({ user: (await getAuthSession())?.user });
    }
    if (action === "signup") {
      const input = registration.parse(body);
      const challenge = await beginPkce(
        safeNext(input.next ?? null, "/plan/setup"),
      );
      const result = await supabaseRequest(
        `/auth/v1/signup?redirect_to=${encodeURIComponent(`${new URL(request.url).origin}/auth/callback`)}`,
        {
          method: "POST",
          body: {
            email: input.email,
            password: input.password,
            data: { full_name: input.displayName },
            code_challenge: challenge,
            code_challenge_method: "s256",
          },
        },
      );
      const tokens = z.object({ access_token: z.string() }).safeParse(result);
      if (tokens.success) await setProviderSession(result);
      return json({
        user: tokens.success ? (await getAuthSession())?.user : null,
        requiresVerification: !tokens.success,
      });
    }
    if (action === "recover") {
      const input = z.object({ email }).parse(body);
      const challenge = await beginPkce("/reset-password");
      // Always return the same response; never reveal whether an address exists.
      await supabaseRequest(
        `/auth/v1/recover?redirect_to=${encodeURIComponent(`${new URL(request.url).origin}/auth/callback`)}`,
        {
          method: "POST",
          body: {
            email: input.email,
            code_challenge: challenge,
            code_challenge_method: "s256",
          },
        },
      ).catch(() => null);
      return json({
        message:
          "If an account exists, a password reset email has been sent. Open it in this browser.",
      });
    }
    const session = await getAuthSession();
    if (action === "logout") {
      if (session?.accessToken)
        await supabaseRequest("/auth/v1/logout", {
          method: "POST",
          token: session.accessToken,
        }).catch(() => null);
      await clearSession();
      return json({ ok: true });
    }
    if (!session) return json({ error: "Sign in to continue" }, 401);
    if (action === "password") {
      const input = passwordChange.parse(body);
      if (
        session.user.isDevelopmentAdmin ||
        !session.user.providers.includes("email")
      )
        return json(
          { error: "Manage credentials with your sign-in provider" },
          400,
        );
      const jar = await cookies();
      if (
        !input.currentPassword &&
        jar.get("axyro-password-recovery")?.value !== "1"
      )
        return json({ error: "Enter your current password." }, 422);
      if (input.currentPassword)
        await supabaseRequest("/auth/v1/token?grant_type=password", {
          method: "POST",
          body: { email: session.user.email, password: input.currentPassword },
        });
      await supabaseRequest("/auth/v1/user", {
        method: "PUT",
        token: session.accessToken,
        body: { password: input.password },
      });
      jar.delete("axyro-password-recovery");
      return json({ ok: true });
    }
    if (action === "profile") {
      const input = z
        .object({ displayName: z.string().trim().min(1).max(100) })
        .parse(body);
      if (session.user.isDevelopmentAdmin)
        return json({ error: "Development account profile is fixed" }, 400);
      await supabaseRequest(`/rest/v1/profiles?user_id=eq.${session.user.id}`, {
        method: "PATCH",
        token: session.accessToken,
        body: {
          display_name: input.displayName,
          updated_at: new Date().toISOString(),
        },
      });
      return json({ user: (await getAuthSession())?.user });
    }
    if (action === "delete") {
      z.object({ confirmation: z.literal("DELETE") }).parse(body);
      if (!session.user.isDevelopmentAdmin) {
        const { cancelBillingForUser } =
          await import("@/services/billing/server");
        await cancelBillingForUser(session.user.id);
        await supabaseRequest(`/auth/v1/admin/users/${session.user.id}`, {
          method: "DELETE",
          admin: true,
        });
      }
      await clearSession();
      return json({ ok: true });
    }
    return json({ error: "Not found" }, 404);
  } catch (error) {
    if (error instanceof z.ZodError)
      return json(
        {
          error:
            "Check the form. Use a valid email and a password of at least 10 characters; confirmation must match.",
        },
        422,
      );
    return json(
      {
        error: authConfigured()
          ? "Unable to complete this request. Check your details and try again."
          : "Account services are not configured yet.",
      },
      400,
    );
  }
}
