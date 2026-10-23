import { ProGate } from "@/components/membership/pro-gate";
import { ActivityDetail } from "@/components/activity/activity-detail";

type PageProps = {
  params: Promise<{ activityId: string }>;
};

export default async function ActivityDetailPage({ params }: PageProps) {
  const { activityId } = await params;
  return (
    <ProGate context="progress" returnTo="/activity">
      <ActivityDetail activityId={decodeURIComponent(activityId)} />
    </ProGate>
  );
}
