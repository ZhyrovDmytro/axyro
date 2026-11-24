# Guest home landing

The `/` route shows the public landing page to signed-out visitors, including
returning guests. Signed-in users retain the dashboard. Authentication loading
and errors continue to use the shared provider.

## Design direction

The guest page uses graphite, dark green, lime and off-white. Its headline, “Play better padel. Train beyond the court.”, overlays a muted roughly 22-second film edited from seven supplied clips. Half-second crossfades connect the shots and loop. Visitors who prefer reduced motion see the static court poster. The film fills the visible viewport behind the floating top bar. Its background is transparent at the top and fades to charcoal when scrolling begins. A centered desktop chevron links to the next section and stays still for reduced motion. The film leads into footwork, exercise demonstrations and the guided player. The plan, training areas, Free and Pro access and FAQ follow.

Build My Training Plan opens plan setup. Full creative directions, image attribution and verification are in [the design report](LANDING_DESIGN.md).

## Navigation and access

Primary plan actions open `/plan/setup` and explicitly promote Pro. Free-workout
links resolve the starter from `FREE_WORKOUT_ID` and open its preview. Duration
selection stays in workout setup: 5, 10 or 20 minutes, with 10 as the default,
including work and recovery. The introduction and FAQ explain that flexibility.

The landing does not invent prices, testimonials, audience counts, medical
assurances or guaranteed performance improvements. Padel copy positions home
training as physical preparation that supports court practice.

## Product demonstrations

The movement preview below the hero cycles through wood chop, lateral stick, bird dog, Dynamic Court March
and side-plank rotation every 3.5 seconds. Current and next media may animate;
other entries show their posters. Its play/pause control and five thumbnails
allow explicit selection. Choosing a thumbnail holds that exercise on its poster.
Offscreen and hidden-tab playback stops. Reduced motion disables automatic
rotation; explicit Play still enables the selected clip.

The separate player illustration uses side-plank rotation. It is opt-in and follows
three scroll chapters about movement references, cadence and recovery. On mobile
its player sits above the explanatory copy, with a visible motion preview. It does not start a
workout, run an authoritative timer or play speech.

One three-step plan section explains priorities, schedule/equipment and the next
guided session. An always-visible section offers a match-change
example: moving Saturday’s match to Wednesday shifts the second training day to
Friday and retains recovery. It points to Refine your plan without promising that
real schedules will match the example’s dates.

The library teaser shows six complete exercise references from the catalog. Each connects a training area to a situation on court. Full collection access is described
as Pro. Names, stable IDs and media come from the curated 40-exercise catalog.

An always-visible section offers the editor example. Adding or removing
a side plank changes local illustration state only. Copy describes customization
within an existing Pro plan, including adding, removing, reordering and changing
timed intervals. It does not advertise a separate workout builder.

## Interaction and motion

CTA labels are plain text, with brief feedback instead of staggered letter swaps.
The headline entrance lasts 200ms, the hero-preview entrance 240ms and exercise
crossfades 180ms. Broad decorative scroll entrances are removed. Supporting
words rotate with the shared ease-out curve. Keyboard focus does not trigger decorative CTA movement. Hover
movement is limited to hover-capable fine pointers. Reduced motion disables
movement and automatic hero rotation while preserving access to content.

The schedule and editor examples and all FAQ answers are visible immediately.
Content sections use semantic headings; FAQ questions use native accordion controls.

## Asset provenance

Landing posters are extracted from existing catalog media and keep their original
colors and provenance. See `MEDIA_CREDITS.md` and `THIRD_PARTY_NOTICES.md`.
The original court photograph is credited in the design report.

## Verification

The landing browser suite checks guest/member routing, free-workout navigation,
preview playback and selection, keyboard access, rotating supporting copy and its reduced-motion fallback,
reduced-motion behavior, both expandable examples, six complete library previews,
closing actions, viewport overflow and automated accessibility.

## FAQ interaction

All FAQ answers start collapsed. Each question independently opens or closes its
answer using native `details`/`summary` controls, with pointer and keyboard support.

The public homepage renders its heading and workout links in the initial HTML while account initialization runs. A confirmed signed-in session switches to the training dashboard.
