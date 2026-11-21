import { HomeDashboard } from "@/components/home/home-dashboard";
import { HomeEntry } from "@/components/home/home-entry";
import { publicMetadata } from "@/lib/publishing";

export const metadata = publicMetadata(
  "/",
  "Axyro — Train for your next padel point",
  "Prepare for padel with a personalized 60-day Pro plan, guided home workouts and an exercise library. Adjust training around matches and make each session your own.",
);

export default function HomePage() {
  return <HomeEntry dashboard={<HomeDashboard />} />;
}
