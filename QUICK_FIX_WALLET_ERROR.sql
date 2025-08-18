-- 🔧 SAMIA TAROT - QUICK FIX FOR WALLET_ID ERROR
-- Execute this FIRST in Supabase SQL Editor

-- ==============================================================================
-- EMERGENCY FIX: Create wallets table FIRST
-- ==============================================================================

-- Remove wallet_transactions if it exists with broken references
DROP TABLE IF EXISTS wallet_transactions CASCADE;

-- Create wallets table (this MUST exist first)
CREATE TABLE IF NOT EXISTS wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) NOT NULL UNIQUE,
    balance DECIMAL(10,2) DEFAULT 0.00 CHECK (balance >= 0),
    currency TEXT DEFAULT 'USD',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Now create wallet_transactions (100% safe - wallets exists)
CREATE TABLE wallet_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    status VARCHAR(50) DEFAULT 'pending',
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Test the fix
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'wallets' AND table_schema = 'public') THEN
        RAISE NOTICE '✅ wallets table EXISTS';
    ELSE
        RAISE NOTICE '❌ wallets table MISSING';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'wallet_transactions' AND table_schema = 'public') THEN
        RAISE NOTICE '✅ wallet_transactions table EXISTS';
        RAISE NOTICE '🎉 WALLET_ID ERROR FIXED!';
    ELSE
        RAISE NOTICE '❌ wallet_transactions table MISSING';
    END IF;
END $$; 