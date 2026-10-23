# UX Flows

> Current account/subscription extension: see [Membership implementation](docs/MEMBERSHIP_IMPLEMENTATION.md), [Authentication](docs/AUTHENTICATION.md), [Billing](docs/billing.md), and [Multi-user data](docs/MULTI_USER_DATA_ARCHITECTURE.md). These replace earlier local-only/no-account scope statements below. Guest access is the single free starter; personalized plans and full access require Pro.


## Navigation
Primary navigation:
- Home
- Plan
- Workouts
- Library
- Activity

The mobile navigation is a single five-item row above the device safe area,
with at least 44px-high links and an explicit current-page state. Activity is
also linked from Home and Plan; its existing Pro access policy still applies.
The shared header appears on both the public landing page and application
pages, with the same brand, destinations, and active-link styling for guests
and members. Desktop places the links inside a compact dark framed header;
mobile keeps the links in the bottom dock and the account action at the top.
Guests see **Sign in**, which retains the current pathname as the return
destination (authentication pages return home). Members see **Account**, leading
to account and settings management. Account/settings and authentication routes
highlight their corresponding action. The navigation is hidden during a
workout to keep player controls clear. Membership access rules are unchanged.
A keyboard-visible **Skip to content** link moves focus past navigation.

See [the UX review and core flow map](docs/UX_REVIEW.md) for the applied
checklist, recovery paths, and verification limits.

## Training plan setup
Initial setup is a focused path covering sport, broad goals, non-painful physical development areas, concrete Padel court movements, shot actions, capacity, a separate current-discomfort safety check, weekly schedule and available time, equipment, and review. Non-Padel setup omits the three sport-specific screens. It uses a conservative beginner experience default. Weekly schedule uses three accessible duration choices: 5, 10 and 20 minutes, with 10 selected by default. Every screen asks about one logical topic, shows question progress, supports Back and Exit, and explains how optional information changes the plan. Each multi-select screen enforces its own limit of three choices; selections made on earlier screens do not reduce the allowance on the current screen. Setup does not offer a quick-workout detour because questionnaire progress is not persisted. The user can exit explicitly and begin again later.

After the first plan exists, **Change session length** / **Refine my plan** opens schedule and duration first, then physical focus and the Padel movement, shot, mobility/capacity, playing-experience, and upcoming-match questions. These answers rebuild the upcoming plan; current pain remains a separate protective input rather than being mixed with areas the athlete wants to strengthen.

The chosen session length is a generation constraint, not a suggestion. Every
generated session must be within the smaller of 10% of the target or two
minutes, using the same duration model as the player. If the current eligible
catalog cannot meet that range, setup remains on the review step and explains
the closest compatible duration plus the reversible choices: shorten the target
or relax equipment/discomfort constraints. It never saves or opens the
out-of-range 60-day plan.

Padel priorities are positive training inputs and use recognizable outcomes: faster net approaches, controlled recovery for lobs, split-step reaction, lateral coverage, braking, bandeja/víbora rotation, overhead power/control, volley stability, racket control, mobility, balance and endurance. Non-painful physical focus areas prioritize matching exercises. Pain is a protective input: it removes conflicting workouts and displays a clinician-oriented safety message. Do not present pain as something the app diagnoses, treats or guarantees it can fix.

## Training plan overview and calendar
Each day in the overview's weekly schedule offers **Add match**, opening the
same dated match form as the full calendar. Saved matches can be edited from
that row and remain visible alongside a training session on the same day.
Saving persists the match without automatically moving training; recovery
rebalancing remains an explicit action in the full calendar.

The Plan landing page displays the chosen session length and a direct link to change it, explaining that 10 minutes is the default with 5 and 20 available. It answers “what should I do next?” with only the today/next workout, the current week’s schedule, compact 60-day progress, and a **View full calendar** action. Profile refinement and activity remain available as secondary links without expanding the landing view into a management dashboard.

