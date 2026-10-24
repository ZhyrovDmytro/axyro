# Axyro Supabase setup

## Project — 2026-10-24

- Organization: ZhyrovDmytro's org (`wldmraxmhldflwkovyzr`), Free.
- Project: Axyro (`unrlqkymbdnpmgmmfltb`), Frankfurt (`eu-central-1`).
- Dashboard: https://supabase.com/dashboard/project/unrlqkymbdnpmgmmfltb
- API origin: https://unrlqkymbdnpmgmmfltb.supabase.co
- Creation quote: $0/month; project created active/healthy.
- The other project, ZhyrovDmytro's Project, is unchanged.

## Applied schema and verification

The four original repository migrations were applied in order through Supabase
MCP, then `restrict_profile_trigger_execution` was applied to remove direct API
execution privileges inherited from Supabase's default function grants.

- `profiles`, `subscriptions`, `user_training_data` exist with RLS enabled.
- `anon` and `authenticated` cannot execute `create_user_profile()` directly.
- Security advisors returned no findings after the permission fix.
- A transaction inserted a temporary auth identity, verified its profile and
  trusted `user` role despite metadata requesting admin, then rolled back.
  No test account was retained.

MCP assigned remote migration versions independently of the local filenames.
Do not run an unreviewed CLI `db push`: reconcile migration history first so
the original migrations are not replayed. Match migrations by name/content.
Remote original versions: `20261024154025` profiles, `20261024154030`
subscriptions, `20261024154033` user_training_data, `20261024154036`
checkout_reservations. Use `list_migrations` for the current remote history.

## Next: connect Netlify and Auth

Configure server-only `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, and
`SUPABASE_SECRET_KEY` in Netlify Functions/build environment settings.
Keep privileged keys out of chat, source control, browser assets and logs.
The project URL and publishable key are now saved in Netlify; the publishable
key is marked secret and only set for the production deploy context. The
privileged secret is pending approval at the access-grant step. On this Free
plan, secret variables have Builds, Functions and Runtime scopes; narrower
scope selection requires an upgrade. Preview, branch, agent and local values
remain empty. No paid upgrade is needed for this configuration.

The application now supports Supabase's modern API keys while retaining legacy
environment aliases. Tests cover modern public/admin requests, user JWTs and
legacy behavior. See the [official migration guide](https://supabase.com/docs/guides/getting-started/migrating-to-new-api-keys).

Set Auth Site URL to `https://axyro-training.netlify.app` and allow its
`/auth/callback` redirect. Both URLs are now saved and verified in the dashboard.
Email signup and confirmation are enabled; anonymous sign-in is disabled.
Custom SMTP and Google OAuth are currently disabled. Configure SMTP and Google OAuth as
described in [authentication operations](AUTHENTICATION.md), then redeploy and
test actual signup, recovery, account deletion and two-user data isolation.
Account/provider setup is not complete merely because tables exist.

Free projects can pause after inactivity. Automatic backups are not included;
define and test a backup/restore procedure before accepting paying customers.
