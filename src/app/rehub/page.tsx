import type { Metadata } from "next";
import styles from "./rehub.module.css";

export const metadata: Metadata = {
  title: "Rehub | Axyro",
  description:
    "A recovery library for shoulders, wrists and legs, coming soon to Axyro Pro.",
};

export default function RehubPage() {
  return (
    <main className="page-shell section-page">
      <div>
        <h1 className="section-title">Rehub</h1>
        <p className={styles.status}>Coming soon to Axyro Pro</p>
        <p className={styles.description}>
          We’re building a library of recovery exercises and workouts for the
          days between matches.
        </p>
      </div>
    </main>
  );
}
