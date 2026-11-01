# Authentication operations

Axyro is a Next.js web application. Supabase Auth owns passwords, Google OAuth, email verification and refresh tokens. The application uses Supabase's documented REST API and PKCE flow without adding a browser auth SDK. Tokens stay in HttpOnly SameSite=Lax cookies and are verified against `/auth/v1/user`. Cookies use Secure in production. Every authenticated request reads the trusted profile role; signup metadata cannot assign an admin role.

Set server environment variables `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, and `SUPABASE_SECRET_KEY`. Never prefix the secret key with NEXT_PUBLIC. Legacy `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` remain fallback aliases when the corresponding modern variable is unset. Modern keys travel only in the `apikey` header; signed-in requests additionally send the user's JWT as bearer authorization. Legacy JWT keys retain bearer compatibility. Apply the migrations in `supabase/migrations` before enabling account creation. Configure Supabase Site URL for the deployment origin and allow `<origin>/auth/callback` as a redirect. Enable Google in Supabase and configure its Google client ID and secret, with the Supabase-provided OAuth callback in Google Cloud. This is web-only; Apple distribution is not currently targeted.

Enable email confirmation, production SMTP and provider rate limiting. Supabase signup/recovery emails must use the provider confirmation URL so PKCE yields a callback `code`. Signup and reset verification must be completed in the same browser that started the flow, because the verifier is in an HttpOnly cookie. Invalid, expired and cancelled callbacks return to sign in with an error. Recovery redirects to `/reset-password`; a short-lived HttpOnly recovery marker authorizes password replacement. Ordinary password changes additionally require the current password. OAuth-only users manage credentials with their provider.

Signup without a session returns the same verification response for a new account
and an obfuscated existing-account response from Supabase. The UI describes email
confirmation conditionally and offers sign-in/password-reset links in the status
message. Do not add an account-existence lookup to this public flow. See
[Supabase signup behavior](https://supabase.com/docs/reference/javascript/auth-signup).

Profiles contain only display metadata and a separately protected role. Users may edit only display name, avatar and timestamps; role and owner ID are not writable by authenticated clients. Create production admins explicitly using a trusted SQL operation on `profiles.role`, never user metadata. Existing Supabase identities receive profiles during migration.

The hardcoded owner testing exception is `dmytrozhyrov@gmail.com` (case-insensitive, exact address; no aliases). After Supabase verifies the session and reports a confirmed email, the server promotes that account's existing profile to `admin` using the server-only Supabase secret/service-role key. This grants full Pro access in production and satisfies database plan-write guards without a subscription. Unconfirmed emails and signup metadata never trigger the grant. Already-admin profiles are not rewritten. This is a persistent role assignment: removing the exception later also requires explicitly resetting the profile role if access should be revoked.

In development/test only, signing in with `admin` / `admin` issues a server-HMAC session for eight hours. The key is random per server process, so restart invalidates it. Neither login nor verification accepts this shortcut when NODE_ENV=production; there is no production development-secret override. This identity does not create a database user and its data remains device-local. Production deployment must run a production Next build, not the development server.

Local development supports both `http://localhost:3000` and
`http://127.0.0.1:3000`. When Next normalizes a loopback request URL, mutation
checks accept the browser's actual loopback Host only with the same protocol
and port in development/test. Production still requires an exact origin match.
The development admin receives full Pro application access without Supabase or
Stripe setup; cloud account operations and real purchases require real accounts.

Account deletion requires the literal DELETE confirmation, a verified session and same-origin POST. The server cancels billing first, then deletes the Supabase identity with its server-only service key. Cascading foreign keys remove profile, training data and subscription rows. If billing cancellation fails, deletion fails rather than leaving an orphaned subscription. Logout invalidates the provider session and clears application session cookies.

External setup remains operational work: Google credentials, Supabase project/SMTP/redirect configuration, migrations, Stripe products/webhooks and production environment secrets cannot be supplied by this repository. No credential has been committed or fabricated.

Provider references: [PKCE](https://supabase.com/docs/guides/auth/sessions/pkce-flow), [password authentication](https://supabase.com/docs/guides/auth/passwords), [REST API contract](https://github.com/supabase/auth/blob/master/openapi.yaml).


Confirmation email branding (2026-11-01): the hosted Confirm sign up template
now uses `supabase/templates/confirmation.html`, subject “Welcome to Axyro —
confirm your email”, and the generated welcome guide. Sender remains
Axyro <noreply@auth.axyro.app>. Exact persisted HTML was verified after reload;
new inbox rendering remains to be tested. See [email operations and asset
provenance](EMAIL_CONFIRMATION.md). Repository deployment does not sync these
Dashboard settings automatically.


Account loading uses a centered Axyro mark and an indeterminate CSS spinner with
one polite status announcement and concise text. The spinner stops under reduced
motion. It reflects the existing session/data request lifecycle without simulated
percentages or an added minimum wait; error/retry behavior is unchanged.

Form presentation (2026-11-01): registration, sign-in, password recovery and
password replacement share a responsive split layout using the existing Axyro
welcome illustration on desktop. Mobile prioritizes the form. Email is the
primary action, with Google as a secondary option on sign-in and registration.
Profile and security fields use the shared field treatment; each password field
has an independent, keyboard-accessible visibility control. Password validation,
provider endpoints, redirect sanitization, confirmation messages and deletion
confirmation requirements are unchanged. Browser coverage in
`tests/e2e/forms.spec.ts` checks 320px, 390px and 1440px layouts, accessibility,
password visibility, signup validation, recovery feedback and service fallback.

Login and registration now use distinct transparent character illustrations:
login shows a thumbs-up greeting and registration an open-hand welcome. Both
follow the supplied character reference with Axyro orange accents. Recovery and
password replacement retain the existing welcome illustration. Generation prompts
and asset provenance are recorded in [Account image prompts](AUTH_IMAGE_PROMPTS.md).

Password-change feedback (2026-11-01): account security shows an Updating password
action with an indeterminate spinner, locks the fields during the request and
announces success beside the form. Failures and password mismatches are displayed
there too; failed requests preserve the fields for retry. A successful change
clears the fields. Password replacement after recovery remains on an explicit
Password updated screen with a Continue to account action, avoiding a session
refresh that would unmount the confirmation. Reduced motion stops the spinner.

Supabase's hosted Password changed security notification is enabled for the Axyro
project and was verified on after reload. The existing provider template is
retained. Supabase triggers it after a successful password change, including
recovery; the application does not send a separate message or include password
values in email. This is a hosted setting, independent of repository deployment.
Live inbox delivery after a real change remains unverified. See
[Supabase email templates](https://supabase.com/docs/guides/auth/auth-email-templates).

Google OAuth is configured in production as of 2026-11-01: the dedicated Google
Cloud project is `axyro-513421`, its External audience is published and Supabase
Google is enabled. Only basic identity scopes are declared. A signed-out
production Google login and a subsequent account reload succeeded with the
existing profile and Admin access preserved. Google currently labels consent with
the Supabase project domain; custom brand verification and new Google-only signup
are not verified. Localhost callbacks were not added. See
[Google configuration and verification](SUPABASE_SETUP.md#google-oauth--2026-11-01).
