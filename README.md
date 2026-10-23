# Axyro

Source repository: [ZhyrovDmytro/axyro](https://github.com/ZhyrovDmytro/axyro).
Legacy storage identifiers remain compatible with existing saved data; see the
[naming decision](DECISIONS.md#2026-10-24--axyro-product-name).

> Current account/subscription extension: see [Membership implementation](docs/MEMBERSHIP_IMPLEMENTATION.md), [Authentication](docs/AUTHENTICATION.md), [Billing](docs/billing.md), and [Multi-user data](docs/MULTI_USER_DATA_ARCHITECTURE.md). These replace earlier local-only/no-account scope statements below. Guest access is the single free starter; personalized plans and full access require Pro.


Codex-ready product and architecture documentation for a mobile-first guided home workout web application.

## Product idea
Users choose a predefined workout and follow it exercise-by-exercise. Every movement can include a short looping reference video, instructions, timed work/rest intervals, and optional spoken tempo guidance such as `1 — 2 — 1 — 2`.

The first version targets workouts that can be performed at home with bodyweight, one/two light dumbbells, and simple household objects where needed.

Bundled third-party reference-image attribution is documented in
[`MEDIA_CREDITS.md`](MEDIA_CREDITS.md).

## Documentation
- [Paid public launch tracker](docs/LAUNCH_READINESS.md) — release blockers, completion criteria, progress and verification evidence. Update this checklist as launch work is completed.
- `AGENTS.md` — primary implementation instructions for Codex/agents.
- `PRODUCT.md` — product scope, users, MVP and future direction.
- `ARCHITECTURE.md` — recommended technical architecture.
- `DATA_MODEL.md` — exercise/workout/session data structures.
- `IMPLEMENTATION_PLAN.md` — phased build plan.
- `UX_FLOWS.md` — core user flows and screen behavior.
- `DECISIONS.md` — explicit architectural/product decisions and open questions.
- `PRIVACY.md` — current data inventory, purpose, retention and SDK/network audit.

## Current experience

- 40 curated home-training exercises across all body areas, including three prone shoulder movements performed without equipment or with optional light dumbbells.
- Bodyweight and optional dumbbells; floor, wall and household chair support remain available.
- Six quick-start workouts default to exactly 10 minutes, with 5- and 20-minute choices.
- Personalized plans default to 10 minutes and include warm-up, main work and cooldown within the documented 10% tolerance.
- All seven GIFs and three videos are retained. See [the content review](docs/DAILY_TEN_CONTENT_REVIEW.md) for the reference comparison and retirement list.

## Development

```bash
npm install
npm run dev
```

The AI-assisted planner is optional and disabled by default. Copy `.env.example`
to `.env.local`, add a server-only `OPENAI_API_KEY`, and set
`AI_PLANNER_ENABLED=true` to enable it. Never use a `NEXT_PUBLIC_` variable for
the key. Without the flag or key, the same route returns a validated
deterministic plan.

Quality checks:

```bash
npm run typecheck
npm run lint
npm test
npm run test:e2e
npm run build
```

The daily-duration update supersedes the original shoulder-only catalog milestone.
Content, timing, progress, pause/resume, and cadence remain deterministic and
validated. No competitor media was copied.
