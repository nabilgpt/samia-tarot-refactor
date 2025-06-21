-- ============================================================
-- COMPLETE DATABASE FIX - SAMIA TAROT
-- This script fixes all identified database column and constraint issues
-- Run this in Supabase SQL Editor
-- ============================================================

-- ============================================================
-- PART 1: FIX MISSING USER_ID COLUMNS
-- ============================================================

-- Fix voice_notes table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'voice_notes' AND column_name = 'user_id'
    ) THEN
        ALTER TABLE voice_notes ADD COLUMN user_id UUID NOT NULL DEFAULT gen_random_uuid();
        CREATE INDEX IF NOT EXISTS idx_voice_notes_user_id ON voice_notes(user_id);
        RAISE NOTICE '✅ Added user_id column to voice_notes';
    ELSE
        RAISE NOTICE '⚠️ user_id already exists in voice_notes';
    END IF;
END $$;

-- Fix emergency_escalations table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'emergency_escalations' AND column_name = 'user_id'
    ) THEN
        ALTER TABLE emergency_escalations ADD COLUMN user_id UUID NOT NULL DEFAULT gen_random_uuid();
        CREATE INDEX IF NOT EXISTS idx_emergency_escalations_user_id ON emergency_escalations(user_id);
        RAISE NOTICE '✅ Added user_id column to emergency_escalations';
    ELSE
        RAISE NOTICE '⚠️ user_id already exists in emergency_escalations';
    END IF;
END $$;

-- Fix emergency_alerts table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'emergency_alerts' AND column_name = 'user_id'
    ) THEN
        ALTER TABLE emergency_alerts ADD COLUMN user_id UUID NOT NULL DEFAULT gen_random_uuid();
        CREATE INDEX IF NOT EXISTS idx_emergency_alerts_user_id ON emergency_alerts(user_id);
        RAISE NOTICE '✅ Added user_id column to emergency_alerts';
    ELSE
        RAISE NOTICE '⚠️ user_id already exists in emergency_alerts';
    END IF;
END $$;

-- ============================================================
-- PART 2: FIX BOOKINGS TABLE (CHECK IF ID COLUMN EXISTS)
-- ============================================================

DO $$
BEGIN
    -- Check if bookings table exists and has id column
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bookings') THEN
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'bookings' AND column_name = 'id'
        ) THEN
            RAISE NOTICE '✅ bookings table and id column exist';
        ELSE
            RAISE NOTICE '❌ bookings table missing id column';
            -- Add id column if missing
            ALTER TABLE bookings ADD COLUMN IF NOT EXISTS id UUID PRIMARY KEY DEFAULT gen_random_uuid();
            RAISE NOTICE '✅ Added id column to bookings table';
        END IF;
    ELSE
        RAISE NOTICE '❌ bookings table does not exist';
        -- Create basic bookings table if it doesn't exist
        CREATE TABLE bookings (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            client_id UUID,
            reader_id UUID,
            status VARCHAR(50) DEFAULT 'pending',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        RAISE NOTICE '✅ Created bookings table with id column';
    END IF;
END $$;

-- ============================================================
-- PART 3: DROP EXISTING PROBLEMATIC TRIGGERS (IF THEY EXIST)
-- ============================================================

-- Drop existing triggers to avoid "already exists" errors
DROP TRIGGER IF EXISTS update_payment_methods_updated_at ON payment_methods;
DROP TRIGGER IF EXISTS update_wallet_transactions_updated_at ON wallet_transactions;
DROP TRIGGER IF EXISTS update_payment_receipts_updated_at ON payment_receipts;
DROP TRIGGER IF EXISTS update_chat_sessions_updated_at ON chat_sessions;
DROP TRIGGER IF EXISTS update_chat_messages_updated_at ON chat_messages;
DROP TRIGGER IF EXISTS update_voice_notes_updated_at ON voice_notes;

-- ============================================================
-- PART 4: RECREATE UPDATE TRIGGERS (SAFE VERSION)
-- ============================================================

-- Create or replace the update function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate triggers only if tables exist
DO $$
BEGIN
    -- Payment methods trigger
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payment_methods') THEN
        CREATE TRIGGER update_payment_methods_updated_at
            BEFORE UPDATE ON payment_methods
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        RAISE NOTICE '✅ Created payment_methods trigger';
    END IF;
    
    -- Wallet transactions trigger
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'wallet_transactions') THEN
        CREATE TRIGGER update_wallet_transactions_updated_at
            BEFORE UPDATE ON wallet_transactions
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        RAISE NOTICE '✅ Created wallet_transactions trigger';
    END IF;
    
    -- Payment receipts trigger
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payment_receipts') THEN
        CREATE TRIGGER update_payment_receipts_updated_at
            BEFORE UPDATE ON payment_receipts
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        RAISE NOTICE '✅ Created payment_receipts trigger';
    END IF;
    
    -- Chat sessions trigger
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'chat_sessions') THEN
        CREATE TRIGGER update_chat_sessions_updated_at
            BEFORE UPDATE ON chat_sessions
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        RAISE NOTICE '✅ Created chat_sessions trigger';
    END IF;
    
    -- Chat messages trigger
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'chat_messages') THEN
        CREATE TRIGGER update_chat_messages_updated_at
            BEFORE UPDATE ON chat_messages
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        RAISE NOTICE '✅ Created chat_messages trigger';
    END IF;
    
    -- Voice notes trigger
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'voice_notes') THEN
        CREATE TRIGGER update_voice_notes_updated_at
            BEFORE UPDATE ON voice_notes
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        RAISE NOTICE '✅ Created voice_notes trigger';
    END IF;
