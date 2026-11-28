import { trainingTagline } from "@/lib/brand-copy";
import { HomeDashboard } from "@/components/home/home-dashboard";
import { HomeEntry } from "@/components/home/home-entry";
import { publicMetadata } from "@/lib/publishing";

export const metadata = publicMetadata(
  "/",
  "Axyro — Train for your next padel point",
  trainingTagline,
);

export default function HomePage() {
  return <HomeEntry dashboard={<HomeDashboard />} />;
}
