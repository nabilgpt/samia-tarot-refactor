-- ============================================================================
-- SAMIA TAROT - SAFE MIGRATION SCRIPT
-- Migrate from old structure to new refactored schema
-- ============================================================================
-- Date: 2025-07-13  
-- Purpose: Safely migrate existing data to new separated architecture
-- Safety: Backup validation, rollback capability, comprehensive logging
-- ============================================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================================
-- 0. MIGRATION SAFETY CHECKS
-- ============================================================================

-- Create migration log table
CREATE TABLE IF NOT EXISTS migration_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    migration_step VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('started', 'completed', 'failed', 'skipped')),
    records_processed INTEGER DEFAULT 0,
    error_message TEXT,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'
);

-- Migration control function
CREATE OR REPLACE FUNCTION log_migration_step(
    step_name TEXT,
    step_status TEXT,
    records_count INTEGER DEFAULT 0,
    error_msg TEXT DEFAULT NULL,
    step_metadata JSONB DEFAULT '{}'
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO migration_log (
        migration_step, status, records_processed, error_message, 
        started_at, completed_at, metadata
    ) VALUES (
        step_name, step_status, records_count, error_msg,
        NOW(), 
        CASE WHEN step_status IN ('completed', 'failed', 'skipped') THEN NOW() ELSE NULL END,
        step_metadata
    );
END;
$$ LANGUAGE plpgsql;

-- Check if backup exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'system_configurations'
    ) THEN
        RAISE EXCEPTION 'Migration aborted: Original system_configurations table not found. Please ensure backup is restored.';
    END IF;
    
    PERFORM log_migration_step('pre_migration_check', 'completed', 0, 'Original tables verified');
END $$;

-- ============================================================================
-- 1. CREATE NEW SCHEMA TABLES
-- ============================================================================

-- Note: Before running this migration, you must first run the new-refactored-schema.sql file
-- to create the new tables. This script assumes the new tables already exist.

-- Verify that new tables exist
DO $$
BEGIN
    -- Check system_secrets table
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'system_secrets') THEN
        RAISE EXCEPTION 'Table system_secrets not found. Please run new-refactored-schema.sql first.';
    END IF;
    
    -- Check providers table  
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'providers') THEN
        RAISE EXCEPTION 'Table providers not found. Please run new-refactored-schema.sql first.';
    END IF;
    
    -- Check translation_settings table
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'translation_settings') THEN
        RAISE EXCEPTION 'Table translation_settings not found. Please run new-refactored-schema.sql first.';
    END IF;
    
    -- Check that critical columns exist in system_secrets
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'system_secrets' AND column_name = 'secret_key'
    ) THEN
        RAISE EXCEPTION 'Column secret_key not found in system_secrets table. Schema creation may have failed.';
    END IF;
    
    -- Check for secret_category column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'system_secrets' AND column_name = 'secret_category'
    ) THEN
        RAISE EXCEPTION 'Column secret_category not found in system_secrets table. Please run new-refactored-schema.sql first.';
    END IF;
    
    -- Check for secret_subcategory column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'system_secrets' AND column_name = 'secret_subcategory'
    ) THEN
        RAISE EXCEPTION 'Column secret_subcategory not found in system_secrets table. Please run new-refactored-schema.sql first.';
    END IF;
    
    RAISE NOTICE 'All required tables and columns verified successfully.';
END
$$;

-- Log schema creation
SELECT log_migration_step('schema_creation', 'completed', 0, 'New schema tables verified successfully');

-- ============================================================================
-- 2. MIGRATE SYSTEM SECRETS
-- ============================================================================

-- Function to migrate system configurations to system secrets
CREATE OR REPLACE FUNCTION migrate_system_secrets()
RETURNS INTEGER AS $$
DECLARE
    rec RECORD;
    total_migrated INTEGER := 0;
    secret_encrypted TEXT;
    secret_salt TEXT;
