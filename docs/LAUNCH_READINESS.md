# Paid public launch tracker

Last updated: 2026-10-24 (Europe/Prague).

This is the shared checklist for launching Axyro as a paid public web app.
Current verdict: **not ready to accept public payments**. Core membership code
exists; production configuration, legal completion and external verification
remain open. EU legal items depend on the operator and target markets; confirm
the applicable requirements before launch.

## How to track progress

- Keep the task IDs stable so future chats can refer to them.
- `[ ]` means open; `[x]` means the completion criteria have been verified.
- Status is **Open**, **Partial**, **Unverified**, or **Done**. Partial means some
  implementation exists; Unverified means external setup/evidence is missing.
- When working on an item, record an owner if assigned, the date, remaining work
  and evidence here. Do not mark provider integrations done from mocked tests.
- Record decisions and evidence without credentials, tokens or personal data.
- Update this document in the same change that advances a launch task. Recheck
  dated audit findings rather than assuming they still describe the current code.
- A task may be marked not applicable only with a dated reason and an explicit
  product/legal decision where needed.

No owners or target dates have been assigned yet.

## Existing implementation

| Area      | Implemented foundation                                                 | Remaining boundary                                                |
| --------- | ---------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Paywall   | Free/Pro gates, upgrade screens, monthly/yearly price selection        | Actual products and deployed purchase verification                |
| Billing   | Stripe Checkout, signed webhooks, reconciliation, Customer Portal      | Merchant setup, live configuration, real lifecycle testing        |
| Accounts  | Supabase integration, email/password, Google OAuth, recovery, deletion | Production project, email delivery, provider configuration        |
| User data | Account-scoped cache, synchronization, SQL access policies             | Hosted migrations, isolation and backup verification              |
| Legal     | `/privacy` and `/terms` drafts                                         | Business-specific disclosures and applicable legal review         |
| Training  | Library, player, plans, history and settings                           | Final device, accessibility, media and performance release checks |

## Required before accepting payments

