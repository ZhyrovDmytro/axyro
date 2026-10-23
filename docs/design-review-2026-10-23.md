# Axyro design review

Date: 2026-10-23
Method: `emil-design-eng` skill, source inspection, and browser inspection of the running local app.
Status: All nine findings implemented. The original observations below are retained as the review baseline; see the implementation record at the end.

## Overall assessment

Axyro has a strong visual identity. The black-and-orange palette, athletic typography, consistent movement clips, and focused workout player give it a coherent character. The main opportunity is greater restraint: make useful actions easier to reach, reduce competing information, and make workout guidance readable at a glance while exercising away from the phone.

## Scope and limitations

- Mobile inspection at 390 × 844 pixels: guest landing page, workout library, Foundation Strength setup, count-in, active and paused player, exercise library, Bird Dog detail, settings, and Plan access gate.
- Desktop inspection at 1440 × 1000 pixels: landing page.
- Inspected CSS and components for layout, motion, interaction states, and messaging.
- Signed-in and Pro plan workflows were not visually reviewed.
- This was a design review, not a full accessibility, performance, or functional audit. Physical-device touch behavior was not tested.
- The subscriptions-unavailable state was observed locally; it is not evidence that production subscriptions are unavailable.

## Findings

High priority means direct friction in starting or following a workout, or misleading feedback. Medium priority means clarity, efficiency, or interaction polish.

| ID / priority | Before                                                                                                                                             | After                                                                                                                                                           | Why                                                                                                                                                                           |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D01 / High    | On mobile workout setup, the floating Start panel occupies the duration-selection area directly above bottom navigation.                           | Give Start a dedicated footer with reserved layout space. Keep duration and effort choices fully visible above it.                                              | The primary action should feel anchored and predictable without competing with the choices needed before starting.                                                            |
| D02 / High    | Library cards leave substantial empty space between descriptions and footers. The first exercise title begins below the initial viewport.          | Shorten the introduction and use content-sized cards with compact movement previews on phones.                                                                  | Repeated empty space increases the scrolling needed to find a movement.                                                                                                       |
| D03 / High    | The first count-in says “Warm-up complete” immediately after starting the workout.                                                                 | Use an accurate message such as “Your workout starts in 5 seconds.” Show completion language only after a completed phase.                                      | Inaccurate guidance weakens confidence in the player.                                                                                                                         |
| D04 / High    | The local Plan gate says subscriptions are unavailable, then offers “Create account to continue.”                                                  | Explain what account creation currently enables and provide a clear “Try the free workout” fallback.                                                            | The next action should explain how it helps; the current wording implies account creation will unblock planning.                                                              |
| D05 / Medium  | Two large headings and supporting copy precede the first workout. Cards place long goal/tag strings above workout names.                           | Use one compact introduction. Lead cards with the workout name, then duration, equipment, and one primary focus.                                                | Too many emphatic elements compete. Clear ordering makes workout comparison easier.                                                                                           |
| D06 / Medium  | The mobile landing page is approximately 14,200px tall, with overlapping explanations of planning, scheduling, personalization, and editing.       | Consolidate the story into the promise, player demonstration, plan example, library, and FAQ.                                                                   | The strongest proof loses impact amid repeated selling points. The measured height is specific to the reviewed viewport and content.                                          |
| D07 / Medium  | “Work” appears in the player header, media badge, and timer badge. Supporting instructions are approximately 12–13px.                              | Keep one prominent phase label and increase the useful movement cue. Preserve the large timer and clear orange Pause control.                                   | Someone exercising away from the phone benefits from fewer repeated labels and more readable guidance.                                                                        |
| D08 / Medium  | CTA letter effects run for 650ms plus stagger. Hero entrances run for 850–900ms. Supporting words rotate every 1.4 seconds.                        | Keep brief, purposeful entrances, use simple 120–200ms feedback on actions, and make supporting copy stable.                                                    | Motion should explain or confirm something without repeatedly requesting attention. These are design recommendations, not measured performance failures.                      |
| D09 / Medium  | Buttons and cards lift on unrestricted `:hover`. Button `:active` returns the control to its original position without distinct press compression. | Restrict hover movement to `@media (hover: hover) and (pointer: fine)`. Add subtle press feedback such as `scale(0.98)`, respecting reduced-motion preferences. | Touch interaction should confirm a press immediately and avoid lingering hover movement. The CSS exposure was verified; sticky hover was not reproduced on physical hardware. |

## Implementation references

Line numbers may change. The selectors and component names identify the relevant implementation.

| Finding | Source / inspection anchor                                                                                                                                                                                                                           |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D01     | `src/app/globals.css`: `.workout-start-action`, currently near line 5230; mobile Foundation Strength setup.                                                                                                                                          |
| D02     | `src/app/globals.css`: `.exercise-grid`, `.exercise-card`, `.exercise-card-copy`, `.exercise-card-footer`; `src/components/exercise-card.tsx`; mobile `/exercises`.                                                                                  |
| D03     | `src/components/player/workout-player.tsx`: “Warm-up complete” message, currently near line 255.                                                                                                                                                     |
| D04     | `src/app/plan/page.tsx` and `src/components/membership/paywall.tsx`; locally rendered `/plan` gate.                                                                                                                                                  |
| D05     | `src/app/workouts/page.tsx`, `src/components/workout/workout-library.tsx`, and `src/components/workout-card.tsx`.                                                                                                                                    |
| D06     | `src/components/home/landing-page.tsx`, `src/components/home/plan-story.tsx`, and `src/components/home/padel-story.tsx`.                                                                                                                             |
| D07     | `src/components/player/workout-player.tsx`; `src/app/globals.css`: `.movement-direction`, `.player-cue`, `.phase-pill`, and `.countdown`.                                                                                                            |
| D08     | `src/components/fancy/text-effects.module.css`; `src/components/home/landing-page.module.css`: headline entrance near line 1569, quality rotation near line 1621, and preview entrance near line 1750; `src/components/home/rotating-qualities.tsx`. |
| D09     | `src/app/globals.css`: `.button:hover`, `.button:active`, `.workout-card:hover`, and `.exercise-card:hover`.                                                                                                                                         |

