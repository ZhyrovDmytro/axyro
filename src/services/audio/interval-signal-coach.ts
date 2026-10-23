import type { IntervalSignal } from "@/domain/audio/interval-signals";

export class IntervalSignalCoach {
  private context: AudioContext | null = null;
  private oscillators: OscillatorNode[] = [];
  private pending: Array<IntervalSignal & { atMs: number }> = [];

  constructor(private readonly Context: typeof AudioContext | null) {}
  get supported() {
    return this.Context !== null;
  }

  unlock = () => {
    if (!this.Context) return;
    try {
      this.context ??= new this.Context();
      if (this.context.state === "running") this.playPending();
      else
        void this.context
          .resume()
          .then(() => this.playPending())
          .catch(() => {});
    } catch {
      /* Visual cues remain available if browser audio is blocked. */
    }
  };

  schedule(signals: readonly IntervalSignal[]) {
    this.stop();
    const now = Date.now();
    this.pending = signals.map((signal) => ({
      ...signal,
      atMs: now + signal.offsetMs,
    }));
    this.unlock();
  }

  private playPending() {
    const context = this.context;
    if (!context || context.state !== "running") return;
    const signals = this.pending;
    this.pending = [];
    const now = Date.now();
    for (const signal of signals) {
      if (signal.atMs < now - 100) continue;
      const at = context.currentTime + Math.max(0, signal.atMs - now) / 1000;
      const duration = signal.kind === "countdown" ? 0.075 : 0.28;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(
        signal.kind === "countdown" ? 560 : 880,
        at,
      );
      gain.gain.setValueAtTime(0, at);
      gain.gain.linearRampToValueAtTime(0.16, at + 0.008);
      gain.gain.linearRampToValueAtTime(0, at + duration);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(at);
      oscillator.stop(at + duration);
      this.oscillators.push(oscillator);
      oscillator.onended = () => {
        oscillator.disconnect();
        gain.disconnect();
        this.oscillators = this.oscillators.filter(
          (node) => node !== oscillator,
        );
      };
    }
  }

  stop() {
    this.pending = [];
    for (const oscillator of this.oscillators) oscillator.stop();
    this.oscillators = [];
  }

  dispose() {
    this.stop();
    if (this.context) void this.context.close().catch(() => {});
  }
}
