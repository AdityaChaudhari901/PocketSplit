alter table public.categories
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists is_default boolean not null default false,
  add column if not exists is_archived boolean not null default false;

alter table public.categories
  alter column owner_id drop not null,
  alter column created_by drop not null,
  alter column kind set default 'expense';

update public.categories
set user_id = owner_id
where user_id is null
  and owner_id is not null;

update public.categories
set is_default = is_system
where is_default = false
  and is_system = true;

update public.categories
set is_archived = true
where deleted_at is not null
  and is_archived = false;

create unique index if not exists categories_user_name_active_idx
on public.categories(coalesce(user_id, owner_id), lower(name))
where is_archived = false and deleted_at is null;

create unique index if not exists categories_default_name_active_idx
on public.categories(lower(name))
where user_id is null and owner_id is null and is_archived = false and deleted_at is null;

create index if not exists categories_user_id_idx on public.categories(user_id);
create index if not exists categories_is_archived_idx on public.categories(is_archived);

create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  color text,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid not null,
  updated_by uuid
);

create unique index if not exists tags_user_name_active_idx
on public.tags(user_id, lower(name))
where is_archived = false and deleted_at is null;

create index if not exists tags_user_id_idx on public.tags(user_id);
create index if not exists tags_is_archived_idx on public.tags(is_archived);

create table if not exists public.expense_tags (
  expense_id uuid not null references public.transactions(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete restrict,
  created_at timestamptz not null default now(),
  created_by uuid not null,
  primary key (expense_id, tag_id)
);

create index if not exists expense_tags_expense_id_idx on public.expense_tags(expense_id);
create index if not exists expense_tags_tag_id_idx on public.expense_tags(tag_id);

drop trigger if exists set_tags_updated_at on public.tags;
create trigger set_tags_updated_at
before update on public.tags
for each row execute function public.set_updated_at();

alter table public.tags enable row level security;
alter table public.expense_tags enable row level security;

drop policy if exists "categories own access" on public.categories;
drop policy if exists "categories own select" on public.categories;
drop policy if exists "categories own insert" on public.categories;
drop policy if exists "categories own update" on public.categories;
drop policy if exists "categories own delete" on public.categories;

create policy "categories own select"
on public.categories
for select
using (
  user_id is null
  or user_id = auth.uid()
  or owner_id = auth.uid()
);

create policy "categories own insert"
on public.categories
for insert
with check (
  coalesce(user_id, owner_id) = auth.uid()
);

create policy "categories own update"
on public.categories
for update
using (
  coalesce(user_id, owner_id) = auth.uid()
)
with check (
  coalesce(user_id, owner_id) = auth.uid()
);

create policy "categories own delete"
on public.categories
for delete
using (
  coalesce(user_id, owner_id) = auth.uid()
);

create policy "tags own access"
on public.tags
for all
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "expense tags own select"
on public.expense_tags
for select
using (
  exists (
    select 1
    from public.transactions t
    where t.id = expense_id
      and t.owner_id = auth.uid()
      and t.deleted_at is null
  )
);

create policy "expense tags own insert"
on public.expense_tags
for insert
with check (
  exists (
    select 1
    from public.transactions t
    where t.id = expense_id
      and t.owner_id = auth.uid()
      and t.deleted_at is null
  )
  and exists (
    select 1
    from public.tags tg
    where tg.id = tag_id
      and tg.user_id = auth.uid()
      and tg.deleted_at is null
      and tg.is_archived = false
  )
);

create policy "expense tags own delete"
on public.expense_tags
for delete
using (
  exists (
    select 1
    from public.transactions t
    where t.id = expense_id
      and t.owner_id = auth.uid()
  )
);
