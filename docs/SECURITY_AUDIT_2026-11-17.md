# Axyro security review — 17 November 2026

Scope: current source and uncommitted product changes, all API handlers,
authentication/callback/session helpers, Stripe reconciliation, account-scoped
persistence, SQL migrations, browser response headers, dependencies and release
configuration. This is a code and configuration review, not proof that every
possible vulnerability has been eliminated. Hosted account/payment/database
verification remains necessary.

## Trust boundaries and assets

- Browser → app: credentials, redirect destinations, training profiles, snapshots
  and billing selections are untrusted. Protect sessions, personal training data,
  account ownership, admin roles and subscription entitlement.
- App → Supabase: validate identities through Auth; use user JWTs and RLS for
  owned data. Server credentials are reserved for explicit privileged operations.
  Never derive authorization from user-editable metadata or an email exception.
- App → Stripe: server-owned customer associations and price allowlists; signed
  raw webhook bodies; reconcile current provider state instead of event snapshots.
- App → optional model: bounded input, schema-validated exercise IDs and a
  deterministic compiler; no model authority over execution or permissions.
- Git/CI → Netlify: preserve the lockfile, disable dependency install scripts,
  test before merging, and verify the published commit and runtime afterward.

STRIDE review considered identity spoofing, owner/plan/billing tampering, missing
audit evidence, personal-data disclosure, body/provider-resource exhaustion and
role/entitlement escalation at these boundaries.

## Findings and fixes

| ID  | Severity            | Finding                                                                                                                                    | Current result                                                                                                                                                                                                                                                                                                                                                                           |
| --- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S01 | Medium              | `safeNext` accepted `/\t/attacker.test`; the URL parser removes the tab and interprets an external host.                                   | Fixed: reject controls, spaces and backslashes; unit regression and production browser redirect probe pass.                                                                                                                                                                                                                                                                              |
| S02 | High                | A confirmed owner email automatically granted admin during session reads, including after a database role revocation.                      | Fixed: remove email-based promotion; protected database role is authoritative. Existing admins retain access; regression proves owner email/metadata cannot grant privileges.                                                                                                                                                                                                            |
| S03 | High                | Auth relied on optional Content-Length; checkout/planner read unrestricted JSON; sync/webhook checked size only after buffering.           | Fixed: one streaming byte-limited reader covers all five body-consuming routes. Limits: auth/checkout 16 KiB, planner 32 KiB, sync 4,000,000 bytes, webhook 1,000,000 bytes. Oversized streams cancel and return 413. Tests cover absent/false lengths, multibyte content and exact bounds.                                                                                              |
| S04 | Medium              | Callback selected password-recovery authority solely from the caller-selected destination.                                                 | Fixed: bind recovery to an HttpOnly PKCE purpose cookie set by the recovery endpoint. Ordinary signup/OAuth targeting the reset page grants no recovery marker. Purpose is consumed at callback and cleared on logout.                                                                                                                                                                   |
| S05 | Medium              | No Content-Security-Policy; inconsistent explicit API/redirect cache policy.                                                               | Baseline hardening implemented: self-origin policy, no plugins/base URI/framing, restricted form/connect/media sources, no eval in production; API/auth responses no-store; callback no-referrer. Static hydration still requires inline scripts/styles, so this is not a strict nonce CSP or a complete XSS defense.                                                                    |
| S06 | Moderate            | npm reported eight affected packages, including Next.js and the ESLint/minimatch dependency chain.                                         | Patched Next.js/matching ESLint config to 16.4.6 and compatible tooling resolutions; npm audit reports zero vulnerabilities. No forced upgrades or install scripts.                                                                                                                                                                                                                      |
| S07 | High                | No shared application rate/budget limit for repeated plan generation and billing provider operations; Auth also relies on provider limits. | Implemented in source: service-only atomic PostgreSQL quotas for auth, Pro planning and billing actions, with 429/Retry-After and fail-closed 503. Public Stripe prices cache for five minutes; model calls have a timeout and no SDK retries. Local SQL/API checks pass. Hosted migration, concurrency, Auth IP/CAPTCHA and budget verification remain open; see REQUEST_PROTECTION.md. |
| S08 | High (availability) | The actual Axyro Supabase project is paused.                                                                                               | Verified in connector inventory and project dashboard. Resume was blocked by automatic approval review because of quota/billing implications; explicit operator authorization is required. No database changes made.                                                                                                                                                                     |
| S09 | Medium              | Sandbox staging and production share subscription/profile storage.                                                                         | Existing documented testing exception, not an isolated payment environment. Remove sandbox associations or isolate storage before live payments; real cross-account/provider lifecycle remains unverified.                                                                                                                                                                               |
| S10 | Medium              | Backup restore, retention/deletion across providers, hosted checks enforcement and rollback rehearsal lack current evidence.               | Open launch gates L04/L08/L14/L16/L19. Application deletion/export and cascade definitions exist; this does not establish complete provider/backup erasure or recovery.                                                                                                                                                                                                                  |

