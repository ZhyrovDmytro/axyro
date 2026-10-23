"use client";

import Link from "next/link";

export default function ErrorPage({ retry }: { retry: () => void }) {
  return (
    <main className="page-shell page-shell--inner">
      <section className="empty-state" role="alert">
        <h1>This page couldn’t load</h1>
        <p>
          Try again. If it still won’t load, return home and reopen your
          workout.
        </p>
        <button className="button button--primary" onClick={retry}>
          Try again
        </button>
        <Link className="text-link" href="/">
          Go home
        </Link>
      </section>
    </main>
  );
}
