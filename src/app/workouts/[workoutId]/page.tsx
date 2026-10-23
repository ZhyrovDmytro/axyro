import { WorkoutAccess } from "@/components/membership/workout-access";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { WorkoutConfigurator } from "@/components/workout/effort-options";
import { UiIcon } from "@/components/ui-icon";
import { publishedExercises } from "@/content/exercises";
import { starterWorkouts as workouts } from "@/content/workouts";
import { composeWorkoutForIntensity } from "@/domain/workout/intensity";
import { getWorkoutBySlug, getWorkoutExercises } from "@/lib/catalog";
import { formatDumbbellAvailability, titleCase } from "@/lib/format";

type WorkoutDetailProps = {
  params: Promise<{ workoutId: string }>;
};

export function generateStaticParams() {
  return workouts.map((workout) => ({ workoutId: workout.slug }));
}

export async function generateMetadata({
  params,
}: WorkoutDetailProps): Promise<Metadata> {
  const { workoutId } = await params;
  const workout = getWorkoutBySlug(workoutId);

  return workout
    ? {
        title: `${workout.name} | Axyro`,
        description: workout.shortDescription,
      }
    : {};
}

export default async function WorkoutDetailPage({
  params,
}: WorkoutDetailProps) {
  const { workoutId } = await params;
  const workout = getWorkoutBySlug(workoutId);

  if (!workout) notFound();

  const workoutExercises = getWorkoutExercises(workout);
  const compositionExercises = getWorkoutExercises(
    composeWorkoutForIntensity(workout, publishedExercises, "challenging"),
  );
  const equipment = [
    ...new Set(workoutExercises.flatMap((exercise) => exercise.equipment)),
  ];

  return (
    <main className="page-shell page-shell--detail page-shell--workout-detail">
      <Link className="back-link" href="/workouts">
        <UiIcon name="arrow-left" /> All workouts
      </Link>

      <section className="detail-hero detail-hero--workout">
        <div>
          <div className="tag-row">
            <span className="pill pill--dark">
              {titleCase(workout.difficulty)}
            </span>
            {workout.focus.map((focus) => (
              <span className="pill" key={focus}>
                {titleCase(focus)}
              </span>
            ))}
          </div>
          <h1>{workout.name}</h1>
          <p className="lede">{workout.shortDescription}</p>
        </div>
        <dl className="workout-facts">
          <div>
            <dt>Standard time</dt>
            <dd>{workout.estimatedMinutes} min</dd>
          </div>
          <div>
            <dt>Exercises</dt>
            <dd>
              {new Set(workout.items.map((item) => item.exerciseId)).size}
            </dd>
          </div>
          <div>
            <dt>Equipment</dt>
            <dd>
              {formatDumbbellAvailability(
                equipment,
                getWorkoutExercises(workout).flatMap(
                  (exercise) => exercise.optionalEquipment ?? [],
                ),
              )}
            </dd>
          </div>
        </dl>
      </section>

      <WorkoutAccess
        workoutId={workout.id}
        returnTo={`/workouts/${workout.slug}`}
      >
        <WorkoutConfigurator
          compositionExercises={compositionExercises}
          exercises={workoutExercises}
          workout={workout}
        />
      </WorkoutAccess>
    </main>
  );
}
