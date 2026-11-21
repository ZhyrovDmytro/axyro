import type { Metadata } from "next";
import { Suspense } from "react";
import { ExerciseLibrary } from "@/components/exercise-library";

export const metadata: Metadata = {
  title: "Exercises | Axyro",
  description:
    "Browse home exercise instructions, technique cues, and equipment.",
};

export default function ExercisesPage() {
  return (
    <main className="page-shell page-shell--inner exercise-library-page">
      <header className="page-intro">
        <h1>Exercise library.</h1>
        <p>Movement demos and technique cues.</p>
      </header>
      <Suspense>
        <ExerciseLibrary />
      </Suspense>
    </main>
  );
}
