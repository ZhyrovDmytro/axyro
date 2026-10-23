import { requireProPage } from "@/services/auth/guards";
import { PlannedWorkoutEditor } from "@/components/plan/planned-workout-editor";

type PageProps = { params: Promise<{ sessionId: string }> };

export default async function PlannedWorkoutEditPage({ params }: PageProps) {
  const { sessionId } = await params;
  await requireProPage(`/plan/workouts/${encodeURIComponent(sessionId)}/edit`);
  return <PlannedWorkoutEditor sessionId={sessionId} />;
}
