# Data Model

> Current account/subscription extension: see [Membership implementation](docs/MEMBERSHIP_IMPLEMENTATION.md), [Authentication](docs/AUTHENTICATION.md), [Billing](docs/billing.md), and [Multi-user data](docs/MULTI_USER_DATA_ARCHITECTURE.md). These replace earlier local-only/no-account scope statements below. Guest access is the single free starter; personalized plans and full access require Pro.


This document defines the conceptual data model. Exact TypeScript types may evolve during implementation.

## Exercise

```ts
type Exercise = {
  id: string;
  slug: string;
  name: string;
  shortDescription: string;
  instructions: string[];
  cues: string[];
  commonMistakes: string[];

  bodyAreas: BodyArea[];
  difficulty: "beginner" | "intermediate" | "advanced";
  roles: ExerciseRole[];
  qualities: TrainingQuality[];
  targetedQualities: string[];
  sessionRoles: SessionSectionType[];
  preparationFor: TrainingQuality[];
  recoveryFor: BodyArea[];
  sessionIntensity: "low" | "moderate" | "high";
  equipment: Equipment[]; // required only
  optionalEquipment?: Exclude<Equipment, "none">[];
  setupRequirements: SetupRequirement[];

  planning: {
    sectionRoles: SessionSectionType[];
    movementPatterns: string[];
    trainingQualities: TrainingQuality[];
    spaceRequirement: "compact" | "moderate" | "large";
    noiseLevel: "quiet" | "moderate" | "high";
    safeWorkSeconds: { min: number; max: number };
    safeRestSeconds: { min: number; max: number };
    avoidForPainAreas: PainArea[];
    regressionExerciseId?: string;
    progressionExerciseId?: string;
    mediaStatus: "production" | "draft";
  };

  laterality: "bilateral" | "unilateral" | "alternating" | "configurable";
  supportedModes: ["timed"];

  defaultPrescription: TimedExerciseDefaults | LegacyReferenceRecommendation;
  tempo: Tempo;

  media: {
    type: "video" | "animation" | "image";
    uri?: string;
    posterUri?: string;
    fallbackUri?: string;
    fallback?: "instructional";
    aspectRatio: string;
    durationSeconds?: number;
    loop: boolean;
    attribution?: string;
    version: string;
    status: "production" | "draft";
    assetKey: string;
    requiredViews: string[];
    notes: string;
  };

  movementFrames: {
    start: MovementFrame;
    end: MovementFrame;
  };

  variantOf?: string;
  easierVariantId?: string;
  harderVariantId?: string;
  equipmentFreeVariantId?: string;
  substitutionGroup?: string;

  defaultGuidance?: GuidanceConfig;
};

type MovementFrame = {
  uri: string;
  alt: string;
  cue: string;
  kind: "position" | "reference";
};
```

The catalog boundary normalizes the legacy `videoUrl` / `posterUrl` authoring
shape into this contract. Production discovery and generation use
`publishedExercises`, which requires complete coaching text and either reviewed
media or an explicit instructional fallback.

Every normalized exercise also exposes exercise-specific start and finish
movement frames. The asset names are derived from the stable exercise ID, so a
movement can never silently fall back to an unrelated body-area image. When
only one correct reference is available, both frame records resolve to that
same image and are marked as `reference`. The first and last coaching
instructions remain the authoritative position descriptions. Distinct frames
alternate once per second; alternation pauses when hidden and is disabled for
reduced-motion users.

The same boundary normalizes older catalog entries into `planning`. New entries
may author it directly. Explicit planning metadata is checked against default
timing and canonical media status. The planner accepts only production entries
with an executable timed default; rep-only source recommendations stay as
reference content and cannot enter a generated session.

## Suggested enums

