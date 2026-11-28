"use client";

import Link from "next/link";
import { useEntitlement } from "@/components/membership/entitlement-provider";
import { useCustomWorkouts } from "@/hooks/use-custom-workouts";

export function SavedCustomWorkouts() {
  const { hasPro } = useEntitlement();
  const { workouts } = useCustomWorkouts();
  if (!hasPro || !workouts.length) return null;

  return (
    <section
      className="custom-workout-list"
      aria-labelledby="custom-workouts-heading"
    >
      <div className="section-heading section-heading--compact">
        <h2 id="custom-workouts-heading">My workouts</h2>
      </div>
      <ul>
        {workouts.map(({ id, name, estimatedMinutes }) => (
          <li key={id}>
            <Link className="custom-workout-list__link" href={`/workouts/custom/${id}`}>
              <strong>{name}</strong>
              <span>{estimatedMinutes} min</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
