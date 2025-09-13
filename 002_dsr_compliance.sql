-- 002_dsr_compliance.sql - GDPR DSR (Data Subject Rights) Implementation
-- Implements GDPR Articles 15 (Access) and 17 (Erasure) with immutable audit trails

-- DSR Request Types
create type dsr_request_type as enum ('export', 'delete', 'rectification', 'restriction', 'portability');
create type dsr_status as enum ('pending', 'verified', 'processing', 'completed', 'rejected', 'expired');

-- DSR Requests Table
create table if not exists dsr_requests (
  id bigserial primary key,
  user_id uuid not null references profiles(id),
  request_type dsr_request_type not null,
  status dsr_status default 'pending',
  verification_token text unique,
  verification_method text check (verification_method in ('email', 'email_2fa', 'admin_override')),
  verified_at timestamptz,
  admin_approved_by uuid references profiles(id),
  admin_approved_at timestamptz,
  scheduled_for timestamptz, -- grace period end
  completed_at timestamptz,
  expiry_date timestamptz not null default (now() + interval '30 days'),
  reason text,
  notes text,
  export_url text, -- signed URL for export download
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  
  -- Ensure user can't have multiple active requests of same type
  constraint unique_active_dsr unique (user_id, request_type) deferrable initially deferred
);

-- DSR Immutable Audit Log (hash-chained for tamper evidence)
create table if not exists dsr_audit_log (
  id bigserial primary key,
  dsr_request_id bigint not null references dsr_requests(id),
  event_type text not null check (event_type in ('created', 'verified', 'approved', 'rejected', 'processing', 'completed', 'expired')),
  actor_id uuid references profiles(id),
  actor_role text,
  details jsonb default '{}'::jsonb,
  prev_hash text, -- hash of previous row for chain integrity
  row_hash text not null, -- hash of this row's content
  created_at timestamptz default now()
);

-- Data Categories for Export/Delete (GDPR Art. 15/17 compliance)
create table if not exists data_categories (
  id smallserial primary key,
  category text unique not null,
  description text not null,
  tables_affected text[] not null, -- list of table names
  retention_days int, -- null = indefinite
  requires_admin_approval boolean default false,
  is_active boolean default true
);

-- Data Retention Policies
create table if not exists retention_policies (
  id bigserial primary key,
  table_name text not null,
  category_id smallint references data_categories(id),
  retention_days int not null,
  deletion_method text check (deletion_method in ('hard_delete', 'anonymize', 'archive')) default 'hard_delete',
  where_clause text, -- SQL where condition for selective deletion
  is_active boolean default true,
  created_by uuid not null references profiles(id),
  created_at timestamptz default now()
);

-- Age Verification and Consent
create type consent_type as enum ('data_processing', 'marketing', 'analytics', 'ai_assistance', 'third_party_sharing');
create type consent_status as enum ('given', 'withdrawn', 'expired', 'not_required');

create table if not exists user_consents (
  id bigserial primary key,
  user_id uuid not null references profiles(id),
  consent_type consent_type not null,
  status consent_status not null,
  given_at timestamptz,
  withdrawn_at timestamptz,
  expiry_date timestamptz,
  ip_address inet,
  user_agent text,
  consent_version text not null, -- tracks consent document version
  created_at timestamptz default now(),
  
  unique (user_id, consent_type, consent_version)
);

-- Age Verification Records
create table if not exists age_verifications (
  id bigserial primary key,
  user_id uuid not null references profiles(id),
  verification_method text check (verification_method in ('dob_declaration', 'id_document', 'parental_consent', 'admin_override')) not null,
  verified_age int,
  is_adult boolean generated always as (verified_age >= 18) stored,
  verification_date timestamptz not null default now(),
  document_hash text, -- hash of uploaded ID if used
  verified_by uuid references profiles(id), -- admin who verified
  ip_address inet,
  user_agent text,
  notes text,
  
  unique (user_id, verification_method)
);

-- COPPA Protection for Under-13 Edge Cases
create table if not exists coppa_incidents (
  id bigserial primary key,
  user_id uuid not null references profiles(id),
  detected_age int,
  detection_method text not null,
  auto_blocked_at timestamptz default now(),
  parental_consent_requested boolean default false,
  parental_consent_received_at timestamptz,
  admin_reviewed_by uuid references profiles(id),
  admin_reviewed_at timestamptz,
  resolution text check (resolution in ('blocked_permanently', 'parental_consent_granted', 'age_corrected', 'false_positive')),
  notes text
);

