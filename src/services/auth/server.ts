import { cookies } from "next/headers";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import type { AuthSession, AuthUser } from "./types";
import { developmentAdminEnabled } from "./security";
export { assertSameOrigin } from "./security";

const ACCESS = "axyro-access";
const REFRESH = "axyro-refresh";
const DEV = "axyro-development-session";
// Process-local randomness intentionally invalidates development sessions on server restart.
const developmentGlobal = globalThis as typeof globalThis & {
  __axyroDevelopmentSessionSecret?: Buffer;
};
const developmentSecret = (developmentGlobal.__axyroDevelopmentSessionSecret ??=
  randomBytes(32));
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};
const providerUserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().optional(),
  user_metadata: z.record(z.string(), z.unknown()).optional(),
  app_metadata: z
    .object({ providers: z.array(z.string()).optional() })
    .passthrough()
    .optional(),
});
const tokensSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  expires_in: z.number().optional(),
});
export function authConfigured() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY);
}
export function supabaseUrl() {
  const value = process.env.SUPABASE_URL;
  if (!value) throw new Error("Authentication is not configured");
  const url = new URL(value);
  if (
    url.protocol !== "https:" &&
    !(
      developmentAdminEnabled() &&
      ["localhost", "127.0.0.1"].includes(url.hostname)
    )
  )
    throw new Error("Invalid authentication URL");
  return url.origin;
}
export async function supabaseRequest(
  path: string,
  options: {
    method?: string;
    body?: unknown;
    token?: string;
    admin?: boolean;
    prefer?: string;
  } = {},
): Promise<unknown> {
  const key = options.admin
    ? process.env.SUPABASE_SERVICE_ROLE_KEY
    : process.env.SUPABASE_ANON_KEY;
  if (!key) throw new Error("Authentication is not configured");
  const response = await fetch(`${supabaseUrl()}/${path.replace(/^\//, "")}`, {
    method: options.method ?? "GET",
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
    headers: {
      apikey: key,
      Authorization: `Bearer ${options.token ?? key}`,
      "Content-Type": "application/json",
      Prefer:
        options.prefer ?? "return=representation,resolution=merge-duplicates",
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  if (!response.ok) throw new Error("Authentication request failed");
  return response.status === 204 ||
    response.headers.get("content-length") === "0"
    ? null
    : response.json().catch(() => null);
}
export async function setProviderSession(value: unknown) {
  const tokens = tokensSchema.parse(value);
  const jar = await cookies();
  jar.delete(DEV);
  jar.delete("axyro-password-recovery");
  // Keep access token available long enough to refresh expired sessions on the server.
  jar.set(ACCESS, tokens.access_token, {
    ...cookieOptions,
    maxAge: 60 * 60 * 24 * 30,
  });
  jar.set(REFRESH, tokens.refresh_token, {
    ...cookieOptions,
    maxAge: 60 * 60 * 24 * 30,
  });
}
export async function clearSession() {
  const jar = await cookies();
  for (const name of [
    ACCESS,
    REFRESH,
    DEV,
    "axyro-pkce",
    "axyro-auth-next",
    "axyro-password-recovery",
  ])
    jar.delete(name);
}
export async function setDevelopmentSession() {
  if (!developmentAdminEnabled()) throw new Error("Invalid credentials");
  const payload = Buffer.from(
    JSON.stringify({ expires: Date.now() + 8 * 60 * 60 * 1000 }),
  ).toString("base64url");
  const signature = createHmac("sha256", developmentSecret)
    .update(payload)
    .digest("base64url");
  await clearSession();
  (await cookies()).set(DEV, `${payload}.${signature}`, {
    ...cookieOptions,
    maxAge: 8 * 60 * 60,
  });
}
function validDevelopmentCookie(value: string) {
  if (!developmentAdminEnabled()) return false;
  try {
    const [payload, signature] = value.split(".");
    const expected = createHmac("sha256", developmentSecret)
      .update(payload)
      .digest();
    const actual = Buffer.from(signature, "base64url");
    return (
      actual.length === expected.length &&
      timingSafeEqual(actual, expected) &&
      z
        .object({ expires: z.number() })
        .parse(JSON.parse(Buffer.from(payload, "base64url").toString()))
        .expires > Date.now()
    );
  } catch {
    return false;
  }
}
async function userFromToken(token: string): Promise<AuthUser> {
  const identity = providerUserSchema.parse(
    await supabaseRequest("/auth/v1/user", { token }),
  );
  const profiles = z
    .array(
      z.object({
        display_name: z.string(),
        avatar_url: z.string().nullable(),
        role: z.enum(["user", "admin"]),
      }),
    )
    .parse(
      await supabaseRequest(
        `/rest/v1/profiles?user_id=eq.${identity.id}&select=display_name,avatar_url,role`,
        { token },
      ),
    );
  const profile = profiles[0];
  return {
    id: identity.id,
    email: identity.email ?? "",
    displayName:
      profile?.display_name ?? String(identity.user_metadata?.full_name ?? ""),
    avatarUrl: profile?.avatar_url ?? null,
    role: profile?.role ?? "user",
    providers: identity.app_metadata?.providers ?? ["email"],
    isDevelopmentAdmin: false,
  };
}
export async function getAuthSession(
  options: { refresh?: boolean } = {},
): Promise<AuthSession | null> {
  const jar = await cookies();
  const developmentCookie = jar.get(DEV)?.value;
  if (developmentCookie && validDevelopmentCookie(developmentCookie))
    return {
      user: {
        id: "development-admin",
        email: "admin@localhost",
        displayName: "Development Admin",
        avatarUrl: null,
        role: "admin",
        providers: ["development"],
        isDevelopmentAdmin: true,
      },
      accessToken: "",
    };
  const token = jar.get(ACCESS)?.value;
  if (!token || !authConfigured()) return null;
  try {
    return { user: await userFromToken(token), accessToken: token };
  } catch {
    if (options.refresh === false) return null;
    const refresh = jar.get(REFRESH)?.value;
    if (!refresh) return null;
    try {
      const tokens = tokensSchema.parse(
        await supabaseRequest("/auth/v1/token?grant_type=refresh_token", {
          method: "POST",
          body: { refresh_token: refresh },
        }),
      );
      await setProviderSession(tokens);
      return {
        user: await userFromToken(tokens.access_token),
        accessToken: tokens.access_token,
      };
    } catch {
      return null;
    }
  }
}
export async function beginPkce(next: string) {
  const verifier = randomBytes(48).toString("base64url");
  const { createHash } = await import("node:crypto");
  const jar = await cookies();
  jar.set("axyro-pkce", verifier, { ...cookieOptions, maxAge: 600 });
  jar.set("axyro-auth-next", next, { ...cookieOptions, maxAge: 600 });
  return createHash("sha256").update(verifier).digest("base64url");
}
