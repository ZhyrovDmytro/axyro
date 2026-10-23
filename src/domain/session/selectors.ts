import type { SessionState } from "./session.types";
import type { SessionStep } from "../workout/session-step.types";

export function selectCurrentStep(state: SessionState): SessionStep {
  const step = state.sequence[state.currentIndex];
  if (!step) throw new Error("Session index is outside the workout sequence.");
  return step;
}

export function selectProgressPercent(state: SessionState): number {
  if (state.sequence.length <= 1) return 100;
  return Math.round((state.currentIndex / (state.sequence.length - 1)) * 100);
}

export function selectNextExerciseId(state: SessionState): string | undefined {
  const current = selectCurrentStep(state);
  if (current.type === "completed") return undefined;

  const currentExerciseId = current.exerciseId;
  for (
    let index = state.currentIndex + 1;
    index < state.sequence.length;
    index += 1
  ) {
    const step = state.sequence[index];
    if (!step || step.type === "completed") continue;
    const exerciseId = step.exerciseId;
    if (exerciseId !== currentExerciseId) return exerciseId;
  }

  return undefined;
}

export function selectCompletedActiveSteps(state: SessionState): number {
  return state.sequence
    .slice(0, state.currentIndex)
    .filter((step) => step.type === "active").length;
}

export function selectUpcomingStep(
  state: SessionState,
): SessionStep | undefined {
  return state.sequence
    .slice(state.currentIndex + 1)
    .find(
      (step) =>
        step.type === "active" ||
        step.type === "rest" ||
        step.type === "completed",
    );
}
