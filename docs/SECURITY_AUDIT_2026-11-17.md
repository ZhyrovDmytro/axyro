# Axyro security review — 17 November 2026

Scope: current source and uncommitted product changes, all API handlers,
authentication/callback/session helpers, Stripe reconciliation, account-scoped
persistence, SQL migrations, browser response headers, dependencies and release
configuration. This is a code and configuration review, not proof that every
possible vulnerability has been eliminated. Hosted payment lifecycle, recovery-email and physical-device verification remain open launch work.

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

| ID  | Severity            | Finding                                                                                                                                    | Current result                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| --- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S01 | Medium              | `safeNext` accepted `/\t/attacker.test`; the URL parser removes the tab and interprets an external host.                                   | Fixed: reject controls, spaces and backslashes; unit regression and production browser redirect probe pass.                                                                                                                                                                                                                                                                                                                                               |
| S02 | High                | A confirmed owner email automatically granted admin during session reads, including after a database role revocation.                      | Fixed: remove email-based promotion; protected database role is authoritative. Existing admins retain access; regression proves owner email/metadata cannot grant privileges.                                                                                                                                                                                                                                                                             |
| S03 | High                | Auth relied on optional Content-Length; checkout/planner read unrestricted JSON; sync/webhook checked size only after buffering.           | Fixed: one streaming byte-limited reader covers all five body-consuming routes. Limits: auth/checkout 16 KiB, planner 32 KiB, sync 4,000,000 bytes, webhook 1,000,000 bytes. Oversized streams cancel and return 413. Tests cover absent/false lengths, multibyte content and exact bounds.                                                                                                                                                               |
| S04 | Medium              | Callback selected password-recovery authority solely from the caller-selected destination.                                                 | Fixed: bind recovery to an HttpOnly PKCE purpose cookie set by the recovery endpoint. Ordinary signup/OAuth targeting the reset page grants no recovery marker. Purpose is consumed at callback and cleared on logout.                                                                                                                                                                                                                                    |
| S05 | Medium              | No Content-Security-Policy; inconsistent explicit API/redirect cache policy.                                                               | Baseline hardening implemented: self-origin policy, no plugins/base URI/framing, restricted form/connect/media sources, no eval in production; API/auth responses no-store; callback no-referrer. Static hydration still requires inline scripts/styles, so this is not a strict nonce CSP or a complete XSS defense.                                                                                                                                     |
| S06 | Moderate            | npm reported eight affected packages, including Next.js and the ESLint/minimatch dependency chain.                                         | Patched Next.js/matching ESLint config to 16.4.6 and compatible tooling resolutions; npm audit reports zero vulnerabilities. No forced upgrades or install scripts.                                                                                                                                                                                                                                                                                       |
| S07 | High                | No shared application rate/budget limit for repeated plan generation and billing provider operations; Auth also relies on provider limits. | Implemented and verified on staging: service-only atomic PostgreSQL quotas for auth, Pro planning and billing actions, with 429/Retry-After and fail-closed 503. Public Stripe prices cache for five minutes; model calls have a timeout and no SDK retries. Live migration/privilege checks, CI concurrency and staging IP spoof/429 checks pass. CAPTCHA and provider spending controls remain optional additional defenses; see REQUEST_PROTECTION.md. |
| S08 | High (availability) | The actual Axyro Supabase project is paused.                                                                                               | Resolved after explicit operator approval: existing Free project restored to ACTIVE_HEALTHY, without an upgrade. Quota migration applied and live privilege/isolation checks passed.                                                                                                                                                                                                                                                                      |
| S09 | Medium              | Sandbox staging and production share subscription/profile storage.                                                                         | Existing documented testing exception, not an isolated payment environment. Remove sandbox associations or isolate storage before live payments; real cross-account/provider lifecycle remains unverified.                                                                                                                                                                                                                                                |
| S10 | Medium              | Backup restore, retention/deletion across providers, hosted checks enforcement and rollback rehearsal lack current evidence.               | Open launch gates L04/L08/L14/L16/L19. Application deletion/export and cascade definitions exist; this does not establish complete provider/backup erasure or recovery.                                                                                                                                                                                                                                                                                   |

Other reviewed controls: HttpOnly/Secure/SameSite session cookies, production
development-admin rejection, same-origin mutation checks, server authentication
and Pro checks, UUID-derived resource ownership, profile column grants/RLS,
database plan-write trigger, optimistic revision writes, Stripe price/customer
binding, HMAC/timestamp verification and generic error responses. No raw HTML,
eval or shell execution sink was found in application source. Browser-local
training caches are account-scoped, not encrypted from someone controlling the
same browser/OS profile. Static exercise media remains publicly served by design.

## Verification evidence

- 514 unit tests in 73 files passed, including the security regressions.
- Production webpack build with Next.js 16.4.6 passed; TypeScript passed.
- Zero-warning ESLint passed before final documentation changes.
- Three local production browser tests passed, including hostile mutation
  origins, unsafe redirects, CSP/no-store headers and guest workout completion.
- All 161 development mobile browser regressions passed in hosted CI.
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

