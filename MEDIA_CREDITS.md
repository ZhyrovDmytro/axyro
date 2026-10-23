# Exercise movement references

The exercise library uses a start and finish image for each movement when a
usable pair is available. The two images alternate every second in library and
detail views. A single exercise-specific reference is used only when the source
does not provide distinct positions.

These assets are temporary development references for reviewing exercise form.
Replace them with Axyro-owned production assets before release.

## Imported position sequences

- [Workout Guide](https://github.com/bryllim/workout-guide) supplied matched
  frame sequences for common movements such as squats, lunges, rows, hinges,
  planks, raises, shuffles, and mobility drills. The first and final useful
  frames were copied into `public/images/exercises/positions/`.
- [free-exercise-db](https://github.com/yuhonas/free-exercise-db) supplied the
  paired references for wall first-step drive, dumbbell scaption raise, and the
  standing single-arm dumbbell overhead press.
- [RepDB exercise dataset](https://github.com/RepDB/exercise-dataset) supplied
  the single movement references used as compact/fallback imagery for
  thread-the-needle and the suitcase carry variations.

## Existing Axyro reference clips

The animated Bodyweight Hip Hinge, Thread the Needle, Lateral Lunge, Glute
Bridge March, Suitcase March, Wall Acceleration March, and Wall Slide with
Lift-Off references, plus the prone plate-over-obstacle and foam-roller shoulder
clips, are Axyro-provided movement references. Start and finish stills for the
three shoulder movements were extracted from their matching videos.

The Lateral Weight Shift GIF was supplied by the user on 2026-10-15 and is used
for the exercise demonstration and compact previews.
The Scapular Push-Up GIF was supplied by the user on 2026-10-15 and is used
for the exercise demonstration and compact previews.
The Side Plank with Rotation GIF was supplied by the user on 2026-10-15 and is
used for the exercise demonstration and compact previews.
The Bent-Knee Soleus Raise GIF was supplied by the user on 2026-10-15 and is
used for the exercise demonstration and compact previews.
The Bodyweight Squat GIF was supplied by the user on 2026-10-15 and is used
for the exercise demonstration and compact previews.
The 90/90 Hip Switch GIF was supplied by the user on 2026-10-15 and is used
for the exercise demonstration and compact previews.
The Dead Bug GIF was supplied by the user on 2026-10-15 and is used for the
exercise demonstration and compact previews.

The Bird Dog GIF was supplied by the user on 2026-10-17 and is used for the
exercise demonstration and compact previews.

The Dumbbell Forearm Rotation GIF was supplied by the user on 2026-10-17 and
is used for the exercise demonstration and compact previews.

The Dumbbell Romanian Deadlift MOV was supplied by the user on 2026-10-17
and is used as a muted looping video in the exercise view and compact previews.

The Dumbbell Wrist Extension GIF was supplied by the user on 2026-10-17 and
is used for the exercise demonstration and compact previews.

The Plank Shoulder Tap GIF was supplied by the user on 2026-10-23 and is
used for the exercise demonstration and compact previews. Its first frame
provides the static preview and fallback. The earlier user-supplied MOV from
2026-10-17 is retained as a source asset.

The Standing Dumbbell Wood Chop GIF was supplied by the user on 2026-10-17
and is used for the exercise demonstration and compact previews.

The Lateral Step and Stick GIF was supplied by the user on 2026-10-17 and
is used for the exercise demonstration and compact previews.

The Open-book Rotation GIF was supplied by the user on 2026-10-17 and
is used for the exercise demonstration and compact previews.

## Generated development references

Movements without a usable source pair received a custom two-position reference
generated specifically from the exercise's authored instructions. Each prompt
specified the exact starting joint positions, exact finish position, permitted
equipment, a consistent camera angle, and the same athlete in both panels.
Generated source images remain in Codex's generated-image directory; the cropped
start and finish assets used by the app are stored in
`public/images/exercises/positions/`.

## Pogo Hop GIF — 2026-10-17

User-supplied `codex-clipboard-6956c6aa-9229-41ea-9610-95fcb02985a8.gif` is stored at
`public/images/exercises/animations/pogo-hop.gif` and used for the exercise
demonstration and compact previews.

## Push-Up Plus GIF — 2026-10-17

User-supplied `ezgif-5dfd66f895db7cca.gif` is stored at
`public/images/exercises/animations/push-up-plus.gif` and used for the exercise
demonstration and compact previews.

## Intermittent Lateral Shuffle GIF — 2026-10-17

User-supplied `steps gif.gif` is stored at
`public/images/exercises/animations/intermittent-lateral-shuffle.gif` and used for
the exercise demonstration and compact previews.

## Reverse Lunge GIF — 2026-10-17

User-supplied `reverse.gif` is stored at
`public/images/exercises/animations/reverse-lunge.gif` and used for the exercise
demonstration and compact previews.

## Catalog curation — 2026-10-12

All seven existing GIFs and three videos are retained unchanged. Three supplied
plate/foam-roller/obstacle videos are preserved as reference-only content and
are not prescribed. Other retired exercise images stay on disk with their
attribution for historical/reference use; they are not additional active exercises.
No images, videos, or written coaching instructions were copied from Padel
Mobility. Its public positioning and user-supplied screenshots were comparison
material only.

### Landing movement stills

`public/images/landing/wood-chop-preview.png` and `side-plank-preview.png` are
first-frame PNG derivatives of the existing `standing-dumbbell-wood-chop.gif`
and `side-plank-rotation.gif` catalog animations, extracted with macOS `sips`.
The original catalog assets’ source and rights apply.

Additional landing-library stills were extracted with `sips` from existing catalog
GIFs: `bird-dog-preview.png` from `bird-dog.gif`, `lateral-stick-preview.png` from
`lateral-stick.gif`, `march-preview.png` from `wall-acceleration-march.gif`, and
`wrist-preview.png` from `dumbbell-wrist-extension.gif`. Existing source rights apply.

## Dynamic Court March GIF — 2026-10-20

User-supplied `1015-ezgif.com-video-to-gif-converter.gif` is stored unchanged at
`public/images/exercises/animations/dynamic-court-march.gif` for the Dynamic Court
March exercise and its previews, including the main rotating landing demo.
`public/images/landing/dynamic-court-march-preview.png` is a first-frame PNG
extracted with macOS `sips` for the paused/reduced-motion preview and fallback.
The separate Wall Acceleration March asset remains unchanged.

## Prone Y Raise GIF — 2026-10-20

User-supplied `ypos-ezgif.com-video-to-gif-converter.gif` is stored unchanged at
`public/images/exercises/animations/prone-y-raise.gif` and used by Prone Y Raise
exercise views and compact previews through the shared catalog media record.
`public/images/exercises/prone-y-raise-preview.png` is a first-frame PNG extracted
with macOS `sips` for the poster/fallback.

## Fast Feet Step GIF — 2026-10-20

User-supplied `hf_20261020_210227_7f3c886d-94fa-45cf-a064-e5cefd9ba31d-ezgif.com-video-to-gif-converter.gif`
is stored unchanged at `public/images/exercises/animations/fast-feet-step.gif`
and used by Fast Feet Step exercise views and compact previews through the shared
catalog media record. Its original aspect ratio is 854 / 480.
`public/images/exercises/fast-feet-step-preview.png` is a first-frame PNG extracted
with macOS `sips` for the poster/fallback.

## Side-Lying Dumbbell External Rotation GIF — 2026-10-20

User-supplied `hf_20261020_211209_a7840291-70a0-43a4-90ca-db736aeaa14e-ezgif.com-video-to-gif-converter.gif`
is stored unchanged at `public/images/exercises/animations/side-lying-db-external-rotation.gif`
and used by the exercise and its compact previews through the shared catalog
media record. The original aspect ratio is 854 / 480.
`public/images/exercises/side-lying-db-external-rotation-preview.png` is a
first-frame PNG extracted with macOS `sips` for the poster/fallback.

## Single-arm Dumbbell Row GIF — 2026-10-20

User-supplied `Single-armDumbbellRow-ezgif.com-video-to-gif-converter.gif` is stored unchanged at `public/images/exercises/animations/single-arm-row.gif` and used for the exercise and compact previews through the shared catalog media record. The original aspect ratio is 1280 / 720. `public/images/exercises/single-arm-row-preview.png` is a first-frame PNG extracted with macOS `sips` for the poster/fallback.

## Single-leg Calf Raise GIF — 2026-10-20

User-supplied `hf_20261020_213148_4022ba9e-c2a7-4bc5-88a6-2f8d4829ada0-ezgif.com-video-to-gif-converter.gif` is stored unchanged at `public/images/exercises/animations/single-leg-calf-raise.gif` and used for the exercise and compact previews through the shared catalog media record. The original aspect ratio is 854 / 480. `public/images/exercises/single-leg-calf-raise-preview.png` is a first-frame PNG extracted with macOS `sips` for the poster/fallback.

## Squat Jump and Stick GIF — 2026-10-20

User-supplied `hf_20261020_214156_06648239-3b82-4255-bcb6-921075a88ffa-ezgif.com-video-to-gif-converter.gif` is stored unchanged at `public/images/exercises/animations/squat-jump-stick.gif` and used for the exercise and compact previews through the shared catalog media record. The original aspect ratio is 854 / 480. `public/images/exercises/squat-jump-stick-preview.png` is a first-frame PNG extracted with macOS `sips` for the poster/fallback.

## Split Squat GIF — 2026-10-21

User-supplied `hf_20261021_070813_eafe5eb4-e9d4-4f59-afdd-3f1cb228199c-ezgif.com-video-to-gif-converter.gif` is stored unchanged at `public/images/exercises/animations/split-squat.gif` and used for exercise views and previews. The original aspect ratio is 1281 / 720. `public/images/exercises/split-squat-preview.png` is a first-frame PNG extracted with macOS `sips`.

## Single-Arm Dumbbell Overhead Press GIF — 2026-10-22

User-supplied `hf_20261022_105852_63a52bd0-06b5-45c0-b7a4-651f7b0ca94d-ezgif.com-video-to-gif-converter.gif` is stored unchanged at `public/images/exercises/animations/single-arm-db-overhead-press.gif` and used for exercise views and compact previews through the shared catalog media record. The original aspect ratio is 854 / 480. `public/images/exercises/single-arm-db-overhead-press-preview.png` is a first-frame PNG extracted with macOS `sips` for the poster/fallback. The display name is now Single-Arm Dumbbell Overhead Press; its stable ID and slug are unchanged.

## Side-to-Side Line Hops GIF — 2026-10-22

User-supplied `sidejumps-ezgif.com-video-to-gif-converter.gif` is stored unchanged at `public/images/exercises/animations/side-to-side-line-hops.gif` and used for the exercise and compact previews. The original aspect ratio is 1280 / 720. `public/images/exercises/side-to-side-line-hops-preview.png` is a first-frame PNG extracted with macOS `sips` for the poster/fallback.

Side-to-Side Line Hops replaces Split-Step Lateral Drive, retaining the stable `split-step-lateral-drive` ID and slug so existing workout and saved-plan references resolve. Instructions and sport relevance now describe bilateral lateral hops, with simultaneous sides and self-paced guidance. Existing work/recovery durations and high-intensity work bounds remain unchanged; the catalog still contains 40 exercises.

## Fire Hydrant video — 2026-10-22

User-supplied `Screen Recording 2026-10-22 at 21.32.28.mov` demonstrates Fire Hydrant (quadruped hip abduction). It was converted with AVFoundation to a 720p MP4 at `public/videos/fire-hydrant.mp4` for exercise views and compact previews. This recording has since been superseded in exercise views and previews by the GIF below; the original MP4 is retained.

Fire Hydrant replaces Short-Lever Copenhagen Hold, retaining the stable `short-lever-copenhagen-hold` ID and slug for existing workout and saved-plan references. It uses repeated controlled hip abduction, floor-only setup, and separate timed intervals per leg. Work/recovery durations remain unchanged. The training focus changes from inner-thigh adductors to outer-hip/glute strength and pelvic control. The catalog remains at 40 exercises.

## Fire Hydrant GIF — 2026-10-22

User-supplied `quadrupaaer.gif` is stored unchanged at `public/images/exercises/animations/fire-hydrant.gif` and replaces the screen recording in exercise views and compact previews. Its aspect ratio is 800 / 450. `public/images/exercises/fire-hydrant-preview.png` is refreshed with the GIF's first frame, extracted using macOS `sips`, for the poster/fallback and movement reference.


### Prone shoulder execution update — 2026-10-23
The three original prone shoulder clips remain in use. Their arm paths now
support executable floor exercises with optional light dumbbells: Single-Arm
Prone Shoulder Arc, Prone Overhead Shoulder Press, and Prone Shoulder
Internal/External Rotation. This supersedes their earlier reference-only
classification. Source video filenames and stable IDs are unchanged.
