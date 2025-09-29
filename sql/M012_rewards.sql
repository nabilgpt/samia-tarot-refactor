-- reward enums (idempotent)
do $$ begin
  if not exists (select 1 from pg_type where typname = 'reward_reason') then
    create type reward_reason as enum ('earn','redeem','reversal');
  end if;
end $$;

create table if not exists reward_balances (
  user_id uuid primary key references auth.users(id) on delete cascade,
  points bigint not null default 0
);
alter table reward_balances enable row level security;
create policy "rb_owner_ro"   on reward_balances for select using (auth.uid() = user_id or is_admin());
create policy "rb_admin_upd"  on reward_balances for update using (is_admin()) with check (is_admin());

create table if not exists reward_events (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  points_delta bigint not null,
  reason reward_reason not null,
  order_id uuid,
  created_at timestamptz not null default now()
);
alter table reward_events enable row level security;
create index if not exists idx_reward_events_user on reward_events(user_id);
create policy "re_owner_ro"   on reward_events for select using (auth.uid() = user_id or is_admin());
create policy "re_admin_ins"  on reward_events for insert with check (is_admin());