# Future capability: guided movement assessment

## Status

Deferred beyond the MVP. Preserve this concept for later specification and
validation; do not include it in the current onboarding or plan-generation
scope.

## Purpose

Add a short, optional baseline that complements the athlete's questionnaire
answers with simple repeatable movement checks. The assessment would help Axyro
choose training emphasis and later show progress without presenting itself as a
medical evaluation or automated technique coach.

The questionnaire remains the athlete's primary statement of goals, perceived
weaknesses, schedule, equipment and current discomfort. Movement-check results
would provide supporting evidence rather than override those answers.

## Proposed experience

The assessment should be camera-free in its first version and take roughly six
to eight minutes:

1. Show a short movement demonstration.
2. Give one concise setup instruction.
3. Run a timer or explain a simple range check.
4. Ask the athlete to select the result that best matches the attempt.
5. Stop the check if the movement causes pain.

Avoid pass/fail labels. Results should describe what the athlete observed, such
as comfortable, limited, asymmetric, unstable or painful.

## Candidate checks

| Check                    | Athlete action                                          | Potential observation                                |
| ------------------------ | ------------------------------------------------------- | ---------------------------------------------------- |
| Overhead reach           | Stand against a wall and raise both arms overhead       | Comfortable, limited, asymmetric or painful          |
| Seated trunk rotation    | Rotate left and right without moving the hips           | Similar, left limited, right limited or both limited |
| Single-leg balance       | Hold each side for up to 30 seconds                     | Time held and left/right difference                  |
| Controlled squat         | Perform several slow bodyweight squats                  | Comfortable, unstable, limited depth or painful      |
| Knee-to-wall ankle check | Move the knee toward a wall while keeping the heel down | Comfortable distance or left/right limitation        |
| Lateral movement check   | Perform a short controlled side-to-side pattern         | Comfortable, slow/unstable or painful                |

The final check set requires content and safety review before implementation.

## Plan impact

- A reported limitation may increase the weekly emphasis for related capacity
  work.
- A meaningful left/right difference may favor suitable unilateral exercises.
- Comfortable results should not remove the balanced padel foundation.
- Self-reported goals and weaknesses remain meaningful inputs.
- Pain is a protective signal, not a development goal. It must use the existing
  discomfort safety path rather than generate a corrective prescription.
- The UI should explain the connection in plain language, for example: “Your
  overhead reach felt limited, so your plan includes additional shoulder and
  upper-back capacity work.”

## Progress reviews

If this capability is introduced, repeat the same checks around day 30 and day 60. Combine the repeatable results with brief self-reported on-court outcomes,
such as:

- shoulder tolerance during overhead-heavy games;
- lateral movement and recovery confidence;
- late-match fatigue;
- post-match discomfort becoming better, unchanged or worse.

Progress should be presented as comparisons, not diagnoses or guarantees:

- `Single-leg balance: 18 sec -> 27 sec`
- `Overhead reach: limited -> comfortable`
- `Post-match shoulder fatigue: often -> sometimes`
- `Lateral confidence: 2/5 -> 4/5`

## Safety and product boundaries

- Do not diagnose injuries or infer their cause.
- Do not claim that an exercise will treat pain or prevent every injury.
- Do not use camera-based form scoring in the first version.
- Do not silently treat missing or skipped checks as poor performance.
- Persistent, severe or unexplained pain should direct the athlete to an
  appropriate qualified professional.
- Assessment results must be optional, locally persisted under the established
  repository boundary, and removable through the existing privacy controls.

## Questions to resolve before implementation

1. Which checks are reliable enough for unsupervised home use?
2. Which checks should be required, optional or omitted for a reported pain
   area?
3. What result vocabulary is easiest for athletes to judge consistently?
4. How strongly may a result change exercise ranking and weekly volume?
5. Should day-30 reassessment adjust the active plan automatically, propose a
   review, or only record progress?

## Current product boundary

This remains deferred. The current product uses a 48-exercise catalog and a
10-minute daily default with 5/20-minute alternatives. Any future assessment
must respect that time and home-equipment scope; it does not justify adding
assessment work to today's workout budget without an explicit product decision.
