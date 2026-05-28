create table public.monthly_spending_plans (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  month text not null check (month ~ '^\d{4}-\d{2}$'),
  allocated_spend_minor bigint not null check (allocated_spend_minor > 0),
  currency char(3) not null,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid not null,
  updated_by uuid,
  unique (owner_id, month)
);

create index monthly_spending_plans_owner_month_idx
on public.monthly_spending_plans(owner_id, month)
where deleted_at is null;

create trigger set_monthly_spending_plans_updated_at
before update on public.monthly_spending_plans
for each row execute function public.set_updated_at();

alter table public.monthly_spending_plans enable row level security;

create policy "monthly spending plans own access"
on public.monthly_spending_plans
for all
using (owner_id = auth.uid())
with check (owner_id = auth.uid());
