import { requireProPage } from "@/services/auth/guards";
import { PlannedWorkoutLauncher } from "@/components/plan/planned-workout-launcher";

type PageProps = {
  params: Promise<{ sessionId: string }>;
  searchParams: Promise<{ intensity?: string | string[] }>;
};

export default async function PlannedWorkoutStartPage({
  params,
  searchParams,
}: PageProps) {
  const { sessionId } = await params;
  const query = await searchParams;
  const continuation = new URLSearchParams();
  const effort =
    typeof query.intensity === "string"
      ? query.intensity
      : query.intensity?.[0];
  if (effort) continuation.set("intensity", effort);
  await requireProPage(
    `/plan/workouts/${encodeURIComponent(sessionId)}/start${continuation.size ? `?${continuation}` : ""}`,
  );
  return (
    <PlannedWorkoutLauncher
      intensityQuery={query.intensity}
      sessionId={sessionId}
    />
  );
}
