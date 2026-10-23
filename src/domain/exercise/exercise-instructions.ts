import type { Exercise } from "./exercise.types";

export function getExerciseInstructionContent(exercise: Exercise) {
  return {
    purpose: exercise.shortDescription,
    setup: exercise.instructions[0],
    steps: exercise.instructions.slice(1),
    techniqueCues: exercise.cues,
    safetyCues: exercise.commonMistakes,
  };
}
