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

| ID  | Severity            | Finding                                                                                                                                    | Current result                                                                                                                                                                                                                                                                                                        |
| --- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S01 | Medium              | `safeNext` accepted `/\t/attacker.test`; the URL parser removes the tab and interprets an external host.                                   | Fixed: reject controls, spaces and backslashes; unit regression and production browser redirect probe pass.                                                                                                                                                                                                           |
| S02 | High                | A confirmed owner email automatically granted admin during session reads, including after a database role revocation.                      | Fixed: remove email-based promotion; protected database role is authoritative. Existing admins retain access; regression proves owner email/metadata cannot grant privileges.                                                                                                                                         |
| S03 | High                | Auth relied on optional Content-Length; checkout/planner read unrestricted JSON; sync/webhook checked size only after buffering.           | Fixed: one streaming byte-limited reader covers all five body-consuming routes. Limits: auth/checkout 16 KiB, planner 32 KiB, sync 4,000,000 bytes, webhook 1,000,000 bytes. Oversized streams cancel and return 413. Tests cover absent/false lengths, multibyte content and exact bounds.                           |
| S04 | Medium              | Callback selected password-recovery authority solely from the caller-selected destination.                                                 | Fixed: bind recovery to an HttpOnly PKCE purpose cookie set by the recovery endpoint. Ordinary signup/OAuth targeting the reset page grants no recovery marker. Purpose is consumed at callback and cleared on logout.                                                                                                |
| S05 | Medium              | No Content-Security-Policy; inconsistent explicit API/redirect cache policy.                                                               | Baseline hardening implemented: self-origin policy, no plugins/base URI/framing, restricted form/connect/media sources, no eval in production; API/auth responses no-store; callback no-referrer. Static hydration still requires inline scripts/styles, so this is not a strict nonce CSP or a complete XSS defense. |
| S06 | Moderate            | npm reported eight affected packages, including Next.js and the ESLint/minimatch dependency chain.                                         | Patched Next.js/matching ESLint config to 16.4.6 and compatible tooling resolutions; npm audit reports zero vulnerabilities. No forced upgrades or install scripts.                                                                                                                                                   |
| S07 | High                | No shared application rate/budget limit for repeated plan generation and billing provider operations; Auth also relies on provider limits. | Open: implement and verify shared counters/quotas before enabling paid AI traffic. Do not substitute per-process counters on serverless. Hosted Auth limits/CAPTCHA and trusted client-IP forwarding need verification.                                                                                               |
| S08 | High (availability) | The actual Axyro Supabase project is paused.                                                                                               | Verified in connector inventory and project dashboard. Resume was blocked by automatic approval review because of quota/billing implications; explicit operator authorization is required. No database changes made.                                                                                                  |
| S09 | Medium              | Sandbox staging and production share subscription/profile storage.                                                                         | Existing documented testing exception, not an isolated payment environment. Remove sandbox associations or isolate storage before live payments; real cross-account/provider lifecycle remains unverified.                                                                                                            |
| S10 | Medium              | Backup restore, retention/deletion across providers, hosted checks enforcement and rollback rehearsal lack current evidence.               | Open launch gates L04/L08/L14/L16/L19. Application deletion/export and cascade definitions exist; this does not establish complete provider/backup erasure or recovery.                                                                                                                                               |

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

Working branch: `codex/security-release`. The user's pre-existing product work
is preserved and included in the release scope. Push, hosted CI, merge and
deployment evidence will be recorded here as they become verified.

Supabase project `unrlqkymbdnpmgmmfltb` is Axyro and is paused. The active
`jfnjftfiizoairfsgleb` project contains another application's court-booking tables;
it is not a substitute and has not been modified. Netlify's browser session is
signed out. Do not change credentials, upgrade plans or accept charges to finish
this review without specific operator authorization.

References: [Next.js advisory](https://github.com/advisories/GHSA-mfr8-8qww-v76h),
[minimatch advisory](https://github.com/advisories/GHSA-g3hv-75wg-m249),
[Next.js 16.4.6](https://github.com/vercel/next.js/releases/tag/v16.4.6),
[Supabase Auth rate limits](https://supabase.com/docs/guides/auth/rate-limits).
