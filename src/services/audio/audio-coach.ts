export type SpeakOptions = {
  rate?: number;
};

export interface AudioCoach {
  readonly supported: boolean;
  speak(text: string, options?: SpeakOptions): void;
  stop(): void;
  setEnabled(enabled: boolean): void;
}
