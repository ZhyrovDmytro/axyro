import { isHomeExercise } from "@/domain/content/catalog-quality";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { OptionalEquipmentNote } from "@/components/optional-equipment-note";
import { ExerciseMedia } from "@/components/exercise-media";
import { UiIcon } from "@/components/ui-icon";
import { publishedExercises as exercises } from "@/content/exercises";
import { sports } from "@/content/sports";
import { sportSchema } from "@/domain/sport/sport-exercise-profile.schema";
import { getSportExerciseProfile } from "@/lib/exercise-library";
import { getExerciseBySlug } from "@/lib/catalog";
import {
  formatDefaultPrescription,
  formatDumbbellAvailability,
  formatTempo,
  titleCase,
} from "@/lib/format";

type ExerciseDetailProps = {
  params: Promise<{ exerciseId: string }>;
  searchParams: Promise<{ sport?: string | string[] }>;
};

export function generateStaticParams() {
  return exercises.map((exercise) => ({ exerciseId: exercise.slug }));
}

export async function generateMetadata({
  params,
}: ExerciseDetailProps): Promise<Metadata> {
  const { exerciseId } = await params;
  const exercise = getExerciseBySlug(exerciseId);

  return exercise
    ? {
        title: exercise.name + " | Axyro",
        description: exercise.shortDescription,
      }
    : {};
}

export default async function ExerciseDetailPage({
  params,
  searchParams,
}: ExerciseDetailProps) {
  const { exerciseId } = await params;
  const query = await searchParams;
  const exercise = getExerciseBySlug(exerciseId);

  if (!exercise) notFound();

  const sportValue = Array.isArray(query.sport) ? query.sport[0] : query.sport;
  const sport = sportSchema.safeParse(sportValue).data ?? "padel";
  const profile = sport
    ? getSportExerciseProfile(sport, exercise.id)
    : undefined;
  const sportName = sports.find((option) => option.id === sport)?.name;
  const libraryHref =
    profile && sport
      ? "/exercises?sport=" + sport + "&area=" + profile.bodyAreas[0]
      : "/exercises";

  return (
    <main className="page-shell page-shell--detail">
      <Link className="back-link" href={libraryHref}>
        <UiIcon name="arrow-left" />
        {sportName ? sportName + " exercise library" : "Exercise library"}
      </Link>

      <section className="exercise-detail-hero">
        <ExerciseMedia exercise={exercise} />
        <div className="exercise-title-block">
          <div className="tag-row">
            <span className="pill pill--dark">
              {titleCase(exercise.difficulty)}
            </span>
            {exercise.roles.map((role) => (
              <span className="pill" key={role}>
                {titleCase(role)}
              </span>
            ))}
          </div>
          <h1>{exercise.name}</h1>
          <p className="lede">{exercise.shortDescription}</p>
          {!isHomeExercise(exercise) && (
            <p role="note">
              Saved reference only. This video uses a plate, foam roller or
              raised obstacle. It is preserved in your library but excluded from
              home workouts and plans.
            </p>
          )}
          <dl className="exercise-facts">
            <div>
              <dt>Equipment</dt>
              <dd>
                {formatDumbbellAvailability(
                  exercise.equipment,
                  exercise.optionalEquipment,
                )}
              </dd>
            </div>
            <div>
              <dt>Default recommendation</dt>
              <dd>
                {formatDefaultPrescription(
                  exercise.defaultPrescription,
                  exercise.laterality === "unilateral",
                )}
              </dd>
            </div>
            <div>
              <dt>Tempo</dt>
              <dd>{formatTempo(exercise.tempo)}</dd>
            </div>
          </dl>
          <OptionalEquipmentNote exercise={exercise} />
          <div className="exercise-summary-cards">
            <section
              className="context-card"
              aria-labelledby="qualities-heading"
            >
              <p className="kicker">Training intent</p>
              <h2 id="qualities-heading">What it develops</h2>
              <div className="tag-row">
                {exercise.targetedQualities.map((quality) => (
                  <span className="pill" key={quality}>
                    {titleCase(quality)}
                  </span>
                ))}
              </div>
            </section>
            {profile && sportName && (
              <section
                className="context-card context-card--sport"
                aria-labelledby="movement-heading"
              >
                <p className="kicker">{sportName} relevance</p>
                <h2 id="movement-heading">Why it helps</h2>
                <p className="context-card-copy">
                  {profile.sportSpecificReason}
                </p>
                <div className="tag-row">
                  {profile.movementTags.map((movement) => (
                    <span className="pill" key={movement}>
                      {titleCase(movement)}
                    </span>
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>
      </section>

      <div className="instruction-grid">
        <section className="instruction-section" aria-labelledby="how-heading">
          <p className="kicker">Step by step</p>
          <h2 id="how-heading">How to move</h2>
          <ol className="numbered-list">
            {exercise.instructions.map((instruction, index) => (
              <li key={instruction}>
                <span>{index + 1}</span>
                <p>{instruction}</p>
              </li>
            ))}
          </ol>
          <p className="safety-note">
            Use a comfortable range and stop if you feel sharp pain.
          </p>
        </section>
        <div className="coaching-stack">
          <section
            className="callout callout--accent"
            aria-labelledby="cues-heading"
          >
            <p className="kicker">Remember</p>
            <h2 id="cues-heading">Key cues</h2>
            <ul>
              {exercise.cues.map((cue) => (
                <li key={cue}>{cue}</li>
              ))}
            </ul>
          </section>
          <section className="callout" aria-labelledby="mistakes-heading">
            <p className="kicker">Watch for</p>
            <h2 id="mistakes-heading">Common mistakes</h2>
            <ul>
              {exercise.commonMistakes.map((mistake) => (
                <li key={mistake}>{mistake}</li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </main>
  );
}
