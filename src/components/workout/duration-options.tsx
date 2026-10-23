"use client";

import {
  dailyDurations,
  type DailyDuration,
} from "@/domain/workout/daily-duration";

export function DurationOptions({
  value,
  onChange,
}: {
  value: number;
  onChange: (minutes: DailyDuration) => void;
}) {
  return (
    <fieldset className="daily-duration">
      <legend>Make time for movement.</legend>
      <p>
        10 minutes is your daily starting point. Halve it or double it when you
        need.
      </p>
      <div className="daily-duration__options">
        {dailyDurations.map((minutes) => (
          <label
            key={minutes}
            className={value === minutes ? "is-selected" : ""}
          >
            <input
              type="radio"
              name="daily-duration"
              value={minutes}
              checked={value === minutes}
              onChange={() => onChange(minutes)}
            />
            <strong>
              {minutes}
              <span> min</span>
            </strong>
            <small>
              {minutes === 5
                ? "Short on time"
                : minutes === 10
                  ? "Daily default"
                  : "Go a little longer"}
            </small>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