```ts
type BodyArea =
  | "full-body"
  | "legs"
  | "glutes"
  | "core"
  | "shoulders"
  | "chest"
  | "back"
  | "arms";

type TrainingQuality =
  | "strength"
  | "power"
  | "explosiveness"
  | "stability"
  | "rotation"
  | "anti-rotation"
  | "mobility"
  | "endurance"
  | "warm-up";

type Equipment =
  | "none"
  | "light_dumbbell"
  | "dumbbell"
  | "two_dumbbells";

type SetupRequirement =
  | "floor"
  | "wall"
  | "chair"
  | "mat"
  | "foam_roller"
  | "low_obstacle";

type ExerciseRole =
  | "mobility"
  | "activation"
  | "strength"
  | "stability"
  | "power";

type ExerciseMode = "timed";

type SessionSectionType = "warmup" | "main" | "cooldown";
```

These are starting values, not a final taxonomy.

Floor, wall, and chair describe where/how an exercise is set up, not training
equipment. The user-facing equipment filter is intentionally binary: with a
dumbbell or without a dumbbell. Detailed dumbbell variants remain structured
for future workout requirements. `equipment` lists required resistance only;
`optionalEquipment` records optional weights and never gates bodyweight planning.
Exercise guides and the player explain that these movements can use empty hands.
Workout summaries report required weights whenever any movement requires them.

## Sport association

```ts
type SportExerciseProfile = {
  sport: "padel" | "tennis" | "badminton" | "pickleball" | "table_tennis";
  exerciseId: string;
  bodyAreas: BodyArea[];
  relevance: "foundation" | "high" | "core";
  priority: number;
  movementTags: string[];
  goals: string[];
  problemsAddressed: string[];
  sportSpecificReason: string;
};
```

Exercise mechanics remain global. Sport profiles provide padel problem
relevance through `problemsAddressed` and the join used by
`Sport -> Body Area -> Exercises` queries. Workouts continue to point directly
to stable `Exercise.id` values.

## Exercise defaults and executable workout prescriptions

New exercise content uses time-based defaults:

```ts
type TimedExerciseDefaults = {
  workDurationSeconds: number;
  restDurationSeconds: number;
  rounds: number;
  sideMode: "simultaneous" | "separate" | "alternating";
  cadenceMode:
    | "controlled"
    | "metronome"
    | "alternating_metronome"
    | "self_paced"
    | "explosive_reset";
};

type LegacyReferenceRecommendation = {
  sets: RecommendationRange;
  reps?: RecommendationRange;
  repsPerSide?: RecommendationRange;
  durationSeconds?: RecommendationRange;
  restSeconds: RecommendationRange;
};
```

Some earlier reviewed catalog entries still preserve rep-based source
recommendations as `LegacyReferenceRecommendation`. Those values are reference
metadata only and are not executable by the player. New content must not add
rep-based defaults.

MVP `WorkoutItem.prescription` remains exclusively time-based. A future
explicit product phase may add a rep-driven player, but the production exercise
catalog does not silently change current timer behavior.

## Exercise tempo

```ts
type RecommendationRange = { min: number; max: number };

type Tempo =
  | { mode: "controlled"; pattern: string }
  | { mode: "metronome"; defaultBpm: number }
  | {
      mode: "alternating_metronome";
      defaultBpm: number;
      bpmRange?: RecommendationRange;
      cues: string[];
    }
  | { mode: "self_paced" }
  | { mode: "explosive_reset"; resetSeconds?: RecommendationRange };
```

The current audio adapter can use alternating cues where configured. Other
tempo modes are modeled now so later player/audio work does not require a
catalog migration.

## Guidance configuration

```ts
type GuidanceConfig = {
  enabledByDefault: boolean;
  pattern: GuidancePattern;
  bpm?: number;
  secondsPerCue?: number;
};

type GuidancePattern =
  | { type: "alternating"; cues: string[] } // e.g. ["1", "2"]
  | { type: "rep-count" }
  | { type: "words"; cues: string[] }       // e.g. ["down", "up"]
  | { type: "none" };
```

The data model deliberately avoids assuming that every exercise uses the same `1 / 2` pattern.

### Model-facing exercise candidates

