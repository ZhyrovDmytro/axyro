-- Run after the rate-limit migration in an isolated PostgreSQL test database.
begin;
do $$
begin
  assert not has_table_privilege('anon', 'public.api_rate_limits', 'select');
  assert not has_table_privilege('authenticated', 'public.api_rate_limits', 'update');
  assert not has_function_privilege('anon', 'public.consume_api_rate_limit(text,integer,integer)', 'execute');
  assert not has_function_privilege('authenticated', 'public.consume_api_rate_limit(text,integer,integer)', 'execute');
  assert has_function_privilege('service_role', 'public.consume_api_rate_limit(text,integer,integer)', 'execute');
  assert (select relrowsecurity from pg_class where oid = 'public.api_rate_limits'::regclass);
  assert not (select prosecdef from pg_proc where oid = 'public.consume_api_rate_limit(text,integer,integer)'::regprocedure);
end;
$$;
set local role service_role;
do $$
declare
  key text := 'planner:' || repeat('a',64);
  delay integer;
begin
  assert public.consume_api_rate_limit(key, 2, 900) = 0;
  assert public.consume_api_rate_limit(key, 2, 900) = 0;
  delay := public.consume_api_rate_limit(key, 2, 900);
  assert delay between 1 and 900;
  assert public.consume_api_rate_limit('planner:' || repeat('b',64), 2, 900) = 0;
  update public.api_rate_limits set reset_at = statement_timestamp() - interval '1 second' where bucket = key;
  assert public.consume_api_rate_limit(key, 2, 900) = 0;
  assert (select hits from public.api_rate_limits where bucket = key) = 1;

  begin
    perform public.consume_api_rate_limit(key, 0, 900);
    raise exception 'Expected invalid quota rejection';
  exception when invalid_parameter_value then null;
  end;
end;
$$;
rollback;
