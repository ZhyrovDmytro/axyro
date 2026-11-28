import { PaywallLink } from "@/components/membership/paywall-modal";
import { SavedCustomWorkouts } from "@/components/workout/saved-custom-workouts";
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
    <main className="page-shell section-page workout-library-page">
      <header className="page-intro workout-library-intro">
        <h1 className="section-title">Find your workout.</h1>
        <PaywallLink
          className="button button--primary"
          context="workout"
          href="/workouts/custom/new"
          returnTo="/workouts/custom/new"
        >
          Add workout
        </PaywallLink>
      </header>

      <SavedCustomWorkouts />
      <WorkoutLibrary workouts={workouts} showCategories={false} />
    </main>
  );
}
