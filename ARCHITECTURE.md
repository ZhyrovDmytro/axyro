# Architecture

> Current account/subscription extension: see [Membership implementation](docs/MEMBERSHIP_IMPLEMENTATION.md), [Authentication](docs/AUTHENTICATION.md), [Billing](docs/billing.md), and [Multi-user data](docs/MULTI_USER_DATA_ARCHITECTURE.md). These replace earlier local-only/no-account scope statements below. Guest access is the single free starter; personalized plans and full access require Pro.


## Architecture goals
- Ship the first useful version quickly.
- Keep content independent from UI.
- Make the workout engine deterministic and testable.
- Avoid a backend until it solves a real requirement.
- Keep a clear migration path to user-created/cloud workouts.

## Recommended MVP architecture

```text
Browser
  |
  +-- Next.js UI
  |     +-- Discover/Home
  |     +-- Exercise Library
  |     +-- Workout Library
  |     +-- Workout Detail
  |     +-- Workout Player
  |     +-- Training Plan Setup / Calendar / Workout Editor
  |
  +-- Domain layer
  |     +-- exercise schemas
  |     +-- workout schemas
  |     +-- sequence builder
  |     +-- workout session reducer/state machine
  |     +-- authoritative phase clock
  |     +-- effort/intensity scaling
  |     +-- tempo/audio scheduler
  |     +-- athlete profile and training-plan schemas
  |     +-- deterministic plan generator/rebalancer
  |
  +-- Content repositories
  |     +-- exercises.ts/json
  |     +-- sport-exercise-profiles.ts/json
  |     +-- workouts.ts/json
  |
  +-- Browser services
        +-- SpeechSynthesis adapter
        +-- localStorage persistence adapter
        +-- media/video

Optional server boundary
  |
  +-- POST /api/training-plan
        +-- bounded model candidate projection
        +-- OpenAI Structured Outputs request
        +-- deterministic compiler + quality validator
        +-- one repair attempt + deterministic fallback
```

No database is required. The application remains fully usable with deterministic
planning when the optional server-side AI planner is disabled, unconfigured, or
unavailable.

## Content publication boundary

The authored catalogs contain both production and draft material. Drafts stay
in the validated domain model so taxonomy and substitution coverage can be
planned before assets arrive. Public workout discovery exposes only the small
`starterWorkouts` shelf for immediate, non-personalized sessions. Plan generation
uses production, executable timed exercises and never uses predefined workouts
as templates.

`ExerciseMedia` owns loading, reduced-motion autoplay, play/pause, replay,
retry, and fallback behavior. Media failure never reloads the page or changes
the workout timer. The current exercise preloads automatically and the next
preview requests metadata only.

## Recommended directory structure

```text
src/
  app/
    page.tsx
    exercises/
      page.tsx
      [exerciseId]/page.tsx
    workouts/
      page.tsx
      [workoutId]/page.tsx
      [workoutId]/start/page.tsx
  components/
    exercise/
    workout/
    player/
    ui/
  domain/
    exercise/
      exercise.schema.ts
      exercise.types.ts
    workout/
      workout.schema.ts
      workout.types.ts
      build-workout-sequence.ts
    session/
      session.types.ts
      session.reducer.ts
      selectors.ts
  services/
    audio/
      audio-coach.ts
      speech-synthesis-coach.ts
    persistence/
      preferences-repository.ts
      local-preferences-repository.ts
  content/
    exercises.ts
    workouts.ts
  hooks/
  lib/
  test/
```

Adjust naming to repository conventions if the project already exists.

## Domain boundaries

### Content
Canonical exercise/workout definitions.

Content should be serializable. Avoid React elements, callback functions, or browser objects inside definitions.

New exercise defaults are time-based records containing work duration, rest
duration, rounds, side mode, and cadence mode. Catalog workout items remain
authoritative for the authored main block and may override those library
defaults; generated plan sections are authoritative for the full session.

