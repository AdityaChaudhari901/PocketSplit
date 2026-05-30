create extension if not exists pg_trgm;

create index if not exists transactions_owner_occurred_search_idx
on public.transactions(owner_id, occurred_at desc)
where deleted_at is null;

create index if not exists transactions_owner_amount_search_idx
on public.transactions(owner_id, amount_minor)
where deleted_at is null;

create index if not exists transactions_owner_type_search_idx
on public.transactions(owner_id, type)
where deleted_at is null;

create index if not exists transactions_owner_category_search_idx
on public.transactions(owner_id, category_id)
where deleted_at is null;

create index if not exists transactions_merchant_trgm_search_idx
on public.transactions using gin (merchant gin_trgm_ops)
where deleted_at is null and merchant is not null;

create index if not exists transactions_note_trgm_search_idx
on public.transactions using gin (note gin_trgm_ops)
where deleted_at is null and note is not null;
