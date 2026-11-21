# Plan creation and daily use

Independent implementation review and proposed next changes · 19 November 2026

## Proposal for adjusting an active plan

Product proposal · 19 November 2026

### Implementation status

Refinement now presents one question at a time with Back and Continue. Members can change multiple answers in a single draft, edit a changed answer directly from review, and apply one dated preview. The difficulty step offers keeping workouts as planned, making them lighter or harder at the same session length, or replacing up to five exercises scheduled in the next seven days. Comfort remains its own step. When no compatible workout fits a date, refinement offers to remove the affected workout or leave a newly requested day open. The review shows the outcome before saving. Active-plan Settings retains its direct duration entry. Dated time off remains a follow-up. [Adjustment page](../src/components/plan/plan-adjustment.tsx) · [Plan adjustment rules](../src/domain/training-plan/plan-adjustment.ts)

### Baseline before the reason-first change

**Refine my plan** opens the same onboarding component as first-time setup. Padel members move through schedule, physical focus, three Padel priority pages, comfort, equipment and review. General training follows a shorter path. Both already display the affected dates before saving. Match entry lives in the calendar, and refinement reads the saved match dates. The domain currently generates a deterministic block from the updated profile and reconciles future sessions against the original block. An equipment or availability change can therefore change compatible future workouts as a side effect of a rebuild. Settings also has its own duration-change path. [Current questionnaire](../src/components/plan/plan-onboarding.tsx) · [Reconciliation](../src/domain/training-plan/refine-training-plan.ts) · [Settings](../src/components/settings/privacy-data-settings.tsx)

### What the research suggests

