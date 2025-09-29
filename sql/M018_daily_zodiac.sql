-- enums (idempotent)
do $$ begin
  if not exists (select 1 from pg_type where typname = 'lang_enum') then
    create type lang_enum as enum ('ar','en');
  end if;
  if not exists (select 1 from pg_type where typname = 'zodiac_sign') then
    create type zodiac_sign as enum ('aries','taurus','gemini','cancer','leo','virgo','libra','scorpio','sagittarius','capricorn','aquarius','pisces');
  end if;
end $$;

create or replace function ksa_today() returns date language sql stable as $$
  select (timezone('Asia/Riyadh', now()))::date;
$$;

create table if not exists daily_zodiac (
  id bigserial primary key,
  date_key date not null,
  lang lang_enum not null,
  sign zodiac_sign not null,
  title text not null,
  teaser text,
  body text not null,
  audio_path text,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  unique(date_key, lang, sign)
);

alter table daily_zodiac enable row level security;
create index if not exists idx_daily_zodiac_key on daily_zodiac(date_key, lang, sign);

-- RLS: client sees own sign for today (KSA), staff see last 60 days
create policy "dz_client_today_own_sign" on daily_zodiac for select using (
  app_role() = 'client' and archived = false and date_key = ksa_today() and sign = (
    select p.zodiac_sun::zodiac_sign from profiles p where p.user_id = auth.uid()
  )
);

create policy "dz_staff_last_60d" on daily_zodiac for select using (
  is_staff() and date_key >= (ksa_today() - 60)
);

create policy "dz_admin_ins" on daily_zodiac for insert with check (is_admin());
create policy "dz_admin_upd" on daily_zodiac for update using (is_admin()) with check (is_admin());