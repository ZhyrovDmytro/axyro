-- Auth owns identity; existing validated domain repositories own payload schemas.
create table if not exists public.user_training_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  revision bigint not null default 1,
  updated_at timestamptz not null default now(),
  constraint payload_is_object check (jsonb_typeof(payload) = 'object'),
  constraint bounded_payload check (octet_length(payload::text) <= 4000000)
);
alter table public.user_training_data enable row level security;
create policy "Read own training data" on public.user_training_data for select to authenticated using (auth.uid() = user_id);
create policy "Insert own training data" on public.user_training_data for insert to authenticated with check (auth.uid() = user_id);
create policy "Update own training data" on public.user_training_data for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Delete own training data" on public.user_training_data for delete to authenticated using (auth.uid() = user_id);
grant select, insert, update, delete on public.user_training_data to authenticated;

-- Atomic compare-and-swap prevents one browser silently overwriting another.
create or replace function public.save_user_training_data(next_payload jsonb, expected_revision bigint)
returns boolean language plpgsql security invoker set search_path = '' as $$
declare affected integer;
begin
  if auth.uid() is null then return false; end if;
  if expected_revision = 0 then
    insert into public.user_training_data(user_id, payload, revision)
      values(auth.uid(), next_payload, 1) on conflict (user_id) do nothing;
  else
    update public.user_training_data set payload = next_payload, revision = revision + 1, updated_at = now()
      where user_id = auth.uid() and revision = expected_revision;
  end if;
  get diagnostics affected = row_count;
  return affected = 1;
end; $$;
revoke all on function public.save_user_training_data(jsonb, bigint) from public, anon;
grant execute on function public.save_user_training_data(jsonb, bigint) to authenticated;

-- Enforce the same plan-write boundary for direct PostgREST access, not only UI/API.
create or replace function public.guard_personalized_plan_write()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare previous_plan jsonb;
begin
  if TG_OP = 'UPDATE' then previous_plan := OLD.payload->'veyro.training-plan.v1'; end if;
  if NEW.payload->'veyro.training-plan.v1' is not null
     and (NEW.payload->'veyro.training-plan.v1') is distinct from previous_plan
     and not exists(select 1 from public.profiles where user_id = auth.uid() and role = 'admin')
     and not exists(select 1 from public.subscriptions where user_id = auth.uid()
       and (status in ('active','trialing') or (status = 'canceled' and cancel_at_period_end)) and expires_at > now()) then
    raise exception 'Pro is required to save personalized plans' using errcode = '42501';
  end if;
  return NEW;
end; $$;
create trigger protect_personalized_plan before insert or update on public.user_training_data
  for each row execute function public.guard_personalized_plan_write();
