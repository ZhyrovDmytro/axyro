import type {
  GuidanceConfig,
  SessionSectionType,
  SwitchTarget,
} from "../exercise/exercise.types";

export type Side = "left" | "right";

type ExerciseStep = {
  exerciseId: string;
  workoutItemId: string;
  sectionType: SessionSectionType;
  sectionExerciseIndex: number;
  sectionExerciseCount: number;
  sectionStart?: boolean;
};

export type ReadyStep = ExerciseStep & {
  type: "ready";
  durationSeconds: number;
  announceNextExercise?: boolean;
};

export type ActiveStep = ExerciseStep & {
  type: "active";
  setNumber: number;
  totalSets: number;
  side?: Side;
  announceWorkoutStart?: boolean;
  announceStartAfterSwitch?: boolean;
  prescription: { type: "timed"; durationSeconds: number };
  guidance: GuidanceConfig;
};

export type SideTransitionStep = ExerciseStep & {
  type: "side-transition";
  from: Side;
  to: Side;
  switchTarget: SwitchTarget;
  durationSeconds: number;
};

export type RestStep = ExerciseStep & {
  type: "rest";
  after: "set" | "exercise";
  durationSeconds: number;
  nextExerciseId: string;
};

export type CompletedStep = { type: "completed" };

export type SessionStep =
  ReadyStep | ActiveStep | SideTransitionStep | RestStep | CompletedStep;
