-- Only server credentials may read or consume these opaque, expiring buckets.
create table public.api_rate_limits (
  bucket text primary key check (bucket ~ '^[a-z-]+:[a-f0-9]{64}$'),
  hits integer not null check (hits > 0),
  reset_at timestamptz not null
);
create index api_rate_limits_reset_at on public.api_rate_limits(reset_at);
alter table public.api_rate_limits enable row level security;
revoke all on public.api_rate_limits from public, anon, authenticated;
grant select, insert, update, delete on public.api_rate_limits to service_role;

create function public.consume_api_rate_limit(
  p_bucket text, p_max_requests integer, p_window_seconds integer
) returns integer
language plpgsql security invoker set search_path = '' as $$
declare
  request_time timestamptz := statement_timestamp();
  current_hits integer;
  expires timestamptz;
begin
  if p_max_requests is null or p_max_requests < 1 or p_max_requests > 1000
     or p_window_seconds is null or p_window_seconds < 1 or p_window_seconds > 86400 then
    raise exception 'Invalid request quota' using errcode = '22023';
  end if;

  -- Bound cleanup work; no email addresses, user IDs, IPs or credentials are stored.
  delete from public.api_rate_limits where reset_at <= request_time and bucket in (
    select bucket from public.api_rate_limits where reset_at <= request_time
    order by reset_at, bucket limit 100
  );

  insert into public.api_rate_limits as counters(bucket, hits, reset_at)
    values(p_bucket, 1, request_time + make_interval(secs => p_window_seconds))
    on conflict (bucket) do update set
      hits = case when counters.reset_at <= request_time then 1
        else least(counters.hits + 1, p_max_requests + 1) end,
      reset_at = case when counters.reset_at <= request_time
        then request_time + make_interval(secs => p_window_seconds)
        else counters.reset_at end
    returning hits, reset_at into current_hits, expires;

  if current_hits <= p_max_requests then return 0; end if;
  return greatest(1, ceil(extract(epoch from expires - request_time))::integer);
end;
$$;
revoke all on function public.consume_api_rate_limit(text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.consume_api_rate_limit(text, integer, integer)
  to service_role;
