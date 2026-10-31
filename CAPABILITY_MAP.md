# Card-free Pro week and account-gated plans

Date: 2026-10-27. Status: proposed; implementation has not started.

## Confirmed product decision

The owner selected seven days of Pro without a card and without automatic
charging. Payment-provider configuration will be added later. Reuse the existing
Supabase accounts, Stripe Checkout, signed webhooks, Customer Portal and trusted
entitlement checks; do not introduce a second billing provider or a mock purchase.

## Capability map

| Module id | Responsibility | Depends on |
| --- | --- | --- |
| pro-access | Explicit one-time free-week activation, server-owned start/expiry, shared access checks and account membership status | Existing verified accounts and database |
| plan-conversion | Guest setup, account-required plan result, saved-answer continuation and Pro execution/editing gates | pro-access |
| subscription-offer | Contextual Free/Pro paywall, trial CTA, paid upgrade and honest provider-unavailable states | pro-access; existing Stripe integration |

Build order: pro-access → plan-conversion → subscription-offer.
These are changes to existing modules, not new services or package boundaries.

## Proposed behavior for review

- Free remains available after the trial: the starter workout and access to the
  account's generated plan result. Trial expiry does not delete training data.
- Guests and Free accounts see six stable exercise guides, followed by the
  existing overflow placeholder and an Explore Pro prompt. Search stays within
  those six; Pro opens all 40. Individual exercise references remain public.
- A guest can finish the questionnaire. Before revealing the plan result, require
  signup or sign-in and preserve validated answers through that continuation.
  Do not claim a plan has been generated before generation succeeds.
- Account holders can generate and view their plan without buying Pro. Guided
  plan workouts, plan editing/adaptation, the full libraries and progress remain
  Pro features. Plan creation/view and plan execution must have distinct checks.
- Start the free week only through an explicit authenticated activation action,
  not on account creation or a read request. Display the end date and say
  “No card required. No automatic charge.”
- Record one immutable trial activation per account using server/database time
  and an atomic operation. Reloads, concurrent clicks, checkout reconciliation,
  logout and browser storage changes cannot restart or extend it. Expiration
  applies consistently in API, database and browser access checks.
- Distinguish app free-week access from Stripe subscriptions. Never create fake
  Stripe customer IDs or send a trial-only account to the Stripe billing portal.
- Preserve existing paid access and admin access. Reconcile paid subscription
  state independently of free-week state. Failed/past-due payments must not
  accidentally activate a fresh trial.
- During the free week show Pro access and its expiry. Afterward offer a paid
  upgrade, retain the plan and keep the free starter workout accessible.
- When Stripe is unconfigured, allow the free week and account-required plan
  flow. Say paid upgrades are not available yet; do not show invented prices,
  broken checkout buttons or promise a future billing date.
- Once configured, use real Stripe prices, hosted Checkout and Customer Portal.
  Paid membership requires trusted provider reconciliation, never a success URL.
  Upgrading during a free week should make the first paid charge timing explicit.
  Proposed default: defer the first charge until the existing free week ends,
  without granting a second trial; show that date before redirecting to checkout.

## Existing cause and affected surfaces

Local inspection found no Stripe secret, monthly/yearly Price IDs or webhook
secret in `.env.local` (values were not printed). `products()` returns an empty
list with no price IDs; the paywall turns that into “Subscriptions are currently
unavailable.” Email signup is configured separately and cannot establish Pro.

Implementation must reach entitlement types/tests; billing status, checkout and
trial endpoints/tests; additive SQL migration and SQL plan-write checks;
plan-generation and user-data authorization; onboarding/draft continuation;
plan result versus execution/editor routes and components; account membership;
paywall states; account/subscription browser fixtures and tests; membership,
billing and launch-readiness documentation. Preserve unrelated landing-page edits.

## Verification and service boundary

Verify one-time and concurrent activation, exact expiry, forged/unauthenticated
requests, account isolation, paid/trial precedence, plan generation/save/view for
Free accounts, Pro execution/editing enforcement, signup continuation, no-provider
paywall, checkout continuation and duplicate-charge prevention. Run TypeScript,
lint, unit/API tests, relevant mobile browser flows and a production build.

No live payment configuration, hosted migration, production deployment, charge,
email campaign or new dependency is part of this local implementation. Hosted
migrations and real Stripe lifecycle verification remain explicit launch tasks
under L04, L06, L07 and L08 in `docs/LAUNCH_READINESS.md`.
