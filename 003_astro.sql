-- 003_astro.sql (idempotent) - M6 Astro Service: Birth data snapshot + Internal drafts
-- Apply via: python migrate.py up

-- Store a snapshot of astro input at order-time (so later profile edits don't affect the request)
create table if not exists astro_requests (
  order_id bigint primary key references orders(id) on delete cascade,
  user_id uuid not null references profiles(id),
  dob date not null,
  birth_place text,
  birth_time time,
  country text,
  country_code text,
  created_at timestamptz default now()
);

-- Internal analysis drafts (JSON) for readers/admins (never directly shown to clients)
create table if not exists astro_summaries (
  id bigserial primary key,
  order_id bigint not null references orders(id) on delete cascade,
  summary jsonb not null,
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

-- Indexes for performance
create index if not exists idx_astro_summaries_order on astro_summaries(order_id);