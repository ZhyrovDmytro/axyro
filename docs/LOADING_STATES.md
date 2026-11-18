# Loading states

Axyro keeps its charcoal surfaces, existing type, and orange actions while data
loads. Loading UI should explain the current wait without competing with workout
content.

- `PageSkeleton` reserves space for dashboard, activity list, form, or workout
  content. Placeholders are static, hidden from assistive technology, and never
  resemble usable buttons. Compact headings identify the destination.
- A single polite status message sits outside the page's `aria-busy` region so
  assistive technology can announce the wait without waiting for it to finish.
- `LoadingStatus` provides a small indicator and operation-specific text for
  inline and dialog requests. Its spinner stops under reduced motion. Do not
  add percentages, estimated times, or stages without actual progress data.
- Authentication, account changes, checkout, and purchase restoration identify
  the operation underway. Existing submit guards and disabled controls prevent
  duplicate submissions. Membership stays unresolved until checked; do not
  temporarily label an account Free.
- Media uses a static reserved surface. Full demos announce their loading state;
  compact library previews do not each announce themselves. Existing media retry
  and fallback controls remain available after failure.
  Compact video previews show their authored poster immediately without a loading
  overlay covering it. The Romanian Deadlift poster is a frame from its existing
  reference clip; opening the exercise guide is not needed to populate the card.
- Keep shared navigation and public catalogs available. A page loading state does
  not replace the app shell. Dialog dismissal remains available while membership
  products load. Preserve current form values, errors, and retry paths.
- Plan creation retains its existing real completion state and keyboard focus
  handling. Loading polish does not change workout timers, requests, persistence,
  or access decisions.
- A completed planned-workout access check opens the existing access prompt when
  Pro is unavailable; it must not leave “Checking your plan access” on screen.

`tests/e2e/loading-states.spec.ts` checks delayed account/data/membership responses,
content layouts at 320px and 1280px, reduced motion, live-region placement,
automated accessibility, usable navigation, dialog dismissal, and retry recovery.

Public catalog state stays mounted as account initialization completes, so typed
searches survive. Personal content retains identity-keyed remounting and waits for
storage initialization. Membership results are associated with the resolved
identity; stale responses cannot overwrite a newer membership request. Clicking
a guide during account loading keeps the library visible while access resolves.
