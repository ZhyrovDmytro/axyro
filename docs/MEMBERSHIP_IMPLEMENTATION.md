# Accounts and membership

Axyro remains a Next.js App Router web application. Supabase owns credentials and identity; application profiles store display metadata and a separate trusted role. Stripe owns subscription billing. See [authentication](./AUTHENTICATION.md), [billing](./billing.md) and [user data](./MULTI_USER_DATA_ARCHITECTURE.md) for setup and trust boundaries.

## Access contract

Guests and authenticated Free users can run Foundation Strength with all duration, effort, audio and player controls. Exactly one curated workout has `access: free`; other authored content is Pro. Guests and Free members browse a stable media-first preview of 6 exercises; search and pagination operate within that selection. A single overflow gradient introduces account/sign-in actions for guests and Explore Pro for signed-in Free members. All exercise reference pages and media remain public, including links used by workout guidance; only full-library browsing is Pro. The 40 curated exercise records are preserved; all are eligible for home training, including the prone shoulder movements with optional light dumbbells.

Pro unlocks personalized plan generation, plan scheduling/editing/execution, the workout and exercise libraries, history and progress. `hasEntitlement` centralizes subscription expiration and trusted admin overrides. APIs, SQL write policies and server workout guards enforce access independently of UI. Data is retained when Pro expires.

## Conversion

Fitness setup can be explored without an account. The final Create My Plan action validates answers and opens the common contextual paywall for Free users. It does not generate a plan. An owned sessionStorage draft preserves answers across Checkout. An explicit `resume=1` authentication continuation can consume a guest draft once. This is intentionally distinct from automatically importing unowned historical data. Drafts never grant Pro. Following a successful Checkout redirect, the client requests trusted reconciliation and waits for server-confirmed membership before submitting the original plan request. Server-side deterministic fallback handles planner failure; the client never falls back around an authorization failure.

## Screens

`/signin`, `/signup`, `/forgot-password`, `/reset-password`, `/account`, `/upgrade`, `/terms`. Existing workout/plan/library screens retain their visual patterns. Account provides name editing, membership management, password controls only for email accounts, logout and explicit destructive deletion. The header account control links to these settings; workout settings remain at `/settings`.

## Development and launch

`admin / admin` authenticates only under `NODE_ENV=development` or `test`, with a process-random signed HttpOnly cookie. THIS AUTHENTICATION SHORTCUT DOES NOT EXIST IN PRODUCTION. It does not create a Supabase user, cannot create Stripe purchases and is invalidated by a process restart. Production administrators are real verified Supabase users whose profile role is changed through trusted database administration.

Run SQL migrations in order, configure Supabase email delivery/confirmation and Google OAuth, configure Stripe recurring monthly/yearly prices plus webhook and Customer Portal, and set the server-only variables in `.env.example`. Apple is not required by this web-only repository, and no fake Apple option is shown. Live provider flows require externally supplied configuration; local tests verify integration boundaries rather than claiming real charges or email delivery.

Legal pages describe implemented behavior; the product owner must supply business identity, jurisdiction-specific terms, retention/backup policy and support contact before launch.
