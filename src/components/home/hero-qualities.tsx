import { type CSSProperties } from "react";
import styles from "./landing-page.module.css";

const qualities = [
  "power",
  "control",
  "confidence",
  "endurance",
  "speed",
  "stability",
];

export function HeroQualities() {
  return (
    <div className={styles.qualities}>
      <span className="sr-only">
        Build your power, control, confidence, endurance, speed and stability.
      </span>
      <span aria-hidden="true" className={styles.qualityLine}>
        Build your{" "}
        <span className={styles.qualityWords}>
          {qualities.map((word, index) => (
            <span
              data-quality={word}
              key={word}
              style={
                { "--word-delay": `${index * 1.4 - 8.4}s` } as CSSProperties
              }
            >
              {word}.
            </span>
          ))}
        </span>
      </span>
    </div>
  );
}