The deeper full-calendar workspace leads with the next 60 days and today’s training, followed by a chronological session list. Six upcoming sessions are shown initially; Show next reveals up to six more and announces the visible count. All scheduled dates remain available in the calendar. Selecting
a training date reveals the workout name, description, duration, exercise count,
status, a Warm-up / Workout / Cooldown duration summary, and its Foundation,
Build, Peak or Consolidate phase. The dashboard shows the
complete 60-day arc inside the always-visible “Why this plan fits you” section and marks the calendar-derived current week. The explanation describes schedule, priorities and recovery without planner-engine details. Session
cards explain the phase in plain language and, when a prescription changed,
show at most two compact “What’s changed” facts such as longer selected work
intervals or one fewer round. Opening that panel shows the full exercise
list and editing controls. Future dates are also selectable to add a match.
Once a match is added, its selected-day card exposes adjacent edit and delete
actions. Editing only changes match details; deletion is a separate action and
requires confirmation before the match is removed.
Rebalancing is explicit and currently moves planned strength sessions away from
a match and the preceding day. Sessions can be moved, removed with Undo, or
opened for editing. Profile answers remain editable by returning to setup.

## Edit a planned workout
Opening a planned session first shows a read-only review with the complete
timing, effort choice, and a prominent **Start workout** action in the hero next
to the visually quieter **Edit workout** action. Its hero, workout list, and
effort panel use the same visual structure as a workout opened from the workout
library. Editing is an explicit mode entered with **Edit workout**.
Session contents are always visible on both planned and library workout detail
pages; athletes do not need to expand an accordion to preview the exercises.
In edit mode, Warm-up, Workout, and Cooldown remain explicit sections with their
own duration and exercise count.
The athlete can rename the session and edit the main Workout block by reordering
or removing movements, adding a main-compatible exercise, and adjusting sets,
work seconds, and recovery seconds. Replace and Remove are grouped per exercise
and never appear in the normal review mode. The generated support sections
remain protected.
The editor includes effort selection and starts the saved copy in the standard
guided player. The source library workout remains unchanged.

The primary Start workout action is followed by a quieter **Adapt today** action.
It opens a mobile bottom sheet with Less time, Missing equipment,
Sore/uncomfortable, and Make today lighter. Missing-equipment choices show only
implements used by that session. Comfort choices use the established body-area
taxonomy and avoid diagnostic language. Every exercise row also exposes Replace,
which shows a short ranked list of compatible alternatives instead of the full
library.

Global adaptations show a concise Before/After preview with total and
per-section durations, exercise count, replacements/removals, and round changes.
Less time reduces main work first while preserving support sections. Missing
equipment and discomfort constraints apply to every section; Make lighter
primarily changes the main block. Use this session applies all
active constraints together; Cancel leaves the session untouched. Multiple
compatible overrides are re-derived from the original planned snapshot so order
of UI edits cannot accumulate drift. Reset adaptations restores that snapshot
without regenerating the plan. Once started, the existing player behavior is
authoritative.

## Signed-in Home
Goal: get the user into a useful workout quickly.

Before plan setup, Home is a proof-led landing page. **Create my plan** is the
dominant action, while a quick workout remains a quieter escape route. The page
shows a clearly labeled example week, the main benefits, a guided-player preview,
and a short explanation of how the plan is created so users can understand the
product before answering questions.

After a plan exists, Home becomes a visible daily dashboard organized as now,
next, this week, and block progress. An unfinished workout takes precedence over
starting another session and exposes Resume, Restart, Save as incomplete, and
Discard without an accordion. Today's planned session follows, then the current
week, next match, upcoming events, phase/focus, and 60-day completion. These
core details remain visible rather than being hidden inside disclosures. Plan
management and workout-library exploration are intentionally quieter actions at
the end. The Plan page remains the scheduling workspace for the complete
60-day calendar, match entry, and session management. Today is visually and
semantically marked in the calendar, and a training scheduled today is labeled
explicitly rather than relying on color.

## Quick-start workouts
The public workout page contains only a small basic shelf for someone who wants
to move immediately without creating a plan. Personalized or sport-specific
workouts come from the questionnaire-driven plan and are not exposed as a large
predefined catalog.

Useful card information:
- workout name;
- focus;
- duration;
- difficulty;
- equipment: with dumbbell / without dumbbell;
- number of exercises.

Potential filters can be added after enough content exists to justify them.

