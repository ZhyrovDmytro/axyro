import type { AudioCoach, SpeakOptions } from "./audio-coach";

type UtteranceFactory = (text: string) => SpeechSynthesisUtterance;

export class SpeechSynthesisAudioCoach implements AudioCoach {
  private enabled = true;

  constructor(
    private readonly synthesis: SpeechSynthesis | null,
    private readonly createUtterance: UtteranceFactory,
  ) {}

  get supported(): boolean {
    return this.synthesis !== null;
  }

  speak(text: string, options: SpeakOptions = {}): void {
    if (!this.enabled || !this.synthesis) return;

    this.synthesis.cancel();
    const utterance = this.createUtterance(text);
    utterance.rate = options.rate ?? 1;
    this.synthesis.speak(utterance);
  }

  stop(): void {
    this.synthesis?.cancel();
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) this.stop();
  }
}

export function createBrowserAudioCoach(): AudioCoach {
  const synthesis =
    typeof window !== "undefined" && "speechSynthesis" in window
      ? window.speechSynthesis
      : null;
  const createUtterance: UtteranceFactory = (text) =>
    new SpeechSynthesisUtterance(text);

  return new SpeechSynthesisAudioCoach(synthesis, createUtterance);
}
