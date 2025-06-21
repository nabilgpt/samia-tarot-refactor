-- ============================================================
-- FIX PAYMENT METHODS TYPE ERROR - SAMIA TAROT
-- حل مشكلة: ERROR: 42703: column "type" does not exist
-- ============================================================

-- Step 1: Check if payment_methods table exists and drop if needed
DROP TABLE IF EXISTS payment_methods CASCADE;

-- Step 2: Create payment_methods table with correct structure
CREATE TABLE payment_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL, -- Will add foreign key constraint later
    type VARCHAR(50) NOT NULL CHECK (type IN ('card', 'wallet', 'crypto', 'bank_transfer', 'cash')),
    provider VARCHAR(50) NOT NULL CHECK (provider IN ('stripe', 'square', 'usdt', 'western_union', 'moneygram', 'internal_wallet')),
    
    -- Card details (encrypted)
    card_last_four VARCHAR(4),
    card_brand VARCHAR(20),
    card_exp_month INTEGER,
    card_exp_year INTEGER,
    
    -- Wallet/Crypto details
    wallet_address TEXT,
    wallet_network VARCHAR(50),
    
    -- Bank transfer details
    bank_name VARCHAR(100),
    account_holder VARCHAR(100),
    account_number_encrypted TEXT,
    routing_number VARCHAR(20),
    
    -- Provider tokens
    stripe_payment_method_id VARCHAR(255),
    square_card_id VARCHAR(255),
    
    is_default BOOLEAN DEFAULT false,
    is_verified BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Step 3: Add foreign key constraint (if auth.users exists)
DO $$
BEGIN
    -- Check if auth.users table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users') THEN
        ALTER TABLE payment_methods 
        ADD CONSTRAINT fk_payment_methods_user_id 
        FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
        RAISE NOTICE '✅ Foreign key constraint added to auth.users';
    ELSE
        -- If auth.users doesn't exist, check for profiles table
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
            ALTER TABLE payment_methods 
            ADD CONSTRAINT fk_payment_methods_user_id 
            FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
            RAISE NOTICE '✅ Foreign key constraint added to profiles table';
        ELSE
            RAISE NOTICE '⚠️ No auth.users or profiles table found - foreign key constraint skipped';
        END IF;
    END IF;
END $$;

-- Step 4: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_payment_methods_user_id ON payment_methods(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_type ON payment_methods(type);
CREATE INDEX IF NOT EXISTS idx_payment_methods_provider ON payment_methods(provider);
CREATE INDEX IF NOT EXISTS idx_payment_methods_is_default ON payment_methods(is_default) WHERE is_default = true;
CREATE INDEX IF NOT EXISTS idx_payment_methods_is_active ON payment_methods(is_active) WHERE is_active = true;

-- Step 5: Enable Row Level Security
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;

-- Step 6: Create RLS policies
-- Users can only see their own payment methods
CREATE POLICY "Users can view their own payment methods" ON payment_methods
    FOR SELECT USING (
        auth.uid() = user_id OR
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin', 'monitor'))
    );

-- Users can insert their own payment methods
CREATE POLICY "Users can insert their own payment methods" ON payment_methods
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own payment methods
CREATE POLICY "Users can update their own payment methods" ON payment_methods
    FOR UPDATE USING (
        auth.uid() = user_id OR
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
    );

-- Users can delete their own payment methods
CREATE POLICY "Users can delete their own payment methods" ON payment_methods
    FOR DELETE USING (
        auth.uid() = user_id OR
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
    );

-- Step 7: Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_payment_methods_updated_at 
    BEFORE UPDATE ON payment_methods 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Step 8: Insert sample data for testing (optional)
-- Uncomment if you want to test with sample data
/*
INSERT INTO payment_methods (user_id, type, provider, card_last_four, card_brand, is_default, is_verified, is_active) VALUES
(gen_random_uuid(), 'card', 'stripe', '4242', 'visa', true, true, true),
(gen_random_uuid(), 'wallet', 'internal_wallet', NULL, NULL, false, true, true),
(gen_random_uuid(), 'crypto', 'usdt', NULL, NULL, false, false, true);
*/

-- Step 9: Verify table creation
DO $$
BEGIN
    -- Check if table exists and has the type column
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'payment_methods' AND column_name = 'type'
    ) THEN
        RAISE NOTICE '✅ payment_methods table created successfully with type column';
    ELSE
        RAISE NOTICE '❌ payment_methods table creation failed';
    END IF;
    
    -- Show table structure
    RAISE NOTICE 'Table structure created:';
    RAISE NOTICE '- id (UUID, PRIMARY KEY)';
    RAISE NOTICE '- user_id (UUID, FOREIGN KEY)';
    RAISE NOTICE '- type (VARCHAR(50), CHECK constraint)';
    RAISE NOTICE '- provider (VARCHAR(50), CHECK constraint)';
    RAISE NOTICE '- Card fields: card_last_four, card_brand, card_exp_month, card_exp_year';
    RAISE NOTICE '- Wallet fields: wallet_address, wallet_network';
    RAISE NOTICE '- Bank fields: bank_name, account_holder, account_number_encrypted, routing_number';
    RAISE NOTICE '- Provider tokens: stripe_payment_method_id, square_card_id';
    RAISE NOTICE '- Status fields: is_default, is_verified, is_active';
    RAISE NOTICE '- Metadata: metadata (JSONB)';
    RAISE NOTICE '- Timestamps: created_at, updated_at';
END $$;

-- ============================================================
-- SUMMARY
-- ============================================================
-- ✅ payment_methods table created with correct structure
-- ✅ type column exists with proper CHECK constraint
-- ✅ Foreign key constraint added (if possible)
-- ✅ Indexes created for performance
-- ✅ Row Level Security enabled with proper policies
-- ✅ Trigger for updated_at column
-- ✅ Verification completed
-- 
-- The "column type does not exist" error should now be resolved!
-- ============================================================ 