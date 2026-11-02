# Paid public launch tracker

Last updated: 2026-11-02 (Europe/Prague).

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
  - 2026-11-02: operator approved separate Free Netlify staging project
    `axyro-staging` from the existing Axyro repository, sandbox credential storage,
    and temporary shared Supabase access for a dedicated regular test account.
    Test origin is `https://axyro-staging.netlify.app`; the website is separate,
    but the database is explicitly shared. No paid database or hosting upgrade,
    project pause, live Stripe setup or production billing environment change.
    The exact staging auth callback is saved and verified after reload.
    Credentials are protected and populated only in staging's Production context.
    See [staging setup](NETLIFY_DEPLOYMENT.md#billing-staging--2026-11-02).
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
  - 2026-11-01: owner purchased `axyro.app` through Cloudflare. Added it as the
    Netlify primary domain with `www` redirect; saved both DNS-only CNAME records.
    Netlify confirms Let's Encrypt HTTPS for both hostnames. Saved canonical
    `APP_URL=https://axyro.app` and redeployed `ab1875e` successfully as
    `6ae73419c9b447d39154fc25`. Browser verified HTTPS homepage and free-workout
    navigation/start/pause and the `www` redirect. See
    [domain details](NETLIFY_DEPLOYMENT.md).
  - L03 remains partial: separate staging/production environments, remaining
    provider runtime secrets and deployed checks are pending.

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
  - 2026-11-01 Google setup: created dedicated Google Cloud project Axyro
    (`axyro-513421`) and its production web client. The operator approved the
    support email, Google policy agreement, credential creation/storage and
    public publishing. Saved only basic identity scopes, enabled Supabase Google
    and verified persistence after reload. Google reports In production. Live
    production Google sign-in from a signed-out session succeeded; account reload
    retained the existing profile and Admin access. New Google-only signup,
    cross-account isolation and custom consent branding remain unverified.
  - 2026-11-01 password follow-up: enabled the hosted Password changed security
    email and verified the switch remained on after reload. Existing template and
    SMTP configuration were retained. Account and recovery password forms now
    provide pending/success/error feedback. Verified 412 unit tests, 15 browser
    tests, phone/desktop accessibility, lint, TypeScript and production build.
    UI deployment and real inbox delivery remain unverified. L05 stays Partial.
  - 2026-11-01: saved Auth Site URL `https://axyro.app` and added the exact
    `/auth/callback` redirect, preserving the previous Netlify callback. Operator
    signed into Resend; added `auth.axyro.app` in Ireland and its three required
    DNS records in Cloudflare. Resend confirms the domain is verified and ready
    to send. Operator approved a domain-limited sending key and Supabase storage.
    Enabled SMTP with the approved replacement key; verified enabled settings and
    stored password after reload. Revoked the unused first key with explicit
    approval; one domain-limited sending key remains. The operator subsequently
    confirmed real email delivery, confirmation and sign-in with a disposable
    test address. Recovery and remaining L05 flows are still open.
    See [email setup](SUPABASE_SETUP.md).
  - 2026-11-01 follow-up: clarified signup feedback so it does not promise a new
    email for an existing account, and added immediate sign-in/reset links.
    Preserved the same public API response for new and existing accounts to
    prevent account discovery. Verified 412 unit tests, seven account/subscription
    browser tests, TypeScript, zero-warning lint and webpack production build.
  - 2026-10-31: operator confirmed no domain is owned yet and requested a free
    email-provider recommendation. Recommended Resend's free tier (3,000 emails
    per month, 100 per day), using its documented Supabase SMTP integration.
    Provider selection is not yet confirmed; a verified sending domain is required.
    No email account, domain purchase, SMTP configuration or messages were created.
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
  - 2026-11-02 follow-up: created the approved staging webhook with all seven
    required events and `2025-06-30.basil` snapshot payloads. Active endpoint is
    `we_1UXLcrRrXPiiRoHsSibA6eCC`. The first endpoint was disabled and signing
    configuration replaced after browser-tool output unexpectedly included its
    initial secret. Both sandbox credentials are protected in the staging project.
    Stripe API creation of a Checkout session and Customer Portal session succeeded
    for disposable unlinked customer `cus_VYSegHai9vyo8K`, without personal/card
    details, subscription purchase or money movement. User purchase verification
    remains L08; live merchant setup remains open.
  - Staging smoke exposed an origin mismatch: Netlify's immutable deployment URL
    reached the server while the browser used the stable staging alias. Fixed the
    shared mutation check to use canonical server-configured APP_URL in production,
    preserving development behavior and rejecting all other/missing origins.
    The regression test failed before the fix. Verified 426 unit tests, 30 account,
    subscription and smoke browser checks, TypeScript, zero-warning lint and
    webpack build. No database schema or app purchase behavior was added.
  - 2026-11-02: API-verified the existing local sandbox key belongs to dedicated
    **Axyro sandbox** (`acct_1UWlxJRrXPiiRoHs`), separate from the older Test mode
    account. All four EUR/USD prices are active and `livemode=false`; the default
    portal is active with payment-method updates, invoice history and period-end
    cancellation. No sandbox webhook exists. Netlify's existing public project
    lists no Stripe environment variables. Preparing separate hosted staging;
    automatic approval review blocked GitHub import pending explicit repository
    access/project and hosted-secret approval. No hosted credentials or public
    billing configuration changed. See [sandbox handoff](BILLING_SANDBOX_TEST.md).
  - Baseline: billing code exists; local Stripe environment variables were absent.
  - 2026-11-01: operator selected standard Stripe and confirmed Czech Republic
    as the business registration country. Prepared Axyro subscription onboarding
    in test mode. Created sandbox product `prod_VYDabQuFiM7BcG` with verified
    EUR 6.99/month (`price_1UX79cRrXPiiRoHs2d7Sdmyg`) and EUR 59.99/year
    (`price_1UX7BQRrXPiiRoHsIAhJSE8s`). These belong to the separate Axyro
    sandbox, not the live account. Saved sandbox default Customer Portal
    `bpc_1UX7ChRrXPiiRoHsuyG3chKX` with payment-method updates enabled and
    cancellation at period end. Live merchant verification/prices, secrets,
    webhooks and live Customer Portal still require configuration and verification.
  - Sandbox connection: operator approved reading the existing sandbox key and
    saving it only in git-ignored `.env.local`, alongside the two sandbox price
    IDs. Read-only Stripe API checks passed for both prices (active, EUR, exact
    amounts/intervals, `livemode=false`) and the active default portal with
    payment-method updates and period-end cancellation. No production billing
    environment was changed. Local Supabase/auth configuration and webhook
    delivery are absent, so application checkout/Pro verification remains L08.
  - Complete when: merchant verification/payouts, recurring prices, environment
    keys, webhook subscriptions and Customer Portal are configured for launch.
    Configure cancellation and payment-method management. See [billing](billing.md).