Model-assisted planning receives a separate compact
`ModelExerciseCandidate` projection rather than `Exercise`. It includes the
stable ID, short name, difficulty, body areas, equipment/setup requirements,
section roles, movement patterns, training qualities, bounded timing, cadence,
side mode, and compact sport relevance tags. It intentionally excludes media,
long descriptions, instructions, cues, common mistakes, guidance copy, and
other presentation content. Eligibility and bounded relevance retrieval happen
before this projection is serialized.

## Workout

```ts
type Workout = {
  id: string;
  slug: string;
  name: string;
  shortDescription: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  focus: TrainingQuality[];
  estimatedMinutes: number;
  items: WorkoutItem[];
};
```

## Workout item / prescription

Planned workouts use the same time-based item model as catalog workouts. A plan stores a validated workout snapshot so that a per-session edit never mutates the source workout.

## Athlete profile and training plan

```ts
type AthleteProfile = {
  sport: "padel" | "other";
  experience: "beginner" | "intermediate" | "advanced";
  sessionsPerWeek: number;
  sessionDurationMinutes: number; // new choices: 5 | 10 | 20; default: 10
  preferredDays: Weekday[];
  equipment: PlanEquipment[];
  goals: TrainingGoal[];
  developmentAreas: DevelopmentArea[]; // up to 3 non-painful priorities
  padelLimitations: PadelLimitation[];
  painAreas: PainArea[];
  matches: Array<{
    date: string; // YYYY-MM-DD
    importance: "normal" | "important";
  }>;
};

type PlannedWorkout = {
  id: string;
  scheduledDate: string;
  sourceWorkoutId: string;
  workout: Workout;
  targetDurationSeconds: number;
  estimatedDurationSeconds: number;
  durationDeltaSeconds: number;
  durationStatus:
    | "on_target"
    | "close"
    | "shorter_than_requested"
    | "longer_than_requested";
  adjustments: SessionAdjustment[];
  weekNumber: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
  progressionPhase: "foundation" | "build" | "peak" | "consolidate";
  progression: {
    reason: "weekly_progression";
    phase: ProgressionPhase;
    changes: ProgressionChange[];
  };
  feedbackAdaptations: FeedbackAdaptation[];
  sections: SessionSection[];
  originalSessionSnapshot: OriginalSessionSnapshot;
  todayAdaptations: SessionAdaptation[];
  isEdited: boolean;
  status: SessionLifecycleStatus;
};

type SessionSection = {
  type: "warmup" | "main" | "cooldown";
  items: WorkoutItem[];
};

type TrainingPlan = {
  version: 1;
  profile: AthleteProfile;
  startDate: string;
  endDate: string;
  sessions: PlannedWorkout[];
  games: GameEvent[];
  generation: {
    source: "deterministic" | "openai";
    profileVersion: string;
    exerciseCatalogVersion: string;
    plannerVersion: string;
    explanation: string;
    model: string | null;
    fallbackReason?: "disabled" | "unconfigured" | "model-failed" | "request-failed";
  };
  generatedAt: string;
  lastRebalancedAt?: string;
};

type AdaptationProfile = {
  recentDifficultyTrend: "too-easy" | "just-right" | "too-hard";
  avoidExercises: string[];
  preferredExercises: string[];
  temporaryLoadAdjustment: -1 | 0 | 1;
};
```

The adaptation profile is updated after feedback and affects future proposals;
it never rewrites completed workout snapshots. The OpenAI response is a strict
`ModelPlanIntent` containing only an explanation and stable exercise-ID choices.
Executable timing remains outside that schema and is owned by the deterministic
compiler.

Questionnaire labels are presentation only. The submitted and persisted profile
uses the stable identifiers above. Padel limitations are training priorities;
pain areas are separate optional safety constraints. Upcoming matches are part
of the normalized profile because their dates and importance change recovery
spacing in the generated schedule.

`PlannedWorkout` is the persisted plan aggregate's current session record; it
is not a reusable `WorkoutDefinition`. The lifecycle boundaries are:

```text
WorkoutDefinition -> generated prescription -> PlannedSession
                  -> optional AdaptedSession -> SessionActivity
```

