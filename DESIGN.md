# Axyro design system

## Direction

Black and electric orange: an athletic training interface with strong contrast,
a near-black page canvas, charcoal working surfaces, bold headings, and unmistakable primary actions.
This replaces the former warm field-guide / lime palette across the whole app,
including landing, home, libraries, plan, editor, account, settings, and player.

## Shared palette

The source of truth is `src/app/globals.css`; the landing CSS module consumes
these same tokens.

| Token                  | Color     | Use                                       |
| ---------------------- | --------- | ----------------------------------------- |
| `--ink`                | `#111111` | Text, navigation, feature panels          |
| `--canvas`             | `#0e0e0e` | Near-black page background                |
| `--paper`, `--surface` | `#1b1b1b` | Charcoal reading surfaces and controls    |
| `--muted`              | `#bdbdbd` | Secondary text on dark surfaces           |
| `--accent`             | `#ff6b24` | Primary actions, selection, training days |
| `--accent-strong`      | `#e6530e` | Progress and strong graphical accents     |
| `--border`             | `#3a3a3a` | Quiet structural boundaries               |

The “This week” list highlights scheduled training sessions with a solid orange
surface, dark primary text, and dark brown duration/completion labels. Recovery
days retain their neutral surface; today's inset outline remains independent.

Orange surfaces use black text. Secondary text on dark surfaces is light gray. Orange-filled controls scope
their supporting text to dark brown for readable contrast.
Black panels use white text with `#d0ccc9` supporting text. Destructive and pain
states retain red; match days retain blue and text labels. Color never replaces
an accessible state or a label.

The page canvas is near-black. `--text` (`#f5f5f5`) is the primary foreground;
`--ink` stays black for dark surfaces and text on orange controls. Nested media,
inputs, and utility surfaces use `--surface-soft` (`#240404`). Native controls
use `color-scheme: dark`. Orange is secondary: actions, selection, progress,
and a fine featured-card outline. Large workout cards and previews remain dark.

## Hierarchy and surfaces

- Black library intro panels and the black landing opening establish the brand.
- Large intro headings use a heavy italic treatment for an athletic voice;
  instructional copy, exercise titles, forms, and timers remain upright.
- Orange identifies primary actions and selected states; large training panels stay dark.
- Navigation is black on desktop and mobile, with an orange active destination.
- The public landing page and signed-in app use the same compact framed header.
  Brand sits left, desktop navigation in the middle, and a labeled Sign in or
  Account action at right. On mobile, the five destinations use the existing
  bottom dock. Workout routes retain their focused player-only state.
- Supporting cards remain charcoal; feature corners are 1rem. Avoid decorative
  gradients, glow, and washed-out olive surfaces.
- Reuse the existing sans-serif stack; no new font downloads or dependencies.
- Display type stays below 6rem; tracking is no tighter than -0.04em.

## Mobile and interaction

The centered shell remains 76rem maximum with 1rem mobile gutters. Preserve
safe-area clearance, 44px navigation targets, 3.25rem primary controls, visible
keyboard focus, reduced-motion support, and existing responsive layouts.

The player uses orange, tabular timer digits with the lighter weight of the
signed-out landing demo, a quieter white exercise title, and a separate phase
label. The next-exercise preview is 6 × 4.5rem on phones and 7.5 × 5.25rem on
desktop, keeping movement references legible alongside the controls.
Previous, Pause/Resume, and Skip sit directly below Focus and Technique in the
exercise content column. The next-exercise preview remains below the main stage.
During recovery, a solid orange panel labeled “Recovery” replaces the current
exercise media, and the heading reads “Recovery”. The countdown, next-exercise
preview, and playback controls remain available.

The workout player remains a full-height, glanceable interface. Orange marks
progress, cadence, and the primary control. Keep the timer, phase, reference
media, pause, previous/next, and audio controls readable and reachable. Recovery
and workout timing behavior are unchanged.

Duration options remain 5, 10, and 20 minutes, with 10 as the default. Selected
controls have explicit accessible states. Reference-only content and all 40
curated exercises retain their existing behavior.

## Contrast requirements

Text must meet 4.5:1 (3:1 for large text), including paused and selected states.
Pause may dim exercise imagery, never instructions, phase labels, or controls.
Match-day blue uses black labels. Interactive boundaries use `--control-border`
(`#777777`) while non-interactive dividers retain `--border`. Focus and progress
use bright orange on the dark canvas; placeholders remain fully opaque.
`tests/e2e/contrast-states.spec.ts` covers hover/focus, onboarding, calendar match
days, editing dialogs, paused guidance, and completion feedback with axe.

