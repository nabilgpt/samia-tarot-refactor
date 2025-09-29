create table if not exists profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  first_name text not null,
  last_name  text not null,
  gender text not null check (gender in ('male','female','other')),
  marital_status text not null check (marital_status in ('single','married','divorced','widowed','on_relation','its_complicated')),
  email text not null,
  whatsapp_e164 text not null,
  country_iso2 text not null,
  city text,
  time_zone text not null default 'Asia/Riyadh',
  dob date not null check (dob <= (current_date - interval '18 years')),
  zodiac_sun text not null,
  language text not null check (language in ('ar','en')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table profiles enable row level security;
create index if not exists idx_profiles_user_id on profiles(user_id);

create policy "profiles_owner_sel" on profiles for select using (auth.uid() = user_id or is_staff());
create policy "profiles_owner_upd" on profiles for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "profiles_admin_all" on profiles for all    using (is_admin()) with check (is_admin());