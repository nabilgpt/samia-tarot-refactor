-- Helpers (idempotent)
create or replace function app_role() returns text language sql stable as $$
  select coalesce(current_setting('request.jwt.claims', true)::jsonb ->> 'app_role', 'client');
$$;
create or replace function is_staff() returns boolean language sql stable as $$ select app_role() in ('reader','monitor','admin','superadmin'); $$;
create or replace function is_admin() returns boolean language sql stable as $$ select app_role() in ('admin','superadmin'); $$;
create or replace function is_super_admin() returns boolean language sql stable as $$ select app_role() = 'superadmin'; $$;

-- payout method enum (idempotent)
do $$ begin
  if not exists (select 1 from pg_type where typname = 'payout_method') then
    create type payout_method as enum ('bank_transfer','western_union','whish','al_haram');
  end if;
end $$;

create table if not exists payout_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  method payout_method not null,
  details jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table payout_accounts enable row level security;
create index if not exists idx_payout_accounts_user on payout_accounts(user_id);

-- Owner can CRUD own records; admins read all; monitors read-only
create policy "payout_accounts_owner_select" on payout_accounts for select using (auth.uid() = user_id or is_admin() or app_role() = 'monitor');
create policy "payout_accounts_owner_cud"    on payout_accounts for all    using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- cashout status enum (idempotent)
do $$ begin
  if not exists (select 1 from pg_type where typname = 'cashout_status') then
    create type cashout_status as enum ('pending_review_admin','pending_execution_superadmin','settled','rejected');
  end if;
end $$;

create table if not exists cashout_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users(id) on delete cascade,
  payout_account_id uuid not null references payout_accounts(id) on delete restrict,
  amount_cents integer not null check (amount_cents > 0),
  currency text not null default 'USD',
  status cashout_status not null default 'pending_review_admin',
  admin_reviewer uuid,
  superadmin_executor uuid,
  proof_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table cashout_requests enable row level security;
create index if not exists idx_cashout_requests_requester on cashout_requests(requester_id);
create index if not exists idx_cashout_requests_status on cashout_requests(status);
create index if not exists idx_cashout_requests_created on cashout_requests(created_at);

-- Policies: owner read & create; admin can transition; superadmin settles; monitor read-only
create policy "cashout_owner_read"    on cashout_requests for select using (auth.uid() = requester_id or is_admin() or app_role() = 'monitor');
create policy "cashout_owner_create"  on cashout_requests for insert with check (auth.uid() = requester_id);
create policy "cashout_admin_update"  on cashout_requests for update using (is_admin()) with check (is_admin());
create policy "cashout_super_settle"  on cashout_requests for update using (is_super_admin()) with check (is_super_admin());