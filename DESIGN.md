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
states retain red; calendar matches use blue leading lines and explicit text labels. Color never replaces
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
- Lime identifies primary actions and small state indicators. Selected controls use a raised olive surface and retain their standard border.
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
Calendar match labels use light text on charcoal. Interactive boundaries use `--control-border`
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

Selected effort uses a raised olive surface and a lime Selected label. Standard
shows Recommended when unselected. Onboarding uses one native checkbox or radio
indicator per choice. Start and Resume are the primary lime actions on member
Home and Plan. Future-session review actions are secondary.

Home and Plan reuse the authored training title via `getWorkoutTrainingTitle`,
matching the editor, player and saved activity names. Outcomes remain supporting
copy rather than replacing the session name. Completion shows unique Movements,
Sets and explicitly labeled Planned time.

The full calendar places dates and today's training before the always-visible explanation.
“Why this plan fits you” contains the progression arc and a concise description of
schedule, priorities and recovery. Upcoming sessions initially show six records;
Show next reveals up to six more with a live count. Date selection and session
management retain the complete saved schedule.

Empty guest-library search results identify the ten-guide preview scope and keep
the existing library-access invitation. Audio labels describe the current
countdown/transition tones. Settings distinguishes account-backed preferences
from local guest/development-admin preferences.

See `docs/design-review-follow-up-2026-10-23.md` for the implementation record.

## Usability follow-up — 31 October 2026

Workout cards use a shrinkable single-column grid on phones, with titles scaled
from 1.5rem to 2.25rem so names and supporting information remain scannable at
320px. Exercise-reference links in workout previews have an underlined affordance
and a minimum 44px tap height. Settings uses a compact upright heading to expose
guidance controls earlier on short screens.

Plan review names equipment and provides 44px Edit actions under editable row
labels. Saving an answer returns directly to review. Cloud-save errors offer a
retry that preserves the local snapshot; conflicting versions require an explicit
confirmation before replacing local changes with cloud data.

See `docs/design-review-2026-10-31.md` for findings and verification.

## Forms — 1 November 2026

Account entry uses a split layout on screens at least 56rem wide: the existing
Axyro welcome illustration and training message sit beside a focused form.
The illustration uses contain sizing on a continuous charcoal surface, with
separate spacing around the headline and caption so the image and text are
never cropped into hard black bands. Smaller screens show the form alone,
with a Back to Axyro link except on sign-in, where the shared header provides
home navigation. Registration,
sign-in, recovery and password replacement share this layout, upright headings,
persistent labels, orange primary actions and a secondary Google sign-in action
where supported. Sign-in leads directly into the email and password fields. Space
below the account shell keeps the mobile dock clear.

Profile, security, account-deletion, training setup, scheduling, workout editing
and library search fields share charcoal input surfaces, readable labels, 16px
input text, 52px minimum field height and orange keyboard focus. Plan setup uses
question-led headings and a thin orange progress line. Selected answers use a
raised charcoal surface and a checked radio. Existing
checkboxes, radio choices, ranges, validation and training behavior are retained.
Password fields have individually controlled Show/Hide actions inside the field;
password requirements are connected to the field for assistive technology.
The account-deletion action retains its warning and literal DELETE confirmation.

## Pro paywall — 1 November 2026

The paywall uses a compact benefits column beside membership choices at desktop
widths (56rem and above), with a stacked layout on phones. Context-specific
headings and existing benefit claims are preserved. Checkmarks use the shared
icon set. The membership area carries the Axyro Pro identity, explicit prices and
billing periods, and the existing currency selector. Prices align at the end of
each row. A raised charcoal surface and a checked radio mark the selected
membership. Orange fill marks the primary action. The membership modal opens
at its heading.

Membership loading is announced before account continuation becomes available.
When subscriptions are unavailable, the free workout is primary and free account
creation is secondary. Renewal terms, sign-in, restore and management links remain
available. Checkout, entitlement rules and currency selection behavior are retained.

See `docs/paywall-design-review-2026-11-01.md` for findings and verification.

