import type { MetadataRoute } from "next";
import { starterWorkouts } from "@/content/workouts";
import { publicOrigin } from "@/lib/publishing";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    "/",
    "/workouts",
    "/exercises",
    "/help",
    "/terms",
    "/privacy",
    ...starterWorkouts.map(({ slug }) => `/workouts/${slug}`),
  ].map((path) => ({ url: new URL(path, publicOrigin).href }));
}
