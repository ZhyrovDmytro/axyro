# Guest home landing

The `/` route shows the public landing page to signed-out visitors, including
returning guests. Signed-in users retain the dashboard. Authentication loading
and errors continue to use the shared provider.

## Design direction

Axyro uses a black and charcoal canvas, electric-orange actions, athletic headings,
and existing catalog movement references. The story is: promise and real movement
preview → guided-player explanation → one Pro plan example → exercise library →
FAQ → closing action. The repeated benefits, duration and static-week sections
were removed following the [design review](design-review-2026-10-23.md).

The hero headline is “Train anywhere. Win on court.” on three fixed lines.
“Build your” cycles through power, control, confidence, endurance, speed and
stability, with orange emphasis and no underline. Words switch every 1.4 seconds in
an 8.4-second CSS transform loop. The word stack reserves the longest word’s
width; screen readers receive one static sentence. Reduced motion shows power.

Each word has a distinct system-font treatment: heavy Impact for power, precise
monospace for control, expressive Georgia italic for confidence, humanist Trebuchet
for endurance, condensed Arial italic for speed, and grounded Verdana for stability.
All words share the sentence baseline, font size and line height. Font-size
adjustment normalizes the lowercase height across the different faces; tracking
preserves each word’s character. These use local font fallbacks without adding
font downloads.
The primary action is Create my plan; a secondary link offers the free workout.
On mobile the actions precede the movement preview.

## Navigation and access

Primary plan actions open `/plan/setup` and explicitly promote Pro. Free-workout
links resolve the starter from `FREE_WORKOUT_ID` and open its preview. Duration
selection stays in workout setup: 5, 10 or 20 minutes, with 10 as the default,
including work and recovery. The promise strip and FAQ explain that flexibility.

The landing does not invent prices, testimonials, audience counts, medical
assurances or guaranteed performance improvements. Padel copy positions home
training as physical preparation that supports court practice.

## Product demonstrations

The hero cycles through wood chop, lateral stick, bird dog, Dynamic Court March
and side-plank rotation every 3.5 seconds. Current and next media may animate;
other entries show their posters. Its play/pause control and five thumbnails
allow explicit selection. Choosing a thumbnail holds that exercise on its poster.
Offscreen and hidden-tab playback stops. Reduced motion disables automatic
rotation; explicit Play still enables the selected clip.

The separate player illustration uses side-plank rotation. It is opt-in and follows
three scroll chapters about movement references, cadence and recovery. On mobile
its sticky readout leaves room for the explanatory copy. It does not start a
workout, run an authoritative timer or play speech.

One three-step plan section explains priorities, schedule/equipment and the next
guided session. An always-visible section offers a match-change
example: moving Saturday’s match to Wednesday shifts the second training day to
Friday and retains recovery. It points to Refine your plan without promising that
real schedules will match the example’s dates.

The library teaser shows six complete exercise references from the catalog. The
continuation gradient starts after the sixth. Full collection access is described
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
Content sections use semantic headings without accordion controls.

## Asset provenance

Landing posters are extracted from existing catalog media and keep their original
colors and provenance. See `MEDIA_CREDITS.md` and `THIRD_PARTY_NOTICES.md`.
No new media or animation dependency was added.

## Verification

The landing browser suite checks guest/member routing, free-workout navigation,
preview playback and selection, keyboard access, rotating supporting copy and its reduced-motion fallback,
reduced-motion behavior, both expandable examples, six complete library previews,
closing actions, viewport overflow and automated accessibility.