- TrainerRoad lets athletes enter directly into the part of the current plan they want to edit, such as weekly days or volume. It handles time off as a dated calendar adjustment. TrainingPeaks allows a single workout or a selected range to move and protects locked workouts. For Axyro, the useful pattern is to ask how widely a change applies and preserve the rest of the calendar. [TrainerRoad schedule](https://support.trainerroad.com/hc/trainerroad-support/articles/36185898667291-how-to-edit-your-training-plan-schedule) · [TrainerRoad training adjustments](https://support.trainerroad.com/hc/trainerroad-support/en/categories/general-usage-trainerroad-ai) · [TrainingPeaks calendar](https://help.trainingpeaks.com/hc/en-us/articles/204072164-How-do-I-move-a-workout)
- TrainerRoad captures perceived effort after the workout and asks why when a second answer can explain what happened. Axyro already records effort, technique difficulty and discomfort. Use those answers in weekly review. A missed workout alone establishes that the session was missed. The athlete can clarify whether time, equipment or difficulty was the issue when they choose to adjust the plan. [TrainerRoad post-workout surveys](https://support.trainerroad.com/hc/trainerroad-support/articles/4404884465563-what-are-post-workout-surveys) · [Axyro feedback form](../src/components/feedback/workout-feedback-form.tsx)
- GOV.UK recommends branching to relevant questions and giving people an opportunity to check and change their answers before submission. ACSM’s 2026 resistance-training guidance emphasizes sustainable participation and individualization for healthy adults. These support a short reason-first flow and bounded choices. The exact seven-day window and Axyro’s 5-, 10- and 20-minute presets are product decisions. [GOV.UK form structure](https://www.gov.uk/service-manual/design/form-structure) · [GOV.UK check answers](https://design-system.service.gov.uk/patterns/check-answers/) · [ACSM guidance](https://acsm.org/resistance-training-guidelines-update-2026/)

### Proposed member flow

1. **Refine my plan** opens a dedicated **Adjust your plan** page. Show the current week and end date, the saved days and session length, and the next scheduled workout. Start with **What needs to change?** Let the member choose one reason so every following question has a clear purpose.
2. Show the relevant questions with current values filled in. For schedule, duration and equipment, ask **For the next 7 days** or **Ongoing**. Display the exact first and last affected dates. Ongoing applies to eligible workouts through the end of this block and becomes the saved default for the next block. Temporary changes expire within the current block. Back returns to the reason list with selections intact for that visit.
3. **Review changes** shows what will happen to this plan, grouped by dates. Show the old and proposed schedule, duration or movement wherever it changes. Explain each replacement and identify manual edits that would be affected. If no sessions qualify, explain why and disable the apply action. **Apply to upcoming workouts** saves the preview and returns to the calendar with the affected dates highlighted or summarized.

### Which questions to ask

| Reason | Question shown | Effect on this plan |
| --- | --- | --- |
| **My schedule changed** | “Which days can you train now?” Start from the current days and derive the weekly count from the selected days. | Move existing upcoming sessions first and retain their IDs and prescriptions. For an ongoing change, add or remove sessions only where the new number of days requires it. Keep a one-off move in the calendar. |
| **My workout time changed** | “How much time can you set aside?” Reuse the 5-, 10- and 20-minute selector with the current duration selected. | Refit eligible sessions on their saved dates, retaining familiar main movements where they fit. Keep warm-up, main work and cooldown inside the selected duration tolerance. Show any substitute or duration the catalog cannot support. Use **Adapt today** for a single workout. |
| **My equipment changed** | “What equipment will you have available?” Reuse the existing equipment choices. | Keep compatible sessions and replace only conflicting movements or workouts. Show substitutions before applying. Optional dumbbells stay optional. |
| **Workout difficulty** | “How should we adjust your workouts?” Offer **Keep workouts as planned**, **Make workouts lighter**, **Make workouts harder**, and **Replace exercises**. Let the member select up to five exercises from workouts scheduled in the next seven days. | Making workouts lighter adds recovery. Making them harder lengthens eligible work intervals and shortens rest within authored bounds. Both preserve session length. Replacing exercises proposes compatible substitutes on eligible dates. Use recorded feedback as context, preview the changes, and avoid applying the same load reduction twice. |
| **I need to avoid an area** | “Which areas should upcoming workouts avoid?” Reuse the current comfort choices and show current exclusions. | Treat these answers as protective constraints. Apply immediately to eligible workouts and retain the exclusions until the member explicitly updates them. If an area cannot be mapped or no compatible workout fits, explain the limitation and offer the existing recovery choices. |
| **I want to shift my focus** | “What should upcoming workouts prioritize?” Open a prefilled focus editor with existing physical and Padel choices. Show the detailed Padel categories on demand. Balanced training remains an explicit option. | Re-rank compatible exercises for future sessions whose focus changes. Preserve the training phase, comparable movements used for progression, and the saved schedule where feasible. Show in review that the new focus also becomes the saved default. General training shows physical choices. |

The new information is the reason for changing the active plan, when the change applies, and what is hard about the workouts or which movement is causing trouble. Sport and original broad goals are already known. Match dates and importance continue to be managed through **Add or edit match** in the calendar, which also owns recovery rebalancing. Settings can link an active member to the ongoing session-length branch and keep its existing default control for people without an active plan.

**Next slice after launch of the core branches:** add **I’ll be away** with start and return dates. Preview rest days and remaining sessions inside the block. Make the dated exception visible and editable on the calendar. Resume the existing phase without shifting the block end or piling missed work into the return week. Prioritize this slice if members need future-dated changes that the seven-day branches cannot express.

### How an adjustment should affect the calendar

- Compute a proposed change from the latest saved block and the fields edited in the selected branch. Keep the block identity, end date, session history, progress, active or resumable workouts and match importance. Preserve workouts outside the affected date range and compatible prescriptions inside it. Retain existing IDs when editing or moving a scheduled session. Add a new ID only for a genuinely new session.
- Apply equipment, discomfort, authored timing and match recovery constraints before scheduling or changing load. Where it fits, preserve manual moves, exercises and edits. Show a specific conflict and proposed alternative when those choices clash. Historical missed and skipped records remain recorded. A temporary cut in availability should never increase workload later to catch up.
- Store a temporary constraint with its effective dates and keep the saved questionnaire answers available for later weeks and renewal. Use the same effective constraints when edits, weekly proposals and match changes overlap. Refresh any affected pending weekly proposal before it can be accepted. Keep declined decisions and subsequent unrelated changes intact.
- Save an adjustment draft as requested changes tied to the source block and reviewed values. Re-read the block and relevant activity before commit. Merge unrelated newer edits into a fresh preview. If a relevant input or outcome changed, show what changed and require confirmation again. Treat a duplicate confirmation as one update. A failed save keeps the current plan and the draft.

### Delivery order and acceptance

1. **Add the reason-first page and deliver the schedule branch.** Protect against stale writes from both this flow and the workout editor as part of the same first slice. In a phone-width test, change one schedule setting with no sport or focus questions. Review the dates, save and reload. Confirm a completed workout, a paused workout, a manually edited workout and an important match still have the expected state. Verify an unrelated match edit in another tab survives, and a competing edit to the same session requires a fresh preview.
2. **Add duration, equipment and comfort.** Reuse the existing answer controls, route active-plan duration changes through the same preview, and cover temporary versus ongoing behavior. Verify overlapping changes, expiry, no affected dates, and impossible constraints. Check that a temporary bodyweight week preserves valid sessions, shows the weight-dependent substitutions, and returns to the saved equipment defaults on its stated end date. Confirm supported durations in the player.
3. **Add the recent-workout and focus branches.** Verify a lighter week preserves scheduled time and does not stack with a weekly recommendation. Verify multiple selected exercises are replaced and the substitutes reach the player with their authored media and expected timing. A new Padel priority should affect only upcoming eligible sessions and leave an unrelated calendar workout and the current phase intact. Test the equivalent general-training path.
4. **Add dated time off after the core flow is stable.** Check a range that crosses a week boundary, an important match during the range, edits to the return date after saving, and a pause near the block end. After reload, verify the calendar, activity history and renewal preferences agree.

**Validation checkpoint:** run the refinement, weekly adaptation, activity reconciliation and persistence unit tests, then run phone-width Playwright with keyboard navigation through the reason, review and confirmation screens. Include zero changes, blocked account writes, stale tabs and retry. In a short usability check, ask members to shorten the next week, change a recurring weekday and avoid a movement. Confirm they can say which dates and workouts will change before applying. The existing independent findings below remain open unless their acceptance checks are satisfied.

## Implemented in the reviewed working tree

Free setup offers balanced Padel or the detailed questionnaire, defaults to **Without dumbbells** and 10 minutes, and presents the first scheduled workout in the tab-scoped preview. Paid creation waits for account persistence and retains answers on failure. Active-block refinement previews changes, keeps the block identity and dates, and checks the saved block again before committing. The editor exposes the compatible catalog. Effort selection precedes the player, and weekly changes require a decision. The catalog audit records final selection examples across generated plans. [Onboarding](../src/components/plan/plan-onboarding.tsx) · [Preview](../src/components/plan/plan-page-access.tsx) · [Refinement](../src/domain/training-plan/refine-training-plan.ts) · [Coverage evidence](../docs/EXERCISE_REACHABILITY_AUDIT.md)

## Proposed follow-ups in priority order

### P1. Protect a revised block from an editor opened earlier

A member can leave an editor open, remove equipment through refinement in another tab, then save the older workout. The editor checks the draft against its mounted profile. Its save callback replaces a session in the hook’s in-memory plan and persists that whole plan. Besides restoring an incompatible exercise, this can undo an unrelated match or weekly decision. [Editor save](../src/components/plan/planned-workout-editor.tsx#L293) · [Plan updates](../src/hooks/use-training-plan.ts)

- [ ] At editor or Adapt Today commit, read the current block and compare the edited session with the original. Merge a compatible change into the latest block. If the session changed, was removed, or no longer fits, keep the draft visible and explain what changed. Only navigate after a successful save.
- [ ] In two tabs, save a future match in one and an unrelated exercise edit in the other. Reload both and verify both changes survived. Repeat with an equipment restriction affecting the open workout, then with a completed workout. Verify the old prescription cannot replace either.

### P1. Bind abandoned refinement answers to the version the member reviewed

Refinement stores a full profile under an account-only draft key. After a reload it gives that draft precedence over the current profile. A member who added a match in another tab can reopen an abandoned refinement, change only equipment, and submit an older match list. The stale-block guard compares with the current loaded block, so it cannot identify where the restored answers came from. The domain rebuild reads future matches from those answers. [Draft restore](../src/components/plan/plan-onboarding.tsx#L248) · [Match reconciliation](../src/domain/training-plan/refine-training-plan.ts)

- [ ] Store the source block ID and a copy or fingerprint of the source profile with the refinement draft. Restore it only against a compatible source. When the source changed, offer to restart from the current answers and retain the saved block until the member confirms.
- [ ] Abandon an equipment change, add an important future match elsewhere, then reload refinement. Confirm that saving equipment cannot remove the match or its recovery dates. Repeat after creating a new block in another tab and after reloading an unchanged block.

### P2. Verify the daily prescription at the point of use

The editor browser case now chooses the last compatible replacement and reaches its named movement and media container in the player. The member journey verifies exact remaining time after the paused snapshot receives account acknowledgement. In the mocked Pro journey, reloading immediately after pausing, before the debounced account write, restarted the workout and showed Pause instead of Resume. [Picker case](../tests/e2e/exercise-flow.spec.ts#L72) · [Refined workout journey](../tests/e2e/guest-plan-flow.spec.ts#L347)

- [ ] Preserve the local pause through an immediate full reload before account sync. Hold the account write in the browser test, reload, and verify Resume, the same phase and exact remaining time. If another device completed that session meanwhile, verify the older pause cannot reopen it or create another completion.
- [ ] Extend the replacement case to adapt that day and select effort. At the changed interval, assert its exact authored media asset, work and recovery times, and total budget. Verify completion and feedback refer to the same planned session.
- [ ] Include an important match and a pending weekly proposal in that fixture. Verify the unrelated session and match survive, a changed proposal is refreshed before acceptance, and decline survives reload. Reuse existing calendar and weekly test helpers. [Weekly decisions](../tests/e2e/weekly-adaptation.spec.ts) · [Match scheduling](../tests/e2e/weekly-match.spec.ts)

### P2. Exercise checkout recovery when account confirmation is ambiguous

The checkout fixture grants Pro before returning to setup. The persistence tests cover rejected writes and restoring the prior block. A server that commits a write before its response is lost can leave the server ahead of the local rollback. Reload and retry need a reproducible contract for that case. [Checkout fixture](../tests/e2e/subscription.spec.ts#L132) · [Sync and rollback](../src/services/persistence/user-storage.ts) · [Rollback tests](../src/services/persistence/user-storage.test.ts)

- [ ] Test a checkout return with delayed membership and a saved Free preview. Then simulate a committed plan PUT whose response is lost. On retry or reload, reconcile the acknowledged account block and show one schedule. Verify a truly rejected save still preserves the old block and answers. Keep provider verification in [launch readiness](../docs/LAUNCH_READINESS.md).

## Review evidence

I read the setup, checkout, refinement, plan persistence, editor, dashboard and weekly decision paths and their linked browser test definitions. I ran the refinement and user-storage Vitest files together. Both files passed, with 10 tests at review time. The linked Playwright scenarios were inspected as source in this review. Checkout and the refined-member journey use test doubles for billing or planning. This review did not exercise live billing, account infrastructure, hardware speech or media playback.

<details>
<summary>Archived original implementation proposal · 19 November 2026</summary>

# Full-catalog training plans and plan flow

Implementation proposal · 19 November 2026

## What success looks like

A player who chooses bodyweight, 10 minutes, and three training days a week can receive any movement that fits their equipment, constraints, and the purpose of a session. An old “beginner” profile must produce the same exercise choices as an otherwise identical “advanced” profile. Across the 60 days, the planner can draw on the full compatible catalog whenever it assembles another session. Repeating a movement is useful for practice and progression. A five-minute session still needs room for preparation, work, transitions, and recovery.

The acceptance target is **40 of 40 curated exercises demonstrated in actual generated plans across suitable profiles**. For each ID, record a reproducible example of a profile, week, session, and section where it survives final assembly. An exercise appearing in a candidate list, a manually edited session, or a fixed quick start does not establish that the planner schedules it. An individual athlete has no catalog-completion quota. Keep the 40 records, stable IDs, media, six genuinely weight-dependent exercises, and the existing optional-weight behavior.

## Starting point

The current working changes remove experience filtering from model candidate retrieval and deterministic assembly, remove a technique ceiling from duration fitting, drop the experience question from refinement, and retain the field for stored-profile compatibility. Keep those changes as the starting point. There are currently no advanced-labelled records, so synthetic advanced fixtures are still needed to exercise that case.

The [reachability audit](../docs/EXERCISE_REACHABILITY_AUDIT.md) reports candidate eligibility for all 40 and an **older** sample that scheduled 34. The six absent from that sample were Bodyweight Squat, Single-arm Dumbbell Row, Single-Arm Dumbbell Overhead Press, Plank Shoulder Tap, 90/90 Hip Switch, and Pogo Hop. Use them as initial diagnostics. The current post-change selection count needs a fresh measurement.

| Decision point | Existing behavior | Planned treatment |
| --- | --- | --- |
| Candidates offered to the model | Ranked main-section pool, with a retrieval ceiling of 100. The compiler requests up to 40 per section. | Neither number is below today’s catalog size. Check actual membership after all filters. Keep payload validation separate from the source of eligible IDs. |
| Exercises picked for one workout | Model proposes 2–4 main IDs per weekly template. Deterministic assembly initially targets 2, 4, or 5 main movements for 5, 10, or 20 minutes. Fitting and section assembly determine the final workout. | Preserve manageable timed sessions. Verify subsequent weeks can draw beyond the first week’s choices on both generation paths. |
| Rotation and support work | Assembly rotates ranked main candidates, accounts for recent choices, and reserves support exercises. Warm-up and cooldown have their own selection rules. | Measure the final three sections separately. A support movement can satisfy reachability in its authored support role. |
| Manual selection | The editor filters the list and renders the first 30 matches. The picker and save validation are separate decisions. | Make every compatible result discoverable and make the picker agree with save validation. Test both adding and replacing. |

## Implementation order and acceptance checks

### 1. Measure actual exercise use

- [ ] Extend the existing representative-profile evaluation. Fix the start date. Run the real deterministic generator for the existing 30 profiles and count distinct IDs in finalized warm-up, main, and cooldown items across the full 60 days. Record frequencies by ID and distinct IDs per block and per week. Keep the original 30-profile result comparable when adding targeted profiles.
- [ ] Compare candidate membership with final selection. For each missing ID, trace the first decision that removes it or consistently ranks it out. Check section reservation, focus assignments, equivalent movement patterns, template reuse, rotation, and duration fitting. Add a realistic profile when the original sample lacks the relevant equipment or focus. Use production inputs and catalogs for the 40-ID proof.
- [ ] Publish a compact result per ID in the reachability audit, including one reproducible selection example or the exact outstanding blocker. A missing row fails the coverage check. Keep synthetic technique fixtures and editor-only checks separate from this evidence.

Start in [planner evaluation](../src/domain/training-plan/planner-evaluation.test.ts), [evaluation profiles](../src/domain/training-plan/evaluation-profiles.ts), and [catalog eligibility tests](../src/domain/content/catalog-reachability.test.ts).

### 2. Correct selection where the measurement shows a gap

- [ ] For each genuine omission, add its failing production-path case first. Fix the narrow decision that causes it. If equally relevant choices repeatedly lose a tie, prefer a less-used compatible movement in later sessions, using block-local counts and a stable tie-break. Keep useful repetition for progression. Only change rotation where the evidence calls for it.
- [ ] Trace Free preview, Pro deterministic fallback, and compiled model intent through final assembly. Use validated model fixtures for repeatable tests. Check week two and later for access to exercises outside the original weekly template. Verify added items during fitting obey the same constraints as initial selections, including temporary avoidance and session focus. Verify displayed technique reflects the hardest movement in the final main workout after additions, removals, and replacements.
- [ ] Compare final exercise IDs for otherwise identical legacy experience values with fixed dates, model intent, and feedback. Exercise the existing advanced fixture. Verify bodyweight-only profiles exclude the six required-weight records, optional weights stay optional, and pain, environment, role, authored timing bounds, explosive caps, and recovery rules still hold. Surface an unsupported combination through the existing recovery flow.

**Checkpoint:** Publish the fresh baseline and resulting 40/40 evidence. Generate valid 5-, 10-, and 20-minute sessions within existing plan tolerances. Inspect one week of a broad plan and one narrowly focused plan for useful repetition and focus. Keep the fixed quick-start recipes and their exact timing contract.

Start in [assembly and fitting](../src/domain/training-plan/generate-training-plan.ts), [model compilation](../src/domain/training-plan/compile-model-workout.ts), [model-assisted planning](../src/domain/training-plan/model-assisted-planner.ts), and [section assembly](../src/domain/workout/session-sections.ts).

### 3. Carry eligibility through editing and daily use

- [ ] Remove silent truncation in the editor or supply an accessible way to reach remaining results. Use existing compatibility checks to filter or explain unavailable options. Search, browse, add, replace, save, reload, and start the workout with a compatible exercise near the end of the results. Use an expanded fixture if needed to exercise the 30-result boundary.
- [ ] Trace Adapt Today, weekly adjustment, and effort selection through their actual callers. A replacement can prefer a similar movement or an authored regression. Legacy playing experience must never remove a compatible replacement. Effort adjusts work and recovery within budget. Verify the chosen movement, timing, and media in the player.
- [ ] Use “technique” consistently when displaying exercise complexity, including the Plan card. Tell the user “Choose effort before you start.” Preserve in-player guidance cadence as a separate control. Remove remaining claims that playing level drives personalization.

Start in [plan editor](../src/components/plan/planned-workout-editor.tsx), [today adaptation](../src/domain/training-plan/today-adaptation.ts), [weekly adaptation](../src/domain/training-plan/weekly-adaptation.ts), and [dashboard](../src/components/plan/training-plan-dashboard.tsx).

### 4. Keep saved blocks trustworthy

- [ ] Decouple the legacy session-copy migration from the current planner version. Scope it to the old formats that require it. Load a v12 block twice and verify its generation metadata, dates, titles, prescriptions, edits, and original snapshots are preserved. Retain a fixture proving a genuinely older block still receives its intended migration.
- [ ] On Pro creation, validate and durably save the plan before clearing the questionnaire draft or navigating. Use the existing durable repository operation. If persistence fails, keep the answers, keep the previous active plan, and offer retry. Only show success after the saved plan can be read under the correct account. Ensure retry creates one active block and one schedule.
- [ ] Add a paid-flow browser regression that fails the plan write and then succeeds on retry. Keep the existing Free-preview retry and guest-to-account draft-transfer tests. Check the new plan survives navigation and reload.

Start in [plan persistence](../src/services/persistence/local-training-plan-repository.ts), [plan state](../src/hooks/use-training-plan.ts), and [onboarding submission](../src/components/plan/plan-onboarding.tsx).

### 5. Make refinement update the existing block

- [ ] Give refinement its own update path. Use the current block as the source and preserve its identity, start/end dates, completed and historical records, progress, and resumable workout. Change only eligible upcoming scheduled sessions inside those dates. Use the existing duration-change behavior as a reference. Frequency changes need date-based reconciliation because adding or removing a weekday changes session counts and ordering.
- [ ] Show the affected dates before saving. Preserve manual moves, session edits, match dates and importance wherever compatible. If a new restriction invalidates a future edit, identify the affected session and replacement before applying. Reconcile removed and added schedule entries without duplicating activities. Recheck the active block before commit so a stale tab cannot overwrite a newer edit. An impossible update leaves the saved block available.
- [ ] Expose equipment and current discomfort directly from refinement review for both sports. Return to review after editing an answer. Label the action **Update upcoming workouts**. Keep **Adapt today** scoped to one workout and weekly proposals subject to the existing accept/decline decision. Reserve **Build next 60 days** for a deliberate new block.

**Checkpoint:** Start in week three with a completed session, a paused session, a moved future session, an edited session, and a match. Change availability and equipment, review the affected dates, save, and reload. Verify progress, resume, retained edits, match protection, and the revised schedule. Repeat with an incompatible change and a stale tab. Check Settings duration changes and next-block creation separately.

Start in [refinement](../src/components/plan/plan-onboarding.tsx), [duration updates](../src/domain/training-plan/generate-training-plan.ts), [activity reconciliation](../src/services/persistence/local-workout-activity-repository.ts), and [progress](../src/domain/training-plan/plan-progress.ts).

### 6. Shorten first-time setup and show what the preview earned

- [ ] Default new users to bodyweight and keep saved equipment choices on return. Offer **Use balanced padel training** before the three detailed Padel screens. Preserve the detailed route, back navigation, saved draft, review editing, and general-training route. Keep schedule, equipment, and comfort visible on either path. Check that skippers can later add Padel priorities and that revisiting the shortcut handles existing selections explicitly.
- [ ] Tell guests before submission that an account is required to save the tab preview and Pro unlocks the schedule and guided sessions. Align entry-page, review, and success copy with the actual storage behavior for Free and Pro. Preserve answers through sign-in and checkout return.
- [ ] Show the preview’s first workout title, scheduled date, duration, and one reason linked to the user’s answers inside the membership dialog. Use a balanced-training explanation when no detailed priorities were selected. Add a clear route to the existing free workout. Keep paid actions gated. Adjust the focus-trap tests for the new link and verify the offer at phone width, by keyboard, and after reload.

Start in [onboarding](../src/components/plan/plan-onboarding.tsx), [preview access](../src/components/plan/plan-page-access.tsx), [membership dialog](../src/components/membership/paywall.tsx), and [preview browser tests](../tests/e2e/plan-preview-paywall.spec.ts).

### 7. Verify the whole journey and update the product record

- [ ] Update [product behavior](../PRODUCT.md), [UX flows](../UX_FLOWS.md), and the reachability audit in the same change as each behavior. Describe technique, effort, allowable constraints, observed catalog coverage, and the scope of refinement separately. Preserve earlier audit numbers as dated history.
- [ ] Run `npm test`, `npm run typecheck`, `npm run lint`, and `npm run build`. Run focused Playwright coverage for guest setup, preview/paywall, paid creation and retry, editing, plan progress, calendar, weekly adaptation, and player resume/completion. Add the missing end-to-end case that refines an active block and finishes a revised workout.
- [ ] Verify one phone-sized journey from shortcut setup through the offer, and one member journey from detailed setup through start, pause, resume, completion, feedback, and the next weekly decision. Record which services were mocked. Keep real provider, billing, and launch verification under the existing [launch readiness process](../docs/LAUNCH_READINESS.md).

**Delivery order:** Land measurement and the catalog correction first so their effect can be reviewed independently of UX changes. The migration and durable-save fixes can ship independently of editorial changes. Land block-preserving updates before exposing more refinement controls. The preview and setup improvements can follow without holding up full-catalog planning.

</details>
