export function LoadingStatus({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p
      className={`loading-status ${className}`}
      role="status"
      aria-atomic="true"
    >
      <span className="button-spinner" aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
}