The generated prescription is an internal deterministic pipeline value. The
durable activity record owns three separate immutable views: `plannedSnapshot`
for the original dated prescription, optional `adaptedSnapshot` for the version
accepted through **Adapt today**, and `executedSnapshot` for what the player
actually completed or skipped. This separation avoids reconstructing history
from either the mutable plan or the current workout catalog.

Calendar dates are local `YYYY-MM-DD` keys rather than UTC instants because the planning unit is the athlete's local day.

`PadelChallenge` values describe performance limitations and influence workout scoring. `PainArea` values are protective flags and exclude catalog workouts whose exercises target a mapped body area. Both arrays default to empty when older locally stored profiles are read, which preserves compatibility with the first plan schema version.

`SportExerciseProfile` also declares `trainingFunction` as `capacity`,
`performance`, `transfer`, `mobility`, or `recovery`. Capacity builds the general
physical base; performance develops a quality such as acceleration or braking;
transfer connects that quality to a recognizable court movement. The taxonomy
stays outside the global exercise definition because it is sport-specific.

```ts
type WorkoutItem = {
  id: string;
  exerciseId: string;

  sets: number;
  prescription: {
    type: "timed";
    durationSeconds: number;
    perSide?: boolean;
  };

  restAfterSetSeconds?: number;
  restAfterExerciseSeconds?: number;
  guidanceOverride?: Partial<GuidanceConfig>;
  notes?: string[];
  role?: "core" | "accessory" | "optional";
  priority?: number;
  minSets?: number;
  maxSets?: number;
  minWorkSeconds?: number;
  maxWorkSeconds?: number;
};
```

The exercise planning record defines the safe timing envelope. Selection copies
that envelope onto the generated item, then adds a session-specific role and
priority. A movement can be essential in one session and optional in another
without duplicating its safety metadata. Standalone predefined workouts may
still author narrower item bounds. Core items are never removed to satisfy a
duration target. Adjustments remain machine-readable facts.

Generated sessions store exactly three ordered domain sections: warm-up, main,
and cooldown. For plans, the main block is assembled from eligible exercises
and projected into a generated `Workout` only after selection so the player
contract stays stable. `PlannedWorkout.sections` is authoritative for the
complete session. Predefined workouts remain standalone library content, not
plan templates. Older stored plans migrate without inventing unseen support
work.

All complete-session estimates use `calculateSessionSectionsDuration` and
seconds internally. It flattens the ordered sections once and uses the same
calculation as the executable player sequence: active work, between-set and
between-exercise recovery, ready/transition countdowns, and per-side switch
countdowns. The target duration includes all three sections.

Complete plan proposals are assessed with two deliberately separate outputs:

```ts
type PlanQualityReport = {
  valid: boolean;
  hardErrors: Array<{
    code:
      | "unknown_exercise"
      | "pain_conflict"
      | "unavailable_equipment"
      | "duration_out_of_tolerance"
      | "invalid_timing"
      | "hard_strength_before_match"
      | "missing_warmup"
      | "missing_cooldown"
      | "unpublished_exercise";
    sessionId: string;
    exerciseId?: string;
    message: string;
  }>;
  softScore: number;
  softScoreMaximum: 100;
  softMetrics: SoftPlanQualityMetric[];
};
```

Hard errors are repair input and cannot be traded against the soft score. The
model workflow permits one repair and then uses a deterministic safe fallback.
Support-section timing is validated against its fixed session item bounds;
main-section timing must also remain inside the exercise catalog's safe timing
envelope.

Support-section budgets are domain configuration, not UI constants:

| Total target | Warm-up minimum / preferred | Cooldown minimum / preferred |
| --- | --- | --- |
| 10 min | 90 / 105 sec | 60 / 75 sec |
| 15 min | 120 / 135 sec | 60 / 90 sec |
| 20 min | 150 / 180 sec | 90 / 120 sec |
| 30 min | 240 / 270 sec | 120 / 150 sec |

The fitter reserves these support budgets and changes the main section first.
Support exercises use fixed, conservative work bounds so normal progression and
effort scaling cannot turn preparation or recovery into progressive overload.

