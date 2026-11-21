import { publicMetadata } from "@/lib/publishing";

import { WorkoutLibrary } from "@/components/workout/workout-library";
import { starterWorkouts as workouts } from "@/content/workouts";

export const metadata = publicMetadata(
  "/workouts",
  "Quick-start workouts | Axyro",
  "Start a short, basic guided workout without creating a plan.",
);

export default function WorkoutsPage() {
  return (
    <main className="page-shell page-shell--inner workout-library-page">
      <header className="page-intro">
        <h1>Find your workout.</h1>
        <p>
          Choose a focus. Train for 5, 10 or 20 minutes, including recovery. Ten
          is the default.
        </p>
      </header>

      <WorkoutLibrary workouts={workouts} showCategories={false} />
    </main>
  );
}
