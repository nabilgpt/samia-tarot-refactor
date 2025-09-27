-- 007_payments.sql - M14 Payments Implementation (Idempotent)
-- Stripe/Square webhooks, idempotent payment intents, refunds, invoices

-- Payment intent states
CREATE TYPE payment_intent_status AS ENUM (
  'pending', 'processing', 'succeeded', 'failed', 'canceled', 'refunded'
);

-- Payment methods
CREATE TYPE payment_method AS ENUM (
  'stripe_card', 'square_card', 'usdt', 'manual_transfer'
);

-- Payment intents table (idempotent with external_id)
CREATE TABLE IF NOT EXISTS payment_intents (
  id BIGSERIAL PRIMARY KEY,
  external_id TEXT UNIQUE NOT NULL, -- Stripe/Square payment intent ID
  idempotency_key TEXT UNIQUE NOT NULL, -- Client-provided idempotency
  user_id UUID NOT NULL REFERENCES profiles(id),
  order_id BIGINT REFERENCES orders(id),
  
  amount_cents INT NOT NULL CHECK (amount_cents > 0),
  currency TEXT NOT NULL DEFAULT 'USD',
  payment_method payment_method NOT NULL,
  
  status payment_intent_status DEFAULT 'pending',
  provider_status TEXT, -- Raw provider status
  
  metadata JSONB DEFAULT '{}'::jsonb,
  provider_response JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  
  -- Ensure only one active intent per order
  CONSTRAINT unique_active_intent_per_order 
    EXCLUDE (order_id WITH =) WHERE (status IN ('pending', 'processing'))
);

-- Invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id BIGSERIAL PRIMARY KEY,
  invoice_number TEXT UNIQUE NOT NULL,
  user_id UUID NOT NULL REFERENCES profiles(id),
  payment_intent_id BIGINT REFERENCES payment_intents(id),
  
  amount_cents INT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  tax_cents INT DEFAULT 0,
  
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'void')),
  
  line_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  billing_details JSONB DEFAULT '{}'::jsonb,
  
  pdf_storage_key TEXT, -- Private bucket path for PDF
  pdf_generated_at TIMESTAMPTZ,
  
  issued_at TIMESTAMPTZ,
  due_date TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payment events (webhook logs with HMAC verification)
CREATE TABLE IF NOT EXISTS payment_events (
  id BIGSERIAL PRIMARY KEY,
  external_event_id TEXT UNIQUE NOT NULL, -- Provider event ID
  payment_intent_id BIGINT REFERENCES payment_intents(id),
  
  provider TEXT NOT NULL CHECK (provider IN ('stripe', 'square')),
  event_type TEXT NOT NULL,
  
  payload JSONB NOT NULL,
  hmac_signature TEXT NOT NULL,
  verified_at TIMESTAMPTZ,
  processed_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Refunds table
CREATE TABLE IF NOT EXISTS refunds (
  id BIGSERIAL PRIMARY KEY,
  external_refund_id TEXT UNIQUE NOT NULL,
  payment_intent_id BIGINT NOT NULL REFERENCES payment_intents(id),
  
  amount_cents INT NOT NULL CHECK (amount_cents > 0),
  currency TEXT NOT NULL DEFAULT 'USD',
  reason TEXT,
  
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'succeeded', 'failed')),
  
  refunded_by UUID REFERENCES profiles(id), -- Admin who initiated refund
  provider_response JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

-- Payment settings (provider configuration)
CREATE TABLE IF NOT EXISTS payment_settings (
  id SMALLSERIAL PRIMARY KEY,
  provider TEXT UNIQUE NOT NULL CHECK (provider IN ('stripe', 'square')),
  is_enabled BOOLEAN DEFAULT FALSE,
  is_test_mode BOOLEAN DEFAULT TRUE,
  
  config JSONB DEFAULT '{}'::jsonb, -- Encrypted secrets, endpoints
  last_health_check TIMESTAMPTZ,
  health_status TEXT DEFAULT 'unknown' CHECK (health_status IN ('healthy', 'degraded', 'down', 'unknown')),
  
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-update timestamps
CREATE OR REPLACE FUNCTION update_payment_timestamps()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER payment_intents_updated_at
  BEFORE UPDATE ON payment_intents
  FOR EACH ROW EXECUTE FUNCTION update_payment_timestamps();

CREATE TRIGGER invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION update_payment_timestamps();

-- Invoice number generator
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TEXT AS $$
DECLARE
  prefix TEXT := 'SAM';
  year_month TEXT := TO_CHAR(NOW(), 'YYMM');
  sequence_num INT;
  invoice_num TEXT;
BEGIN
  -- Get next sequence number for this month
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(invoice_number FROM '[0-9]+$') AS INT)
  ), 0) + 1
  INTO sequence_num
  FROM invoices
  WHERE invoice_number LIKE (prefix || year_month || '%');
  
  invoice_num := prefix || year_month || LPAD(sequence_num::TEXT, 4, '0');
  RETURN invoice_num;
END;
$$ LANGUAGE plpgsql;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_payment_intents_user_status ON payment_intents(user_id, status);
CREATE INDEX IF NOT EXISTS idx_payment_intents_order ON payment_intents(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_intents_external ON payment_intents(external_id);
CREATE INDEX IF NOT EXISTS idx_payment_events_external ON payment_events(external_event_id);
CREATE INDEX IF NOT EXISTS idx_payment_events_intent ON payment_events(payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_invoices_user ON invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_payment_intent ON invoices(payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_refunds_payment_intent ON refunds(payment_intent_id);

-- Seed payment settings
INSERT INTO payment_settings (provider, is_enabled, is_test_mode, config) VALUES
('stripe', false, true, '{"webhook_endpoint_secret": null}'::jsonb),
('square', false, true, '{"webhook_signature_key": null}'::jsonb)
ON CONFLICT (provider) DO NOTHING;