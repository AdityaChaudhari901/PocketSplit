create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text not null,
  avatar_url text,
  currency char(3) not null default 'INR',
  biometric_enabled boolean not null default false,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid,
  updated_by uuid
);

create table public.wallets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  type text not null check (type in ('cash', 'bank', 'card', 'upi', 'credit_card', 'loan')),
  currency char(3) not null,
  balance_minor bigint not null default 0,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid not null,
  updated_by uuid
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  kind text not null check (kind in ('income', 'expense')),
  icon text not null default 'circle',
  color text not null default '#6B7280',
  parent_id uuid references public.categories(id),
  is_system boolean not null default false,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid not null,
  updated_by uuid
);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  wallet_id uuid not null references public.wallets(id),
  category_id uuid not null references public.categories(id),
  type text not null check (type in ('income', 'expense')),
  amount_minor bigint not null check (amount_minor > 0),
  currency char(3) not null,
  merchant text,
  note text,
  occurred_at timestamptz not null,
  receipt_id uuid,
  is_recurring boolean not null default false,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid not null,
  updated_by uuid
);

create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  category_id uuid not null references public.categories(id),
  month text not null,
  amount_minor bigint not null check (amount_minor > 0),
  currency char(3) not null,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid not null,
  updated_by uuid,
  unique(owner_id, category_id, month)
);

create table public.recurring_rules (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  transaction_template jsonb not null,
  frequency text not null check (frequency in ('weekly', 'monthly', 'quarterly', 'yearly')),
  next_run_at timestamptz not null,
  active boolean not null default true,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid not null,
  updated_by uuid
);

create table public.receipts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  storage_path text not null,
  merchant text,
  total_amount_minor bigint,
  tax_amount_minor bigint,
  service_charge_minor bigint,
  currency char(3) not null,
  parsed_status text not null default 'pending' check (parsed_status in ('pending', 'parsed', 'failed')),
  parsed_items jsonb not null default '[]',
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid not null,
  updated_by uuid
);

alter table public.transactions
  add constraint transactions_receipt_id_fkey foreign key (receipt_id) references public.receipts(id);

create table public.ai_insights (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  summary text not null,
  risk_level text not null check (risk_level in ('low', 'medium', 'high')),
  suggestions jsonb not null default '[]',
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid not null,
  updated_by uuid
);

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  type text not null check (type in ('trip', 'roommates', 'couple', 'family', 'office', 'event', 'business', 'other')),
  currency char(3) not null,
  budget_minor bigint,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid not null references public.profiles(id),
  updated_by uuid
);

create table public.group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  display_name text not null,
  email text,
  role text not null default 'member' check (role in ('admin', 'member')),
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid not null,
  updated_by uuid
);

create table public.group_expenses (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  title text not null,
  amount_minor bigint not null check (amount_minor > 0),
  currency char(3) not null,
  paid_by_member_id uuid not null references public.group_members(id),
  split_method text not null check (split_method in ('equal', 'exact', 'percentage', 'shares', 'itemwise', 'custom')),
  occurred_at timestamptz not null,
  receipt_id uuid references public.receipts(id),
  version integer not null default 1,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid not null,
  updated_by uuid
);

create table public.group_expense_splits (
  id uuid primary key default gen_random_uuid(),
  group_expense_id uuid not null references public.group_expenses(id) on delete cascade,
  member_id uuid not null references public.group_members(id),
  amount_minor bigint not null check (amount_minor >= 0),
  percentage_bps integer,
  shares numeric,
  excluded boolean not null default false,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid not null,
  updated_by uuid
);

create table public.settlements (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  from_member_id uuid not null references public.group_members(id),
  to_member_id uuid not null references public.group_members(id),
  amount_minor bigint not null check (amount_minor > 0),
  currency char(3) not null,
  status text not null default 'pending' check (status in ('pending', 'paid', 'confirmed', 'disputed')),
  payment_reference text,
  note text,
  proof_path text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid not null,
  updated_by uuid
);

create table public.payment_proofs (
  id uuid primary key default gen_random_uuid(),
  settlement_id uuid not null references public.settlements(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  storage_path text not null,
  reference_id text,
  note text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid not null,
  updated_by uuid
);

create table public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references public.profiles(id),
  group_id uuid references public.groups(id) on delete cascade,
  entity_type text not null,
  entity_id uuid not null,
  action text not null,
  before jsonb,
  after jsonb,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid not null,
  updated_by uuid
);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references public.groups(id) on delete cascade,
  entity_type text not null,
  entity_id uuid not null,
  author_id uuid not null references public.profiles(id),
  body text not null,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid not null,
  updated_by uuid
);

create table public.entitlements (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  plan_id text not null check (plan_id in ('free', 'pro_monthly', 'pro_yearly', 'premium_monthly', 'premium_yearly')),
  active_until timestamptz,
  provider text,
  external_customer_id text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid not null,
  updated_by uuid
);

