import type { Metadata } from "next";

import { PlanPageAccess } from "@/components/plan/plan-page-access";

export const metadata: Metadata = {
  title: "Your training plan | Axyro",
  description:
    "A personalized 60-day training schedule built around your life.",
};

export default async function TrainingPlanPage({
  searchParams,
}: {
  searchParams: Promise<{
    adjusted?: string;
    count?: string;
    temporary?: string;
  }>;
}) {
  const { adjusted, count, temporary } = await searchParams;
  const adjustmentNotice =
    typeof adjusted === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(adjusted) &&
    count !== undefined
      ? {
          date: adjusted,
          count: Math.min(60, Math.max(0, Number(count) || 0)),
          temporary: temporary === "1",
        }
      : undefined;
  return <PlanPageAccess adjustmentNotice={adjustmentNotice} />;
}
