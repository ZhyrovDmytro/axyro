import type { Metadata } from "next";
import { ProGate } from "@/components/membership/pro-gate";
import { PlanAdjustment } from "@/components/plan/plan-adjustment";

export const metadata: Metadata = {
  title: "Adjust your training plan | Axyro",
  description: "Adjust the upcoming workouts in your current training block.",
};

export default async function RefinePlanPage({
  searchParams,
}: {
  searchParams: Promise<{ change?: string }>;
}) {
  const { change } = await searchParams;
  return (
    <ProGate
      returnTo={
        change === "duration" ? "/plan/refine?change=duration" : "/plan/refine"
      }
    >
      <PlanAdjustment initialDuration={change === "duration"} />
    </ProGate>
  );
}
