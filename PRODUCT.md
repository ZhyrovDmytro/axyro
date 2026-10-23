# Product Specification

> Current account/subscription extension: see [Membership implementation](docs/MEMBERSHIP_IMPLEMENTATION.md), [Authentication](docs/AUTHENTICATION.md), [Billing](docs/billing.md), and [Multi-user data](docs/MULTI_USER_DATA_ARCHITECTURE.md). These replace earlier local-only/no-account scope statements below. Guest access is the single free starter; personalized plans and full access require Pro.


## Working concept
Axyro is built around a small daily commitment: **10 minutes of guided movement**.
The available session lengths are **5, 10 and 20 minutes**. Ten is the default,
five halves the time commitment, and twenty doubles it. This describes the
session budget, not a promise that ten minutes meets every health or fitness need.
Training frequency and recovery still follow the athlete's chosen schedule.

A mobile-first guided home-workout web app for people who want structured athletic training without needing a gym.

The product also includes a locally persisted, personalized 60-day training plan beginning on the questionnaire date. Initial setup collects sport, broad goals, up to three non-painful physical development areas, up to three concrete Padel priorities on each movement, power/control, and mobility/capacity step, realistic availability, session length, equipment, and a separate optional current-discomfort check. Match dates and playing experience remain editable in refinement. Axyro does not ask for sex, age, height or weight because the current planner has no behavior that requires them.

For Padel, setup asks about recognizable game situations: accelerating to the net, recovering back for lobs, reacting from the split step, lateral coverage, braking, rotation during bandejas/víboras, overhead power/control, volley stability, racket control, low-ball movement, balance and late-match capacity. These answers increase the ranking of exercises with matching movement roles. Physical development areas separately prioritize shoulder/upper-back, forearm/grip, core/lower-back, hip/glute, knee/single-leg, or calf/ankle/foot work. Neither is a pain report: current pain areas are used only as safety constraints.

Current soreness or discomfort can be provided optionally for shoulder, elbow/forearm, wrist/hand, neck/upper back, lower back, hip/groin, knee, calf/Achilles and ankle/foot. It is used only to exclude workouts that load a reported area and to pause conflicting automatic progression. Pain is never treated as a goal to “fix,” and the small catalog may yield fewer or no suitable sessions.

The curated library contains 40 exercises covering all body areas. Home training uses bodyweight and optional dumbbells. The three prone shoulder movements are executable floor exercises with optional light dumbbells, using their retained demonstration clips. See `CONTENT_COVERAGE.md`.

The final product name is intentionally undecided.

## Problem
Exercise lists and videos are easy to find, but following a workout still requires too much attention: remembering sets, watching technique, timing work and rest, and maintaining movement cadence.

This product turns a workout into a guided sequence. The user selects a workout, presses Start, and follows the screen/video/audio instructions until completion.

## Target user
Initial user:
- trains at home;
- has little or no equipment;
- may have one or two light dumbbells;
- wants athletic strength, mobility, stability, or explosiveness;
- prefers a short guided session rather than building a program manually.

## Core objects

### Exercise
A reusable movement with:
- name;
- body region/categories;
- training qualities;
- required equipment;
- video reference;
- concise instructions;
- technique cues;
- common mistakes;
- unilateral/bilateral behavior;
- time-based movement behavior;
- default tempo/cue configuration.

### Workout
A named ordered collection of prescribed exercises. Generated names describe
the physical work in the main exercise mix, such as first-step strength,
lateral braking, grip endurance or shoulder control. Questionnaire goals and
on-court outcomes appear in supporting copy as benefits the session is designed
to support; they do not replace the workout name. A single accessory exercise
must not determine the name of the whole session. Calendar labels must not use
a weekday or a generic numbered session name in place of that title. Compact
plan and home cards promote the primary supported outcome to the session title
rather than repeating a generic training-quality title and an outcome subtitle.
That outcome follows the session's assigned focus and
rotates through additional matched priorities across later weeks instead of
defaulting to the first questionnaire answer. If an assigned focus is not
actually trained, the supporting copy names the session's training qualities
instead of claiming an unsupported outcome. Plan cards show the actual duration. The overview explains the 10-minute default and links directly to duration refinement.

Sport relevance belongs in exercise metadata and selection logic. Exercise
names and execution should describe general physical training rather than name
or rehearse a sport-specific stroke one-to-one.

Examples eventually may include:
- Explosive Legs
- Rotational Core
- Shoulder Strength & Stability
- Upper Body
- Full Body Athletic
- Mobility / Warm-up

The active selection and retention decisions are documented in `CONTENT_COVERAGE.md` and `docs/DAILY_TEN_CONTENT_REVIEW.md`.

### Workout prescription
The configuration that says how an exercise is performed in a specific workout, e.g.:
- 3 sets;
- 30 seconds of continuous movement;
- 25 seconds per side;
- 30 seconds rest;
- tempo/cue override.

