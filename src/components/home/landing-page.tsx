"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { UiIcon } from "@/components/ui-icon";
import { exercises } from "@/content/exercises";
import { starterWorkouts } from "@/content/workouts";
import { FREE_WORKOUT_ID } from "@/domain/access/entitlements";
import { LibraryAndEditor } from "./padel-story";
import { PlanStory } from "./plan-story";
import styles from "./landing-page.module.css";

const starter = starterWorkouts.find(
  (workout) => workout.id === FREE_WORKOUT_ID,
)!;
const starterHref = `/workouts/${starter.slug}`;
const heroMovements = [
  "standing-dumbbell-wood-chop",
  "lateral-stick",
  "bird-dog",
  "dynamic-court-march",
  "side-plank-rotation",
].map((id) => {
  const exercise = exercises.find((item) => item.id === id)!;
  return { exercise, poster: exercise.media.firstFrameUri! };
});
const playerMovement = exercises.find(
  (exercise) => exercise.id === "side-plank-rotation",
)!;
const chapters = [
  {
    title: "Follow each movement",
    body: "A clear movement reference and simple cues take the guesswork out of every exercise. Set your phone down and follow along.",
    phase: "Move with control",
    time: "00:30",
    next: "Recovery",
    icon: "play",
  },
  {
    title: "Choose your audio guidance",
    body: "Optional countdown tones signal interval changes. Follow the visual tempo, turn audio on, or train quietly. You’re in control.",
    phase: "Follow your cadence",
    time: "00:15",
    next: "Recovery",
    icon: "volume",
  },
  {
    title: "Recover between intervals",
    body: "Work, side switches and recovery flow automatically. No timer juggling. Pause whenever you need, then pick up where you left off.",
    phase: "Take a breath",
    time: "00:20",
    next: "Next movement",
    icon: "pause",
  },
] as const;
const questions = [
  [
    "Who is Axyro for?",
    "The workouts are built around padel. Beginners can choose a lighter effort, follow the demonstrations and start with a five-minute session.",
  ],
  [
    "Can I try Axyro without an account?",
    "Yes. One complete starter workout is free, with no account or card required. Try the guided player before deciding whether a plan is right for you.",
  ],
  [
    "Do I need a gym or equipment?",
    "Axyro is built for home training, using bodyweight and optional light dumbbells. Each workout lists what you need before you start.",
  ],
  [
    "What if I only have five minutes?",
    "Choose 5, 10 or 20 minutes on the workout preview. Ten is the default. Work and recovery fit within your session, and changing effort does not extend it.",
  ],
  [
    "Can I train alongside my matches?",
    "Yes. Add your match days when you set up a plan so training and recovery can fit around them.",
  ],
];

function LandingDemo({
  exercise,
  playing,
}: {
  exercise: (typeof exercises)[number];
  playing: boolean;
}) {
  const [failedUri, setFailedUri] = useState<string>();
  const { firstFrameUri, playbackUri } = exercise.media;
  const label = `${exercise.name} movement demonstration`;
  return playing && playbackUri && failedUri !== playbackUri ? (
    <video
      aria-label={label}
      autoPlay
      muted
      loop
      playsInline
      poster={firstFrameUri}
      src={playbackUri}
      onError={() => setFailedUri(playbackUri)}
    />
  ) : (
    <Image alt={label} src={firstFrameUri!} fill unoptimized />
  );
}

function PlanLink({ label = "Create your plan" }: { label?: string }) {
  return (
    <Link href="/plan/setup" className={styles.cta}>
      {label} <UiIcon name="arrow-right" />
    </Link>
  );
}

function subscribeToMotionPreference(onChange: () => void) {
  const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
  preference.addEventListener("change", onChange);
  return () => preference.removeEventListener("change", onChange);
}

function CourtFilm({ reducedMotion }: { reducedMotion: boolean }) {
  const film = useRef<HTMLVideoElement>(null);
  const [paused, setPaused] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const video = film.current;
    if (!video) return;
    if (reducedMotion) video.pause();
    else void video.play().catch(() => {});
  }, [reducedMotion]);

  return (
    <>
      <video ref={film} className={styles.film} aria-hidden="true"
        muted playsInline loop preload="none" poster="/images/landing/court-film.webp"
        src="/images/landing/court-film.mp4"
        onPlay={() => setPaused(false)} onPause={() => setPaused(true)}
        onError={() => setFailed(true)} />
      {!failed && (
        <button type="button" className={styles.filmControl}
          aria-label={paused ? "Play court film" : "Pause court film"}
          onClick={() => {
            const video = film.current;
            if (video?.paused) void video.play().catch(() => {});
            else video?.pause();
          }}>
          <UiIcon name={paused ? "play" : "pause"} />
        </button>
      )}
    </>
  );
}

