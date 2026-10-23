-- Only trusted server credentials may write billing state. No client tier overrides.
create table if not exists public.subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  customer_id text not null unique,
  subscription_id text unique,
  status text not null default 'free' check (status in ('free','active','trialing','past_due','canceled','unpaid','incomplete','incomplete_expired','paused')),
  expires_at timestamptz,
  cancel_at_period_end boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table public.subscriptions enable row level security;
revoke all on public.subscriptions from anon, authenticated;
grant select on public.subscriptions to authenticated;
create policy "Read own subscription" on public.subscriptions for select to authenticated using ((select auth.uid()) = user_id);
