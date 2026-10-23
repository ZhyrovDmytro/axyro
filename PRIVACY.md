# Privacy and data inventory

> Current account/subscription extension: see [Membership implementation](docs/MEMBERSHIP_IMPLEMENTATION.md), [Authentication](docs/AUTHENTICATION.md), [Billing](docs/billing.md), and [Multi-user data](docs/MULTI_USER_DATA_ARCHITECTURE.md). These replace earlier local-only/no-account scope statements below. Guest access is the single free starter; personalized plans and full access require Pro.


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
| Sore or uncomfortable areas                  | No              | Exclude affected loading and pause conflicting progression |
| Upcoming match dates and importance          | No              | Protect recovery space around competition                  |

Axyro does not ask for or retain sex, age, height, weight, identity/contact
details, precise location, or free-form health notes. The current generator has
no behavior that requires those fields. Legacy locally stored profile and plan
objects are parsed through the current runtime schema and rewritten into the
normalized field/value vocabulary without obsolete fields when read.
Human-readable questionnaire labels are never stored as profile values.

## Browser storage inventory

All user-generated state is stored in the current browser's `localStorage`:

| Key                           | Contents                                                                        | Purpose                                                |
| ----------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------ |
| `veyro.training-profile.v2`   | Minimized planner profile, including optional discomfort areas                  | Rebuild a plan without repeating setup                 |
| `veyro.training-plan.v1`      | Profile copy, generated schedule, session snapshots, game dates and adaptations | Display and run the current 60-day plan                |
| `veyro.workout-activity.v1`   | Scheduled, started, missed, skipped and completed activity; feedback            | Continuity, history and conservative future adaptation |
| `veyro.active-workout.v1`     | Current executable workout and timer/phase state                                | Resume an interrupted workout                          |
| `veyro.preferences.v1`        | Audio and preferred effort settings                                             | Restore user-selected guidance behavior                |
| `veyro.adaptation-profile.v1` | Difficulty trend and bounded preferred/avoided exercise IDs                     | Adapt only future plan proposals                       |

Data remains until the user deletes it in **Settings → Privacy & data**, clears
site storage, or removes the app/browser data. Resetting a plan removes the
current plan and active workout but deliberately retains the profile, history,
feedback and preferences. **Delete all my data** removes every key listed above.

## Off-device and third-party audit

The application has no account system, cloud synchronization, advertising,
analytics, or crash-reporting SDK. When `AI_PLANNER_ENABLED` is false (the
default), planning is deterministic and no planning data is sent to OpenAI.

When an operator explicitly enables the AI planner, the browser sends the
athlete profile and compact adaptation profile to Axyro's server-only
`POST /api/training-plan` route. That route sends a human-readable structured
rendering of those answers and adaptation context plus up to 100 eligible compact
exercise candidates to OpenAI with response storage disabled.
It does not send workout history records, media, coaching instructions, common
mistakes, or the API key to the browser. The accepted compiled plan is returned
to the browser and stored locally. OpenAI processing and retention are governed
by the operator's OpenAI API agreement and configuration.

This audit covers both Axyro code and declared runtime dependencies, not only
the persistence adapters. Before adding telemetry, remote media personalized by
user state, authentication, cloud sync, or another third-party integration,
repeat this audit and update the in-product notice and release disclosures.

## Safety boundary

Discomfort selections are optional protective inputs, not diagnoses. Axyro uses
them only to avoid affected exercise loading and progression. It does not infer
a medical condition, recommend treatment, or claim that training will resolve
pain.

## Catalog updates

A saved plan containing retired/reference-only exercises is no longer launched.
The app flags it for rebuilding and retains the original local plan until the
athlete replaces or deletes it. Completion/activity records are preserved.
The daily-duration changes introduce no new storage keys or external tracking.
