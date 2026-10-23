import { HomeDashboard } from "@/components/home/home-dashboard";
import { HomeEntry } from "@/components/home/home-entry";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Axyro — Train for your next padel point",
  description:
    "Prepare for padel with a personalized 60-day Pro plan, guided home workouts and an exercise library. Adjust training around matches and make each session your own.",
};

export default function HomePage() {
  return <HomeEntry dashboard={<HomeDashboard />} />;
}
