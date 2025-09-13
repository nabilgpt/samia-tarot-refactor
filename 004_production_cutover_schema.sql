-- 004_production_cutover_schema.sql
-- M31 Production Cutover & Monitoring Infrastructure
-- Feature flags, monitoring, circuit breakers, budget guards

create extension if not exists "uuid-ossp";

-- Feature Flags System
create table if not exists feature_flags (
  id bigserial primary key,
  flag_key text not null unique,
  flag_name text not null,
  description text,
  is_enabled boolean default false,
  rollout_percentage smallint default 0 check (rollout_percentage between 0 and 100),
  target_cohorts text[], -- timezone cohorts, user segments
  constraints jsonb default '{}'::jsonb, -- additional rollout rules
  created_by uuid references profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Golden Signals Monitoring (SRE)
create table if not exists monitoring_metrics (
  id bigserial primary key,
  metric_name text not null,
  metric_type text not null check (metric_type in ('latency','traffic','errors','saturation')),
  service_name text not null,
  value numeric not null,
  unit text not null, -- ms, requests/sec, percentage, etc.
  labels jsonb default '{}'::jsonb, -- additional dimensions
  recorded_at timestamptz default now()
);

-- SLO Definitions and Alerts
create table if not exists slo_definitions (
  id bigserial primary key,
  slo_name text not null unique,
  service_name text not null,
  metric_type text not null,
  target_value numeric not null,
  comparison_op text not null check (comparison_op in ('<','<=','>','>=','=')),
  time_window_minutes int not null default 5,
  alert_threshold_breaches int not null default 3, -- consecutive breaches before alert
  is_active boolean default true,
  created_at timestamptz default now()
);

-- Circuit Breaker State for External Providers
create table if not exists circuit_breakers (
  id bigserial primary key,
  provider_name text not null unique,
  provider_type text not null check (provider_type in ('payment','sms','push','email','storage')),
  state text not null default 'CLOSED' check (state in ('CLOSED','OPEN','HALF_OPEN')),
  failure_count int not null default 0,
  failure_threshold int not null default 5,
  success_threshold int not null default 3, -- for HALF_OPEN -> CLOSED
  timeout_seconds int not null default 30,
  last_failure_at timestamptz,
  last_success_at timestamptz,
  state_changed_at timestamptz default now(),
  metadata jsonb default '{}'::jsonb
);

-- Budget Tracking and Cost Guards
create table if not exists budget_tracking (
  id bigserial primary key,
  budget_category text not null, -- payments, sms, push, storage, compute
  date_tracked date not null,
  spend_amount_cents bigint not null default 0,
  budget_limit_cents bigint not null,
  alert_threshold_percentage smallint not null default 80,
  is_alert_sent boolean default false,
  metadata jsonb default '{}'::jsonb,
  unique (budget_category, date_tracked)
);

-- Production Incidents and Events
create table if not exists production_incidents (
  id bigserial primary key,
  incident_type text not null check (incident_type in ('alert','outage','degradation','breach','budget')),
  severity text not null check (severity in ('critical','high','medium','low')),
  title text not null,
  description text,
  affected_services text[],
  started_at timestamptz not null,
  resolved_at timestamptz,
  resolved_by uuid references profiles(id),
  resolution_notes text,
  post_mortem_url text,
  labels jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- System Health Checks
create table if not exists health_checks (
  id bigserial primary key,
  check_name text not null,
  check_type text not null check (check_type in ('database','api','provider','storage','cache')),
  status text not null check (status in ('healthy','degraded','unhealthy')),
  response_time_ms int,
  error_message text,
  metadata jsonb default '{}'::jsonb,
  checked_at timestamptz default now()
);

-- Indexes for performance
create index if not exists idx_feature_flags_key on feature_flags(flag_key);
create index if not exists idx_feature_flags_enabled on feature_flags(is_enabled) where is_enabled = true;
create index if not exists idx_monitoring_metrics_service_time on monitoring_metrics(service_name, recorded_at desc);
create index if not exists idx_monitoring_metrics_type_time on monitoring_metrics(metric_type, recorded_at desc);
create index if not exists idx_circuit_breakers_provider on circuit_breakers(provider_name);
create index if not exists idx_circuit_breakers_state on circuit_breakers(state, provider_type);
create index if not exists idx_budget_tracking_category_date on budget_tracking(budget_category, date_tracked desc);
create index if not exists idx_production_incidents_severity_time on production_incidents(severity, started_at desc);
create index if not exists idx_health_checks_type_time on health_checks(check_type, checked_at desc);

-- RLS Policies (Admin/Superadmin for management; Monitor for read-only operations)
alter table feature_flags enable row level security;
alter table monitoring_metrics enable row level security;
alter table slo_definitions enable row level security;
alter table circuit_breakers enable row level security;
alter table budget_tracking enable row level security;
alter table production_incidents enable row level security;
alter table health_checks enable row level security;

-- Feature flags: Admin/Superadmin manage; Monitor read-only
create policy feature_flags_admin_manage on feature_flags
  for all using (
    exists (
      select 1 from profiles p 
      where p.id = auth.uid() 
        and p.role_id in (1,2) -- superadmin, admin
    )
  );

create policy feature_flags_monitor_read on feature_flags
  for select using (
    exists (
      select 1 from profiles p 
      where p.id = auth.uid() 
        and p.role_id = 4 -- monitor
    )
  );

-- Monitoring: Admin/Superadmin full; Monitor read/write for operations
create policy monitoring_admin_full on monitoring_metrics
  for all using (
    exists (
      select 1 from profiles p 
      where p.id = auth.uid() 
        and p.role_id in (1,2,4) -- superadmin, admin, monitor
    )
  );

-- SLO definitions: Admin/Superadmin only
create policy slo_definitions_admin_only on slo_definitions
  for all using (
    exists (
      select 1 from profiles p 
      where p.id = auth.uid() 
        and p.role_id in (1,2) -- superadmin, admin
    )
  );

-- Circuit breakers: Admin/Superadmin manage; Monitor read/write for state changes
create policy circuit_breakers_ops_access on circuit_breakers
  for all using (
    exists (
      select 1 from profiles p 
      where p.id = auth.uid() 
        and p.role_id in (1,2,4) -- superadmin, admin, monitor
    )
  );

-- Budget tracking: Admin/Superadmin only
create policy budget_tracking_admin_only on budget_tracking
  for all using (
    exists (
      select 1 from profiles p 
      where p.id = auth.uid() 
        and p.role_id in (1,2) -- superadmin, admin
    )
  );

-- Production incidents: Admin/Superadmin/Monitor access
create policy production_incidents_ops_access on production_incidents
  for all using (
    exists (
      select 1 from profiles p 
      where p.id = auth.uid() 
        and p.role_id in (1,2,4) -- superadmin, admin, monitor
    )
  );

-- Health checks: All ops roles can access
create policy health_checks_ops_access on health_checks
  for all using (
    exists (
      select 1 from profiles p 
      where p.id = auth.uid() 
        and p.role_id in (1,2,4) -- superadmin, admin, monitor
    )
  );

-- Helper functions for monitoring and circuit breakers
create or replace function check_feature_flag(flag_key_param text, user_cohort text default null) 
returns boolean
language plpgsql
security definer
stable
as $$
declare
  flag_record record;
begin
  select is_enabled, rollout_percentage, target_cohorts, constraints
  into flag_record
  from feature_flags 
  where flag_key = flag_key_param;
  
  if not found then
    return false; -- Feature flag not found, default to disabled
  end if;
  
  if not flag_record.is_enabled then
    return false;
  end if;
  
  -- Check rollout percentage (simple random distribution)
  if flag_record.rollout_percentage < 100 then
    if (hashtext(flag_key_param || coalesce(user_cohort, '')) % 100) >= flag_record.rollout_percentage then
      return false;
    end if;
  end if;
  
  -- Check cohort targeting
  if flag_record.target_cohorts is not null and array_length(flag_record.target_cohorts, 1) > 0 then
    if user_cohort is null or not (user_cohort = any(flag_record.target_cohorts)) then
      return false;
    end if;
  end if;
  
  return true;
end;
$$;

create or replace function record_metric(
  metric_name_param text,
  metric_type_param text,
  service_name_param text,
  value_param numeric,
  unit_param text,
  labels_param jsonb default '{}'::jsonb
) 
returns void
language plpgsql
security definer
as $$
begin
  insert into monitoring_metrics 
  (metric_name, metric_type, service_name, value, unit, labels)
  values 
  (metric_name_param, metric_type_param, service_name_param, value_param, unit_param, labels_param);
end;
$$;

create or replace function update_circuit_breaker(
  provider_name_param text,
  success boolean
) 
returns text
language plpgsql
security definer
as $$
declare
  breaker_record record;
  new_state text;
begin
  select * into breaker_record 
  from circuit_breakers 
  where provider_name = provider_name_param;
  
  if not found then
    -- Create new circuit breaker with default settings
    insert into circuit_breakers (provider_name, provider_type)
    values (provider_name_param, 'unknown');
    return 'CLOSED';
  end if;
  
  if success then
    -- Success case
    if breaker_record.state = 'HALF_OPEN' then
      -- Increment success count, possibly move to CLOSED
      if breaker_record.failure_count <= 1 then -- Simple success threshold
        new_state := 'CLOSED';
      else
        new_state := 'HALF_OPEN';
      end if;
    else
      new_state := 'CLOSED';
    end if;
    
    update circuit_breakers 
    set 
      state = new_state,
      failure_count = 0,
      last_success_at = now(),
      state_changed_at = case when state != new_state then now() else state_changed_at end
    where provider_name = provider_name_param;
    
  else
    -- Failure case
    new_state := case
      when breaker_record.failure_count + 1 >= breaker_record.failure_threshold then 'OPEN'
      else breaker_record.state
    end;
    
    update circuit_breakers 
    set 
      state = new_state,
      failure_count = failure_count + 1,
      last_failure_at = now(),
      state_changed_at = case when state != new_state then now() else state_changed_at end
    where provider_name = provider_name_param;
  end if;
  
  return new_state;
end;
$$;

create or replace function check_budget_alert(budget_category_param text, current_date date default current_date)
returns boolean
language plpgsql
security definer
as $$
declare
  budget_record record;
  alert_threshold_amount bigint;
begin
  select * into budget_record
  from budget_tracking 
  where budget_category = budget_category_param 
    and date_tracked = current_date;
  
  if not found then
    return false;
  end if;
  
  alert_threshold_amount := (budget_record.budget_limit_cents * budget_record.alert_threshold_percentage) / 100;
  
  if budget_record.spend_amount_cents >= alert_threshold_amount and not budget_record.is_alert_sent then
    -- Mark alert as sent
    update budget_tracking 
    set is_alert_sent = true 
    where id = budget_record.id;
    
    return true;
  end if;
  
  return false;
end;
$$;

-- Seed essential feature flags
insert into feature_flags (flag_key, flag_name, description, is_enabled, rollout_percentage) values
('community_enabled', 'Community Features', 'Enable community comments and reactions', false, 0),
('notifications_enabled', 'Push Notifications', 'Enable push notification campaigns', false, 1),
('personalization_enabled', 'Personalized Rankings', 'Enable AI-powered personalization', true, 100),
('ar_experiments_enabled', 'AR Experiments', 'Enable AR asset features', false, 0),
('auto_translation_enabled', 'Auto Translation', 'Enable automated translation workflows', true, 100),
('rate_limiting_enabled', 'Rate Limiting', 'Enable API rate limiting', true, 100),
('circuit_breakers_enabled', 'Circuit Breakers', 'Enable provider circuit breakers', true, 100),
('budget_guards_enabled', 'Budget Guards', 'Enable spend monitoring and alerts', true, 100)
on conflict (flag_key) do update set
  flag_name = excluded.flag_name,
  description = excluded.description;

-- Seed circuit breakers for external providers
insert into circuit_breakers (provider_name, provider_type, failure_threshold, success_threshold, timeout_seconds) values
('stripe', 'payment', 5, 3, 30),
('square', 'payment', 5, 3, 30),
('twilio_sms', 'sms', 3, 2, 60),
('twilio_voice', 'sms', 3, 2, 60),
('fcm', 'push', 10, 5, 30),
('apns', 'push', 10, 5, 30),
('supabase_storage', 'storage', 5, 3, 30)
on conflict (provider_name) do update set
  provider_type = excluded.provider_type,
  failure_threshold = excluded.failure_threshold;

-- Seed SLO definitions (Google SRE Golden Signals)
insert into slo_definitions (slo_name, service_name, metric_type, target_value, comparison_op, time_window_minutes) values
('api_latency_p95', 'api_gateway', 'latency', 500, '<', 5), -- P95 latency < 500ms
('api_error_rate', 'api_gateway', 'errors', 1.0, '<', 5), -- Error rate < 1%
('database_latency_p95', 'database', 'latency', 100, '<', 5), -- DB latency < 100ms
('payment_success_rate', 'payments', 'traffic', 99.0, '>', 15), -- Payment success > 99%
('storage_availability', 'storage', 'saturation', 99.5, '>', 5), -- Storage availability > 99.5%
('notification_delivery_rate', 'notifications', 'traffic', 95.0, '>', 10) -- Notification delivery > 95%
on conflict (slo_name) do update set
  target_value = excluded.target_value,
  time_window_minutes = excluded.time_window_minutes;

-- Seed budget categories with initial limits
insert into budget_tracking (budget_category, date_tracked, spend_amount_cents, budget_limit_cents, alert_threshold_percentage) values
('payments', current_date, 0, 100000, 80), -- $1000/day payment processing
('sms', current_date, 0, 50000, 80), -- $500/day SMS
('push_notifications', current_date, 0, 10000, 80), -- $100/day push
('storage', current_date, 0, 20000, 80), -- $200/day storage
('compute', current_date, 0, 150000, 80) -- $1500/day compute
on conflict (budget_category, date_tracked) do nothing;