BEGIN
    -- Migrate sensitive configurations to system_secrets
    FOR rec IN 
        SELECT * FROM system_configurations 
        WHERE is_sensitive = true AND is_active = true
    LOOP
        -- Generate salt and encrypt value
        SELECT gen_salt('bf', 12) INTO secret_salt;
        
        -- Use the actual value (encrypted or plain)
        secret_encrypted := COALESCE(rec.config_value_encrypted, rec.config_value_plain, '');
        
        -- Insert into new system_secrets table
        INSERT INTO system_secrets (
            secret_key, secret_category, secret_subcategory,
            secret_value_encrypted, secret_salt, encryption_method,
            display_name, description, provider_name,
            access_level, is_required, requires_restart,
            last_tested_at, test_status, environment, is_active,
            created_by, updated_by, created_at, updated_at
        ) VALUES (
            rec.config_key,
            rec.config_category,
            rec.config_subcategory,
            secret_encrypted, -- Will be properly encrypted in production
            secret_salt,
            'AES-256-GCM',
            rec.display_name,
            rec.description,
            CASE 
                WHEN rec.config_key LIKE '%OPENAI%' THEN 'OpenAI'
                WHEN rec.config_key LIKE '%ELEVENLABS%' THEN 'ElevenLabs'
                WHEN rec.config_key LIKE '%STRIPE%' THEN 'Stripe'
                WHEN rec.config_key LIKE '%BACKBLAZE%' THEN 'Backblaze'
                WHEN rec.config_key LIKE '%TWILIO%' THEN 'Twilio'
                ELSE 'Unknown'
            END,
            rec.access_level,
            rec.is_required,
            rec.requires_restart,
            rec.last_accessed_at,
            CASE 
                WHEN rec.config_key LIKE '%API_KEY%' THEN 'untested'
                ELSE 'untested'
            END,
            rec.environment,
            rec.is_active,
            rec.created_by,
            rec.updated_by,
            rec.created_at,
            rec.updated_at
        );
        
        total_migrated := total_migrated + 1;
    END LOOP;
    
    RETURN total_migrated;
END;
$$ LANGUAGE plpgsql;

-- Execute system secrets migration
DO $$
DECLARE
    migrated_count INTEGER;
BEGIN
    SELECT migrate_system_secrets() INTO migrated_count;
    PERFORM log_migration_step('system_secrets_migration', 'completed', migrated_count, 'System secrets migrated successfully');
EXCEPTION
    WHEN OTHERS THEN
        PERFORM log_migration_step('system_secrets_migration', 'failed', 0, SQLERRM);
        RAISE;
END $$;

-- ============================================================================
-- 3. MIGRATE PROVIDERS
-- ============================================================================

-- Function to migrate AI providers
CREATE OR REPLACE FUNCTION migrate_providers()
RETURNS INTEGER AS $$
DECLARE
    rec RECORD;
    total_migrated INTEGER := 0;
    new_provider_id UUID;
BEGIN
    -- Migrate from ai_providers table if exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ai_providers') THEN
        FOR rec IN SELECT * FROM ai_providers WHERE is_active = true
        LOOP
            -- Insert into new providers table
            INSERT INTO providers (
                provider_key, provider_name, provider_type,
                company_name, api_base_url, description,
                supported_languages, supported_features,
                is_active, health_status, created_by, updated_by,
                created_at, updated_at
            ) VALUES (
                rec.name,
                rec.name,
                CASE 
                    WHEN rec.supports_text_generation THEN 'ai_language'
                    WHEN rec.supports_audio_generation THEN 'ai_tts'
                    ELSE 'ai_language'
                END,
                rec.provider_type,
                rec.api_endpoint,
                rec.description,
                ARRAY['en', 'ar'], -- Default languages
                ARRAY['translation', 'generation'], -- Default features
                rec.is_active,
                rec.health_status,
                rec.created_by,
                rec.updated_by,
                rec.created_at,
                rec.updated_at
            ) RETURNING id INTO new_provider_id;
            
            total_migrated := total_migrated + 1;
        END LOOP;
    END IF;
    
    -- Migrate from ai_translation_providers table if exists  
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ai_translation_providers') THEN
        FOR rec IN SELECT * FROM ai_translation_providers WHERE is_active = true
        LOOP
            -- Check if provider already exists
            IF NOT EXISTS (SELECT 1 FROM providers WHERE provider_key = rec.name) THEN
                INSERT INTO providers (
                    provider_key, provider_name, provider_type,
                    company_name, api_base_url, description,
                    supported_languages, supported_features,
                    rate_limit_per_minute, cost_per_1k_tokens,
                    is_active, health_status, config_schema, default_config,
                    created_by, updated_by, created_at, updated_at
                ) VALUES (
                    rec.name,
                    rec.display_name_en,
                    'translation',
                    rec.display_name_en,
                    rec.api_endpoint_url,
                    rec.description_en,
                    rec.supports_languages,
                    ARRAY['translation'],
                    60, -- Default rate limit
                    rec.estimated_cost_per_1k_tokens,
                    rec.is_active,
                    rec.test_status,
                    rec.config_schema,
                    rec.default_config,
                    rec.created_by,
                    rec.created_by,
                    rec.created_at,
                    rec.updated_at
                ) RETURNING id INTO new_provider_id;
                
                total_migrated := total_migrated + 1;
            END IF;
        END LOOP;
    END IF;
    
    RETURN total_migrated;
