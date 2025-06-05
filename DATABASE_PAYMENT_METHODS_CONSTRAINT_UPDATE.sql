-- ============================================================
-- PAYMENT METHODS CONSTRAINT UPDATE - SAMIA TAROT
-- Update payments table to restrict payment methods to ONLY approved ones
-- ============================================================

-- Step 1: Remove existing constraint if it exists
DO $$ 
BEGIN
    -- Check if constraint exists and drop it
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'payment_method_check' 
        AND table_name = 'payments'
    ) THEN
        ALTER TABLE payments DROP CONSTRAINT payment_method_check;
        RAISE NOTICE 'Existing payment_method_check constraint dropped';
    END IF;
    
    -- Also check for any enum types that might be in use
    IF EXISTS (
        SELECT 1 FROM pg_type 
        WHERE typname = 'payment_method_enum'
    ) THEN
        -- Convert column to VARCHAR if it's using enum
        ALTER TABLE payments 
        ALTER COLUMN method TYPE VARCHAR(32);
        
        -- Drop the enum type
        DROP TYPE payment_method_enum CASCADE;
        RAISE NOTICE 'Converted method column from enum to varchar and dropped enum type';
    END IF;
END $$;

-- Step 2: Ensure the column is VARCHAR(32) 
ALTER TABLE payments 
ALTER COLUMN method TYPE VARCHAR(32);

-- Step 3: Add strict constraint for ONLY the 10 approved payment methods
ALTER TABLE payments
ADD CONSTRAINT payment_method_check CHECK (
  method IN (
    'stripe',           -- Credit/Debit cards via Stripe (EU/UAE)
    'square',           -- Credit/Debit cards via Square (Other countries)  
    'usdt',             -- USDT Cryptocurrency (Global)
    'western_union',    -- Western Union money transfer (Global)
    'moneygram',        -- MoneyGram international transfer (Global)
    'ria',              -- Ria money transfer service (Global)
    'omt',              -- OMT Lebanon money transfer (Lebanon only)
    'whish',            -- Whish Money digital wallet (Lebanon only)
    'bob',              -- Bank of Beirut transfer (Lebanon only)
    'wallet'            -- SAMIA In-App Wallet (Global)
  )
);

-- Step 4: Update any existing payments with unauthorized methods
-- WARNING: This will change existing data - review before running!

-- First, let's see what unauthorized methods exist
DO $$
DECLARE
    unauthorized_methods TEXT[];
    method_record RECORD;
BEGIN
    -- Get list of unauthorized methods currently in the database
    SELECT ARRAY_AGG(DISTINCT method) INTO unauthorized_methods
    FROM payments 
    WHERE method NOT IN (
        'stripe', 'square', 'usdt', 'western_union', 'moneygram', 
        'ria', 'omt', 'whish', 'bob', 'wallet'
    );
    
    -- Log unauthorized methods found
    IF array_length(unauthorized_methods, 1) > 0 THEN
        RAISE NOTICE 'Found unauthorized payment methods: %', unauthorized_methods;
        
        -- Map unauthorized methods to approved ones
        -- Adjust these mappings based on your business logic
        
        -- Map common unauthorized methods to approved ones
        UPDATE payments SET method = 'wallet' 
        WHERE method IN ('bank_transfer', 'wire_transfer', 'transfer');
        
        UPDATE payments SET method = 'wallet' 
        WHERE method IN ('paypal', 'cash', 'check');
        
        UPDATE payments SET method = 'usdt' 
        WHERE method IN ('bitcoin', 'btc', 'crypto', 'cryptocurrency');
        
        UPDATE payments SET method = 'stripe' 
        WHERE method IN ('credit_card', 'card', 'visa', 'mastercard');
        
        -- Any remaining unauthorized methods get mapped to wallet
        UPDATE payments SET method = 'wallet' 
        WHERE method NOT IN (
            'stripe', 'square', 'usdt', 'western_union', 'moneygram', 
            'ria', 'omt', 'whish', 'bob', 'wallet'
        );
        
        RAISE NOTICE 'Updated unauthorized payment methods to approved methods';
    ELSE
        RAISE NOTICE 'No unauthorized payment methods found';
    END IF;
END $$;

-- Step 5: Verify the constraint is working
DO $$
BEGIN
    -- Test the constraint by trying to insert an invalid method
    BEGIN
        INSERT INTO payments (id, user_id, amount, method, status) 
        VALUES (gen_random_uuid(), gen_random_uuid(), 10.00, 'unauthorized_method', 'pending');
        
        RAISE EXCEPTION 'Constraint failed - unauthorized method was allowed!';
    EXCEPTION WHEN check_violation THEN
        RAISE NOTICE 'SUCCESS: Payment method constraint is working correctly';
        -- Rollback the test insert
        ROLLBACK;
    END;
END $$;

-- Step 6: Create index for performance
CREATE INDEX IF NOT EXISTS idx_payments_method ON payments(method);

-- Step 7: Add comment documenting the restriction
COMMENT ON COLUMN payments.method IS 'Payment method - RESTRICTED to only 10 approved methods: stripe, square, usdt, western_union, moneygram, ria, omt, whish, bob, wallet';

-- Step 8: Update any related stored procedures or functions
-- (If you have any stored procedures that insert payments, they need to be reviewed)

-- Step 9: Grant appropriate permissions
-- Ensure users can still read/write payments with the new constraint
GRANT SELECT, INSERT, UPDATE ON payments TO authenticated;

-- ============================================================
-- VERIFICATION QUERIES
-- ============================================================

-- Check constraint exists
SELECT conname, contype, consrc 
FROM pg_constraint 
WHERE conrelid = 'payments'::regclass 
AND conname = 'payment_method_check';

-- Count payments by method to verify all are approved
SELECT 
    method,
    COUNT(*) as count,
    CASE 
        WHEN method IN ('stripe', 'square', 'usdt', 'western_union', 'moneygram', 'ria', 'omt', 'whish', 'bob', 'wallet')
        THEN 'APPROVED' 
        ELSE 'UNAUTHORIZED' 
    END as status
FROM payments 
GROUP BY method 
ORDER BY count DESC;

-- ============================================================
-- ROLLBACK SCRIPT (if needed)
-- ============================================================
/*
-- UNCOMMENT ONLY IF YOU NEED TO ROLLBACK THE CHANGES

-- Remove the constraint
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payment_method_check;

-- Remove the comment
COMMENT ON COLUMN payments.method IS NULL;

-- Remove the index
DROP INDEX IF EXISTS idx_payments_method;

RAISE NOTICE 'Payment method restrictions have been removed';
*/ 