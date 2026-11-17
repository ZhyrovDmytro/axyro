"use client";
import { useEffect, useRef } from "react";
import { UiIcon } from "@/components/ui-icon";

export function PlanCreationProgress({ complete }: { complete: boolean }) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
  }, []);
  return (
    <section
      className="plan-creation-progress"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <span className="plan-creation-progress__mark" aria-hidden="true">
        {complete ? (
          <UiIcon name="check" />
        ) : (
          <span className="button-spinner" />
        )}
      </span>
      <h1 ref={heading} tabIndex={-1}>
        {complete ? "Your plan is ready" : "Creating your plan"}
      </h1>
      <p>
        {complete
          ? "Opening your training schedule…"
          : "Matching exercises to your goals, equipment and training days."}
      </p>
      <ol aria-label="Plan creation progress">
        <li>
          <UiIcon name="check" /> Answers reviewed
        </li>
        <li aria-current={complete ? undefined : "step"}>
          <UiIcon name={complete ? "check" : "scheduled"} />{" "}
          {complete
            ? "Training schedule built"
            : "Building your training schedule"}
        </li>
        <li aria-current={complete ? "step" : undefined}>
          <UiIcon name={complete ? "check" : "scheduled"} />{" "}
          {complete ? "Ready to view" : "Preparing your plan view"}
        </li>
      </ol>
    </section>
  );
}
