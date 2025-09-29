-- M011_wallet_payouts.sql
-- Wallet & Cashout System (as per Backend Core Spec)
-- Client wallet = store credit only (no cashout)
-- Readers/Staff eligible for cashout

CREATE TABLE IF NOT EXISTS payout_accounts (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id),
  account_type TEXT NOT NULL CHECK (account_type IN ('bank_transfer', 'paypal', 'wise', 'crypto')),

  -- Bank details (encrypted in production)
  bank_name TEXT,
  account_number TEXT,
  routing_number TEXT,
  swift_code TEXT,
  iban TEXT,

  -- PayPal/Wise
  email TEXT,

  -- Crypto
  wallet_address TEXT,
  network TEXT,

  is_verified BOOLEAN DEFAULT FALSE,
  is_primary BOOLEAN DEFAULT FALSE,

  metadata JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT one_primary_per_user UNIQUE (user_id, is_primary) WHERE is_primary = TRUE
);

CREATE TABLE IF NOT EXISTS cashout_requests (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id),
  payout_account_id BIGINT NOT NULL REFERENCES payout_accounts(id),

  amount_usd NUMERIC(12,2) NOT NULL CHECK (amount_usd > 0),

  -- Workflow: pending_review_admin → pending_execution_superadmin → settled/rejected
  status TEXT NOT NULL DEFAULT 'pending_review_admin'
    CHECK (status IN ('pending_review_admin', 'pending_execution_superadmin', 'settled', 'rejected')),

  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,

  executed_by UUID REFERENCES profiles(id),
  executed_at TIMESTAMPTZ,
  execution_notes TEXT,

  settlement_reference TEXT,
  settlement_proof_url TEXT,

  rejected_reason TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_payout_accounts_user_id ON payout_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_cashout_requests_user_id ON cashout_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_cashout_requests_status ON cashout_requests(status);

-- RLS Policies
ALTER TABLE payout_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cashout_requests ENABLE ROW LEVEL SECURITY;

-- Payout accounts: users see own, admins see all
CREATE POLICY payout_accounts_select_own ON payout_accounts
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role_id IN (SELECT id FROM roles WHERE code IN ('admin', 'superadmin'))
    )
  );

CREATE POLICY payout_accounts_insert_own ON payout_accounts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY payout_accounts_update_own ON payout_accounts
  FOR UPDATE USING (auth.uid() = user_id);

-- Cashout requests: users see own, admins/superadmins see all
CREATE POLICY cashout_requests_select_own ON cashout_requests
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role_id IN (SELECT id FROM roles WHERE code IN ('admin', 'superadmin'))
    )
  );

CREATE POLICY cashout_requests_insert_own ON cashout_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Only admins can update (review), only superadmins can execute
CREATE POLICY cashout_requests_update_admin ON cashout_requests
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role_id IN (SELECT id FROM roles WHERE code IN ('admin', 'superadmin'))
    )
  );

COMMENT ON TABLE payout_accounts IS 'Non-client cashout accounts (readers/staff only)';
COMMENT ON TABLE cashout_requests IS 'Cashout workflow: pending_review_admin → pending_execution_superadmin → settled/rejected';