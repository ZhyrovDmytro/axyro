create table public.billing_withdrawals (
  site_id text not null,
  id uuid not null,
  name text not null,
  contract_reference text not null,
  email text not null,
  submitted_at timestamptz not null default now(),
  receipt_sent_at timestamptz,
  operator_notified_at timestamptz,
  last_delivery_attempt_at timestamptz,
  resolved_at timestamptz,
  primary key (site_id, id)
);
create index billing_withdrawals_pending_delivery
  on public.billing_withdrawals (site_id, last_delivery_attempt_at asc nulls first, submitted_at)
  where receipt_sent_at is null or operator_notified_at is null;
alter table public.billing_withdrawals enable row level security;
revoke all on public.billing_withdrawals from public, anon, authenticated;
grant select, insert, update on public.billing_withdrawals to service_role;

create table public.billing_contract_confirmations (
  checkout_id text primary key,
  sent_at timestamptz not null default now()
);
alter table public.billing_contract_confirmations enable row level security;
revoke all on public.billing_contract_confirmations from public, anon, authenticated;
grant select, insert on public.billing_contract_confirmations to service_role;
