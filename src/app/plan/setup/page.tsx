import { ProGate } from "@/components/membership/pro-gate";
import type { Metadata } from "next";

import { PlanOnboarding } from "@/components/plan/plan-onboarding";

export const metadata: Metadata = {
  title: "Build your training plan | Axyro",
  description:
    "Create a personalized 60-day training schedule around your goals and availability.",
};

export default function PlanSetupPage() {
  return (
    <ProGate requirePro={false} returnTo="/plan/setup">
      <PlanOnboarding />
    </ProGate>
  );
}
