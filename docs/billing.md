# Web subscriptions

Axyro uses Stripe Checkout and Customer Portal with one `pro` entitlement. Prices are retrieved from Stripe; configure monthly and/or annual recurring Price IDs. No trial is introduced. No card data reaches the application.

For the current provider verification, deployment prerequisites and operator
purchase checklist, see [sandbox billing handoff](BILLING_SANDBOX_TEST.md).

Required server environment: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_MONTHLY_PRICE_ID` and/or `STRIPE_YEARLY_PRICE_ID`, `APP_URL` (canonical deployment origin), plus the Supabase server configuration in the authentication setup. Keep secrets out of `NEXT_PUBLIC_*` variables. Apply all SQL migrations in filename order. Enable subscription management/cancellation in Stripe's Customer Portal.

Approved regional membership prices are EUR 6.99/month or EUR 59.99/year and
USD 7.99/month or USD 69.99/year. The original monthly/yearly environment
variables hold EUR prices; optional `STRIPE_USD_MONTHLY_PRICE_ID` and
`STRIPE_USD_YEARLY_PRICE_ID` add USD prices to the same product and Pro
entitlement. Prices come from Stripe rather than client-side exchange-rate
conversion. The paywall defaults to USD when configured, otherwise the available
currency; customers can choose their currency and retain their billing period.
Only that currency's plans are shown. Existing single-currency configurations
continue to work without showing a currency picker. These are sandbox prices
until live setup is verified; tax treatment remains a launch prerequisite.

Configure Stripe's signed webhook endpoint at `/api/billing/webhook` for `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, and `invoice.payment_failed`. The REST API is pinned to `2025-06-30.basil`; subscription expiry comes from subscription items. Webhook delivery must use the endpoint signing secret, not the API secret.

`GET /api/billing/products` supplies provider amounts in minor currency units and recurring intervals. `POST /api/billing/checkout` accepts a configured `priceId` and a same-application allowlisted `returnTo` (`/onboarding`, `/plan`, `/account`, `/workouts`, `/exercises`, `/activity`). A success redirect never grants access. The UI must call restore and wait for trusted status before continuing plan generation. `POST /api/billing/restore` fetches current provider state for the authenticated user's saved customer. `POST /api/billing/portal` creates a provider management session. Identity comes from the verified server session, never request payloads.

Signed webhooks fetch current subscription state instead of trusting the event snapshot, so retries and old deliveries reconcile current provider state. Repeated reconciliation is safe. Customer creation uses a stable Stripe idempotency key. Billing rows are unique per user/customer and writable only with service credentials; users can read their own row under RLS. Customer identity is established before Checkout, never linked by matching an email from an incoming webhook.

The central `hasEntitlement` function grants admins Pro and grants ordinary users active/trialing paid periods (and explicitly scheduled cancellations) only before their explicit expiry. Immediate provider cancellation revokes Pro. Scheduled cancellation preserves access to period end. Past due, unpaid, incomplete, paused and expired states fail closed. Plans and history remain stored after downgrade. Account deletion cancels provider subscriptions before deleting identity and cascading application billing data; provider failures prevent deletion so billing is not silently orphaned. Stripe retains financial records under its own retention requirements.

Operational rollout requires actual Supabase and Stripe credentials, hosted database migration, configured Google provider, webhook delivery, and a real Stripe test-mode checkout/portal/cancellation exercise. Unit tests cannot establish external provider configuration. Web checkout is the supported platform; this repository has no native purchase system, so Restore synchronizes the signed-in Stripe customer rather than a device store receipt.

Checkout concurrency is enforced by the service-only `reserve_billing_checkout` PostgreSQL function, which locks the customer row and reserves one immutable UUID, price, continuation and exact expiration for 23 hours. Concurrent clicks, different prices, different destinations and server instances reuse the same Stripe idempotency key and identical parameters. A live provider subscription check also blocks a second subscription before webhook delivery. An abandoned checkout remains reusable until its exact provider expiration; changing its selected product requires allowing it to expire. This intentionally favors preventing duplicate billing over creating parallel hosted payment sessions. Provider subscription listing follows `has_more`/`starting_after` pagination for reconciliation, checkout checks and account deletion, including customers with more than 100 historical subscriptions.

## Purchase confirmation and withdrawal

The paywall shows the selected amount and recurring period before handing off
to Stripe. A previously reserved checkout for another price returns a conflict
and displays the existing price and expiry. The customer confirms that price
with a new action before continuing. When operator details and billing email are configured, Axyro
requires an explicit terms acknowledgment and records the accepted version in Stripe Checkout session metadata. The
signed checkout webhook sends an email with the purchase reference, amount,
renewal, operator, terms and withdrawal instructions after payment. The paywall links to the full membership terms.
Set accessible, explicit payment-obligation wording in the hosted flow and
verify it visually in each launch locale.

Apply the billing withdrawals migration before enabling contractual checkout.
Set the operator variables in `.env.example` to the published Czech trader
details. Configure a scoped Resend sending key, verified sender and monitored
support inbox. Monitor the `retry-withdrawal-email` function logs and verify
a retry on staging with Netlify’s Run now control. Sandbox can use the same flow with isolated settings. For live
checkout, confirm the effective tax treatment and inclusive Price settings before
setting `AXYRO_LIVE_CHECKOUT_ENABLED=true`. An inclusive price setting controls
how prices are presented. Configure actual tax collection and reporting separately
according to the operator's situation.

Customers can open `/withdrawal` from Membership and Terms, supply the contract
reference or purchase date, and review before confirming. The server stores the
notice and UTC timestamp independently of mail delivery, then sends the dated
notice to the customer and alerts the support inbox. The page provides a
downloadable copy even if email delivery fails. Reusing a submission ID keeps
the original timestamps and inputs. A failed receipt can be retried on the page. On Netlify, a scheduled function also retries pending emails every five minutes for up to 23 hours. It scopes reads and updates to the current Netlify site, including when staging and production share a database. Review older pending deliveries manually against Resend before resending. Supabase service credentials alone can query the underlying records.

The operator monitors support and the unresolved withdrawal rows in Supabase.
Compare the recorded contract reference, purchase and signed-in account in
Stripe before taking financial action. Where a refund is due, stop the linked
subscription, refund the appropriate paid invoice in Stripe, verify the
application receives the cancellation and inform the customer. Record the
resolution timestamp. Handle notices promptly, including those received by
email, and send any refund due within the applicable deadline. When an email
delivery timestamp is missing, verify the Resend event before resending and
update the record only once delivery has been accepted. Do not copy customer
details into the launch tracker.

Before live activation, complete an authorized hosted sandbox payment and confirm
terms acceptance on Axyro, contract email, withdrawal acknowledgment, operator handling,
refund and entitlement removal on the same test purchase. Verify Czech-language
terms, final tax handling, scope of the right of withdrawal, and actual business
details before opening Czech sales. See the [Czech implementation](https://e-sbirka.gov.cz/sb/2026/159)
and [EU directive](https://eur-lex.europa.eu/eli/dir/2023/2673/oj).