MVP prescriptions are exclusively time-based. The user repeats the demonstrated movement with control until the work timer reaches zero.

## Primary MVP flow
1. User opens app.
2. User browses/selects a predefined workout.
3. Workout detail shows duration, equipment, and effort selection before a
   prominent **Start workout** action; the exercise overview and timed
   prescriptions remain fully visible below it without a disclosure control.
4. User presses **Start workout**.
5. Player presents the first exercise and a short ready/count-in state.
6. Reference video loops while instructions remain visible.
7. App provides visual movement cadence and optional countdown/transition tones.
8. App automatically moves through sets, sides, rest periods and exercises when each timer ends.
9. User can pause, mute, adjust guidance, skip, or go back.
10. Workout finishes with a simple completion summary.

## Workout player UX
The workout player is the most important screen.

It should show, without clutter:
- exercise name;
- exercise video;
- current set / total sets;
- remaining work or rest time;
- side if relevant;
- current phase;
- rest countdown when resting;
- next exercise preview;
- pause/resume;
- previous/next;
- audio state;
- access to tempo setting.

During movement, large numbers and obvious states are preferable to dense text.

## Audio signals and visual tempo
Audio guidance uses short tones for each of the final five available seconds,
followed by a longer tone at the phase boundary. These replace spoken counting,
movement cadence, and start/stop announcements. Visual cadence remains
exercise-specific and adjustable independently of effort.

Settings:
- audio signals on/off;
- visual cadence/speed;
- keep-screen-awake preference with graceful unsupported-browser behavior;
- preferred workout effort;
- local privacy/data controls and app information.

Workout effort is chosen before starting. Light shifts work into recovery;
Standard uses balanced timing; Challenging shifts available recovery into work
without extending the session. Planned sessions preserve their selected
movements, authored bounds, and explosive-work limits. Cadence remains separately
adjusted. Effort never silently selects a longer duration.

Personalized sessions should favor movement variety over repeatedly extending
the same few exercises. The planner starts with two, four, or five complementary main
movements for the 5-, 10-, or 20-minute duration, adds a compatible movement before
adding rounds when it needs more time, and normally caps an exercise at three
rounds.

The app does not infer athletic capacity in the MVP. The athlete chooses the sustainable effort level for the session.

The exact relationship between cadence and exercise tempo will be refined later.

## Exercise library UX
Users can browse exercises separately from workouts. Guests and Free members
can browse a stable 6-exercise preview with working reference media. Pro opens
the full 40-exercise collection. The preview ends with an overflow gradient and
account/sign-in actions for guests, or Explore Pro for signed-in Free members.
All reference detail pages and assets remain publicly available.

MVP filtering should be simple and useful:
- search;
- a primary body-area chip row.

Filters update results immediately and remain represented in the URL for deep
links and browser navigation. Each control shows its own current single-select
state without a duplicate active-filter summary. The first mobile viewport
should reach the result count without requiring the athlete to scroll through
advanced controls.

Exercise detail:
- video;
- description;
- sport-specific purpose and movement relevance when a sport is selected;
- setup;
- execution steps;
- key cues;
- common mistakes;
- equipment;
- difficulty, default recommendation, and tempo;
- relevant categories.

## Workout library UX
Cards should communicate quickly:
- title;
- focus;
- approximate duration;
- difficulty;
- equipment;
- exercise count.

Do not overload cards with all prescriptions.

Discovery offers six focused quick starts: full-body foundations, lower-body control, shoulders, core, forearms, and calves/ankles. All default to 10 minutes; workout details offer 5 and 20.

## Delivery priority

Until the published workout and visual-media catalog is materially richer,
guided workout quality and content coverage take priority over additional
planner depth. Do not add new planner workflows unless explicitly requested.

## Future product direction
Architecture should permit these without committing to their implementation now:

### Guided movement assessment

An optional, camera-free movement baseline and day-30/day-60 reassessment are
explicitly deferred beyond the MVP. The saved concept, proposed checks, plan
impact and safety boundaries are documented in
[`docs/future/GUIDED_MOVEMENT_ASSESSMENT.md`](docs/future/GUIDED_MOVEMENT_ASSESSMENT.md).

### Planned workout customization
A planned library workout can be copied for one calendar session. The athlete can
search/add/remove exercises, drag them into a new order, insert a movement at a
specific gap, and edit sets, work duration, between-set recovery and
after-exercise recovery. The drag handle also supports keyboard reordering.
Saving the copy never mutates canonical content, and the edited copy runs through
the same workout player.

Immediately before starting, the athlete can use **Adapt today** for less time,
missing equipment, soreness/discomfort, a single exercise replacement, or a
lighter day. The product previews before/after duration and exercise counts,
applies the minimum necessary deterministic change, and offers Reset
adaptations. This is a one-session override: it is recorded with completion
history but never lowers the future progression baseline by itself.

