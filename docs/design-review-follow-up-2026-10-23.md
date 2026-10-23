# Axyro design review — follow-up

Date: 2026-10-23
Method: `emil-design-eng`, browser inspection of the production build, and source inspection.
Status: All 11 findings implemented. The original observations remain below as the review baseline; see the implementation record at the end.

## Assessment

The first pass improved the guest flow: setup choices are no longer covered by
Start, library cards are more compact, and the landing has less repeated content.
The next improvements should address player visibility, honest state styling,
consistent session names, and hierarchy in the member workflow. The existing
palette and movement imagery remain useful foundations.

## Scope and evidence limits

- Inspected public landing, workout browsing/setup, free-preview search, settings,
  sign-in, active player, technique and guidance dialogs, and completion at
  390 × 844.
- Inspected onboarding, member Home, Plan overview, full calendar, and Activity
  using synthetic account and training-plan fixtures in an isolated browser.
  Member Home, Plan and calendar were also inspected at 1440 × 1000.
- Confirmed player layout and reduced-motion behavior in fresh sessions at
  844 × 390, 320 × 568, and 390 × 844.
- The protected editor redirected to sign-in because client-side account fixtures
  do not authenticate server-protected routes. Its rendered UI is outside this
  review; that redirect is not reported as an application defect.
- A synchronization warning appeared during synthetic member navigation. It was
  excluded from findings because the mock environment and rapid navigation can
  affect synchronization. No claim about real account synchronization follows.
- No real accounts, purchases, saved plans, or production data were changed.
  This is not a full performance/accessibility audit or physical-device test.

## Findings

High priority covers failures of core visibility or an explicit accessibility
preference. Medium covers task clarity and usability. Low covers copy polish.

| ID / priority | Before                                                                                                                                                                                                            | After                                                                                                                                                                                                                                                        | Why                                                                                                                                                     |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F01 / High    | At 844 × 390, tapping Skip scrolls the player's clipped stage. The exercise title and most of the timer disappear above the stage while the controls remain below.                                                | Add a layout for short landscape viewports. Fit the phase, timer, movement reference and playback controls together; reduce reference height and supporting copy before clipping essential information.                                                      | A phone placed sideways must still provide the information needed to follow a workout.                                                                  |
| F02 / High    | With reduced motion enabled, the active cadence bars still run `cadence-pulse`. The animation changes `height` continuously.                                                                                      | Supply an explicit reduced-motion state for cadence. Keep useful rhythm information available without continuous size movement. For normal motion, use `transform` rather than animating height.                                                             | The preference is currently ignored in a core player element. Height animation also introduces avoidable layout work; dropped frames were not measured. |
| F03 / Medium  | The same planned session is named “Endurance & Power” in the Home introduction and lists, but “Faster lateral movement” in its training card and Plan.                                                            | Use one user-facing session title across Home, Plan, Activity and player. Put any secondary training outcome in a clearly subordinate label.                                                                                                                 | Users should recognize the session they are about to start as the same one they reviewed.                                                               |
| F04 / Medium  | Selecting Challenging leaves Standard filled orange while Challenging gains an orange outline. Standard has no visible Recommended label.                                                                         | Reserve the strongest selected treatment for the selected effort. If Standard remains recommended, identify that recommendation with a small explicit label and neutral styling.                                                                             | Two different states currently compete for the same visual meaning.                                                                                     |
| F05 / Medium  | Unselected onboarding options have solid orange circles at the right and native unchecked inputs at the left. A checkmark appears inside the orange circle only after selection.                                  | Use one coherent selection indicator. Keep unselected indicators neutral and reserve orange fill/checks for selected options.                                                                                                                                | Bright filled circles look selected even when the native checkbox says otherwise. The duplicate indicators add noise to long questionnaires.            |
| F06 / Medium  | Member Home and Plan use near-black Start buttons on dark surfaces, while the active navigation tab is bright orange and supporting controls have strong outlines.                                                | Give the immediate Start/Resume action the primary orange treatment. Keep review, refinement and navigation visually secondary.                                                                                                                              | The daily action should be the easiest control to identify. This is a hierarchy issue, not a text-contrast failure.                                     |
| F07 / Medium  | Searching “shoulder” in the six-guide free preview returns “No exercises found”, despite shoulder exercises existing in the full catalog.                                                                         | Say “No free-preview guides match” and explain the search scope. Offer Clear filters and the existing Pro/library-access route without exposing protected guides or changing entitlement rules.                                                              | A preview limitation currently reads like a gap in the exercise catalog.                                                                                |
| F08 / Medium  | The full calendar opens with lengthy plan and engine explanations before the calendar. It then renders all 26 upcoming sessions with repeated management actions; the reviewed phone page is about 12,945px tall. | Put calendar navigation and the current/next session first. Group future sessions by week or reveal them progressively. Move “How this plan was built” into optional details and describe the user's goals, schedule and recovery choices in plain language. | A schedule-management screen should prioritize dates and actions. Repeated rows and implementation details make it difficult to scan.                   |
| F09 / Medium  | The five-minute Foundation Strength completion screen reports “Exercises: 5”, although the session repeats three unique movements across five work intervals.                                                     | Label the existing count “Work intervals”, or show “3 movements · 5 work intervals”. Keep planned duration explicitly labeled as planned.                                                                                                                    | Workout preview and completion should count the same concepts consistently. This finding does not request changes to skipping or completion logic.      |
| F10 / Low     | The FAQ asks whether the user can turn the “voice” off. The player and settings describe countdown and transition tones and a separate visual tempo control.                                                      | Use consistent audio terminology throughout the current experience. If the product requires spoken cues, track that as a separate behavior requirement rather than implying tones are spoken guidance.                                                       | The description should set an accurate expectation before the user starts.                                                                              |
| F11 / Low     | Settings says preferences “stay on this device”, while its own Data storage section says signed-in preferences are saved to the account; the storage service includes preferences in synchronization.             | Make the introduction conditional and accurate: guests save preferences locally; signed-in preferences also save to the account.                                                                                                                             | Contradictory persistence language weakens confidence in what the application remembers.                                                                |

