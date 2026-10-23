# Shared navigation

Updated 22 October 2026.

The [Supaste static navbar on Navbar Gallery](https://www.navbar.gallery/navbar/supaste)
provided the composition reference: a compact dark container, visible core
links, and one distinct action. Axyro adapts that structure using its existing
orange active state, type, brand mark, and accessible control sizes. No external
assets or dependencies are imported.

`AppHeader` is the single navigation implementation for guest and member routes.
The landing-only header and its styles were removed. Both states show Home,
Plan, Workouts, Library, and Activity. Only the account action changes:

- Guest: Sign in, with the current pathname as the post-login destination.
- Member: Account, including an active state on Settings.
- Authentication pages: Sign in is active and returns home after login.
- Workout player: global navigation is hidden; the player's existing
  pause/save-and-exit controls remain responsible for leaving a workout.

Desktop uses a single framed row. Below 768px, links remain in the mobile bottom
dock, while brand and the account action remain at the top. Landing-page bottom
padding prevents the dock from covering footer links. Active routes match a
complete path segment, including child routes.

Regression checks in `tests/e2e/shared-header.spec.ts` cover guest/member states,
320px, 768px, and 1280px layouts, minimum tap targets, active links, keyboard
navigation, sign-in return paths, automated accessibility, and the focused player state. Existing landing and
library tests use the shared header and scope duplicate sign-in links to their
own sections.
