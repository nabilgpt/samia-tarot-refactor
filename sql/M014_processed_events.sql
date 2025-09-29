-- Idempotent consumer table for webhooks (Stripe/Square/etc.)
create table if not exists processed_events (
  provider text not null,
  event_id text primary key,
  processed_at timestamptz not null default now()
);

alter table processed_events enable row level security;
-- Administrators only (service role/edge functions)
create policy "pe_admin_all" on processed_events for all using (is_admin()) with check (is_admin());