import { UiIcon } from "@/components/ui-icon";

type MediaPlaceholderProps = {
  label: string;
  compact?: boolean;
};

export function MediaPlaceholder({
  label,
  compact = false,
}: MediaPlaceholderProps) {
  return (
    <div
      className={`media-placeholder${compact ? " media-placeholder--compact" : ""}`}
    >
      <div className="media-shape" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <p>
        <span className="play-icon" aria-hidden="true">
          <UiIcon name="play" />
        </span>
        {label}
      </p>
    </div>
  );
}
