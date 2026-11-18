# Accounts and membership

Axyro remains a Next.js App Router web application. Supabase owns credentials and identity; application profiles store display metadata and a separate trusted role. Stripe owns subscription billing. See [authentication](./AUTHENTICATION.md), [billing](./billing.md) and [user data](./MULTI_USER_DATA_ARCHITECTURE.md) for setup and trust boundaries.

## Access contract

Guests and authenticated Free users can run Foundation Strength, the first
quick-start workout, with all duration, effort, audio and player controls. It is
the only free workout; all other workouts require Pro. Guests see a stable
media-first preview of 10 exercises and must sign in to open a guide. Signed-in
users can browse/search all 40 exercises. Free members can open exactly the first
10 in the global library order; the remaining 30 show a Pro badge and an Unlock
guide action. Filtering and pagination do not create a new free subset. Individual
exercise links in workout previews/editors and direct guide URLs use the same
stable ID allowlist. Preview media and free-workout playback remain available.
The 40 curated exercise records, home-training eligibility and media paths are
preserved.

Pro unlocks activation and server-assisted generation of personalized plans, plan scheduling/editing/execution, the workout and exercise libraries, history and progress. `hasEntitlement` centralizes subscription expiration and trusted admin overrides. APIs, SQL write policies and server workout guards enforce access independently of UI. Data is retained when Pro expires.

For owner production testing, the server automatically assigns the trusted admin role to the authenticated, email-confirmed account `dmytrozhyrov@gmail.com`. The grant persists in `profiles.role`, so application and database checks agree. It requires the normal Supabase session and server secret; no Stripe subscription is required. See [authentication](./AUTHENTICATION.md) for verification and revocation details.

## Conversion

The Plan landing page and initial questionnaire are public. Guests see the same
Create my plan action as signed-in users without an existing plan. The final
Create My Plan action validates and saves answers in tab-scoped sessionStorage,
then opens the shared sign-in modal. After sign-in or registration, including a
same-browser email/OAuth return, `/plan/setup?resume=1&generate=1` transfers the
submitted guest answers to the signed-in account and continues generation.
The submitted guest draft takes precedence over an older account draft and is
removed after transfer. Blocked session storage stops the handoff with a retryable
error so answers are not silently lost. Closing sign-in leaves the review editable.

Generation shows creation status and builds a deterministic local preview for Free users.
The preview is kept beside the account-owned questionnaire draft in sessionStorage;
it is not an active plan, is not synced to the account, and never calls the paid
planner endpoint. The Plan page shows the generated schedule as an inert backdrop
and automatically opens the common paywall without a close action. Escape and
backdrop clicks cannot dismiss it. Reloading or returning to Plan in the same tab
restores this state. Links to account/legal/free-workout pages and browser navigation
still work. Only this generated-plan activation paywall is non-dismissible;
regular upgrade offers and sign-in forms can be closed.

Pro users see the same creation status while the existing authorized planner API
runs, then enter their active plan without a paywall. After checkout or restore,
the client waits for trusted Pro confirmation and resumes the saved questionnaire
with `resume=1`, creates the active plan through the server, then clears the draft
and preview. Reset, local-data deletion and server-confirmed account deletion also
clear the account's preview through the existing draft-cleanup path. The server
planner, paid workout execution and cloud plan writes still require Pro. Local
preview generation does not bypass those authorization checks.

## Screens

`/signin`, `/signup`, `/forgot-password`, `/reset-password`, `/account`, `/upgrade`, `/terms`. Existing workout/plan/library screens retain their visual patterns. Account provides name editing, membership management, password controls only for email accounts, logout and explicit destructive deletion. The header account control links to these settings; workout settings remain at `/settings`.

## Development and launch

`admin / admin` authenticates only under `NODE_ENV=development` or `test`, with a process-random signed HttpOnly cookie. THIS AUTHENTICATION SHORTCUT DOES NOT EXIST IN PRODUCTION. It does not create a Supabase user, cannot create Stripe purchases and is invalidated by a process restart. Production administrators are real verified Supabase users whose profile role is changed through trusted database administration.

Run SQL migrations in order, configure Supabase email delivery/confirmation and Google OAuth, configure Stripe recurring monthly/yearly prices plus webhook and Customer Portal, and set the server-only variables in `.env.example`. Apple is not required by this web-only repository, and no fake Apple option is shown. Live provider flows require externally supplied configuration; local tests verify integration boundaries rather than claiming real charges or email delivery.

Legal pages describe implemented behavior; the product owner must supply business identity, jurisdiction-specific terms, retention/backup policy and support contact before launch.

## Paywall entry points — 2 November 2026

