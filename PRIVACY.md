# Privacy and data inventory

## Production email delivery — 2026-11-01

Supabase Auth is configured to deliver account confirmation and password-recovery
emails through Resend SMTP, using `noreply@auth.axyro.app` and the Ireland region.
Resend processes recipient addresses, authentication-email contents/links and
delivery metadata. Receiving and tracking metrics are not configured. The SMTP
credential is stored in Supabase, scoped to sending from this domain, and is not
part of application source or browser assets. Live email delivery/retention
verification and the publishable provider disclosures remain launch work under
L05/L09/L12.

> Current account/subscription extension: see [Membership implementation](docs/MEMBERSHIP_IMPLEMENTATION.md), [Authentication](docs/AUTHENTICATION.md), [Billing](docs/billing.md), and [Multi-user data](docs/MULTI_USER_DATA_ARCHITECTURE.md). These describe account storage and subscription handling. Guest access is the single free starter; personalized plans and full access require Pro.


This document describes the current Axyro MVP implementation. It is an
engineering data-flow record, not legal advice or a substitute for release-time
App Store or privacy-policy review.

## Data minimization decision

The planner stores only fields tied to current product behavior:

| Data                                         | Required        | Current use                                                |
| -------------------------------------------- | --------------- | ---------------------------------------------------------- |
| Sport and experience                         | Yes             | Select and rank compatible training                        |
| Training goals and sport-specific priorities | Yes/conditional | Rank workouts by requested outcomes                        |
| Training frequency and preferred days        | Yes             | Build the 60-day schedule                                  |
| Preferred workout duration                   | Yes             | Fit timed sessions to the chosen target                    |
| Available equipment                          | Yes             | Exclude incompatible exercises and workouts                |

| Upcoming match dates and importance          | No              | Protect recovery space around competition                  |

The training questionnaire does not ask for sex, age, height, weight, contact
details, precise location, or free-form health notes. Accounts separately store email and profile details. The current generator has
no behavior that requires those fields. Legacy locally stored profile and plan
objects are parsed through the current runtime schema and rewritten into the
normalized field/value vocabulary without obsolete fields when read.
Human-readable questionnaire labels are never stored as profile values.

## Browser storage inventory

The following keys describe browser training data. Signed-in accounts use an account-scoped cache and synchronize training records to Supabase. Guest training data stays in the browser:

| Key                           | Contents                                                                        | Purpose                                                |
| ----------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------ |
| `veyro.training-profile.v2`   | Minimized planner profile, training preferences                  | Rebuild a plan without repeating setup                 |
| `veyro.training-plan.v1`      | Profile copy, generated schedule, session snapshots, game dates and adaptations | Display and run the current 60-day plan                |
| `veyro.workout-activity.v1`   | Scheduled, started, missed, skipped and completed activity; feedback            | Continuity, history and conservative future adaptation |
| `veyro.active-workout.v1`     | Current executable workout and timer/phase state                                | Resume an interrupted workout                          |
| `veyro.preferences.v1`        | Audio and preferred effort settings                                             | Restore user-selected guidance behavior                |
| `veyro.adaptation-profile.v1` | Difficulty trend and bounded preferred/avoided exercise IDs                     | Adapt only future plan proposals                       |

Custom workout definitions are stored in that browser under the signed-in account and are excluded from cloud sync. Clearing browser storage removes the local copy. Signed-in training data can sync back from Supabase. Use the in-app data controls to change account data. Resetting a plan removes the
current plan and active workout but deliberately retains the profile, history,
feedback and preferences. **Delete all my data** removes every key listed above.

## Off-device and third-party audit

Netlify hosts the application. Supabase manages identity and synchronized account data, Resend delivers authentication email, and Stripe manages subscriptions. Google processes sign-in when selected. The application has no advertising, analytics or crash-reporting SDK. When `AI_PLANNER_ENABLED` is false (the
default), planning is deterministic and no planning data is sent to OpenAI.

When an operator explicitly enables the AI planner, the browser sends the
athlete profile and compact adaptation profile to Axyro's server-only
`POST /api/training-plan` route. That route sends a human-readable structured
allowlisted rendering of training preferences plus up to 100 eligible compact
exercise candidates to OpenAI with response storage disabled.
It does not send workout history records, media, coaching instructions, common
mistakes, or the API key to the browser. The accepted compiled plan is returned
to the browser and saved through the training repository. OpenAI processing and retention are governed
by the operator's OpenAI API agreement and configuration.

This audit covers both Axyro code and declared runtime dependencies, not only
the persistence adapters. Before adding telemetry, remote media personalized by
user state or another third-party integration,
repeat this audit and update the in-product notice and release disclosures.

## Safety boundary

Current forms collect structured training preferences and optional Easy, Just right or Hard workout ratings. Axyro stores ratings with the completed session and uses them to suggest plan changes for the user to review. They omit symptom questions and open-ended feedback notes. Legacy profiles with symptom exclusions use deterministic planning. The model receives neither adaptation profiles nor feedback, and repair requests omit raw validation errors. Historical records may persist until removed through data controls or a separately verified cleanup.

## Catalog updates

A saved plan containing retired/reference-only exercises is no longer launched.
The app flags it for rebuilding and retains the original local plan until the
athlete replaces or deletes it. Completion/activity records are preserved.
The daily-duration changes introduce no new storage keys or external tracking.


## Optional workout analytics

Analytics is disabled by default. If a build enables it, Settings offers a
browser-specific choice in `axyro.analytics.v1`. The stored choice lasts until
it is changed or the browser's site data is cleared. Declining analytics stops
future reporting from that browser.

With consent, the player sends only `workout_started` or `workout_completed`
to the same origin. The request omits credentials and the page referrer. The
app logs only the fixed event name and a source label. The hosting platform
can receive connection metadata. Confirm hosting log access, metadata and
retention, and update the public notice before enabling hosted analytics.


## Access and portability

Settings downloads a versioned JSON copy of the current guest or signed-in
user's training data stored in this browser, including local custom workouts.
Other accounts' keys, unattributed legacy storage, browser analytics choices
and authentication data are outside the export. Axyro provides a separate
privacy request contact for access to account and provider-side records and for
other rights. Settings waits for account synchronization before confirming a
signed-in training-data reset or deletion.
