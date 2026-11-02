# Netlify deployment

Selected 2026-10-24 for the first Axyro staging deployment. Start on Netlify Free;
do not enable paid upgrades or automatic credit recharge without an operator
decision. L03 stays open until a deployed URL and the hosting checks are verified.

## Billing staging — 2026-11-02

The operator approved a separate Free Netlify project `axyro-staging`, deployed
from `ZhyrovDmytro/axyro` main at `https://axyro-staging.netlify.app`.
It has its own canonical APP_URL, four sandbox prices, protected Stripe API and
webhook keys, and AI planning disabled. Credentials are populated only in this
project's Production context, not previews, branch deploys, agent runners or CLI
local contexts. The public project `axyro-training` has no Stripe credentials.

The operator explicitly approved temporarily sharing the existing Axyro Supabase
connection to avoid another paid database. This is a separate website, **not an
isolated database**. Use a new regular test account; sandbox Pro status is also
visible on the public site for that account. Cancel and remove its sandbox billing
association before enabling live Stripe. Do not switch stored sandbox customers
to live keys. The exact staging auth callback was added without changing the
production Auth Site URL or previous allowlisted callbacks.

All existing hosted migrations and checkout-reservation privileges were verified.
The new project uses the same Node.js 24/webpack build settings. Bulk import marked
the public SUPABASE_URL as secret, so staging excludes only that public identifier
with `SECRETS_SCAN_OMIT_KEYS=SUPABASE_URL`. Scanning remains enabled for actual
credentials. See [sandbox verification and test steps](BILLING_SANDBOX_TEST.md).

## Custom domain — 2026-11-01

- Primary origin: `https://axyro.app`, registered and managed through Cloudflare.
- Netlify redirects `www.axyro.app` to the primary domain. The original
  `axyro-training.netlify.app` address remains available.
- Cloudflare DNS uses DNS-only CNAME records: `@` points to
  `apex-loadbalancer.netlify.com`; `www` points to `axyro-training.netlify.app`.
  Cloudflare flattens the apex CNAME. Nameservers remain with Cloudflare.
- Netlify confirms Let's Encrypt HTTPS for both hostnames, with automatic renewal.
- `APP_URL=https://axyro.app` is saved with the existing scopes/context policy.
  Deploy `6ae73419c9b447d39154fc25` published `ab1875e` successfully after the
  environment update. AI planning remains disabled.
- Verified the HTTPS homepage, `www` redirect and free-workout navigation/start/
  pause in the browser.
  Full timed completion and real provider lifecycle checks remain open.

Local browser storage is scoped to the origin. Guest settings/history saved on
the old Netlify address are not automatically moved to the custom domain; retain
the old address for access to that local data. Account synchronization requires
the separately verified signed-in flow.

## Initial deployment — 2026-10-24

- Live preview: https://axyro-training.netlify.app/
- Dashboard: https://app.netlify.com/projects/axyro-training/overview
- Initial successful deploy: `6adccab4e4301aaaa1a5b8b8`, source commit `6322cad`.
- GitHub `main` is connected for continuous deployment. Netlify labels this its
  production deployment; it is currently our public staging preview, with no
  separately configured staging/production pair.
- `APP_URL=https://axyro-training.netlify.app`; `AI_PLANNER_ENABLED=false`.
  No Supabase, Stripe or OpenAI secrets were supplied for this deployment.
- Existing account dashboard confirms Free at $0, no payment method, 300 build
  minutes and 100 GB bandwidth per month. These are this account's legacy
  allowances; do not assume the current public credit-based pricing applies.
- The plain `axyro` project name was unavailable. A custom domain can be selected
  later without changing the product name.
- Homepage, library preview, free-player start/mute/pause/resume/skip/save-exit,
  auth session JSON and unavailable-billing fallback were checked live. Full
  timed completion, provider lifecycle and real-device checks remain open.

See L03 in the launch tracker for remaining checks and the observed console issue.

## Repository and build

- Repository: `ZhyrovDmytro/axyro`, branch `main`, base directory: repository root.
- Import an existing project from GitHub in Netlify; grant access only to this
  repository when installing/configuring the GitHub integration.
- `netlify.toml` sets Node.js 24, `npm run build -- --webpack`, and publish directory
  `.next`. Webpack is the locally verified production build path.
- Keep Netlify's automatic Next.js/OpenNext adapter. Do not add a static SPA
  redirect or upload `public` as the entire site: auth and billing need server routes.
- Leave `AXYRO_NEXT_DIST_DIR` and its legacy alias unset on Netlify so output
  matches `.next`. Keep the root directory name independent of the product name.
- Git pushes should trigger builds after the repository connection is complete.

## First deployment

1. Sign in/create the operator's Netlify account and select the Free plan.
2. Import the repository with the settings above, then deploy.
3. Record the assigned `https://<project>.netlify.app` URL in the launch tracker.
4. In Netlify's environment settings, set `APP_URL` to that exact HTTPS origin
   and `AI_PLANNER_ENABLED=false` for both builds and server functions, then
   redeploy. TOML build environment variables alone do not configure function
   secrets/runtime settings.
5. Verify guest home, library preview and the free workout. Account creation and
   paid access remain unavailable until Supabase/Stripe are configured.

Do not copy `.env.local` into Netlify or upload secrets through Git. It contains
optional local AI credentials which the initial preview does not require.

## Connect accounts and payments later

Use the server-only variable names in `.env.example`. Set secrets in Netlify's
environment settings with the required Functions scope and deploy context.
Never prefix secrets with `NEXT_PUBLIC_`.

- Supabase: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`;
  apply migrations and configure the site URL, callback and email provider.
- Stripe test mode first: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, monthly
  and/or yearly Price IDs; webhook URL is `<APP_URL>/api/billing/webhook`.
- Optional AI: enable only after the privacy/data decision and cost limits are
  complete; keep disabled for this first staging deployment.
- Do not expose live billing secrets to arbitrary pull-request deploy previews.
  Use a stable staging project/origin and test-mode provider configuration.

See [authentication](AUTHENTICATION.md), [billing](billing.md) and the
[launch tracker](LAUNCH_READINESS.md) for provider and release checks.

## Verify after deployment

Use [release checks and rollback](RELEASE_CHECKS.md) for CI, the deployed guest
smoke command and the repeatable release/rollback procedure.

- Confirm build success and that the deployment uses Node production mode.
- Check guest navigation, media delivery and a complete free workout on mobile.
- Check `/api/auth/session` returns JSON; development admin login is disabled.
- Check `/upgrade` handles unconfigured subscriptions gracefully.
- Confirm no secret values appear in client assets or logs.
- Once providers are connected, verify real login, data isolation, checkout,
  webhook, cancellation and account deletion on the deployed origin.
- Configure usage alerts, review credit consumption and rehearse rollback to a
  prior deployment. Free projects pause at their usage limit.

No paid public launch is implied by publishing this preview. Legal, media rights,
provider setup and the remaining release tasks still need completion.

## References

- [Netlify Next.js support](https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview/)
- [Node.js build/runtime selection](https://docs.netlify.com/build/configure-builds/manage-dependencies/)
- [Netlify pricing](https://www.netlify.com/pricing/)