The calendar date determines the explicit progression week; page views and
completion count never advance it. Each weekly slot keeps the same source
workout across the block for movement continuity. `ProgressionChange` contains
only structured facts—bounded work-duration changes, round changes, or recovery
changes—so presentation copy remains outside the domain. Existing stored plans
are migrated with their calendar-derived phase and an empty feedback-adaptation
history, with no retroactive prescription changes.

Each completion is stored as an immutable `CompletedWorkoutSession` with a
stable completion ID, plan session ID (or standalone attempt ID), workout ID,
start/completion timestamps, effort, actual duration, and a compact
`WorkoutSessionSnapshot`. The
snapshot contains exercise IDs plus section identity, planned/completed/skipped
status, actual sets, work and recovery timing, focus/body-area metadata,
duration, and progression context. A
`WorkoutFeedbackEvent` links to exactly one completion and stores Too easy, Just
right, Too hard, or Pain/discomfort plus the affected area when applicable.
An immutable `WorkoutFeedbackDecisionEvent` records Apply or Keep without
rewriting the original feedback; kept events are excluded when a new plan is
generated. Aggregate recent-workout counts remain a separate read model.

### Activity lifecycle

`SessionActivity` is the durable chronological record for a planned or executed
session. It is separate from the mutable current plan and uses the explicit
states `scheduled`, `in-progress`, `completed`, `skipped`, `missed`,
`cancelled`, and `incomplete`.

- `scheduled` remains actionable through its scheduled local calendar day;
- `in-progress` is written when the player starts and has one matching active
  execution snapshot;
- `completed` is written only when the deterministic player reaches its
  completed step;
- `skipped` records an explicit user choice and `skippedAt`;
- `missed` is materialized when a still-scheduled date is earlier than the
  current local date, never merely because a UTC day changed;
- `cancelled` records plan removal or regeneration and `cancelledAt`.
- `incomplete` records an explicit early finalization, its executed snapshot,
  active duration, and `incompleteAt` without pretending the workout completed.

Terminal records are not recreated from the current workout catalog or current
plan. A scheduled record keeps its original planned snapshot plus an optional,
separate adapted snapshot; a completion adds a separate executed snapshot,
selected effort, timestamps, actual duration, and a link to immutable feedback.
Re-syncing a plan can update scheduled or matching in-progress records
and cannot rewrite completed, skipped, missed, or cancelled history. Completion
writes are idempotent by session ID.

Actual duration means wall-clock time from player start until its authoritative
completed step, minus time spent paused. It does not claim per-exercise timing.
Skipped, missed, and cancelled records show no actual duration rather than zero.
Leaving the player saves the active snapshot and does not complete the session.
The user can later resume it or explicitly save it as incomplete. Restores are
paused and use the persisted phase remainder, so background time is excluded.
Standalone attempts follow the same rule and can appear as incomplete, but
never as completed unless the reducer reaches the completed step.

`FeedbackAdaptation` stores only explainable structured facts: source feedback
event ID, rating, optional affected area, bounded prescription changes, and
`block_progression` safety markers. Normal effort feedback targets one
comparable future session and one progression lever. Pain can target several
future sessions because the same safety block follows the affected body area.

`SessionAdaptation` is a structured, presentation-free union for a one-session
override:

```ts
type SessionAdaptation =
  | { type: "less_time"; requestedDurationSeconds: number }
  | { type: "equipment_unavailable"; equipmentIds: Equipment[] }
  | { type: "body_area_discomfort"; bodyAreas: TodayBodyArea[] }
  | {
      type: "replace_exercise";
      exerciseId: string;
      replacementExerciseId: string;
    }
  | { type: "lighter_session" };
```

`originalSessionSnapshot` contains the immutable workout, duration fields, and
reason ledger before today overrides. `PlannedWorkout.workout` is the adapted
prescription offered to the player. Completion history stores the performed
snapshot, the original lightweight item snapshot, and `todayAdaptations`, so a
future History UI can reconstruct “planned” versus “performed” without querying
the mutable exercise catalog.