create table public.feature_usage (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  feature_name text not null,
  period_key text not null,
  usage_count integer not null default 0,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid not null,
  updated_by uuid,
  unique(owner_id, feature_name, period_key)
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id),
  action text not null,
  resource_type text not null,
  resource_id uuid,
  ip_address inet,
  user_agent text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index wallets_owner_idx on public.wallets(owner_id) where deleted_at is null;
create index transactions_owner_month_idx on public.transactions(owner_id, occurred_at desc) where deleted_at is null;
create index budgets_owner_month_idx on public.budgets(owner_id, month) where deleted_at is null;
create index receipts_owner_idx on public.receipts(owner_id) where deleted_at is null;
create index group_members_group_idx on public.group_members(group_id) where deleted_at is null;
create index group_members_user_idx on public.group_members(user_id) where deleted_at is null;
create index group_expenses_group_idx on public.group_expenses(group_id, occurred_at desc) where deleted_at is null;
create index settlements_group_idx on public.settlements(group_id) where deleted_at is null;
create index activity_logs_group_idx on public.activity_logs(group_id, created_at desc);

create or replace function public.is_group_member(target_group_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.group_members gm
    where gm.group_id = target_group_id
      and gm.user_id = auth.uid()
      and gm.deleted_at is null
  );
$$;

create or replace function public.is_group_admin(target_group_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.group_members gm
    where gm.group_id = target_group_id
      and gm.user_id = auth.uid()
      and gm.role = 'admin'
      and gm.deleted_at is null
  );
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'profiles', 'wallets', 'categories', 'transactions', 'budgets', 'recurring_rules', 'receipts',
    'ai_insights', 'groups', 'group_members', 'group_expenses', 'group_expense_splits',
    'settlements', 'payment_proofs', 'activity_logs', 'comments', 'entitlements', 'feature_usage'
  ]
  loop
    execute format('create trigger set_%I_updated_at before update on public.%I for each row execute function public.set_updated_at()', table_name, table_name);
  end loop;
end;
$$;

alter table public.profiles enable row level security;
alter table public.wallets enable row level security;
alter table public.categories enable row level security;
alter table public.transactions enable row level security;
alter table public.budgets enable row level security;
alter table public.recurring_rules enable row level security;
alter table public.receipts enable row level security;
alter table public.ai_insights enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.group_expenses enable row level security;
alter table public.group_expense_splits enable row level security;
alter table public.settlements enable row level security;
alter table public.payment_proofs enable row level security;
alter table public.activity_logs enable row level security;
alter table public.comments enable row level security;
alter table public.entitlements enable row level security;
alter table public.feature_usage enable row level security;
alter table public.audit_logs enable row level security;

create policy "profiles own select" on public.profiles for select using (id = auth.uid());
create policy "profiles own insert" on public.profiles for insert with check (id = auth.uid());
create policy "profiles own update" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

create policy "wallets own access" on public.wallets for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "categories own access" on public.categories for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "transactions own access" on public.transactions for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "budgets own access" on public.budgets for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "recurring rules own access" on public.recurring_rules for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "receipts own access" on public.receipts for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "ai insights own access" on public.ai_insights for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "entitlements own access" on public.entitlements for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "feature usage own access" on public.feature_usage for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "groups visible to members" on public.groups for select using (public.is_group_member(id) or created_by = auth.uid());
create policy "groups created by user" on public.groups for insert with check (created_by = auth.uid());
create policy "groups admin update" on public.groups for update using (public.is_group_admin(id)) with check (public.is_group_admin(id));

create policy "group members visible to members" on public.group_members for select using (public.is_group_member(group_id) or user_id = auth.uid());
create policy "group members admin insert" on public.group_members for insert with check (created_by = auth.uid());
create policy "group members admin update" on public.group_members for update using (public.is_group_admin(group_id)) with check (public.is_group_admin(group_id));

create policy "group expenses member access" on public.group_expenses for all using (public.is_group_member(group_id)) with check (public.is_group_member(group_id));
create policy "group splits member access" on public.group_expense_splits for all using (
  exists (
    select 1 from public.group_expenses ge
    where ge.id = group_expense_id and public.is_group_member(ge.group_id)
  )
) with check (
  exists (
    select 1 from public.group_expenses ge
    where ge.id = group_expense_id and public.is_group_member(ge.group_id)
  )
);
create policy "settlements member access" on public.settlements for all using (public.is_group_member(group_id)) with check (public.is_group_member(group_id));
create policy "payment proofs owner access" on public.payment_proofs for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "activity logs member select" on public.activity_logs for select using (group_id is null or public.is_group_member(group_id));
create policy "activity logs user insert" on public.activity_logs for insert with check (created_by = auth.uid());
create policy "comments member access" on public.comments for all using (group_id is null or public.is_group_member(group_id)) with check (group_id is null or public.is_group_member(group_id));
create policy "audit logs own select" on public.audit_logs for select using (actor_id = auth.uid());
