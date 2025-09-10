-- 009_privacy.sql - Privacy & Account Management (idempotent)
-- Account deletion (soft-delete + purge queue) and data export features

-- Soft-delete markers on profiles
alter table if exists profiles
  add column if not exists soft_deleted_at timestamptz,
  add column if not exists deleted_reason text;

-- Deletion requests tracking
create table if not exists deletion_requests (
  id bigserial primary key,
  user_id uuid not null references profiles(id) on delete cascade,
  status text not null check (status in ('requested','processing','purged','canceled')),
  reason text,
  actor_id uuid references profiles(id),      -- if admin triggered
  redaction_done boolean default false,
  purged_at timestamptz,
  meta jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- Export jobs (masked by default)
create table if not exists export_jobs (
  id bigserial primary key,
  user_id uuid not null references profiles(id) on delete cascade,
  status text not null check (status in ('queued','running','ready','failed','expired')),
  pii_mode text not null default 'masked' check (pii_mode in ('masked')),
  zip_media_id bigint references media_assets(id),
  expires_at timestamptz,
  error text,
  created_at timestamptz default now()
);

-- Indexes for performance
create index if not exists idx_delreq_user on deletion_requests(user_id);
create index if not exists idx_delreq_status on deletion_requests(status, created_at);
create index if not exists idx_export_user on export_jobs(user_id);
create index if not exists idx_export_status on export_jobs(status, created_at);
create index if not exists idx_profiles_soft_deleted on profiles(soft_deleted_at) where soft_deleted_at is not null;

-- RLS policies (inherit from M8 global RLS setup)
-- Users can only see their own deletion requests and export jobs
-- Admins can see all deletion requests and export jobs for support