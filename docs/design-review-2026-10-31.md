# Axyro usability review — 31 October 2026

## Scope and findings

Reviewed discovery, workout previews, exercise reference, setup, settings, account
entry and the guided player at phone and desktop sizes. Preserved the existing
visual identity, 40-exercise catalog and workout timing contract.

| Finding | Change |
| --- | --- |
| Workout cards overflowed a 320px screen (343px document width). | Shrinkable grid/card sizing and smaller responsive titles. |
| Preview exercise links were only 18px tall. | Underlined links with at least 44px tap height. |
| Settings introduction pushed controls down. | Compact upright heading and reduced introductory spacing. |
| Refresh or exit discarded unfinished setup answers. | Owner-scoped session drafts preserve answers and current step, including incomplete selections. |
| Reviewing equipment required remembering what a count meant; changing an answer required repeated Back actions. | Explicit equipment names and direct Edit actions returning to review. |
| General-sport review omitted selected safety exclusions. | Show them for both supported setup paths. |
| Leaving generation could still save and navigate after its response. | Abort generation on Back, Exit, direct edits and unmount. |
| An incompatible deterministic plan looked like a network/membership failure. | Recoverable HTTP 422 and advice to review duration/equipment while retaining accurate discomfort selections. |
| Cloud-save recovery immediately replaced unsaved local changes. | Retry saving the current snapshot; revision conflicts require confirmation before cloud reload. |
| Reset/delete could leave a setup draft that restored old answers. | Clear the owner's draft and step keys on reset/delete and successful generation. |

Drafts last for the current browser tab/session, not across devices. Blocked
session storage leaves setup usable without promising persistence. Cloud sync
still uses existing revision checks; reloading the app while offline changes are
unsaved is not a durable offline workflow.

## Verification

- 410 unit tests across 64 files passed, including incompatible-plan responses,
  safe sync retry, conflict protection and owner-specific draft cleanup.
- Six new browser regressions passed: narrow layout/tap targets, draft restoration,
  unfinished-answer validation, direct review edits, cancellation and cloud retry.
- Responsive audit: nine routes at 320×667, 390×844 and 1280×900; no document
  overflow and no visible text inputs below 16px. Portrait and landscape player
  screens were also inspected.
- TypeScript and targeted ESLint checks passed. Repository lint had no errors;
  its 188 warnings came from bundled third-party skill scripts.
- Deterministic Impeccable detector returned no findings. Its context metadata
  reports an outdated product schema/design manifest; refresh with its `init`
  or `document` workflow separately rather than rewriting it during this fix.
- The first full browser run passed 102/104 tests. Two existing test assumptions
  were stale: FAQ answers now require expansion, and the exercise picker excludes
  movements already in the workout. Those tests now follow the current behavior.
  All 16 landing/contrast tests passed on rerun, so all 104 browser tests passed
  across the full run and targeted rerun.

Real iOS/Android hardware, native speech quality, live payments and production
cloud integrations were not verified. Browser account/billing checks used test
fixtures; no production data was changed or deployment performed.