## Source references

Line numbers describe the reviewed version and may shift later.

| Finding | Source / inspection anchor                                                                                                                                                                                                |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F01     | `src/app/globals.css`: `.player-stage`, `.player-content`, `.player-shell`, and the desktop player breakpoint near lines 5864, 6097, 6296 and 7106.                                                                       |
| F02     | `src/app/globals.css`: `.cadence-visual span` and `@keyframes cadence-pulse`, near lines 6382–6397; existing reduced-motion rules omit the cadence bars.                                                                  |
| F03     | `src/components/home/home-dashboard.tsx`: raw `session.workout.name`/`todaySession.workout.name` near lines 373, 421 and 589 versus `getWorkoutOutcomeTitle` in the training card; the same title helper is used in Plan. |
| F04     | `src/app/globals.css`: `.effort-option--recommended` and `.effort-option--selected`, near line 5192; `src/components/workout/effort-options.tsx`.                                                                         |
| F05     | `src/components/plan/plan-onboarding.tsx`: `Choice`, near line 180; `src/app/globals.css`: `.choice-mark`, near line 496.                                                                                                 |
| F06     | `src/components/home/home-dashboard.tsx`: daily action near line 431; `src/components/plan/training-plan-dashboard.tsx`: Start actions using `button--dark`; `src/app/globals.css`: `.button--dark`, near line 3933.      |
| F07     | `src/lib/library-access.ts`: preview selection occurs before search; `src/app/exercises/page.tsx`: filtering and empty state, near lines 46 and 139.                                                                      |
| F08     | `src/components/plan/training-plan-dashboard.tsx`: build explanation near line 861, calendar near line 1128, upcoming-session list near line 1485.                                                                        |
| F09     | `src/components/player/workout-player.tsx`: `sessionItems.length` labeled Exercises, near line 856.                                                                                                                       |
| F10     | `src/components/home/landing-page.tsx`: FAQ near line 80; `src/components/player/workout-player.tsx`: guidance dialog near line 1283.                                                                                     |
| F11     | `src/components/settings/privacy-data-settings.tsx`: settings introduction near line 62 and Data storage section; `src/services/persistence/user-storage.ts`: synchronized preference key and signed-in storage behavior. |

## Reproduction details for the player

Open `/workouts/foundation-strength/start?minutes=5` in a fresh browser context,
with viewport 844 × 390 and reduced motion enabled. Tap Skip once to reach the
first active interval.

Observed bounds after the tap:

| Element / state                | Observed value                                     |
| ------------------------------ | -------------------------------------------------- |
| Visible stage                  | y=81.3–281.2px                                     |
| Stage internal scroll position | 149px                                              |
| Exercise title                 | y=-31.7–3.5px, outside the visible stage           |
| Timer                          | y=14.6–94.6px, mostly outside the visible stage    |
| Cadence animation              | `cadence-pulse`, `running`, despite reduced motion |