Exercises are global movement records. A separate `SportExerciseProfile`
associates an exercise with a sport and sport-facing body area, ranking,
movement tags, goals, problems addressed, and explanation. Normalized exercise
planning metadata owns section suitability, movement patterns, qualities,
space/noise needs, timing bounds, pain exclusions, variants, and media
readiness. Library selectors resolve profiles to exercises:

```text
Sport -> SportExerciseProfile -> global Exercise
Body Area --------------------^
Workout ----------------------> Exercise.id
```

This keeps Padel-specific meaning out of generic exercise mechanics. Tennis or
Badminton can reuse the same exercise ID. Adding a sport or body area is a
content/association change, not a new UI or workout engine.

Exercise equipment contains only load implements (none or dumbbell variants).
Environmental needs such as floor, wall, or chair are stored separately as
setup requirements and are not exposed as equipment-filter choices.

### Sequence builder
Transforms ordered session sections into executable workout steps/phases.

Generated sessions own three explicit sections in order: `warmup`, `main`, and
`cooldown`. The generated `Workout.items` is the assembled main block;
`PlannedWorkout.sections` is authoritative for the complete session. Section
boundaries are never inferred from names or exercise order.

All active steps are timed. Effort scaling is applied to the normalized sequence before the session starts so the reducer/player receives final work and rest durations.

Example conceptual output:

```text
READY(exercise A)
ACTIVE(exercise A, set 1, left)
SIDE_TRANSITION
ACTIVE(exercise A, set 1, right)
REST
ACTIVE(exercise A, set 2, left)
...
READY(exercise B)
...
COMPLETE
```

This separates workout semantics from the player UI.

### Session engine
Owns current sequence index/state and events such as:
- START
- TICK
- PAUSE
- RESUME
- NEXT
- PREVIOUS
- COMPLETE_PHASE

Timers should feed events into the session engine rather than contain business rules themselves.
Audio and effort preferences sit outside the session reducer because they do not
change deterministic phase transitions.

### Audio coach
The player schedules nonverbal countdown and transition tones through
`IntervalSignalCoach`. The retained speech adapter implements this legacy
interface:

```ts
interface AudioCoach {
  speak(text: string, options?: SpeakOptions): void;
  stop(): void;
  setEnabled(enabled: boolean): void;
}
```

A higher-level tempo scheduler can decide *when* and *what* to say.

The player uses `IntervalSignalCoach` and `buildIntervalSignals` to queue countdown
and transition tones on the Web Audio clock for the remaining sequence. It
cancels that queue on pause, mute, manual navigation, or exit, and rebuilds it from
remaining time on resume. Native audio scheduling avoids per-second background
timer dependence. Unsupported or blocked audio degrades to visual cues. The
speech adapter and cadence scheduler remain available as unused legacy services.

Phase expiry reports both its original deadline and the time the browser observed
it. `advanceExpiredPhases` skips expired phases in one deterministic update and
carries the correct start time into the current phase. Completed set records
include work elapsed while background callbacks were throttled. Tab visibility
does not dispatch Pause; close/unload still records a paused resume point.

## Rendering strategy
Use server components for static/library surfaces where convenient and client components only where browser state/APIs are required.

Workout player is a client-side interactive experience.

Exercise/workout content can initially be imported at build time.

## Data persistence

### MVP
Local storage only.

Suggested persisted object:

```ts
type UserPreferences = {
  audioEnabled: boolean;
  guidanceCadence: "slower" | "normal" | "faster";
  keepScreenAwake: boolean;
  preferredIntensity: "light" | "standard" | "challenging";
};
```

Recent-workout metadata remains a bounded aggregate with the workout ID, latest
start/completion timestamps, completion count, and last used effort. Completion
history is separate and append-only: every finished session records its plan
session identity, actual effort, completion time and a lightweight snapshot of
the prescription that ran. Optional feedback is a second immutable event linked
to that completion. This prevents a later attempt at the same workout from
overwriting the evidence used for adaptation. Legacy aggregate records migrate
without inventing prescription snapshots that were never stored.

Both records are validated on read. Malformed, blocked, or quota-limited storage
falls back safely without interrupting the active workout. UI consumers depend on
repository interfaces rather than calling `localStorage` directly.

