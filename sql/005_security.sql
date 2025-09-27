-- 005_security.sql (idempotent) - M8 Security: RLS Policies + API Rate Limiting + Ops Health
-- Apply via: python migrate.py up

-- Enable RLS on sensitive tables
alter table if exists profiles enable row level security;
alter table if exists orders enable row level security;
alter table if exists media_assets enable row level security;
alter table if exists phone_verifications enable row level security;
alter table if exists moderation_actions enable row level security;
alter table if exists audit_log enable row level security;
alter table if exists horoscopes enable row level security; -- read rules below

-- Helper: map profile -> role code quickly
create or replace view v_profile_roles as
select p.id as profile_id, r.code as role_code
from profiles p left join roles r on r.id = p.role_id;

-- Policy helpers: Supabase auth.uid() is meaningful only when using anon/auth keys.
-- Service role (Session Pooler) BYPASSES RLS, so API won't break.

-- PROFILES
drop policy if exists profiles_self_read on profiles;
create policy profiles_self_read on profiles
for select using (id = auth.uid());

drop policy if exists profiles_self_update on profiles;
create policy profiles_self_update on profiles
for update using (id = auth.uid());

-- ORDERS
drop policy if exists orders_client_own on orders;
create policy orders_client_own on orders
for select using (user_id = auth.uid());

drop policy if exists orders_client_insert on orders;
create policy orders_client_insert on orders
for insert with check (user_id = auth.uid());

drop policy if exists orders_reader_assigned on orders;
create policy orders_reader_assigned on orders
for select using (assigned_reader = auth.uid());

-- MEDIA (owner can read)
drop policy if exists media_owner_read on media_assets;
create policy media_owner_read on media_assets
for select using (owner_id = auth.uid());

-- PHONE VERIFICATIONS (self only)
drop policy if exists phone_self_rw on phone_verifications;
create policy phone_self_rw on phone_verifications
for all using (profile_id = auth.uid()) with check (profile_id = auth.uid());

-- MODERATION (monitor/admin/superadmin only) — gate via a SQL function
create or replace function is_mod_or_admin(uid uuid) returns boolean language sql stable as $$
  select exists(
    select 1 from v_profile_roles where profile_id = uid and role_code in ('monitor','admin','superadmin')
  );
$$;

drop policy if exists moderation_staff_rw on moderation_actions;
create policy moderation_staff_rw on moderation_actions
for all using (is_mod_or_admin(auth.uid())) with check (is_mod_or_admin(auth.uid()));

-- AUDIT LOG (read only by staff)
drop policy if exists audit_staff_read on audit_log;
create policy audit_staff_read on audit_log
for select using (is_mod_or_admin(auth.uid()));

-- HOROSCOPES:
-- Public read allowed only for approved OR when app_settings.auto_publish_daily=true.
-- Implement via a function to avoid exposing app_settings directly in policy.
create or replace function horo_public_readable(scope_in text, approved_by_in uuid) returns boolean
language plpgsql stable as $$
declare ap boolean;
begin
  select coalesce((select (value::boolean) from app_settings where key='auto_publish_daily'), false)
  into ap;
  if scope_in = 'daily' and ap = true then
    return true;
  end if;
  return approved_by_in is not null;
end;
$$;

drop policy if exists horoscopes_public_read on horoscopes;
create policy horoscopes_public_read on horoscopes
for select using (horo_public_readable(scope, approved_by));

-- API Rate Limiting storage (per user + endpoint)
create table if not exists api_rate_limits (
  id bigserial primary key,
  user_id uuid not null,
  endpoint text not null,
  window_start timestamptz not null,
  count int not null default 0,
  unique (user_id, endpoint, window_start)
);
create index if not exists idx_rate_user_ep_win on api_rate_limits(user_id, endpoint, window_start);

-- Function: check & bump within a window (token bucket style)
create or replace function rate_try_consume(p_user uuid, p_ep text, p_limit int, p_window_sec int)
returns boolean
language plpgsql
as $$
declare 
  win_start timestamptz := date_trunc('second', now()) - make_interval(secs => extract(epoch from now())::int % p_window_sec);
  current_count int;
begin
  loop
    begin
      insert into api_rate_limits(user_id, endpoint, window_start, count)
      values (p_user, p_ep, win_start, 1)
      on conflict (user_id, endpoint, window_start) do update
        set count = api_rate_limits.count + 1
        returning count into current_count;
      exit;
    exception when unique_violation then
      -- retry on race condition
    end;
  end loop;
  return current_count <= p_limit;
end;
$$;