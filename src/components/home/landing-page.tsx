"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { UiIcon } from "@/components/ui-icon";
import { exercises } from "@/content/exercises";
import { starterWorkouts } from "@/content/workouts";
import { FREE_WORKOUT_ID } from "@/domain/access/entitlements";
import { LibraryAndEditor } from "./padel-story";
import { HeroQualities } from "./hero-qualities";
import { PlanStory } from "./plan-story";
import styles from "./landing-page.module.css";

const starter = starterWorkouts.find(
  (workout) => workout.id === FREE_WORKOUT_ID,
)!;
const starterHref = `/workouts/${starter.slug}`;
const heroMovements = [
  ["standing-dumbbell-wood-chop", "wood-chop-preview.png"],
  ["lateral-stick", "lateral-stick-preview.png"],
  ["bird-dog", "bird-dog-preview.png"],
  ["dynamic-court-march", "dynamic-court-march-preview.png"],
  ["side-plank-rotation", "side-plank-preview.png"],
].map(([id, poster]) => ({
  exercise: exercises.find((exercise) => exercise.id === id)!,
  poster: `/images/landing/${poster}`,
}));
const playerMovement = exercises.find(
  (exercise) => exercise.id === "side-plank-rotation",
)!;
const chapters = [
  {
    title: "See it. Then move.",
    body: "A clear movement reference and simple cues take the guesswork out of every exercise. Set your phone down and follow along.",
    phase: "Move with control",
    time: "00:30",
    next: "Recovery",
    icon: "play",
  },
  {
    title: "Find your rhythm.",
    body: "Optional countdown tones signal interval changes. Follow the visual tempo, turn audio on, or train quietly. You’re in control.",
    phase: "Follow your cadence",
    time: "00:15",
    next: "Recovery",
    icon: "volume",
  },
  {
    title: "Rest is part of the work.",
    body: "Work, side switches and recovery flow automatically. No timer juggling. Pause whenever you need, then pick up where you left off.",
    phase: "Take a breath",
    time: "00:20",
    next: "Next movement",
    icon: "pause",
  },
] as const;
const questions = [
  [
    "Can I adjust a plan after I’ve started?",
    "Yes. Open Refine your plan to update your training days, session length, equipment or match dates. Axyro uses those changes to shape upcoming training around your availability and matches, with recovery kept in the schedule.",
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
    "What’s included with Pro?",
    "Pro unlocks personalized 60-day plans and full workout and exercise-library access. Plans use your goals, equipment and availability, with recovery around your match schedule. Current pricing is shown before purchase.",
  ],
  [
    "Can I pause or turn audio off?",
    "Any time. Pause and resume, mute guidance, skip ahead or return to a previous exercise. Where audio is unavailable, visual cues keep you on track.",
  ],
];

function PlanLink() {
  return (
    <Link href="/plan/setup" className={styles.cta}>
      Create my plan <UiIcon name="arrow-right" />
    </Link>
  );
}

function subscribeToMotionPreference(onChange: () => void) {
  const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
  preference.addEventListener("change", onChange);
  return () => preference.removeEventListener("change", onChange);
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
        <section className={styles.hero}>
          <div className={styles.heroCopy}>
            <h1 className={styles.heroHeadline}>
              <span className={styles.headlineLine}>Train </span>
              <span className={styles.headlineLine}>anywhere. </span>
              <span className={styles.headlineLine}>
                Win on <em>court.</em>
              </span>
            </h1>
            <HeroQualities />
            <p>
              Arrive on court ready to play. Build a personalized 60-day padel
              training plan with Axyro Pro. Develop movement, strength and
              control at home—in sessions that fit around your matches.
            </p>
            <PlanLink />
            <span className={styles.reassurance}>
              Personalized training, full library access. With Axyro Pro.
            </span>
            <Link href={starterHref} className={styles.freeLink}>
              Try a free workout first <UiIcon name="arrow-right" />
            </Link>
          </div>
          <div className={styles.heroStage} ref={heroRef}>
            <div className={styles.stageTop}>
              <span>
                <i className={styles.previewDot} aria-hidden="true" /> At home.
                In your own time.
              </span>
              <UiIcon name="scheduled" />
            </div>
            <div className={styles.heroImage}>
              {heroMovements.map(({ exercise, poster }, index) => (
                <div
                  key={exercise.id}
                  className={`${styles.heroSlide} ${index === heroIndex ? styles.heroSlideActive : ""}`}
                  aria-hidden={index !== heroIndex}
                >
                  <Image
                    src={
                      playing &&
                      heroVisible &&
                      (index === heroIndex ||
                        index === (heroIndex + 1) % heroMovements.length)
                        ? exercise.media.uri!
                        : poster
                    }
                    alt={
                      index === heroIndex
                        ? `${exercise.name} movement demonstration`
                        : ""
                    }
                    fill
                    loading="eager"
                    unoptimized
                    sizes="(max-width: 760px) 100vw, 50vw"
                    onError={(event) => {
                      if (!event.currentTarget.src.endsWith(poster))
                        event.currentTarget.src = poster;
                    }}
                  />
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
                <span>A look inside Axyro</span>
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
            <div className={styles.floatingNote}>
              <UiIcon name="check" />
              <span>
                Your next step?
                <br />
                <strong>Already taken care of.</strong>
              </span>
            </div>
          </div>
        </section>
        <div className={styles.promiseStrip}>
          <span>
            <UiIcon name="scheduled" />
            5, 10 or 20 minutes
          </span>
          <span>
            <UiIcon name="play" />
            Movement you can follow
          </span>
          <span>
            <UiIcon name="volume" />
            Guidance you can hear
          </span>
        </div>
        <section className={styles.story} id="how-it-works">
          <div className={styles.sectionIntro}>
            <h2>
              Your workout.
              <br />
              With the thinking taken out.
            </h2>
            <p>
              Less watching the clock.
              <br />
              More being in the movement.
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
                <Image
                  src={
                    playerPlaying && chapter !== 2
                      ? playerMovement.media.uri!
                      : "/images/landing/side-plank-preview.png"
                  }
                  alt={`${playerMovement.name} movement demonstration`}
                  unoptimized
                  fill
                  sizes="(max-width: 760px) 100vw, 45vw"
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
                  <strong>Room to recover.</strong>
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
        <section className={styles.faq} id="questions">
          <div>
            <h2>
              A few things
              <br />
              before you start.
            </h2>
            <Link className={styles.planLink} href="/exercises">
              Explore the movement library <UiIcon name="arrow-right" />
            </Link>
          </div>
          <div>
            {questions.map(([question, answer]) => (
              <article key={question}>
                <h3>{question}</h3>
                <p>{answer}</p>
              </article>
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
            <h2 id="start-training-heading">
              Your next match.
              <br />
              <span>Better prepared.</span>
            </h2>
            <p>
              Build the work behind your next point. Start your personalized
              padel plan.
            </p>
            <PlanLink />
            <span className={styles.reassurance}>
              Your goals. Your schedule. Axyro Pro.
            </span>
            <Link href={starterHref} className={styles.freeLink}>
              Try a free workout first <UiIcon name="arrow-right" />
            </Link>
          </div>
        </section>
      </main>
      <footer className={styles.footer}>
        <Link href="/" className="brand">
          Axyro
        </Link>
        <span>Make room for movement.</span>
        <nav aria-label="Legal">
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/signin">Sign in</Link>
        </nav>
      </footer>
    </div>
  );
}