The training plan is stored separately as `veyro.training-plan.v1`. It contains
the validated athlete profile, 60-day range, planned workout snapshots, match
events, edited-copy state, generation timestamps, generated explanation, source,
model (when applicable), and profile/catalog/planner versions. Snapshots prevent
later catalog changes from silently changing an already scheduled session.
Canonical workouts remain immutable. Repository reads and writes also enforce
exercise-catalog referential integrity across the complete plan aggregate. A
stored plan containing any unknown exercise ID is cleared before it can reach
the workout editor or player; the separately persisted athlete profile remains
available to build a valid replacement plan.

Activity history is stored through `WorkoutActivityRepository`, not derived
from whichever sessions remain in `TrainingPlan`. Plan synchronization creates
or refreshes scheduled activity snapshots, explicitly cancels removed future
sessions, and preserves terminal records. Repository reads materialize a past
still-scheduled session as missed by comparing `YYYY-MM-DD` local calendar keys.
This keeps today's session actionable for its full local day and avoids a
UTC-midnight cutoff.

Plan updates derive the next immutable plan before scheduling React state. The
training-plan, profile, and activity repository writes then run outside React's
state-updater callback so their storage notifications cannot synchronously
update subscribers during render.

The workout player is the sole completion authority. It records start and
completion timestamps, an immutable executed snapshot, selected effort, and
elapsed duration excluding pauses. Repository completion writes are idempotent
per session so remounting a completed UI cannot increment history twice.

Active execution state is stored through `WorkoutSessionRepository` under the
versioned `veyro.active-workout.v1` key. The record contains the stable plan,
activity, session and workout identities; sequence fingerprint; current
section, exercise, set and interval; paused remaining milliseconds; completed
set keys; per-step statuses; active duration; effort; adaptations by plan
reference; and resume/exit routes. Writes occur on meaningful reducer
transitions and lifecycle events, plus page hide/unload—not on timer frames.
Reload validates both the record and sequence fingerprint. Valid sessions
restore at the exact phase in a paused state; invalid state offers Restart or
End instead of guessing. A separate active record is never silently
overwritten.

The shared session lifecycle is `scheduled -> in-progress -> completed`, with
explicit terminal alternatives `skipped`, `missed`, `cancelled`, and
`incomplete`. Activity and the mutable plan reconcile to this vocabulary on
load. Rescheduling changes only the selected occurrence and refuses an occupied
date because the current calendar represents one training session per day.

### Plan generation
`generateTrainingPlan` is a pure domain function. It filters incompatible
equipment and workouts that load a reported pain area, then ranks the remaining
catalog against sport, goals, selected physical development areas, Padel
movement/shot priorities and experience. Development areas match body-area and
movement-role metadata; Padel priorities match sport-profile problem tags. The
questionnaire validates its three Padel priority screens independently, allowing
up to three choices per screen rather than applying one cross-screen total. For
each plan date it constructs the base main prescription, applies progression and
historical feedback, applies safety exclusions, reserves warm-up and cooldown
budgets, then fits the main block into the remaining total-session target. It
does not use catalog duration as a proxy. The deterministic main-block
adjustment order is
rounds, bounded work intervals, then a non-duplicate focus-matched exercise when
lengthening; shortening removes optional rounds, optional accessories, then
reduces bounded work. Core items remain in place, and round/work changes are
distributed across suitable movements rather than repeatedly loading one item.

`calculateSessionSectionsDuration` is the authoritative generated-session
duration model. It flattens the ordered sections once and delegates to
`calculateSessionDuration`, so work, recovery, ready countdowns and side
switches match the player. The user's target includes warm-up and cooldown.
Both calculators share their timing constants with `buildWorkoutSequence`.
Generated sessions persist the target, estimate, delta,
status, immutable pre-workout baseline, active today overrides, and structured
adjustment record. The acceptance tolerance is the smaller of 10% of the target
or two minutes. The final generator enforces that boundary after feedback and
match rebalancing; an empty eligible catalog or any out-of-range session fails
closed with an `UnsupportedPlanDurationError` before persistence. UI rounds the
estimate to a whole minute before a workout rather than showing false
second-level precision. Padel limitation tags map to training qualities; they do not contain
executable prescriptions. Pain areas map conservatively to blocked exercise
body areas. `rebalancePlanAroundGames` remains pure and does not invoke AI.

