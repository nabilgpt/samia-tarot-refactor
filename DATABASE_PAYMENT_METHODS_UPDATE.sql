-- ==========================================================
-- SAMIA TAROT - Payment Methods System Database Updates
-- ==========================================================
-- 
-- PURPOSE: Implement restricted payment methods system with only approved methods
-- METHODS: stripe, square, usdt, western_union, moneygram, ria, omt, whish, bob, wallet
-- 
-- ==========================================================

-- 1. UPDATE PAYMENTS TABLE (ensure correct constraints)
-- ==========================================================
-- The payments table already exists with correct constraints, but let's verify/update

-- Ensure payments table has correct method constraint
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_method_check;
ALTER TABLE payments ADD CONSTRAINT payments_method_check CHECK (
  method IN (
    'stripe', 'square', 'usdt', 'western_union', 'moneygram',
    'ria', 'omt', 'whish', 'bob', 'wallet'
  )
);

-- Add receipt_image column for receipt uploads (if not exists)
ALTER TABLE payments ADD COLUMN IF NOT EXISTS receipt_image TEXT;

-- Update status constraint to include all required statuses
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_status_check;
ALTER TABLE payments ADD CONSTRAINT payments_status_check CHECK (
  status IN (
    'pending', 'processing', 'completed', 'failed', 
    'refunded', 'awaiting_approval', 'rejected'
  )
);

-- Add country_code for regional filtering
ALTER TABLE payments ADD COLUMN IF NOT EXISTS country_code VARCHAR(3);

-- ==========================================================
-- 2. CREATE PAYMENT_SETTINGS TABLE
-- ==========================================================
-- This table manages global payment method configuration

