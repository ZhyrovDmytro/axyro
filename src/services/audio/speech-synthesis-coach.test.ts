import { describe, expect, it, vi } from "vitest";

import { SpeechSynthesisAudioCoach } from "./speech-synthesis-coach";

function createFixture() {
  const synthesis = {
    cancel: vi.fn(),
    speak: vi.fn(),
  } as unknown as SpeechSynthesis;
  const createUtterance = (text: string) =>
    ({ text, rate: 1 }) as SpeechSynthesisUtterance;

  return {
    synthesis,
    coach: new SpeechSynthesisAudioCoach(synthesis, createUtterance),
  };
}

describe("SpeechSynthesisAudioCoach", () => {
  it("cancels stale speech before speaking a cue", () => {
    const { coach, synthesis } = createFixture();

    coach.speak("down", { rate: 1.1 });

    expect(synthesis.cancel).toHaveBeenCalledOnce();
    expect(synthesis.speak).toHaveBeenCalledWith(
      expect.objectContaining({ text: "down", rate: 1.1 }),
    );
  });

  it("stops immediately and suppresses cues while disabled", () => {
    const { coach, synthesis } = createFixture();

    coach.setEnabled(false);
    coach.speak("up");

    expect(synthesis.cancel).toHaveBeenCalledOnce();
    expect(synthesis.speak).not.toHaveBeenCalled();
  });

  it("degrades safely without browser speech support", () => {
    const coach = new SpeechSynthesisAudioCoach(null, (text) => {
      return { text } as SpeechSynthesisUtterance;
    });

    expect(coach.supported).toBe(false);
    expect(() => coach.speak("move")).not.toThrow();
    expect(() => coach.stop()).not.toThrow();
  });
});
