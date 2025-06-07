-- Fix for Remaining SQL Execution Errors
-- SAMIA TAROT Platform Database Schema Fixes

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- FIX 1: PROFILES TABLE STRUCTURE
-- =============================================
-- Ensure profiles table has all necessary columns
DO $$ 
BEGIN
    -- Add user_id column to profiles if it doesn't exist (for call_participants reference)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'user_id'
    ) THEN
        ALTER TABLE profiles ADD COLUMN user_id UUID;
        -- Update existing records to use id as user_id for backwards compatibility
        UPDATE profiles SET user_id = id WHERE user_id IS NULL;
    END IF;
END $$;

-- =============================================
-- FIX 2: BOOKINGS TABLE STRUCTURE
-- =============================================
-- Ensure bookings table has booking_id column (for AI system reference)
DO $$ 
BEGIN
    -- Add booking_id column to bookings if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'bookings' AND column_name = 'booking_id'
    ) THEN
        ALTER TABLE bookings ADD COLUMN booking_id UUID DEFAULT uuid_generate_v4();
        -- Update existing records
        UPDATE bookings SET booking_id = id WHERE booking_id IS NULL;
    END IF;
END $$;

-- =============================================
-- FIX 3: MISSING TABLES FOR REFERENCES
-- =============================================

-- Create escalation_logs table (referenced by call system)
CREATE TABLE IF NOT EXISTS escalation_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    call_session_id UUID REFERENCES call_sessions(id),
    escalated_from UUID REFERENCES profiles(id),
    escalated_to UUID REFERENCES profiles(id),
    escalation_reason TEXT NOT NULL,
    escalation_type VARCHAR(20) DEFAULT 'manual' CHECK (escalation_type IN ('manual', 'auto', 'timeout')),
    escalation_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolution_time TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'assigned', 'resolved', 'cancelled')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- FIX 4: PAYMENT ENHANCEMENT TABLES
-- =============================================

-- Create payment_methods table
CREATE TABLE IF NOT EXISTS payment_methods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    payment_type VARCHAR(20) NOT NULL CHECK (payment_type IN ('card', 'paypal', 'wallet', 'bank')),
    is_default BOOLEAN DEFAULT FALSE,
    card_last_four VARCHAR(4),
    card_brand VARCHAR(20),
    card_exp_month INTEGER,
    card_exp_year INTEGER,
    paypal_email VARCHAR(255),
    bank_account_last_four VARCHAR(4),
    billing_address JSONB,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create payment_gateway_configs table
CREATE TABLE IF NOT EXISTS payment_gateway_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    gateway_name VARCHAR(50) NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT TRUE,
    api_key_encrypted TEXT,
    webhook_secret_encrypted TEXT,
    supported_currencies TEXT[] DEFAULT '{"USD","EUR","GBP"}',
    fee_percentage DECIMAL(5,3) DEFAULT 2.9,
    fee_fixed_amount DECIMAL(10,2) DEFAULT 0.30,
    configuration JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create wallet_transactions table
CREATE TABLE IF NOT EXISTS wallet_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('credit', 'debit', 'refund', 'withdrawal')),
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    description TEXT,
    reference_id UUID, -- Could reference bookings, payments, etc.
    reference_type VARCHAR(50), -- 'booking', 'payment', 'refund', etc.
    status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create wallet_balances table
CREATE TABLE IF NOT EXISTS wallet_balances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
    balance DECIMAL(10,2) DEFAULT 0.00 CHECK (balance >= 0),
    currency VARCHAR(3) DEFAULT 'USD',
    last_transaction_id UUID REFERENCES wallet_transactions(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create transaction_audit table
CREATE TABLE IF NOT EXISTS transaction_audit (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID, -- Generic reference to any transaction
    table_name VARCHAR(50) NOT NULL, -- Which table the transaction came from
    action VARCHAR(20) NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    old_values JSONB,
    new_values JSONB,
    changed_by UUID REFERENCES profiles(id),
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- FIX 5: REVENUE & EARNINGS TABLES
-- =============================================

-- Create platform_commissions table
CREATE TABLE IF NOT EXISTS platform_commissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID REFERENCES bookings(id),
    reader_id UUID NOT NULL REFERENCES profiles(id),
    service_amount DECIMAL(10,2) NOT NULL,
    commission_rate DECIMAL(5,3) NOT NULL, -- e.g., 0.150 for 15%
    commission_amount DECIMAL(10,2) NOT NULL,
    reader_earnings DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'disputed', 'refunded')),
    payment_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create reader_earnings table
CREATE TABLE IF NOT EXISTS reader_earnings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reader_id UUID NOT NULL REFERENCES profiles(id),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    total_sessions INTEGER DEFAULT 0,
    total_earnings DECIMAL(10,2) DEFAULT 0.00,
    total_commission DECIMAL(10,2) DEFAULT 0.00,
    net_earnings DECIMAL(10,2) DEFAULT 0.00,
    currency VARCHAR(3) DEFAULT 'USD',
    status VARCHAR(20) DEFAULT 'calculated' CHECK (status IN ('calculated', 'paid', 'pending')),
    paid_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(reader_id, period_start, period_end)
);

