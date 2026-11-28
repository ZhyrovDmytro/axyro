import { CustomWorkoutRoute } from "@/components/workout/custom-workouts";
import { parseIntensityLevel } from "@/domain/workout/intensity";
import { requireProPage } from "@/services/auth/guards";

export default async function StartCustomWorkoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ intensity?: string | string[] }>;
}) {
  const { id } = await params;
  const { intensity } = await searchParams;
  const effort = parseIntensityLevel(intensity);
  await requireProPage(
    `/workouts/custom/${encodeURIComponent(id)}/start?intensity=${effort}`,
    "workout",
  );
  return <CustomWorkoutRoute id={id} intensityQuery={effort} start />;
}
