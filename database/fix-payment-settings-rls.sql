-- Fix payment_settings RLS policies to allow system initialization
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "payment_settings_select" ON payment_settings;
DROP POLICY IF EXISTS "payment_settings_insert" ON payment_settings;
DROP POLICY IF EXISTS "payment_settings_update" ON payment_settings;
DROP POLICY IF EXISTS "payment_settings_delete" ON payment_settings;

-- Create new policies that allow system operations
CREATE POLICY "payment_settings_select" ON payment_settings
    FOR SELECT USING (true);

CREATE POLICY "payment_settings_insert" ON payment_settings
    FOR INSERT WITH CHECK (true);

CREATE POLICY "payment_settings_update" ON payment_settings
    FOR UPDATE USING (true);

CREATE POLICY "payment_settings_delete" ON payment_settings
    FOR DELETE USING (true);

-- Ensure the table exists with correct structure (matches current implementation)
CREATE TABLE IF NOT EXISTS payment_settings (
    id SERIAL PRIMARY KEY,
    method VARCHAR(50) NOT NULL UNIQUE,
    enabled BOOLEAN DEFAULT true,
    countries TEXT[] DEFAULT '{}',
    details JSONB DEFAULT '{}',
    fees JSONB DEFAULT '{}',
    processing_time VARCHAR(100) DEFAULT 'Unknown',
    auto_confirm BOOLEAN DEFAULT false,
    requires_receipt BOOLEAN DEFAULT false,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE payment_settings ENABLE ROW LEVEL SECURITY;

-- Insert default payment methods if they don't exist (using correct column names and structure)
INSERT INTO payment_settings (method, enabled, countries, details, fees, processing_time, auto_confirm, requires_receipt, display_order) VALUES
('stripe', true, '{"DE", "FR", "IT", "ES", "NL", "BE", "AT", "PT", "IE", "LU", "AE"}', '{"description": "Credit/Debit Card via Stripe", "icon": "credit-card", "color": "#635BFF"}', '{"percentage": 2.9, "fixed": 0.30, "currency": "USD"}', 'Instant', true, false, 1),
('square', true, '{"US", "CA", "AU", "GB", "JP"}', '{"description": "Credit/Debit Card via Square", "icon": "credit-card", "color": "#3E4348"}', '{"percentage": 2.6, "fixed": 0.10, "currency": "USD"}', 'Instant', true, false, 2),
('apple_pay', true, '{"DEPENDS_ON_GATEWAY"}', '{"description": "Apple Pay via Gateway", "icon": "smartphone", "color": "#000000", "gateway_feature": true}', '{"inherited": true, "description": "Same as gateway"}', 'Instant', true, false, 3),
('google_pay', true, '{"DEPENDS_ON_GATEWAY"}', '{"description": "Google Pay via Gateway", "icon": "smartphone", "color": "#4285F4", "gateway_feature": true}', '{"inherited": true, "description": "Same as gateway"}', 'Instant', true, false, 4),
('usdt', true, '{"GLOBAL"}', '{"description": "USDT Cryptocurrency", "icon": "coins", "color": "#26A17B", "requires_wallet": true}', '{"type": "network", "description": "Network fees only"}', '5-15 minutes', false, true, 5),
('western_union', true, '{"GLOBAL"}', '{"description": "Western Union Money Transfer", "icon": "send", "color": "#FFCC00", "requires_id": true}', '{"range": "5-15", "currency": "USD", "description": "Transfer fee"}', '1-3 business days', false, true, 6),
('moneygram', true, '{"GLOBAL"}', '{"description": "MoneyGram International Transfer", "icon": "send", "color": "#E31837", "requires_id": true}', '{"range": "5-12", "currency": "USD", "description": "Transfer fee"}', '1-3 business days', false, true, 7),
('ria', true, '{"GLOBAL"}', '{"description": "Ria Money Transfer Service", "icon": "send", "color": "#FF6B35", "requires_id": true}', '{"range": "3-10", "currency": "USD", "description": "Transfer fee"}', '1-2 business days', false, true, 8),
('omt', true, '{"LB"}', '{"description": "OMT Lebanon Money Transfer", "icon": "building", "color": "#0066CC", "requires_id": true}', '{"percentage": 1.5, "min": 2, "currency": "USD"}', '1-2 business days', false, true, 9),
('whish', true, '{"LB"}', '{"description": "Whish Money Digital Wallet", "icon": "wallet", "color": "#FF9500", "requires_verification": true}', '{"percentage": 2.0, "currency": "USD", "description": "Processing fee"}', '30 minutes', false, false, 10),
('bob', true, '{"LB"}', '{"description": "Bank of Beirut Direct Transfer", "icon": "building-library", "color": "#1B365D", "requires_account": true}', '{"percentage": 1.0, "currency": "USD", "description": "Bank transfer fee"}', '2-4 hours', true, false, 11),
('wallet', true, '{"GLOBAL"}', '{"description": "SAMIA In-App Wallet", "icon": "credit-card", "color": "#8B5CF6", "instant_balance": true}', '{"percentage": 0, "description": "No fees for wallet payments"}', 'Instant', true, false, 12)
ON CONFLICT (method) DO NOTHING;

-- Update timestamps trigger
CREATE OR REPLACE FUNCTION update_payment_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_payment_settings_updated_at ON payment_settings;
CREATE TRIGGER update_payment_settings_updated_at
    BEFORE UPDATE ON payment_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_payment_settings_updated_at(); 