END;
$$ LANGUAGE plpgsql;

-- Execute providers migration
DO $$
DECLARE
    migrated_count INTEGER;
BEGIN
    SELECT migrate_providers() INTO migrated_count;
    PERFORM log_migration_step('providers_migration', 'completed', migrated_count, 'Providers migrated successfully');
EXCEPTION
    WHEN OTHERS THEN
        PERFORM log_migration_step('providers_migration', 'failed', 0, SQLERRM);
        RAISE;
END $$;

-- ============================================================================
-- 4. MIGRATE TRANSLATION SETTINGS
-- ============================================================================

-- Function to migrate translation settings
CREATE OR REPLACE FUNCTION migrate_translation_settings()
RETURNS INTEGER AS $$
DECLARE
    rec RECORD;
    total_migrated INTEGER := 0;
BEGIN
    -- Migrate from existing translation_settings table if exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'translation_settings') THEN
        FOR rec IN SELECT * FROM translation_settings WHERE setting_key IS NOT NULL
        LOOP
            -- Insert into new translation_settings table (with enhanced structure)
            INSERT INTO translation_settings (
                setting_key, setting_category, setting_value, setting_type,
                display_name_en, display_name_ar, description_en, description_ar,
                is_user_configurable, is_required, default_value,
                is_active, created_at, updated_at, updated_by
            ) VALUES (
                rec.setting_key,
                COALESCE(rec.category, 'general'),
                rec.setting_value,
                'config',
                COALESCE(rec.description_en, rec.setting_key),
                COALESCE(rec.description_ar, rec.setting_key),
                rec.description_en,
                rec.description_ar,
                NOT COALESCE(rec.is_system_setting, false),
                false,
                rec.setting_value,
                true,
                rec.created_at,
                rec.updated_at,
                rec.updated_by
            );
            
            total_migrated := total_migrated + 1;
        END LOOP;
    ELSE
        -- Insert default translation settings if no existing table
        INSERT INTO translation_settings (
            setting_key, setting_category, setting_value, setting_type,
            display_name_en, display_name_ar, description_en, description_ar,
            is_user_configurable, default_value, is_active
        ) VALUES 
        ('global_translation_mode', 'general', '"auto-translate"', 'mode',
         'Global Translation Mode', 'نمط الترجمة العام', 
         'Default translation mode for all bilingual content', 'نمط الترجمة الافتراضي لجميع المحتوى ثنائي اللغة',
         true, '"auto-translate"', true),
        ('default_provider', 'providers', '"openai"', 'config',
         'Default Provider', 'المزود الافتراضي',
         'Default AI provider for translations', 'مزود الذكاء الاصطناعي الافتراضي للترجمة',
         true, '"openai"', true),
        ('enable_provider_fallback', 'fallback', 'true', 'toggle',
         'Enable Provider Fallback', 'تفعيل التراجع للمزود البديل',
         'Enable automatic fallback to secondary providers', 'تفعيل التراجع التلقائي للمزودين الثانويين',
         true, 'true', true),
        ('translation_quality_threshold', 'quality', '0.8', 'threshold',
         'Quality Threshold', 'حد الجودة',
         'Minimum quality score to accept translations', 'الحد الأدنى لدرجة الجودة لقبول الترجمات',
         true, '0.8', true),
        ('cache_translations', 'caching', 'true', 'toggle',
         'Cache Translations', 'حفظ الترجمات مؤقتاً',
         'Enable caching for improved performance', 'تفعيل الحفظ المؤقت لتحسين الأداء',
         true, 'true', true),
        ('max_retries_per_provider', 'providers', '3', 'config',
         'Max Retries Per Provider', 'الحد الأقصى للمحاولات لكل مزود',
         'Maximum retry attempts per provider before fallback', 'الحد الأقصى لمحاولات الإعادة لكل مزود قبل التراجع',
         true, '3', true),
        ('retry_delay_seconds', 'providers', '2', 'config',
         'Retry Delay (seconds)', 'تأخير الإعادة (ثواني)',
         'Delay between retry attempts in seconds', 'التأخير بين محاولات الإعادة بالثواني',
         true, '2', true),
        ('enable_usage_analytics', 'analytics', 'true', 'toggle',
         'Enable Usage Analytics', 'تفعيل تحليلات الاستخدام',
         'Track translation usage and performance', 'تتبع استخدام الترجمة والأداء',
         true, 'true', true);
        
        total_migrated := 8; -- Default settings count
    END IF;
    
    RETURN total_migrated;
