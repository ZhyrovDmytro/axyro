# Exercise reachability audit

Audited all 40 curated exercises on 2026-10-23. All 40 pass plan eligibility and can enter at least one planner section with a compatible profile and environment. The plan editor can also select compatible exercises. This is eligibility, not a promise that every exercise will appear in a particular plan.

The historical sample below predates the 2026-11-18 eligibility correction. The six public quick-start workouts contain 19 distinct exercises. A sample of 30 representative athlete profiles uses 34 distinct exercises across generated plans. That historical selection depended on goal, experience, pain restrictions, equipment, available space and duration. Current planning no longer filters by experience. Exercises outside the fixed quick starts remain available to planning; those fixed recipes do not provide full catalog coverage.

Required equipment and optional resistance are separate fields. Six exercises support empty hands with optional dumbbells. Six retain required dumbbells because their authored purpose depends on resistance or grip loading. Prone Y Raise previously mixed no equipment and a dumbbell in its required list, accidentally excluding bodyweight-only profiles; this is fixed. Optional resistance does not imply the same training load as weighted execution.

“Sample plan” means observed in these 30 generated profiles, not exhaustive reachability. “Planner” is checked across warm-up, main and cooldown candidates with unrestricted experience, equipment and environment.

| Exercise                                  | Public quick start | Sample plan | Planner | Dumbbells |
| ----------------------------------------- | ------------------ | ----------- | ------- | --------- |
| Lateral Weight Shift                      | —                  | Yes         | Yes     | Not used  |
| Dynamic Court March                       | —                  | Yes         | Yes     | Not used  |
| Bodyweight Squat                          | Yes                | —           | Yes     | Not used  |
| Reverse Lunge                             | Yes                | Yes         | Yes     | Not used  |
| Dead Bug                                  | Yes                | Yes         | Yes     | Not used  |
| Single-arm Dumbbell Row                   | Yes                | —           | Yes     | Required  |
| Standing Dumbbell Wood Chop               | Yes                | Yes         | Yes     | Optional  |
| Side Plank with Rotation                  | Yes                | Yes         | Yes     | Not used  |
| Bird Dog                                  | Yes                | Yes         | Yes     | Not used  |
| Scapular Push-Up                          | Yes                | Yes         | Yes     | Not used  |
| Side-Lying Dumbbell External Rotation     | Yes                | Yes         | Yes     | Optional  |
| Prone Y Raise                             | —                  | Yes         | Yes     | Optional  |
| Single-Arm Dumbbell Overhead Press        | —                  | —           | Yes     | Required  |
| Plank Shoulder Tap                        | —                  | —           | Yes     | Not used  |
| Push-Up Plus                              | —                  | Yes         | Yes     | Not used  |
| Single-Arm Prone Shoulder Arc             | Yes                | Yes         | Yes     | Optional  |
| Prone Overhead Shoulder Press             | Yes                | Yes         | Yes     | Optional  |
| Prone Shoulder Internal/External Rotation | Yes                | Yes         | Yes     | Optional  |
| Dumbbell Romanian Deadlift                | —                  | Yes         | Yes     | Required  |
| Bodyweight Hip Hinge                      | —                  | Yes         | Yes     | Not used  |
| Split Squat                               | —                  | Yes         | Yes     | Not used  |
| Lateral Lunge                             | —                  | Yes         | Yes     | Not used  |
| Wall Acceleration March                   | —                  | Yes         | Yes     | Not used  |
| Lateral Step and Stick                    | —                  | Yes         | Yes     | Not used  |
| Single-leg Calf Raise                     | Yes                | Yes         | Yes     | Not used  |
| Dumbbell Forearm Rotation                 | Yes                | Yes         | Yes     | Required  |
| Dumbbell Wrist Extension                  | Yes                | Yes         | Yes     | Required  |
| 90/90 Hip Switch                          | —                  | —           | Yes     | Not used  |
| Open-book Rotation                        | —                  | Yes         | Yes     | Not used  |
| Fast Feet Step                            | —                  | Yes         | Yes     | Not used  |
| Side-to-Side Line Hops                    | —                  | Yes         | Yes     | Not used  |
| Bent-Knee Soleus Raise                    | Yes                | Yes         | Yes     | Not used  |
| Glute Bridge March                        | —                  | Yes         | Yes     | Not used  |
| Fire Hydrant                              | —                  | Yes         | Yes     | Not used  |
| Wall Slide with Lift-Off                  | Yes                | Yes         | Yes     | Not used  |
| Thread the Needle                         | Yes                | Yes         | Yes     | Not used  |
| Suitcase March                            | —                  | Yes         | Yes     | Required  |
| Squat Jump and Stick                      | —                  | Yes         | Yes     | Not used  |
| Pogo Hop                                  | Yes                | —           | Yes     | Not used  |
| Intermittent Lateral Shuffle              | —                  | Yes         | Yes     | Not used  |

