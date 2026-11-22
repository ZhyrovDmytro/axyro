# Shared navigation

Updated 18 November 2026.

The [Supaste static navbar on Navbar Gallery](https://www.navbar.gallery/navbar/supaste)
provided the composition reference: a compact dark container, visible core
links, and one distinct action. Axyro adapts that structure using its existing
lime active state, type, brand mark, and accessible control sizes. No external
assets or dependencies are imported.

`AppHeader` is the single navigation implementation for guest and member routes.
The landing page and app share the same primary links in order: Home, Plan, Workouts, Library and Rehub. Rehub is a public preview of the upcoming Pro recovery library, organized by body area. The landing page’s “Create your plan” action opens plan setup. Signed-in users can open Activity from Settings under Workout history.

- Guest: Sign in, with the current pathname as the post-login destination.
- Member: Account, including an active state on Settings.
- Authentication pages: Sign in is active and returns home after login.
- Workout player: the shared header is hidden; the player's existing
  pause/save-and-exit controls remain responsible for leaving a workout.

Desktop uses a single framed row. Below 768px, the same header contains the
brand, account and settings icons, and a Menu button. The button opens the five
primary links in a Base UI popover anchored beneath it. The popup is portalled
outside the header and overlays the page without changing header or content
geometry. Base UI handles outside interaction, Escape, and keyboard focus.
There is no fixed bottom dock to collide with third-party attribution labels.
Account icons retain their accessible names. Selecting a destination closes the
menu; Escape closes it and returns focus to Menu. The lime active state and
44px minimum touch targets remain. Active routes match a complete path segment,
including child routes. Page shells no longer reserve space for the bottom dock.

Regression checks in `tests/e2e/shared-header.spec.ts` cover guest/member states,
320px, 390px, 768px, and 1280px layouts, popup opening/dismissal and unchanged page geometry, minimum tap targets, active links, keyboard
navigation, sign-in return paths, automated accessibility, and the focused player state. Existing landing and
library tests use the shared header and scope duplicate sign-in links to their
own sections.

The root layout renders one footer on every page. Training, account and settings links sit alongside Help, Privacy and Terms. The footer follows the full-height workout player in document flow.