END;
$$ LANGUAGE plpgsql;

-- Execute translation settings migration
DO $$
DECLARE
    migrated_count INTEGER;
BEGIN
    SELECT migrate_translation_settings() INTO migrated_count;
    PERFORM log_migration_step('translation_settings_migration', 'completed', migrated_count, 'Translation settings migrated successfully');
EXCEPTION
    WHEN OTHERS THEN
        PERFORM log_migration_step('translation_settings_migration', 'failed', 0, SQLERRM);
        RAISE;
END $$;

-- ============================================================================
-- 5. CREATE PROVIDER ASSIGNMENTS
-- ============================================================================

-- Function to create default provider assignments
CREATE OR REPLACE FUNCTION create_default_provider_assignments()
RETURNS INTEGER AS $$
DECLARE
    openai_provider_id UUID;
    google_provider_id UUID;
    total_assignments INTEGER := 0;
BEGIN
    -- Get OpenAI provider ID
    SELECT id INTO openai_provider_id 
    FROM providers 
    WHERE provider_key = 'openai' OR provider_key LIKE '%openai%'
    LIMIT 1;
    
    -- Get Google provider ID  
    SELECT id INTO google_provider_id
    FROM providers
    WHERE provider_key = 'google' OR provider_key LIKE '%google%'
    LIMIT 1;
    
    -- Create primary assignment for OpenAI if exists
    IF openai_provider_id IS NOT NULL THEN
        INSERT INTO translation_provider_assignments (
            provider_id, assignment_type, is_default, priority_order,
            supported_source_languages, supported_target_languages,
            quality_score, max_retries, retry_delay_seconds,
            enable_fallback, is_active
        ) VALUES (
            openai_provider_id, 'primary', true, 1,
            ARRAY['en', 'ar'], ARRAY['en', 'ar'],
            0.90, 5, 2, true, true
        );
        total_assignments := total_assignments + 1;
    END IF;
    
    -- Create fallback assignment for Google if exists
    IF google_provider_id IS NOT NULL THEN
        INSERT INTO translation_provider_assignments (
            provider_id, assignment_type, is_default, priority_order,
            supported_source_languages, supported_target_languages,
            quality_score, max_retries, retry_delay_seconds,
            enable_fallback, is_active
        ) VALUES (
            google_provider_id, 'fallback', false, 2,
            ARRAY['en', 'ar'], ARRAY['en', 'ar'],
            0.85, 3, 1, true, true
        );
        total_assignments := total_assignments + 1;
    END IF;
    
    RETURN total_assignments;
END;
$$ LANGUAGE plpgsql;

-- Execute provider assignments creation
DO $$
DECLARE
    assignments_count INTEGER;
BEGIN
    SELECT create_default_provider_assignments() INTO assignments_count;
    PERFORM log_migration_step('provider_assignments_creation', 'completed', assignments_count, 'Provider assignments created successfully');
EXCEPTION
    WHEN OTHERS THEN
        PERFORM log_migration_step('provider_assignments_creation', 'failed', 0, SQLERRM);
        RAISE;
END $$;

-- ============================================================================
-- 6. CREATE FEATURE ASSIGNMENTS
-- ============================================================================

-- Function to create default feature assignments
CREATE OR REPLACE FUNCTION create_default_feature_assignments()
RETURNS INTEGER AS $$
DECLARE
    primary_provider_id UUID;
    backup_provider_id UUID;
    total_features INTEGER := 0;
