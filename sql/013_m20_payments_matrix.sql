-- M20: Payments Matrix + Fallback - Country-aware payment processing
-- Extends existing payments schema with matrix routing and auto-fallback

-- Payment provider rules (country-based routing)
CREATE TABLE IF NOT EXISTS payment_provider_rules (
  id bigserial PRIMARY KEY,
  country_code text NOT NULL, -- ISO 3166-1 alpha-2
  provider text NOT NULL, -- 'stripe', 'square'
  priority integer NOT NULL DEFAULT 1, -- 1=primary, 2=fallback, etc
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT payment_provider_rules_provider_check 
    CHECK (provider IN ('stripe', 'square')),
  UNIQUE (country_code, provider, priority)
);

-- Payment attempts (tracking failures for auto-fallback)
CREATE TABLE IF NOT EXISTS payment_attempts (
  id bigserial PRIMARY KEY,
  order_id bigint NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  provider text NOT NULL,
  attempt_number integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'init', -- init, processing, succeeded, failed, fallback_triggered
  amount_cents bigint NOT NULL CHECK (amount_cents >= 0),
  currency text NOT NULL DEFAULT 'USD',
  provider_intent_id text, -- Stripe PaymentIntent.id or Square Payment.id
  idempotency_key text NOT NULL,
  client_params jsonb DEFAULT '{}'::jsonb, -- client_secret, etc
  failure_reason text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT payment_attempts_status_check 
    CHECK (status IN ('init', 'processing', 'succeeded', 'failed', 'fallback_triggered')),
  CONSTRAINT payment_attempts_provider_check 
    CHECK (provider IN ('stripe', 'square')),
  UNIQUE (order_id, attempt_number, provider)
);

-- Extend existing orders table for M20
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_provider text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'pending';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS awaiting_admin_review boolean DEFAULT false;

-- Add payment status constraint
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_payment_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_payment_status_check 
  CHECK (payment_status IN ('pending', 'processing', 'succeeded', 'failed', 'manual_review', 'awaiting_admin_review'));

-- Manual transfers and USDT support
CREATE TABLE IF NOT EXISTS manual_transfers (
  id bigserial PRIMARY KEY,
  order_id bigint NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  transfer_type text NOT NULL, -- 'bank_transfer', 'usdt', 'other'
  proof_media_id bigint REFERENCES media_assets(id),
  submitted_by uuid NOT NULL REFERENCES profiles(id),
  reviewed_by uuid REFERENCES profiles(id),
  review_status text DEFAULT 'pending', -- pending, approved, rejected
  review_notes text,
  aml_kyc_passed boolean DEFAULT false,
  amount_cents bigint NOT NULL CHECK (amount_cents >= 0),
  currency text NOT NULL,
  transaction_ref text, -- bank ref, USDT tx hash, etc
  submitted_at timestamptz DEFAULT now(),
  reviewed_at timestamptz,
  CONSTRAINT manual_transfers_type_check 
    CHECK (transfer_type IN ('bank_transfer', 'usdt', 'crypto', 'cash', 'other')),
  CONSTRAINT manual_transfers_review_status_check 
    CHECK (review_status IN ('pending', 'approved', 'rejected'))
);

-- Wallet system for credits and USDT topups
CREATE TABLE IF NOT EXISTS wallets (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  balance_cents bigint NOT NULL DEFAULT 0 CHECK (balance_cents >= 0),
  currency text NOT NULL DEFAULT 'USD',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (user_id, currency)
);

-- Wallet ledger for transaction history
CREATE TABLE IF NOT EXISTS wallet_ledger (
  id bigserial PRIMARY KEY,
  wallet_id bigint NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  amount_cents bigint NOT NULL, -- positive = credit, negative = debit
  balance_after_cents bigint NOT NULL,
  transaction_type text NOT NULL, -- topup, payment, refund, adjustment
  reference_type text, -- order, manual_transfer, refund
  reference_id bigint,
  description text NOT NULL,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  CONSTRAINT wallet_ledger_transaction_type_check 
    CHECK (transaction_type IN ('topup', 'payment', 'refund', 'adjustment', 'admin_credit'))
);