Warm-up selection is deterministic and metadata-driven. It ranks low-intensity,
equipment-safe movements by preparation-quality and body-area overlap with the
main block, with a stable ID tie-break and a general dynamic fallback. Cooldown
uses recovery/body-area metadata. Support prescriptions are conservative,
fixed, and non-progressive. The 60-day progression, normal effort feedback, and
effort-level scaling modify the main block only. Pain, comfort, and unavailable
equipment constraints apply to every section.

The planner first filters production exercises by timed support, difficulty,
equipment, and pain exclusions. It scores the remainder against profile goals,
physical development areas, and sport-profile problem tags, favors
movement-pattern coverage, and creates a
stable main selection for each weekly slot.

Physical development areas are weekly coverage obligations, not only ranking
bonuses. They are distributed across weekly slots, with capacity movements
preferred as anchors. Final hard validation rejects a week that omits a selected
development area or, for Padel, contains no capacity exercise.
`SportExerciseProfile.trainingFunction` separates capacity, performance,
transfer, mobility, and recovery while keeping sport-specific meaning out of the
global exercise record.

The optional model-assisted planner uses `selectModelExerciseCandidates` as its
catalog boundary. `POST /api/training-plan` is the only OpenAI call site; the
API key stays in the server environment and is never exposed to the browser.
The boundary rejects unavailable equipment, pain
conflicts, movements above the athlete's experience, non-production content,
and exercises that do not fit the requested time or home environment before a
request is assembled. It then ranks by profile relevance with a stable ID
tie-break and returns all currently eligible summaries up to a hard cap of 100. These
summaries contain stable IDs and planning metadata only; media URLs, coaching
instructions, common mistakes, descriptions, guidance copy, and other raw
exercise fields remain local. The request also includes a human-readable,
structured rendering of every questionnaire answer, recent adaptation context,
the 60-day requirement, and the weekly session count. This bounded retrieval
step is required even if the catalog grows; callers must never serialize the
complete canonical exercise objects.

`modelPlanIntentSchemaForCandidates` is used with the OpenAI SDK's Zod Structured
Outputs helper. Its exercise-ID enum is built from the eligible candidates, so
the model cannot structurally return an ID outside the request. The model must
return a short explanation and one stable-ID selection
per weekly slot. Plain JSON mode and prompt-only JSON requests are not used.
Structurally valid output is still untrusted domain input: session count,
duplicates, temporary avoids, catalog membership, safety, duration, progression,
and whole-plan quality are checked after parsing. One failed proposal may be
repaired once; a second failure returns the deterministic plan.

The model-facing response remains an intent and stable-ID selection, never an
executable workout. `compileModelWorkout` resolves every selected ID against the
local catalog and rejects unknown, duplicate, unsafe, unavailable, unsuitable,
or out-of-environment selections. Axyro then owns the exercise defaults, rounds,
work and recovery seconds, side behavior, section selection, and final duration
fit. For a 20-minute request the current deterministic section budget is three
minutes of warm-up, approximately fourteen minutes of main work, and three
minutes of cooldown; the compiled total must remain within the documented
duration tolerance. The duration breakdown uses the same ready, recovery, and
side-transition constants as playback. Match spacing stays in the deterministic
calendar generator/rebalancer and is never delegated to a model.

`plan-quality.ts` is the final quality boundary for a complete proposed plan.
Hard validation returns structured error codes for unknown or unpublished
exercise IDs, pain and equipment conflicts, duration tolerance, timing bounds,
required warm-up/cooldown sections, and hard strength work on the day before a
match. Hard failures are never converted into a lower quality score. A
model-assisted caller may pass those structured errors into exactly one repair
attempt; a second failure selects the deterministic local plan, which must pass
the same hard validator or fail closed.

