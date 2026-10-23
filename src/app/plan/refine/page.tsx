import type { Metadata } from "next";

import { PlanOnboarding } from "@/components/plan/plan-onboarding";

export const metadata: Metadata = {
  title: "Refine your training plan | Axyro",
  description:
    "Optionally tune your padel plan around movement priorities and matches.",
};

export default function RefinePlanPage() {
  return <PlanOnboarding mode="refine" />;
}