## Workout detail
The first viewport prioritizes starting: show the name, total time, required
equipment, compact effort choice (Light, Standard, or Challenging), and a
sticky Start workout CTA before the exercise list. Show the exercise overview
as a collapsed disclosure directly after the start panel. Opening it reveals the
ordered movements and their effort-adjusted prescriptions. Each exercise row
includes a compact preview beside its name and timing. It reuses the exercise's
real video or image when available and falls back to an intentional instruction
card rather than an invented movement silhouette. Exercise rows remain tappable
to inspect technique before starting.
Changing effort immediately updates the overall timed duration and the exact
movement list, work, between-set recovery, and between-exercise recovery shown
inside the exercise overview. Light can remove low-priority accessory work;
Challenging can add one compatible movement that follows the same workout goal.
Effort choices lead with felt outcomes such as fewer movements or an extra
movement. Percentage changes remain available in a secondary timing disclosure
rather than competing with the Start action.

## Exercise library
The mobile-first control order is search, then body-area chips. Every chip and
debounced search change updates results immediately; there is no Apply step.
Each single-select control shows its current state directly, without a duplicate
active-filter summary.

The query string is the source of truth for server-rendered results, shareable
deep links, refreshes, and browser history. On 360×640 and 390×844 viewports the
results heading is reachable in the initial viewport. On wider screens, the same
accessible controls expand into the compact desktop layout rather than becoming
a separate filtering implementation.

Results with a video or image appear before instruction-only entries. Cards use
compact media, label their media state as Video demo, Photo guide, or Instruction
guide. Pro results are paged at 18 items while preserving active filters in the URL.
Guests and Free members see a stable first 10 records, selected before filtering.
A single overflow gradient leads to Create account / Sign in for guests or Explore
Pro for Free members. Registration alone does not unlock the full collection.
Reference detail pages and their media remain public.

## Exercise detail
Top:
- name;
- looping video.

Then:
- purpose;
- selected-sport relevance;
- setup;
- how to move;
- key cues;
- common mistakes;
- default prescription and tempo;
- planned video views when production media is not available;
- equipment;
- categories.

## Start workout
On effort selection / Start:
- initialize session;
- show first exercise;
- allow a short ready countdown;
- use five short countdown tones and a distinct transition tone;
- begin active phase automatically;
- automatically advance from work to recovery and directly into the next exercise's ready countdown.

The player runs Warm-up, Workout, and Cooldown as one automatic sequence. Its
header names the current section and shows the current exercise within that
section. Crossing a boundary advances directly into the next section's ready
countdown without an extra confirmation tap. Skipping an active exercise is
recorded as skipped; a session may still complete when a support item was
skipped.

Keep effort selection inline on the workout detail rather than opening a configuration modal. Use persisted defaults for audio/tempo when available and expose quick controls in the player.

The player guidance sheet reports browser audio and screen-wake support,
separates visual cue tempo from effort, and offers opt-in caching for the current
workout's available media. Unsupported features retain visual guidance and a
clear status rather than blocking the workout. Dialog sheets trap focus, close
with Escape, and restore focus to their trigger.

## Active exercise
Visual hierarchy:
1. video/movement;
2. large remaining time and side (`Left`, `24 sec`, etc.);
3. set progress;
4. cadence/tempo cue;
5. controls.

On phone-sized viewports, the player is a single non-scrolling viewport. The
movement media uses roughly 35% of the viewport height, the phase/timer/set
status follows immediately, and a compact **Up next** preview plus Previous,
Pause/Resume, and Skip controls stay docked at the bottom. Audio remains in the
header. Active work shows one short coaching cue; Setup, Do, and Watch for live
in an on-demand Technique sheet. Every essential control must remain visible at
360 × 640 without scrolling during ready, work, side-transition, and rest.

Controls:
- previous;
- pause/resume;
- next;
- mute/unmute;
- tempo.

## Rest
Rest screen/state should clearly show:
- large remaining seconds;
- next exercise/set;
- a small looping preview video beside the next exercise title;
- Skip rest.

Rest ends automatically at zero and starts the next exercise's ready countdown
without a separate transition screen.

Audio can optionally provide a final countdown.
Every unilateral switch shows the exercise-specific action (Switch hand, leg,
or side). The final available five seconds use countdown tones and the next-side
work starts with a distinct transition tone. Visual cues remain available when
audio is muted or unsupported.

## Completion
Keep first version simple:
- workout complete;
- total elapsed time;
- exercises completed;
- a dominant Done / return-home action;
- an always-visible, optional "How did that workout feel?" check-in with Too easy,
  Just right, Too hard, and Pain or discomfort choices;
