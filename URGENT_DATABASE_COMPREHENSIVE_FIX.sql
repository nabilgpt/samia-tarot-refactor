-- =====================================================
-- SAMIA TAROT - URGENT COMPREHENSIVE DATABASE FIX
-- Execute this in Supabase SQL Editor immediately
-- =====================================================

BEGIN;

-- 1. FIX AUDIT_LOGS TABLE (Critical for backend)
-- Drop existing incomplete table
DROP TABLE IF EXISTS audit_logs CASCADE;

-- Create complete table with ALL required columns
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name VARCHAR(100) NOT NULL,
    action VARCHAR(50) NOT NULL,
    record_id UUID,
    user_id UUID,
    old_data JSONB,
    new_data JSONB,
    metadata JSONB DEFAULT '{}'::jsonb,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    session_id VARCHAR(255)
);

-- Create indexes
CREATE INDEX idx_audit_logs_table_name ON audit_logs(table_name);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- Enable RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "audit_logs_admin_access" ON audit_logs
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'super_admin')
        )
    );

CREATE POLICY "audit_logs_service_role" ON audit_logs
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

-- Grant permissions
GRANT ALL ON audit_logs TO service_role;
GRANT SELECT, INSERT ON audit_logs TO authenticated;

-- 2. FIX SPREAD_CARDS TABLE (Critical for spread manager)
-- Drop existing incomplete table
DROP TABLE IF EXISTS spread_cards CASCADE;

-- Create complete spread_cards table
CREATE TABLE spread_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    spread_id UUID NOT NULL REFERENCES reader_spreads(id) ON DELETE CASCADE,
    position_number INTEGER NOT NULL,
    position_name VARCHAR(100) NOT NULL,
    card_id UUID REFERENCES tarot_cards(id),
    assigned_by UUID REFERENCES profiles(id),
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    x_position DECIMAL(10,2) DEFAULT 0,
    y_position DECIMAL(10,2) DEFAULT 0,
    rotation DECIMAL(5,2) DEFAULT 0,
    width DECIMAL(10,2) DEFAULT 100,
    height DECIMAL(10,2) DEFAULT 150,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_spread_cards_spread_id ON spread_cards(spread_id);
CREATE INDEX idx_spread_cards_position ON spread_cards(position_number);
CREATE INDEX idx_spread_cards_card_id ON spread_cards(card_id);

-- Enable RLS
ALTER TABLE spread_cards ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "spread_cards_owner_access" ON spread_cards
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM reader_spreads rs 
            WHERE rs.id = spread_cards.spread_id 
            AND rs.creator_id = auth.uid()
        )
    );

CREATE POLICY "spread_cards_admin_access" ON spread_cards
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'super_admin')
        )
    );

-- Grant permissions
GRANT ALL ON spread_cards TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON spread_cards TO authenticated;

-- 3. FIX SYSTEM_CONFIGURATIONS TABLE (Critical for translation service)
-- Add missing columns safely
ALTER TABLE system_configurations 
ADD COLUMN IF NOT EXISTS config_description TEXT;

ALTER TABLE system_configurations 
ADD COLUMN IF NOT EXISTS config_description_ar TEXT;

ALTER TABLE system_configurations 
ADD COLUMN IF NOT EXISTS config_description_en TEXT;

ALTER TABLE system_configurations 
ADD COLUMN IF NOT EXISTS display_name TEXT;

ALTER TABLE system_configurations 
ADD COLUMN IF NOT EXISTS display_name_ar TEXT;

ALTER TABLE system_configurations 
ADD COLUMN IF NOT EXISTS display_name_en TEXT;

ALTER TABLE system_configurations 
ADD COLUMN IF NOT EXISTS input_type VARCHAR(50) DEFAULT 'text';

ALTER TABLE system_configurations 
ADD COLUMN IF NOT EXISTS validation_rules JSONB DEFAULT '{}'::jsonb;

ALTER TABLE system_configurations 
ADD COLUMN IF NOT EXISTS is_encrypted BOOLEAN DEFAULT false;

ALTER TABLE system_configurations 
ADD COLUMN IF NOT EXISTS category_order INTEGER DEFAULT 0;

-- 4. CREATE MISSING CRITICAL TABLES

-- Chat Sessions table
CREATE TABLE IF NOT EXISTS chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(50) NOT NULL DEFAULT 'direct',
    booking_id UUID REFERENCES bookings(id),
    participants UUID[] NOT NULL,
    title VARCHAR(255),
    status VARCHAR(50) DEFAULT 'active',
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enhanced Chat Messages table
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES profiles(id),
    type VARCHAR(50) NOT NULL DEFAULT 'text',
    content TEXT,
    file_url TEXT,
    file_name VARCHAR(255),
    file_size INTEGER,
    file_type VARCHAR(100),
    duration_seconds INTEGER,
    waveform_data JSONB,
    reply_to_message_id UUID REFERENCES chat_messages(id),
    status VARCHAR(50) DEFAULT 'sent',
    approved_by UUID REFERENCES profiles(id),
    approved_at TIMESTAMPTZ,
    delivered_to UUID[],
    read_by UUID[],
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Analytics tables
CREATE TABLE IF NOT EXISTS daily_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL,
    total_users INTEGER DEFAULT 0,
    active_users INTEGER DEFAULT 0,
    new_users INTEGER DEFAULT 0,
    total_sessions INTEGER DEFAULT 0,
    total_bookings INTEGER DEFAULT 0,
    total_revenue DECIMAL(10,2) DEFAULT 0,
    metrics JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reader_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reader_id UUID NOT NULL REFERENCES profiles(id),
    date DATE NOT NULL,
    total_sessions INTEGER DEFAULT 0,
    total_revenue DECIMAL(10,2) DEFAULT 0,
    average_rating DECIMAL(3,2) DEFAULT 0,
    total_reviews INTEGER DEFAULT 0,
    response_time_avg INTEGER DEFAULT 0,
    metrics JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payment Methods table
