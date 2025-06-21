-- ============================================================
-- FIX MISSING USER_ID COLUMNS - SAMIA TAROT
-- This script adds missing user_id columns to specific tables
-- ============================================================

-- ============================================================
-- 1. FIX VOICE_NOTES TABLE
-- ============================================================

DO $$
BEGIN
    -- Check if user_id column exists in voice_notes
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'voice_notes' AND column_name = 'user_id'
    ) THEN
        -- Add user_id column
        ALTER TABLE voice_notes ADD COLUMN user_id UUID NOT NULL DEFAULT gen_random_uuid();
        
        -- Add foreign key constraint if auth.users exists
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users') THEN
            ALTER TABLE voice_notes 
            ADD CONSTRAINT fk_voice_notes_user_id 
            FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
        END IF;
        
        -- Create index
        CREATE INDEX IF NOT EXISTS idx_voice_notes_user_id ON voice_notes(user_id);
        
        RAISE NOTICE '✅ Added user_id column to voice_notes table';
    ELSE
        RAISE NOTICE '⚠️ user_id column already exists in voice_notes table';
    END IF;
END $$;

-- ============================================================
-- 2. FIX EMERGENCY_ESCALATIONS TABLE
-- ============================================================

DO $$
BEGIN
    -- Check if user_id column exists in emergency_escalations
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'emergency_escalations' AND column_name = 'user_id'
    ) THEN
        -- Add user_id column
        ALTER TABLE emergency_escalations ADD COLUMN user_id UUID NOT NULL DEFAULT gen_random_uuid();
        
        -- Add foreign key constraint if auth.users exists
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users') THEN
            ALTER TABLE emergency_escalations 
            ADD CONSTRAINT fk_emergency_escalations_user_id 
            FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
        END IF;
        
        -- Create index
        CREATE INDEX IF NOT EXISTS idx_emergency_escalations_user_id ON emergency_escalations(user_id);
        
        RAISE NOTICE '✅ Added user_id column to emergency_escalations table';
    ELSE
        RAISE NOTICE '⚠️ user_id column already exists in emergency_escalations table';
    END IF;
END $$;

-- ============================================================
-- 3. FIX EMERGENCY_ALERTS TABLE
-- ============================================================

DO $$
BEGIN
    -- Check if user_id column exists in emergency_alerts
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'emergency_alerts' AND column_name = 'user_id'
    ) THEN
        -- Add user_id column
        ALTER TABLE emergency_alerts ADD COLUMN user_id UUID NOT NULL DEFAULT gen_random_uuid();
        
        -- Add foreign key constraint if auth.users exists
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users') THEN
            ALTER TABLE emergency_alerts 
            ADD CONSTRAINT fk_emergency_alerts_user_id 
            FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
        END IF;
        
        -- Create index
        CREATE INDEX IF NOT EXISTS idx_emergency_alerts_user_id ON emergency_alerts(user_id);
        
        RAISE NOTICE '✅ Added user_id column to emergency_alerts table';
    ELSE
        RAISE NOTICE '⚠️ user_id column already exists in emergency_alerts table';
    END IF;
END $$;

-- ============================================================
-- 4. VERIFY ALL FIXES
-- ============================================================

DO $$
DECLARE
    voice_notes_has_user_id BOOLEAN;
    emergency_escalations_has_user_id BOOLEAN;
    emergency_alerts_has_user_id BOOLEAN;
BEGIN
    -- Check voice_notes
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'voice_notes' AND column_name = 'user_id'
    ) INTO voice_notes_has_user_id;
    
    -- Check emergency_escalations
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'emergency_escalations' AND column_name = 'user_id'
    ) INTO emergency_escalations_has_user_id;
    
    -- Check emergency_alerts
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'emergency_alerts' AND column_name = 'user_id'
    ) INTO emergency_alerts_has_user_id;
    
    RAISE NOTICE '📊 VERIFICATION RESULTS:';
    RAISE NOTICE '================================================';
    
    IF voice_notes_has_user_id THEN
        RAISE NOTICE '✅ voice_notes.user_id: EXISTS';
    ELSE
        RAISE NOTICE '❌ voice_notes.user_id: MISSING';
    END IF;
    
    IF emergency_escalations_has_user_id THEN
        RAISE NOTICE '✅ emergency_escalations.user_id: EXISTS';
    ELSE
        RAISE NOTICE '❌ emergency_escalations.user_id: MISSING';
    END IF;
    
    IF emergency_alerts_has_user_id THEN
        RAISE NOTICE '✅ emergency_alerts.user_id: EXISTS';
    ELSE
        RAISE NOTICE '❌ emergency_alerts.user_id: MISSING';
    END IF;
    
    IF voice_notes_has_user_id AND emergency_escalations_has_user_id AND emergency_alerts_has_user_id THEN
        RAISE NOTICE '================================================';
        RAISE NOTICE '🎉 ALL USER_ID COLUMNS FIXED SUCCESSFULLY!';
        RAISE NOTICE '📋 Database is now consistent and ready for use';
    ELSE
        RAISE NOTICE '================================================';
        RAISE NOTICE '⚠️ Some user_id columns still missing - manual intervention required';
    END IF;
END $$; 