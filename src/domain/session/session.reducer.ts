import type { SessionEvent, SessionState } from "./session.types";
import type { SessionStep } from "../workout/session-step.types";

export function createSessionState(
  sequence: readonly SessionStep[],
  restored?: Pick<SessionState, "currentIndex">,
): SessionState {
  if (sequence.length === 0) {
    throw new Error("A workout session requires at least one sequence step.");
  }

  return {
    sequence,
    currentIndex: restored?.currentIndex ?? 0,
    status:
      sequence[restored?.currentIndex ?? 0]?.type === "completed"
        ? "completed"
        : restored
          ? "paused"
          : "running",
  };
}

function moveTo(state: SessionState, targetIndex: number): SessionState {
  const currentIndex = Math.min(
    Math.max(targetIndex, 0),
    state.sequence.length - 1,
  );
  const target = state.sequence[currentIndex];

  return {
    ...state,
    currentIndex,
    status:
      target?.type === "completed"
        ? "completed"
        : state.status === "paused"
          ? "paused"
          : "running",
  };
}

export function sessionReducer(
  state: SessionState,
  event: SessionEvent,
): SessionState {
  switch (event.type) {
    case "COMPLETE_PHASE":
      return state.status === "paused"
        ? state
        : moveTo(state, event.nextIndex ?? state.currentIndex + 1);
    case "NEXT":
      return moveTo(state, state.currentIndex + 1);
    case "PREVIOUS":
      return moveTo(state, state.currentIndex - 1);
    case "PAUSE":
      return state.status === "running"
        ? { ...state, status: "paused" }
        : state;
    case "RESUME":
      return state.status === "paused"
        ? { ...state, status: "running" }
        : state;
    case "RESTART":
      return { ...state, currentIndex: 0, status: "running" };
  }
}
