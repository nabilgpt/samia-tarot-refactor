-- ============================================================================
-- CHECK AND FIX OPENAI_API_KEY CONFIGURATION
-- ============================================================================
-- This script checks if OPENAI_API_KEY exists and adds it if missing

BEGIN;

-- Check if OPENAI_API_KEY configuration exists
DO $$ 
DECLARE
    config_count INTEGER;
BEGIN
    -- Count existing OPENAI_API_KEY configurations
    SELECT COUNT(*) INTO config_count 
    FROM system_configurations 
    WHERE config_key = 'OPENAI_API_KEY';
    
    IF config_count = 0 THEN
        RAISE NOTICE '⚠️ OPENAI_API_KEY configuration not found - adding it now';
        
        -- Insert OPENAI_API_KEY configuration
        INSERT INTO system_configurations (
            config_key, 
            config_category, 
            config_subcategory, 
            display_name, 
            description,
            data_type, 
            is_sensitive, 
            is_encrypted, 
            is_required, 
            access_level,
            config_value_plain, 
            default_value, 
            environment,
            is_active,
            created_at,
            updated_at
        ) VALUES (
            'OPENAI_API_KEY', 
            'ai_services', 
            'openai', 
            'OpenAI API Key', 
            'API key for OpenAI GPT models and services',
            'string', 
            true, 
            false, 
            true, 
            'super_admin',
            '', -- Empty value - user needs to set this in dashboard
            '', 
            'all',
            true,
            NOW(),
            NOW()
        );
        
        RAISE NOTICE '✅ OPENAI_API_KEY configuration added successfully';
    ELSE
        RAISE NOTICE '✅ OPENAI_API_KEY configuration already exists (% records found)', config_count;
    END IF;
    
    -- Check if OPENAI_ORG_ID exists too
    SELECT COUNT(*) INTO config_count 
    FROM system_configurations 
    WHERE config_key = 'OPENAI_ORG_ID';
    
    IF config_count = 0 THEN
        RAISE NOTICE '⚠️ OPENAI_ORG_ID configuration not found - adding it now';
        
        -- Insert OPENAI_ORG_ID configuration
        INSERT INTO system_configurations (
            config_key, 
            config_category, 
            config_subcategory, 
            display_name, 
            description,
            data_type, 
            is_sensitive, 
            is_encrypted, 
            is_required, 
            access_level,
            config_value_plain, 
            default_value, 
            environment,
            is_active,
            created_at,
            updated_at
        ) VALUES (
            'OPENAI_ORG_ID', 
            'ai_services', 
            'openai', 
            'OpenAI Organization ID', 
            'Organization ID for OpenAI API (optional)',
            'string', 
            true, 
            false, 
            false, 
            'super_admin',
            '', -- Empty value - user needs to set this in dashboard
            '', 
            'all',
            true,
            NOW(),
            NOW()
        );
        
        RAISE NOTICE '✅ OPENAI_ORG_ID configuration added successfully';
    ELSE
        RAISE NOTICE '✅ OPENAI_ORG_ID configuration already exists (% records found)', config_count;
    END IF;
END $$;

COMMIT;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '🎯 OPENAI CONFIGURATION CHECK COMPLETED';
    RAISE NOTICE '📋 Both OPENAI_API_KEY and OPENAI_ORG_ID configurations are now available';
    RAISE NOTICE '🔧 You can now set values in Super Admin Dashboard → System Secrets → AI Services';
    RAISE NOTICE '🚀 After setting values, test the configuration from the dashboard';
END $$; 