- [ ] **L07 — Pricing, tax and commercial rules** · Open
  - 2026-11-01 regional pricing: operator approved adding USD 7.99/month and
    USD 69.99/year alongside the existing EUR prices. Created and API-verified
    sandbox prices `price_1UX7VLRrXPiiRoHsUAr7Hvy3` (799 USD cents/month) and
    `price_1UX7VLRrXPiiRoHsl6ffjNz6` (6999 USD cents/year) under the same Pro
    product. IDs are saved locally. Paywall supports currency selection with
    USD as default when available, preserving the selected billing period.
  - 2026-11-01: operator approved EUR 6.99/month and EUR 59.99/year for
    membership (approximately 28.5% annual saving). Tax treatment, including
    whether the approved customer prices include applicable tax, remains open.
    Operator reports not registered for Czech VAT or EU OSS; this does not
    establish the applicable treatment of future sales.
  - Complete when: price/currency/annual billing decisions, applicable VAT/tax,
    invoices/receipts, refunds, failed payments and cancellation rules are
    documented and reflected in checkout/provider settings. The audited Checkout
    request does not enable automatic tax collection; explicitly decide and
    implement applicable tax handling.

- [ ] **L08 — Real payment lifecycle verification** · Unverified
  - 2026-11-02: added endpoint tests using real HMAC verification for the seven
    subscribed events, expanded customer references, forged delivery, missing
    signing configuration, unrelated events and retryable reconciliation failure.
    All 12 focused tests pass. These use mocked reconciliation and do not establish
    deployed webhook delivery or purchase readiness. Owner/Admin accounts already
    have Pro; the operator test requires a regular account. Hosted database and
    Stripe account isolation must be resolved before configuring staging.
    Full local verification: 425 unit tests, TypeScript and zero-warning ESLint
    pass. No production code was changed; build/browser checks were not rerun.
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

