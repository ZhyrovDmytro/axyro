# Request protection

Production uses atomic PostgreSQL counters, shared across server instances.
Development/test mode bypasses counters so local work does not need hosted
credentials. No in-memory production fallback exists. Missing credentials,
missing migration, invalid counter responses or provider errors deny protected
work with 503 and `Retry-After: 30`. Exhausted quotas return 429 and the database's
remaining window duration. Responses are `no-store`.

| Action                                        | Subject                    | Fixed-window limit       |
| --------------------------------------------- | -------------------------- | ------------------------ |
| Password sign-in                              | Normalized email           | 10 attempts / 15 minutes |
| Signup                                        | Normalized email           | 5 attempts / 15 minutes  |
| Recovery email                                | Normalized email           | 3 attempts / 15 minutes  |
| Password change                               | Verified user ID           | 5 attempts / 15 minutes  |
| Account deletion                              | Verified user ID           | 3 attempts / 15 minutes  |
| Plan generation                               | Verified Pro/admin user ID | 6 requests / hour        |
| Checkout, portal and billing restore combined | Verified user ID           | 10 requests / 15 minutes |

Quotas count requests, including requests that subsequently fail validation or
provider work. Signup/sign-in/recovery quotas start after their input schemas
pass; password/deletion quotas start after verified authentication and form
validation. No success/existence-dependent identity bucket is used for public
auth operations. Logout remains available when other quotas are exhausted.

Buckets store an action prefix and HMAC-SHA256 digest of canonical APP_URL and
normalized subject, keyed by the existing server secret. Public auth subjects
combine the connecting client IP and normalized email, avoiding an account-wide
lockout that another IP could trigger against a known email address. They contain no raw
email, user ID, IP or token. Changing the server key or canonical origin resets
that deployment's effective counters. Staging has a distinct APP_URL namespace.
Expired buckets are invalid immediately and up to 100 are physically removed
per subsequent quota request; no-traffic periods can retain expired opaque rows
until the next request. RLS and grants exclude anonymous and signed-in clients;
only service-role requests can invoke the counter function. The function is
SECURITY INVOKER and does not elevate its caller.

Only public Stripe price reads use the Next.js data cache (five minutes).
Customer/subscription reads and all mutations remain uncached. Prices shown
briefly after a provider update may be stale; Checkout still validates the real
configured price with Stripe. The model client has a 20-second request timeout,
no automatic SDK retries, at most two application validation attempts and the
existing output-token cap. Keep AI disabled until the hosted quota and privacy
checks are verified.

Public auth additionally requires Netlify's read-only `SITE_ID` runtime variable
and a valid single `x-nf-client-connection-ip` address. Missing/invalid platform
identity fails closed; generic X-Forwarded-For and client-ip headers are ignored.
Other hosting adapters require a reviewed trust boundary; do not merely set
SITE_ID on an untrusted/direct server. Before rollout, verify Netlify overwrites
forged incoming platform-IP headers and different source IPs get distinct buckets.
The supported platform header is documented by [Netlify staff](https://answers.netlify.com/t/upcoming-change-stripping-exposed-netlify-headers-from-function-and-proxy-requests/52665),
and runtime variables by [Netlify's function guide](https://docs.netlify.com/build/functions/environment-variables/).

These are application quotas, not a perimeter DDoS control or a global currency
spend cap. Supabase's own limits remain in force; provider client-IP forwarding,
CAPTCHA/edge controls, provider alerts and project budgets need separate hosted
verification.

## Deployment order

1. Obtain explicit permission to resume the existing paused Axyro project;
   resume does not authorize an upgrade or paid plan change.
2. Apply `supabase/migrations/20261117092915_api_rate_limits.sql` to the actual
   Axyro database, then verify grants and RPC behavior through the deployed
   server's key. Do not use the unrelated active project.
3. Verify the platform IP/SITE_ID reach the Next.js handlers and spoofed
   incoming IP headers cannot select a fresh quota. Verify concurrent requests
   exhaust the same bucket across instances and
   invalid/error responses fail closed. Use a dedicated test account/namespace;
   do not exhaust a real user's production login quota.
4. Pass hosted release checks, then deploy application code. **Deploying this
   code before the migration makes protected operations return 503.**
5. Verify signup/sign-in/recovery, Pro generation, checkout/portal/restore,
   cross-account isolation and Retry-After on the appropriate hosted environment.

The migration is additive. Previous app versions ignore its table/function, so
application rollback does not require deleting counters or changing user data.
It also removes quota enforcement, which must be considered when rolling back.

## Regression checks

Vitest covers subject normalization and environment separation, response bounds,
429/503 behavior and blocking provider side effects. The SQL assertions in
`tests/security/rate-limit.sql` cover grants/RLS, exact allowance, exhaustion,
subject isolation, expiry and invalid quotas. Run them after the migration in an
isolated PostgreSQL database with the `anon`, `authenticated` and BYPASSRLS
`service_role` roles. The SQL test rolls back its synthetic counters.

The `quality` CI job creates an ephemeral PostgreSQL 17 service, applies the
migration, runs those assertions, then sends 20 independent requests against a
three-request quota and requires exactly three successes. Hosted execution must
still be verified; local PGlite tests do not establish multi-connection behavior
on the hosted database.