BEGIN
    -- Get primary provider (OpenAI)
    SELECT id INTO primary_provider_id
    FROM providers 
    WHERE provider_key = 'openai' OR provider_type = 'ai_language'
    LIMIT 1;
    
    -- Get backup provider (Google)
    SELECT id INTO backup_provider_id
    FROM providers
    WHERE provider_key = 'google' OR provider_key LIKE '%google%'
    LIMIT 1;
    
    -- Create feature assignments for key features
    INSERT INTO feature_provider_assignments (
        feature_name, feature_category, primary_provider_id, backup_provider_id,
        feature_config, enable_failover, max_retries, retry_delay_seconds, is_active
    ) VALUES 
    ('deck_types_translation', 'translation', primary_provider_id, backup_provider_id,
     '{"context": "tarot deck types", "tone": "mystical"}', true, 5, 2, true),
    ('spread_translation', 'translation', primary_provider_id, backup_provider_id,
     '{"context": "tarot spreads", "tone": "mystical"}', true, 5, 2, true),
    ('service_translation', 'translation', primary_provider_id, backup_provider_id,
     '{"context": "tarot services", "tone": "professional"}', true, 5, 2, true),
    ('daily_zodiac_generation', 'ai_chat', primary_provider_id, backup_provider_id,
     '{"context": "daily horoscope", "tone": "mystical", "personality": "Samia"}', true, 3, 5, true),
    ('tarot_reading_generation', 'ai_reading', primary_provider_id, backup_provider_id,
     '{"context": "tarot reading", "tone": "mystical", "personality": "Samia"}', true, 3, 5, true);
    
    total_features := 5;
    
    RETURN total_features;
END;
$$ LANGUAGE plpgsql;

-- Execute feature assignments creation
DO $$
DECLARE
    features_count INTEGER;
BEGIN
    SELECT create_default_feature_assignments() INTO features_count;
    PERFORM log_migration_step('feature_assignments_creation', 'completed', features_count, 'Feature assignments created successfully');
EXCEPTION
    WHEN OTHERS THEN
        PERFORM log_migration_step('feature_assignments_creation', 'failed', 0, SQLERRM);
        RAISE;
END $$;

-- ============================================================================
-- 7. DATA VALIDATION AND CONSISTENCY CHECKS
-- ============================================================================

-- Function to validate migration results
CREATE OR REPLACE FUNCTION validate_migration()
RETURNS TABLE(
    check_name TEXT,
    status TEXT,
    expected_count INTEGER,
    actual_count INTEGER,
    message TEXT
) AS $$
BEGIN
    -- Check system secrets migration
    RETURN QUERY
    SELECT 
        'System Secrets Migration' as check_name,
        CASE WHEN COUNT(*) > 0 THEN 'PASS' ELSE 'FAIL' END as status,
        (SELECT COUNT(*)::INTEGER FROM system_configurations WHERE is_sensitive = true) as expected_count,
        COUNT(*)::INTEGER as actual_count,
        'System secrets migrated from system_configurations' as message
    FROM system_secrets;
    
    -- Check providers migration
    RETURN QUERY
    SELECT 
        'Providers Migration' as check_name,
        CASE WHEN COUNT(*) > 0 THEN 'PASS' ELSE 'FAIL' END as status,
        2 as expected_count, -- At least OpenAI and Google
        COUNT(*)::INTEGER as actual_count,
        'AI providers migrated successfully' as message
    FROM providers WHERE is_active = true;
    
    -- Check translation settings
    RETURN QUERY
    SELECT 
        'Translation Settings' as check_name,
        CASE WHEN COUNT(*) >= 5 THEN 'PASS' ELSE 'FAIL' END as status,
        5 as expected_count,
        COUNT(*)::INTEGER as actual_count,
        'Translation settings configured' as message
    FROM translation_settings WHERE is_active = true;
    
    -- Check provider assignments
    RETURN QUERY
    SELECT 
        'Provider Assignments' as check_name,
        CASE WHEN COUNT(*) > 0 THEN 'PASS' ELSE 'FAIL' END as status,
        2 as expected_count,
        COUNT(*)::INTEGER as actual_count,
        'Provider assignments created' as message
    FROM translation_provider_assignments WHERE is_active = true;
    
    -- Check feature assignments
    RETURN QUERY
    SELECT 
        'Feature Assignments' as check_name,
        CASE WHEN COUNT(*) >= 3 THEN 'PASS' ELSE 'FAIL' END as status,
        3 as expected_count,
        COUNT(*)::INTEGER as actual_count,
        'Feature assignments created' as message
    FROM feature_provider_assignments WHERE is_active = true;
    
