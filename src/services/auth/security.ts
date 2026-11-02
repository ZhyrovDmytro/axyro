export function developmentAdminEnabled(
  environment = process.env.NODE_ENV,
): boolean {
  return environment === "development" || environment === "test";
}
export function safeNext(value: string | null, fallback = "/"): string {
  return value &&
    value.startsWith("/") &&
    !value.startsWith("//") &&
    !/[\\\r\n]/.test(value)
    ? value
    : fallback;
}
export function applicationOrigin(request: Request): string {
  // Deployment proxies can expose an immutable deploy URL instead of the public origin.
  return !developmentAdminEnabled() && process.env.APP_URL
    ? new URL(process.env.APP_URL).origin
    : new URL(request.url).origin;
}
export function assertSameOrigin(request: Request): void {
  const origin = request.headers.get("origin");
  const target = new URL(request.url);
  if (origin === applicationOrigin(request)) return;
  if (origin && developmentAdminEnabled()) {
    const source = new URL(origin);
    const loopback = ["localhost", "127.0.0.1"];
    // Next dev can normalize the URL hostname; require the actual Host to match.
    if (
      loopback.includes(target.hostname) &&
      loopback.includes(source.hostname) &&
      source.protocol === target.protocol &&
      source.port === target.port &&
      source.host === request.headers.get("host")
    )
      return;
  }
  throw new Error("Origin not allowed");
}
