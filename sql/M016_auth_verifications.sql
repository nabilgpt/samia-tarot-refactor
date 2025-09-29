-- verification channels (idempotent)
do $$ begin
  if not exists (select 1 from pg_type where typname = 'verify_channel') then
    create type verify_channel as enum ('email','whatsapp','sms');
  end if;
end $$;

create table if not exists verification_attempts (
  id bigserial primary key,
  user_id uuid references auth.users(id) on delete cascade,
  identifier text not null, -- email or phone
  channel verify_channel not null,
  failed_count int not null default 0,
  locked_until timestamptz,
  last_attempt_at timestamptz,
  created_at timestamptz default now(),
  constraint uq_verif unique(user_id, identifier, channel)
);

alter table verification_attempts enable row level security;
create policy "verif_owner_all" on verification_attempts for all using (auth.uid() = user_id or is_admin()) with check (auth.uid() = user_id or is_admin());