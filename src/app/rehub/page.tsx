import type { Metadata } from "next";
import styles from "./rehub.module.css";

export const metadata: Metadata = {
  title: "Rehub | Axyro",
  description:
    "A recovery library for shoulders, wrists and legs, coming soon to Axyro Pro.",
};

export default function RehubPage() {
  return (
    <main className={`page-shell ${styles.page}`}>
      <div className={styles.copy}>
        <h1>Rehub</h1>
        <p className={styles.status}>Coming soon to Axyro Pro</p>
        <p className={styles.description}>
          We’re building a library of recovery exercises and workouts for the
          days between matches. You’ll be able to browse by body area, including
          shoulders, wrists and legs.
        </p>
      </div>
    </main>
  );
}
