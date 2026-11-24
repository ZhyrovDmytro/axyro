-- Run after the billing withdrawal migration in an isolated test database.
begin;
do $$
declare
  billing_table regclass;
begin
  foreach billing_table in array array[
    'public.billing_withdrawals'::regclass,
    'public.billing_contract_confirmations'::regclass
  ] loop
    assert (select relrowsecurity from pg_class where oid = billing_table);
    assert not has_table_privilege('anon', billing_table, 'select,insert,update,delete');
    assert not has_table_privilege('authenticated', billing_table, 'select,insert,update,delete');
    assert has_table_privilege('service_role', billing_table, 'select');
    assert has_table_privilege('service_role', billing_table, 'insert');
  end loop;
end;
$$;

set local role service_role;
do $$
declare
  notice_id constant uuid := 'fcb6795d-d422-4d02-83ea-3a2ac0162e33';
  first_submitted_at timestamptz;
begin
  insert into public.billing_withdrawals (site_id, id, name, contract_reference, email)
    values ('staging-test', notice_id, 'Test Buyer', 'Sandbox invoice', 'buyer@example.test')
    returning submitted_at into first_submitted_at;

  insert into public.billing_withdrawals (site_id, id, name, contract_reference, email)
    values ('staging-test', notice_id, 'Changed name', 'Other invoice', 'other@example.test')
    on conflict (site_id, id) do nothing;

  assert exists (
    select from public.billing_withdrawals where site_id = 'staging-test' and id = notice_id
      and name = 'Test Buyer' and contract_reference = 'Sandbox invoice'
      and submitted_at = first_submitted_at
  );

  insert into public.billing_withdrawals (site_id, id, name, contract_reference, email)
    values ('other-site-test', notice_id, 'Other Buyer', 'Second sandbox invoice', 'other@example.test');

  update public.billing_withdrawals set receipt_sent_at = now(), operator_notified_at = now()
    where site_id = 'staging-test' and id = notice_id;

  assert exists (
    select from public.billing_withdrawals where site_id = 'other-site-test' and id = notice_id
      and receipt_sent_at is null and operator_notified_at is null
  );

  insert into public.billing_contract_confirmations (checkout_id) values ('cs_test_abc123');
  insert into public.billing_contract_confirmations (checkout_id) values ('cs_test_abc123')
    on conflict (checkout_id) do nothing;
  assert (select count(*) from public.billing_contract_confirmations where checkout_id = 'cs_test_abc123') = 1;
end;
$$;
rollback;
