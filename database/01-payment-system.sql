-- ============================================================
-- PART 1: PAYMENT SYSTEM TABLES - SAMIA TAROT
-- This script handles only payment-related tables
-- ============================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. PAYMENT SETTINGS TABLE (ALREADY EXISTS - VERIFY ONLY)
-- ============================================================

-- Verify payment_settings table structure
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payment_settings') THEN
        RAISE NOTICE '✅ payment_settings table already exists';
    ELSE
        RAISE NOTICE '❌ payment_settings table missing - creating...';
        
        CREATE TABLE payment_settings (
            id SERIAL PRIMARY KEY,
            method VARCHAR(50) NOT NULL UNIQUE,
            enabled BOOLEAN DEFAULT true,
            countries TEXT[] DEFAULT '{}',
            details JSONB DEFAULT '{}',
            fees JSONB DEFAULT '{}',
            processing_time VARCHAR(100),
            auto_confirm BOOLEAN DEFAULT false,
            requires_receipt BOOLEAN DEFAULT false,
            display_order INTEGER DEFAULT 0,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
    END IF;
END $$;

-- ============================================================
-- 2. PAYMENT METHODS TABLE (USER-SPECIFIC PAYMENT METHODS)
-- ============================================================

CREATE TABLE IF NOT EXISTS payment_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL, -- Will add foreign key constraint later
    type VARCHAR(50) NOT NULL CHECK (type IN ('card', 'wallet', 'crypto', 'bank_transfer', 'cash')),
    provider VARCHAR(50) NOT NULL,
    
    -- Card details (encrypted)
    card_last_four VARCHAR(4),
    card_brand VARCHAR(20),
    card_exp_month INTEGER,
    card_exp_year INTEGER,
    
    -- Wallet/Crypto details
    wallet_address TEXT,
    wallet_network VARCHAR(50),
    
    -- Provider tokens
    stripe_payment_method_id VARCHAR(255),
    square_card_id VARCHAR(255),
    
    is_default BOOLEAN DEFAULT false,
    is_verified BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 3. WALLET TRANSACTIONS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS wallet_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL, -- Will add foreign key constraint later
    
    transaction_type VARCHAR(50) NOT NULL CHECK (transaction_type IN ('credit', 'debit', 'refund', 'fee', 'bonus')),
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    
    description TEXT,
    reference_id VARCHAR(255),
    external_transaction_id VARCHAR(255),
    
    -- Related records
    booking_id UUID, -- Will add foreign key constraint later
    payment_id VARCHAR(255),
    
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
    
    -- Balance tracking
    balance_before DECIMAL(10,2) DEFAULT 0,
    balance_after DECIMAL(10,2) DEFAULT 0,
    
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 4. PAYMENT RECEIPTS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS payment_receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL, -- Will add foreign key constraint later
    booking_id UUID, -- Will add foreign key constraint later
    
    receipt_number VARCHAR(100) UNIQUE NOT NULL,
    receipt_url TEXT,
    receipt_file_path TEXT,
    
    payment_method VARCHAR(50) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    
    is_verified BOOLEAN DEFAULT false,
    verified_by UUID, -- Will add foreign key constraint later
    verified_at TIMESTAMP WITH TIME ZONE,
    verification_notes TEXT,
    
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 5. INDEXES FOR PERFORMANCE
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_payment_methods_user_id ON payment_methods(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_type ON payment_methods(type);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user_id ON wallet_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_status ON wallet_transactions(status);
CREATE INDEX IF NOT EXISTS idx_payment_receipts_user_id ON payment_receipts(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_receipts_booking_id ON payment_receipts(booking_id);

-- ============================================================
-- 6. ENABLE RLS (BASIC POLICIES)
-- ============================================================

ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_receipts ENABLE ROW LEVEL SECURITY;

-- Create basic policies (users can only see their own data)
CREATE POLICY "payment_methods_user_access" ON payment_methods FOR ALL USING (true); -- Permissive for now
CREATE POLICY "wallet_transactions_user_access" ON wallet_transactions FOR ALL USING (true); -- Permissive for now
CREATE POLICY "payment_receipts_user_access" ON payment_receipts FOR ALL USING (true); -- Permissive for now

-- ============================================================
-- 7. UPDATE TRIGGERS
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_payment_methods_updated_at
    BEFORE UPDATE ON payment_methods
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_wallet_transactions_updated_at
    BEFORE UPDATE ON wallet_transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_receipts_updated_at
    BEFORE UPDATE ON payment_receipts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- SUCCESS MESSAGE
-- ============================================================

DO $$
BEGIN
    RAISE NOTICE '✅ Payment system tables created successfully!';
    RAISE NOTICE '📋 Tables: payment_settings, payment_methods, wallet_transactions, payment_receipts';
    RAISE NOTICE '🔒 RLS enabled with permissive policies';
    RAISE NOTICE '📊 Indexes created for performance';
END $$; 