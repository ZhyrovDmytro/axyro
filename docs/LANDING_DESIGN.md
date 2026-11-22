# Axyro guest landing page

## Direction

Train the step before the shot. Open on a familiar match situation, show a movement the player can practise at home, then introduce guided sessions and a plan.

| Direction | Hero, typography and colour | Photography and motion | Tradeoff |
| --- | --- | --- | --- |
| Courtside editorial (selected) | A question in oversized sans alongside a single action frame. Graphite, lime and off-white. | One court-level forehand, then selectable movement clips. The portrait stacks naturally on phones. | Makes the audience and physical problem clear immediately. Product detail arrives one scroll later. |
| Training journal | A weekly spread with compact schedule typography, warm paper and green ink. | Small documentary images, with a match-day change animating the schedule. | Credible for regular players, but calendar detail competes with the first action on phones. |
| Guided session | A large live movement above a timer, using tabular figures on deep green. | Real exercise footage and quiet interval transitions. | Demonstrates the app quickly, but a floor exercise alone says little about why a padel player needs it. |

## Shared app styling

All routes inherit the landing palette from the global stylesheet. Graphite (#111412) frames the page, dark green (#202722) groups content, off-white (#F3F4ED) carries text, and electric lime (#D9FC54) marks primary actions, selections and keyboard focus. Calendar match days and status messages retain distinct semantic colours.

## Implementation

The Next.js App Router guest homepage reuses the existing header, movement catalogue, guided player demonstration, editable schedule example, session editor and footer. Six illustrated training areas link each physical skill to a match situation. Free and Pro access, the FAQ and the closing action follow the product examples. Create your plan opens plan setup. The free-workout link opens the existing starter prescription.

The brief described four weeks. The shipped application offers 60-day plans, so the page uses the actual product duration. No pricing or new app capability was introduced.

The court image is a locally optimized WebP of Calleja10’s photograph. The responsive crop and WebP derivative are distributed under the same licence. The supplied tournament and branding images served as art direction. [Original photograph](https://commons.wikimedia.org/wiki/File:Fran_Guerrero_drive.jpg) · [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)

## Local preview

Run `npm run dev` and open the printed local address while signed out. A signed-in session opens the training dashboard.

## Verification

Chrome rendered the hero image, reached How It Works, opened the FAQ and followed Start Training to plan setup at 1440 × 900, 768 × 1024 and 390 × 844. No horizontal overflow at these sizes. All 13 landing and eight shared-header Playwright tests passed, including keyboard, accessibility, reduced-motion and member navigation checks. TypeScript, ESLint and 647 unit tests passed.

The installed skill uses copy-lint, consistency, layout/check and gate scripts. The brief’s lint.mjs and inspect.mjs filenames are absent in version 2.5.1. The layout checker captured the desktop opening, then failed while reading its section list. Browser screenshots and interaction checks were run independently.

The production build completed. Copy lint on the prerendered main element read 1,098 words and returned zero failures and zero warnings. Visual revisions included making session length explicit in the opening, removing the repeated library overlay, enlarging FAQ targets, showing the player media on phones, and putting the photography credit in a named landmark.

## Changed files

- `src/components/home/landing-page.tsx` and `landing-page.module.css` contain the campaign, interactive movement preview, access comparison, FAQ and responsive styles.
- `src/components/home/padel-story.tsx` and `plan-story.tsx` connect catalogue examples to match situations and use the shared onboarding action.
- `src/components/app-header.tsx`, `src/app/layout.tsx`, `src/app/page.tsx` and `src/app/opengraph-image.tsx` contain the guest navigation, footer copyright, page metadata and social preview.
- `public/images/landing/court-action.webp` contains the court photograph.
- `tests/e2e/landing.spec.ts`, `shared-header.spec.ts`, `smoke.spec.ts`, `daily-duration.spec.ts` and `blocked-auth.spec.ts` cover changed headings, navigation and actions.
- `docs/LANDING_PAGE.md`, `docs/NAVIGATION_DESIGN.md` and this report document the guest experience.

The installed design gate completed three rounds and returned **GATE: OPEN 91** with 36 warnings and no waivers. After the first pass, the layout checker recognized the page container and ran its geometry checks. Remaining findings include screen-height rhythm, grid edges, focus visibility, overlap, sticky navigation and upscaled exercise posters. The full list includes each target, affected width and checker explanation in [.taste-skill/gate.json](../.taste-skill/gate.json). This is an open design review, not a passing release gate.

Production performance inspection at 1440 and 390 returned six failures and four warnings. At each width the checker flagged 1,211 KiB of parsed JavaScript, ten images without explicit width and height attributes, and five oversized image sources. Several flagged Next.js fill images have dimensioned parent containers. The full app shell and exercise media contribute to the measured transfer.
