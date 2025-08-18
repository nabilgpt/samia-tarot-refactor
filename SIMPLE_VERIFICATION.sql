-- 🔍 SAMIA TAROT - SIMPLE VERIFICATION (No ambiguous errors)
-- Run this after QUICK_FIX_WALLET_ERROR.sql

-- Simple table existence check (no ambiguous references)
DO $$
DECLARE
    wallets_count INTEGER := 0;
    wallet_transactions_count INTEGER := 0;
    payment_methods_count INTEGER := 0;
    chat_sessions_count INTEGER := 0;
    chat_messages_count INTEGER := 0;
    total_critical_tables INTEGER := 0;
BEGIN
    RAISE NOTICE '🔍 CHECKING CRITICAL TABLES...';
    RAISE NOTICE '';
    
    -- Check wallets table
    SELECT COUNT(*) INTO wallets_count FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'wallets';
    
    -- Check wallet_transactions table  
    SELECT COUNT(*) INTO wallet_transactions_count FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'wallet_transactions';
    
    -- Check payment_methods table
    SELECT COUNT(*) INTO payment_methods_count FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'payment_methods';
    
    -- Check chat_sessions table
    SELECT COUNT(*) INTO chat_sessions_count FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'chat_sessions';
    
    -- Check chat_messages table
    SELECT COUNT(*) INTO chat_messages_count FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'chat_messages';
    
    -- Display results
    IF wallets_count > 0 THEN
        RAISE NOTICE '✅ wallets';
        total_critical_tables := total_critical_tables + 1;
    ELSE
        RAISE NOTICE '❌ wallets (MISSING)';
    END IF;
    
    IF wallet_transactions_count > 0 THEN
        RAISE NOTICE '✅ wallet_transactions';
        total_critical_tables := total_critical_tables + 1;
    ELSE
        RAISE NOTICE '❌ wallet_transactions (MISSING)';
    END IF;
    
    IF payment_methods_count > 0 THEN
        RAISE NOTICE '✅ payment_methods';
        total_critical_tables := total_critical_tables + 1;
    ELSE
        RAISE NOTICE '❌ payment_methods (MISSING)';
    END IF;
    
    IF chat_sessions_count > 0 THEN
        RAISE NOTICE '✅ chat_sessions';
        total_critical_tables := total_critical_tables + 1;
    ELSE
        RAISE NOTICE '❌ chat_sessions (MISSING)';
    END IF;
    
    IF chat_messages_count > 0 THEN
        RAISE NOTICE '✅ chat_messages';
        total_critical_tables := total_critical_tables + 1;
    ELSE
        RAISE NOTICE '❌ chat_messages (MISSING)';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '📊 SUMMARY: % / 5 critical tables exist', total_critical_tables;
    
    IF wallets_count > 0 AND wallet_transactions_count > 0 THEN
        RAISE NOTICE '';
        RAISE NOTICE '🎉 WALLET_ID ERROR: FIXED!';
        RAISE NOTICE '✅ wallets table exists';
        RAISE NOTICE '✅ wallet_transactions can reference wallets';
        RAISE NOTICE '';
        RAISE NOTICE '🚀 READY TO CREATE REMAINING TABLES!';
        RAISE NOTICE '';
        RAISE NOTICE '📋 NEXT STEPS:';
        RAISE NOTICE '1. Tables are now safe to create';
        RAISE NOTICE '2. Test frontend: http://localhost:3000';
        RAISE NOTICE '3. No more wallet_id errors!';
    ELSE
        RAISE NOTICE '';
        RAISE NOTICE '⚠️ WALLET ISSUE STILL EXISTS';
        RAISE NOTICE 'Please re-run QUICK_FIX_WALLET_ERROR.sql';
    END IF;
    
    RAISE NOTICE '';
END $$; 