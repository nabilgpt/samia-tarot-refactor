-- =====================================================
-- SAMIA TAROT - Rewards & Referral System Database
-- =====================================================

-- User points balance table
CREATE TABLE IF NOT EXISTS rewards_points (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  balance INT NOT NULL DEFAULT 0,
  lifetime_earned INT NOT NULL DEFAULT 0,
  lifetime_redeemed INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Points transactions (earn, redeem, referral, manual admin operations)
CREATE TABLE IF NOT EXISTS rewards_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT CHECK (type IN ('earn', 'redeem', 'referral', 'admin_adjust', 'booking_bonus', 'welcome_bonus', 'expiry')) NOT NULL,
  points INT NOT NULL,
  source TEXT, -- booking_id, referral_code, admin, payment_id, etc
  description TEXT,
  metadata JSONB DEFAULT '{}', -- Additional data like booking details, admin user, etc
  status TEXT CHECK (status IN ('pending', 'completed', 'cancelled')) DEFAULT 'completed',
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  processed_at TIMESTAMP DEFAULT NOW()
);

-- Referral codes per user
CREATE TABLE IF NOT EXISTS referral_codes (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  code TEXT UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  usage_count INT DEFAULT 0,
  max_uses INT DEFAULT NULL, -- NULL means unlimited
  expires_at TIMESTAMP DEFAULT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Track usage of referral codes
CREATE TABLE IF NOT EXISTS referral_uses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT REFERENCES referral_codes(code) ON DELETE CASCADE,
  referrer_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  referred_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  referrer_points INT DEFAULT 0,
  referred_points INT DEFAULT 0,
  status TEXT CHECK (status IN ('pending', 'completed', 'cancelled')) DEFAULT 'completed',
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(code, referred_user_id) -- Prevent duplicate uses by same user
);

-- Rewards configuration (admin configurable)
CREATE TABLE IF NOT EXISTS rewards_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Redemption options (what users can redeem points for)
CREATE TABLE IF NOT EXISTS redemption_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  points_required INT NOT NULL,
  value_amount DECIMAL(10,2), -- Dollar value or discount amount
  type TEXT CHECK (type IN ('discount', 'credit', 'service', 'gift')) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  max_uses_per_user INT DEFAULT NULL,
  expires_at TIMESTAMP DEFAULT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Track redemptions
CREATE TABLE IF NOT EXISTS redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  option_id UUID REFERENCES redemption_options(id) ON DELETE CASCADE,
  points_used INT NOT NULL,
  value_received DECIMAL(10,2),
  status TEXT CHECK (status IN ('pending', 'completed', 'cancelled', 'expired')) DEFAULT 'pending',
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  expires_at TIMESTAMP,
  redeemed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- INDEXES for Performance
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_rewards_transactions_user_id ON rewards_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_rewards_transactions_type ON rewards_transactions(type);
CREATE INDEX IF NOT EXISTS idx_rewards_transactions_created_at ON rewards_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rewards_transactions_user_type ON rewards_transactions(user_id, type);

CREATE INDEX IF NOT EXISTS idx_referral_uses_referrer ON referral_uses(referrer_user_id);
CREATE INDEX IF NOT EXISTS idx_referral_uses_referred ON referral_uses(referred_user_id);
CREATE INDEX IF NOT EXISTS idx_referral_uses_code ON referral_uses(code);

CREATE INDEX IF NOT EXISTS idx_referral_codes_code ON referral_codes(code);
CREATE INDEX IF NOT EXISTS idx_referral_codes_active ON referral_codes(is_active);

CREATE INDEX IF NOT EXISTS idx_redemptions_user_id ON redemptions(user_id);
CREATE INDEX IF NOT EXISTS idx_redemptions_status ON redemptions(status);

-- =====================================================
-- TRIGGERS for Automatic Updates
-- =====================================================

