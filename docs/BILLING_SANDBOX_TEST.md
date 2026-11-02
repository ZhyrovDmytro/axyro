# Sandbox billing handoff

Prepared 2026-11-02 (Europe/Prague). This is the L06/L08 test plan, not approval
to accept live payments. The operator approved a separate Free Netlify staging
site, sandbox secret storage and temporary reuse of the existing Axyro Supabase
connection for a new regular test account.

## Hosted staging configuration

- Test origin: `https://axyro-staging.netlify.app`, separate Netlify project
  `axyro-staging`, using GitHub `ZhyrovDmytro/axyro` branch
  `codex/sandbox-billing-readiness`. The public site's main branch is unchanged.
- Supabase remains `unrlqkymbdnpmgmmfltb`; no project was created, paused or
  upgraded. Accounts, training data and subscription rows are shared with
  production. Test only with a dedicated regular account. Its sandbox Pro status
  will also be visible on the public app. Before configuring live Stripe,
  cancel/remove the test subscription association or remove the disposable test
  account through the staging account-deletion flow while sandbox keys remain
  configured. Do not switch this user's stored sandbox customer to live keys.
- Exact staging `/auth/callback` was added and verified after reload. The Auth
  Site URL remains `https://axyro.app`; confirmation email branding still links
  to the public app. Existing accounts can sign in on staging.
- Sandbox Stripe and Supabase credentials are protected in Netlify and populated
  only in this staging project's Production context. PR previews, branch deploys,
  agent runners and CLI-local contexts have no credentials. Free plan secret
  scopes include Builds, Functions and Runtime; Post processing is excluded.
- `APP_URL` points to staging and AI planning remains disabled. All four sandbox
  Price IDs are configured in this staging context.
- Active webhook: `we_1UXLcrRrXPiiRoHsSibA6eCC`, endpoint
  `https://axyro-staging.netlify.app/api/billing/webhook`, seven documented events,
  snapshot version `2025-06-30.basil`. The first endpoint
  `we_1UXLXLRrXPiiRoHslssKE4hC` was disabled and its signing configuration replaced
  after browser-tool output unexpectedly included the initial secret value.
- Supabase migrations and checkout reservation exist. Verified RLS on profiles,
  subscriptions and user training data; only service_role can execute the checkout
  reservation function, not anon or authenticated.
- A configured deploy initially failed because the bulk import also marked the
  public `SUPABASE_URL` as secret and its URL appears in setup documentation.
  Staging `SECRETS_SCAN_OMIT_KEYS=SUPABASE_URL` excludes only this public identifier;
  actual credential scanning stays enabled.
- A deployed smoke check found that Netlify passed its immutable deploy URL as
  the request URL, causing valid staging Origin headers to fail the shared
  mutation check. Production checks now use the canonical server-configured
  APP_URL when present and reject other origins, including the immutable alias.
  Regression verification: the new test failed before the fix; 426 unit tests,
  30 account/subscription/smoke browser tests, TypeScript, zero-warning lint and
  the webpack production build pass. Staging deploy verification follows below.
- Real signed webhook connectivity was verified using a zero-value sandbox
  invoice for unlinked disposable customer `cus_VYSegHai9vyo8K`, with no email,
  payment details or app-user association. Stripe event
  `evt_1UXLrXRrXPiiRoHsQj93OjNu` (`invoice.paid`) was Delivered with HTTP 200 and
  `{ "received": true }`. Reconciliation reached Stripe and the Supabase server
  API successfully without creating a subscription row or granting Pro. This is
  infrastructure verification, not a completed app subscription purchase.
- Signup/recovery/Google callbacks and callback completion/error redirects now
  share the canonical application origin, preserving PKCE cookies on the stable
  hostname. The new provider redirect tests failed before this follow-up fix.
  Final local verification: 432 unit tests, 11 account/subscription browser checks,
  TypeScript, zero-warning lint and webpack build pass. Earlier 30-test account,
  subscription and smoke regression verification also passed for the mutation fix.

## Verified provider configuration

- Dedicated Stripe account: **Axyro sandbox**, `acct_1UWlxJRrXPiiRoHs`.
  This is separate from the older Axyro Test mode account.
- Product: `prod_VYDabQuFiM7BcG`. All four prices were retrieved through the
  Stripe API, active and `livemode=false`: EUR 6.99/month, EUR 59.99/year,
  USD 7.99/month and USD 69.99/year.
- Default portal `bpc_1UX7ChRrXPiiRoHsuyG3chKX` is active, with payment-method
  updates, invoice history and cancellation at period end enabled.
- No sandbox webhook endpoints existed at initial inspection. The existing public
  Netlify project has no Stripe variables configured.

