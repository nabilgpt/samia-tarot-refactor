-- ============================================================
-- MASTER DATABASE SETUP - SAMIA TAROT PLATFORM
-- This script orchestrates the complete database setup
-- ============================================================

-- ============================================================
-- PART 0: MASTER SETUP SCRIPT
-- ============================================================

DO $$
BEGIN
    RAISE NOTICE '🚀 SAMIA TAROT DATABASE SETUP STARTED';
    RAISE NOTICE '================================================';
    RAISE NOTICE '📋 This will create all required tables and relationships';
    RAISE NOTICE '⏱️ Estimated time: 2-3 minutes';
    RAISE NOTICE '================================================';
END $$;

-- ============================================================
-- STEP 1: ENABLE REQUIRED EXTENSIONS
-- ============================================================

DO $$
BEGIN
    RAISE NOTICE '🔧 Step 1: Enabling PostgreSQL extensions...';
END $$;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- STEP 2: VERIFY EXISTING CORE TABLES
-- ============================================================

DO $$
BEGIN
    RAISE NOTICE '🔍 Step 2: Verifying existing core tables...';
    
    -- Check payment_settings
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payment_settings') THEN
        RAISE NOTICE '✅ payment_settings table exists';
    ELSE
        RAISE NOTICE '❌ payment_settings table missing';
    END IF;
    
    -- Check system_settings
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'system_settings') THEN
        RAISE NOTICE '✅ system_settings table exists';
    ELSE
        RAISE NOTICE '❌ system_settings table missing';
    END IF;
    
    -- Check profiles
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
        RAISE NOTICE '✅ profiles table exists';
    ELSE
        RAISE NOTICE '❌ profiles table missing';
    END IF;
    
    -- Check bookings
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bookings') THEN
        RAISE NOTICE '✅ bookings table exists';
    ELSE
        RAISE NOTICE '❌ bookings table missing';
    END IF;
END $$;

-- ============================================================
-- EXECUTION INSTRUCTIONS
-- ============================================================

DO $$
BEGIN
    RAISE NOTICE '📋 NEXT STEPS:';
    RAISE NOTICE '================================================';
    RAISE NOTICE '1. Run: psql -f database/01-payment-system.sql';
    RAISE NOTICE '2. Run: psql -f database/02-chat-system.sql';
    RAISE NOTICE '3. Run: psql -f database/03-analytics-system.sql';
    RAISE NOTICE '4. Run: psql -f database/04-emergency-system.sql';
    RAISE NOTICE '5. Run: psql -f database/05-foreign-keys.sql';
    RAISE NOTICE '================================================';
    RAISE NOTICE '💡 Or use the test script below to run all parts';
END $$; 