Generation metadata records a fallback reason when AI is disabled,
unconfigured, unavailable, or rejected. The client persists that metadata so
the plan screen distinguishes an AI-selected mix from the validated local
planner.

Soft plan quality is a separate 100-point report covering consecutive workout
variety, main-movement repetition, weekly limitation coverage, whole-body
balance, visible progression, useful familiarity, and safe preference coverage.
Soft metrics rank valid alternatives only and can never offset a hard error.
Preferred exercise IDs are optional scoring context in the separately persisted
`veyro.adaptation-profile.v1` record; they are not part of the athlete profile.

Workout feedback updates that compact adaptation record. It stores only recent
difficulty trend, temporary load adjustment, skipped/avoided exercise IDs and
well-tolerated preferred exercise IDs. Completed workout snapshots remain
immutable. Both model-assisted planning and deterministic fallback exclude
temporarily avoided exercise IDs; deterministic selection gives a small,
non-binding ranking preference to well-tolerated exercises and uses the
temporary load adjustment to favor lower- or higher-intensity candidates.
Simple same-day duration changes continue through the deterministic
`deriveTodayAdaptedSession` path and do not call OpenAI.

After the base prescription and 60-day progression, the deterministic
feedback policy may propose one small correction for the next comparable planned session.
Comparability prioritizes repeated exercise IDs, then shared focus and body-area
metadata. Too easy increases one work interval, adds one safe round, or trims
one recovery interval; too hard uses the inverse levers. The policy respects
item bounds and the session-duration tolerance and never changes unrelated
sessions. The completion screen explains the proposal and requires Apply or
Keep current. Accepted changes and their source feedback-event ID are stored on
the planned session. Apply/Keep is also an immutable decision event, so a plan
rebuild does not revive feedback the athlete explicitly declined. A newly
generated plan can use accepted or undecided recent event history through the
same pure policy.

### 60-day progression

`getProgressionPrescription` is a pure policy layered on the generated baseline
session. Calendar offsets map to explicit phases: foundation, build, peak and
consolidate. A session's slot within its week reuses the same generated exercise
selection in every week, preserving movement practice while its prescription
changes.

Build targets roughly 7.5% more effective timed work using eligible
strength/stability intervals. Peak targets roughly 15% more and may add one
bounded round before modestly reducing eligible recovery to remain near the
duration target. Consolidate targets roughly 10% less work than baseline—about
15–25% below peak—by removing bounded rounds or work, then adding a small amount
of recovery where the duration budget permits. Mobility/activation movements
and explosive intervals are not lengthened or density-progressed. Every change
is validated against item bounds and the existing one- or two-minute duration
tolerance.

The policy does not read page views or roll missed volume forward. A skipped
session therefore cannot enlarge a later prescription. The authoritative
pipeline is user preferences, focus selection, base main prescription, calendar
progression, historical feedback correction, safety overrides, section
construction, today's explicit adaptations, section-aware target-duration
fitting, constraint validation, and final explanation metadata. Priority is
safety exclusions, today adaptations,
feedback adaptation, weekly progression, duration optimization, then variety.
The final fitter excludes exercises touched by feedback, equipment unavailable
today, and body areas protected by pain or discomfort, so it cannot erase a
correction or reintroduce unsafe load. Identical session and adaptation state
produces the same result.

Every generated session has one ordered `adjustments` reason ledger. Entries use
stable sources—`base_prescription`, `weekly_progression`, `feedback`, `safety`,
`today_adaptation`, and `duration_fit`—and
carry the exercise, delta, phase, affected area, or feedback-event ID needed to
explain the result. Presentation derives “Why this workout?” from that ledger;
it does not infer causality by comparing final numbers.

The persistence boundary follows that pipeline explicitly:

```text
WorkoutDefinition
  -> generated session (transient)
  -> planned session snapshot
  -> optional adapted session snapshot
  -> executed session snapshot
  -> SessionActivity
```

