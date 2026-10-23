-- Identity credentials remain exclusively in Supabase Auth.
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 100),
  avatar_url text,
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update(display_name,avatar_url,updated_at) on public.profiles to authenticated;
create policy profiles_read_own on public.profiles for select to authenticated using (auth.uid() = user_id);
create policy profiles_update_own on public.profiles for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create or replace function public.create_user_profile() returns trigger language plpgsql security definer set search_path = '' as $$
begin
 insert into public.profiles(user_id,display_name,avatar_url)
 values(new.id,left(coalesce(new.raw_user_meta_data->>'full_name',new.raw_user_meta_data->>'name',''),100),new.raw_user_meta_data->>'avatar_url')
 on conflict(user_id) do nothing;
 return new;
end;
$$;
revoke all on function public.create_user_profile() from public;
create trigger create_profile_after_signup after insert on auth.users for each row execute function public.create_user_profile();
insert into public.profiles(user_id,display_name) select id,left(coalesce(raw_user_meta_data->>'full_name',''),100) from auth.users on conflict do nothing;
-- Production admins are assigned only by trusted database operations, never signup metadata.