- [ ] **L19 — Automated release checks** · Partial
  - Baseline: local scripts/tests exist; no repository CI configuration was found.
  - Complete when: CI runs types, lint, tests and production build; staging smoke
    tests and a repeatable release/rollback process are established. Resolve the
    default build environment issue or explicitly configure a verified alternative.
  - 2026-10-31: added GitHub Actions checks for lint with zero warnings, generated
    route types, TypeScript, unit tests, dependency audit, the verified webpack
    build, production guest smoke and full development browser regressions.
    A separate manually triggered workflow checks deployed staging without
    provider mocks or development login. See [release checks](RELEASE_CHECKS.md)
    for commands and the release/rollback procedure. Local production smoke and
    deployed preview smoke each passed both tests: public pages, disabled admin,
    guest billing status, free-player audio/pause/resume and skip-to-completion.
    Unit tests (410), all 104 development browser tests, TypeScript, zero-warning
    ESLint and webpack build passed.
    Local agent-tool directories are excluded from app linting; app rules remain
    unchanged. Audit reports no high/critical findings and 16 moderate findings
    in development tooling through minimatch; these remain for L01 reassessment.
    Hosted Actions execution, required branch checks, separate staging/provider
    verification and an exercised rollback remain open. Main still deploys
    independently through Netlify; this workflow alone does not gate publishing.

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

| 2026-10-31 | L03 / L17 / L19 | Usability release prepared: 410 unit tests, all 104 browser tests across full run and targeted rerun, TypeScript, targeted ESLint and webpack production build passed. Responsive audit covered nine routes at three sizes. Real-device/provider checks remain open; deployment evidence follows after publishing. |
| 2026-10-31 | L01 / L03 | Release audit found high-severity undici advisories in transitive OpenAI dependency; updated lockfile from 7.30.0 to 7.30.1. Production audit now reports 0 vulnerabilities; 410 unit tests and webpack production build passed after patch. |
| 2026-10-31 | L03 / L19 | Netlify published `c31a43d` successfully: deploy `6ae5f8544363e1e407c55047`, https://axyro-training.netlify.app. Public landing/settings/workout/preview/player and read-only auth/billing endpoints returned 200; live player start/pause verified. Prior published `6865c70` remains available through Netlify deploy history for rollback. Real-device, live payment and full provider flows remain unverified. |
| 2026-10-31 | L19 | Added CI quality/regression workflows, guest-only local production and deployed staging smoke, and release/rollback instructions. Verified 410 unit tests, 104 browser regressions, two local production smoke tests and two deployed preview smoke tests; types, zero-warning lint and webpack build pass. Hosted Actions, branch enforcement and rollback rehearsal remain open. |
| 2026-10-31 | L05 | Recommended Resend free SMTP; operator has no domain yet. Sending-domain verification and real email lifecycle checks remain pending. |
| 2026-11-01 | L03 / L05 | Connected Cloudflare-registered axyro.app to Netlify with HTTPS and www redirect; saved canonical app/Auth URLs and exact callback. Deploy 6ae73419c9b447d39154fc25 published ab1875e. Verified homepage and player start/pause. Resend verified auth.axyro.app in Ireland; enabled Supabase SMTP with one approved domain-limited sending key and verified persistence after reload. Unused first key revoked. Real signup/email confirmation and recovery remain unverified. |
| 2026-11-01 | L05 | Operator confirmed a real confirmation email and successful sign-in using a disposable test address. Clarified generic signup feedback with sign-in/reset links; protected new/existing-account API equivalence with tests. 412 unit tests, seven account/subscription browser tests, types, zero-warning lint and webpack build passed. Recovery and other remaining provider flows are unverified. |
| 2026-11-01 | L05 / L13 | Preparing branded confirmation template and operator-approved generated welcome illustration. Resend delivered-message metadata confirms From is Axyro <noreply@auth.axyro.app>; temporary inbox showed a provider envelope address. Saved branded subject/template in hosted Supabase; verified exact source equality after reload, desktop/390px previews, public pinned image URL and token placeholders. New real-inbox rendering remains unverified; reference rights remain part of L13. |

