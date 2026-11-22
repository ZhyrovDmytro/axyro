import { HomeDashboard } from "@/components/home/home-dashboard";
import { HomeEntry } from "@/components/home/home-entry";
import { publicMetadata } from "@/lib/publishing";

export const metadata = publicMetadata(
  "/",
  "Axyro — Train for your next padel point",
  "Train the footwork, strength and mobility behind your padel shots with guided home workouts. Fit training and recovery around your match days.",
);

export default function HomePage() {
  return <HomeEntry dashboard={<HomeDashboard />} />;
}