An optional Promo code field sits below the membership choices using the shared
input styling. It is an editable UI placeholder with an explicit coming-soon
explanation: entered codes do not change pricing, get submitted, or persist.
Validation, redemption and checkout integration are deferred until promotions
are implemented.

## Pro modal — 2 November 2026

Plan and Activity in the shared navigation, and Explore Pro in Library, open a
shared access modal for visitors without Pro. Guests see the existing account
form in a compact single-column layout before membership offers; sign-in,
registration and password recovery switch in place. Home plan-creation actions
require this sign-in before questionnaire steps can open. The existing dark paywall and orange
selection/action styling are preserved. Monthly is first and initially selected;
Yearly is second. The dialog keeps a stable viewport-bounded frame through
membership and price loading, with internal scrolling. Authentication forms
retain a sticky close action; Pro membership offers have no close action.
It retains the underlying page, filter state and scroll position, traps keyboard
focus. Escape dismisses authentication forms but cannot dismiss Pro offers. Pro visitors continue directly to the selected page. Direct blocked routes also
show the sign-in modal for guests, with a sign-in action left behind when closed.

The shared access dialog enters with a 250ms opacity/scale transition from 0.96
using the existing ease-out token; its backdrop fades over the same duration.
Reduced-motion users receive an opacity-only entrance. Authentication Close and
Escape remain immediate; Pro offers cannot be dismissed. Browsers without `@starting-style` support show the dialog immediately.

Opening an exercise guide requires an account. Library cards and exercise links
in workout previews/editors open the shared sign-in modal for guests; direct
exercise URLs use the same gate. Signed-in Free members can read the first 10 guides in the library order;
remaining guides require Pro. The public library preview remains browsable.

## Plan creation and activation — 3 November 2026

The final questionnaire action replaces the questions with a centered creation
status: a spinner, a concrete current task and a short lifecycle checklist. Fast
results remain readable for 600ms, followed by a 250ms ready state; the interface
uses no invented completion percentage. Reduced motion uses the existing static
spinner fallback. Back and Exit retain cancellation behavior.

For signed-in Free members, the resulting schedule is a local preview. Plan opens
with that schedule inert behind the common paywall. This activation modal has no
close control and ignores Escape/backdrop clicks; its links still permit leaving
Plan. It reappears on reload while this tab retains the preview. Pro generation
opens the active schedule directly. Successful checkout resumes the saved answers
through the authorized planner and replaces the preview with an active plan.

The created-plan activation paywall leads with “Your plan is ready” and “Axyro Pro
includes your training schedule and guided sessions.” Other paywall entry points
retain their existing context-specific invitation copy.

## Free exercise/workout boundary — 3 November 2026

Signed-in members see the full 40-exercise catalog. The first ten in the shared
library order use View guide; remaining cards show the existing Pro badge and
Unlock guide. Search and pagination retain this same free set. Guests see the
first ten previews and sign in before opening a guide. Foundation Strength stays
the first and only free workout. Other workouts and exercise guides open the
same non-dismissible Pro paywall as the Plan page. Sign-in forms stay dismissible.

## Plan page polish

The plan dashboard reads as a practical training diary: steady, court-focused,
and built around the existing dark/orange brand. Section order and scheduling
behavior stay intact. The calendar carries the detail; today's workout carries
the strongest action.

- Use 4px spacing steps, 500-weight upright headings and sentence-case captions.
- Training uses a fine orange leading line; matches use blue (`--calendar-match`).
  Days with both split the leading line equally: orange above, blue below.
  The legend uses matching colors, and explicit labels remain alongside outcomes;
  completed sessions keep checks, and skipped sessions keep dashed borders.
- Today has a white top marker, selection an orange outline, and keyboard focus
  the shared focus ring. These states remain independent.
- The training arc uses the same leading-line detail on its current phase.
  Supporting panels stay neutral, and scheduling controls use the existing icon set.
- Keep compact calendar text at least 11px, tabular dates, mobile reading order,
  and the existing safe-area navigation clearance. No generated imagery or new motion.

