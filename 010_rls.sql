-- 010_rls.sql: Enable Row Level Security + Policies
-- Idempotent migration for M16.2 RLS & Route Guards

-- Enable RLS on target tables (idempotent)
alter table if exists profiles enable row level security;
alter table if exists orders enable row level security;
alter table if exists media_assets enable row level security;
alter table if exists horoscopes enable row level security;
alter table if exists calls enable row level security;
alter table if exists moderation_actions enable row level security;
alter table if exists audit_log enable row level security;
alter table if exists payment_intents enable row level security;

-- Add payment_attempts table if not exists (from context document)
create table if not exists payment_attempts (
  id bigserial primary key,
  order_id bigint not null references orders(id),
  provider text not null check (provider in ('stripe','square','manual','usdt')),
  status text not null check (status in ('init','failed','succeeded','aborted')) default 'init',
  attempt_no int not null,
  error_code text,
  idempotency_key text,
  created_at timestamptz default now()
);

-- Add wallets table if not exists
create table if not exists wallets (
  id bigserial primary key,
  user_id uuid not null references profiles(id),
  balance_cents bigint not null default 0,
  currency text not null default 'USD',
  updated_at timestamptz default now(),
  unique (user_id)
);

-- Add wallet_ledger table if not exists
create table if not exists wallet_ledger (
  id bigserial primary key,
  wallet_id bigint not null references wallets(id),
  delta_cents bigint not null,
  reason text not null,
  provider text,
  ref text,
  created_at timestamptz default now()
);

-- Enable RLS on new tables
alter table if exists payment_attempts enable row level security;
alter table if exists wallets enable row level security;
alter table if exists wallet_ledger enable row level security;

-- Helper function to get user role (idempotent) - use public schema
create or replace function public.get_user_role(user_id uuid) returns text as $$
declare
  user_role text;
begin
  select r.code into user_role
  from profiles p
  join roles r on r.id = p.role_id
  where p.id = user_id;
  
  return coalesce(user_role, 'user');
end;
$$ language plpgsql security definer;

-- Drop existing policies (idempotent)
drop policy if exists "profiles_select_policy" on profiles;
drop policy if exists "profiles_update_policy" on profiles;
drop policy if exists "profiles_delete_policy" on profiles;

drop policy if exists "orders_select_policy" on orders;
drop policy if exists "orders_insert_policy" on orders;
drop policy if exists "orders_update_policy" on orders;

drop policy if exists "media_assets_select_policy" on media_assets;

drop policy if exists "horoscopes_select_policy" on horoscopes;
drop policy if exists "horoscopes_insert_policy" on horoscopes;
drop policy if exists "horoscopes_update_policy" on horoscopes;

drop policy if exists "calls_select_policy" on calls;

drop policy if exists "moderation_actions_select_policy" on moderation_actions;
drop policy if exists "moderation_actions_insert_policy" on moderation_actions;
drop policy if exists "moderation_actions_update_policy" on moderation_actions;

drop policy if exists "audit_log_select_policy" on audit_log;
drop policy if exists "audit_log_insert_policy" on audit_log;

drop policy if exists "payment_intents_select_policy" on payment_intents;
drop policy if exists "payment_intents_insert_policy" on payment_intents;
drop policy if exists "payment_intents_update_policy" on payment_intents;

drop policy if exists "payment_attempts_select_policy" on payment_attempts;
drop policy if exists "payment_attempts_insert_policy" on payment_attempts;
drop policy if exists "payment_attempts_update_policy" on payment_attempts;

drop policy if exists "wallets_select_policy" on wallets;
drop policy if exists "wallets_insert_policy" on wallets;
drop policy if exists "wallets_update_policy" on wallets;

drop policy if exists "wallet_ledger_select_policy" on wallet_ledger;
drop policy if exists "wallet_ledger_insert_policy" on wallet_ledger;

-- PROFILES policies
-- User: select/update self; admin/superadmin: select all; delete: superadmin only
create policy "profiles_select_policy" on profiles
  for select using (
    id = auth.uid() or 
    public.get_user_role(auth.uid()) in ('admin', 'superadmin')
  );

create policy "profiles_update_policy" on profiles
  for update using (
    id = auth.uid() or 
    public.get_user_role(auth.uid()) in ('admin', 'superadmin')
  );

create policy "profiles_delete_policy" on profiles
  for delete using (
    public.get_user_role(auth.uid()) = 'superadmin'
  );

-- ORDERS policies  
-- Client: own orders; reader: assigned orders; monitor/admin/superadmin: full access
create policy "orders_select_policy" on orders
  for select using (
    user_id = auth.uid() or
    assigned_reader = auth.uid() or
    public.get_user_role(auth.uid()) in ('monitor', 'admin', 'superadmin')
  );

create policy "orders_insert_policy" on orders
  for insert with check (
    user_id = auth.uid() or
    public.get_user_role(auth.uid()) in ('monitor', 'admin', 'superadmin')
  );

create policy "orders_update_policy" on orders
  for update using (
    user_id = auth.uid() or
    assigned_reader = auth.uid() or
    public.get_user_role(auth.uid()) in ('monitor', 'admin', 'superadmin')
  );

