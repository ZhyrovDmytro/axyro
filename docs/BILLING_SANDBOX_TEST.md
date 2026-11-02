# Sandbox billing handoff

Prepared 2026-11-02 (Europe/Prague). This is the L06/L08 test plan, not approval
to accept live payments. Hosted sandbox configuration is still pending.

## Verified provider configuration

- Dedicated Stripe account: **Axyro sandbox**, `acct_1UWlxJRrXPiiRoHs`.
  This is separate from the older Axyro Test mode account.
- Product: `prod_VYDabQuFiM7BcG`. All four prices were retrieved through the
  Stripe API, active and `livemode=false`: EUR 6.99/month, EUR 59.99/year,
  USD 7.99/month and USD 69.99/year.
- Default portal `bpc_1UX7ChRrXPiiRoHsuyG3chKX` is active, with payment-method
  updates, invoice history and cancellation at period end enabled.
- No sandbox webhook endpoints existed at inspection. The existing public
  Netlify project has no Stripe variables configured.

## Configuration required before testing

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
