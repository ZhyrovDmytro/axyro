# Decisions and Open Questions

## Accepted starting decisions

### D001 — Web first
Build a responsive mobile-first web application first.

Reason: fastest iteration and easiest validation before considering native apps.

### D002 — No backend for MVP foundation
Canonical exercise/workout content ships with the application; preferences use local browser persistence.

Reason: a backend does not yet solve a necessary first-version problem.

### D003 — Data-driven workout engine
Exercise content and workout prescriptions are structured data, not hardcoded page logic.

Reason: required for reusable exercises and future custom workouts.

### D004 — Separate exercise from prescription
Exercise defines the movement; workout item defines sets, work duration, and rest.

Reason: the same exercise needs different dosage in different workouts.

### D005 — Browser speech behind an adapter
Use Web Speech API as the initial implementation, isolated behind an audio service.

Reason: very fast MVP implementation while preserving the option to use prerecorded/generated audio later.

### D006 — Workout timing is authoritative
Speech/audio never controls workout progression.

Reason: speech APIs vary by browser and can queue/delay.

### D007 — Reviewed production content is added incrementally
Keep the small foundation fixtures needed by existing workouts, and add reviewed
production libraries by sport/body area. Padel → Shoulders is the first such
library.

### D008 — Timed movement only
Every MVP exercise is performed as repeated controlled movement for a prescribed duration. Rep-count prescriptions are intentionally unsupported.

Reason: the player can guide continuous movement, work, and rest without requiring touch input or unreliable automatic rep detection.

Exercise records may preserve rep-based reference recommendations from reviewed
content. These do not become executable workout prescriptions.

### D009 — Explicit effort presets
The athlete chooses Light, Standard, or Challenging before starting. Presets scale work duration, rest duration, and visual cadence; the app does not claim to infer fitness automatically.

Reason: user-selected effort is safe, understandable, and reversible before user profiles or training history exist.

### D010 — Global exercises with sport profiles
Store movement mechanics once as a global exercise. Associate sport-specific
ranking, body-area placement, goals, movement tags, and explanation through a
separate profile keyed by sport and exercise ID.

Reason: a movement such as side-lying external rotation can serve Padel, Tennis,
and Badminton without duplicated definitions.

### D011 — Generated sessions own explicit sections
Every generated plan session stores ordered `warmup`, `main`, and `cooldown`
sections. The authored catalog workout remains the source of the main block;
the generated plan sections are authoritative for duration, playback,
adaptation, and completion history.

Reason: preparation and recovery have different fitting, progression, safety,
and reporting rules. Keeping section identity in the domain prevents the UI and
history from guessing boundaries from exercise names. Legacy saved plans migrate
to an explicit main-only section so persistence does not invent work that was
never planned.

### D012 — Activity is a persisted lifecycle

Plan and Activity use one lifecycle vocabulary: scheduled, in-progress,
completed, skipped, missed, cancelled, and incomplete. Missed uses the user's
local calendar date. Completed and incomplete records carry execution snapshots
and active time excluding pauses; terminal states are not inferred again from
today's templates. One versioned active-session snapshot is stored separately
while a player is in progress and is cleared only on explicit finalization.

### D013 — Interrupted timers restore paused

Leaving, reloading, hiding, or closing the player saves its exact logical phase
and remaining duration. Time away never advances a workout. A restored player
opens paused and requires an explicit Resume action. Only one active workout is
supported in the MVP, and starting another requires resuming or ending the
first.

### D014 — Collect only inputs used by current behavior

The MVP profile is one normalized object containing sport, experience, training
frequency/duration/days, available equipment, goals, non-painful physical
development areas, sport-specific movement/shot priorities, optional structured pain areas, and optional match dates and
importance. UI labels are mapped to stable identifiers before validation or
persistence. Training limitations and pain constraints remain separate. The
profile does not contain sex, age, height, weight or free-form health notes.

Reason: the rule-based planner does not use those demographic or body-metric
fields. Development areas and sport priorities affect exercise ranking; pain
areas only exclude or protect loading. Retaining unused inputs “for future use” would add privacy risk without improving
the current experience. A new field may be introduced only alongside a precise,
documented behavior that uses it and an updated privacy/data-flow audit.

### D015 — Generated plans start from exercises

