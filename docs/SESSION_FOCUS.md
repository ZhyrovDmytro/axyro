# Focused session selection

Updated 2026-10-28, planner v12.

## Decision and evidence

A named focused session should spend its main work on its assigned development
areas and movement priorities. Balance the week rather than introducing unrelated
body areas to fill a session. This is a product rule, not a claim that mixed-body
training is inherently ineffective.

- [UKSCA: Planning an effective strength and conditioning programme, section 4.7](https://cdn.uksca.org.uk/assets/pdfs/UkscaIqPdfs/section-4-planning-an-effective-strength-and-conditioning-programme-637952036673729196.pdf)
  describes purposeful, goal-specific sessions and preparation guided by the
  session. Multiple objectives can be deliberately combined.
- [Fitbod: Training splits](https://fitbod.me/blog/your-gym-profile/)
  distinguishes full-body, upper/lower and push/pull/lower programming. A split
  organizes the work across sessions; trunk work can support different splits.
- [Canadian Strength and Conditioning Association: The warm-up](https://thecsca.ca/the-warm-up-more-than-just-preparation/)
  describes general activity followed by activation and mobilization relevant to
  the session. We apply that selection principle within our existing short-session
  budgets, not a claim that those budgets reproduce a full athletic RAMP protocol.

## Rules

- Existing structured questionnaire assignments define focus. Titles are display
  copy, never parsed to determine anatomy or safety.
- Deterministic main selection requires a matching development area or Padel
  priority when a slot has assignments. Unassigned slots remain general training;
  explicitly mixed assignments can produce mixed sessions. Profiles without sport
  movement-role metadata use broader physical-region matching for lower-body and
  arm development areas.
- Model selections outside their assigned focus are rejected with a repairable
  error. Existing retry/fallback behavior applies.
- Duration fitting cannot add a new upper/lower region absent from the main
  selection. Weekly variants use the same assigned focus. Small relevant pools
  may produce fewer distinct movements and repeat lineups across weeks; safety,
  authored timing limits and session purpose take precedence over variety.
- Preparation and recovery use relevant low-intensity exercises. General easy
  marching is allowed, especially when no specific option is compatible. Lower-body
  sessions do not acquire dedicated shoulder mobility. Core sessions may use
  upper-back rotation; this is not treated as a shoulder strength prescription.
- Existing 90/90 Hip Switch, Open-book Rotation and Thread the Needle records gain
  support roles. Easy Dynamic Court March can also close a session. Relevant
  cooldowns rank above generic marching. Support movements are reserved from
  deterministic main selection so its only recovery option is not consumed.
- Support timing includes both sides and the side transition where applicable.
  The catalog remains exactly 40 records with unchanged IDs and media paths.

## Existing plans and verification

Newly generated plans use this policy. Saved plans are not silently rewritten:
regenerate the plan to replace an older exercise mix. Completed workouts, edits,
and history remain intact. The copy migration updates generic upcoming titles to supported padel benefits
(or body-area titles), preserving custom names and completed sessions. A title
requires at least half the main work time to support the named priority/area,
or at least one fifth for a priority trained by a core movement with foundation
work alongside it. These are product naming thresholds, not training-dose claims.
Explicitly unassigned slots keep general training-quality names. The copy
migration is not an exercise migration.

Regression coverage exercises calf/net-approach and shoulder slots across the
60-day schedule at 5, 10 and 20 minutes, model compilation with duration expansion,
off-focus model rejection, and explicitly mixed sessions. The full suite also
checks the 30 representative profiles, pain/equipment restrictions, timing,
progression and persistence. Live model quality still depends on its responses;
the deterministic rejection boundary does not require trusting the prompt.
