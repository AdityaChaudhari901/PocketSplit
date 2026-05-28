create table public.savings_goals (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(trim(name)) > 0),
  target_amount_minor bigint not null check (target_amount_minor > 0),
  saved_amount_minor bigint not null default 0 check (saved_amount_minor >= 0),
  currency char(3) not null,
  target_date date not null,
  monthly_contribution_minor bigint not null default 0 check (monthly_contribution_minor >= 0),
  status text not null default 'active' check (status in ('active', 'paused', 'completed', 'archived')),
  note text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid not null,
  updated_by uuid,
  constraint savings_goals_saved_lte_target check (saved_amount_minor <= target_amount_minor),
  unique (id, currency)
);

create table public.savings_goal_contributions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  goal_id uuid not null,
  amount_minor bigint not null check (amount_minor > 0),
  currency char(3) not null,
  contributed_at timestamptz not null,
  note text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid not null,
  updated_by uuid,
  constraint savings_goal_contributions_goal_currency_fkey
    foreign key (goal_id, currency) references public.savings_goals(id, currency) on delete cascade
);

create index savings_goals_owner_status_idx on public.savings_goals(owner_id, status) where deleted_at is null;
create index savings_goals_owner_target_idx on public.savings_goals(owner_id, target_date) where deleted_at is null;
create index savings_goal_contributions_goal_idx on public.savings_goal_contributions(goal_id, contributed_at desc) where deleted_at is null;
create index savings_goal_contributions_owner_idx on public.savings_goal_contributions(owner_id, contributed_at desc) where deleted_at is null;

create trigger set_savings_goals_updated_at
before update on public.savings_goals
for each row execute function public.set_updated_at();

create trigger set_savings_goal_contributions_updated_at
before update on public.savings_goal_contributions
for each row execute function public.set_updated_at();

alter table public.savings_goals enable row level security;
alter table public.savings_goal_contributions enable row level security;

create policy "savings goals own access"
on public.savings_goals
for all
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

create policy "savings goal contributions own select"
on public.savings_goal_contributions
for select
using (owner_id = auth.uid());

create policy "savings goal contributions own insert"
on public.savings_goal_contributions
for insert
with check (
  owner_id = auth.uid()
  and exists (
    select 1
    from public.savings_goals sg
    where sg.id = goal_id
      and sg.owner_id = auth.uid()
      and sg.deleted_at is null
  )
);

create policy "savings goal contributions own update"
on public.savings_goal_contributions
for update
using (owner_id = auth.uid())
with check (
  owner_id = auth.uid()
  and exists (
    select 1
    from public.savings_goals sg
    where sg.id = goal_id
      and sg.owner_id = auth.uid()
      and sg.deleted_at is null
  )
);

create policy "savings goal contributions own delete"
on public.savings_goal_contributions
for delete
using (owner_id = auth.uid());

create or replace function public.record_savings_goal_contribution(
  p_goal_id uuid,
  p_amount_minor bigint,
  p_contributed_at timestamptz default now(),
  p_note text default null
)
returns public.savings_goal_contributions
language plpgsql
security invoker
set search_path = public
as $$
declare
  target_goal public.savings_goals%rowtype;
  created_contribution public.savings_goal_contributions%rowtype;
  applied_amount_minor bigint;
  next_saved_amount_minor bigint;
begin
  if p_amount_minor <= 0 then
    raise exception 'Contribution amount must be greater than zero.';
  end if;

  select *
  into target_goal
  from public.savings_goals
  where id = p_goal_id
    and owner_id = auth.uid()
    and deleted_at is null
  for update;

  if not found then
    raise exception 'Savings goal not found.';
  end if;

  if target_goal.status <> 'active' then
    raise exception 'Savings goal is not active.';
  end if;

  applied_amount_minor := least(
    p_amount_minor,
    target_goal.target_amount_minor - target_goal.saved_amount_minor
  );

  if applied_amount_minor <= 0 then
    raise exception 'Savings goal is already fully funded.';
  end if;

  next_saved_amount_minor := least(
    target_goal.target_amount_minor,
    target_goal.saved_amount_minor + applied_amount_minor
  );

  insert into public.savings_goal_contributions (
    owner_id,
    goal_id,
    amount_minor,
    currency,
    contributed_at,
    note,
    created_by,
    updated_by
  )
  values (
    auth.uid(),
    target_goal.id,
    applied_amount_minor,
    target_goal.currency,
    coalesce(p_contributed_at, now()),
    nullif(trim(coalesce(p_note, '')), ''),
    auth.uid(),
    auth.uid()
  )
  returning * into created_contribution;

  update public.savings_goals
  set
    saved_amount_minor = next_saved_amount_minor,
    status = case
      when next_saved_amount_minor >= target_amount_minor then 'completed'
      else status
    end,
    updated_by = auth.uid()
  where id = target_goal.id;

  return created_contribution;
end;
$$;

grant execute on function public.record_savings_goal_contribution(uuid, bigint, timestamptz, text) to authenticated;
