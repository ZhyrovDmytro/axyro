# AGENTS.md

## Project mission
Build a fast, mobile-first web application for guided home workouts.

The product combines:
- an exercise library;
- predefined workouts grouped by training goal/body area;
- a guided workout player;
- short exercise reference videos;
- concise movement instructions;
- configurable spoken tempo/count cues;
- simple workout progress and completion.

The initial product is intentionally small. Do not implement speculative social, AI coaching, subscriptions, complex analytics, or gym-equipment features unless explicitly requested.

## Product principles
1. Mobile-first. The primary use case is a phone placed near the user during a workout.
2. Start a workout quickly. Minimize taps between opening the app and beginning movement.
3. The workout player is the core experience.
4. Video and audio guidance must not require the user to keep touching the screen.
5. Exercise/workout content must be data-driven, not hardcoded into UI components.
6. Architecture should allow future user-created workouts without requiring an MVP backend rewrite.
7. Keep dependencies and abstractions minimal.
8. Accessibility and keyboard support are required, not cleanup work.
9. Do not silently invent product behavior. When requirements are ambiguous, implement the simplest reversible choice and document it.

## MVP scope
Implement:
- Home / Discover page
- Exercise library
- Exercise details
- Predefined workout library
- Workout details/preview
- Guided workout player
- Video playback per exercise
- Time-based exercise and rest steps
- Spoken count/tempo guidance where applicable
- Effort selection that adjusts work, recovery, and guidance cadence
- Audio guidance on/off
- Pause/resume
- Previous/next exercise
- Set/rest progression
- Workout completion screen
- Local persistence for lightweight settings and recent/completed workouts

Prepare the data model/UI architecture for, but DO NOT implement unless requested:
- custom workout creation/editing;
- user accounts;
- cloud synchronization;
- workout history analytics;
- favorites;
- personalized plans;
- subscriptions;
- notifications;
- AI-generated workouts.

## Daily session and catalog contract
- Maintain exactly 40 curated exercise records unless explicitly asked to change the count.
- Preserve all existing GIF/video exercises. The three prone shoulder movements are executable floor exercises with optional light dumbbells; preserve their legacy IDs and media paths. All 40 records are eligible home-training content.
- New duration choices are 5, 10 and 20 minutes; 10 is the default.
- Quick starts include all timing phases in the exact selected budget. Generated plans include warm-up, main work and cooldown within the documented tolerance.
- Effort changes work/recovery balance without extending the session. Respect authored bounds and keep explosive intervals capped.
- Do not describe ten minutes as a medical guarantee or remove recovery days.

## Initial equipment scope
Exercises should support:
- bodyweight;
- one dumbbell;
- pair of light dumbbells;
- common household floor/chair/wall where appropriate.

Do not assume gym machines, barbells, cable machines, benches, medicine balls, or specialized equipment.

## Suggested stack
Unless the repository already establishes alternatives:
- Next.js with App Router
- TypeScript with strict mode
- React
- Tailwind CSS
- shadcn/ui or small accessible primitives where useful
- Zod for validation of content/data schemas
- Vitest for unit tests
- Playwright for critical end-to-end flows

Prefer browser-native APIs before dependencies, especially for:
- speech synthesis;
- audio;
- local persistence;
- media playback.

## Code standards
- TypeScript strict mode. Avoid `any`.
- Prefer small composable components.
- Keep domain logic outside presentation components.
- Keep workout-player state transitions deterministic and testable.
- Use semantic HTML.
- All interactive controls require accessible names and visible focus states.
- Do not couple exercise data to routes/components.
- Avoid premature global state libraries. React context/reducer or a focused state machine is sufficient initially.
- Avoid premature backend/database work.

## Content model rules
All exercises and workouts must be represented as structured data validated at runtime during development/build.

Exercise definitions should be reusable across multiple workouts. A workout references exercise IDs and supplies timed prescription information such as sets, work duration, rest, side behavior, and tempo overrides.

Exercises are global entities. Sport-specific relevance, body-area placement,
movement tags, goals, and ranking belong in a separate sport profile keyed by
the stable exercise ID. Rep-based source recommendations may be preserved as
exercise reference metadata, but they are not executable MVP prescriptions.
All newly added exercise defaults must use work duration, rest duration, rounds,
side mode, and cadence mode rather than rep targets.

All MVP exercise prescriptions are time-based. Users repeat the demonstrated movement until the visible interval ends; rep-count prescriptions are not supported.

Do not duplicate full exercise definitions inside workout definitions.

## Workout player rules
The workout player must support a deterministic sequence of phases such as:
- ready/count-in;
- active set;
- between-side transition when needed;
- rest;
- paused;
- completed.

Do not implement progression as scattered independent timers in UI components.

Every ready, active, side-transition, and rest phase advances automatically when its authoritative timer expires. Recovery advances directly into the next exercise's ready countdown without a separate exercise-transition screen. Pause/resume must preserve the exact remaining duration.

The user must always be able to:
- pause/resume;
- mute/unmute guidance;
- skip/advance;
- return to the previous exercise/step;
- see the current exercise and what is next.

## Spoken tempo/counting
Create an abstraction such as `TempoCoach` / `AudioCoach` rather than calling SpeechSynthesis directly throughout components.

MVP can use the Web Speech API (`speechSynthesis`) for spoken cues.

Requirements:
- guidance can be disabled;
- speed/cadence can be adjusted;
- speech must stop when workout pauses, exits, or advances;
- avoid overlapping queued utterances;
- design the interface so prerecorded audio can replace browser speech later;
- unsupported browsers must degrade gracefully to visual cues.

Do not assume every exercise uses `1, 2, 1, 2`. The exercise/prescription model must declare the cue pattern and cadence semantics. Spoken counting is cadence guidance only and does not represent a prescribed rep target.

## Media rules
Exercise video URLs/paths belong in exercise data.

UI should support:
- autoplay where browser policy permits;
- muted looping reference clips;
- poster/fallback state;
- replay;
- graceful missing-media behavior.

Do not bundle large production videos into source control unless explicitly requested. Use placeholder media references during scaffolding.

## Persistence
For MVP, use local browser persistence for:
- audio preference;
- preferred effort level;
- lightweight workout completion state;
- recent workouts.

Wrap persistence behind a repository/service interface so cloud persistence can be introduced later.

## Testing priorities
Highest-value tests:
1. workout sequence construction;
2. phase transitions;
3. timer pause/resume;
4. count/tempo scheduler;
5. side-switch behavior;
6. finishing a workout;
7. persistence of user settings;
8. critical start-workout -> complete-workout E2E flow.

Do not spend early effort snapshot-testing static presentation components.

## Performance
- Optimize for mobile browsers.
- Lazy-load non-current exercise media.
- Preload the next exercise's lightweight metadata/media when sensible.
- Avoid loading the entire video library on initial navigation.
- Keep the workout player responsive even when media is slow.

## Documentation discipline
For paid public launch work, consult `docs/LAUNCH_READINESS.md` first. Keep its
stable task IDs, statuses, verification evidence and progress log current in the
same change that advances a launch item. Existing integration code or mocked
tests alone do not establish production readiness.

When changing architecture or product behavior, update the relevant Markdown documentation in the same change.

If implementation diverges from these documents for a good reason, update the docs rather than leaving contradictory instructions.

## Definition of done for MVP feature work
A feature is complete when:
- behavior works on mobile-sized viewport;
- loading/error/empty states are handled where relevant;
- keyboard/accessibility basics work;
- core logic has tests where appropriate;
- TypeScript/lint/tests pass;
- documentation is updated if behavior or architecture changed.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