-- Functions for DSR Processing

-- Generate hash for audit chain
create or replace function generate_audit_hash(
  p_dsr_request_id bigint,
  p_event_type text,
  p_actor_id uuid,
  p_details jsonb,
  p_prev_hash text
) returns text language plpgsql as $$
declare
  content_hash text;
begin
  -- Create hash from concatenated content + previous hash
  content_hash := encode(
    digest(
      concat(
        p_dsr_request_id::text,
        p_event_type,
        coalesce(p_actor_id::text, ''),
        p_details::text,
        coalesce(p_prev_hash, '')
      ), 
      'sha256'
    ),
    'hex'
  );
  return content_hash;
end $$;

-- Trigger for audit log hash chaining
create or replace function dsr_audit_hash_trigger() returns trigger language plpgsql as $$
declare
  prev_hash text;
begin
  -- Get hash of previous row in this DSR chain
  select row_hash into prev_hash
  from dsr_audit_log
  where dsr_request_id = new.dsr_request_id
  order by id desc
  limit 1;
  
  -- Generate hash for this row
  new.prev_hash := prev_hash;
  new.row_hash := generate_audit_hash(
    new.dsr_request_id,
    new.event_type,
    new.actor_id,
    new.details,
    new.prev_hash
  );
  
  return new;
end $$;

drop trigger if exists dsr_audit_hash_chain on dsr_audit_log;
create trigger dsr_audit_hash_chain
  before insert on dsr_audit_log
  for each row execute function dsr_audit_hash_trigger();

-- Auto-expire DSR requests
create or replace function expire_dsr_requests() returns void language plpgsql as $$
begin
  update dsr_requests 
  set status = 'expired', updated_at = now()
  where status in ('pending', 'verified')
    and expiry_date < now();
    
  -- Log expiry events
  insert into dsr_audit_log (dsr_request_id, event_type, details)
  select id, 'expired', '{"reason": "automatic_expiry"}'::jsonb
  from dsr_requests
  where status = 'expired'
    and not exists (
      select 1 from dsr_audit_log dal
      where dal.dsr_request_id = dsr_requests.id
        and dal.event_type = 'expired'
    );
end $$;

-- Data Categories Seeds
insert into data_categories (category, description, tables_affected, retention_days, requires_admin_approval) values
('profile_data', 'Basic user profile information', '["profiles", "user_consents", "age_verifications"]', 2555, false), -- 7 years
('order_history', 'Service orders and booking history', '["orders", "media_assets"]', 2555, false),
('financial_data', 'Payment and transaction records', '["payments", "transactions", "invoices"]', 2555, true), -- Requires admin approval
('communication_logs', 'Call logs and message history', '["calls", "messages", "chat_logs"]', 1825, false), -- 5 years
('moderation_data', 'Moderation actions and flags', '["moderation_actions", "user_reports"]', 2555, true),
('audit_logs', 'System audit and security logs', '["audit_log", "dsr_audit_log"]', 2555, true),
('analytics_data', 'Usage analytics and metrics', '["user_events", "analytics_aggregates"]', 730, false) -- 2 years
on conflict (category) do nothing;

-- Age Verification Triggers
create or replace function check_user_age() returns trigger language plpgsql as $$
begin
  -- If DOB indicates under 13, create COPPA incident
  if new.dob is not null and extract(year from age(new.dob)) < 13 then
    insert into coppa_incidents (user_id, detected_age, detection_method)
    values (new.id, extract(year from age(new.dob))::int, 'dob_declaration')
    on conflict do nothing;
    
    -- Auto-block user
    update profiles set role_id = null where id = new.id;
  end if;
  
  return new;
end $$;

drop trigger if exists check_age_on_profile_update on profiles;
create trigger check_age_on_profile_update
  after insert or update of dob on profiles
  for each row execute function check_user_age();

-- Indexes for performance
create index if not exists idx_dsr_requests_user_type_status on dsr_requests (user_id, request_type, status);
create index if not exists idx_dsr_requests_status_expiry on dsr_requests (status, expiry_date);
create index if not exists idx_dsr_audit_log_request_id on dsr_audit_log (dsr_request_id);
create index if not exists idx_user_consents_user_type on user_consents (user_id, consent_type);
create index if not exists idx_age_verifications_user_adult on age_verifications (user_id, is_adult);

-- RLS Policies will be added after initial testing