import { CustomWorkoutRoute } from "@/components/workout/custom-workouts";
import { requireProPage } from "@/services/auth/guards";

export default async function CustomWorkoutPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireProPage(`/workouts/custom/${encodeURIComponent(id)}`, "workout");
  return <CustomWorkoutRoute id={id} />;
}
