"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { UiIcon } from "@/components/ui-icon";
import styles from "./landing-page.module.css";

const exampleDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function PlanStory() {
  const [midweekMatch, setMidweekMatch] = useState(false);
  return (
    <>
      <section
        className={styles.personalSection}
        aria-labelledby="personal-heading"
      >
        <div className={styles.personalIntro}>
          <h2 id="personal-heading">
            A plan with
            <br />
            your name on it.
          </h2>
          <p>
            Your priorities, your available days, your equipment. Axyro turns
            your answers into a personalized 60-day training plan, with a clear
            next session waiting for you.
          </p>
          <Link href="/plan/setup" className={styles.cta}>
            Create my plan <UiIcon name="arrow-right" />
          </Link>
          <span className={styles.reassurance}>
            Personalized planning is included with Axyro Pro.
          </span>
        </div>
        <ol className={styles.planSteps}>
          <li>
            <span>01 / Your priorities</span>
            <div>
              <div
                className={styles.setupPreview}
                aria-label="Example training priorities"
              >
                <span>What would you like to work on?</span>
                <div className={styles.exampleTags}>
                  <span>
                    <UiIcon name="check" /> Movement
                  </span>
                  <span>
                    <UiIcon name="check" /> Strength
                  </span>
                  <span>Control</span>
                </div>
                <small>Example answers</small>
              </div>
              <h3>Start with what matters to you.</h3>
              <p>
                Choose your goals and movement priorities. Your answers help
                shape which exercises go into your plan.
              </p>
            </div>
          </li>
          <li>
            <span>02 / Your schedule</span>
            <div>
              <div
                className={styles.setupPreview}
                aria-label="Example availability"
              >
                <span>A little room in your week.</span>
                <div className={styles.setupDays}>
                  <span>
                    Mon<strong>Train</strong>
                  </span>
                  <span>
                    Wed<strong>Train</strong>
                  </span>
                  <span>
                    Fri<strong>Rest</strong>
                  </span>
                </div>
                <small>10-minute sessions · example schedule</small>
              </div>
              <h3>Give it room in your real week.</h3>
              <p>
                Choose training days, 5, 10 or 20 minutes, and the equipment you
                have. Add match dates to make space for recovery.
              </p>
            </div>
          </li>
          <li>
            <span>03 / Your next session</span>
            <div>
              <div
                className={`${styles.setupPreview} ${styles.setupSession}`}
                aria-label="Example guided session"
              >
                <Image
                  src="/images/landing/wood-chop-preview.png"
                  alt=""
                  width={100}
                  height={120}
                />
                <div>
                  <span>Foundation strength</span>
                  <strong>10 min</strong>
                  <small>Guided movement + recovery</small>
                </div>
              </div>
              <h3>Make your next session obvious.</h3>
              <p>
                Open your plan, see what’s next, and follow the guided player.
                Refine the plan as your schedule changes.
              </p>
              <Link href="/plan/setup" className={styles.planLink}>
                Build around my goals <UiIcon name="arrow-right" />
              </Link>
            </div>
          </li>
        </ol>
      </section>
      <section className={styles.adaptSection} aria-labelledby="adapt-heading">
        <div>
          <div className={styles.adaptIntro}>
            <h2 id="adapt-heading">
              Match moved?
              <br />
              <span>Your plan can move too.</span>
            </h2>
            <p>
              You’re not locked into the week you started with. Refine a plan
              that’s already in progress: update your training days and match
              dates so upcoming training fits around your games.
            </p>
          </div>
          <div className={styles.scheduleDemo}>
            <div className={styles.scheduleToolbar}>
              <div>
                <strong>Life happens. Make room for it.</strong>
                <span>Interactive example · not your saved plan</span>
              </div>
              <button
                type="button"
                aria-pressed={midweekMatch}
                onClick={() => setMidweekMatch(!midweekMatch)}
              >
                <UiIcon name="scheduled" />
                {midweekMatch ? "Reset example" : "Move match to Wednesday"}
                <UiIcon name="arrow-right" />
              </button>
            </div>
            <div
              className={styles.scheduleDays}
              aria-label="Example adjusted training week"
            >
              {exampleDays.map((day, index) => {
                const match = index === (midweekMatch ? 2 : 5);
                const train = index === 0 || index === (midweekMatch ? 4 : 2);
                const recovery = index === (midweekMatch ? 1 : 4);
                return (
                  <div
                    key={day}
                    className={`${styles.scheduleDay} ${match ? styles.scheduleMatch : train ? styles.scheduleTrain : ""}`}
                  >
                    <span>{day}</span>
                    <div
                      key={`${day}-${midweekMatch}`}
                      className={styles.dayContent}
                    >
                      <UiIcon
                        name={match ? "sparkle" : train ? "play" : "pause"}
                      />
                      <strong>
                        {match
                          ? "Match"
                          : train
                            ? "Train"
                            : recovery
                              ? "Recover"
                              : "Rest"}
                      </strong>
                      <small>
                        {match
                          ? "Court time"
                          : train
                            ? "10 minutes"
                            : recovery
                              ? "Before your match"
                              : "Room to recharge"}
                      </small>
                    </div>
                  </div>
                );
              })}
            </div>
            <p className={styles.scheduleStatus} role="status">
              <UiIcon name="check" />
              {midweekMatch
                ? "Match on Wednesday. Training moves to Friday in this example, with Tuesday kept for recovery."
                : "Training on Monday and Wednesday. Friday stays clear before Saturday’s match."}
            </p>
          </div>
          <div className={styles.adaptFooter}>
            <p>
              Update your dates in <strong>Refine your plan</strong>. Axyro uses
              your revised availability and matches to shape upcoming training.
              Your real schedule depends on the days you choose.
            </p>
            <Link
              href="/plan/setup"
              className={`${styles.cta} ${styles.ctaDark}`}
            >
              Create my plan <UiIcon name="arrow-right" />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
