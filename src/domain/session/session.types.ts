import type { SessionStep } from "../workout/session-step.types";

export type SessionStatus = "running" | "paused" | "completed";

export type SessionState = {
  sequence: readonly SessionStep[];
  currentIndex: number;
  status: SessionStatus;
};

export type SessionEvent =
  | { type: "COMPLETE_PHASE"; nextIndex?: number }
  | { type: "NEXT" }
  | { type: "PREVIOUS" }
  | { type: "PAUSE" }
  | { type: "RESUME" }
  | { type: "RESTART" };
