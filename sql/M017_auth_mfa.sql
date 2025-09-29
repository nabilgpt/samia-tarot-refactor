-- mfa types (idempotent)
do $$ begin
  if not exists (select 1 from pg_type where typname = 'mfa_type') then
    create type mfa_type as enum ('totp','webauthn');
  end if;
end $$;

create table if not exists mfa_enrollments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type mfa_type not null,
  secret jsonb not null,
  active boolean not null default true,
  created_at timestamptz default now(),
  last_used_at timestamptz
);

alter table mfa_enrollments enable row level security;
create policy "mfa_owner_ro" on mfa_enrollments for select using (auth.uid() = user_id or is_admin());
create policy "mfa_owner_cud" on mfa_enrollments for all    using (auth.uid() = user_id) with check (auth.uid() = user_id);