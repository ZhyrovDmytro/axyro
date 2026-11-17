"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { useEntitlement } from "@/components/membership/entitlement-provider";
import { usePaywallModal } from "@/components/membership/paywall-modal";
import { ProGate } from "@/components/membership/pro-gate";
import { createBrowserPlanPreviewRepository } from "@/services/persistence/session-plan-preview-repository";
import { TrainingPlanDashboard } from "./training-plan-dashboard";

export function PlanPageAccess() {
  const { user } = useAuth();
  const { hasPro, loading } = useEntitlement();
  const [preview] = useState(() =>
    user ? createBrowserPlanPreviewRepository(user.id).load() : null,
  );
  if (!user || hasPro || !preview || loading) {
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
      <LockedPlanPaywall />
    </>
  );
}

function LockedPlanPaywall() {
  const open = usePaywallModal();
  useEffect(() => {
    open({
      context: "plan",
      returnTo: "/plan/setup?resume=1",
      planCreated: true,
    });
  }, [open]);
  return null;
}
