"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { exercises } from "@/content/exercises";
import { UiIcon } from "@/components/ui-icon";
import styles from "./landing-page.module.css";

const selection = [
  ["split-stance-acceleration-march", "march-preview.png", "First-step drive"],
  [
    "standing-dumbbell-wood-chop",
    "wood-chop-preview.png",
    "Rotational control",
  ],
  ["side-plank-rotation", "side-plank-preview.png", "Core stability"],
  ["lateral-stick", "lateral-stick-preview.png", "Lateral control"],
  ["bird-dog", "bird-dog-preview.png", "Balance & stability"],
  ["dumbbell-wrist-extension", "wrist-preview.png", "Forearm strength"],
].map(([id, image, benefit]) => ({
  exercise: exercises.find((exercise) => exercise.id === id)!,
  image,
  benefit,
}));

export function LibraryAndEditor() {
  const [added, setAdded] = useState(false);
  const editorItems = added ? selection.slice(0, 3) : selection.slice(0, 2);
  return (
    <>
      <section
        className={styles.librarySection}
        id="exercise-library"
        aria-labelledby="library-heading"
      >
        <div className={styles.sectionIntro}>
          <div>
            <h2 id="library-heading">
              Know the movement.
              <br />
              Build your game.
            </h2>
            <p>
              Explore a curated library of {exercises.length} exercises, with
              movement references and concise technique cues. Pro opens the full
              collection.
            </p>
          </div>
          <Link className={styles.planLink} href="/exercises">
            Explore the library <UiIcon name="arrow-right" />
          </Link>
        </div>
        <div className={styles.libraryTeaser}>
          <div className={styles.libraryGrid}>
            {selection.map(({ exercise, image, benefit }) => (
              <article className={styles.librarySample} key={exercise.id}>
                <div>
                  <Image
                    src={`/images/landing/${image}`}
                    alt={`${exercise.name} reference`}
                    fill
                    sizes="(max-width: 760px) 90vw, 30vw"
                  />
                </div>
                <span>{benefit}</span>
                <h3>{exercise.name}</h3>
              </article>
            ))}
          </div>
          <div className={styles.libraryContinuation}>
            <div
              className={`${styles.libraryGrid} library-overflow`}
              aria-hidden="true"
            >
              <span />
              <span />
              <span />
            </div>
            <div className={styles.libraryFade}>
              <strong>
                More ways to prepare.
                <br />
                One plan built around you.
              </strong>
              <Link href="/plan/setup" className={styles.cta}>
                Create my plan <UiIcon name="arrow-right" />
              </Link>
              <span>Full exercise library included with Pro.</span>
            </div>
          </div>
        </div>
      </section>
      <section
        className={styles.editorSection}
        aria-labelledby="editor-heading"
      >
        <div className={styles.editorDetailGrid}>
          <div className={styles.editorCopy}>
            <h2 id="editor-heading">
              Your plan.
              <br />
              Your workout.
              <br />
              <span>Your call.</span>
            </h2>
            <p>
              Start with your personalized plan, then make a session your own.
              Add exercises from the library, remove movements, and reorder the
              workout to suit what you want to work on.
            </p>
            <ul>
              <li>
                <UiIcon name="plus" />
                Add a movement from the library
              </li>
              <li>
                <UiIcon name="minus" />
                Remove what you don’t want in the session
              </li>
              <li>
                <UiIcon name="grip" />
                Reorder exercises and adjust timed intervals
              </li>
            </ul>
            <Link className={styles.cta} href="/plan/setup">
              Build my personalized plan <UiIcon name="arrow-right" />
            </Link>
            <span className={styles.reassurance}>
              Workout editing is available within your Pro plan.
            </span>
          </div>
          <div
            className={styles.editorPreview}
            aria-label="Illustrative Pro workout editor"
          >
            <header>
              <div>
                <span>Pro workout editor · interactive example</span>
                <h3>Movement & control</h3>
              </div>
              <UiIcon name="settings" />
            </header>
            <div className={styles.editorTabs}>
              <span>Warm-up</span>
              <strong>Main work</strong>
              <span>Cooldown</span>
            </div>
            <div className={styles.editorRows}>
              {editorItems.map(({ exercise, image }) => (
                <div className={styles.editorRow} key={exercise.id}>
                  <UiIcon name="grip" />
                  <Image
                    src={`/images/landing/${image}`}
                    alt=""
                    width={64}
                    height={54}
                  />
                  <div>
                    <strong>{exercise.name}</strong>
                    <span>2 rounds · 30s work · 20s rest</span>
                  </div>
                  {exercise.id === selection[2].exercise.id && (
                    <button
                      type="button"
                      aria-label="Remove side plank from example"
                      onClick={() => setAdded(false)}
                    >
                      <UiIcon name="minus" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              className={styles.addExample}
              type="button"
              onClick={() => setAdded(!added)}
            >
              <UiIcon name={added ? "minus" : "plus"} />
              {added ? "Remove side plank" : "Add side plank from library"}
            </button>
            <p role="status">
              {added
                ? "Side plank added to this example."
                : "Try adding a movement to this example."}
            </p>
            <footer>
              <UiIcon name="check" />
              Preview only. Your saved workouts stay unchanged.
            </footer>
          </div>
        </div>
      </section>
    </>
  );
}