Optional-weight guidance appears on exercise cards, exercise guides and the current exercise in the player. Workout summaries distinguish an entirely optional-weight session from one containing a required-weight movement.

## All-level eligibility correction — 2026-11-18

Exercise technique labels and stored playing experience no longer exclude or penalize exercises during plan creation. This applies to model candidate retrieval (with the same hard compatibility checks used by model compilation and the plan editor), deterministic main-workout assembly, and duration fitting. Candidates can include beginner, intermediate and advanced techniques. Workout technique describes the hardest exercise in the assembled main section.

The refine questionnaire no longer asks for playing experience, and the AI planning brief no longer sends the legacy profile default as an answered question. The stored experience field remains readable for compatibility with existing profiles and plans; it has no effect on exercise eligibility or ranking. AI instructions explicitly prohibit assuming beginner ability or excluding exercises by technique label.

All 40 current exercises remain eligible with compatible constraints. Equipment, pain, temporary exercise avoidance, environment, section roles, focus assignments and authored timing bounds still constrain selection. All 34 exercises without required weights are reachable across planner sections without dumbbells. The six required-weight records remain Single-arm Dumbbell Row, Single-Arm Dumbbell Overhead Press, Dumbbell Romanian Deadlift, Dumbbell Forearm Rotation, Dumbbell Wrist Extension and Suitcase March. Their current prescriptions depend on loading; they have not been reclassified as empty-hand versions.

Eligibility does not guarantee selection: goals, session focus, rotation, recovery roles and the time budget choose a subset. User-selected effort changes work/recovery within the session budget. Existing Adapt Today and feedback-driven weekly adjustments remain responsible for subsequent changes; no automatic experience classification or new progression system is introduced. Existing saved plans are preserved; the correction applies to newly selected or rebuilt sessions.

Regression tests cover the real 40-record catalog, advanced-technique fixtures for all three stored experience values in deterministic assembly and model compilation, removal of the legacy default from the AI brief, duration fitting across technique labels, and continued enforcement of pain/equipment/environment constraints. There are currently no advanced-labelled records in the curated catalog.

## Finalized plan coverage — 2026-11-19

The post-eligibility baseline and the final deterministic generator each scheduled **40 of 40** exercises across the same 30 representative profiles. All six omissions in the historical sample appeared in the fresh baseline. No rotation changes or additional profiles were needed. Narrow sessions retain their main focus, with compatible same-region work used for duration fitting where needed. Later weeks can select outside the initial templates. Every representative session passed hard constraints and its configured duration tolerance.

Each example uses the one-based profile index in [evaluation-profiles.ts](../src/domain/training-plan/evaluation-profiles.ts) and starts the block on 2026-09-28 in local time. The date identifies the scheduled session. Counts cover all item appearances across the finalized warm-up, main and cooldown sections in the 60-day block. A movement can appear in more than one section over the evaluation.

Reproduce with `REPORT_PLANNER_COVERAGE=1 npm test -- src/domain/training-plan/planner-evaluation.test.ts --silent=false`.

