-- 003_ar_i18n_schema.sql
-- M26 AR Experiments + M27 i18n Deepening - Database Schema
-- Admin-only flows; secure AR storage; ICU MessageFormat i18n

create extension if not exists "uuid-ossp";

-- M26: AR Assets (Augmented Reality experiments)
create table if not exists ar_assets (
  id bigserial primary key,
  owner_id uuid not null references profiles(id),
  kind text not null check (kind in ('overlay','filter','effect','model','animation')),
  filename text not null,
  content_type text not null,
  sha256 text not null unique,
  bytes bigint not null,
  duration_ms int, -- for video/animation assets
  frame_count int, -- for animation assets
  storage_path text not null, -- Supabase Storage path
  metadata jsonb default '{}'::jsonb,
  is_approved boolean default false,
  approved_by uuid references profiles(id),
  approved_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- M26: AR Asset Links (link AR assets to orders/horoscopes)
create table if not exists ar_links (
  id bigserial primary key,
  ar_asset_id bigint not null references ar_assets(id) on delete cascade,
  subject_type text not null check (subject_type in ('order','horoscope','profile')),
  subject_id text not null, -- Can link to orders.id, horoscopes.id, profiles.id
  link_position jsonb, -- Optional position/orientation data
  is_active boolean default true,
  created_by uuid not null references profiles(id),
  created_at timestamptz default now(),
  unique (ar_asset_id, subject_type, subject_id)
);

-- M27: Translation entries (ICU MessageFormat compatible)
create table if not exists translations (
  id bigserial primary key,
  message_key text not null,
  language_code text not null check (length(language_code) = 2), -- ISO 639-1
  message_text text not null,
  source_lang text default 'en',
  auto_translated boolean default false,
  reviewed_at timestamptz,
  reviewed_by uuid references profiles(id),
  is_approved boolean default false,
  context_notes text, -- For translators
  pluralization_data jsonb, -- ICU plural rules if needed
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (message_key, language_code)
);

-- M27: Translation glossary (protected terms)
create table if not exists translation_glossary (
  id bigserial primary key,
  term text not null unique,
  definition text,
  do_not_translate boolean default false,
  preferred_translations jsonb, -- {lang: translation} pairs
  created_at timestamptz default now()
);

-- M27: Translation audit log
create table if not exists translation_audit (
  id bigserial primary key,
  translation_id bigint references translations(id),
  action text not null check (action in ('created','updated','approved','rejected','auto_translated')),
  actor_id uuid references profiles(id),
  old_value text,
  new_value text,
  notes text,
  created_at timestamptz default now()
);

-- Indexes for performance
create index if not exists idx_ar_assets_owner_kind on ar_assets(owner_id, kind);
create index if not exists idx_ar_assets_sha256 on ar_assets(sha256);
create index if not exists idx_ar_assets_approved on ar_assets(is_approved, approved_at) where is_approved = true;
create index if not exists idx_ar_links_subject on ar_links(subject_type, subject_id, is_active);
create index if not exists idx_translations_key_lang on translations(message_key, language_code);
create index if not exists idx_translations_review_status on translations(is_approved, reviewed_at);
create index if not exists idx_translation_glossary_term on translation_glossary(term);

-- RLS Policies (Admin/Superadmin only for both modules)
alter table ar_assets enable row level security;
alter table ar_links enable row level security;
alter table translations enable row level security;
alter table translation_glossary enable row level security;
alter table translation_audit enable row level security;

-- AR Assets: Admin/Superadmin manage; Reader read if linked to assigned orders
create policy ar_assets_admin_full on ar_assets
  for all using (
    exists (
      select 1 from profiles p 
      where p.id = auth.uid() 
        and p.role_id in (1,2) -- superadmin, admin
    )
  );

create policy ar_assets_reader_linked on ar_assets
  for select using (
    exists (
      select 1 from profiles p 
      where p.id = auth.uid() 
        and p.role_id = 3 -- reader
    )
    and exists (
      select 1 from ar_links al
      join orders o on al.subject_type = 'order' and al.subject_id::bigint = o.id
      where al.ar_asset_id = ar_assets.id
        and o.assigned_reader = auth.uid()
        and al.is_active = true
    )
  );

-- AR Links: Admin/Superadmin only
create policy ar_links_admin_only on ar_links
  for all using (
    exists (
      select 1 from profiles p 
      where p.id = auth.uid() 
        and p.role_id in (1,2) -- superadmin, admin
    )
  );

-- Translations: Admin/Superadmin only
create policy translations_admin_only on translations
  for all using (
    exists (
      select 1 from profiles p 
      where p.id = auth.uid() 
        and p.role_id in (1,2) -- superadmin, admin
    )
  );

-- Translation glossary: Admin/Superadmin only
create policy translation_glossary_admin_only on translation_glossary
  for all using (
    exists (
      select 1 from profiles p 
      where p.id = auth.uid() 
        and p.role_id in (1,2) -- superadmin, admin
    )
  );

-- Translation audit: Admin/Superadmin only
create policy translation_audit_admin_only on translation_audit
  for all using (
    exists (
      select 1 from profiles p 
      where p.id = auth.uid() 
        and p.role_id in (1,2) -- superadmin, admin
    )
  );

-- Helper functions
create or replace function validate_ar_file_type(content_type text) 
returns boolean
language plpgsql
immutable
as $$
begin
  return content_type in (
    'image/png', 'image/jpeg', 'image/webp',
    'video/mp4', 'video/webm',
    'application/octet-stream', -- for 3D models
    'model/gltf-binary', 'model/gltf+json'
  );
end;
$$;

create or replace function audit_translation_change()
returns trigger
language plpgsql
as $$
begin
  if TG_OP = 'INSERT' then
    insert into translation_audit 
    (translation_id, action, actor_id, new_value)
    values (NEW.id, 'created', auth.uid(), NEW.message_text);
  elsif TG_OP = 'UPDATE' then
    if OLD.message_text != NEW.message_text then
      insert into translation_audit 
      (translation_id, action, actor_id, old_value, new_value)
      values (NEW.id, 'updated', auth.uid(), OLD.message_text, NEW.message_text);
    end if;
    
    if OLD.is_approved != NEW.is_approved and NEW.is_approved = true then
      insert into translation_audit 
      (translation_id, action, actor_id, notes)
      values (NEW.id, 'approved', auth.uid(), 'Translation approved');
    end if;
  end if;
  
  return coalesce(NEW, OLD);
end;
$$;

-- Triggers
create trigger audit_translation_changes
  after insert or update on translations
  for each row execute procedure audit_translation_change();

-- Seed data
insert into translation_glossary (term, definition, do_not_translate, preferred_translations) values
('Samia', 'Brand name - never translate', true, '{}'),
('Tarot', 'Divination practice - may translate but prefer original', false, '{"ar": "تاروت"}'),
('Horoscope', 'Astrological forecast', false, '{"ar": "برج"}'),
('Reading', 'Divination session', false, '{"ar": "قراءة"}'),
('Energy Healing', 'Spiritual practice', false, '{"ar": "الشفاء بالطاقة"}')
on conflict (term) do nothing;

-- Base translations for admin interface
insert into translations (message_key, language_code, message_text, is_approved) values
('admin.dashboard.title', 'en', 'Admin Dashboard', true),
('admin.dashboard.title', 'ar', 'لوحة التحكم', true),
('admin.orders.pending', 'en', 'Pending Orders', true),
('admin.orders.pending', 'ar', 'الطلبات المعلقة', true),
('admin.users.total', 'en', 'Total Users', true),
('admin.users.total', 'ar', 'إجمالي المستخدمين', true),
('admin.moderation.queue', 'en', 'Moderation Queue', true),
('admin.moderation.queue', 'ar', 'قائمة المراجعة', true)
on conflict (message_key, language_code) do update set
  message_text = excluded.message_text,
  updated_at = now();