The cadence animation also remained running at 320 × 568 and 390 × 844.
Those portrait cases did not reproduce the same landscape title/timer clipping.
The three fresh-context inspection probes completed successfully; these are
observations, not assertions that the design passes an accessibility audit.

## Suggested next implementation order

1. Fix landscape visibility and cadence reduced motion (F01–F02).
2. Unify session naming and selection styling (F03–F05).
3. Strengthen the daily action and clarify free-preview search (F06–F07).
4. Simplify the full calendar and correct completion labels (F08–F09).
5. Align audio and persistence copy (F10–F11).

Keep the first review and its implementation record as the baseline. These
recommendations do not require new subscriptions, analytics, catalog content,
workout timing behavior, or other product scope.

## Implementation record

Implemented on 2026-10-23.

| Finding | Implemented change                                                                                                                                                                                                                                          |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F01     | Compact two-column landscape player with a height-sized reference, smaller readouts and a single compact next-step dock. Specific guidance and essential controls remain visible after advancement.                                                         |
| F02     | Cadence animates with `transform: scaleY`; reduced motion disables the animation and retains static bars.                                                                                                                                                   |
| F03     | Home and Plan use the authored training title through the existing title helper, matching editor, player and activity names. Saved names and prescriptions are preserved.                                                                                   |
| F04     | Only selected effort has orange fill. Standard's recommendation is an explicit neutral label, including the planned-session editor.                                                                                                                         |
| F05     | Removed the duplicate orange choice marker; native checkbox/radio inputs provide the selection indicator.                                                                                                                                                   |
| F06     | Immediate member Start/Resume actions use the primary orange treatment across Home, Plan and the protected editor. Future-session review actions are secondary.                                                                                             |
| F07     | Empty guest search identifies the free-preview scope and retains Clear filters and the existing Pro invitation. Full-member search keeps its full-catalog empty state.                                                                                      |
| F08     | Removed the engine scorecard, compacted the calendar introduction, and moved the training arc into a native explanation disclosure after the calendar. The upcoming list reveals six sessions at a time without changing saved dates or management actions. |
| F09     | Completion counts unique Movements by exercise ID, separately from Sets and Planned time.                                                                                                                                                                   |
| F10     | FAQ wording now refers to audio, matching the current countdown/transition-tone experience. This change does not add spoken coaching.                                                                                                                       |
| F11     | Settings copy distinguishes account-backed preferences from local guest/development-admin preferences. Persistence behavior is unchanged.                                                                                                                   |

### Verification

- The first regression run reproduced landscape clipping, running reduced-motion cadence, ambiguous effort styling and inconsistent member titles.
- The player, selection, search and completion slice passed six focused browser tests.
- The combined browser regression run passed 26 tests covering the new fixes, earlier design fixes, accessibility, calendar outcomes, plan progress and weekly match management.
- All 368 unit tests in 62 files passed.
- TypeScript passed. Repository lint reported no errors and 188 existing warnings in installed skill scripts.
- Production build passed.
- A further 21 browser tests passed, covering contrast across routes and interactive states, plan creation/calendar/editor contrast, player recovery, keyboard navigation, onboarding selection, account-versus-guest settings copy, and both landscape player sizes.
- The protected editor was inspected with the local development administrator; its authored title and orange Start/Resume treatment were verified. The final editor treatment and plan contrast checks passed again after that visual correction.
- Changed application and test files pass ESLint without warnings. Formatting checks pass.
- Visual checks covered the phone calendar, desktop calendar, protected editor, selected effort, onboarding, and landscape player. In the 26-session fixture at 390 × 844, the calendar page's initial height is approximately 4,019px, compared with about 12,945px in the review. The six-record initial list and closed explanation account for most of the reduction; saved sessions remain available through Show next and calendar dates.

Physical-device touch behavior remains a manual follow-up. Automated viewport
coverage is not a substitute for testing on actual phones.

## Follow-up: show all content sections

At the user's request, content accordions have been removed. The landing
schedule-adjustment and editor examples, FAQ answers, plan explanation and
training arc, completion check-in and secondary completion actions are now
always visible. This supersedes earlier recommendations or implementation notes
about hiding these sections in disclosures. Action-specific rescheduling and
password forms retain their existing controls.