## Deployment verification

Netlify published source `e58ade54f8addc6b647697f873c9a265a8a067ea` as deploy
`6ae8c0c451730a78a9d014d8`. Deployed checks confirm configured authentication,
disabled development administrator login, all four exact provider prices,
unauthenticated checkout HTTP 401, forged webhook HTTP 400, same-origin logout
HTTP 200 and cross-origin logout HTTP 403. Google callback, refresh and callback
error redirects all remain on `https://axyro-staging.netlify.app`.
The browser membership screen loads both USD and EUR prices. The operator's
real sandbox purchase, Pro entitlement and cancellation test is the remaining
handoff; L08 remains Unverified until its results are recorded.
Both guest release smoke tests passed against this published deployment,
including public pages and free-player start/pause/resume/skip-to-completion.

## Configuration reference

The hosted setup above is complete. This is the repeatable setup procedure,
not additional work required from the operator before the purchase test.

1. Select and deploy a stable test origin. A separate staging project is
   recommended; creating it and storing hosted credentials require operator
   approval. Do not assume the existing Netlify alias is a separate environment:
   it serves the same deployment as `axyro.app`.
2. Configure Supabase authentication and all migrations, including
   `202610170004_checkout_reservations.sql`. Prefer an isolated test database.
   The subscription table has one Stripe customer per user and no sandbox/live
   namespace: do not run different Stripe accounts against the same user records.
   Before sharing any production database with staging, explicitly decide the
   access scope and migration/cleanup plan; do not copy privileged keys silently.
3. Set `APP_URL` to the exact test origin and add its exact `/auth/callback` to
   the Supabase redirect allowlist. Keep AI planning disabled.
4. Store the existing sandbox `STRIPE_SECRET_KEY` and the four configured Price
   IDs in the intended Netlify project/context. Keep secrets server-only, protected
   and unavailable to arbitrary PR previews. Do not copy the entire `.env.local`.
5. Create the sandbox webhook at `<test-origin>/api/billing/webhook`, pinning
   `2025-06-30.basil`. Enable the seven events listed in [billing](billing.md).
   Store that endpoint's `STRIPE_WEBHOOK_SECRET` in the same server context.
6. Redeploy so Functions receive the variables. Verify products return the four
   expected prices, unauthenticated checkout returns 401, forged webhook delivery
   returns 400, and development administrator login is unavailable.
7. Record the origin, source commit, deploy ID and webhook ID in
   [launch readiness](LAUNCH_READINESS.md). Do not record credentials.

## Operator purchase test

Use a regular confirmed account. The owner account has Admin access, already
receives Pro and intentionally cannot buy another subscription. Use fresh regular
accounts for independent currency/period scenarios; do not change the owner role.

1. Open Account and confirm Free membership, then choose Upgrade to Pro.
2. Check monthly/yearly prices in USD and EUR. Select the intended price and
   continue. Confirm Stripe Checkout displays test mode and the exact amount,
   currency and recurring period. Stop if it is a live checkout.
3. Complete Checkout with Stripe's test Visa `4242 4242 4242 4242`, a future
   expiry and any three-digit CVC. Use test details only; no real card is needed.
4. After returning, verify Pro appears, a protected workout opens and a personal
   plan can be created. Reload and sign in on another browser to verify persistence.
5. In Stripe, verify the matching subscription and successful signed webhook
   deliveries. A redirect alone is not proof of webhook delivery: the app also
   restores current provider status after checkout.
6. Open Account → Manage subscription. Verify invoice history and payment-method
   updates. Cancel at period end and verify the app shows the end date while Pro
   remains available until then.
7. Retry checkout/double-click before payment and confirm one hosted checkout
   and one subscription. An abandoned checkout reserves the original price and
   destination for 23 hours; changing the UI selection does not replace it.
8. With separate test accounts, exercise a declined card, payment requiring
   authentication, failed renewal, expiration, immediate cancellation and webhook
   redelivery. Verify unsuccessful/expired memberships do not grant Pro and
   duplicate or older deliveries do not restore stale access.
9. Using a disposable test account only, verify account deletion also cancels
   its subscription. Keep personal/operator accounts out of this destructive test.

Capture results without card details, credentials or customer personal data.
L08 stays Unverified until real application/provider results are recorded.
Live merchant setup, live credentials/prices, tax decisions and final purchase
disclosures remain separate launch requirements.

References: [Stripe test cards](https://docs.stripe.com/testing),
[Stripe sandboxes](https://docs.stripe.com/sandboxes),
[webhook endpoint configuration](https://docs.stripe.com/api/webhook_endpoints/create).
