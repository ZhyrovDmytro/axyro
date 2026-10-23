import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { safeNext } from "@/services/auth/security";
import { setProviderSession, supabaseRequest } from "@/services/auth/server";
export async function GET(request: Request) {
  const url = new URL(request.url);
  const jar = await cookies();
  const code = url.searchParams.get("code");
  const verifier = jar.get("axyro-pkce")?.value;
  const next = safeNext(jar.get("axyro-auth-next")?.value ?? null);
  jar.delete("axyro-pkce");
  jar.delete("axyro-auth-next");
  if (!code || !verifier || url.searchParams.has("error"))
    return NextResponse.redirect(new URL("/signin?error=callback", url));
  try {
    await setProviderSession(
      await supabaseRequest("/auth/v1/token?grant_type=pkce", {
        method: "POST",
        body: { auth_code: code, code_verifier: verifier },
      }),
    );
    if (next === "/reset-password")
      jar.set("axyro-password-recovery", "1", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 600,
      });
    return NextResponse.redirect(new URL(next, url));
  } catch {
    return NextResponse.redirect(new URL("/signin?error=callback", url));
  }
}