`WorkoutDefinition` remains reusable catalog content. The three session
snapshots are immutable historical facts for one user and date. Activity UI
reads those snapshots directly and never attempts to reverse-engineer a prior
prescription from a current definition.

### Pre-workout adaptation

`deriveTodayAdaptedSession` is a pure, deterministic overlay on one planned
session. Every derivation starts from `originalSessionSnapshot`; it never stacks
mutations on the last preview. Less time preserves support sections and fits the
main block into the remaining budget. Equipment and comfort constraints inspect
all three sections and touch only invalid exercises. Explicit replacements
normally touch only the selected main item, then deterministically refresh only
the warm-up against the changed preparation needs. A lighter day uses at most
two bounded main-block levers: selected work reduction and a small recovery
increase.

Replacement hard filters enforce excluded body areas, equipment already
available for that session, and compatible setup requirements. Valid candidates
are ranked by exercise role first, then targeted training qualities, primary and
overlapping body areas, general qualities, difficulty, work-duration
compatibility, workout focus, and laterality, with stable ID tie-breaking. No
React component contains matching policy.

Reset copies the immutable baseline back into the planned session. Starting the
player records both the performed prescription and the original baseline plus
the structured `adaptations` list in completion history. A one-day override does
not alter later sessions or the 60-day baseline.

Pain or discomfort is handled as a safety override. The player first asks for
an affected area, stores it with the event, immediately blocks automatic
progression for matching future exercises, and reverses matching progression
increments where possible. It does not diagnose, prescribe rehabilitation, or
silently substitute exercises. Safety guidance and a review link remain visible;
this override may take precedence over the preferred duration band.

### Future
Introduce repository interfaces early enough that persistence consumers do not depend directly on localStorage.

Possible future implementations:
- local repository;
- authenticated API repository;
- hybrid/offline repository.

Do not build these future implementations now.

## Media strategy
Videos are external/static media assets referenced by a stable exercise
`assetKey`. Required views and filming notes are exercise metadata rather than
component logic.

Where known, media metadata can declare an intended seamless-loop duration.
Short reference clips loop independently until the authoritative work timer ends.

For development:
- allow placeholder video URLs;
- provide a fallback card when media is missing.

For production later:
- CDN/object storage is preferred;
- encode short lightweight clips optimized for mobile;
- consider WebM + MP4 compatibility variants if required;
- avoid loading all clips upfront.

## Audio/tempo architecture
Browser `speechSynthesis` is sufficient for an MVP prototype but has platform/browser differences.

Therefore:
1. isolate it behind an adapter;
2. never make workout timing depend on speech completion events;
3. workout clock remains authoritative;
4. speech is guidance layered over that clock;
5. cancel queued speech on pause/phase change;
6. provide visual cadence when speech is unavailable.

A future prerecorded cue implementation should conform to the same application-facing interface.

## Timing
Avoid independent `setInterval` instances for every concern.

Use one session clock/timing abstraction for timed phases. Derive remaining time from timestamps when possible so background throttling/drift does not accumulate badly.

The same clock drives ready, active, side-transition, and rest phases. At zero it dispatches `COMPLETE_PHASE`; the reducer remains the only owner of sequence progression. Recovery advances directly into the next exercise's ready phase, whose opening audio cue announces the new exercise. Pausing freezes remaining milliseconds and resuming creates a new deadline from that remainder. An interrupted session initializes its first restored phase clock from the persisted millisecond remainder; later phase changes initialize from their full duration.

Plan start shortcuts read the persisted preferred effort before building the
player URL. While preferences are loading, those links route through workout
review rather than silently assuming Standard.

Effort presets transform main-block durations before session initialization:
- Light: remove the lowest-priority accessory movement when possible, then
  apply `0.8×` work and `1.25×` rest;
- Standard: `1×` work, `1×` rest;
- Challenging: deterministically append one compatible, goal-matched movement
  when available, then apply `1.25×` work and `0.75×` rest.

