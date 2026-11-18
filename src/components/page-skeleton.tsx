export function PageSkeleton({
  title = "Your training",
  message = "Loading your training…",
  layout = "dashboard",
  embedded = false,
}: {
  title?: string;
  message?: string;
  layout?: "dashboard" | "list" | "form" | "player";
  embedded?: boolean;
}) {
  const Container = embedded ? "section" : "main";
  const Heading = embedded ? "h2" : "h1";
  return (
    <>
      <p className="sr-only" role="status" aria-atomic="true">
        {message}
      </p>
      <Container
        className={`page-shell page-skeleton page-skeleton--${layout}`}
        aria-busy="true"
      >
        <header className="page-skeleton__intro">
          <Heading>{title}</Heading>
          <p aria-hidden="true">{message}</p>
        </header>
        <div className="page-skeleton__layout" aria-hidden="true">
          <div className="page-skeleton__feature">
            <span className="skeleton skeleton--short" />
            <span className="skeleton skeleton--title" />
            <span className="skeleton" />
            <span className="skeleton skeleton--short" />
          </div>
          <div className="page-skeleton__details">
            {[0, 1, 2].map((row) => (
              <div className="page-skeleton__row" key={row}>
                <span className="skeleton skeleton--short" />
                <span className="skeleton" />
              </div>
            ))}
          </div>
        </div>
      </Container>
    </>
  );
}
