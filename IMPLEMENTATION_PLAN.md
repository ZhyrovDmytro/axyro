# Implementation Plan

Work incrementally. Each phase should leave the app runnable.

## Current increment — Daily ten
- Curate 69 exercises down to 40, preserving all seven original GIFs and three videos.
- Retain the three prone shoulder clips as executable floor movements; light dumbbells are optional.
- Default to 10 minutes, with 5 and 20 available throughout setup and quick starts.
- Preserve warm-up/cooldown in short plans and total time across effort changes.
- Update home, duration controls, plan refinement and workout previews.
- Verify media retention, body-area coverage, exact quick-start timing, generated-plan tolerance, snapshot/resume consistency and mobile accessibility.

The numbered phases below are historical implementation milestones, not a request to rebuild completed features.

## Phase 0 — Bootstrap
- Create Next.js + TypeScript project if repository is empty.
- Configure Tailwind.
- Configure lint/format scripts.
- Add Vitest.
- Add Playwright.
- Establish mobile-first layout and basic design tokens.
- Copy/retain project documentation.

Exit criteria:
- dev server runs;
- typecheck/lint/tests commands exist;
- one basic smoke E2E test works.

## Phase 1 — Domain and sample content
Build before polishing UI.

- Define Zod schemas/types for exercises and workouts.
- Add a very small sample dataset (3–5 placeholder exercises, 1–2 placeholder workouts).
- Validate all content.
- Implement workout sequence builder.
- Unit-test timed, unilateral, multi-set and rest sequences.

Do NOT spend time defining the final exercise library yet. Sample content is scaffolding only.

Exit criteria:
- invalid content fails validation;
- a workout deterministically produces executable session steps;
- sequence builder has meaningful tests.

## Phase 2 — Library screens
Implement:
- Home/Discover
- Workout list
- Workout detail
- Exercise list
- Exercise detail

Use sample content.

Prioritize clean mobile UX over elaborate visual design.

Exit criteria:
- user can browse a workout and understand what it contains;
- user can open an exercise and see video placeholder + instructions;
- workout detail has a Start action.

## Phase 3 — Workout player foundation
Implement the session engine and UI:
- ready state;
- active state;
- rest state;
- side-transition state;
- complete state;
- pause/resume;
- next;
- previous;
- set/exercise progress;
- current and next exercise.

Test reducer/state transitions independently from UI.

Exit criteria:
- sample workout can be completed end-to-end without audio;
- pause/resume is reliable;
- navigation does not corrupt session state.

## Phase 4 — Timers and cadence
Implement:
- authoritative timed-phase clock;
- visual countdown;
- cadence scheduler;
- effort presets that scale work, rest, and visual cadence;
- visual cadence indicator.

Do not connect browser speech until cadence logic is independently testable.

Exit criteria:
- timed exercises/rest work;
- phases advance automatically at zero;
- cadence remains synchronized after pause/resume;
- effort changes are deterministic.

## Phase 5 — Audio coach
Implement SpeechSynthesis adapter:
- speak cue;
- cancel;
- enable/disable;
- safe queue behavior;
- graceful unsupported-browser behavior.

Connect it to cadence scheduler.

Exit criteria:
- `1 / 2` or configured cues are spoken at expected cadence;
- pausing immediately cancels speech;
- disabling audio stops future speech;
- changing exercise does not leave stale speech queued.

## Phase 6 — Preferences/persistence
Persist locally:
- audio enabled;
- preferred effort level;
- recent workout metadata;
- completion timestamp/count.

Do not persist unnecessary transient session state initially.

Exit criteria:
- settings survive refresh;
- the Home page can surface the most recently opened workout;
- completing a workout is recorded exactly once;
- storage failures do not break the app.

## Phase 7 — Real content/media integration
Only after workout/player mechanics are stable:
- replace placeholder exercises with reviewed exercise catalog;
- add real workout definitions;
- connect prepared exercise videos;
- verify every exercise's instructions/cues/prescriptions.

This phase will be driven by separate product/content discussions.

Implemented first increment:
- reusable global exercise + sport-profile model;
- initial shoulder catalog (superseded by the curated 48-exercise library);
- Sport → Body Area selectors and filters;
- production exercise cards/details;
- stable video asset keys, filming requirements, and fallbacks.
- first timed Padel Shoulder Control workout using three reviewed exercises;
- timed Padel Core Rotation workout covering explosive rotation, controlled
  rotation, and anti-rotation with one dumbbell or bodyweight;
- three supplied, non-interactive looping exercise videos.

Still intentionally pending:
- broader reviewed Beginner, Intermediate, and Advanced Padel shoulder workouts;
- production video files/URLs for the remaining exercises;
- any rep-driven workout player behavior.

## Phase 8 — MVP hardening
- mobile browser testing;
- Safari/iOS speech/media testing;
- Chrome/Android testing;
- responsive desktop sanity check;
- accessibility pass;
- missing-video fallback;
- page visibility/background behavior;
- performance check;
- E2E happy path.

## Future phases — do not implement yet
Potential sequence after MVP validation:
1. custom workout builder;
2. edit/copy predefined workout;
3. richer history/progress;
4. authentication;
5. cloud persistence;
6. personalized programs;
7. richer audio coaching;
8. native/PWA enhancements if justified.
