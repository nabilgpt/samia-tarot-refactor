-- ============================================================
-- FIX WALLET_TRANSACTIONS BOOKING_ID COLUMN
-- This script adds the missing booking_id column to wallet_transactions
-- Run this in Supabase SQL Editor
-- ============================================================

DO $$
BEGIN
    -- Check if wallet_transactions table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'wallet_transactions') THEN
        
        -- Check if booking_id column already exists
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'wallet_transactions' AND column_name = 'booking_id'
        ) THEN
            -- Add booking_id column
            ALTER TABLE wallet_transactions 
            ADD COLUMN booking_id UUID;
            
            -- Create index for performance
            CREATE INDEX IF NOT EXISTS idx_wallet_transactions_booking_id 
            ON wallet_transactions(booking_id);
            
            RAISE NOTICE '✅ Added booking_id column to wallet_transactions';
            
            -- Add foreign key constraint if bookings table exists
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bookings') 
               AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'id') THEN
                
                -- Drop constraint if it exists
                ALTER TABLE wallet_transactions DROP CONSTRAINT IF EXISTS fk_wallet_transactions_booking_id;
                
                -- Add the foreign key constraint
                ALTER TABLE wallet_transactions 
                ADD CONSTRAINT fk_wallet_transactions_booking_id 
                FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL;
                
                RAISE NOTICE '✅ Added foreign key constraint: wallet_transactions -> bookings';
            ELSE
                RAISE NOTICE '⚠️ Skipped foreign key constraint (bookings table/id column missing)';
            END IF;
            
        ELSE
            RAISE NOTICE '⚠️ booking_id column already exists in wallet_transactions';
        END IF;
        
    ELSE
        RAISE NOTICE '❌ wallet_transactions table does not exist';
    END IF;
END $$;

-- Verification
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'wallet_transactions' AND column_name = 'booking_id'
    ) THEN
        RAISE NOTICE '================================================';
        RAISE NOTICE '🎉 SUCCESS: wallet_transactions.booking_id column added!';
        RAISE NOTICE '✅ All database errors should now be resolved';
        RAISE NOTICE '================================================';
    ELSE
        RAISE NOTICE '================================================';
        RAISE NOTICE '❌ FAILED: wallet_transactions.booking_id still missing';
        RAISE NOTICE '================================================';
    END IF;
END $$; 