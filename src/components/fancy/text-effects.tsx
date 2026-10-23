import type { CSSProperties, ReactNode } from "react";
import styles from "./text-effects.module.css";

// Adapted from Daniel Petho's Fancy Components. See THIRD_PARTY_NOTICES.md.
export function LetterSwap({ label }: { label: string }) {
  return (
    <span className={styles.swap}>
      <span className="sr-only">{label}</span>
      <span aria-hidden="true" className={styles.letters}>
        {Array.from(label).map((letter, index) => (
          <span
            className={styles.letter}
            key={index}
            style={{ "--letter-delay": `${index * 18}ms` } as CSSProperties}
          >
            <span>{letter}</span>
            <span>{letter}</span>
          </span>
        ))}
      </span>
    </span>
  );
}

export function AnimatedUnderline({ children }: { children: ReactNode }) {
  return <span className={styles.underline}>{children}</span>;
}