| Stable exercise ID                                 | Baseline appearances | Final warm-up / main / cooldown | Final profile, week, date and section |
| -------------------------------------------------- | -------------------: | ------------------------------- | ------------------------------------- |
| bent-knee-soleus-raise                             |                  132 | 0 / 132 / 0                     | P2, W3, 2026-10-17, main              |
| bird-dog                                           |                  101 | 0 / 101 / 0                     | P1, W1, 2026-09-30, main              |
| bodyweight-hip-hinge                               |                   63 | 0 / 63 / 0                      | P2, W1, 2026-10-03, main              |
| bodyweight-squat                                   |                   38 | 0 / 38 / 0                      | P2, W3, 2026-10-17, main              |
| dead-bug                                           |                  107 | 0 / 107 / 0                     | P1, W1, 2026-10-02, main              |
| dumbbell-pronation-supination                      |                   57 | 0 / 57 / 0                      | P2, W2, 2026-10-10, main              |
| dumbbell-romanian-deadlift                         |                   17 | 0 / 17 / 0                      | P3, W7, 2026-11-13, main              |
| dumbbell-wrist-extension                           |                   15 | 0 / 15 / 0                      | P2, W1, 2026-10-03, main              |
| dynamic-court-march                                |                  289 | 289 / 0 / 0                     | P2, W1, 2026-09-29, warmup            |
| fast-feet-step                                     |                   84 | 0 / 84 / 0                      | P2, W2, 2026-10-10, main              |
| glute-bridge-march                                 |                  168 | 0 / 168 / 0                     | P1, W2, 2026-10-05, main              |
| intermittent-lateral-shuffle                       |                  223 | 0 / 223 / 0                     | P2, W1, 2026-09-29, main              |
| lateral-lunge                                      |                  133 | 0 / 133 / 0                     | P2, W1, 2026-09-29, main              |
| lateral-stick                                      |                   94 | 0 / 94 / 0                      | P3, W1, 2026-09-30, main              |
| lateral-weight-shift                               |                  690 | 353 / 0 / 337                   | P2, W1, 2026-09-29, warmup            |
| ninety-ninety-hip-switch                           |                  207 | 132 / 0 / 75                    | P2, W1, 2026-10-03, warmup            |
| open-book-rotation                                 |                  601 | 293 / 0 / 308                   | P1, W1, 2026-09-28, warmup            |
| plank-shoulder-tap                                 |                   78 | 0 / 78 / 0                      | P1, W2, 2026-10-07, main              |
| pogo-hop                                           |                   63 | 0 / 63 / 0                      | P2, W4, 2026-10-24, main              |
| prone-foam-roller-overhead-shoulder-press          |                  123 | 0 / 123 / 0                     | P1, W1, 2026-09-28, main              |
| prone-foam-roller-plate-internal-external-rotation |                   72 | 0 / 72 / 0                      | P1, W3, 2026-10-16, main              |
| prone-y-raise                                      |                   95 | 0 / 95 / 0                      | P1, W3, 2026-10-16, main              |
| push-up-plus                                       |                   95 | 0 / 95 / 0                      | P1, W3, 2026-10-16, main              |
| reverse-lunge                                      |                   68 | 0 / 68 / 0                      | P2, W7, 2026-11-14, main              |
| scapular-push-up                                   |                   13 | 0 / 13 / 0                      | P1, W1, 2026-09-28, main              |
| short-lever-copenhagen-hold                        |                   62 | 0 / 62 / 0                      | P2, W7, 2026-11-14, main              |
| side-lying-db-external-rotation                    |                   86 | 0 / 86 / 0                      | P1, W5, 2026-10-30, main              |
| side-plank-rotation                                |                   46 | 0 / 46 / 0                      | P1, W7, 2026-11-13, main              |
| single-arm-prone-plate-over-obstacle               |                   37 | 0 / 37 / 0                      | P1, W1, 2026-09-28, main              |
| single-arm-row                                     |                   36 | 0 / 36 / 0                      | P5, W3, 2026-10-16, main              |
| single-leg-calf-raise                              |                   32 | 0 / 32 / 0                      | P2, W1, 2026-10-03, main              |
| split-stance-acceleration-march                    |                   23 | 0 / 23 / 0                      | P3, W2, 2026-10-07, main              |
| split-step-lateral-drive                           |                   71 | 0 / 71 / 0                      | P3, W1, 2026-09-30, main              |
| squat-jump-stick                                   |                   90 | 0 / 90 / 0                      | P3, W1, 2026-09-30, main              |
| standing-dumbbell-wood-chop                        |                   63 | 0 / 63 / 0                      | P1, W7, 2026-11-13, main              |
| standing-single-arm-db-overhead-press              |                   28 | 0 / 28 / 0                      | P3, W8, 2026-11-18, main              |
| suitcase-march                                     |                   57 | 0 / 57 / 0                      | P3, W1, 2026-09-28, main              |
| supported-split-squat                              |                   61 | 0 / 61 / 0                      | P4, W1, 2026-09-29, main              |
| thread-the-needle                                  |                  327 | 187 / 0 / 140                   | P2, W7, 2026-11-14, warmup            |
| wall-slide-lift-off                                |                   36 | 36 / 0 / 0                      | P3, W1, 2026-09-28, warmup            |