- always-visible Repeat workout and Back to last step secondary actions.

The answer saves immediately as immutable history for that completion. Too easy
or Too hard may show one plain-language change for the next comparable planned
session with Apply change and Keep current level controls. Just right preserves
the normal 60-day progression. Pain or discomfort first asks for the affected
area, then pauses matching automatic progression, shows concise safety guidance,
and offers a review path. The product never presents this as diagnosis or
rehabilitation advice.

Avoid gamification until core experience is validated.

## Activity

Activity is a newest-first monthly history reached from Home and Plan. Compact rows show date,
session name, an icon plus status label, planned duration, actual duration only
for completed sessions, and post-workout feedback when present. A missed status
is neutral rather than punitive. Today remains scheduled; a still-scheduled
entry becomes missed only after its local calendar day passes.

The plan's upcoming-session controls use a lightweight confirmation for Skip
session and Cancel. Skip is an explicit training decision; cancellation means
the planned session was invalidated or removed. Neither is displayed as missed,
and neither shows a fabricated `0 min` actual duration.

Selecting an Activity row opens a read-only immutable detail view. It shows the
original planned duration, paused-time-adjusted actual duration where measured,
progression phase, selected effort, structured adaptations, the exercise and
section snapshot actually performed, skipped exercises, replacements, and the
linked feedback. It never opens the editable current-plan workout.

Exiting the player opens “Leave workout?” and explains that progress is saved.
Save & exit preserves the exact phase and returns it paused; the normal session
CTA and prominent Home/Plan card become Resume workout. Save as incomplete is
an explicit terminal action and never records a completion. Page hide, reload,
tab close, and browser navigation persist without relying on a browser prompt.
Only one active session is allowed.

Past untouched sessions become missed after their local date ends. The Plan
page offers Do it today, Reschedule, or Skip for one missed session and a
consolidated review for several. Rescheduling moves only that occurrence and
refuses an occupied date. After the 60-day end date the Plan page shows neutral
completed/skipped/missed totals and a user-triggered Build next 60 days action.
Stable profile preferences carry forward, while pain exclusions are explicitly
reconfirmed rather than silently retained.

## Future custom workout flow
Not MVP, but preserve this expected flow:

`Workouts -> Create -> Add exercises -> Configure prescription -> Reorder -> Save -> Start`

The saved workout should open in the same detail/player UI as predefined workouts.

## Daily quick starts
Home leads with “Your daily 10. Make it count.” and a plan setup action, with a
quick-workout link alongside. Workout cards use existing movement media and
show the default 10-minute budget. Details provide labeled 5/10/20 radio choices;
10 is selected initially. Effort changes recovery/work balance, not total time.
The selected duration is carried in the start and resume URL. The preview shows
the same seconds as the player, including count-ins and side changes.

## Retired content and preserved videos
All 40 exercises remain browseable and eligible for home training. The three
prone shoulder movements use the floor with optional light dumbbells, retaining
their stable IDs and video paths. They are available to plans, replacements,
the plan editor, and the existing Shoulder & Overhead Durability quick start.
Their detail pages show the simplified titles and no reference-only warning.
A saved plan containing a retired exercise still prompts an explicit rebuild;
the old stored plan is preserved until replaced and activity history is unaffected.

## Signed-out home landing

Signed-out visitors to `/` see the product landing page described in
[Guest home landing](docs/LANDING_PAGE.md). The primary Create my plan action opens `/plan/setup` and promotes Axyro Pro.
A quieter secondary link offers the free Foundation Strength workout without
registration. Signed-in visitors keep the existing
home/dashboard flow.

## Search and recovery

Exercise search updates the URL after a short debounce. Changing search or body
area resets pagination. URL navigation, the empty-state **Clear all filters**
link, and the search-panel **Reset filters** button also synchronize the visible
search text. Result counts are announced as status updates.

Setup focuses and scrolls to the new step on Continue or Back, and restores focus
when returning from the paywall. Existing selections remain in the setup state.
Unexpected route-rendering failures provide **Try again** and **Go home**;
missing pages provide **Browse workouts** and **Go home**. These recovery screens
do not promise that unsaved input survives an unexpected render failure.