-- MEDIA_ASSETS policies
-- Owner: select; reader: select if referenced by assigned order; admin/monitor: full
create policy "media_assets_select_policy" on media_assets
  for select using (
    owner_id = auth.uid() or
    public.get_user_role(auth.uid()) in ('admin', 'monitor', 'superadmin') or
    exists (
      select 1 from orders o
      where (o.input_media_id = media_assets.id or o.output_media_id = media_assets.id)
      and o.assigned_reader = auth.uid()
    )
  );

-- HOROSCOPES policies
-- Public: select when approved; create/update: monitor/admin/superadmin
create policy "horoscopes_select_policy" on horoscopes
  for select using (
    approved_at is not null or
    public.get_user_role(auth.uid()) in ('monitor', 'admin', 'superadmin')
  );

create policy "horoscopes_insert_policy" on horoscopes
  for insert with check (
    public.get_user_role(auth.uid()) in ('monitor', 'admin', 'superadmin')
  );

create policy "horoscopes_update_policy" on horoscopes
  for update using (
    public.get_user_role(auth.uid()) in ('monitor', 'admin', 'superadmin')
  );

-- CALLS policies
-- Client/reader of same order + monitor/admin can select
create policy "calls_select_policy" on calls
  for select using (
    public.get_user_role(auth.uid()) in ('monitor', 'admin', 'superadmin') or
    exists (
      select 1 from orders o
      where o.id = calls.order_id
      and (o.user_id = auth.uid() or o.assigned_reader = auth.uid())
    )
  );

-- MODERATION_ACTIONS policies - monitor/admin/superadmin only
create policy "moderation_actions_select_policy" on moderation_actions
  for select using (
    public.get_user_role(auth.uid()) in ('monitor', 'admin', 'superadmin')
  );

create policy "moderation_actions_insert_policy" on moderation_actions
  for insert with check (
    public.get_user_role(auth.uid()) in ('monitor', 'admin', 'superadmin')
  );

create policy "moderation_actions_update_policy" on moderation_actions
  for update using (
    public.get_user_role(auth.uid()) in ('monitor', 'admin', 'superadmin')
  );

-- AUDIT_LOG policies - monitor/admin/superadmin only
create policy "audit_log_select_policy" on audit_log
  for select using (
    public.get_user_role(auth.uid()) in ('monitor', 'admin', 'superadmin')
  );

create policy "audit_log_insert_policy" on audit_log
  for insert with check (
    public.get_user_role(auth.uid()) in ('monitor', 'admin', 'superadmin')
  );

-- PAYMENT_INTENTS policies - monitor/admin/superadmin only
create policy "payment_intents_select_policy" on payment_intents
  for select using (
    public.get_user_role(auth.uid()) in ('monitor', 'admin', 'superadmin')
  );

create policy "payment_intents_insert_policy" on payment_intents
  for insert with check (
    public.get_user_role(auth.uid()) in ('monitor', 'admin', 'superadmin')
  );

create policy "payment_intents_update_policy" on payment_intents
  for update using (
    public.get_user_role(auth.uid()) in ('monitor', 'admin', 'superadmin')
  );

-- PAYMENT_ATTEMPTS policies - monitor/admin/superadmin only
create policy "payment_attempts_select_policy" on payment_attempts
  for select using (
    public.get_user_role(auth.uid()) in ('monitor', 'admin', 'superadmin')
  );

create policy "payment_attempts_insert_policy" on payment_attempts
  for insert with check (
    public.get_user_role(auth.uid()) in ('monitor', 'admin', 'superadmin')
  );

create policy "payment_attempts_update_policy" on payment_attempts
  for update using (
    public.get_user_role(auth.uid()) in ('monitor', 'admin', 'superadmin')
  );

-- WALLETS policies - owner can select own; monitor/admin/superadmin full access
create policy "wallets_select_policy" on wallets
  for select using (
    user_id = auth.uid() or
    public.get_user_role(auth.uid()) in ('monitor', 'admin', 'superadmin')
  );

create policy "wallets_insert_policy" on wallets
  for insert with check (
    user_id = auth.uid() or
    public.get_user_role(auth.uid()) in ('monitor', 'admin', 'superadmin')
  );

create policy "wallets_update_policy" on wallets
  for update using (
    user_id = auth.uid() or
    public.get_user_role(auth.uid()) in ('monitor', 'admin', 'superadmin')
  );

-- WALLET_LEDGER policies - owner can select own; monitor/admin/superadmin full access
create policy "wallet_ledger_select_policy" on wallet_ledger
  for select using (
    public.get_user_role(auth.uid()) in ('monitor', 'admin', 'superadmin') or
    exists (
      select 1 from wallets w
      where w.id = wallet_ledger.wallet_id
      and w.user_id = auth.uid()
    )
  );

create policy "wallet_ledger_insert_policy" on wallet_ledger
  for insert with check (
    public.get_user_role(auth.uid()) in ('monitor', 'admin', 'superadmin')
  );

-- Add indexes on policy filter columns (idempotent)
create index if not exists idx_orders_user_id on orders(user_id);
create index if not exists idx_orders_assigned_reader on orders(assigned_reader);
create index if not exists idx_media_assets_owner_id on media_assets(owner_id);
create index if not exists idx_wallets_user_id on wallets(user_id);
create index if not exists idx_payment_attempts_order_id on payment_attempts(order_id);
create index if not exists idx_wallet_ledger_wallet_id on wallet_ledger(wallet_id);