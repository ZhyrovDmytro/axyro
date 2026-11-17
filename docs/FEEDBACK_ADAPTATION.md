# Workout feedback and weekly adaptation

Implemented 2026-11-10. The existing 60-day, nine-week plan remains the baseline; the four-week schedule in the feature request was illustrative. No exercise catalog or media changes are needed.

## Feedback and ownership

`WorkoutFeedbackEvent` extends the existing session-linked record rather than introducing a second feedback store. New submissions persist semantic `perceivedDifficulty` (`TOO_EASY`, `SLIGHTLY_EASY`, `JUST_RIGHT`, `HARD`, `TOO_HARD`), conditional structured `reasons`, optional trimmed comment (500 characters maximum), affected exercise IDs, creation/update times, plan/week attribution, timed completion percentage and actual/expected duration. The compatibility `rating` keeps historical records and existing pain safeguards readable. Pain is a reason, independent of perceived difficulty.

The completion itself saves before the question, so closing a tab does not lose a finished workout. The completion screen requires an answer before its Done action. Just right saves immediately; other choices show brief optional reasons and a note. History supports adding or editing feedback, including a note after a Just right answer. Stable completion-derived feedback IDs ensure one current record per completion. Identical saves retain their update timestamp; edits preserve creation time. Writes validate conditional reasons and exercise membership and report storage failure instead of pretending to save.

Identity comes from the existing account-scoped storage and server session, not a user-supplied feedback owner. The feedback record inherits that envelope owner. A scheduled session's activity establishes plan identity; standalone workouts can have feedback without plan attribution. Existing history without feedback remains valid.

## Observations and assessment

`assessTrainingWeek` is pure and deterministic for the same inputs and clock. `weeklyAdaptationConfig` centralizes thresholds. `reconcileTrainingWeeks` accumulates observations during an active week, then makes recommendations actionable after its final scheduled workout completes or another plan week is entered. Weeks are relative to `plan.startDate`, never assumed to start on Monday. Direct next-week workout URLs run this review before mounting the player.

Each scheduled session contributes at most one current explicit observation. Activity completion IDs reject mismatched replay feedback. Exercise-specific pain/technique responses do not become whole-plan difficulty scores. Timed completion uses work duration, rounds, sides and completed sets, rather than elapsed wall time or rep targets.

Rules:

- Semantic difficulty maps internally to -2, -1, 0, 1, 2. Explicit feedback is strongest. The newest observation receives at most 10% more weight than the oldest.
- At least two nonlocalized explicit observations are required for systemic adaptation. One difficult workout remains insufficient data.
- Repeated incomplete work adds `max(0, 0.85 - completionRate) * 0.6`; skips above 10% add at most 0.25 (`skipRate * 0.35`).
- At least two lighter/soreness adaptations add 0.25 only when difficulty already points toward excessive load. Less time, unavailable equipment and missed sessions do not themselves mean too hard.
- Repeated skipping or replacement in at least two observations flags the affected exercise. It favors a local change rather than automatically reducing the whole plan.
- A preceding assessment pointing the same direction contributes 0.15. Reversal after a harder week caps the following increase at 5%.
- Absolute signals below 0.45 are appropriate; 0.45–1.2 are slightly easy/hard; at least 1.2 is significantly easy/hard. Missing minimum observations gives insufficient data. Easy ratings conflicting with poor completion cannot trigger progression.
- Proposed modifier targets are +5%, +10%, -7%, -15%; appropriate/insufficient weeks use zero. These guide prescription choices, not uniform duration multiplication.

Confidence is LOW with fewer than two explicit observations, conflicting signals, or fewer than two completed sessions. Three completed sessions with three consistent explicit responses give HIGH; remaining adequately observed cases give MEDIUM. Missing sessions reduce available evidence; they do not add a difficulty penalty. Resume and reschedule metadata, actual durations, substitutions and Adapt Today choices remain auditable; resumed/rescheduled/shortened/equipment events are context rather than speculative difficulty diagnoses.

