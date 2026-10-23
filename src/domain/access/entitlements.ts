export const FREE_WORKOUT_ID = "foundation-strength";
export type SubscriptionStatus =
  | "free"
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "unpaid"
  | "incomplete"
  | "incomplete_expired"
  | "paused";
export interface Subscription {
  status: SubscriptionStatus;
  expiresAt: string | null;
  cancelAtPeriodEnd: boolean;
}
export function hasEntitlement(
  user: { role: "user" | "admin" } | null,
  subscription: Subscription | null,
  entitlement: "pro",
  now = Date.now(),
): boolean {
  if (!user || entitlement !== "pro") return false;
  if (user.role === "admin") return true;
  return (
    !!subscription &&
    (subscription.status === "active" ||
      subscription.status === "trialing" ||
      (subscription.status === "canceled" && subscription.cancelAtPeriodEnd)) &&
    subscription.expiresAt !== null &&
    Date.parse(subscription.expiresAt) > now
  );
}