Release PR: [#5](https://github.com/ZhyrovDmytro/axyro/pull/5), branch
`codex/security-release`. It includes the preserved product work, security fixes,
shared quotas and migration. Merged as `1549150970c838ef546a75cf5e70e322d0332992`; Netlify published production deployment `6afc89280149db91f5bdb3bc` at https://axyro.app.

[Hosted Release checks 44087857990](https://github.com/ZhyrovDmytro/axyro/actions/runs/44087857990)
passed both quality and browser jobs on `23fc3ee`: 514 unit tests, all 161 browser
regressions, types/lint/audit/build, production smoke, PostgreSQL permissions and
the 20-connection/three-success quota check.

Netlify preview deployment `6afc4f029df8372b85ad579d` successfully built that
commit. [Preview](https://deploy-preview-5--axyro-training.netlify.app) passed all
three deployed guest/security smoke tests. This establishes preview navigation,
headers/origin/redirect protections and guest workout flow; it does not establish
real provider/account/database behavior.

The operator's GitHub and Netlify sign-ins are verified. The GitHub connector
still lacks PR-write permission, so the PR was created through the signed-in
browser. Rollback target, verified in Netlify before promotion:
`6ae7c5d0d27a02b549097df1`, source `340f67a`.

The operator explicitly authorized resuming the existing Free Axyro project.
`unrlqkymbdnpmgmmfltb` is now ACTIVE_HEALTHY; the unrelated court-booking
project was not modified. The additive quota migration was applied as hosted
version `20261117164905` (`api_rate_limits`); its source file remains
`20261117092915_api_rate_limits.sql`. Live SQL assertions passed for quota
allowance/expiry/privileges and account isolation, role/billing escalation denial,
unpaid plan protection and client quota RPC denial. Synthetic identities and
data were transactionally rolled back.

Staging deployment `6afc85c987fe70a139886b22` publishes `5454238` at
https://axyro-staging.netlify.app. All three mobile release smoke tests passed.
A nonexistent `.invalid` sign-in received ten generic 400 responses, then 429
with Retry-After. Forging Netlify client-IP and generic forwarded headers still
returned 429. Wrong/missing Origin returned 403; oversized bodies returned 413.
This verifies runtime SITE_ID, trusted IP handling and service-key RPC access.
Hosted CI run `44089218480` passed both jobs on that source.

Supabase security advisors retain a leaked-password-protection warning: that
provider feature requires Pro or above, so it was not enabled under the explicit
Free/no-upgrade authorization. The counter table's no-policy informational
notice is intentional: clients have no access; only service_role can use it.
Real email recovery, Stripe lifecycle, backup restore and physical-device checks
remain open launch gates; no charge, credential change or plan upgrade occurred.

References: [Next.js advisory](https://github.com/advisories/GHSA-mfr8-8qww-v76h),
[minimatch advisory](https://github.com/advisories/GHSA-g3hv-75wg-m249),
[Next.js 16.4.6](https://github.com/vercel/next.js/releases/tag/v16.4.6),
[Supabase Auth rate limits](https://supabase.com/docs/guides/auth/rate-limits).

## Shared quotas follow-up

Prepared `20261117092915_api_rate_limits.sql` using the official Supabase CLI.
PGlite executed the migration and
SQL regression assertions successfully; an actual anonymous RPC call was denied.
Vitest now passes 514 tests across 73 files; lint and TypeScript pass. Ten
account/form/subscription browser regressions passed. The CI PostgreSQL
permission/concurrency checks subsequently passed in hosted Actions; see the
release status above.

See [request protection](REQUEST_PROTECTION.md) for quota values, retention,
limits and deployment order. **Apply and verify the database migration before
publishing this follow-up code**: protection fails closed when the RPC is absent.
The hosted migration and staging runtime checks above now satisfy this prerequisite.

Public auth quota subjects were refined to Netlify connecting-IP/email pairs,
plus a client-wide quota, so another IP cannot exhaust a victim's global login
bucket simply by naming their email. Generic forwarded headers are ignored;
missing platform identity denies work. The new boundary regressions pass.
Hosted header-spoofing/SITE_ID checks passed on staging as recorded above.

Final follow-up static analysis: 74 Semgrep JavaScript/TypeScript rules over all
11 changed/new quota/auth/billing targets, zero findings and no parse errors.
The updated production webpack build passes. The privacy notice now discloses
pseudonymous security counters and their expiry/cleanup behavior. Local SQL
checks are supplemented by the hosted CI concurrency and staging header tests above.

## Production verification

Final PR CI [44131764773](https://github.com/ZhyrovDmytro/axyro/actions/runs/44131764773)
passed quality and browser on `d692a8d`. After publication of merge `1549150`,
all three Mobile Chrome release smoke tests passed against https://axyro.app:
security headers/origins/redirects, public pages/development-admin rejection and
free-workout start/pause/resume/skip-to-completion. Production sign-in admitted
ten invalid `.invalid` credential attempts, returned 429/Retry-After on the
eleventh, and still returned 429 with a forged Netlify platform IP. No account,
email or payment was created. The previous deployment `6ae7c5d0d27a02b549097df1`
/ `340f67a` remains the pre-release rollback target; rollback was not rehearsed.
The following documentation-only evidence commit does not change application code.