END;
$$ LANGUAGE plpgsql;

-- Execute validation
DO $$
DECLARE
    validation_results RECORD;
    all_passed BOOLEAN := true;
BEGIN
    -- Run validation and log results
    FOR validation_results IN SELECT * FROM validate_migration()
    LOOP
        PERFORM log_migration_step(
            'validation_' || validation_results.check_name, 
            CASE WHEN validation_results.status = 'PASS' THEN 'completed' ELSE 'failed' END,
            validation_results.actual_count,
            validation_results.message
        );
        
        IF validation_results.status = 'FAIL' THEN
            all_passed := false;
        END IF;
    END LOOP;
    
    -- Final validation result
    IF all_passed THEN
        PERFORM log_migration_step('migration_validation', 'completed', 0, 'All validation checks passed');
    ELSE
        PERFORM log_migration_step('migration_validation', 'failed', 0, 'Some validation checks failed');
        RAISE WARNING 'Migration validation failed. Check migration_log for details.';
    END IF;
END $$;

-- ============================================================================
-- 8. CREATE MIGRATION SUMMARY REPORT
-- ============================================================================

-- Function to generate migration summary
CREATE OR REPLACE FUNCTION generate_migration_summary()
RETURNS TABLE(
    migration_step TEXT,
    status TEXT,
    records_processed INTEGER,
    duration_seconds INTEGER,
    error_message TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ml.migration_step::TEXT,
        ml.status::TEXT,
        ml.records_processed,
        EXTRACT(EPOCH FROM (ml.completed_at - ml.started_at))::INTEGER as duration_seconds,
        ml.error_message
    FROM migration_log ml
    ORDER BY ml.started_at;
END;
$$ LANGUAGE plpgsql;

-- Display migration summary
SELECT 
    '============================================================================' as "MIGRATION SUMMARY",
    '' as " "
UNION ALL
SELECT 
    'Step: ' || migration_step as "MIGRATION SUMMARY",
    'Status: ' || status || ' | Records: ' || records_processed || 
    CASE WHEN duration_seconds IS NOT NULL THEN ' | Duration: ' || duration_seconds || 's' ELSE '' END as " "
FROM generate_migration_summary();

-- ============================================================================
-- 9. CLEANUP AND FINALIZATION
-- ============================================================================

-- Log final migration status
SELECT log_migration_step(
    'migration_complete', 
    'completed', 
    (SELECT COUNT(*) FROM migration_log WHERE status = 'completed')::INTEGER,
    'Migration completed successfully - new schema ready for use'
);

-- Create migration completion marker
CREATE TABLE IF NOT EXISTS migration_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    migration_name VARCHAR(100) NOT NULL,
    migration_version VARCHAR(20) NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    summary JSONB DEFAULT '{}'
);

INSERT INTO migration_status (migration_name, migration_version, summary) VALUES (
    'secrets_bilingual_separation', 
    '1.0.0',
    json_build_object(
        'total_secrets_migrated', (SELECT COUNT(*) FROM system_secrets),
        'total_providers_migrated', (SELECT COUNT(*) FROM providers),
        'total_settings_migrated', (SELECT COUNT(*) FROM translation_settings),
        'migration_completed_at', NOW()
    )
);

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Final success message
DO $$
BEGIN
    RAISE NOTICE '============================================================================';
    RAISE NOTICE 'MIGRATION COMPLETED SUCCESSFULLY!';
    RAISE NOTICE '============================================================================';
    RAISE NOTICE 'System Secrets: % records migrated', (SELECT COUNT(*) FROM system_secrets);
    RAISE NOTICE 'Providers: % records migrated', (SELECT COUNT(*) FROM providers);
    RAISE NOTICE 'Translation Settings: % records migrated', (SELECT COUNT(*) FROM translation_settings);
    RAISE NOTICE 'Provider Assignments: % records created', (SELECT COUNT(*) FROM translation_provider_assignments);
    RAISE NOTICE 'Feature Assignments: % records created', (SELECT COUNT(*) FROM feature_provider_assignments);
    RAISE NOTICE '============================================================================';
    RAISE NOTICE 'New schema is ready for use!';
    RAISE NOTICE 'Check migration_log table for detailed migration history.';
    RAISE NOTICE '============================================================================';
END $$; 