- [x] **L01 — Dependency security** · Done
  - Baseline: production dependency audit reported Next.js critical and Zod high
    severity advisories for the installed versions. This is an affected-version
    finding, not proof of an exploitable application path.
  - Complete when: dependencies are patched, the audit is rerun, remaining
    findings are resolved or assessed with evidence, and regression checks pass.
  - 2026-10-23 progress: updated Next.js and matching ESLint config from 16.3.8
    to 16.4.1, Zod from 4.6.5 to 4.6.6, and Vitest/coverage from 5.0.2 to 5.0.3.
    The refreshed full audit also identified test-tooling issues; the lockfile
    now resolves Vite 8.3.5. Both full and production-only audits report zero
    known vulnerabilities. No package paths or installation scripts were added.
    Installs used `--ignore-scripts`; a clean `npm ci --ignore-scripts` in a
    temporary directory passed. All 368 unit tests, TypeScript and webpack
    production build pass; lint has zero errors and the existing 188 warnings.
    All 89 Playwright browser tests passed. Package and lockfile changes were
    reviewed against the pre-update copies. Re-audit before the eventual launch;
    this closes the dependency findings as of this date, not every security task.
  - Reviewed upstream release notes:
    [Next.js 16.4.1](https://github.com/vercel/next.js/releases/tag/v16.4.1),
    [Zod 4.6.6](https://github.com/colinhacks/zod/releases/tag/v4.6.6),
    [Vitest 5.0.3](https://github.com/vitest-dev/vitest/releases/tag/v5.0.3),
    [Vite security fixes](https://github.com/vitejs/vite/releases/tag/v8.3.3).

- [x] **L02 — Source control and deployment source** · Done
  - Baseline: this checkout had no commits or configured remote.
  - Complete when: reviewed application source is committed and backed by a
    remote; secrets, build output and temporary assets are excluded appropriately.
  - 2026-10-24: owner supplied `https://github.com/ZhyrovDmytro/axyro.git` and
    selected Axyro as the product name. `origin` is configured; the remote had no
    branches at inspection. Local tooling and generated reference/review files
    are excluded from source control. Initial source commit `19e3d3f` and tracker
    commit `a2198fe` were pushed successfully using the owner-supplied SSH remote
    `git@github.com:ZhyrovDmytro/axyro.git`. Verified remote `main` at `a2198fe`;
    local `main` tracks `origin/main`. This resolves the earlier HTTPS credential
    blocker. Hosting remains open under L03.

- [ ] **L03 — Hosting, domain and environments** · Partial
  - Complete when: staging and production are deployed; domain, DNS, HTTPS,
    canonical `APP_URL` and server secrets are configured; deployed routes work.
    No connected deployment was verified during the audit.
  - 2026-10-24: owner selected Netlify, starting on Free. Committed build
    configuration uses Node.js 24 and the verified webpack build path. See
    [deployment instructions](NETLIFY_DEPLOYMENT.md). First deployment is live at
    [axyro-training.netlify.app](https://axyro-training.netlify.app/), connected to
    GitHub `main`; deploy `6adccab4e4301aaaa1a5b8b8` published source `6322cad`.
    `axyro` was unavailable, so the preview project is named `axyro-training`.
    Configured `APP_URL=https://axyro-training.netlify.app` and
    `AI_PLANNER_ENABLED=false`. Verified the existing team Free plan is $0 with
    no payment method; its dashboard lists legacy allowances of 300 build minutes
    and 100 GB bandwidth, rather than the current advertised credit model.
  - Live checks: guest home/library preview, free-workout count-in and media,
    mute, pause/resume, skip into recovery and save/exit work. Auth/billing APIs
    return JSON; development admin is disabled, auth is unconfigured, Pro is
    false and products are empty. Paywall shows the unavailable-billing fallback.
    A full timed workout completion, real devices, provider flows and rollback
    remain unverified. One MutationObserver console exception was observed;
    source was not attributed (no corresponding app source reference found).
  - L03 remains partial: separate staging/production environments, custom domain
    decision, provider runtime secrets and remaining deployed checks are pending.

- [ ] **L04 — Production database and backups** · Partial
  - Baseline: four SQL migrations exist in `supabase/migrations`; hosted setup
    was not verified and local Supabase environment variables were absent.
  - Complete when: migrations are applied in order, real-account access isolation
    is tested, region/retention are chosen, backups are configured and a restore
    procedure is tested. See [user data architecture](MULTI_USER_DATA_ARCHITECTURE.md).

  - 2026-10-24 account check via connected Supabase tools: organization
    `ZhyrovDmytro's org` (`wldmraxmhldflwkovyzr`) is on Free. One project is
    originally listed: `ZhyrovDmytro's Project`, active/healthy in `eu-west-1`.
    After owner approval, Supabase quoted $0/month and created **Axyro**
    (`unrlqkymbdnpmgmmfltb`) in Frankfurt (`eu-central-1`), active/healthy.
    The existing project was not modified. The four existing migrations were
    applied to Axyro, followed by `restrict_profile_trigger_execution` to revoke
    default anon/authenticated access to the internal signup trigger function.
    Verified all three tables have RLS enabled; direct function privileges are
    false; security advisors report no findings. A rolled-back signup test
    verified profile creation and that metadata cannot assign an admin role.
    Netlify credentials, provider configuration, real-account isolation and
    backup/restore work remain pending. See [Supabase setup](SUPABASE_SETUP.md).

- [ ] **L05 — Production authentication and email** · Partial
  - 2026-10-24: saved and verified the deployed Site URL and exact auth callback.
    Email signup/confirmation are enabled, anonymous sign-in is disabled;
    custom SMTP and Google OAuth remain disabled. Added tested modern Supabase
    API-key support with legacy fallbacks. Netlify project URL and production-only
    publishable key are saved; privileged secret access was approved and the
    production-only `SUPABASE_SECRET_KEY` is now protected in Netlify. Preview,
    branch, agent and local values are empty. Modern-key compatibility passed
    373 unit tests, 7 account/subscription browser tests, TypeScript, lint and
    the webpack production build. Netlify published `02570c3` successfully as
    deploy `6add1c720fca4fde9c5a0bce`; live auth session reports configured and
    development admin disabled. A nonexistent-account browser login reached
    Supabase Auth and returned expected invalid credentials (confirmed in Auth
    logs). No account/email was created/sent. Real-user email, isolation,
    privileged deletion and Google flows remain unverified; custom SMTP is next.
  - Complete when: Supabase email confirmation, SMTP, sender-domain authentication,
    redirect allowlists, Google OAuth and provider abuse limits are configured;
    real signup, verification, recovery, logout and deletion succeed. Confirm
    development admin login is unavailable in production.
    See [authentication operations](AUTHENTICATION.md).

- [ ] **L06 — Stripe merchant and subscription setup** · Partial
  - Baseline: billing code exists; local Stripe environment variables were absent.
  - Complete when: merchant verification/payouts, recurring prices, environment
    keys, webhook subscriptions and Customer Portal are configured for launch.
    Configure cancellation and payment-method management. See [billing](billing.md).

- [ ] **L07 — Pricing, tax and commercial rules** · Open
  - Complete when: price/currency/annual billing decisions, applicable VAT/tax,
    invoices/receipts, refunds, failed payments and cancellation rules are
    documented and reflected in checkout/provider settings. The audited Checkout
    request does not enable automatic tax collection; explicitly decide and
    implement applicable tax handling.

- [ ] **L08 — Real payment lifecycle verification** · Unverified
  - Complete when: real Stripe test-mode purchase → signed webhook → trusted Pro
    access works on staging, including checkout continuation, cancellation,
    failed payment, renewal, expiration, webhook retry, duplicate clicks and
    account deletion. Verify production configuration separately before opening
    sales. Mocked browser tests do not satisfy this item.

- [ ] **L09 — Publishable privacy policy** · Partial
  - Complete when: the notice names the operator/contact and covers purposes,
    legal bases, actual retention/backup deletion, processors, transfers, rights
    and complaint routes as applicable. Publish effective/version dates and
    ensure the notice matches actual hosting, auth, billing and optional AI use.
    Current source: `src/app/privacy/page.tsx`.

- [ ] **L10 — Discomfort/pain data and optional AI processing** · Open
  - Complete when: assess whether collected discomfort/pain information is health
    data; establish the applicable processing condition and any consent,
    withdrawal and sharing controls. Verify the treatment of these fields before
    enabling AI processing. Do not assume general terms acceptance covers this.

- [ ] **L11 — Membership terms and purchase disclosures** · Partial
  - Complete when: terms cover business identity, eligibility/age, service rules,
    renewals/cancellation, refunds/withdrawal, complaints, fitness limitations and
    applicable jurisdiction-specific provisions. Verify purchase disclosures,
    any required acceptance records and durable contract confirmation in the
    final checkout flow. Current source: `src/app/terms/page.tsx`.

- [ ] **L12 — Privacy requests and consistent data documentation** · Partial
  - Baseline: account deletion exists; no user export flow or documented request
    process was found. `PRIVACY.md` retains contradictory local-only statements.
  - Complete when: access, correction, export and deletion requests can be handled
    through a documented process (support-assisted is acceptable initially),
    backup/provider retention is explained, and data inventory docs are current.

- [ ] **L13 — Production media rights** · Open
  - Baseline: [media credits](../MEDIA_CREDITS.md) label some imported images as
    temporary development references to replace before release.
  - Complete when: replace these references with production assets or document
    appropriate commercial permissions; confirm supplied clip/person rights and
    attribution obligations. Preserve the 40-exercise contract and stable IDs.

- [ ] **L14 — Customer support and administration** · Open
  - Complete when: publish a monitored support contact and document procedures
    for refunds, access issues, complaints, privacy requests and failed deletion.
    Restrict operator access to Supabase/Stripe. A dedicated admin UI is not
    required if provider dashboards cover launch operations.

- [ ] **L15 — Monitoring, incident response and rollback** · Open
  - Complete when: error/uptime monitoring and webhook-failure alerts work;
    billing reconciliation, incident ownership, backup recovery and deployment
    rollback procedures are documented and exercised at an appropriate scale.

- [ ] **L16 — Deployed security verification** · Partial
  - Baseline: session checks, same-origin mutation checks, database policies and
    several security headers exist.
  - Complete when: verify deployed rate limits, request-size limits, secret
    handling, database isolation, admin permissions and an appropriate content
    security policy. Include account and billing authorization checks.

## Required before broad promotion

- [ ] **L17 — Real-device and accessibility release checks** · Partial
  - Complete when: test iPhone Safari and Android Chrome for speech/autoplay,
    screen locking, pause/resume, interrupted sessions, slow/missing media,
    network loss and cross-device conflicts. Check keyboard, screen-reader and
    contrast basics across the final account/purchase/player flows.

- [ ] **L18 — Publishing metadata and mobile performance** · Open
  - Baseline: generic root metadata; no favicon/social preview/sitemap/robots
    implementation was found. `public` measured approximately 241 MB; that is
    total asset storage, not initial page download size.
  - Complete when: add branded metadata, icons, social previews, canonical URLs,
    sitemap/robots rules; measure deployed mobile performance and optimize media
    delivery/compression without loading the full library initially.

- [ ] **L19 — Automated release checks** · Open
  - Baseline: local scripts/tests exist; no repository CI configuration was found.
  - Complete when: CI runs types, lint, tests and production build; staging smoke
    tests and a repeatable release/rollback process are established. Resolve the
    default build environment issue or explicitly configure a verified alternative.

- [ ] **L20 — Tracking, storage and AI launch decisions** · Open
  - Complete when: record whether AI planning ships enabled, its data/cost limits
    and failure behavior. Inventory actual cookies/storage and any telemetry;
    implement applicable notice/consent controls before adding nonessential
    tracking. A cookie banner is not automatically required for every setup.

## Verification baseline — 2026-10-23

These are local audit results, not certification of a deployed service.

| Check                      | Result                                                                                                                |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `npm test`                 | 368 tests passed across 62 files                                                                                      |
| `npm run typecheck`        | Passed                                                                                                                |
| `npm run lint`             | 0 errors, 188 warnings, including tooling files                                                                       |
| Selected Playwright suite  | 26 passed: accounts, subscription and smoke specs                                                                     |
| External-provider coverage | Account/payment browser tests predominantly mock providers; real email, charges and hosted database were not verified |
| `npm run build`            | Turbopack failed on local process/port permissions                                                                    |
| `npx next build --webpack` | Production build passed                                                                                               |
| `npm audit --omit=dev`     | Next.js critical and Zod high severity findings; recheck under L01                                                    |

Full E2E, deployed accessibility/performance, external provider dashboards and
real-device release checks were not completed in this audit. Environment values
were not exposed or recorded.

## Suggested order and open decisions

Start with L01–L04; connect authentication and billing under L05–L08. Complete
legal, privacy and media work in parallel where possible, then verify operations,
security and real-provider flows before accepting payments. Finish the promotion
checks before driving broad traffic.

Product/operator decisions still needed: legal business identity and jurisdiction,
target countries/age eligibility, domain/hosting, database region, prices/currencies,
tax/refund policy, support contact, retention periods and AI launch setting.

Naming is decided: Axyro. The repository is selected under L02; Netlify Free is
selected for initial hosting under L03. See the
[naming compatibility decision](../DECISIONS.md#2026-10-24--axyro-product-name).

## Legal reference material

These sources informed the audit; applicable obligations still depend on the
business and markets. Recheck current requirements when completing legal tasks.

- [EU privacy notice and data-protection guidance](https://europa.eu/youreurope/business/governance-and-sustainability/digital-and-data-compliance/data-protection-gdpr/index_en.htm)
- [European Commission: legal grounds and sensitive data](https://commission.europa.eu/law/law-topic/data-protection/information-business-and-organisations/legal-grounds-processing-data_en)
- [EU distance-selling and contract confirmation guidance](https://europa.eu/youreurope/business/selling-in-eu/selling-goods-services/ecommerce-distance-selling/index_en.htm)

## Progress log

| Date       | Items        | Update / evidence                                                                                                                                                                                                                                                                                                                                                                      |
| ---------- | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-10-23 | L01–L20      | Initial audit recorded; existing implementation separated from launch completion. No launch task marked complete.                                                                                                                                                                                                                                                                      |
| 2026-10-23 | L01          | Completed dependency remediation: full and production audits show 0 vulnerabilities; 368 unit tests and 89 browser tests passed; TypeScript, webpack production build and clean script-disabled lockfile install passed. Lint: 0 errors, 188 existing warnings.                                                                                                                        |
| 2026-10-24 | L02 / naming | Renamed the product/package/UI/docs to Axyro; configured the supplied GitHub origin and excluded local tooling/generated files. Preserved legacy saved-data keys and SQL fields. Verification: 368 unit tests, 89 browser tests, TypeScript, lint (0 errors/warnings), and webpack production build passed. Common secret-pattern scan found no matches; local environment is ignored. |
| 2026-10-24 | L02          | Initial source committed locally as `19e3d3f`. HTTPS push blocked by missing GitHub credentials; remote backup remains unverified.                                                                                                                                                                                                                                                     |
| 2026-10-24 | L02          | SSH push succeeded; remote main verified at `a2198fe`. Source-control task complete; hosting remains L03.                                                                                                                                                                                                                                                                              |
| 2026-10-24 | L03          | Netlify project `axyro-training` deployed successfully from `6322cad`; live guest/player/API smoke checks passed. Existing $0 Free plan confirmed. Accounts, Stripe and custom domain remain unconfigured.                                                                                                                                                                             |