Only a small basic quick-start shelf remains public for immediate standalone
playback. The 60-day planner instead assembles personalized main blocks from
reusable exercises and never chooses a predefined workout template.
Eligibility requires production-ready media and an executable timed default.
Deterministic selection uses exercise planning metadata plus sport-profile
problem relevance, then projects the result into the existing workout/player
contract.

### D016 — Model requests use bounded exercise summaries

If model-assisted workout generation is introduced, deterministic local rules
first remove candidates that conflict with equipment, pain, experience,
production readiness, time, or environment. Relevance retrieval then returns
the eligible set up to a hard cap of 100 so narrow questionnaire priorities can
be covered. The request contains a compact planning projection plus
human-readable questionnaire context, never canonical exercise objects or their
media and coaching copy.

Reason: safety and product constraints should not depend on probabilistic model
behavior, and payload size must remain bounded as the exercise library grows.

### D017 — Axyro compiles model intent

A model may request a session goal and choose stable exercise IDs only from the
bounded candidate summaries. It does not author executable sets, work seconds,
recovery seconds, side transitions, section budgets, total duration, or calendar
placement. `compileModelWorkout` verifies the IDs and all hard constraints, then
uses the local session fitter and duration model to produce the workout.

Reason: timing, safety, equipment compatibility, pain exclusions, and match-day
spacing must remain deterministic, testable product behavior. A plausible model
description must never turn a four-minute prescription into a claimed
twenty-minute session.

### D018 — Requested plan duration is a hard product contract

Every newly generated session must be within the smaller of 10% of the selected
duration or two minutes. This is checked with the same authoritative timing
model used by the player and enforced again on the final plan after progression,
feedback, and match rebalancing. If the catalog and safety constraints cannot
meet the range, generation fails before persistence and the athlete is told the
closest compatible duration when one exists. Legacy saved sessions may remain
visible, but must state the mismatch directly.

Reason: session length is an explicit athlete choice. Silently substituting a
much shorter “closest balanced” workout makes the setup flow untrustworthy and
can misrepresent the product's ability to adapt to available time.

### D019 — Ten minutes is the default daily commitment

New session choices are 5, 10 and 20 minutes. Quick starts hit those budgets
exactly, including recovery and transitions. Generated plans retain D018's
bounded tolerance. Effort redistributes time rather than extending the session.
This is a habit proposition, not a medical sufficiency claim or a requirement
to train hard every day. Match spacing and recovery remain in force.

### D020 — Fifty exercises, with existing moving media protected

The catalog is reduced from 69 to 50 by removing overlapping variations and
specialized setup requirements. All seven GIFs and three videos remain. Three
plate/roller/obstacle videos are reference-only, leaving 47 eligible home
movements. This resolves the competing requirements to preserve media and keep
training limited to bodyweight/dumbbells without mislabeling equipment.
The Padel Mobility public site and supplied screenshots informed movement
coverage; the private library was not accessible and no media was copied.
See `docs/DAILY_TEN_CONTENT_REVIEW.md` for the selection record.

## Open product questions
These do not block initial scaffolding.

1. Product name/brand.
2. Further original-media production priorities for the curated catalog.
3. Whether to replace the three reference-only videos with owned home-compatible demonstrations.
4. How tempo is represented to users: BPM, slow/normal/fast, seconds/phase, or combination.
5. Default ready countdown length.
6. Whether videos include sound or are always silent reference loops.
7. Whether PWA/offline support is valuable for first public release.
8. Whether initial workouts are padel-oriented, general athletic home workouts, or both as separate categories.

## Future decisions
Only resolve when the corresponding feature is scheduled:
- authentication provider;
- database;
- video CDN/storage;
- analytics;
- subscriptions;
- custom workout sync;
- native app strategy.

### 2026-10-15 — Remove Scapular Arm Circle

Removed Scapular Arm Circle at the user’s request. The catalog now contains
49 exercises: 46 home-training options and three reference-only records.
This supersedes D020’s count; existing moving media remain preserved.

### 2026-10-15 — Remove Controlled Lateral Shuffle

Removed Controlled Lateral Shuffle at the user’s request, including its workout
entries and position images. The catalog now contains 48 exercises: 45 eligible
home-training options and three reference-only records. The separate
Intermittent Lateral Shuffle remains available.

### 2026-10-17 — Remove Dynamic Torso Turn

Removed Dynamic Torso Turn and its position images at the user’s request.
The catalog now contains 47 exercises: 44 home-training options and three
reference-only records. Generated warm-ups select from the remaining support
movements. Existing GIFs and videos remain unchanged.

