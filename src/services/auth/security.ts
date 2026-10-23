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
export function assertSameOrigin(request: Request): void {
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin)
    throw new Error("Origin not allowed");
}