`PlannedWorkout.adjustments` is the final ordered explanation ledger, rather
than a duration-only log. Its stable `source` is one of `base_prescription`,
`weekly_progression`, `feedback`, `safety`, `today_adaptation`, or
`duration_fit`. Progression entries include the phase;
feedback entries include the immutable feedback event ID and bounded delta;
safety entries include the affected area; today-adaptation entries identify
shortening, replacement/removal, or lighter-day levers; and duration-fit entries
retain the target-duration reason. This is the source used by “Why this
workout?” UI.

## Why exercise and prescription are separate
`Lateral Skater Bound` may appear in multiple workouts with different timed prescriptions:
- 3 × 20 seconds per side for explosive power;
- 2 × 30 seconds per side in a general athletic workout;
- 40 seconds alternating in a conditioning circuit.

The canonical exercise remains one record while each workout controls dosage.

## Executable session step
Workout definitions should be converted to a normalized executable sequence.

Conceptually:

```ts
type SessionStep =
  | ReadyStep
  | ActiveStep
  | RestStep
  | SideTransitionStep
  | CompletedStep;
```

Exercise recovery is followed directly by the next exercise's `ReadyStep`.
There is no separate exercise-transition step or interstitial screen.

An `ActiveStep` should already know enough for the player to render it without reinterpreting the entire workout definition.

Every unilateral exercise declares a `switchTarget` of `hand`, `leg`, or
`side`. The sequence builder copies it into side-transition steps so visual and
spoken guidance can use the exercise-appropriate instruction.

Example:

```ts
type ActiveStep = {
  type: "active";
  workoutItemId: string;
  exerciseId: string;
  sectionType: "warmup" | "main" | "cooldown";
  sectionExerciseIndex: number;
  sectionExerciseCount: number;
  setNumber: number;
  totalSets: number;
  side?: "left" | "right";
  prescription: { type: "timed"; durationSeconds: number };
  guidance: GuidanceConfig;
};
```

## User preferences

```ts
type UserPreferences = {
  audioEnabled: boolean;
  preferredIntensity: "light" | "standard" | "challenging";
};
```

Guidance cadence is derived from the selected effort preset, so it does not need
a second independently persisted multiplier in the MVP.

```ts
type WorkoutActivity = {
  workoutId: string;
  lastStartedAt: string;
  lastCompletedAt?: string;
  completionCount: number;
  lastIntensity: "light" | "standard" | "challenging";
  lastFeedback?: {
    value: "too-easy" | "just-right" | "too-hard" | "pain-or-discomfort";
    recordedAt: string;
  };
};
```

Workout activity is lightweight resume/discovery metadata, not detailed analytics
or transient phase progress.

## Session effort

```ts
type IntensityLevel = "light" | "standard" | "challenging";
```

`Workout.timingMode?: "fixed-budget"` marks prescriptions whose effort is already
compiled into work/recovery seconds. Player snapshots must not apply effort a
second time. Quick starts use `buildDailyWorkout` with a `DailyDuration` of
5, 10 or 20. Ready time, side transitions and recovery count toward the exact
budget; unilateral work always retains both sides. Authored interval maxima are
preserved. Longer sessions repeat short intervals rather than extending holds.

Planned sessions use `applyBudgetedEffort` on the main block, retaining warm-up
and cooldown. Work/recovery exchanges preserve total session time, respect
item bounds, and never extend explosive intervals. Cadence uses the selected
effort independently.

The stored profile schema still reads legacy whole-minute values from 5–30.
New setup and API requests offer only 5/10/20; editing a legacy nonstandard
preference selects 10. Existing valid plans are not silently rewritten.

The first version does not infer fitness or effort from personal or health data.
It does not collect sex, age, height, weight or free-form health notes. Optional
structured discomfort areas are the only health-related profile input and are
used solely for conservative exercise exclusion and progression safeguards.

## Future custom workout compatibility
A future custom workout should use the same `Workout` / `WorkoutItem` domain structure and workout player.

The main difference should be its source/ownership metadata, not a second execution engine.