### Final rotation by profile

| Profile | Distinct exercises across block | Distinct exercises in weeks 1 through 9 |
| ------- | ------------------------------: | --------------------------------------- |
| P1      |                              14 | 6, 5, 8, 8, 8, 8, 7, 7, 5               |
| P2      |                              21 | 9, 7, 8, 7, 9, 9, 9, 9, 4               |
| P3      |                              30 | 18, 18, 19, 18, 18, 20, 20, 18, 18      |
| P4      |                              20 | 5, 6, 7, 7, 5, 6, 4, 6, 3               |
| P5      |                              24 | 11, 12, 13, 12, 13, 13, 15, 14, 10      |
| P6      |                              25 | 10, 13, 13, 13, 13, 13, 14, 13, 9       |
| P7      |                              15 | 8, 7, 7, 6, 8, 9, 8, 7, 6               |
| P8      |                              17 | 10, 10, 10, 9, 10, 9, 9, 8, 6           |
| P9      |                              31 | 18, 16, 18, 16, 19, 17, 19, 17, 16      |
| P10     |                              16 | 6, 7, 6, 6, 6, 7, 6, 8, 4               |
| P11     |                              23 | 10, 8, 12, 10, 11, 12, 15, 14, 12       |
| P12     |                              20 | 9, 13, 11, 13, 13, 13, 13, 14, 8        |
| P13     |                              17 | 7, 8, 10, 8, 9, 7, 7, 8, 7              |
| P14     |                              27 | 13, 12, 11, 12, 11, 11, 11, 10, 6       |
| P15     |                              22 | 15, 14, 18, 14, 16, 14, 15, 13, 11      |
| P16     |                              15 | 5, 4, 7, 6, 6, 6, 6, 6, 4               |
| P17     |                              23 | 10, 7, 10, 9, 12, 11, 12, 13, 10        |
| P18     |                              27 | 17, 15, 18, 15, 15, 16, 17, 14, 9       |
| P19     |                              20 | 6, 8, 9, 7, 5, 7, 5, 7, 6               |
| P20     |                              23 | 10, 9, 9, 10, 10, 10, 10, 10, 4         |
| P21     |                              27 | 12, 14, 15, 13, 16, 15, 15, 16, 15      |
| P22     |                              13 | 6, 6, 5, 5, 5, 5, 6, 6, 4               |
| P23     |                              20 | 8, 10, 12, 9, 12, 10, 11, 12, 10        |
| P24     |                              29 | 17, 16, 16, 15, 17, 16, 17, 14, 10      |
| P25     |                              18 | 7, 8, 9, 8, 9, 9, 10, 10, 6             |
| P26     |                              21 | 7, 7, 8, 8, 9, 11, 12, 12, 6            |
| P27     |                              25 | 16, 13, 18, 12, 18, 12, 17, 17, 15      |
| P28     |                              17 | 5, 7, 7, 6, 6, 6, 6, 6, 3               |
| P29     |                              21 | 12, 11, 14, 10, 11, 10, 11, 11, 8       |
| P30     |                              29 | 16, 17, 16, 17, 17, 17, 17, 17, 9       |

P3’s opening week uses rotation in all three sessions, adds core control in the first, then repeats acceleration and lateral work across the other two. P6’s general-training week repeats weight transfer and strength patterns across its two sessions and varies the trunk and shoulder movements. The coverage check does not require a single athlete to perform every compatible movement.
