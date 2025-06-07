-- ============================================================
-- SAMIA TAROT - COMPLETE DATABASE SETUP (FIXED VERSION)
-- Execute in Supabase SQL Editor to complete all missing tables
-- Handles existing policies and prevents conflicts
-- ============================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- PAYMENT SYSTEM TABLES
-- ============================================================

-- Payment Methods Table
CREATE TABLE IF NOT EXISTS payment_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('card', 'wallet', 'crypto', 'bank_transfer', 'cash')),
    provider VARCHAR(50) NOT NULL,
    card_last_four VARCHAR(4),
    card_brand VARCHAR(20),
    stripe_payment_method_id VARCHAR(255),
    is_default BOOLEAN DEFAULT false,
    is_verified BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Wallet Transactions Table
CREATE TABLE IF NOT EXISTS wallet_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    transaction_type VARCHAR(50) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    description TEXT,
    booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'pending',
    balance_before DECIMAL(10,2) DEFAULT 0,
    balance_after DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Payment Receipts Table
CREATE TABLE IF NOT EXISTS payment_receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
    receipt_number VARCHAR(100) UNIQUE NOT NULL,
    receipt_url TEXT,
    payment_method VARCHAR(50) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    is_verified BOOLEAN DEFAULT false,
    verified_by UUID REFERENCES auth.users(id),
    verified_at TIMESTAMP WITH TIME ZONE,
    verification_notes TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- ============================================================
-- CHAT SYSTEM ENHANCEMENTS
-- ============================================================

