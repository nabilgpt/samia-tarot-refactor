-- 007_payments.sql - M14 Payments & Billing Schema (idempotent)
-- Provider-agnostic payment processing with invoice generation

-- Payment intents (provider-agnostic)
create table if not exists payment_intents (
  id bigserial primary key,
  order_id bigint not null references orders(id) on delete cascade,
  provider text not null,                 -- e.g. 'stripe','checkout','tap'
  provider_intent_id text unique,         -- external reference
  amount_cents bigint not null check (amount_cents >= 0),
  currency text not null,                 -- ISO 4217
  status text not null check (status in ('created','requires_action','processing','succeeded','failed','canceled')),
  client_secret text,                     -- if applicable (never expose in logs)
  meta jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Invoices and receipts
create table if not exists invoices (
  id bigserial primary key,
  order_id bigint not null references orders(id) on delete cascade,
  payment_intent_id bigint references payment_intents(id) on delete set null,
  number text unique,                     -- e.g. SAMIA-2025-000123
  subtotal_cents bigint not null,
  vat_cents bigint not null default 0,
  total_cents bigint not null,
  currency text not null,
  pdf_media_id bigint references media_assets(id),
  billing_name text,
  billing_email text,
  billing_country text,
  meta jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- Refunds and disputes
create table if not exists refunds (
  id bigserial primary key,
  order_id bigint not null references orders(id) on delete cascade,
  payment_intent_id bigint references payment_intents(id) on delete set null,
  provider_refund_id text unique,
  amount_cents bigint not null check (amount_cents > 0),
  currency text not null,
  reason text,
  status text not null check (status in ('requested','processing','succeeded','failed')),
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

-- Promotional codes
create table if not exists promo_codes (
  id bigserial primary key,
  code text unique not null,
  percent_off int check (percent_off between 1 and 100),
  active boolean default true,
  valid_from date,
  valid_to date,
  max_redemptions int,
  redemptions int default 0,
  created_at timestamptz default now()
);

-- Payment webhook events log
create table if not exists payment_events (
  id bigserial primary key,
  provider text not null,
  event_type text not null,
  payload jsonb not null,
  signature_valid boolean,
  received_at timestamptz default now()
);

-- Indexes for performance
create index if not exists idx_payment_intents_order on payment_intents(order_id);
create index if not exists idx_payment_intents_provider_id on payment_intents(provider_intent_id);
create index if not exists idx_invoices_order on invoices(order_id);
create index if not exists idx_invoices_number on invoices(number);
create index if not exists idx_refunds_order on refunds(order_id);
create index if not exists idx_promo_codes_code on promo_codes(code) where active = true;
create index if not exists idx_payment_events_provider on payment_events(provider, event_type);

-- RLS policies (inherit from M8 global RLS setup)
-- Clients can only see their own payment intents/invoices
-- Admins can see all payment data
-- Payment events are admin-only for security