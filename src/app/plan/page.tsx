import { ProGate } from "@/components/membership/pro-gate";
import type { Metadata } from "next";

import { TrainingPlanDashboard } from "@/components/plan/training-plan-dashboard";

export const metadata: Metadata = {
  title: "Your training plan | Axyro",
  description:
    "A personalized 60-day training schedule built around your life.",
};

export default function TrainingPlanPage() {
  return (
    <ProGate returnTo="/plan">
      <TrainingPlanDashboard />
    </ProGate>
  );
}
