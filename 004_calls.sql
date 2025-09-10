-- 004_calls.sql (idempotent) - M7 Calls: Twilio Voice + Monitor Controls + Formal Blocking
-- Apply via: python migrate.py up

-- Add Twilio linkage & call lifecycle details to existing calls table
alter table if exists calls
  add column if not exists conference_sid text,
  add column if not exists client_call_sid text,
  add column if not exists reader_call_sid text,
  add column if not exists status text check (status in ('scheduled','dialing','in_conference','ended','failed')) default null,
  add column if not exists last_event text;

-- Formal blocklist for hard enforcement
create table if not exists blocked_profiles (
  profile_id uuid primary key references profiles(id) on delete cascade,
  reason text,
  created_by uuid references profiles(id),
  created_at timestamptz default now(),
  active boolean default true
);

-- Indexes for performance
create index if not exists idx_calls_conf on calls(conference_sid);
create index if not exists idx_blocked_active on blocked_profiles(active);