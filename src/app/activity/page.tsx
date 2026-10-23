import { ProGate } from "@/components/membership/pro-gate";
import type { Metadata } from "next";

import { ActivityHistory } from "@/components/activity/activity-history";

export const metadata: Metadata = {
  title: "Activity | Axyro",
};

export default function ActivityPage() {
  return (
    <ProGate context="progress" returnTo="/activity">
      <ActivityHistory />
    </ProGate>
  );
}
