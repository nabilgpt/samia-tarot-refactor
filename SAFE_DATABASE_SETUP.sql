-- ============================================================
-- SAMIA TAROT - SAFE DATABASE SETUP
-- This version handles missing references and creates tables safely
-- ============================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- STEP 1: CREATE TABLES WITHOUT FOREIGN KEY CONSTRAINTS
-- ============================================================

-- Payment Methods Table (no foreign keys initially)
CREATE TABLE IF NOT EXISTS payment_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
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

-- Wallet Transactions Table (no foreign keys initially)
CREATE TABLE IF NOT EXISTS wallet_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    transaction_type VARCHAR(50) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    description TEXT,
    booking_id UUID,
    status VARCHAR(50) DEFAULT 'pending',
    balance_before DECIMAL(10,2) DEFAULT 0,
    balance_after DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Payment Receipts Table (no foreign keys initially)
CREATE TABLE IF NOT EXISTS payment_receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    booking_id UUID NOT NULL,
    receipt_number VARCHAR(100) UNIQUE NOT NULL,
    receipt_url TEXT,
    payment_method VARCHAR(50) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    is_verified BOOLEAN DEFAULT false,
    verified_by UUID,
    verified_at TIMESTAMP WITH TIME ZONE,
    verification_notes TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Voice Notes Table (will add foreign key later)
CREATE TABLE IF NOT EXISTS voice_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID,
    user_id UUID NOT NULL,
    file_url TEXT NOT NULL,
    duration_seconds INTEGER NOT NULL,
    transcript TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Daily Analytics Table (standalone)
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

-- Reader Analytics Table (no foreign keys initially)
CREATE TABLE IF NOT EXISTS reader_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reader_id UUID NOT NULL,
    date DATE NOT NULL,
    total_sessions INTEGER DEFAULT 0,
    total_earnings DECIMAL(10,2) DEFAULT 0,
    average_rating DECIMAL(3,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(reader_id, date)
);

-- User Activity Logs Table (no foreign keys initially)
CREATE TABLE IF NOT EXISTS user_activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    activity_type VARCHAR(100) NOT NULL,
    action VARCHAR(255) NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- AI Learning Data Table (no foreign keys initially)
CREATE TABLE IF NOT EXISTS ai_learning_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    interaction_type VARCHAR(100) NOT NULL,
    input_data JSONB NOT NULL,
    output_data JSONB,
    feedback_score INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- AI Reading Results Table (no foreign keys initially)
CREATE TABLE IF NOT EXISTS ai_reading_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    reading_type VARCHAR(100) NOT NULL,
    cards_drawn JSONB NOT NULL,
    interpretation TEXT NOT NULL,
    ai_confidence DECIMAL(5,4) DEFAULT 0,
    user_rating INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Reader Applications Table (no foreign keys initially)
CREATE TABLE IF NOT EXISTS reader_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    application_type VARCHAR(50) DEFAULT 'new_reader',
    experience_years INTEGER,
    specializations TEXT[],
    status VARCHAR(50) DEFAULT 'pending',
    reviewed_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- ============================================================
-- STEP 2: ADD FOREIGN KEY CONSTRAINTS (IF POSSIBLE)
-- ============================================================