CREATE TABLE IF NOT EXISTS payment_settings (
  id SERIAL PRIMARY KEY,
  method VARCHAR(32) NOT NULL UNIQUE CHECK (
    method IN (
      'stripe', 'square', 'usdt', 'western_union', 'moneygram',
      'ria', 'omt', 'whish', 'bob', 'wallet'
    )
  ),
  enabled BOOLEAN DEFAULT true,
  countries TEXT[] DEFAULT '{}', -- Array of country codes where this method is available
  details JSONB DEFAULT '{}', -- Method-specific configuration
  fees JSONB DEFAULT '{}', -- Fee structure
  processing_time VARCHAR(100),
  auto_confirm BOOLEAN DEFAULT false,
  requires_receipt BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================================
-- 3. CREATE PAYMENT_GATEWAYS TABLE
-- ==========================================================
-- This table stores gateway-specific configurations (API keys, etc.)

CREATE TABLE IF NOT EXISTS payment_gateways (
  id SERIAL PRIMARY KEY,
  gateway VARCHAR(32) NOT NULL UNIQUE CHECK (
    gateway IN ('stripe', 'square')
  ),
  environment VARCHAR(20) DEFAULT 'sandbox' CHECK (
    environment IN ('sandbox', 'production')
  ),
  api_config JSONB NOT NULL DEFAULT '{}', -- Encrypted API keys and configuration
  features JSONB DEFAULT '{}', -- Available features (apple_pay, google_pay, etc.)
  is_active BOOLEAN DEFAULT false,
  last_sync TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================================
-- 4. CREATE PAYMENT_REGIONS TABLE
-- ==========================================================
-- This table defines which payment methods are available in which regions

CREATE TABLE IF NOT EXISTS payment_regions (
  id SERIAL PRIMARY KEY,
  country_code VARCHAR(3) NOT NULL,
  country_name VARCHAR(100) NOT NULL,
  region VARCHAR(50), -- Middle East, Europe, Americas, etc.
  available_methods TEXT[] NOT NULL, -- Array of available payment methods
  preferred_method VARCHAR(32), -- Default/preferred method for this region
  currency VARCHAR(3) DEFAULT 'USD',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(country_code)
);

-- ==========================================================
-- 5. INSERT DEFAULT PAYMENT SETTINGS
-- ==========================================================

-- Insert default payment method configurations
INSERT INTO payment_settings (method, enabled, countries, details, fees, processing_time, auto_confirm, requires_receipt, display_order) VALUES
-- Card Payment Methods
('stripe', true, 
 ARRAY['DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'AT', 'PT', 'IE', 'LU', 'AE'], 
 '{"description": "Credit/Debit Card via Stripe", "supports_apple_pay": true, "supports_google_pay": true}',
 '{"percentage": 2.9, "fixed": 0.30, "currency": "USD"}',
 'Instant', true, false, 1),

('square', true, 
 ARRAY['US', 'CA', 'AU', 'GB', 'JP'], 
 '{"description": "Credit/Debit Card via Square", "supports_apple_pay": true, "supports_google_pay": true}',
 '{"percentage": 2.6, "fixed": 0.10, "currency": "USD"}',
 'Instant', true, false, 2),

-- Cryptocurrency
('usdt', true, 
 ARRAY['GLOBAL'], 
 '{"description": "USDT Cryptocurrency", "networks": ["ethereum", "tron"], "wallet_addresses": {"ethereum": "", "tron": ""}}',
 '{"type": "network", "description": "Network fees only"}',
 '5-15 minutes', false, true, 3),

-- International Transfer Services
('western_union', true, 
 ARRAY['GLOBAL'], 
 '{"description": "Western Union Money Transfer", "requires_id": true}',
 '{"range": "5-15", "currency": "USD", "description": "Transfer fee"}',
 '1-3 business days', false, true, 4),

('moneygram', true, 
 ARRAY['GLOBAL'], 
 '{"description": "MoneyGram International Transfer", "requires_id": true}',
 '{"range": "5-12", "currency": "USD", "description": "Transfer fee"}',
 '1-3 business days', false, true, 5),

('ria', true, 
 ARRAY['GLOBAL'], 
 '{"description": "Ria Money Transfer Service", "requires_id": true}',
 '{"range": "3-10", "currency": "USD", "description": "Transfer fee"}',
 '1-2 business days', false, true, 6),

-- Lebanon-specific Methods
('omt', true, 
 ARRAY['LB'], 
 '{"description": "OMT Lebanon Money Transfer", "local_currency": "LBP"}',
 '{"range": "2-5", "currency": "USD", "description": "Local transfer fee"}',
 'Same day', false, true, 7),

('whish', true, 
 ARRAY['LB'], 
 '{"description": "Whish Money Digital Wallet", "local_currency": "LBP"}',
 '{"percentage": 1.5, "description": "Transaction fee"}',
 'Instant', false, true, 8),

('bob', true, 
 ARRAY['LB'], 
 '{"description": "Bank of Beirut Direct Transfer", "local_currency": "LBP"}',
 '{"fixed": 0, "description": "No additional fees"}',
 '1-2 business days', false, true, 9),

-- In-App Wallet
('wallet', true, 
 ARRAY['GLOBAL'], 
 '{"description": "SAMIA In-App Wallet", "instant_payment": true}',
 '{"fixed": 0, "description": "No fees"}',
 'Instant', true, false, 10);

-- ==========================================================
-- 6. INSERT DEFAULT PAYMENT REGIONS
-- ==========================================================

-- Europe - Stripe supported countries
INSERT INTO payment_regions (country_code, country_name, region, available_methods, preferred_method, currency) VALUES
('DE', 'Germany', 'Europe', ARRAY['stripe', 'usdt', 'western_union', 'moneygram', 'ria', 'wallet'], 'stripe', 'EUR'),
('FR', 'France', 'Europe', ARRAY['stripe', 'usdt', 'western_union', 'moneygram', 'ria', 'wallet'], 'stripe', 'EUR'),
('IT', 'Italy', 'Europe', ARRAY['stripe', 'usdt', 'western_union', 'moneygram', 'ria', 'wallet'], 'stripe', 'EUR'),
('ES', 'Spain', 'Europe', ARRAY['stripe', 'usdt', 'western_union', 'moneygram', 'ria', 'wallet'], 'stripe', 'EUR'),
('NL', 'Netherlands', 'Europe', ARRAY['stripe', 'usdt', 'western_union', 'moneygram', 'ria', 'wallet'], 'stripe', 'EUR'),
('BE', 'Belgium', 'Europe', ARRAY['stripe', 'usdt', 'western_union', 'moneygram', 'ria', 'wallet'], 'stripe', 'EUR'),
('AT', 'Austria', 'Europe', ARRAY['stripe', 'usdt', 'western_union', 'moneygram', 'ria', 'wallet'], 'stripe', 'EUR'),
('PT', 'Portugal', 'Europe', ARRAY['stripe', 'usdt', 'western_union', 'moneygram', 'ria', 'wallet'], 'stripe', 'EUR'),
('IE', 'Ireland', 'Europe', ARRAY['stripe', 'usdt', 'western_union', 'moneygram', 'ria', 'wallet'], 'stripe', 'EUR'),
('LU', 'Luxembourg', 'Europe', ARRAY['stripe', 'usdt', 'western_union', 'moneygram', 'ria', 'wallet'], 'stripe', 'EUR'),

-- UAE - Stripe supported
('AE', 'United Arab Emirates', 'Middle East', ARRAY['stripe', 'usdt', 'western_union', 'moneygram', 'ria', 'wallet'], 'stripe', 'AED'),

-- Square supported countries
('US', 'United States', 'Americas', ARRAY['square', 'usdt', 'western_union', 'moneygram', 'ria', 'wallet'], 'square', 'USD'),
('CA', 'Canada', 'Americas', ARRAY['square', 'usdt', 'western_union', 'moneygram', 'ria', 'wallet'], 'square', 'CAD'),
('AU', 'Australia', 'Oceania', ARRAY['square', 'usdt', 'western_union', 'moneygram', 'ria', 'wallet'], 'square', 'AUD'),
('GB', 'United Kingdom', 'Europe', ARRAY['square', 'usdt', 'western_union', 'moneygram', 'ria', 'wallet'], 'square', 'GBP'),
('JP', 'Japan', 'Asia', ARRAY['square', 'usdt', 'western_union', 'moneygram', 'ria', 'wallet'], 'square', 'JPY'),

-- Lebanon - Special methods
('LB', 'Lebanon', 'Middle East', ARRAY['square', 'usdt', 'western_union', 'moneygram', 'ria', 'omt', 'whish', 'bob', 'wallet'], 'omt', 'LBP'),

-- Default/Global - Square for others
('XX', 'Other Countries', 'Global', ARRAY['square', 'usdt', 'western_union', 'moneygram', 'ria', 'wallet'], 'square', 'USD');

-- ==========================================================
-- 7. ADD INDEXES FOR PERFORMANCE
-- ==========================================================

CREATE INDEX IF NOT EXISTS idx_payment_settings_method ON payment_settings(method);
CREATE INDEX IF NOT EXISTS idx_payment_settings_enabled ON payment_settings(enabled);
CREATE INDEX IF NOT EXISTS idx_payment_gateways_gateway ON payment_gateways(gateway);
CREATE INDEX IF NOT EXISTS idx_payment_gateways_active ON payment_gateways(is_active);
CREATE INDEX IF NOT EXISTS idx_payment_regions_country ON payment_regions(country_code);
CREATE INDEX IF NOT EXISTS idx_payment_regions_region ON payment_regions(region);
CREATE INDEX IF NOT EXISTS idx_payments_country ON payments(country_code);

-- ==========================================================
-- 8. ADD ROW LEVEL SECURITY
-- ==========================================================

-- Enable RLS
ALTER TABLE payment_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_gateways ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_regions ENABLE ROW LEVEL SECURITY;

-- Payment settings policies (Admin/Super Admin only)
CREATE POLICY "Only super admins can manage payment settings" ON payment_settings FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
);

CREATE POLICY "Admins can view payment settings" ON payment_settings FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin', 'monitor'))
);

-- Payment gateways policies (Super Admin only)
CREATE POLICY "Only super admins can manage payment gateways" ON payment_gateways FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
);