Other reviewed controls: HttpOnly/Secure/SameSite session cookies, production
development-admin rejection, same-origin mutation checks, server authentication
and Pro checks, UUID-derived resource ownership, profile column grants/RLS,
database plan-write trigger, optimistic revision writes, Stripe price/customer
binding, HMAC/timestamp verification and generic error responses. No raw HTML,
eval or shell execution sink was found in application source. Browser-local
training caches are account-scoped, not encrypted from someone controlling the
same browser/OS profile. Static exercise media remains publicly served by design.

## Verification evidence

- 492 unit tests in 71 files passed, including new security regressions.
- Production webpack build with Next.js 16.4.6 passed; TypeScript passed.
- Zero-warning ESLint passed before final documentation changes.
- Three local production browser tests passed, including hostile mutation
  origins, unsafe redirects, CSP/no-store headers and guest workout completion.
- Full development mobile browser suite: 158/161 passed initially. Three old
  copy/layout assertions conflicted with the existing UI revisions; related
  suites were rerun after aligning assertions with the intended design: all 30
  tests in the affected suites passed. No failing browser test remains.
- Semgrep 1.136.0: `p/typescript` and `p/javascript`, metrics disabled, 74 rules,
  256 targets, zero findings. Two test files had partially parsed generic syntax;
  parsed coverage was approximately 99.9%. No application-source parse errors.
- Common credential/private-key pattern scan: 357 current text files and text
  commit patches across all fetched refs, zero matches. This is not exhaustive
  secret detection; ignored local environment files were not printed or committed.
- npm audit after compatible script-disabled remediation: zero vulnerabilities.
  Lockfile review found no new install scripts among changed packages. A clean
  `npm ci --ignore-scripts` passed in a temporary directory using a separate
  cache (the normal cache contained root-owned files).
- Live `https://axyro.app` returned HTTP 200 on 17 November, with the previous
  security headers and no CSP. That is the old deployment, not this release.

## Release status

Pushed branch: `codex/security-release`. Product commit `045275f`; security
commit `e07f3fa`. The user's pre-existing product work is preserved and included
in the release scope. The source working tree was clean after both commits.

The GitHub connector returned `403 Resource not accessible by integration` when
creating the release PR. Browser fallback reached GitHub sign-in; Netlify is also
signed out. The connector reports no statuses or workflow runs on `e07f3fa`;
CI currently triggers only for PRs and main. No PR, merge or new deployment has
been completed. Do not bypass the documented pre-merge checks by pushing main.
Continue from [the release comparison](https://github.com/ZhyrovDmytro/axyro/compare/main...codex/security-release)
after GitHub sign-in. Hosted account/payment/database and deployment checks
remain required; the goal is not complete.

Supabase project `unrlqkymbdnpmgmmfltb` is Axyro and is paused. The active
`jfnjftfiizoairfsgleb` project contains another application's court-booking tables;
it is not a substitute and has not been modified. Netlify's browser session is
signed out. Do not change credentials, upgrade plans or accept charges to finish
this review without specific operator authorization.

References: [Next.js advisory](https://github.com/advisories/GHSA-mfr8-8qww-v76h),
[minimatch advisory](https://github.com/advisories/GHSA-g3hv-75wg-m249),
[Next.js 16.4.6](https://github.com/vercel/next.js/releases/tag/v16.4.6),
[Supabase Auth rate limits](https://supabase.com/docs/guides/auth/rate-limits).

## Shared quotas follow-up

Prepared `20261117092915_api_rate_limits.sql` using the official Supabase CLI.
No hosted migration or resume was attempted. PGlite executed the migration and
SQL regression assertions successfully; an actual anonymous RPC call was denied.
Vitest now passes 514 tests across 73 files; lint and TypeScript pass. Ten
account/form/subscription browser regressions passed. The new CI PostgreSQL
permission/concurrency steps parse, but have not run in hosted Actions.

See [request protection](REQUEST_PROTECTION.md) for quota values, retention,
limits and deployment order. **Apply and verify the database migration before
publishing this follow-up code**: protection fails closed when the RPC is absent.
The existing paused database and pending GitHub/Netlify sign-ins still prevent
hosted verification and publication. The goal remains incomplete.

Public auth quota subjects were refined to Netlify connecting-IP/email pairs,
plus a client-wide quota, so another IP cannot exhaust a victim's global login
bucket simply by naming their email. Generic forwarded headers are ignored;
missing platform identity denies work. The new boundary regressions pass.
Hosted header-spoofing/SITE_ID checks remain an explicit deployment gate.

Final follow-up static analysis: 74 Semgrep JavaScript/TypeScript rules over all
11 changed/new quota/auth/billing targets, zero findings and no parse errors.
The updated production webpack build passes. The privacy notice now discloses
pseudonymous security counters and their expiry/cleanup behavior. Local SQL
checks do not replace the still-pending hosted concurrency and header tests.
