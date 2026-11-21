import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { exercises } from "@/content/exercises";
import { ExerciseMedia, ExercisePreview } from "./exercise-media";

describe.each(exercises)("$name delivery", (exercise) => {
  it("uses only a lazy first-frame poster while browsing", () => {
    const markup = renderToStaticMarkup(
      createElement(ExercisePreview, { exercise }),
    );
    expect(markup).toContain(exercise.media.firstFrameUri);
    expect(markup).toContain('loading="lazy"');
    expect(markup).not.toContain("<video");
    expect(markup).not.toContain(exercise.media.uri);
  });

  it.each([false, true])(
    "loads the playable demo with compact=%s",
    (compact) => {
      const markup = renderToStaticMarkup(
        createElement(ExerciseMedia, { exercise, compact, preload: "auto" }),
      );
      expect(markup).toContain("<video");
      expect(markup).toContain(exercise.media.playbackUri);
      expect(markup).toContain('preload="auto"');
      expect(markup).toContain('muted=""');
      expect(markup).toContain('loop=""');
      if (compact) expect(markup).not.toContain("poster=");
      else expect(markup).toContain("Replay");
    },
  );
});