Every generated plan session follows `Warm-up -> Workout -> Cooldown` as an
explicit domain structure. The total 5-, 10-, or 20-minute preference includes all three
sections. Warm-up selection uses low-intensity preparation metadata relevant to
the main movements; cooldown selection uses recovery/body-area metadata. Both
stay short and non-progressive, while duration expansion and 60-day overload
primarily change the main Workout block. The player and completion snapshot
retain section identity, and completion history distinguishes planned,
completed, and skipped items.

### Training plan adaptation
The plan generator is deterministic and local. It selects production-ready
exercises using sport, goals, padel problem relevance, experience, pain flags
and equipment, then
constructs each timed prescription near the athlete's 5-, 10-, or 20-minute preference
within explicit set and work-duration safety bounds. It records every
target-duration adjustment. A generated session is accepted only when its
authoritative player duration is within the smaller of 10% of the chosen target
or two minutes. If the eligible catalog cannot meet that contract, setup stops
and explains the closest compatible duration instead of saving a misleading
plan. Older persisted plans that predate this rule remain inspectable, but label
the mismatch explicitly rather than describing it as a successful match.
Every selected physical development area must appear in the main training work
at least once per plan week. Padel plans must also retain capacity work each week
so a specific priority such as grip, shoulder endurance, or lateral speed does
not replace the athlete's general physical foundation. Sport profiles classify
movements as capacity, performance, transfer, mobility, or recovery. OpenAI may
select the exercise mix and propose content-based session names, but Axyro owns
executable timing, safety bounds, progression, and outcome wording. Priorities
are distributed across weekly sessions rather than automatically influencing
every slot. Session cards omit generic phase rationale when the prescription did
not change; progression and adaptation notes name the specific interval, round,
recovery, equipment, comfort, or feedback adjustment. The plan identifies a
validated local fallback instead of silently presenting it as AI-generated.
Athletes can add matches and
explicitly rebalance; the current rule keeps training off match day and the day
before. Feedback adaptation uses the same explainable boundary. After a
completed plan session, Too easy or Too hard can produce one small proposal for
the next comparable session; the athlete explicitly applies it or keeps the
current level. Just right keeps the calendar progression unchanged.

Pain/discomfort asks for the affected area and immediately pauses matching
automatic progression with clear safety guidance and a review path.
Adaptations preserve their source feedback event and do not use AI, diagnosis,
or probabilistic scoring.

Pre-workout comfort adaptations use the same conservative body-area mapping as
pain feedback. Equipment replacement considers only equipment already available
for today's session. If no safe semantic match exists, the affected movement may
be removed rather than replaced merely to fill time. Structured adjustment
reasons drive the explanation UI; presentation does not guess why a prescription
changed.

The 60-day plan has a visible, plain-language arc: Foundation spans weeks 1–2,
Build spans weeks 3–5, Peak spans weeks 6–7, and Consolidate spans weeks 8–9.
Foundation establishes
movement quality, Build adds a small amount of suitable work, Peak is the
strongest week within the same duration budget, and Consolidate reduces fatigue
without replacing the learned movement patterns. The product explains the
phase and material interval/round/recovery changes without exposing training
jargon or internal calculations. Missed sessions are not accumulated into
catch-up workouts.

### Workout customization
A predefined or generated workout can be copied for one session without
modifying canonical exercise content.

### Progress
Potential later features:
- workout history;
- streaks;
- total training time;
- progression/load tracking;
- personal bests.

### Accounts/cloud
Only introduce authentication/backend persistence when there is a concrete product requirement.

## Non-goals for first release
- social feed;
- trainer marketplace;
- calorie tracking;
- nutrition;
- wearable integration;
- live classes;
- pose estimation;
- automatic form scoring;
- AI chat coach;
- complex periodization;
- gym-machine programs.

## Product success criteria for first usable version
A user should be able to:
- find a workout in under 30 seconds;
- understand required equipment before starting;
- complete a session without manually tracking sets/rest;
- follow every exercise from its video and cues;
- control or disable audio guidance at any time;
- recover from accidental pause/skip/navigation without losing the whole session.

### Unique exercises within a workout
Each exercise appears once in the main workout. Additional work uses the
exercise's sets and timed intervals, within its authored limits, rather than
another occurrence later in the flow. Warm-up and cooldown may reuse a gentle
exercise, but neither repeats an exercise from the main workout. Section
selection reserves compatible support movements before choosing main exercises;
duration fitting cannot add those support exercises back into the main block.
The exercise picker omits movements already in the session; use the existing
Sets control to increase work. Repeated main entries in unstarted saved sessions
are consolidated into sets, capped at the existing authored maximum, then refitted
to the session budget using the first entry's prescription. On load, unstarted saved sessions with overlap
between main and support sections are refitted within the existing duration
tolerance after activity status reconciliation. Started and recorded workouts
retain their saved flow.
