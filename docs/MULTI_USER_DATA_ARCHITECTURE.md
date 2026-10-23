# Architecture and user data ownership

Axyro is a Next.js App Router web application using strict TypeScript, React and CSS/Tailwind. There was no backend identity or billing infrastructure before the multi-user extension. It has no native iOS distribution target.

## Existing boundaries retained

- `src/data`: reusable exercises, workouts and sport relevance. Exactly 40 curated home-training records, including the three prone shoulder movements with optional light dumbbells.
- `src/domain/workout`, `session`, `audio`: deterministic time-based workout construction, reducer, phase clock and cue scheduling.
- `src/domain/training-plan`: questionnaire validation, deterministic/model-assisted planning, scheduling and feedback adaptation.
- `src/components/plan`, `player`, `activity`: onboarding/dashboard, workout execution and history.
- `src/services/persistence`: runtime-validated domain repositories over the existing synchronous StorageLike interface.
- `src/services/audio`: replaceable browser speech adapter.
- `src/app/api`: server route handlers including authenticated planning, auth, billing and user-data transport.
- Vitest covers domain/services; Playwright covers browser workflows. Environment configuration and deployment are documented in the root README and account setup documentation.

## Ownership audit

All six browser stores are personal: `training-profile.v2` (onboarding/sport/equipment/goals/problem areas), `training-plan.v1` (generated/current plan and scheduled sessions), `workout-activity.v1` (history, feedback, skipped/rescheduled sessions), `active-workout.v1` (resume snapshot), `preferences.v1` (audio/effort), and `adaptation-profile.v1` (derived progress/adaptation). Browser factories now bind immutable identity-scoped adapters. Direct external-store hooks use that same adapter. There are no additional unscoped browser stores.

The auth provider loads server identity, initializes storage, then mounts a subtree keyed by identity. Initialization invalidates old adapters before fetching data. Logout/account changes invalidate old callbacks; previous-owner repositories cannot read or write. Guest storage is separately namespaced and cannot persist plans, training profiles or adaptation profiles. Guest exercise execution uses the canonical free starter selected by the product access policy.

## Server and synchronization

`user_training_data` is owned by `auth.users.id` with cascading deletion and own-row RLS. Its JSON payload contains the six existing serialized repository values, so existing schema validation/migration remains authoritative rather than duplicating domain models. It contains no credentials, roles or subscription authority. API calls use the verified server session and that user's access token. Posted identity is checked only to reject stale queued writes after an account switch.

Cloud data is hydrated before personal UI mounts; failure stops initialization rather than showing another account's cached state. Scoped local copies support synchronous workout recording; writes synchronize after 300 ms and are serialized. Atomic revision comparison prevents stale devices from silently overwriting a newer snapshot. A conflict stops synchronization and emits `axyro:sync-error`; reload reconciles from the cloud. Network failures keep the isolated local copy and subsequent writes retry. Offline writes are not promised cross-device durability: refresh hydrates cloud truth, so callers must display synchronization failures. Browser storage being unavailable means local workout continuation only, with no persistence guarantee.

An authenticated Free user may retain/read their prior plan after expiration. Changes to a nonempty personalized plan require trusted Pro both in the API and in a database trigger; deletion remains available. Direct PostgREST access cannot bypass this boundary. The shared blob is deliberately small architecture; migrate to separately versioned rows if independent concurrent history edits or larger histories become necessary.

## Legacy migration decision

Old unscoped browser data has no authenticated owner. It is neither uploaded nor claimed by the first person signing in. Existing raw keys are retained untouched for deliberate export/recovery; no automatic migration can prove whether those data belong to the new account. New authenticated accounts begin clean unless cloud data already exists. Guest data is also never silently transferred to a signed-in account.

Account deletion must remove server identity (cascade deletes application rows) and then call `removeUserStorage(userId)` to remove that browser's account cache. Sign-out retains isolated local cache for that owner, inaccessible through app repositories until that same identity is verified again.