-- AML/KYC checklist for manual/USDT (FATF compliance)
CREATE TABLE IF NOT EXISTS aml_kyc_checks (
  id bigserial PRIMARY KEY,
  manual_transfer_id bigint NOT NULL REFERENCES manual_transfers(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id),
  risk_level text NOT NULL DEFAULT 'low', -- low, medium, high
  identity_verified boolean DEFAULT false,
  source_of_funds_documented boolean DEFAULT false,
  transaction_monitoring_passed boolean DEFAULT false,
  sanctions_screening_passed boolean DEFAULT false,
  pep_screening_passed boolean DEFAULT false, -- Politically Exposed Person
  suspicious_activity_detected boolean DEFAULT false,
  checklist_completed_by uuid REFERENCES profiles(id),
  checklist_completed_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT aml_kyc_checks_risk_level_check 
    CHECK (risk_level IN ('low', 'medium', 'high'))
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_payment_provider_rules_country ON payment_provider_rules(country_code, priority) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_payment_attempts_order ON payment_attempts(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_attempts_status ON payment_attempts(order_id, provider, status);
CREATE INDEX IF NOT EXISTS idx_manual_transfers_order ON manual_transfers(order_id);
CREATE INDEX IF NOT EXISTS idx_manual_transfers_status ON manual_transfers(review_status);
CREATE INDEX IF NOT EXISTS idx_wallets_user ON wallets(user_id, currency);
CREATE INDEX IF NOT EXISTS idx_wallet_ledger_wallet ON wallet_ledger(wallet_id);
CREATE INDEX IF NOT EXISTS idx_wallet_ledger_reference ON wallet_ledger(reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_aml_kyc_checks_transfer ON aml_kyc_checks(manual_transfer_id);

-- Functions for payment matrix routing
CREATE OR REPLACE FUNCTION get_payment_provider(country_code_param text) 
RETURNS text AS $$
DECLARE
  provider_result text;
BEGIN
  -- Get primary provider for country (priority 1)
  SELECT provider INTO provider_result
  FROM payment_provider_rules 
  WHERE country_code = UPPER(country_code_param) 
    AND priority = 1 
    AND is_active = true
  LIMIT 1;
  
  -- Default fallback logic
  IF provider_result IS NULL THEN
    IF UPPER(country_code_param) IN ('US', 'CA', 'AU', 'NZ') THEN
      RETURN 'square';
    ELSE
      RETURN 'stripe'; -- EU/UAE/IL/rest
    END IF;
  END IF;
  
  RETURN provider_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get fallback provider
CREATE OR REPLACE FUNCTION get_fallback_provider(country_code_param text, current_provider text) 
RETURNS text AS $$
BEGIN
  -- Simple toggle between stripe and square
  IF current_provider = 'stripe' THEN
    RETURN 'square';
  ELSE
    RETURN 'stripe';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check consecutive failures
CREATE OR REPLACE FUNCTION check_consecutive_failures(order_id_param bigint, provider_param text) 
RETURNS boolean AS $$
DECLARE
  failure_count integer;
BEGIN
  -- Count consecutive failures for this provider on this order
  SELECT COUNT(*) INTO failure_count
  FROM payment_attempts 
  WHERE order_id = order_id_param 
    AND provider = provider_param
    AND status = 'failed'
    AND created_at > (
      SELECT COALESCE(MAX(created_at), '1970-01-01'::timestamptz)
      FROM payment_attempts 
      WHERE order_id = order_id_param 
        AND provider = provider_param
        AND status IN ('succeeded', 'fallback_triggered')
    );
  
  RETURN failure_count >= 2;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update wallet balance trigger
CREATE OR REPLACE FUNCTION update_wallet_balance()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE wallets 
  SET balance_cents = balance_cents + NEW.amount_cents,
      updated_at = now()
  WHERE id = NEW.wallet_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_wallet_balance ON wallet_ledger;
CREATE TRIGGER trigger_update_wallet_balance
  AFTER INSERT ON wallet_ledger
  FOR EACH ROW
  EXECUTE FUNCTION update_wallet_balance();

-- Update timestamps trigger for relevant tables
DROP TRIGGER IF EXISTS trigger_payment_attempts_updated_at ON payment_attempts;
CREATE TRIGGER trigger_payment_attempts_updated_at
  BEFORE UPDATE ON payment_attempts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trigger_wallets_updated_at ON wallets;
CREATE TRIGGER trigger_wallets_updated_at
  BEFORE UPDATE ON wallets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Seed default payment provider rules
INSERT INTO payment_provider_rules (country_code, provider, priority) VALUES
-- Primary providers
('US', 'square', 1),
('CA', 'square', 1),
('AU', 'square', 1),
('NZ', 'square', 1),
('GB', 'stripe', 1),
('DE', 'stripe', 1),
('FR', 'stripe', 1),
('NL', 'stripe', 1),
('IT', 'stripe', 1),
('ES', 'stripe', 1),
('AE', 'stripe', 1), -- UAE
('IL', 'stripe', 1), -- Israel
-- Fallback providers
('US', 'stripe', 2),
('CA', 'stripe', 2),
('AU', 'stripe', 2),
('NZ', 'stripe', 2),
('GB', 'square', 2),
('DE', 'square', 2),
('FR', 'square', 2),
('NL', 'square', 2),
('IT', 'square', 2),
('ES', 'square', 2),
('AE', 'square', 2),
('IL', 'square', 2)
ON CONFLICT (country_code, provider, priority) DO NOTHING;

COMMENT ON TABLE payment_provider_rules IS 'M20: Country-based payment provider routing matrix';
COMMENT ON TABLE payment_attempts IS 'M20: Payment attempt tracking with auto-fallback logic';
COMMENT ON TABLE manual_transfers IS 'M20: Manual payment verification with AML/KYC';
COMMENT ON TABLE wallets IS 'M20: User wallet system for credits and topups';
COMMENT ON TABLE wallet_ledger IS 'M20: Immutable transaction log for wallet operations';
COMMENT ON TABLE aml_kyc_checks IS 'M20: FATF-compliant AML/KYC checklist for manual payments';
COMMENT ON FUNCTION get_payment_provider IS 'M20: Resolve primary payment provider by country';
COMMENT ON FUNCTION check_consecutive_failures IS 'M20: Detect when auto-fallback should trigger';