## Strengths to preserve

- Black-and-orange identity with clear primary actions and selected states.
- Consistent exercise imagery and movement references.
- Focused player shell without the main app navigation.
- Large tabular timer and recognizable playback controls.
- Existing reduced-motion handling and safe-area spacing as foundations for further refinement.

These are positive observations, not a claim that every state has passed an accessibility audit.

## Recommended order

1. Fix the workout setup footer so it cannot obscure duration or effort choices (D01).
2. Correct the initial player message (D03) and clarify the unavailable Plan state (D04).
3. Reduce exercise-library card height and the distance to the first useful result (D02).
4. Simplify player labels and improve instruction readability (D07).
5. Simplify workout browsing and consolidate the landing story (D05–D06).
6. Refine motion and pointer-specific feedback (D08–D09).

## Verification for future changes

- At the reviewed mobile size and a shorter phone viewport, duration and effort choices remain visible and usable around the Start footer and navigation.
- Exercise cards follow their content without large unintended blank regions; compare how many movements can be scanned in the same viewport.
- The first count-in accurately describes the current state. Later messages still reflect completed phases correctly.
- The unavailable Plan state offers an understandable next step without suggesting that creating an account fixes unavailable billing.
- Timer, phase, useful cue, and playback controls remain clear in active, paused, and recovery states.
- Mouse hover, keyboard focus, touch press, and reduced-motion behavior receive separate checks. Test touch behavior on physical hardware.

## Review boundaries

Recommendations do not authorize changes to the exercise count, media, timing budgets, recovery behavior, access rules, or product scope. Any later implementation should preserve the project contracts and document intentional behavior changes separately.

## Implementation record

Implemented on 2026-10-23.

| Finding | Implemented change                                                                                                                                                                                               |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D01     | Start is a footer in normal document flow after duration and effort choices. Removed sticky positioning and the obsolete space reserved for it.                                                                  |
| D02     | Shortened the library introduction and preview note, fixed stretched card copy, and sized phone/tablet media previews to 10rem.                                                                                  |
| D03     | Initial main-work count-in says “Get ready to move”. Cooldown introduction says “Main work complete”.                                                                                                            |
| D04     | Product-loading failures explain account limits and offer the free starter workout. The unavailable state omits the signed-in purchase button.                                                                   |
| D05     | Compact workout-library introduction, smaller section title, workout names before a single focus label.                                                                                                          |
| D06     | Removed repeated benefits, duration and static-week landing sections. Schedule adaptation and editor illustrations remain in closed-by-default native details disclosures. Six complete library previews remain. |
| D07     | Removed duplicate header/media phase labels, leaving the phase beside the timer. Increased movement-instruction and focus-cue text; the cue can wrap.                                                            |
| D08     | Static hero supporting copy, plain CTA labels, 200/240ms hero entrances and 180ms media crossfades. Removed broad decorative scroll entrances and example-row arrival animations.                                |
| D09     | Limited button/card and supporting navigation hover movement to hover-capable fine pointers. Added subtle primary-control press feedback, with reduced-motion overrides.                                         |

### Validation

- TypeScript check passed.
- Unit tests: 62 files, 368 tests passed.
- Focused browser runs passed: 21 tests covering setup, library density, player labels/pause, duration, recovery and landing; 30 tests covering accessibility, subscriptions, optional equipment and landing; and 9 final regressions covering the subscription fallback, dock clearance, filtering, short-screen controls, desktop player layout and workout completion.
- Production build passed.
- Changed application and test files pass ESLint without warnings.
- Visual checks at 320, 390, 768 and 1440 pixels found no horizontal overflow or uncaught page errors in the landing, libraries and workout setup. Player controls were also checked at 320 and 390 pixels.
- Repository lint: no errors; 188 existing warnings in installed skill scripts.
- Physical-device touch validation remains outside this local browser review.

### Measured layout results

At 390 × 844 pixels, the landing is approximately 9,125px tall versus 14,243px at
review time, a reduction of about 36% with optional examples closed. The first
exercise card is approximately 384px tall. Its title occupies y=711–732px,
clearing the mobile navigation that starts near y=775px. These measurements are
specific to the reviewed content, viewport and browser font rendering.

## Follow-up: show all content sections

At the user's request, content accordions have been removed. The landing
schedule-adjustment and editor examples, FAQ answers, plan explanation and
training arc, completion check-in and secondary completion actions are now
always visible. This supersedes earlier recommendations or implementation notes
about hiding these sections in disclosures. Action-specific rescheduling and
password forms retain their existing controls.
