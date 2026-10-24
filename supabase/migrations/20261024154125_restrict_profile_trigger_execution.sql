-- Supabase default privileges can grant these roles EXECUTE independently of PUBLIC.
-- The auth.users trigger invokes this internally; clients must never call it via RPC.
revoke all on function public.create_user_profile() from public, anon, authenticated;
