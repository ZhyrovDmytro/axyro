import Link from "next/link";

export default function NotFound() {
  return (
    <main className="page-shell page-shell--inner">
      <section className="empty-state">
        <h1>This page isn’t here</h1>
        <p>
          The link may be out of date. Choose a workout to get moving again.
        </p>
        <Link className="button button--primary" href="/workouts">
          Browse workouts
        </Link>
        <Link className="text-link" href="/">
          Go home
        </Link>
      </section>
    </main>
  );
}