-- Payment regions policies (readable by all authenticated users)
CREATE POLICY "Authenticated users can view payment regions" ON payment_regions FOR SELECT USING (
  auth.role() = 'authenticated'
);

CREATE POLICY "Only super admins can manage payment regions" ON payment_regions FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
);

-- ==========================================================
-- 9. CREATE FUNCTIONS FOR PAYMENT METHOD MANAGEMENT
-- ==========================================================

-- Function to get available payment methods for a country
CREATE OR REPLACE FUNCTION get_available_payment_methods(user_country_code VARCHAR(3))
RETURNS TABLE(
  method VARCHAR(32),
  enabled BOOLEAN,
  details JSONB,
  fees JSONB,
  processing_time VARCHAR(100),
  auto_confirm BOOLEAN,
  requires_receipt BOOLEAN,
  display_order INTEGER
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ps.method,
    ps.enabled,
    ps.details,
    ps.fees,
    ps.processing_time,
    ps.auto_confirm,
    ps.requires_receipt,
    ps.display_order
  FROM payment_settings ps
  JOIN payment_regions pr ON user_country_code = pr.country_code
  WHERE ps.enabled = true
    AND (
      ps.method = ANY(pr.available_methods) OR
      'GLOBAL' = ANY(ps.countries) OR
      user_country_code = ANY(ps.countries)
    )
  ORDER BY ps.display_order ASC;
END;
$$;

-- Function to validate payment method for country
CREATE OR REPLACE FUNCTION validate_payment_method(user_country_code VARCHAR(3), payment_method VARCHAR(32))
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  is_valid BOOLEAN := false;
BEGIN
  SELECT true INTO is_valid
  FROM payment_settings ps
  JOIN payment_regions pr ON user_country_code = pr.country_code
  WHERE ps.method = payment_method
    AND ps.enabled = true
    AND (
      ps.method = ANY(pr.available_methods) OR
      'GLOBAL' = ANY(ps.countries) OR
      user_country_code = ANY(ps.countries)
    );
  
  RETURN COALESCE(is_valid, false);
END;
$$;

-- ==========================================================
-- 10. UPDATE TRIGGERS
-- ==========================================================

-- Add updated_at triggers for new tables
CREATE TRIGGER payment_settings_updated_at 
  BEFORE UPDATE ON payment_settings 
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER payment_gateways_updated_at 
  BEFORE UPDATE ON payment_gateways 
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER payment_regions_updated_at 
  BEFORE UPDATE ON payment_regions 
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- ==========================================================
-- SUMMARY OF CHANGES
-- ==========================================================
--
-- NEW TABLES CREATED:
-- 1. payment_settings - Global payment method configuration
-- 2. payment_gateways - API keys and gateway configurations
-- 3. payment_regions - Regional payment method availability
--
-- TABLES MODIFIED:
-- 1. payments - Updated constraints and added columns
--
-- NEW FUNCTIONS:
-- 1. get_available_payment_methods(country_code) - Get available methods for country
-- 2. validate_payment_method(country_code, method) - Validate method for country
--
-- SECURITY:
-- - Row Level Security policies for all new tables
-- - Super Admin only access to sensitive configurations
-- - Proper access controls for different user roles
--
-- INDEXES:
-- - Performance indexes on all relevant columns
-- - Optimized for payment method lookups and filtering
--
-- ========================================================== 