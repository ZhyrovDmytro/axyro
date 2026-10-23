"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";

type FilterOption = {
  label: string;
  value: string;
};

type ExerciseFilterValues = {
  query: string;
  area: string;
};

type ExerciseFiltersProps = {
  values: ExerciseFilterValues;
  bodyAreas: readonly FilterOption[];
};

type FilterKey = keyof ExerciseFilterValues;

export function ExerciseFilters({ values, bodyAreas }: ExerciseFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(values.query);
  const [previousQuery, setPreviousQuery] = useState(values.query);
  const [isPending, startTransition] = useTransition();
  const didMount = useRef(false);

  // Keep URL navigation and resets from reapplying a stale search draft.
  if (previousQuery !== values.query) {
    setPreviousQuery(values.query);
    setSearch(values.query);
  }

  const updateFilters = useCallback(
    (updates: Partial<Record<FilterKey, string>>) => {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("page");
      params.delete("sport");
      params.delete("difficulty");
      params.delete("equipment");
      params.delete("role");
      params.delete("quality");
      for (const [name, value] of Object.entries(updates)) {
        if (value) params.set(name === "query" ? "q" : name, value);
        else params.delete(name === "query" ? "q" : name);
      }
      const query = params.toString();
      startTransition(() => {
        router.replace(query ? `${pathname}?${query}` : pathname, {
          scroll: false,
        });
      });
    },
    [pathname, router, searchParams],
  );

  useEffect(() => {
    if (!didMount.current) {
      didMount.current = true;
      return;
    }
    const timeout = window.setTimeout(() => {
      if (search !== values.query) updateFilters({ query: search.trim() });
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [search, updateFilters, values.query]);

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    updateFilters({ query: search.trim() });
  }

  return (
    <form
      className="exercise-filter-panel"
      onSubmit={submitSearch}
      role="search"
      aria-label="Exercise filters"
    >
      {(search || values.area) && (
        <div className="exercise-filter-panel__heading">
          <button
            className="text-button"
            type="button"
            onClick={() => {
              setSearch("");
              updateFilters({ query: "", area: "" });
            }}
          >
            Reset filters
          </button>
        </div>
      )}
      <label className="exercise-search-field">
        <span>Search exercises</span>
        <input
          name="q"
          type="search"
          placeholder="Try “shoulder”"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </label>
      <button className="sr-only" type="submit">
        Search exercises
      </button>

      <fieldset className="filter-chip-group">
        <legend>Body area</legend>
        <div className="filter-chip-row">
          {[{ value: "", label: "All areas" }, ...bodyAreas].map((option) => (
            <button
              aria-pressed={values.area === option.value}
              className="filter-chip"
              key={option.value || "all-areas"}
              onClick={() => updateFilters({ area: option.value })}
              type="button"
            >
              {option.label}
            </button>
          ))}
        </div>
      </fieldset>

      <span className="filter-update-status" aria-live="polite">
        {isPending ? "Updating exercises…" : ""}
      </span>
    </form>
  );
}
