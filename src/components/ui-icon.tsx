import type { SVGProps } from "react";

export type UiIconName =
  | "arrow-left"
  | "arrow-right"
  | "arrow-up-right"
  | "book-open"
  | "check"
  | "chevron-up"
  | "close"
  | "grip"
  | "incomplete"
  | "minus"
  | "pause"
  | "play"
  | "plus"
  | "route"
  | "scheduled"
  | "settings"
  | "skip"
  | "sparkle"
  | "volume"
  | "volume-off";

type UiIconProps = SVGProps<SVGSVGElement> & {
  name: UiIconName;
};

export function UiIcon({ name, ...props }: UiIconProps) {
  const commonProps = {
    "aria-hidden": true,
    fill: "none",
    focusable: false,
    viewBox: "0 0 24 24",
    xmlns: "http://www.w3.org/2000/svg",
    ...props,
  } as const;

  if (name === "arrow-left") {
    return (
      <svg {...commonProps}>
        <path
          d="M19 12H5m5-5-5 5 5 5"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
      </svg>
    );
  }

  if (name === "arrow-right") {
    return (
      <svg {...commonProps}>
        <path
          d="M5 12h14m-5-5 5 5-5 5"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
      </svg>
    );
  }

  if (name === "arrow-up-right") {
    return (
      <svg {...commonProps}>
        <path
          d="M7 17 17 7M9 7h8v8"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
      </svg>
    );
  }

  if (name === "book-open") {
    return (
      <svg {...commonProps}>
        <path
          d="M4.5 5.5h4A3.5 3.5 0 0 1 12 9v9a3.5 3.5 0 0 0-3.5-3.5h-4v-9Zm15 0h-4A3.5 3.5 0 0 0 12 9v9a3.5 3.5 0 0 1 3.5-3.5h4v-9Z"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
      </svg>
    );
  }

  if (name === "check") {
    return (
      <svg {...commonProps}>
        <path
          d="m5 12.5 4.2 4L19 7"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
      </svg>
    );
  }

  if (name === "close") {
    return (
      <svg {...commonProps}>
        <path
          d="m7 7 10 10M17 7 7 17"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="1.8"
        />
      </svg>
    );
  }

  if (name === "grip") {
    return (
      <svg {...commonProps}>
        {[8, 12, 16].flatMap((y) =>
          [9, 15].map((x) => (
            <circle cx={x} cy={y} fill="currentColor" key={`${x}-${y}`} r="1" />
          )),
        )}
      </svg>
    );
  }

  if (name === "pause") {
    return (
      <svg {...commonProps}>
        <path
          d="M9 7v10M15 7v10"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="2"
        />
      </svg>
    );
  }

  if (name === "chevron-up") {
    return (
      <svg {...commonProps}>
        <path
          d="m7 14 5-5 5 5"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
      </svg>
    );
  }

  if (name === "plus" || name === "minus") {
    return (
      <svg {...commonProps}>
        <path
          d={name === "plus" ? "M6 12h12M12 6v12" : "M6 12h12"}
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="1.8"
        />
      </svg>
    );
  }

  if (name === "scheduled") {
    return (
      <svg {...commonProps}>
        <circle cx="12" cy="12" r="7" stroke="currentColor" strokeWidth="1.8" />
        <path
          d="M12 8v4l2.5 1.5"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
      </svg>
    );
  }

  if (name === "skip") {
    return (
      <svg {...commonProps}>
        <path
          d="M5.5 7.5 12.5 12l-7 4.5v-9Zm7 0 7 4.5-7 4.5v-9Z"
          stroke="currentColor"
          strokeLinejoin="round"
          strokeWidth="1.6"
        />
      </svg>
    );
  }

  if (name === "incomplete") {
    return (
      <svg {...commonProps}>
        <circle cx="12" cy="12" r="7" stroke="currentColor" strokeWidth="1.8" />
        <path d="M12 5a7 7 0 0 1 0 14V5Z" fill="currentColor" />
      </svg>
    );
  }

  if (name === "settings") {
    return (
      <svg {...commonProps}>
        <circle
          cx="12"
          cy="12"
          r="2.75"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <path
          d="M19 13.2v-2.4l-2-.7a6 6 0 0 0-.5-1.2l.9-1.9-1.7-1.7-1.9.9a6 6 0 0 0-1.2-.5l-.7-2H9.5l-.7 2a6 6 0 0 0-1.2.5l-1.9-.9L4 7l.9 1.9a6 6 0 0 0-.5 1.2l-2 .7v2.4l2 .7a6 6 0 0 0 .5 1.2L4 17l1.7 1.7 1.9-.9a6 6 0 0 0 1.2.5l.7 2h2.4l.7-2a6 6 0 0 0 1.2-.5l1.9.9L17.4 17l-.9-1.9a6 6 0 0 0 .5-1.2l2-.7Z"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.4"
        />
      </svg>
    );
  }

  if (name === "sparkle") {
    return (
      <svg {...commonProps}>
        <path
          d="M12 3.5c.7 4.4 2.1 5.8 6.5 6.5-4.4.7-5.8 2.1-6.5 6.5-.7-4.4-2.1-5.8-6.5-6.5 4.4-.7 5.8-2.1 6.5-6.5Z"
          stroke="currentColor"
          strokeLinejoin="round"
          strokeWidth="1.5"
        />
        <path
          d="M18.5 16.5c.25 1.5.75 2 2.25 2.25-1.5.25-2 .75-2.25 2.25-.25-1.5-.75-2-2.25-2.25 1.5-.25 2-.75 2.25-2.25Z"
          fill="currentColor"
        />
      </svg>
    );
  }

  if (name === "volume" || name === "volume-off") {
    return (
      <svg {...commonProps}>
        <path
          d="M5 10v4h3l4 3V7L8 10H5Z"
          stroke="currentColor"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
        {name === "volume" ? (
          <path
            d="M15 9.25a4 4 0 0 1 0 5.5M17.5 7a7 7 0 0 1 0 10"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="1.8"
          />
        ) : (
          <path
            d="m15 9 5 5m0-5-5 5"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="1.8"
          />
        )}
      </svg>
    );
  }

  if (name === "route") {
    return (
      <svg {...commonProps}>
        <circle cx="6" cy="17" r="2" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="18" cy="7" r="2" stroke="currentColor" strokeWidth="1.8" />
        <path
          d="M8 17h2.5a2.5 2.5 0 0 0 0-5h3a2.5 2.5 0 0 0 2.5-2.5V9"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="1.8"
        />
      </svg>
    );
  }

  return (
    <svg {...commonProps}>
      <path
        d="m9 7 8 5-8 5V7Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}