Polish workflow: [unslop by Damir Sokolovsky (@heydamir)](https://github.com/heydamir/unslop),
licensed CC BY 4.0.

### Calendar day details

Selecting a date opens its details immediately: a sticky supporting panel above
upcoming games at desktop widths (64rem and up), and a native modal bottom sheet
at narrower widths. Keep the calendar's size unchanged. Reveal the desktop panel if it is outside
the viewport; retain the calendar's scroll position when closing the mobile sheet.
The sheet traps focus, locks background scrolling, supports Escape/backdrop/close,
and returns focus to the selected date when dismissed. Resizing across the
breakpoint changes presentation without losing the selected date.
On phones, float the rounded sheet 12px from the side and bottom edges, respecting
safe-area insets. Slide/fade up in 240ms and down in 200ms using the existing ease-out
curve; retain the modal and scroll lock until dismissal finishes. Reduced motion
uses a 120ms fade without translation. Desktop panel updates remain immediate.

Show the full date, existing workout status, duration, exercise count, difficulty,
and adaptations. Omit the warm-up/main/cooldown timing chips from this compact
panel; those sections remain part of the actual session and workout details.
The sticky action area orders Start training first for any scheduled session
(including future dates), followed by View exercises and Add game, with equal
8px gaps. Group Move training and Cancel training together, preserving 44px touch
targets. Use 12px between workout content and these controls, and 16px before
the action area. Completed and skipped sessions have
no Start action here. Match editing and deletion confirmation
replace the day content inside this same panel; Escape returns to the day first.
Upcoming games remain available below the desktop panel. Scheduling, recovery and
persistence rules are unchanged. Retain the charcoal surfaces, current typography,
training and match markers. A dot marks today, a raised olive fill marks the
selected date, and an outline marks keyboard focus.

### Signed-in home

The signed-in home leads with the next action. The example week helps players
without a plan see where training and recovery fit around a match. With a plan,
the session card shows the workout, duration, exercise count, and difficulty.
Both cards use a thin orange leading edge and neutral surfaces, with orange
also marking the primary action and match day in the example week.

## Landing page polish — 10 November 2026

The public landing page leads with home training for padel and the existing
exercise demonstrations. Upright headings, shorter descriptions and compact
mobile spacing bring the preview closer to the main action. The hero uses one
primary plan action and a secondary free-workout link. Rotating promotional
words and the floating reassurance card are removed. Exercise previews retain
their pause controls and reduced-motion behavior. Orange progress indicators
connect the player phases, while timers and supporting icons use neutral text.

The lower landing sections use 32px headings on phones and 24px chapter titles.
Player timing uses neutral text so orange progress segments indicate the phase.
The closing action group omits the repeated promotional tagline.

## Settings polish — 11 November 2026

Settings uses direct section headings, compact control rows and 13px supporting
text. Orange marks checked preferences and selected options. Effort and duration
controls are capped at 32rem on desktop. Storage information is split into short
paragraphs, with provider disclosures and deletion consequences available on the
page. The existing confirmation flows govern reset and deletion.

## Shared spacing — 11 November 2026

Use a 4px spacing scale. Shared tokens cover 4, 8, 12, 16, 20, 24 and
32px. Card headings and supporting copy use 12px separation, with 24px
from text to actions. Related actions use 12–16px gaps, and landing action
groups use 24px horizontal and 16px vertical gaps. Mobile landing actions
stack in reading order. Cards use 24px padding, reduced to 20px in compact
mobile settings. Larger section spacing remains responsive.

### Mobile exercise overview

Below 42rem, exercise overview media spans the card's content width. GIF/image
references retain their natural proportions instead of sitting left-aligned in a
fixed 112px strip. Keep the full movement visible, without cropping; retain layered
movement-frame and missing-media behavior. Place the interval number beside the
exercise title below its media. The number belongs only to the title row; the
description and timing cells align with the full media width without a number gutter.
Use 16px card insets, 12px internal gaps, sentence-case timing labels, and the
existing charcoal surfaces and typography. Remove the redundant “Unchanged” /
“Guided interval” sublabel beneath rounds. Player and library media are unaffected.
