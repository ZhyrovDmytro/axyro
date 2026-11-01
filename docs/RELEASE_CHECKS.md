# Release checks and rollback

L19 in [the launch tracker](LAUNCH_READINESS.md) owns this process. Passing CI
does not close the account, billing, legal, media-rights or device launch gates.

## Pull requests

The `Release checks` GitHub Actions workflow runs on pull requests and pushes to
`main`, using Node.js 24 and the committed lockfile without installation scripts.
It runs zero-warning ESLint, Next.js route type generation, TypeScript, unit tests,
the dependency audit (high/critical fail), the webpack production build and guest
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
PLAYWRIGHT_BASE_URL=https://axyro-training.netlify.app npx playwright test --config=playwright.release.config.ts
```

Setting the URL disables the local server. Tests use real public routes without
mocking provider APIs or logging in. They check public pages, disabled development
administrator access, guest billing status, and free-player start, audio toggle,
pause/resume and completion by skipping intervals. This is not verification of
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
changes or provider state. This change adds no migrations. For future releases
with migrations, plan compatible recovery under L04 before publishing. A rollback
drill remains unverified until the operator actually republishes and checks a
previous deployment; deploy history availability alone is not a rehearsal.

References: [Playwright CI](https://playwright.dev/docs/ci),
[Playwright web servers](https://playwright.dev/docs/test-webserver),
[GitHub Node setup](https://github.com/actions/setup-node),
[Netlify deploy management](https://docs.netlify.com/deploy/manage-deploys/manage-deploys-overview/).
