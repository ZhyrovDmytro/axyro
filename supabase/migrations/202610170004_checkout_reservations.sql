alter table public.subscriptions add column checkout_intent uuid;
alter table public.subscriptions add column checkout_price text;
alter table public.subscriptions add column checkout_return_to text;
alter table public.subscriptions add column checkout_expires_at timestamptz;

-- Hold one immutable provider intent per customer until its hosted session expires.
create or replace function public.reserve_billing_checkout(p_user_id uuid, p_price text, p_return_to text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare subscription_row public.subscriptions;
begin
  select * into subscription_row from public.subscriptions where user_id = p_user_id for update;
  if not found then raise exception 'Missing customer'; end if;
  if subscription_row.checkout_intent is null or subscription_row.checkout_expires_at <= now() then
    update public.subscriptions set checkout_intent = gen_random_uuid(), checkout_price = p_price,
      checkout_return_to = p_return_to, checkout_expires_at = date_trunc('second', now() + interval '23 hours')
      where user_id = p_user_id returning * into subscription_row;
  end if;
  return jsonb_build_object('id',subscription_row.checkout_intent,'priceId',subscription_row.checkout_price,
    'returnTo',subscription_row.checkout_return_to,'expiresAt',extract(epoch from subscription_row.checkout_expires_at)::bigint);
end;
$$;
revoke all on function public.reserve_billing_checkout(uuid,text,text) from public,anon,authenticated;
grant execute on function public.reserve_billing_checkout(uuid,text,text) to service_role;