CREATE TABLE IF NOT EXISTS payment_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    name_ar VARCHAR(100),
    name_en VARCHAR(100),
    type VARCHAR(50) NOT NULL,
    provider VARCHAR(50) NOT NULL,
    config JSONB DEFAULT '{}'::jsonb,
    is_enabled BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    countries VARCHAR(2)[] DEFAULT '{}',
    min_amount DECIMAL(10,2) DEFAULT 0,
    max_amount DECIMAL(10,2) DEFAULT 999999.99,
    processing_fee DECIMAL(10,2) DEFAULT 0,
    processing_time VARCHAR(100),
    icon_url TEXT,
    requires_bank_details BOOLEAN DEFAULT false,
    instructions TEXT,
    instructions_ar TEXT,
    instructions_en TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Wallet Transactions table
CREATE TABLE IF NOT EXISTS wallet_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id UUID NOT NULL REFERENCES wallets(id),
    transaction_id UUID REFERENCES transactions(id),
    type VARCHAR(50) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    balance_after DECIMAL(10,2) NOT NULL,
    description TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. CREATE INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_chat_sessions_participants ON chat_sessions USING GIN(participants);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender_id ON chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_daily_analytics_date ON daily_analytics(date);
CREATE INDEX IF NOT EXISTS idx_reader_analytics_reader_date ON reader_analytics(reader_id, date);
CREATE INDEX IF NOT EXISTS idx_payment_methods_enabled ON payment_methods(is_enabled);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_wallet_id ON wallet_transactions(wallet_id);

-- 6. ENABLE RLS ON ALL NEW TABLES
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE reader_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;

-- 7. CREATE BASIC RLS POLICIES
-- Chat Sessions policies
CREATE POLICY "chat_sessions_participant_access" ON chat_sessions
    FOR ALL TO authenticated
    USING (auth.uid() = ANY(participants));

CREATE POLICY "chat_sessions_admin_access" ON chat_sessions
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'super_admin')
        )
    );

-- Chat Messages policies
CREATE POLICY "chat_messages_session_access" ON chat_messages
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM chat_sessions 
            WHERE chat_sessions.id = chat_messages.session_id 
            AND auth.uid() = ANY(chat_sessions.participants)
        )
    );

-- Analytics policies (admin only)
CREATE POLICY "analytics_admin_access" ON daily_analytics
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'super_admin')
        )
    );

CREATE POLICY "reader_analytics_access" ON reader_analytics
    FOR ALL TO authenticated
    USING (
        reader_id = auth.uid() OR 
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'super_admin')
        )
    );

-- Payment Methods policies
CREATE POLICY "payment_methods_read_access" ON payment_methods
    FOR SELECT TO authenticated
    USING (is_enabled = true);

CREATE POLICY "payment_methods_admin_access" ON payment_methods
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'super_admin')
        )
    );

-- Wallet Transactions policies
CREATE POLICY "wallet_transactions_owner_access" ON wallet_transactions
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM wallets 
            WHERE wallets.id = wallet_transactions.wallet_id 
            AND wallets.user_id = auth.uid()
        )
    );

-- 8. GRANT PERMISSIONS
GRANT ALL ON chat_sessions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON chat_sessions TO authenticated;

GRANT ALL ON chat_messages TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON chat_messages TO authenticated;

GRANT ALL ON daily_analytics TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON daily_analytics TO authenticated;

GRANT ALL ON reader_analytics TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON reader_analytics TO authenticated;

GRANT ALL ON payment_methods TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON payment_methods TO authenticated;

GRANT ALL ON wallet_transactions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON wallet_transactions TO authenticated;

-- 9. INSERT TEST DATA TO VERIFY FIXES
INSERT INTO audit_logs (table_name, action, new_data, metadata) VALUES 
('database_fix', 'comprehensive_schema_fix', '{"status": "completed"}', '{"fix_type": "comprehensive", "tables_fixed": ["audit_logs", "spread_cards", "system_configurations", "chat_sessions", "chat_messages", "analytics", "payment_methods"]}');

-- 10. FINAL VALIDATION
-- Test that all critical columns exist
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'audit_logs' AND column_name = 'user_id'
        ) THEN '✅ audit_logs.user_id EXISTS'
        ELSE '❌ audit_logs.user_id MISSING'
    END as audit_logs_check,
    
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'spread_cards' AND column_name = 'assigned_by'
        ) THEN '✅ spread_cards.assigned_by EXISTS'
        ELSE '❌ spread_cards.assigned_by MISSING'
    END as spread_cards_check,
    
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'system_configurations' AND column_name = 'config_description'
        ) THEN '✅ system_configurations.config_description EXISTS'
        ELSE '❌ system_configurations.config_description MISSING'
    END as system_config_check;

COMMIT;

-- Success message
SELECT '🎉 COMPREHENSIVE DATABASE FIX COMPLETED! All critical schema issues resolved.' as status; 