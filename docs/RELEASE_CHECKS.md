# Release checks and rollback

L19 in [the launch tracker](LAUNCH_READINESS.md) owns this process. Passing CI
does not close the account, billing, legal, media-rights or device launch gates.

## Pull requests

The `Release checks` GitHub Actions workflow runs on pull requests and pushes to
`main`, using Node.js 24 and the committed lockfile without installation scripts.
It runs zero-warning ESLint, Next.js route type generation, TypeScript, unit tests,
the database privilege and billing isolation checks, the dependency audit
(high/critical fail), the webpack production build and guest
production smoke tests. A second job runs the full development browser suite.
No provider credentials are required. Failed browser runs retain reports/traces
for seven days; do not add credentials or real personal data to test fixtures.

Require the `quality` and `browser` checks in the GitHub ruleset for `main` before
merging release changes. Rule enforcement and hosted workflow execution must be
verified separately; adding a workflow alone does not protect the branch. Netlify
currently deploys `main` independently of Actions, so direct pushes bypass this
pre-merge process. Keep release changes in PRs and merge only after both checks pass.

Local equivalents:

```sh
npm ci --ignore-scripts
npm run lint -- --max-warnings=0
npx next typegen
npm run typecheck
npm test
npm audit --audit-level=high
npm run build -- --webpack
npx playwright install chromium
npx playwright test --config=playwright.release.config.ts
npm run test:e2e -- --workers=2
```

The production smoke suite starts `next start` on port 3200 after a build.
The development regression suite starts `next dev` on port 3100 and uses the
development administrator for protected flows. Never run that suite against a
deployed environment.

## Deployed staging smoke

After Netlify finishes deploying the intended commit, run `Staging smoke` from
GitHub Actions with the deployed staging origin. Alternatively:

```sh
PLAYWRIGHT_BASE_URL=https://axyro-staging.netlify.app npx playwright test --config=playwright.release.config.ts
```

Setting the URL disables the local server. Tests use real public routes without
mocking provider APIs or logging in. They check public pages, disabled development
administrator access, guest billing status, free-player start, audio toggle,
pause/resume and completion by skipping intervals. The billing smoke opens the
withdrawal review by keyboard, checks guest billing authorization and rejects a
cross-origin withdrawal request. This is not verification of
a full timed session, speech output, real email delivery or payments.

Record the source commit, Netlify deploy ID, workflow run URL and result in the
launch tracker. Verify real signup/recovery, account isolation and Stripe test-mode
lifecycle on separately configured staging before accepting payments. See L03–L08.

## Release and rollback procedure

1. Confirm every payment launch gate is verified. Choose the release commit only
   after `quality` and `browser` pass. Record the currently published Netlify deploy
   ID and its source commit as the rollback target before publishing.
2. Deploy the chosen commit, confirm its ID/source in Netlify, run deployed smoke,
   then check account/provider flows and actual phones as required by L08/L17.
3. If public pages/player fail or a security, billing or data-integrity regression
   appears, stop promotion. In Netlify's deploy history select the previously
   verified successful deploy and use **Publish deploy**. Stop automatic publishing
   while investigating so a subsequent build cannot replace the rollback.
4. Verify the published deploy ID and rerun deployed smoke. Check any affected real
   provider flows. Record the failure, restored deploy ID, checks and timestamps
   in the launch tracker. Correct the source through a reviewed PR before resuming
   automatic publishing.

Republishing application code does not restore environment variables, database
changes or provider state. Plan database and provider recovery under L04
before publishing a release that changes either. A rollback
drill remains unverified until the operator actually republishes and checks a
previous deployment; deploy history availability alone is not a rehearsal.

References: [Playwright CI](https://playwright.dev/docs/ci),
[Playwright web servers](https://playwright.dev/docs/test-webserver),
[GitHub Node setup](https://github.com/actions/setup-node),
[Netlify deploy management](https://docs.netlify.com/deploy/manage-deploys/manage-deploys-overview/).

## Security migration prerequisite — 17 November 2026

The quality job now runs the service-only quota migration and SQL privilege,
expiry and allowance assertions against an ephemeral PostgreSQL 17 container.
Twenty independent connections must admit exactly three requests against a
three-request bucket. These checks need no provider credentials and do not
contact the hosted database. Both checks passed in [Release checks 44087857990](https://github.com/ZhyrovDmytro/axyro/actions/runs/44087857990) on `23fc3ee`.

Applied and verified for this release:
`supabase/migrations/20261117092915_api_rate_limits.sql` on the actual Axyro
project (hosted version `20261117164905`, `api_rate_limits`). Missing counters fail closed with 503.
Follow [request protection](REQUEST_PROTECTION.md) for migration order and live
checks; a passing isolated SQL test does not establish hosted privileges or
cross-instance behavior. GitHub/Netlify sign-ins, explicit Free-project resume approval, live database isolation/privilege assertions and staging runtime IP/spoof/429 checks passed. Staging `6afc85c987fe70a139886b22` / `5454238` passed all three mobile smoke tests. Real email/payment lifecycle and backup/rollback rehearsal remain open launch checks.

## Incident triage and recovery

1. The operator records the affected site, first observed time in UTC,
   deployed commit, symptoms and the next update time. Use the public smoke
   checks to identify which flows are affected. Keep account details and secrets
   out of the incident log.
2. For an outage or payment regression, pause promotion and use the rollback
   procedure above if the incident began with a deploy. For a billing-data
   incident, check Stripe delivery history and the app’s billing state before
   replaying an event. Reconcile checkout, entitlement, withdrawal and delivery
   records with the matching Stripe or Resend event. Use the separate
   [billing runbook](billing.md) for refund and withdrawal handling.
3. Rehearse database recovery in an isolated target. Verify the restore timestamp,
   schema permissions, representative row counts and billing reconciliation
   before directing any traffic to a restored database. Keep the exercise open
   until these checks pass and the time to restore has been recorded.
4. Before paid launch, configure uptime and failure alerts to reach the operator.
   Exercise an alert for a failing probe, a Stripe webhook delivery failure and
   a transactional email failure. Record the recipient, timestamps and recovery
   result in the launch tracker.
