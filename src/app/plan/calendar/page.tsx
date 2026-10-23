import { ProGate } from "@/components/membership/pro-gate";
import type { Metadata } from "next";

import { TrainingPlanDashboard } from "@/components/plan/training-plan-dashboard";

export const metadata: Metadata = {
  title: "Full training calendar | Axyro",
  description:
    "Manage the complete 60-day calendar, matches, and planned sessions.",
};

export default function TrainingPlanCalendarPage() {
  return (
    <ProGate returnTo="/plan/calendar">
      <TrainingPlanDashboard view="workspace" />
    </ProGate>
  );
}