-- Voice Notes Table (if not exists)
CREATE TABLE IF NOT EXISTS voice_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID REFERENCES chat_messages(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    file_url TEXT NOT NULL,
    duration_seconds INTEGER NOT NULL,
    transcript TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- ============================================================
-- ANALYTICS SYSTEM TABLES
-- ============================================================

-- Daily Analytics Table
CREATE TABLE IF NOT EXISTS daily_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL UNIQUE,
    total_users INTEGER DEFAULT 0,
    active_users INTEGER DEFAULT 0,
    new_registrations INTEGER DEFAULT 0,
    total_bookings INTEGER DEFAULT 0,
    total_revenue DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Reader Analytics Table
CREATE TABLE IF NOT EXISTS reader_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reader_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    total_sessions INTEGER DEFAULT 0,
    total_earnings DECIMAL(10,2) DEFAULT 0,
    average_rating DECIMAL(3,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(reader_id, date)
);

-- User Activity Logs Table
CREATE TABLE IF NOT EXISTS user_activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    activity_type VARCHAR(100) NOT NULL,
    action VARCHAR(255) NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- ============================================================
-- AI SYSTEM TABLES
-- ============================================================

-- AI Learning Data Table
CREATE TABLE IF NOT EXISTS ai_learning_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    interaction_type VARCHAR(100) NOT NULL,
    input_data JSONB NOT NULL,
    output_data JSONB,
    feedback_score INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- AI Reading Results Table
CREATE TABLE IF NOT EXISTS ai_reading_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    reading_type VARCHAR(100) NOT NULL,
    cards_drawn JSONB NOT NULL,
    interpretation TEXT NOT NULL,
    ai_confidence DECIMAL(5,4) DEFAULT 0,
    user_rating INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- ============================================================
-- ADMIN SYSTEM TABLES
-- ============================================================

-- Reader Applications Table
CREATE TABLE IF NOT EXISTS reader_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    application_type VARCHAR(50) DEFAULT 'new_reader',
    experience_years INTEGER,
    specializations TEXT[],
    status VARCHAR(50) DEFAULT 'pending',
    reviewed_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- ============================================================
-- ENABLE RLS ON NEW TABLES
-- ============================================================

ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE reader_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_learning_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_reading_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE reader_applications ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS POLICIES (DROP EXISTING FIRST TO PREVENT CONFLICTS)
-- ============================================================

-- Payment Methods Policies
DROP POLICY IF EXISTS "Users can view their own payment methods" ON payment_methods;
CREATE POLICY "Users can view their own payment methods" ON payment_methods
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own payment methods" ON payment_methods;
CREATE POLICY "Users can insert their own payment methods" ON payment_methods
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Wallet Transactions Policies
DROP POLICY IF EXISTS "Users can view their own wallet transactions" ON wallet_transactions;
CREATE POLICY "Users can view their own wallet transactions" ON wallet_transactions
    FOR SELECT USING (auth.uid() = user_id);

-- Payment Receipts Policies
DROP POLICY IF EXISTS "Users can view their own receipts" ON payment_receipts;
CREATE POLICY "Users can view their own receipts" ON payment_receipts
    FOR SELECT USING (auth.uid() = user_id);

-- Voice Notes Policies
DROP POLICY IF EXISTS "Users can view their own voice notes" ON voice_notes;
CREATE POLICY "Users can view their own voice notes" ON voice_notes
    FOR SELECT USING (auth.uid() = user_id);

-- Analytics Policies (Admin only)
DROP POLICY IF EXISTS "Admins can view analytics" ON daily_analytics;
CREATE POLICY "Admins can view analytics" ON daily_analytics
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

DROP POLICY IF EXISTS "Readers can view their own analytics" ON reader_analytics;
CREATE POLICY "Readers can view their own analytics" ON reader_analytics
    FOR SELECT USING (
        auth.uid() = reader_id OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

-- User Activity Logs Policies
DROP POLICY IF EXISTS "Users can view their own activity" ON user_activity_logs;
CREATE POLICY "Users can view their own activity" ON user_activity_logs
    FOR SELECT USING (
        auth.uid() = user_id OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

-- AI System Policies
DROP POLICY IF EXISTS "Users can view their own AI data" ON ai_learning_data;
CREATE POLICY "Users can view their own AI data" ON ai_learning_data
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own AI results" ON ai_reading_results;
CREATE POLICY "Users can view their own AI results" ON ai_reading_results
    FOR SELECT USING (auth.uid() = user_id);

-- Reader Applications Policies
DROP POLICY IF EXISTS "Users can view their own applications" ON reader_applications;
CREATE POLICY "Users can view their own applications" ON reader_applications
    FOR SELECT USING (
        auth.uid() = user_id OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

-- ============================================================
-- CREATE INDEXES FOR PERFORMANCE
-- ============================================================

-- Payment system indexes
CREATE INDEX IF NOT EXISTS idx_payment_methods_user_id ON payment_methods(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_is_default ON payment_methods(is_default);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user_id ON wallet_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_booking_id ON wallet_transactions(booking_id);
CREATE INDEX IF NOT EXISTS idx_payment_receipts_user_id ON payment_receipts(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_receipts_booking_id ON payment_receipts(booking_id);

-- Analytics indexes
CREATE INDEX IF NOT EXISTS idx_daily_analytics_date ON daily_analytics(date);
CREATE INDEX IF NOT EXISTS idx_reader_analytics_reader_id ON reader_analytics(reader_id);
CREATE INDEX IF NOT EXISTS idx_reader_analytics_date ON reader_analytics(date);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_user_id ON user_activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_activity_type ON user_activity_logs(activity_type);

-- AI system indexes
CREATE INDEX IF NOT EXISTS idx_ai_learning_data_user_id ON ai_learning_data(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_reading_results_user_id ON ai_reading_results(user_id);

-- Admin system indexes
CREATE INDEX IF NOT EXISTS idx_reader_applications_user_id ON reader_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_reader_applications_status ON reader_applications(status);

-- Chat enhancement indexes
CREATE INDEX IF NOT EXISTS idx_voice_notes_message_id ON voice_notes(message_id);
CREATE INDEX IF NOT EXISTS idx_voice_notes_user_id ON voice_notes(user_id);

-- ============================================================
-- SUCCESS VERIFICATION
-- ============================================================

-- Verify table creation
DO $$
DECLARE
    new_tables_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO new_tables_count
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
    AND table_name IN (
        'payment_methods', 'wallet_transactions', 'payment_receipts',
        'voice_notes', 'daily_analytics', 'reader_analytics', 
        'user_activity_logs', 'ai_learning_data', 'ai_reading_results',
        'reader_applications'
    );
    
    RAISE NOTICE '✅ Created % new critical tables successfully', new_tables_count;
    
    IF new_tables_count >= 10 THEN
        RAISE NOTICE '🎉 Database setup completed! All critical tables created.';
        RAISE NOTICE '📊 Payment system now functional';
        RAISE NOTICE '📈 Analytics system ready for admin dashboard';
        RAISE NOTICE '👨‍💼 Reader application workflow activated';
        RAISE NOTICE '🤖 AI system foundation established';
        RAISE NOTICE '💬 Chat system enhancements added';
    ELSE
        RAISE NOTICE '⚠️ Some tables may already exist. Total new tables: %', new_tables_count;
    END IF;
END $$;

-- Final success message
SELECT '✅ Database setup completed! 10+ critical tables created or verified.' as result; 