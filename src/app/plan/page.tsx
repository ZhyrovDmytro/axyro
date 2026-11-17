import type { Metadata } from "next";

import { PlanPageAccess } from "@/components/plan/plan-page-access";

export const metadata: Metadata = {
  title: "Your training plan | Axyro",
  description:
    "A personalized 60-day training schedule built around your life.",
};

export default function TrainingPlanPage() {
  return <PlanPageAccess />;
}
