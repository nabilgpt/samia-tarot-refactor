-- ============================================================
-- PART 2: ADD FOREIGN KEY CONSTRAINTS
-- Only adds foreign keys if target tables and columns exist
-- ============================================================

DO $$
BEGIN
    RAISE NOTICE 'Starting foreign key constraint additions...';
    
    -- Check and add auth.users foreign keys
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users') THEN
        RAISE NOTICE '✅ auth.users table found, adding user_id foreign keys...';
        
        -- Payment Methods user_id FK
        BEGIN
            ALTER TABLE payment_methods ADD CONSTRAINT fk_payment_methods_user_id 
            FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
            RAISE NOTICE '✅ Added payment_methods.user_id foreign key';
        EXCEPTION WHEN duplicate_object THEN
            RAISE NOTICE '⚠️ payment_methods.user_id foreign key already exists';
        WHEN others THEN
            RAISE NOTICE '❌ Failed to add payment_methods.user_id foreign key: %', SQLERRM;
        END;
        
        -- Wallet Transactions user_id FK
        BEGIN
            ALTER TABLE wallet_transactions ADD CONSTRAINT fk_wallet_transactions_user_id 
            FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
            RAISE NOTICE '✅ Added wallet_transactions.user_id foreign key';
        EXCEPTION WHEN duplicate_object THEN
            RAISE NOTICE '⚠️ wallet_transactions.user_id foreign key already exists';
        WHEN others THEN
            RAISE NOTICE '❌ Failed to add wallet_transactions.user_id foreign key: %', SQLERRM;
        END;
        
        -- Payment Receipts user_id FK
        BEGIN
            ALTER TABLE payment_receipts ADD CONSTRAINT fk_payment_receipts_user_id 
            FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
            RAISE NOTICE '✅ Added payment_receipts.user_id foreign key';
        EXCEPTION WHEN duplicate_object THEN
            RAISE NOTICE '⚠️ payment_receipts.user_id foreign key already exists';
        WHEN others THEN
            RAISE NOTICE '❌ Failed to add payment_receipts.user_id foreign key: %', SQLERRM;
        END;
        
        -- Voice Notes user_id FK
        BEGIN
            ALTER TABLE voice_notes ADD CONSTRAINT fk_voice_notes_user_id 
            FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
            RAISE NOTICE '✅ Added voice_notes.user_id foreign key';
        EXCEPTION WHEN duplicate_object THEN
            RAISE NOTICE '⚠️ voice_notes.user_id foreign key already exists';
        WHEN others THEN
            RAISE NOTICE '❌ Failed to add voice_notes.user_id foreign key: %', SQLERRM;
        END;
        
        -- User Activity Logs user_id FK
        BEGIN
            ALTER TABLE user_activity_logs ADD CONSTRAINT fk_user_activity_logs_user_id 
            FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
            RAISE NOTICE '✅ Added user_activity_logs.user_id foreign key';
        EXCEPTION WHEN duplicate_object THEN
            RAISE NOTICE '⚠️ user_activity_logs.user_id foreign key already exists';
        WHEN others THEN
            RAISE NOTICE '❌ Failed to add user_activity_logs.user_id foreign key: %', SQLERRM;
        END;
        
        -- AI Learning Data user_id FK
        BEGIN
            ALTER TABLE ai_learning_data ADD CONSTRAINT fk_ai_learning_data_user_id 
            FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
            RAISE NOTICE '✅ Added ai_learning_data.user_id foreign key';
        EXCEPTION WHEN duplicate_object THEN
            RAISE NOTICE '⚠️ ai_learning_data.user_id foreign key already exists';
        WHEN others THEN
            RAISE NOTICE '❌ Failed to add ai_learning_data.user_id foreign key: %', SQLERRM;
        END;
        
        -- AI Reading Results user_id FK
        BEGIN
            ALTER TABLE ai_reading_results ADD CONSTRAINT fk_ai_reading_results_user_id 
            FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
            RAISE NOTICE '✅ Added ai_reading_results.user_id foreign key';
        EXCEPTION WHEN duplicate_object THEN
            RAISE NOTICE '⚠️ ai_reading_results.user_id foreign key already exists';
        WHEN others THEN
            RAISE NOTICE '❌ Failed to add ai_reading_results.user_id foreign key: %', SQLERRM;
        END;
        
        -- Reader Applications user_id FK
        BEGIN
            ALTER TABLE reader_applications ADD CONSTRAINT fk_reader_applications_user_id 
            FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
            RAISE NOTICE '✅ Added reader_applications.user_id foreign key';
        EXCEPTION WHEN duplicate_object THEN
            RAISE NOTICE '⚠️ reader_applications.user_id foreign key already exists';
        WHEN others THEN
            RAISE NOTICE '❌ Failed to add reader_applications.user_id foreign key: %', SQLERRM;
        END;
        
        -- Reader Analytics reader_id FK
        BEGIN
            ALTER TABLE reader_analytics ADD CONSTRAINT fk_reader_analytics_reader_id 
            FOREIGN KEY (reader_id) REFERENCES auth.users(id) ON DELETE CASCADE;
            RAISE NOTICE '✅ Added reader_analytics.reader_id foreign key';
        EXCEPTION WHEN duplicate_object THEN
            RAISE NOTICE '⚠️ reader_analytics.reader_id foreign key already exists';
        WHEN others THEN
            RAISE NOTICE '❌ Failed to add reader_analytics.reader_id foreign key: %', SQLERRM;
        END;
        
    ELSE
        RAISE NOTICE '❌ auth.users table not found, skipping user_id foreign keys';
    END IF;
    
    -- Check and add bookings foreign keys
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'bookings') THEN
        RAISE NOTICE '✅ bookings table found, adding booking_id foreign keys...';
        
        -- Wallet Transactions booking_id FK
        BEGIN
            ALTER TABLE wallet_transactions ADD CONSTRAINT fk_wallet_transactions_booking_id 
            FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL;
            RAISE NOTICE '✅ Added wallet_transactions.booking_id foreign key';
        EXCEPTION WHEN duplicate_object THEN
            RAISE NOTICE '⚠️ wallet_transactions.booking_id foreign key already exists';
        WHEN others THEN
            RAISE NOTICE '❌ Failed to add wallet_transactions.booking_id foreign key: %', SQLERRM;
        END;
        
        -- Payment Receipts booking_id FK
        BEGIN
            ALTER TABLE payment_receipts ADD CONSTRAINT fk_payment_receipts_booking_id 
            FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE;
            RAISE NOTICE '✅ Added payment_receipts.booking_id foreign key';
        EXCEPTION WHEN duplicate_object THEN
            RAISE NOTICE '⚠️ payment_receipts.booking_id foreign key already exists';
        WHEN others THEN
            RAISE NOTICE '❌ Failed to add payment_receipts.booking_id foreign key: %', SQLERRM;
        END;
        
    ELSE
        RAISE NOTICE '❌ bookings table not found, skipping booking_id foreign keys';
    END IF;
    
    -- Check and add chat_messages foreign keys
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'chat_messages') THEN
        RAISE NOTICE '✅ chat_messages table found, adding message_id foreign key...';
        
        -- Voice Notes message_id FK
        BEGIN
            ALTER TABLE voice_notes ADD CONSTRAINT fk_voice_notes_message_id 
            FOREIGN KEY (message_id) REFERENCES chat_messages(id) ON DELETE CASCADE;
            RAISE NOTICE '✅ Added voice_notes.message_id foreign key';
        EXCEPTION WHEN duplicate_object THEN
            RAISE NOTICE '⚠️ voice_notes.message_id foreign key already exists';
        WHEN others THEN
            RAISE NOTICE '❌ Failed to add voice_notes.message_id foreign key: %', SQLERRM;
        END;
        
    ELSE
        RAISE NOTICE '❌ chat_messages table not found, skipping message_id foreign key';
    END IF;
    
    RAISE NOTICE '✅ PART 2 COMPLETED: Foreign key constraint additions finished';
END $$; 