### 2026-10-17 — Remove Easy Standing Flow

Removed Easy Standing Flow and its position images at the user’s request.
The catalog now contains 46 exercises: 43 home-training options and three
reference-only records. Generated warm-ups use the remaining support movements.
Gentle Standing Rotation now supports both warm-up and cooldown so plans with
knee-loading exclusions retain a compatible warm-up after this removal.

### 2026-10-17 — Remove Gentle Standing Rotation

Removed Gentle Standing Rotation and its position images at the user’s request.
The catalog now contains 45 exercises: 42 home-training options and three
reference-only records. This supersedes its warm-up role recorded above.
Shoulder Reset Sweep now supports warm-up and cooldown, preserving compatible
warm-ups for plans that exclude knee-loading movements.

### 2026-10-17 — Remove Shoulder Reset Sweep

Removed Shoulder Reset Sweep and its position images at the user’s request.
The catalog now contains 44 exercises: 41 home-training options and three
reference-only records. This supersedes the previous 45-record contract.
Generated sessions select warm-ups and cooldowns from the remaining catalog.
Wall Slide with Lift-Off now also serves as a low-intensity warm-up, preserving
compatible preparation for plans that exclude knee-loading movements.

### 2026-10-17 — Remove Lower-Body Reset

Removed Lower-Body Reset and its position images at the user’s request.
The catalog now contains 43 exercises: 40 home-training options and three
reference-only records. This supersedes the previous 44-record contract.
Generated cooldowns use the remaining Standing Recovery Breath exercise.

## 2026-10-20 — Remove Single-Leg Balance Reach

Removed the exercise, its sport profile, and both authored workout references at user request. The catalog now contains 42 exercises: 39 home-training options and three reference-only records. Existing plans referencing the removed ID use the existing outdated-plan flow; stored data is preserved until the user replaces the plan.

## 2026-10-20 — Remove Split-stance Brake

Removed the exercise, sport profile, and both authored workout references at user request. The catalog now contains 41 exercises: 38 home-training options and three reference-only records. Saved plans containing the retired exercise use the existing outdated-plan flow and retain their stored data until replaced.

## 2026-10-20 — Remove Standing Recovery Breath

Removed Standing Recovery Breath at user request, leaving 40 exercises (37 home-training and three reference-only). Cooldowns now select existing low-intensity Lateral Weight Shift or Wall Slide with Lift-Off by body-area relevance and exclusions. This supersedes the earlier breathing-only cooldown decision. Saved plans containing the retired ID use the existing outdated-plan flow without deleting stored data.

## 2026-10-21 — Split Squat name and demonstration

Renamed Supported Split Squat to Split Squat and added the supplied unsupported demonstration. Instructions and setup now describe the floor-only split stance. The stable `supported-split-squat` ID and URL remain unchanged to preserve existing workout and saved-plan references.


## 2026-10-23 — Prone shoulder exercises support floor execution
At the user's request, the three previously reference-only shoulder movements
are now executable without props: Single-Arm Prone Shoulder Arc, Prone Overhead
Shoulder Press, and Prone Shoulder Internal/External Rotation. Bodyweight is the
required-equipment model; light dumbbells are an optional instruction-level
progression. Titles, instructions, setup requirements, and media guidance reflect
this. Stable exercise IDs, slugs, and video filenames are retained for saved
references. All 40 records are home-training eligible. The three movements are
included in the existing Shoulder & Overhead Durability quick start and available
to profile-aware plan selection, which still respects experience and pain flags.
This supersedes the earlier reference-only exclusions; existing plans are not
regenerated automatically.

## 2026-10-24 — Axyro product name

The product and package are now named Axyro. The source repository is
https://github.com/ZhyrovDmytro/axyro. UI copy, metadata, documentation, auth
cookie names, browser events and internal code labels use the new name. The
header monogram is A. Existing sessions must sign in again after the cookie
rename; callbacks started before the update should be restarted.

Persisted `veyro.*` browser keys, owner namespaces, checkout drafts and SQL
payload fields deliberately remain byte-compatible so the name change does not
orphan existing plans, progress or guest preferences. They are legacy storage
identifiers, not product branding. Do not rename them without an explicit data
migration covering browser and server records. The build uses
`AXYRO_NEXT_DIST_DIR`, with the former environment variable accepted as a fallback.
The local checkout directory is unchanged so open tools and links remain valid.
