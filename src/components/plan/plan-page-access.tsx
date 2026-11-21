"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { useEntitlement } from "@/components/membership/entitlement-provider";
import { usePaywallModal } from "@/components/membership/paywall-modal";
import { ProGate } from "@/components/membership/pro-gate";
import { createBrowserPlanPreviewRepository } from "@/services/persistence/session-plan-preview-repository";
import { createBrowserTrainingPlanRepository } from "@/services/persistence/local-training-plan-repository";
import { getWorkoutTrainingTitle } from "@/domain/workout/training-title";
import { formatPlanDate } from "@/domain/training-plan/date";
import type { TrainingPlan } from "@/domain/training-plan/training-plan.types";
import { TrainingPlanDashboard } from "./training-plan-dashboard";

export function PlanPageAccess({
  adjustmentNotice,
}: {
  adjustmentNotice?: { date: string; count: number; temporary: boolean };
}) {
  const { user } = useAuth();
  const { hasPro, loading } = useEntitlement();
  const [preview] = useState(() =>
    user ? createBrowserPlanPreviewRepository(user.id).load() : null,
  );
  const [hasSavedPlan] = useState(() =>
    Boolean(user && createBrowserTrainingPlanRepository().load()),
  );
  if (!user || hasPro || (!preview && !hasSavedPlan)) {
    return (
      <TrainingPlanDashboard
        adjustmentNotice={hasPro ? adjustmentNotice : undefined}
      />
    );
  }
  if (!preview || loading) {
    return (
      <ProGate returnTo="/plan">
        <TrainingPlanDashboard />
      </ProGate>
    );
  }
  return (
    <>
      <div className="plan-preview" inert>
        <TrainingPlanDashboard previewPlan={preview} />
      </div>
      <LockedPlanPaywall plan={preview} />
    </>
  );
}

function LockedPlanPaywall({ plan }: { plan: TrainingPlan }) {
  const open = usePaywallModal();
  useEffect(() => {
    const first = plan.sessions.reduce<
      (typeof plan.sessions)[number] | undefined
    >(
      (earliest, session) =>
        !earliest || session.scheduledDate < earliest.scheduledDate
          ? session
          : earliest,
      undefined,
    );
    open({
      context: "plan",
      returnTo: "/plan/setup?resume=1",
      planCreated: true,
      preview: first
        ? {
            title: getWorkoutTrainingTitle(first.workout),
            date: formatPlanDate(first.scheduledDate),
            minutes: Math.round(first.estimatedDurationSeconds / 60),
            reason:
              plan.profile.padelLimitations.length ||
              plan.profile.developmentAreas.length
                ? first.workout.shortDescription
                : "Balanced training for the time and equipment you chose.",
          }
        : undefined,
    });
  }, [open, plan]);
  return null;
}
