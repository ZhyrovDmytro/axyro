"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";

import { ExerciseCard } from "@/components/exercise-card";
import { ExerciseFilters } from "@/components/exercise-filters";
import { UiIcon } from "@/components/ui-icon";
import { publishedExercises as exercises } from "@/content/exercises";
import { bodyAreaSchema } from "@/domain/exercise/exercise.schema";
import { titleCase } from "@/lib/format";
import {
  FREE_LIBRARY_LIMIT,
  GUEST_LIBRARY_LIMIT,
  librarySelection,
} from "@/lib/library-access";
import { useAuth } from "@/components/auth/auth-provider";
import { useEntitlement } from "@/components/membership/entitlement-provider";
import { LibraryInvitation } from "@/components/membership/library-invitation";

const exercisesPerPage = 18;
const catalog = librarySelection(exercises, true);
const bodyAreas = [
  ...new Set(exercises.flatMap((exercise) => exercise.bodyAreas)),
];

export function ExerciseLibrary() {
  const params = useSearchParams();
  const { user: session } = useAuth();
  const { hasPro } = useEntitlement();
  const search = params.get("q") ?? "";
  const query = search.trim().toLocaleLowerCase();
  const area = bodyAreaSchema.safeParse(params.get("area")).data;
  const showingFullCatalog = Boolean(session);
  const exerciseRows = session
    ? catalog
    : catalog.slice(0, GUEST_LIBRARY_LIMIT);

  const filteredExercises = exerciseRows.filter((exercise) => {
    const textMatch =
      !query ||
      (exercise.name + " " + exercise.shortDescription)
        .toLocaleLowerCase()
        .includes(query);
    const areaMatch = !area || exercise.bodyAreas.includes(area);

    return textMatch && areaMatch;
  });

  const requestedPage = Number.parseInt(params.get("page") ?? "", 10);
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
    params.forEach((scalar, key) => {
      if (scalar && key !== "page" && (key === "q" || key === "area")) {
        next.set(key, scalar);
      }
    });
    if (page > 1) next.set("page", String(page));
    const queryString = next.toString();
    return `/exercises${queryString ? `?${queryString}` : ""}`;
  };

  return (
    <>
      <ExerciseFilters
        values={{
          query: search,
          area: area ?? "",
        }}
        bodyAreas={bodyAreas.map((option) => ({
          value: option,
          label: titleCase(option),
        }))}
      />

      {!hasPro && (
        <p className="library-preview-note">
          {session
            ? `${FREE_LIBRARY_LIMIT} free guides · ${exercises.length} exercises with Pro.`
            : `Showing ${GUEST_LIBRARY_LIMIT} of ${exercises.length} exercises. Sign in to browse the full library.`}
        </p>
      )}
      <section aria-labelledby="exercise-results-heading">
        <div className="section-heading section-heading--compact">
          <h2 id="exercise-results-heading">Exercises</h2>
          <span className="result-count" role="status">
            {filteredExercises.length} result
            {filteredExercises.length === 1 ? "" : "s"}
            {!showingFullCatalog && " in the preview"}
          </span>
        </div>
        {filteredExercises.length ? (
          <div className="exercise-grid">
            {visibleExercises.map((exercise) => (
              <ExerciseCard exercise={exercise} key={exercise.id} />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <h2>
              {showingFullCatalog
                ? "No exercises found"
                : "No preview exercises match"}
            </h2>
            <p>
              {showingFullCatalog
                ? "Try clearing one or more filters."
                : `Search covers the ${GUEST_LIBRARY_LIMIT} preview exercises. Sign in to browse all ${exercises.length}.`}
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
    </>
  );
}
