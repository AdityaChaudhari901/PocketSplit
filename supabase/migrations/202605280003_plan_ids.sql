alter table public.entitlements
  drop constraint if exists entitlements_plan_id_check;

update public.entitlements
set plan_id = case plan_id
  when 'monthly' then 'pro_monthly'
  when 'yearly' then 'pro_yearly'
  when 'pro' then 'pro_monthly'
  when 'family' then 'premium_monthly'
  when 'group_pro' then 'premium_monthly'
  when 'trip_pack' then 'premium_monthly'
  else plan_id
end
where plan_id in ('monthly', 'yearly', 'pro', 'family', 'group_pro', 'trip_pack');

alter table public.entitlements
  add constraint entitlements_plan_id_check
  check (plan_id in ('free', 'pro_monthly', 'pro_yearly', 'premium_monthly', 'premium_yearly'));