The shared navigation’s Plan link opens the Plan page. Activity, Library’s
Explore Pro link and paid workout cards open a shared access modal over the current page. Guests see
sign-in first; authenticated Free members see membership offers. Sign-in can be
closed while preserving the route, filters and scroll position. Regular Pro offers
also close with the visible close button, Escape or a backdrop click. The generated-plan
activation offer remains non-dismissible. The
native dialog makes background content inert; the existing focus trap handles
Tab and Shift+Tab; Escape closes authentication forms and regular upgrade offers. Focus returns to the
trigger when those forms close. The background cannot
scroll while the modal is open. Following an account/legal link closes the modal
when the route changes. Pro members navigate directly; membership checks still
pending at click time resolve before showing offers or continuing to the route.

Membership choices show Monthly first (selected by default), then Yearly. USD
remains the default currency when available, and changing currency preserves the
chosen billing period. Dialog dimensions stay fixed while membership/pricing
loads; the pricing loading state reserves space to reduce content jumps. Direct protected routes and `/upgrade` show guests the same sign-in modal;
authenticated Free visitors see the same dismissible Pro modal. Checkout,
restore, access enforcement and the inactive promo-code field are unchanged.

## Sign-in before protected content — 2 November 2026

Initial plan-creation links and `/plan/setup` allow guests to complete and restore
the questionnaire; sign-in is required at final submission as described above.
`/plan/refine` still requires an account. Signed-in Free members retain the
questionnaire-before-purchase flow; activating or executing a personal plan
still requires Pro. The local preview flow is described above. Plan links navigate
to the route, which enforces access for existing paid plans and saved previews;
Activity links use the shared access link. Paid workout cards open the access modal; the free workout keeps guest
access. Individual exercise guides now require sign-in, as described below.
Library’s explicit
account links open registration/sign-in in that same modal.

The modal reuses `AuthForm` with embedded layout and in-place navigation among
sign-in, registration and recovery. Validation, Google OAuth, confirmation emails,
password handling and server authorization remain in the existing services.
Successful sign-in continues to the requested route for Pro/account-only entry
points, or presents membership offers for a Free user entering Pro content.
Closing the modal leaves a direct protected page with a sign-in action to reopen
it; protected children are not mounted for guests.

The access request provider sits outside `AuthProvider` while its modal outlet
sits inside authentication and membership contexts. Only the requested destination
and access context survive the identity reset; personal UI and data still remount
when accounts change. Server-protected player/editor routes send guests through
`/upgrade` with their original destination to show the same modal; existing
refresh-cookie handling and trusted Pro checks remain intact.

## Exercise guide access — 2 November 2026

Opening an exercise from a library card, workout preview or workout editor uses
the shared sign-in modal for guests. Direct exercise URLs use the same account
check before mounting the guide. Sign-in returns to the requested exercise,
including its valid sport query. A Free account opens the first 10 guides only;
Pro opens all 40. Signed-in users may browse all exercise summaries, while guests
see the ten-exercise preview. The preview and
free-workout playback remain available without an account, and the 40 exercise
records and their existing media paths are unchanged. This is a page-access rule;
static media URLs remain public.

## Creation status

Creation uses an indeterminate spinner and real lifecycle states: validated
answers, building the schedule, then ready to view. Fast previews keep the status
visible for at least 600ms and show completion for 250ms so the transition is
readable; no fabricated percentage or server-stage estimates are displayed.
Reduced motion keeps the status indicator static. Back/Exit cancel pending work
and prevent late navigation; errors restore the review with its answers intact.
Preview storage failure prevents navigation and offers a retry. The existing
runtime content/schema validation, authored timing and pain constraints remain
in the deterministic compiler; the catalog still contains 40 exercises.

## Stable free-content boundary — 3 November 2026

`librarySelection` defines the global media/name order and `freeExerciseIds`
contains its first ten stable exercise IDs. The same allowlist is used by cards,
exercise guide routes and workout exercise links. Authenticated server catalog
requests include all summaries; signed-out users see only the first six exercises
on the exercise page, selected before search and pagination. This preview limit
does not change the ten free guide IDs or the 40-exercise catalog. Free exercise
access is independent of current search, sport query and pagination.

Paid-content entry points, including existing paid plans, Activity, Explore Pro,
paid workouts and exercise 11 onward, use a dismissible upgrade modal. Direct protected URLs also
open this modal instead of an inline paywall. Authentication screens remain
closable before and after sign-in. Dismissal does not mount protected content;
the route retains its access prompt. The generated-plan activation offer remains locked. Only the actual generated-preview entry supplies `planCreated`, so
other Plan invitations do not incorrectly claim a plan has already been created.
Account/legal/free-workout links and browser navigation remain available. Pro
accounts and trusted admin overrides retain full access.
