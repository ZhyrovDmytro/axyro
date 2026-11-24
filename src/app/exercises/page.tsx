import { publicMetadata } from "@/lib/publishing";
import { Suspense } from "react";
import { ExerciseLibrary } from "@/components/exercise-library";

export const metadata = publicMetadata(
  "/exercises",
  "Exercises | Axyro",
  "Browse home exercise instructions, technique cues, and equipment.",
);

export default function ExercisesPage() {
  return (
    <main className="page-shell section-page exercise-library-page">
      <header className="page-intro">
        <h1 className="section-title">Exercise library.</h1>
        <p>Movement demos and technique cues.</p>
      </header>
      <Suspense>
        <ExerciseLibrary />
      </Suspense>
    </main>
  );
}