export function LandingPage() {
  const reducedMotion = useSyncExternalStore(
    subscribeToMotionPreference,
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => true,
  );
  const [playOverride, setPlaying] = useState<boolean | null>(null);
  const playing = playOverride ?? !reducedMotion;
  const [heroIndex, setHeroIndex] = useState(0);
  const [heroVisible, setHeroVisible] = useState(true);
  const heroRef = useRef<HTMLDivElement>(null);
  const movement = heroMovements[heroIndex].exercise;
  useEffect(() => {
    let intersecting = true;
    const updateVisibility = () =>
      setHeroVisible(intersecting && !document.hidden);
    const observer = new IntersectionObserver(([entry]) => {
      intersecting = entry.isIntersecting;
      updateVisibility();
    });
    if (heroRef.current) observer.observe(heroRef.current);
    document.addEventListener("visibilitychange", updateVisibility);
    updateVisibility();
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", updateVisibility);
    };
  }, []);
  useEffect(() => {
    if (!playing || !heroVisible || reducedMotion) return;
    const timer = window.setInterval(() => {
      setHeroIndex((index) => (index + 1) % heroMovements.length);
    }, 3500);
    return () => window.clearInterval(timer);
  }, [playing, heroVisible, reducedMotion]);
  const [playerPlaying, setPlayerPlaying] = useState(false);
  const [chapter, setChapter] = useState(0);
  const storyRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const sections =
      storyRef.current?.querySelectorAll<HTMLElement>("[data-chapter]");
    if (!sections) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries)
          if (entry.isIntersecting)
            setChapter(Number((entry.target as HTMLElement).dataset.chapter));
      },
      { rootMargin: "-30% 0px -30% 0px", threshold: 0 },
    );
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);
  const scene = chapters[chapter];
  return (
    <div className={styles.landing}>
      <main id="main">
        <section className={styles.filmHero}>
          <CourtFilm reducedMotion={reducedMotion} />
          <div className={styles.heroCopy}>
            <div className={styles.filmEyebrow}>BUILT FOR PADEL PLAYERS</div>
            <h1 className={styles.heroHeadline}>
              Play better padel. <em>Train beyond the court.</em>
            </h1>
            <p>
              Build strength, move faster, and stay ready for every shot. Personalized
              workouts designed for padel players, right at home.
            </p>
            <div className={styles.actions}>
              <PlanLink label="Build My Training Plan" />
              <a href="#how-it-works" className={styles.freeLink}>
                See How It Works <UiIcon name="arrow-right" />
              </a>
            </div>
          </div>
        </section>
        <section className={styles.matchDemand} id="why-axyro">
          <div>
            <h2>Train the step before the shot.</h2>
            <p>
              When a ball comes off the glass, getting your racket back is only
              half the job. Your legs have to brake, your hips turn and your
              feet find balance for the return.
            </p>
            <p>
              Practise those movements between matches. Pick a drill to see what
              the work looks like.
            </p>
          </div>
          <div className={styles.heroStage} ref={heroRef}>
            <div className={styles.stageTop}>
              <span>Exercise library</span>
              <span>
                {heroIndex + 1} / {heroMovements.length}
              </span>
            </div>
            <div className={styles.heroImage}>
              {heroMovements.map(({ exercise }, index) => (
                <div
                  key={exercise.id}
                  className={`${styles.heroSlide} ${index === heroIndex ? styles.heroSlideActive : ""}`}
                  aria-hidden={index !== heroIndex}
                >
                  {index === heroIndex && (
                    <LandingDemo
                      exercise={exercise}
                      playing={playing && heroVisible}
                    />
                  )}
                </div>
              ))}
              <button
                className={styles.demoToggle}
                onClick={() => setPlaying(!playing)}
                aria-pressed={playing}
              >
                <UiIcon name={playing ? "pause" : "play"} />
                {playing ? "Pause preview" : "Play movement"}
              </button>
            </div>
            <div className={styles.workoutLabel}>
              <div>
                <strong className={styles.heroExerciseName}>
                  {movement.name}
                </strong>
              </div>
              <span className={styles.timer}>00:30</span>
            </div>
            <div
              className={styles.movementPicker}
              role="group"
              aria-label="Preview exercises"
            >
              {heroMovements.map(({ exercise, poster }, index) => (
                <button
                  type="button"
                  key={exercise.id}
                  aria-label={`Preview ${exercise.name}`}
                  aria-pressed={index === heroIndex}
                  onClick={() => {
                    setHeroIndex(index);
                    setPlaying(false);
                  }}
                >
                  <Image
                    src={poster}
                    alt=""
                    width={64}
                    height={48}
                    unoptimized
                  />
                </button>
              ))}
            </div>
          </div>
        </section>
        <section className={styles.story} id="how-it-works">
          <div className={styles.sectionIntro}>
            <h2>Guidance through every session</h2>
            <p>
              Follow the movement, timing and recovery
              <br />
              from warm-up to cooldown. Finish your session and record how it
              felt.
            </p>
          </div>
          <div className={styles.storyGrid} ref={storyRef}>
            <div
              className={styles.stickyPlayer}
              aria-label="Illustrative workout player preview"
            >
              <div className={styles.playerTop}>
                <span>Player preview</span>
                <span>10 min session</span>
              </div>
              <div
                className={`${styles.playerVisual} ${chapter === 2 ? styles.restVisual : ""}`}
              >
                <LandingDemo
                  exercise={playerMovement}
                  playing={playerPlaying && chapter !== 2}
                />
                {chapter !== 2 && (
                  <button
                    className={styles.demoToggle}
                    onClick={() => setPlayerPlaying(!playerPlaying)}
                    aria-pressed={playerPlaying}
                  >
                    {playerPlaying
                      ? "Pause player preview"
                      : "Play player preview"}
                    <UiIcon name={playerPlaying ? "pause" : "play"} />
                  </button>
                )}
                <div className={styles.restCopy}>
                  <UiIcon name="pause" />
                  <strong>Recovery</strong>
                </div>
              </div>
              <div className={styles.playerReadout}>
                <div>
                  <span>{scene.phase}</span>
                  <strong>
                    {chapter === 2 ? "Recovery" : playerMovement.name}
                  </strong>
                </div>
                <b>{scene.time}</b>
              </div>
              <div className={styles.chapterProgress} aria-hidden="true">
                {chapters.map((_, index) => (
                  <i
                    className={index <= chapter ? styles.progressActive : ""}
                    key={index}
                  />
                ))}
              </div>
              <div className={styles.playerNext}>
                <span>Up next</span>
                <strong>{scene.next}</strong>
              </div>
            </div>
            <div className={styles.chapters}>
              {chapters.map((item, index) => (
                <article
                  data-chapter={index}
                  key={item.title}
                  className={styles.chapter}
                >
                  <span className={styles.chapterIcon}>
                    <UiIcon name={item.icon} />
                  </span>
                  <h3>{item.title}</h3>
                  <p>{item.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
        <PlanStory />
        <LibraryAndEditor />
        <section className={styles.access}>
          <h2>Choose how you train</h2>
          <div>
            <h3>Free</h3>
            <p>Try one complete guided workout. No account or card required.</p>
            <Link href={starterHref} className={styles.freeLink}>
              Try a free workout first <UiIcon name="arrow-right" />
            </Link>
          </div>
          <div>
            <h3>Pro</h3>
            <p>
              Train with the full library and a personal plan that fits your
              match days. Review adjustments as you go.
            </p>
            <PlanLink />
          </div>
        </section>
        <section className={styles.faq} id="questions">
          <div>
            <h2>
              Questions
              <br />
              before you start
            </h2>
            <Link className={styles.planLink} href="/exercises">
              Explore the movement library <UiIcon name="arrow-right" />
            </Link>
          </div>
          <div>
            {questions.map(([question, answer]) => (
              <details key={question}>
                <summary>{question}</summary>
                <p>{answer}</p>
              </details>
            ))}
          </div>
        </section>
        <section
          className={styles.closing}
          aria-labelledby="start-training-heading"
        >
          <div className={styles.closingImage}>
            <Image
              src="/images/landing/lateral-stick-preview.png"
              alt="Lateral movement exercise from Axyro’s library"
              fill
              sizes="(max-width: 760px) 100vw, 50vw"
            />
          </div>
          <div className={styles.closingCopy}>
            <h2 id="start-training-heading">Prepare for your next match</h2>
            <p>
              Build the work behind your next point. Start your personalized
              padel plan.
            </p>
            <div className={styles.actions}>
              <PlanLink />
              <Link href={starterHref} className={styles.freeLink}>
                Try a free workout first <UiIcon name="arrow-right" />
              </Link>
            </div>
          </div>
        </section>
      </main>

    </div>
  );
}