| 2026-11-01 | L03 / L05 / L19 | PR #1 merged as f61728af5586ad75b5f29f589dc7a26ae5903601 after hosted Release checks run 41311599990 passed quality and browser jobs. Netlify published production deploy 6ae7400f27c51a49a4363311 from that merge. Both guest Mobile Chrome smoke tests passed against https://axyro.app (public pages/auth safety and player start/pause/resume/skip-to-completion). Live signup page loaded; branded Supabase confirmation template was already saved and verified. Previous deploy 6ae73419c9b447d39154fc25 / ab1875e remains the rollback target. Fresh inbox rendering, recovery, real-device checks, branch enforcement and rollback rehearsal remain open. |

| 2026-11-01 | L05 / L16 | Diagnosed owner sign-in loop: Auth succeeds and profile GET is 200, but owner role PATCH is 401. Production secret held only the key identifier. Operator approved replacement with `axyro_netlify_production` in Netlify production and deletion of previous default secret after tool-output exposure. Replacement saved and previous key deleted. Netlify published 6ae75f417e7909cf594eab3b from 60d7f96; existing confirmed browser session now loads /account with the owner profile and Admin access. Recovery and other L05 checks remain open. |

| 2026-11-01 | L05 / L17 | Replaced the top-left account-loading text with a centered branded status and indeterminate CSS spinner. Reduced-motion users receive a static indicator; request timing and error/retry behavior are unchanged. Desktop and 390px previews checked; TypeScript, targeted ESLint and webpack production build pass. Production deployment remains pending. |

| 2026-11-01 | L05 | Enabled Supabase's built-in password-change notification and verified persistence after reload. Account password feedback is beside the form; recovery has an explicit success screen. Delayed-response regression tests reproduced the original missing feedback. No real password was changed; inbox delivery and production deployment of the UI remain unverified. |

| 2026-11-01 | L05 | Created dedicated Google Cloud project Axyro (`axyro-513421`) without activating billing. Operator approved policy agreement, OAuth credential creation/storage and public publishing. Saved production web client and basic identity scopes; Supabase Google is enabled after reload and Google audience is In production. Verified production Google sign-in from a signed-out session and persisted account access after a new page load. New Google-only signup, isolation and custom consent branding remain unverified. |

| 2026-11-01 | L06 / L07 / L08 | Operator confirmed Czech business location, standard Stripe and EUR 6.99/month / EUR 59.99/year. Created and API-verified both sandbox prices and default portal (payment updates, period-end cancellation). Saved approved sandbox credentials only in ignored local environment. Operator reports no VAT/OSS registration; tax treatment stays open. Live activation is at business-type selection and requires owner verification/bank details. No production billing changes; local auth/database and webhook lifecycle testing remain pending. |

| 2026-11-01 | L06 / L07 / L19 | Added approved USD 7.99/month and USD 69.99/year sandbox prices alongside EUR 6.99/month and EUR 59.99/year. App supports USD/EUR selection with USD default and billing-period preservation; both use the existing Pro entitlement and server price allowlist. Verified 413 unit tests, eight account browser checks and three subscription browser checks, TypeScript, lint and webpack production build. Real local app loaded both currencies from Stripe and switched correctly. No live billing or production deployment changed; merchant activation, tax decisions and real payment/webhook lifecycle verification remain open. |


| 2026-11-01 | L01 / L05 / L06 / L07 / L17 / L19 | Prepared account and membership release: distinct account illustrations, password request/completion feedback, USD/EUR selection, responsive paywall and an explicitly inactive optional promo-code input. Verified 413 unit tests, all 119 browser regressions, two local production smoke tests, TypeScript, zero-warning lint and webpack build. Production dependency audit reports 0 vulnerabilities; full audit has 16 moderate development-tooling findings and no high/critical findings. Source secret-pattern scan found no matches. Hosted checks and merge evidence follow; live payment/webhook lifecycle, promo redemption and remaining provider/device checks stay open. |

| 2026-11-02 | L06 / L08 | Verified dedicated Stripe sandbox identity, all four active test prices and default portal settings through the API. No webhook endpoints or hosted Stripe variables exist. Added 12 signed-webhook endpoint tests and sandbox configuration/operator test instructions. All 425 unit tests, TypeScript and zero-warning lint pass. Separate hosted staging import was blocked by automatic approval review pending explicit scope/secret approval; no hosted configuration or live billing changed. L06 remains Partial and L08 Unverified. |
