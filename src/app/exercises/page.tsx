import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { ExerciseCard } from "@/components/exercise-card";
import { ExerciseFilters } from "@/components/exercise-filters";
import { UiIcon } from "@/components/ui-icon";
import { publishedExercises as exercises } from "@/content/exercises";
import { bodyAreaSchema } from "@/domain/exercise/exercise.schema";
import { titleCase } from "@/lib/format";
import { FREE_LIBRARY_LIMIT, librarySelection } from "@/lib/library-access";
import { getAuthSession } from "@/services/auth/server";
import { getBillingAccess } from "@/services/billing/server";
import { LibraryInvitation } from "@/components/membership/library-invitation";

export const metadata: Metadata = {
  title: "Exercises | Axyro",
  description:
    "Browse home exercise instructions, technique cues, and equipment.",
};

type SearchValue = string | string[] | undefined;
type ExerciseSearchParams = {
  q?: SearchValue;
  area?: SearchValue;
  page?: SearchValue;
};

const exercisesPerPage = 18;

function first(value: SearchValue): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

export default async function ExercisesPage({
  searchParams,
}: {
  searchParams: Promise<ExerciseSearchParams>;
}) {
  const params = await searchParams;
  const query = first(params.q).trim().toLocaleLowerCase();
  const area = bodyAreaSchema.safeParse(first(params.area)).data;

  const session = await getAuthSession({ refresh: false });
  const hasPro = session ? (await getBillingAccess(session)).hasPro : false;
  const exerciseRows = librarySelection(exercises, hasPro).map((exercise) => ({
    exercise,
  }));
  const bodyAreas = [
    ...new Set(exercises.flatMap((exercise) => exercise.bodyAreas)),
  ];

  const filteredExercises = exerciseRows.filter(({ exercise }) => {
    const textMatch =
      !query ||
      (exercise.name + " " + exercise.shortDescription)
        .toLocaleLowerCase()
        .includes(query);
    const areaMatch = !area || exercise.bodyAreas.includes(area);

    return textMatch && areaMatch;
  });

  const requestedPage = Number.parseInt(first(params.page), 10);
  const pageCount = Math.max(
    1,
    Math.ceil(filteredExercises.length / exercisesPerPage),
  );
  const currentPage = Math.min(
    pageCount,
    Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1,
  );
  const visibleExercises = filteredExercises.slice(
    (currentPage - 1) * exercisesPerPage,
    currentPage * exercisesPerPage,
  );
  const pageHref = (page: number) => {
    const next = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      const scalar = first(value);
      if (scalar && key !== "page" && (key === "q" || key === "area")) {
        next.set(key, scalar);
      }
    });
    if (page > 1) next.set("page", String(page));
    const queryString = next.toString();
    return `/exercises${queryString ? `?${queryString}` : ""}`;
  };

  return (
    <main className="page-shell page-shell--inner exercise-library-page">
      <header className="page-intro">
        <h1>Exercise library.</h1>
        <p>Movement demos and technique cues.</p>
      </header>

      <Suspense
        fallback={
          <div className="exercise-filter-panel" aria-label="Exercise filters">
            Loading filters…
          </div>
        }
      >
        <ExerciseFilters
          values={{
            query: first(params.q),
            area: area ?? "",
          }}
          bodyAreas={bodyAreas.map((option) => ({
            value: option,
            label: titleCase(option),
          }))}
        />
      </Suspense>

      {!hasPro && (
        <p className="library-preview-note">
          {FREE_LIBRARY_LIMIT} free guides · {exercises.length} exercises with
          Pro.
        </p>
      )}
      <section aria-labelledby="exercise-results-heading">
        <div className="section-heading section-heading--compact">
          <h2 id="exercise-results-heading">Exercises</h2>
          <span className="result-count" role="status">
            {filteredExercises.length} result
            {filteredExercises.length === 1 ? "" : "s"}
            {!hasPro && " in the free preview"}
          </span>
        </div>
        {filteredExercises.length ? (
          <div className="exercise-grid">
            {visibleExercises.map(({ exercise }) => (
              <ExerciseCard exercise={exercise} key={exercise.id} />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <h2>
              {hasPro ? "No exercises found" : "No free-preview guides match"}
            </h2>
            <p>
              {hasPro
                ? "Try clearing one or more filters."
                : `Search covers the ${FREE_LIBRARY_LIMIT} free guides. Pro opens all ${exercises.length} exercises.`}
            </p>
            <Link className="text-link" href="/exercises">
              Clear all filters
            </Link>
          </div>
        )}
        {!hasPro && <LibraryInvitation total={exercises.length} />}
        {filteredExercises.length > exercisesPerPage && (
          <nav className="pagination" aria-label="Exercise result pages">
            {currentPage > 1 && (
              <Link
                className="button button--secondary"
                href={pageHref(currentPage - 1)}
              >
                <UiIcon name="arrow-left" /> Previous
              </Link>
            )}
            <span>
              Page {currentPage} of {pageCount}
            </span>
            {currentPage < pageCount && (
              <Link
                className="button button--secondary"
                href={pageHref(currentPage + 1)}
              >
                Next <UiIcon name="arrow-right" />
              </Link>
            )}
          </nav>
        )}
      </section>
    </main>
  );
}
