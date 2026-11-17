import { type ReactNode, useEffect, useRef, useState } from "react";

import { UiIcon } from "@/components/ui-icon";

function animateSheet(dialog: HTMLDialogElement, exiting: boolean) {
  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  const style = getComputedStyle(dialog);
  const current = { transform: style.transform, opacity: style.opacity };
  const hidden = {
    transform: reducedMotion ? "none" : "translateY(calc(100% + 2rem))",
    opacity: 0,
  };
  dialog.getAnimations().forEach((animation) => animation.cancel());
  return dialog.animate(
    exiting ? [current, hidden] : [hidden, { transform: "none", opacity: 1 }],
    {
      duration: reducedMotion ? 120 : exiting ? 200 : 240,
      easing: style.getPropertyValue("--ease-out").trim(),
      fill: "both",
    },
  );
}

export function CalendarDayPanel({
  date,
  children,
  onClose,
  onBack,
}: {
  date: string;
  children: ReactNode;
  onClose: () => void;
  onBack?: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const animationRef = useRef<Animation | null>(null);
  const closingRef = useRef(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const media = window.matchMedia("(min-width: 64rem)");
    const overflow = document.body.style.overflow;
    const update = () => {
      animationRef.current?.cancel();
      closingRef.current = false;
      delete dialog.dataset.closing;
      dialog.close();
      setIsMobile(!media.matches);
      if (media.matches) {
        dialog.show();
        document.body.style.overflow = overflow;
      } else {
        dialog.showModal();
        document.body.style.overflow = "hidden";
        animationRef.current = animateSheet(dialog, false);
      }
      headingRef.current?.focus({ preventScroll: true });
    };
    update();
    media.addEventListener("change", update);
    return () => {
      media.removeEventListener("change", update);
      animationRef.current?.cancel();
      dialog.close();
      document.body.style.overflow = overflow;
    };
  }, []);

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
    if (window.matchMedia("(min-width: 64rem)").matches) {
      dialogRef.current?.scrollIntoView({
        block: "nearest",
        behavior: "instant",
      });
    }
    dialogRef.current
      ?.querySelector(".calendar-day-panel__body")
      ?.scrollTo(0, 0);
  }, [date]);

  function closePanel() {
    const dialog = dialogRef.current;
    if (closingRef.current) return;
    if (!dialog?.matches(":modal")) {
      onClose();
      return;
    }
    closingRef.current = true;
    dialog.dataset.closing = "true";
    const animation = animateSheet(dialog, true);
    animationRef.current = animation;
    void animation.finished.then(onClose, () => {});
  }

  function goBack() {
    if (onBack) onBack();
    else closePanel();
  }

  return (
    <dialog
      ref={dialogRef}
      aria-label={`Selected day: ${date}`}
      aria-modal={isMobile || undefined}
      className="selected-calendar-day calendar-day-panel"
      onCancel={(event) => {
        event.preventDefault();
        goBack();
      }}
      onKeyDown={(event) => {
        const modal = event.currentTarget.matches(":modal");
        if (modal && event.key === "Tab") {
          const controls = [
            ...event.currentTarget.querySelectorAll<HTMLElement>(
              "a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), summary",
            ),
          ].filter((element) => element.getClientRects().length > 0);
          const first = controls[0];
          const last = controls[controls.length - 1];
          if (
            event.shiftKey &&
            (document.activeElement === first ||
              document.activeElement === headingRef.current)
          ) {
            event.preventDefault();
            last?.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first?.focus();
          }
        }
        if (!modal && event.key === "Escape" && !event.defaultPrevented) {
          event.preventDefault();
          goBack();
        }
      }}
      onClick={(event) => {
        if (
          event.target !== event.currentTarget ||
          !event.currentTarget.matches(":modal")
        )
          return;
        const bounds = event.currentTarget.getBoundingClientRect();
        if (
          event.clientX < bounds.left ||
          event.clientX > bounds.right ||
          event.clientY < bounds.top ||
          event.clientY > bounds.bottom
        )
          closePanel();
      }}
      role={isMobile ? "dialog" : "region"}
    >
      <div className="selected-calendar-day__heading">
        <div>
          <span>Selected day</span>
          <h3 ref={headingRef} tabIndex={-1}>
            {date}
          </h3>
        </div>
        <button
          aria-label="Close selected day"
          onClick={closePanel}
          type="button"
        >
          <UiIcon name="close" />
        </button>
      </div>
      <div className="calendar-day-panel__body">{children}</div>
    </dialog>
  );
}
