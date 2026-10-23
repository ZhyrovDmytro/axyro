import { UiIcon } from "@/components/ui-icon";

export function RecoveryVisual({
  compact = false,
  paused = false,
}: {
  compact?: boolean;
  paused?: boolean;
}) {
  return (
    <div
      className={`player-recovery-panel${compact ? " player-recovery-panel--compact" : ""}${paused ? " player-recovery-panel--paused" : ""}`}
      aria-hidden={compact || undefined}
    >
      <span className="player-recovery-symbol">
        <UiIcon name="pause" />
      </span>
      {!compact && <strong>Recovery</strong>}
    </div>
  );
}