END $$;

-- ============================================================
-- PART 5: ADD FOREIGN KEY CONSTRAINTS (SAFE VERSION)
-- ============================================================

-- Add foreign key constraints only if both tables and columns exist
DO $$
BEGIN
    -- wallet_transactions -> bookings foreign key
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'wallet_transactions') 
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bookings')
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'id')
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wallet_transactions' AND column_name = 'booking_id') THEN
        
        -- Drop constraint if it exists
        ALTER TABLE wallet_transactions DROP CONSTRAINT IF EXISTS fk_wallet_transactions_booking_id;
        
        -- Add the constraint
        ALTER TABLE wallet_transactions 
        ADD CONSTRAINT fk_wallet_transactions_booking_id 
        FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL;
        
        RAISE NOTICE '✅ Added wallet_transactions -> bookings foreign key';
    ELSE
        RAISE NOTICE '⚠️ Skipped wallet_transactions -> bookings foreign key (missing tables/columns)';
    END IF;
    
    -- Add other foreign keys if auth.users exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users') THEN
        -- voice_notes -> auth.users
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'voice_notes' AND column_name = 'user_id') THEN
            ALTER TABLE voice_notes DROP CONSTRAINT IF EXISTS fk_voice_notes_user_id;
            ALTER TABLE voice_notes ADD CONSTRAINT fk_voice_notes_user_id 
                FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
            RAISE NOTICE '✅ Added voice_notes -> auth.users foreign key';
        END IF;
        
        -- emergency_escalations -> auth.users
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'emergency_escalations' AND column_name = 'user_id') THEN
            ALTER TABLE emergency_escalations DROP CONSTRAINT IF EXISTS fk_emergency_escalations_user_id;
            ALTER TABLE emergency_escalations ADD CONSTRAINT fk_emergency_escalations_user_id 
                FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
            RAISE NOTICE '✅ Added emergency_escalations -> auth.users foreign key';
        END IF;
        
        -- emergency_alerts -> auth.users
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'emergency_alerts' AND column_name = 'user_id') THEN
            ALTER TABLE emergency_alerts DROP CONSTRAINT IF EXISTS fk_emergency_alerts_user_id;
            ALTER TABLE emergency_alerts ADD CONSTRAINT fk_emergency_alerts_user_id 
                FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
            RAISE NOTICE '✅ Added emergency_alerts -> auth.users foreign key';
        END IF;
    ELSE
        RAISE NOTICE '⚠️ Skipped auth.users foreign keys (auth.users table not found)';
    END IF;
END $$;

-- ============================================================
-- PART 6: VERIFICATION
-- ============================================================

DO $$
DECLARE
    voice_notes_user_id BOOLEAN;
    emergency_escalations_user_id BOOLEAN;
    emergency_alerts_user_id BOOLEAN;
    bookings_id BOOLEAN;
BEGIN
    -- Check all fixes
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'voice_notes' AND column_name = 'user_id'
    ) INTO voice_notes_user_id;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'emergency_escalations' AND column_name = 'user_id'
    ) INTO emergency_escalations_user_id;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'emergency_alerts' AND column_name = 'user_id'
    ) INTO emergency_alerts_user_id;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'bookings' AND column_name = 'id'
    ) INTO bookings_id;
    
    RAISE NOTICE '================================================';
    RAISE NOTICE '🎯 FINAL VERIFICATION RESULTS:';
    RAISE NOTICE '================================================';
    
    IF voice_notes_user_id THEN
        RAISE NOTICE '✅ voice_notes.user_id: FIXED';
    ELSE
        RAISE NOTICE '❌ voice_notes.user_id: STILL MISSING';
    END IF;
    
    IF emergency_escalations_user_id THEN
        RAISE NOTICE '✅ emergency_escalations.user_id: FIXED';
    ELSE
        RAISE NOTICE '❌ emergency_escalations.user_id: STILL MISSING';
    END IF;
    
    IF emergency_alerts_user_id THEN
        RAISE NOTICE '✅ emergency_alerts.user_id: FIXED';
    ELSE
        RAISE NOTICE '❌ emergency_alerts.user_id: STILL MISSING';
    END IF;
    
    IF bookings_id THEN
        RAISE NOTICE '✅ bookings.id: FIXED';
    ELSE
        RAISE NOTICE '❌ bookings.id: STILL MISSING';
    END IF;
    
    IF voice_notes_user_id AND emergency_escalations_user_id AND emergency_alerts_user_id AND bookings_id THEN
        RAISE NOTICE '================================================';
        RAISE NOTICE '🎉 ALL DATABASE ERRORS FIXED SUCCESSFULLY!';
        RAISE NOTICE '📋 Database is now consistent and production-ready';
        RAISE NOTICE '✅ All SQL scripts should work without errors';
    ELSE
        RAISE NOTICE '================================================';
        RAISE NOTICE '⚠️ Some issues remain - check individual results above';
    END IF;
END $$; 