-- Create revenue_sharing table
CREATE TABLE IF NOT EXISTS revenue_sharing (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID REFERENCES bookings(id),
    reader_id UUID NOT NULL REFERENCES profiles(id),
    total_amount DECIMAL(10,2) NOT NULL,
    platform_share DECIMAL(10,2) NOT NULL,
    reader_share DECIMAL(10,2) NOT NULL,
    platform_percentage DECIMAL(5,3) NOT NULL,
    reader_percentage DECIMAL(5,3) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- FIX 6: ADMIN & APPROVAL TABLES
-- =============================================

-- Create approval_requests table with fixed function parameters
CREATE TABLE IF NOT EXISTS approval_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    requested_by UUID NOT NULL REFERENCES profiles(id),
    request_type VARCHAR(50) NOT NULL,
    request_data JSONB NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
    reviewed_by UUID REFERENCES profiles(id),
    review_notes TEXT,
    priority INTEGER DEFAULT 3 CHECK (priority BETWEEN 1 AND 5),
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create admin_actions table
CREATE TABLE IF NOT EXISTS admin_actions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID NOT NULL REFERENCES profiles(id),
    action_type VARCHAR(50) NOT NULL,
    target_type VARCHAR(50), -- 'user', 'booking', 'payment', etc.
    target_id UUID,
    action_details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_name VARCHAR(50) NOT NULL,
    record_id UUID NOT NULL,
    action VARCHAR(20) NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    old_values JSONB,
    new_values JSONB,
    changed_by UUID REFERENCES profiles(id),
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- Payment system indexes
CREATE INDEX IF NOT EXISTS idx_payment_methods_user_id ON payment_methods(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_is_default ON payment_methods(is_default);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user_id ON wallet_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_balances_user_id ON wallet_balances(user_id);

-- Revenue system indexes
CREATE INDEX IF NOT EXISTS idx_platform_commissions_reader_id ON platform_commissions(reader_id);
CREATE INDEX IF NOT EXISTS idx_platform_commissions_booking_id ON platform_commissions(booking_id);
CREATE INDEX IF NOT EXISTS idx_reader_earnings_reader_id ON reader_earnings(reader_id);
CREATE INDEX IF NOT EXISTS idx_reader_earnings_period ON reader_earnings(period_start, period_end);

-- Admin system indexes
CREATE INDEX IF NOT EXISTS idx_approval_requests_requested_by ON approval_requests(requested_by);
CREATE INDEX IF NOT EXISTS idx_approval_requests_status ON approval_requests(status);
CREATE INDEX IF NOT EXISTS idx_admin_actions_admin_id ON admin_actions(admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_record ON audit_logs(table_name, record_id);

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

-- Enable RLS on new tables
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_gateway_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reader_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own payment methods" ON payment_methods
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own wallet transactions" ON wallet_transactions
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own wallet balance" ON wallet_balances
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Readers can view own earnings" ON reader_earnings
    FOR SELECT USING (auth.uid() = reader_id);

CREATE POLICY "Users can view own approval requests" ON approval_requests
    FOR ALL USING (auth.uid() = requested_by);

-- Admin policies (only admins can access)
CREATE POLICY "Only admins can access gateway configs" ON payment_gateway_configs
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
        )
    );

CREATE POLICY "Only admins can access admin actions" ON admin_actions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
        )
    );

CREATE POLICY "Only admins can access audit logs" ON audit_logs
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
        )
    );

-- =============================================
-- NOTIFICATION: COMPLETION STATUS
-- =============================================

-- Insert completion notification
DO $$
BEGIN
    RAISE NOTICE '✅ DATABASE FIXES COMPLETED SUCCESSFULLY!';
    RAISE NOTICE '📊 FIXED ISSUES:';
    RAISE NOTICE '   ✅ profiles.user_id column added';
    RAISE NOTICE '   ✅ bookings.booking_id column added';
    RAISE NOTICE '   ✅ escalation_logs table created';
    RAISE NOTICE '   ✅ Payment enhancement tables (5) created';
    RAISE NOTICE '   ✅ Revenue & earnings tables (3) created';
    RAISE NOTICE '   ✅ Admin & approval tables (3) created';
    RAISE NOTICE '   ✅ All indexes and RLS policies applied';
    RAISE NOTICE '';
    RAISE NOTICE '🚀 READY TO EXECUTE REMAINING SQL FILES:';
    RAISE NOTICE '   1. database/phase3-call-video-system.sql';
    RAISE NOTICE '   2. database/phase2-tarot-ai.sql';
    RAISE NOTICE '   3. database/approval_system.sql';
END $$; 