-- 001_core.sql (idempotent DDL/Seeds for SAMIA-TAROT platform)
-- Zero theme drift - backend only schema
-- Apply via: python migrate.py up

create extension if not exists "uuid-ossp";

-- Roles
create table if not exists roles (
  id smallserial primary key,
  code text unique not null check (code in ('superadmin','admin','reader','monitor','client')),
  label text not null
);

-- Profiles (mirror of auth.users with extra fields)
create table if not exists profiles (
  id uuid primary key,                  -- equals auth.users.id
  email text unique,
  phone text,
  first_name text,
  last_name text,
  dob date,
  zodiac text,                          -- computed from dob
  country text,
  country_code text,
  birth_place text,
  birth_time time,
  role_id smallint references roles(id) default 5, -- client
  email_verified boolean default false,
  phone_verified boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Services
create table if not exists services (
  id bigserial primary key,
  code text unique not null,            -- e.g. 'tarot','coffee','astro','healing','direct_call'
  name text not null,
  is_premium boolean default false,
  is_active boolean default true,
  base_price numeric(12,2) default 0,
  meta jsonb default '{}'::jsonb
);

-- Orders / Bookings
create type order_status as enum ('new','assigned','in_progress','awaiting_approval','approved','rejected','delivered','cancelled');

create table if not exists orders (
  id bigserial primary key,
  user_id uuid not null references profiles(id),
  service_id bigint not null references services(id),
  is_gold boolean default false,
  status order_status default 'new',
  question_text text,
  input_media_id bigint,                -- e.g. coffee cup image, voice note
  output_media_id bigint,               -- final audio for client
  assigned_reader uuid references profiles(id),
  scheduled_at timestamptz,             -- for direct calls
  delivered_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint gold_implies_priority check ( (is_gold = true and status in ('new','assigned','in_progress','awaiting_approval','approved')) or is_gold = false )
);

-- Media store (audio/image/pdf)
create table if not exists media_assets (
  id bigserial primary key,
  owner_id uuid references profiles(id),
  kind text check (kind in ('audio','image','pdf','other')) not null,
  url text not null,                    -- Supabase storage public/signed
  duration_sec int,
  bytes bigint,
  sha256 text,
  meta jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- Add foreign keys to orders referencing media_assets
alter table if exists orders 
  drop constraint if exists orders_input_media_id_fkey,
  drop constraint if exists orders_output_media_id_fkey;

alter table if exists orders 
  add constraint orders_input_media_id_fkey foreign key (input_media_id) references media_assets(id),
  add constraint orders_output_media_id_fkey foreign key (output_media_id) references media_assets(id);

-- Daily Horoscopes (link to ingested TikTok audio)
create table if not exists horoscopes (
  id bigserial primary key,
  scope text check (scope in ('daily','monthly')) not null,
  zodiac text not null,
  ref_date date not null,
  audio_media_id bigint references media_assets(id),
  text_content text,                    -- optional textual summary
  tiktok_post_url text,
  approved_by uuid references profiles(id),  -- monitor/admin
  approved_at timestamptz,
  unique (scope, zodiac, ref_date)
);

-- Calls + Moderation
create table if not exists calls (
  id bigserial primary key,
  order_id bigint references orders(id) unique,
  started_at timestamptz,
  ended_at timestamptz,
  end_reason text check (end_reason in ('completed','dropped_by_monitor','dropped_by_reader','dropped_by_client','failed','other'))
);

create table if not exists moderation_actions (
  id bigserial primary key,
  actor_id uuid references profiles(id),         -- monitor/admin
  target_kind text check (target_kind in ('order','profile','media','horoscope','call')) not null,
  target_id text not null,
  action text check (action in ('approve','reject','block','unblock','drop_call')) not null,
  reason text,
  created_at timestamptz default now(),
  unique (target_kind, target_id, action, created_at)
);

-- Phone OTP log (Twilio)
create table if not exists phone_verifications (
  id bigserial primary key,
  profile_id uuid references profiles(id),
  phone text not null,
  status text check (status in ('sent','verified','failed')) not null,
  provider_ref text,
  created_at timestamptz default now()
);

-- Audit
create table if not exists audit_log (
  id bigserial primary key,
  actor uuid,
  actor_role text,
  event text not null,
  entity text,
  entity_id text,
  meta jsonb,
  created_at timestamptz default now()
);

-- Zodiac from DOB (immutable function + trigger)
create or replace function calc_zodiac(d date) returns text language sql immutable as $$
  select case
    when d is null then null
    when (extract(month from d)=3 and extract(day from d)>=21) or (extract(month from d)=4 and extract(day from d)<=19) then 'Aries'
    when (extract(month from d)=4 and extract(day from d)>=20) or (extract(month from d)=5 and extract(day from d)<=20) then 'Taurus'
    when (extract(month from d)=5 and extract(day from d)>=21) or (extract(month from d)=6 and extract(day from d)<=20) then 'Gemini'
    when (extract(month from d)=6 and extract(day from d)>=21) or (extract(month from d)=7 and extract(day from d)<=22) then 'Cancer'
    when (extract(month from d)=7 and extract(day from d)>=23) or (extract(month from d)=8 and extract(day from d)<=22) then 'Leo'
    when (extract(month from d)=8 and extract(day from d)>=23) or (extract(month from d)=9 and extract(day from d)<=22) then 'Virgo'
    when (extract(month from d)=9 and extract(day from d)>=23) or (extract(month from d)=10 and extract(day from d)<=22) then 'Libra'
    when (extract(month from d)=10 and extract(day from d)>=23) or (extract(month from d)=11 and extract(day from d)<=21) then 'Scorpio'
    when (extract(month from d)=11 and extract(day from d)>=22) or (extract(month from d)=12 and extract(day from d)<=21) then 'Sagittarius'
    when (extract(month from d)=12 and extract(day from d)>=22) or (extract(month from d)=1 and extract(day from d)<=19) then 'Capricorn'
    when (extract(month from d)=1 and extract(day from d)>=20) or (extract(month from d)=2 and extract(day from d)<=18) then 'Aquarius'
    else 'Pisces'
  end;
$$;

create or replace function profiles_zodiac_trg() returns trigger language plpgsql as $$
begin
  new.zodiac := calc_zodiac(new.dob);
  return new;
end $$;

drop trigger if exists trg_profiles_zodiac on profiles;
create trigger trg_profiles_zodiac before insert or update of dob on profiles
for each row execute procedure profiles_zodiac_trg();

-- Essential indexes
create index if not exists idx_profiles_role_id on profiles(role_id);
create index if not exists idx_profiles_email on profiles(email);
create index if not exists idx_profiles_phone on profiles(phone);
create index if not exists idx_orders_user_id on orders(user_id);
create index if not exists idx_orders_status on orders(status);
create index if not exists idx_orders_assigned_reader on orders(assigned_reader);
create index if not exists idx_horoscopes_scope_zodiac_date on horoscopes(scope, zodiac, ref_date);
create index if not exists idx_moderation_actions_target on moderation_actions(target_kind, target_id);
create index if not exists idx_audit_log_actor on audit_log(actor);
create index if not exists idx_audit_log_event on audit_log(event);

-- Seeds
insert into roles(code,label) values
('superadmin','Super Admin'),('admin','Admin'),('reader','Reader'),
('monitor','Monitor'),('client','Client')
on conflict (code) do nothing;

insert into services(code,name,is_premium,base_price) values
('tarot','Tarot Reading',false,0),
('coffee','Coffee Cup Reading',false,0),
('astro','Astro Natal Chart (Audio)',false,0),
('healing','Healing Energy (Call)',true,0),
('direct_call','Direct Call with Samia',true,0)
on conflict (code) do nothing;