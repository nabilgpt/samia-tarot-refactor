-- M012_rewards.sql
-- Rewards System (as per Backend Core Spec)
-- Points are NOT cash; require rating/comment gate
-- Redeem at checkout (contra-revenue)

CREATE TABLE IF NOT EXISTS reward_balances (
  user_id UUID PRIMARY KEY REFERENCES profiles(id),
  points_available INT NOT NULL DEFAULT 0 CHECK (points_available >= 0),
  points_pending INT NOT NULL DEFAULT 0 CHECK (points_pending >= 0),
  points_lifetime INT NOT NULL DEFAULT 0 CHECK (points_lifetime >= 0),

  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reward_events (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id),
  order_id BIGINT REFERENCES orders(id),

  event_type TEXT NOT NULL CHECK (event_type IN (
    'earned_rating', 'earned_comment', 'earned_both',
    'redeemed', 'expired', 'reversed_refund', 'reversed_cancel'
  )),

  points_delta INT NOT NULL,
  points_balance_after INT NOT NULL CHECK (points_balance_after >= 0),

  -- Gate: rating=50%, comment=50%, both=100%
  has_rating BOOLEAN DEFAULT FALSE,
  has_comment BOOLEAN DEFAULT FALSE,

  expires_at TIMESTAMPTZ,

  metadata JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_reward_events_user_id ON reward_events(user_id);
CREATE INDEX IF NOT EXISTS idx_reward_events_order_id ON reward_events(order_id);
CREATE INDEX IF NOT EXISTS idx_reward_events_expires_at ON reward_events(expires_at) WHERE expires_at IS NOT NULL;

-- RLS Policies
ALTER TABLE reward_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE reward_events ENABLE ROW LEVEL SECURITY;

-- Users see own balance
CREATE POLICY reward_balances_select_own ON reward_balances
  FOR SELECT USING (auth.uid() = user_id);

-- System can update (via Edge Functions)
CREATE POLICY reward_balances_update_system ON reward_balances
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role_id IN (SELECT id FROM roles WHERE code IN ('admin', 'superadmin'))
    )
  );

-- Users see own events
CREATE POLICY reward_events_select_own ON reward_events
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role_id IN (SELECT id FROM roles WHERE code IN ('admin', 'superadmin'))
    )
  );

-- Only system can insert events
CREATE POLICY reward_events_insert_system ON reward_events
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role_id IN (SELECT id FROM roles WHERE code IN ('admin', 'superadmin'))
    )
  );

COMMENT ON TABLE reward_balances IS 'User reward points balances (not cash)';
COMMENT ON TABLE reward_events IS 'Reward point transaction history with rating/comment gate';
COMMENT ON COLUMN reward_events.has_rating IS 'Rating given = 50% points';
COMMENT ON COLUMN reward_events.has_comment IS 'Comment given = 50% points';
COMMENT ON COLUMN reward_events.has_rating IS 'Both rating + comment = 100% points';