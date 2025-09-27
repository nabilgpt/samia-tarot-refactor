-- 002_personalization_schema.sql
-- M25 Personalization (Internal AI Only) - Database Schema
-- Privacy-first: no PII in features; IDs/hashes only; strict RLS

create extension if not exists "uuid-ossp";

-- Personalization Features (compact, versioned)
create table if not exists personalization_features (
  id bigserial primary key,
  user_id uuid not null references profiles(id),
  feature_version smallint not null default 1,
  engagement_score numeric(5,4), -- 0-1: listen-through rate
  notification_ctr numeric(5,4), -- 0-1: click-through rate  
  session_count_7d smallint default 0,
  session_count_30d smallint default 0,
  avg_session_duration_sec int default 0,
  preferred_time_slot smallint, -- 0-23 hour bucket
  device_type text check (device_type in ('mobile','tablet','desktop')),
  country_code text, -- from profiles, no PII
  timezone_offset smallint, -- for cohort grouping
  last_activity_at timestamptz,
  computed_at timestamptz default now(),
  unique (user_id, feature_version)
);

-- Personalization Rankings (cached results)
create table if not exists personalization_ranks (
  id bigserial primary key,
  user_id uuid not null references profiles(id),
  scope text not null check (scope in ('daily_horoscopes','notifications','content_feed')),
  ranked_items jsonb not null, -- array of {id, score, confidence}
  rationale_tags text[], -- internal reasoning
  model_version text not null default 'rule_v1',
  valid_until timestamptz not null,
  created_at timestamptz default now(),
  unique (user_id, scope, created_at)
);

-- Personalization Evaluation (offline metrics)
create table if not exists personalization_eval (
  id bigserial primary key,
  eval_date date not null,
  model_version text not null,
  scope text not null,
  metric_name text not null check (metric_name in ('precision_at_k','map','ndcg','coverage','diversity')),
  metric_value numeric(8,6),
  sample_size int,
  confidence_interval jsonb, -- {lower, upper}
  notes text,
  unique (eval_date, model_version, scope, metric_name)
);

-- User Personalization Settings (opt-out control)
create table if not exists personalization_settings (
  user_id uuid primary key references profiles(id),
  personalization_enabled boolean default true,
  data_sharing_consent boolean default false,
  updated_at timestamptz default now()
);

-- Indexes for performance
create index if not exists idx_personalization_features_user_version on personalization_features(user_id, feature_version);
create index if not exists idx_personalization_ranks_user_scope on personalization_ranks(user_id, scope, created_at desc);
create index if not exists idx_personalization_ranks_valid_until on personalization_ranks(valid_until);
create index if not exists idx_personalization_eval_date_model on personalization_eval(eval_date, model_version);

-- Feature extraction function (privacy-safe)
create or replace function extract_user_features(p_user_id uuid) 
returns jsonb
language plpgsql
security definer
as $$
declare
  features jsonb := '{}';
  listen_through_rate numeric;
  recent_sessions int;
  avg_duration int;
begin
  -- Engagement metrics (no PII)
  select 
    coalesce(avg(case when o.delivered_at is not null then 1.0 else 0.0 end), 0),
    count(*) filter (where o.created_at > now() - interval '7 days'),
    coalesce(avg(extract(epoch from (o.delivered_at - o.created_at))), 0)
  into listen_through_rate, recent_sessions, avg_duration
  from orders o
  where o.user_id = p_user_id
    and o.created_at > now() - interval '30 days';

  -- Build feature vector (ID-based only)
  features := jsonb_build_object(
    'engagement_score', least(1.0, listen_through_rate),
    'session_count_7d', least(100, recent_sessions),
    'avg_session_duration_sec', least(3600, avg_duration)
  );

  return features;
end;
$$;

-- RLS Policies (DB-first security)
alter table personalization_features enable row level security;
alter table personalization_ranks enable row level security;
alter table personalization_eval enable row level security;
alter table personalization_settings enable row level security;

-- Features: users see own only; admin/superadmin see all
create policy personalization_features_user_own on personalization_features
  for all using (
    user_id = auth.uid() or
    exists (
      select 1 from profiles p 
      where p.id = auth.uid() 
        and p.role_id in (1,2) -- superadmin, admin
    )
  );

-- Rankings: users see own only; admin/superadmin see all
create policy personalization_ranks_user_own on personalization_ranks
  for all using (
    user_id = auth.uid() or
    exists (
      select 1 from profiles p 
      where p.id = auth.uid() 
        and p.role_id in (1,2) -- superadmin, admin
    )
  );

-- Evaluation: admin/superadmin only
create policy personalization_eval_admin_only on personalization_eval
  for all using (
    exists (
      select 1 from profiles p 
      where p.id = auth.uid() 
        and p.role_id in (1,2) -- superadmin, admin
    )
  );

-- Settings: users manage own only
create policy personalization_settings_user_own on personalization_settings
  for all using (user_id = auth.uid());

-- Cleanup job for expired rankings
create or replace function cleanup_expired_rankings() 
returns void
language plpgsql
as $$
begin
  delete from personalization_ranks 
  where valid_until < now() - interval '1 day';
  
  -- Keep only latest features per user
  delete from personalization_features 
  where id not in (
    select distinct on (user_id) id 
    from personalization_features 
    order by user_id, computed_at desc
  );
end;
$$;