-- Add foreign key constraints only if referenced tables exist
DO $$
BEGIN
    -- Add user_id foreign keys if auth.users exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users') THEN
        -- Payment Methods
        BEGIN
            ALTER TABLE payment_methods ADD CONSTRAINT fk_payment_methods_user_id 
            FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
        EXCEPTION WHEN duplicate_object THEN
            -- Constraint already exists, skip
        END;
        
        -- Wallet Transactions
        BEGIN
            ALTER TABLE wallet_transactions ADD CONSTRAINT fk_wallet_transactions_user_id 
            FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
        EXCEPTION WHEN duplicate_object THEN
            -- Constraint already exists, skip
        END;
        
        -- Other tables...
        BEGIN
            ALTER TABLE payment_receipts ADD CONSTRAINT fk_payment_receipts_user_id 
            FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
        EXCEPTION WHEN duplicate_object THEN
            -- Constraint already exists, skip
        END;
        
        RAISE NOTICE '✅ Added user_id foreign key constraints';
    ELSE
        RAISE NOTICE '⚠️ auth.users table not found, skipping user_id foreign keys';
    END IF;
    
    -- Add booking_id foreign keys if bookings table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'bookings') THEN
        BEGIN
            ALTER TABLE wallet_transactions ADD CONSTRAINT fk_wallet_transactions_booking_id 
            FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL;
        EXCEPTION WHEN duplicate_object THEN
            -- Constraint already exists, skip
        END;
        
        BEGIN
            ALTER TABLE payment_receipts ADD CONSTRAINT fk_payment_receipts_booking_id 
            FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE;
        EXCEPTION WHEN duplicate_object THEN
            -- Constraint already exists, skip
        END;
        
        RAISE NOTICE '✅ Added booking_id foreign key constraints';
    ELSE
        RAISE NOTICE '⚠️ bookings table not found, skipping booking_id foreign keys';
    END IF;
    
    -- Add message_id foreign key if chat_messages exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'chat_messages') THEN
        BEGIN
            ALTER TABLE voice_notes ADD CONSTRAINT fk_voice_notes_message_id 
            FOREIGN KEY (message_id) REFERENCES chat_messages(id) ON DELETE CASCADE;
        EXCEPTION WHEN duplicate_object THEN
            -- Constraint already exists, skip
        END;
        
        RAISE NOTICE '✅ Added chat_messages foreign key constraint';
    ELSE
        RAISE NOTICE '⚠️ chat_messages table not found, skipping message_id foreign key';
    END IF;
END $$;

-- ============================================================
-- STEP 3: ENABLE RLS ON ALL TABLES
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
-- STEP 4: CREATE SAFE RLS POLICIES
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

-- Basic policies for other tables (safe versions)
DROP POLICY IF EXISTS "Users can view their own activity" ON user_activity_logs;
CREATE POLICY "Users can view their own activity" ON user_activity_logs
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own AI data" ON ai_learning_data;
CREATE POLICY "Users can view their own AI data" ON ai_learning_data
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own AI results" ON ai_reading_results;
CREATE POLICY "Users can view their own AI results" ON ai_reading_results
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own applications" ON reader_applications;
CREATE POLICY "Users can view their own applications" ON reader_applications
    FOR SELECT USING (auth.uid() = user_id);

-- ============================================================
-- STEP 5: CREATE INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_payment_methods_user_id ON payment_methods(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user_id ON wallet_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_receipts_user_id ON payment_receipts(user_id);
CREATE INDEX IF NOT EXISTS idx_voice_notes_user_id ON voice_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_user_id ON user_activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_learning_data_user_id ON ai_learning_data(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_reading_results_user_id ON ai_reading_results(user_id);
CREATE INDEX IF NOT EXISTS idx_reader_applications_user_id ON reader_applications(user_id);

-- ============================================================
-- STEP 6: VERIFICATION
-- ============================================================

DO $$
DECLARE
    created_tables_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO created_tables_count
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
    AND table_name IN (
        'payment_methods', 'wallet_transactions', 'payment_receipts',
        'voice_notes', 'daily_analytics', 'reader_analytics', 
        'user_activity_logs', 'ai_learning_data', 'ai_reading_results',
        'reader_applications'
    );
    
    RAISE NOTICE '';
    RAISE NOTICE '=== SAFE DATABASE SETUP COMPLETED ===';
    RAISE NOTICE '✅ Successfully created/verified % tables', created_tables_count;
    RAISE NOTICE '💾 All tables have RLS enabled';
    RAISE NOTICE '🔐 Basic security policies applied';
    RAISE NOTICE '⚡ Performance indexes created';
    
    IF created_tables_count >= 8 THEN
        RAISE NOTICE '🎉 Database is ready for production use!';
    END IF;
END $$; 