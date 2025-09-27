-- 002_ops.sql (idempotent) - M5 Upgrade: Auto-publish, Retention, Voice Refresh, Admin Regenerate
-- Apply via: python migrate.py up

-- App-wide settings
create table if not exists app_settings (
  id smallserial primary key,
  key text unique not null,
  value text not null,
  updated_at timestamptz default now(),
  updated_by uuid references profiles(id)
);

-- Per-zodiac configuration settings
create table if not exists zodiac_settings (
  id smallserial primary key,
  zodiac text not null check (zodiac in ('Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces')),
  key text not null,
  value text not null,
  updated_at timestamptz default now(),
  updated_by uuid references profiles(id),
  unique (zodiac, key)
);

-- Settings change requests (admin → superadmin approval)
create table if not exists settings_change_requests (
  id bigserial primary key,
  kind text check (kind in ('app','zodiac')) not null,
  target_key text not null,           -- app setting key OR zodiac name
  current_value text,
  proposed_value text not null,
  diff jsonb,                         -- structured change description
  proposed_by uuid references profiles(id) not null,
  reviewed_by uuid references profiles(id),
  status text check (status in ('pending','approved','rejected')) default 'pending',
  review_reason text,
  created_at timestamptz default now(),
  reviewed_at timestamptz
);

-- Voice models for TTS synthesis
create table if not exists voice_models (
  id bigserial primary key,
  name text unique not null,
  provider text not null,            -- e.g. 'elevenlabs', 'azure', etc.
  model_id text not null,            -- provider-specific model identifier
  voice_id text,                     -- provider voice ID if applicable
  is_active boolean default false,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_by uuid references profiles(id)
);

-- Indexes for performance
create index if not exists idx_app_settings_key on app_settings(key);
create index if not exists idx_zodiac_settings_zodiac_key on zodiac_settings(zodiac, key);
create index if not exists idx_settings_change_requests_status on settings_change_requests(status);
create index if not exists idx_settings_change_requests_kind_target on settings_change_requests(kind, target_key);
create index if not exists idx_voice_models_active on voice_models(is_active);

-- Default app settings
insert into app_settings(key, value) values 
('auto_publish_daily', 'true'),
('retention_days', '50'),
('current_voice_model_id', '1'),
('voice_refresh_enabled', 'true'),
('default_country', 'US'),
('default_timezone', 'UTC')
on conflict (key) do nothing;

-- Default voice model
insert into voice_models(id, name, provider, model_id, is_active) values
(1, 'Default Samia Voice', 'system', 'samia-default', true)
on conflict (id) do nothing;