### Compact weekly schedule
The plan overview uses compact day rows. Training is orange, matches are blue,
and recovery uses a neutral surface. A day with both uses blue and retains both
the workout and match labels. Today has an outline independent of day type.
“Move training” opens an inline date control for scheduled sessions, including
missed sessions. It reuses calendar rescheduling, persists the new date, blocks
occupied training dates, and keeps matches on their original dates. Dates must
be today or later and within the current plan. This changes one session, not the
recurring availability preference. Completed sessions cannot be moved here.
The progress panel sizes to its content instead of stretching to the week.

Shared training and match dates also display an orange “Training + match · Same
day” label on the blue match row, so the overlap is explicit without relying on
color. When any matches exist, “Rebalance plan” is available beside “This week”
and applies the same match-aware rebalancing as the full calendar.

Rebalance actions announce their result on both plan screens: how many workouts
moved, whether no changes were needed, or whether nearby dates were unavailable.
Workouts already started or recorded are preserved; the result explains these
exceptions. Weekly rows display lifecycle status so an in-progress workout is
not mistaken for an unstarted scheduled session.

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


### Recovery, background timing, and interval sounds
Recovery occupies exactly the exercise reference media frame. The reference fades
out over 200ms as the recovery panel fades in; its pause symbol breathes visibly from 86% to 118% scale every 2.4 seconds,
with an expanding ring that fades outward.
Pause freezes the pulse, and reduced-motion mode removes both effects.
Up next shows recovery and its duration whenever it is the next interval, including
recovery between sets of the same exercise.

Switching browser tabs does not pause a workout. The clock uses absolute deadlines
and catches up over all expired phases after browser timer throttling. Explicit
pause retains the exact remaining time. Closing or reloading still saves a paused
resume point. Browsers or operating systems may suspend background execution/audio;
the app catches up on its next callback instead of extending the session.

Audio guidance uses Web Audio tones instead of spoken cadence/count/start/stop
cues: short 560Hz tones for each of the final five available seconds, then a
longer 880Hz transition tone. Future cues are scheduled ahead on the audio clock.
Pause, mute, exit, or manual navigation cancels queued sounds. Resume schedules
only remaining cues. Audio may require a player interaction to unlock browser
autoplay; visual cues remain available. The tempo preference now controls the
visual movement rhythm.

### Optional dumbbells

Exercise cards label optional weights. The exercise guide and current player exercise show “Dumbbells optional. You can do this exercise without weights.” This guidance is omitted during recovery. Optional weights never block a bodyweight-only plan; workout summaries still show required weights if another movement needs them.

### Calendar workout outcomes

The 60-day calendar uses persisted session lifecycle status. Upcoming training stays orange, completed training shows a green tile with a check and “Done”, and skipped training shows a muted dashed tile with a skip icon and “Skipped”. Missed, incomplete and cancelled sessions retain their own labels rather than being described as skipped. Match badges remain blue and visible alongside the training outcome on shared dates. On narrow phones labels shorten to “Train”, “Done” and “Skip” to fit the seven-column grid. Accessible cell names include the full workout status and the legend explains Done and Skipped.

### Planned progress and extra sessions

Home and plan progress count unique planned sessions completed on their scheduled day. Completed standalone workouts and plan-linked workouts performed on another day within the current block appear separately as “+N extra sessions completed.” They do not fill the planned progress bar or change its denominator. Other plans and unfinished workouts are excluded. The local session start date determines the training day, including workouts that finish after midnight; older records fall back to completion date, then scheduled date. This is a progress display rule; activity history and existing scheduling behavior are preserved.

### Follow-up design refinements

Member Home and Plan reuse the authored workout title, matching editing, playback
and saved activity rather than substituting an outcome as the name. Orange marks
the selected effort and the immediate Start/Resume action. Standard's recommendation
is text, not a second selection. Onboarding has one native selection indicator.

On short landscape phones, the reference, timer, phase and playback controls fit
a compact two-column player stage. Generic repeat instructions yield space to the
specific cue. Reduced motion keeps the cadence indicator static. Completion
counts unique movements separately from sets and labels the session budget
Planned time. Timing, skipping, pause/resume and completion transitions are unchanged.

Guest search covers the six free exercise guides, and its empty state states that
scope. The existing Pro invitation remains available below the results. Settings
explains that guest preferences stay on the device while signed-in preferences
also save to the account; the development administrator continues to use local
storage. Audio copy consistently describes the current countdown/transition tones.
