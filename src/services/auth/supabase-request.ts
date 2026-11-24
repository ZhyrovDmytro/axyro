import { developmentAdminEnabled } from "./security";

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
    timeoutMs?: number;
  } = {},
): Promise<unknown> {
  const key = options.admin
    ? process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
    : process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!key) throw new Error("Authentication is not configured");
  // Modern API keys identify the app via apikey; only user/legacy JWTs are bearers.
  const bearer = options.token ?? (key.startsWith("sb_") ? undefined : key);
  const response = await fetch(`${supabaseUrl()}/${path.replace(/^\//, "")}`, {
    method: options.method ?? "GET",
    cache: "no-store",
    signal: AbortSignal.timeout(options.timeoutMs ?? 15000),
    headers: {
      apikey: key,
      ...(bearer !== undefined ? { Authorization: `Bearer ${bearer}` } : {}),
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