## Landing exercise preview

The main demo cycles through five exercises: wood chop, lateral stick, bird dog,
Dynamic Court March, and side-plank rotation, every 3.5 seconds using existing
catalog media and static posters. A 180ms crossfade and
short horizontal slide connect the exercises; the name updates with the image.
Only the current and next clips animate. Pause holds the current exercise on its
poster. Offscreen and hidden-tab previews stop; reduced motion disables automatic
rotation and transitions, while explicit Play still enables the current clip.

## Focused landing and interaction polish

The public landing follows a shorter sequence: promise and movement preview,
guided-player explanation, one three-step Pro plan example, six complete exercise
previews, FAQ, and closing action. Repeated benefits, duration and static-week
sections are removed. The promise strip and FAQ still explain 5, 10 and 20 minutes.
The plan-adjustment and workout-editor illustrations are always visible as
headed sections. They only change example state and never saved training data.
Informational sections, FAQ answers and completion feedback stay expanded;
content sections must not use accordions.

The hero slogan remains “Train anywhere. Win on court.” on three fixed lines.
Supporting copy cycles through power, control, confidence, endurance, speed and
stability with orange emphasis, a shared baseline and normalized lowercase height.
The words have no underline. The fixed-width word stack prevents
layout shifts; reduced motion shows power without animation.
Plan CTAs use plain labels and brief press feedback. Headline and preview
entrances last 200ms and 240ms respectively. Broad scroll entrances and CTA letter
swaps are removed; functional preview playback and chapter selection remain.
Reduced motion disables movement. Hover movement is limited to fine-pointer,
hover-capable devices, while primary controls use a subtle scale on press.

## Workout setup, browsing and guidance

The workout Start action occupies a footer in normal document flow after duration
and effort choices. It cannot float over those choices or the mobile navigation.
Workout browsing uses a compact introduction and one focus label per card, with
the workout name preceding that focus. On phones and tablets, exercise cards use
10rem movement previews and content-sized copy instead of stretched copy panels.

The player displays its phase once beside the timer. The initial main-work count-in
says “Get ready to move”; entering cooldown says “Main work complete”. Movement
instructions use 0.9rem text and the primary focus cue uses 1rem with wrapping.
Timer size, playback actions, automatic progression, recovery and media stay intact.

If membership products cannot be loaded, the paywall explains that registration
cannot unlock Pro while subscriptions are unavailable and offers the free starter
workout. Signed-in users see the same working fallback without an unusable purchase
button. Available membership products retain the existing checkout flow.

The dated findings and implementation record are in
`docs/design-review-2026-10-23.md`.

## Follow-up: player and member workflow

On short landscape screens (at least 35rem wide and at most 32rem high), the
player uses a compact two-column stage and a single compact next-step dock.
The movement reference fits the available height. The title, timer, phase, focus
cue and playback controls stay together after advancing; the generic repeat
instruction is omitted in this layout while specific guidance remains available.
Cadence bars animate with transform rather than height. Reduced motion displays
static bars; it does not remove the visual cadence affordance.

Selected effort uses an orange fill with dark text. Other efforts stay neutral;
Standard has a small Recommended label when it is not selected. Onboarding uses
one native checkbox/radio indicator per choice, with orange accent and border only
for selected choices. Start and Resume are the primary orange actions on member
Home and Plan; future-session review actions are secondary.

Home and Plan reuse the authored training title via `getWorkoutTrainingTitle`,
matching the editor, player and saved activity names. Outcomes remain supporting
copy rather than replacing the session name. Completion shows unique Movements,
Sets and explicitly labeled Planned time.

The full calendar places dates and today's training before the always-visible explanation.
“Why this plan fits you” contains the progression arc and a concise description of
schedule, priorities and recovery. Upcoming sessions initially show six records;
Show next reveals up to six more with a live count. Date selection and session
management retain the complete saved schedule.

Empty free-library search results identify the six-guide preview scope and keep
the existing library-access invitation. Audio labels describe the current
countdown/transition tones. Settings distinguishes account-backed preferences
from local guest/development-admin preferences.

See `docs/design-review-follow-up-2026-10-23.md` for the implementation record.