## Prescription adjustments

`buildWeeklyAdaptationProposal` changes only scheduled sessions in the following plan week. Ordinary changes preserve user-edited and Adapt Today prescriptions. Local problems take priority: prefer the authored regression with the same primary sport movement role and laterality, compatible equipment/setup and safe timing. Otherwise shorten the affected interval within bounds. Replacement clears incompatible tempo overrides.

For systemic adjustments, recovery changes precede work-duration changes. Repeated “workout too long” reasons instead favor shorter bounded work without adding recovery; insufficient-recovery reasons favor rest. Technique feedback without exercise localization remains a difficulty observation rather than being discarded. Warm-up, cooldown, mobility, activation and explosive/power intervals are not made harder. Authored interval bounds and session-duration tolerance remain in force for ordinary adjustments. The proposal reports achieved work-density change, which can be smaller than the requested modifier. It is an estimate rather than a physiological load measurement. No exercise is added solely to increase difficulty.

Canonical `originalSessionSnapshot` is immutable. Accepted changes establish `weeklyAdaptedSessionSnapshot`; Adapt Today derives from and resets to that accepted baseline. Activity history retains original, adapted and executed snapshots separately. Completed/in-progress workouts are not rewritten.

## Pain safety

Pain never creates a positive modifier. Current-week pain and unresolved earlier pain block increases and identify the affected exercise/body area where possible. The supplied `activePainFeedback` comes from the existing pain-block repository, so explicitly cleared earlier blocks stop influencing later proposals. A current week's recorded pain remains evidence for that week's assessment even after clearance.

For affected movements, proposals regress or shorten work and reverse programmed work increases, added rounds and reduced recovery. Pain changes remain available even for edited/Adapt Today sessions. Safety can produce a session shorter than the normal requested-duration tolerance; its duration status and before/after preview expose the difference. Timing targets must not cause a needed safety change to be discarded.

The UI gives a brief non-diagnostic message to stop movements that hurt and seek qualified advice if discomfort persists. It does not diagnose a condition or promise that a substitute is medically suitable. Unknown localization conservatively holds progression for the involved session's movements. The user still reviews plan changes; pain feedback does not silently regenerate the program.

## Proposal lifecycle and atomicity

Assessments and proposals are embedded in the existing plan JSON. A pending proposal contains source/target weeks, assessment/confidence, explanation, exact before/after sessions and a stable ID. Plan prescriptions remain unchanged until acceptance. The UI offers Review changes, Adjust my plan and Keep current plan.

Acceptance rechecks Pro access, rereads current plan and feedback, verifies every target still matches its preview, and durably writes prescriptions plus accepted status/timestamp together. Decline saves the decision while preserving prescriptions. Duplicate decisions are no-ops. Storage failure keeps the choice unresolved and exposes a retry message. Account changes invalidate captured repositories.

Changed feedback invalidates its weekly fingerprint; pending proposals become superseded. Changes to target prescriptions also refresh stale previews. Reconciliation reloads the persisted plan on plan/activity storage events before writing, preserving edits and decisions made in another tab. Current activity status excludes running sessions from proposals. New versions receive distinct IDs. Resolved proposals remain historical and are not repeatedly reopened for the same source week; editing feedback recalculates the assessment but does not reverse accepted history or nag after a decline. Unresolved pain participates in invalidation. Declines currently suppress repeat prompts, without adding speculative difficulty evidence.

The launcher keeps an admitted player mounted while completion updates the plan, so the feedback question survives completion. Its admission key is plan identity plus week.

## Persistence migration and entitlements

No relational migration is required: these are additive validated fields inside existing `veyro.workout-activity.v1` (state version 4) and `veyro.training-plan.v1` JSON. Legacy version 2/3 and older feedback migrations remain supported; assessment/proposal/baseline fields are optional. No new storage namespace or table is introduced.