-- Update rewards_points balance when transactions are added
CREATE OR REPLACE FUNCTION update_rewards_balance()
RETURNS TRIGGER AS $$
BEGIN
  -- Update balance and lifetime counters
  IF NEW.type IN ('earn', 'referral', 'admin_adjust', 'booking_bonus', 'welcome_bonus') AND NEW.points > 0 THEN
    INSERT INTO rewards_points (user_id, balance, lifetime_earned, updated_at)
    VALUES (NEW.user_id, NEW.points, NEW.points, NOW())
    ON CONFLICT (user_id) 
    DO UPDATE SET 
      balance = rewards_points.balance + NEW.points,
      lifetime_earned = rewards_points.lifetime_earned + NEW.points,
      updated_at = NOW();
  ELSIF NEW.type IN ('redeem', 'expiry') AND NEW.points < 0 THEN
    INSERT INTO rewards_points (user_id, balance, lifetime_redeemed, updated_at)
    VALUES (NEW.user_id, NEW.points, ABS(NEW.points), NOW())
    ON CONFLICT (user_id) 
    DO UPDATE SET 
      balance = rewards_points.balance + NEW.points,
      lifetime_redeemed = rewards_points.lifetime_redeemed + ABS(NEW.points),
      updated_at = NOW();
  ELSIF NEW.type = 'admin_adjust' THEN
    INSERT INTO rewards_points (user_id, balance, updated_at)
    VALUES (NEW.user_id, NEW.points, NOW())
    ON CONFLICT (user_id) 
    DO UPDATE SET 
      balance = rewards_points.balance + NEW.points,
      updated_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_rewards_balance
  AFTER INSERT ON rewards_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_rewards_balance();

-- Update referral code usage count
CREATE OR REPLACE FUNCTION update_referral_usage()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE referral_codes 
  SET usage_count = usage_count + 1, updated_at = NOW()
  WHERE code = NEW.code;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_referral_usage
  AFTER INSERT ON referral_uses
  FOR EACH ROW
  EXECUTE FUNCTION update_referral_usage();

-- =====================================================
-- DEFAULT CONFIGURATION DATA
-- =====================================================

-- Insert default rewards configuration
INSERT INTO rewards_config (key, value, description) VALUES
('points_per_dollar', '10', 'Points earned per dollar spent'),
('referrer_bonus', '100', 'Points awarded to referrer when someone uses their code'),
('referred_bonus', '50', 'Points awarded to new user when they use a referral code'),
('welcome_bonus', '25', 'Points awarded to new users on signup'),
('booking_completion_bonus', '20', 'Extra points for completing a booking'),
('min_redemption_points', '100', 'Minimum points required for redemption'),
('points_expiry_days', '365', 'Days after which unused points expire (0 = never)'),
('max_referral_uses', '0', 'Maximum times a referral code can be used (0 = unlimited)')
ON CONFLICT (key) DO NOTHING;

-- Insert default redemption options
INSERT INTO redemption_options (name, description, points_required, value_amount, type) VALUES
('$5 Service Credit', 'Get $5 credit towards your next tarot reading', 500, 5.00, 'credit'),
('$10 Service Credit', 'Get $10 credit towards your next tarot reading', 1000, 10.00, 'credit'),
('$20 Service Credit', 'Get $20 credit towards your next tarot reading', 2000, 20.00, 'credit'),
('Free 15-min Reading', 'Get a complimentary 15-minute tarot reading', 1500, 15.00, 'service'),
('Premium Reading Discount', '50% off your next premium reading session', 800, 0.50, 'discount')
ON CONFLICT DO NOTHING;

-- =====================================================
-- UTILITY FUNCTIONS
-- =====================================================

-- Function to generate unique referral code
CREATE OR REPLACE FUNCTION generate_referral_code(p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_code TEXT;
  v_username TEXT;
  v_counter INT := 0;
BEGIN
  -- Get username from profiles
  SELECT username INTO v_username FROM profiles WHERE id = p_user_id;
  
  -- Generate base code from username or user_id
  IF v_username IS NOT NULL THEN
    v_code := UPPER(SUBSTRING(v_username FROM 1 FOR 6)) || SUBSTRING(p_user_id::TEXT FROM 1 FOR 4);
  ELSE
    v_code := 'USER' || SUBSTRING(p_user_id::TEXT FROM 1 FOR 6);
  END IF;
  
  -- Ensure uniqueness
  WHILE EXISTS (SELECT 1 FROM referral_codes WHERE code = v_code) LOOP
    v_counter := v_counter + 1;
    v_code := v_code || v_counter::TEXT;
  END LOOP;
  
  RETURN v_code;
END;
$$ LANGUAGE plpgsql;

-- Function to check if user can redeem points
CREATE OR REPLACE FUNCTION can_redeem_points(p_user_id UUID, p_points INT)
RETURNS BOOLEAN AS $$
DECLARE
  v_balance INT;
  v_min_points INT;
BEGIN
  -- Get current balance
  SELECT balance INTO v_balance FROM rewards_points WHERE user_id = p_user_id;
  IF v_balance IS NULL THEN v_balance := 0; END IF;
  
  -- Get minimum redemption points
  SELECT (value::TEXT)::INT INTO v_min_points FROM rewards_config WHERE key = 'min_redemption_points';
  IF v_min_points IS NULL THEN v_min_points := 100; END IF;
  
  RETURN v_balance >= p_points AND p_points >= v_min_points;
END;
$$ LANGUAGE plpgsql; 