Composition is resolved before sequence construction, so previews, section
indices, player navigation, persistence fingerprints, and completion snapshots
all describe the same movement list. Candidate selection never raises the
workout's difficulty or equipment requirement and requires overlap with both
the authored focus and existing body areas.

Durations are rounded to five-second boundaries with a five-second minimum.
Warm-up/cooldown work, ready countdowns, and side transitions are not
effort-scaled.

For cadence cues, schedule against elapsed phase time and tempo configuration.
The persisted cadence preference supplies an independent multiplier after effort
scaling, so changing spoken rhythm never changes the authoritative phase timer.

The player requests the browser Screen Wake Lock only while a workout is running
and the preference is enabled. It releases the lock on pause, completion,
visibility loss, or unmount. The guidance sheet reports unsupported or blocked
states. Current-workout media caching is explicit and best-effort through the
browser Cache API; failures never interrupt playback or progression.
Player media resolves cached video responses to local object URLs, so later
phases remain playable if connectivity drops while the workout page stays open.

Modal player/settings surfaces share a focus-trap hook that handles Tab and
Shift+Tab cycling, Escape dismissal, initial focus, and trigger focus restoration.
Playwright routes include axe-core scans for the primary surfaces and player
guidance dialog in addition to interaction tests.

## State management
Start with React reducer/context local to the workout player.

A global store is unnecessary unless state starts crossing unrelated application surfaces.

The session reducer should be a pure function wherever possible.

## Error handling
The player should survive:
- missing video;
- unavailable speech synthesis;
- interrupted speech;
- page visibility changes;
- accidental rapid next/previous taps;
- invalid content caught by schema validation.

Content validation failures in development should fail loudly with useful IDs/paths.

## Accessibility
- semantic buttons;
- visible focus;
- labels for icon-only controls;
- do not rely only on color for workout phase;
- respect reduced motion where applicable;
- captions/text instructions make audio optional;
- audio must never be required to understand the workout.

## Security/privacy
MVP has no account or identity fields. It stores only planner inputs and workout
state in browser local storage. Sex, age, height, weight and free-form health
notes are deliberately excluded because no current product behavior requires
them. Optional structured soreness/discomfort areas are health-related user data;
they are used only for conservative exercise exclusion and progression safety.

The current application has no app API, cloud synchronization, analytics,
advertising or crash-reporting SDK. Any future off-device transmission or
third-party integration requires a fresh data-flow audit and corresponding
product/privacy disclosure before release.

If analytics are added later, document exactly what events/data are collected.

## Deployment
The MVP can be deployed as a standard Next.js application on a platform such as Vercel or equivalent.

Avoid platform-specific application logic.

## Daily-ten timing and catalog boundary (2026-10-12)
`daily-duration.ts` owns 5/10/20 choices, exact quick-start construction, and
budget-preserving planned effort. Quick starts repeat short, complete intervals,
include every ready/side/recovery phase, and use `timingMode: fixed-budget` to
prevent snapshot scaling twice. Planned previews include all three sections;
the launcher uses the same effort compilation. Five-minute plans use a 45-second
preferred warm-up and 30-second preferred cooldown (minimums 40 and 25).
Ten-minute plans retain 105/75-second preferred support sections. Twenty-minute
plans retain 180/180 seconds. Existing generation tolerance is unchanged.

The canonical catalog contains exactly 40 records. `isHomeExercise` excludes
foam-roller and raised-obstacle requirements from executable content.
`isExercisePlanEligible` applies that boundary to generation and selection.
Three preserved video references remain browseable; their old authored workout
is draft. Six starter presets are compiled to ten minutes at the public boundary;
other authored recipes remain internal construction/test templates.
Sport-profile references are pruned with their retired exercises and continue
to validate against stable IDs. No retired movement is silently substituted.

`LocalTrainingPlanRepository.hasOutdatedPlan` exposes a required rebuild when a
stored plan contains a retired or reference-only movement. Loading does not
delete it. Historical activity snapshots retain their stored names and timing.
Goal-coverage validation only requires priorities achievable with available,
pain-compatible content; actual pain/equipment violations still fail validation.