Cloud synchronization continues through `user_training_data`, account row policies and revision compare-and-swap. Existing API/SQL Pro guards protect plan writes, including embedded adaptation data. Free users can submit history feedback; personalized adaptation uses existing Pro access. The development admin keeps its existing access. A save confirms local durability; actual cloud status continues to use the existing synchronization/error UI. Hosted database deployment is not part of this change.

## Worked examples

1. **Hard, Just right, Hard; all completed; no Adapt Today:** recency-weighted explicit signal is approximately 0.667; completion adds zero. Result: SLIGHTLY_TOO_HARD, HIGH confidence, requested modifier -7%. Prefer slightly longer recovery within the existing budget. The exact preview reports what bounds allow.
2. **Hard, Too hard, Hard; all completed:** signal is approximately 1.333. Result: SIGNIFICANTLY_TOO_HARD, HIGH confidence, target -15%; actual achievable density change may be smaller.
3. **Too easy, Too easy, A little easy; all completed:** signal approximately -1.656. Result: SIGNIFICANTLY_TOO_EASY, HIGH confidence, target +10%; reduce unnecessary recovery before increasing bounded work.
4. **One Just right, two missed:** insufficient explicit observations; LOW confidence, zero modifier, retain programmed progression. Missing sessions do not imply excessive difficulty.
5. **Three Just right responses but only 60% timed completion:** conflicting behavior, LOW confidence. Do not invent a confident progression increase; collect further observations.
6. **Technique problem isolated to one movement, remaining workouts appropriate:** exclude the localized response from systemic scoring; propose an appropriate regression/shorter interval only for that movement where it appears next week.
7. **Easy feedback plus pain:** pain vetoes progression. Preserve the localized safety signal and propose a movement adjustment; do not interpret easy as permission to increase it.
8. **Repeated hard weeks:** the preceding same-direction assessment adds 0.15, reinforcing evidence while bounded edits prevent dramatic changes. An appropriate following week retains baseline progression rather than provoking an opposite large adjustment.

## Verification and development simulation

Pure engine tests cover calibration, all five responses, contradictions, pain/localization, repeated lighter/equipment/skipping signals, hysteresis, wrong session links, immutable originals, accepted baselines and replayed decisions. Repository tests cover migration, validation, idempotency, account ownership, storage failure and passive metadata. Service tests cover active-week accumulation, schedule boundaries, superseding edits and stale previews. Mobile Playwright flows cover completion/history feedback and direct-start acceptance/decline.

Use `npx vitest run src/domain/training-plan/weekly-adaptation.test.ts` to simulate easy, appropriate, hard, very hard, pain and insufficient-data weeks. `tests/e2e/weekly-adaptation.spec.ts` seeds the existing local development admin with real generated plans and durable feedback for interactive browser verification. These fixtures are test-only; no production simulation controls are exposed.

There is currently no product analytics infrastructure (the privacy policy states analytics is absent), so no external events or sensitive note transmission are introduced. Future analytics can observe repository/service transitions with IDs and structured categories only; never include free-text comments. More sophisticated algorithms can replace these pure input/output functions without changing feedback ownership or proposal consent.

### Verification evidence (2026-11-10)

- `npm test`: 484 tests passed across 70 files.
- `npm run typecheck` and `npm run lint`: passed.
- `npx playwright test --workers=4`: all 160 mobile browser tests passed, including next-week acceptance/decline, stale-tab preservation, feedback/history editing and existing access/paywall regressions.
- `npm run build -- --webpack`: production build passed. Default Turbopack build could not bind an internal worker port in this execution environment; webpack supplied the production verification.
- Separate postimplementation reviews covered training correctness, React/accessibility, persistence, edge cases, tests and entitlements. Fixed reason-specific timing, stale-tab overwrite, nonlocalized technique evidence, running-session exclusion and focus transitions; corresponding regressions pass.

No production deployment or live cloud synchronization verification was performed. Existing image optimization hints remain outside this feature.
