-- =================================================
-- SAMIA TAROT PHASE 4: DYNAMIC LANGUAGE INFRASTRUCTURE
-- Foundation for unlimited multilingual support
-- =================================================
-- Zero-downtime language addition with automatic schema generation
-- Preserves all existing Arabic/English functionality
-- =================================================

BEGIN;

-- =================================================
-- 1. DYNAMIC LANGUAGES MANAGEMENT TABLE
-- =================================================

-- Core table to track all enabled languages
CREATE TABLE IF NOT EXISTS dynamic_languages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    language_code VARCHAR(5) NOT NULL UNIQUE,
    language_name_en VARCHAR(100) NOT NULL,
    language_name_native VARCHAR(100) NOT NULL,
    flag_emoji VARCHAR(10),
    is_rtl BOOLEAN DEFAULT FALSE,
    is_enabled BOOLEAN DEFAULT TRUE,
    is_primary BOOLEAN DEFAULT FALSE, -- Primary language for the platform
    sort_order INTEGER DEFAULT 0,
    date_format VARCHAR(50) DEFAULT 'YYYY-MM-DD',
    time_format VARCHAR(50) DEFAULT 'HH:mm',
    currency_format VARCHAR(20) DEFAULT '$#,##0.00',
    number_format VARCHAR(20) DEFAULT '#,##0.00',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES profiles(id),
    updated_by UUID REFERENCES profiles(id),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Insert existing languages (Arabic and English)
INSERT INTO dynamic_languages (
    language_code, language_name_en, language_name_native, 
    flag_emoji, is_rtl, is_enabled, is_primary, sort_order
) VALUES 
    ('ar', 'Arabic', 'العربية', '🇸🇾', TRUE, TRUE, FALSE, 1),
    ('en', 'English', 'English', '🇺🇸', FALSE, TRUE, TRUE, 2)
ON CONFLICT (language_code) DO UPDATE SET
    language_name_en = EXCLUDED.language_name_en,
    language_name_native = EXCLUDED.language_name_native,
    flag_emoji = EXCLUDED.flag_emoji,
    is_rtl = EXCLUDED.is_rtl,
    updated_at = NOW();

-- =================================================
-- 2. MULTILINGUAL FIELD REGISTRY
-- =================================================

-- Track which tables and fields support multilingual content
CREATE TABLE IF NOT EXISTS multilingual_field_registry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name VARCHAR(100) NOT NULL,
    field_name VARCHAR(100) NOT NULL, -- Base field name (without language suffix)
    field_type VARCHAR(50) NOT NULL, -- 'text', 'varchar', 'jsonb'
    max_length INTEGER,
    is_required BOOLEAN DEFAULT FALSE,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb,
    UNIQUE(table_name, field_name)
);

-- Register existing multilingual fields
INSERT INTO multilingual_field_registry (table_name, field_name, field_type, max_length, is_required, description) VALUES
    ('spreads', 'name', 'varchar', 255, TRUE, 'Spread name in multiple languages'),
    ('spreads', 'description', 'text', NULL, TRUE, 'Spread description in multiple languages'),
    ('spreads', 'question', 'text', NULL, FALSE, 'Default question for spread'),
    ('spread_categories', 'name', 'varchar', 255, TRUE, 'Category name in multiple languages'),
    ('spread_categories', 'description', 'text', NULL, TRUE, 'Category description in multiple languages'),
    ('tarot_decks', 'name', 'varchar', 255, TRUE, 'Deck name in multiple languages'),
    ('tarot_decks', 'description', 'text', NULL, TRUE, 'Deck description in multiple languages'),
    ('tarot_cards', 'name', 'varchar', 255, TRUE, 'Card name in multiple languages'),
    ('tarot_cards', 'description', 'text', NULL, TRUE, 'Card description in multiple languages'),
    ('tarot_cards', 'meaning_upright', 'text', NULL, TRUE, 'Upright meaning in multiple languages'),
    ('tarot_cards', 'meaning_reversed', 'text', NULL, TRUE, 'Reversed meaning in multiple languages'),
    ('spread_cards', 'position_name', 'varchar', 255, TRUE, 'Position name in multiple languages'),
    ('spread_cards', 'position_description', 'text', NULL, FALSE, 'Position description in multiple languages'),
    ('services', 'name', 'varchar', 255, TRUE, 'Service name in multiple languages'),
    ('services', 'description', 'text', NULL, TRUE, 'Service description in multiple languages')
ON CONFLICT (table_name, field_name) DO UPDATE SET
    field_type = EXCLUDED.field_type,
    max_length = EXCLUDED.max_length,
    is_required = EXCLUDED.is_required,
    description = EXCLUDED.description,
    updated_at = NOW();

-- =================================================
-- 3. DYNAMIC COLUMN CREATION FUNCTIONS
-- =================================================

-- Function to create language-specific columns for a new language
CREATE OR REPLACE FUNCTION create_language_columns(target_language_code VARCHAR(5))
RETURNS JSONB AS $$
DECLARE
    field_record RECORD;
    sql_statement TEXT;
    results JSONB := '{"created_columns": [], "errors": []}';
    column_name VARCHAR(100);
    column_exists BOOLEAN;
BEGIN
    -- Validate language code
    IF NOT EXISTS (SELECT 1 FROM dynamic_languages WHERE language_code = target_language_code AND is_enabled = TRUE) THEN
        results := jsonb_set(results, '{errors}', results->'errors' || jsonb_build_array('Language code not found or not enabled'));
        RETURN results;
    END IF;

    -- Loop through all registered multilingual fields
    FOR field_record IN 
        SELECT table_name, field_name, field_type, max_length, is_required
        FROM multilingual_field_registry
    LOOP
        column_name := field_record.field_name || '_' || target_language_code;
        
        -- Check if column already exists
        SELECT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = field_record.table_name 
            AND column_name = column_name
        ) INTO column_exists;
        
        IF NOT column_exists THEN
            -- Build SQL statement based on field type
            CASE field_record.field_type
                WHEN 'varchar' THEN
                    sql_statement := format('ALTER TABLE %I ADD COLUMN %I VARCHAR(%s)', 
                        field_record.table_name, column_name, COALESCE(field_record.max_length::text, '255'));
                WHEN 'text' THEN
                    sql_statement := format('ALTER TABLE %I ADD COLUMN %I TEXT', 
                        field_record.table_name, column_name);
                WHEN 'jsonb' THEN
                    sql_statement := format('ALTER TABLE %I ADD COLUMN %I JSONB DEFAULT ''{}''::jsonb', 
                        field_record.table_name, column_name);
                ELSE
                    sql_statement := format('ALTER TABLE %I ADD COLUMN %I TEXT', 
                        field_record.table_name, column_name);
            END CASE;
            
            -- Execute the SQL
            BEGIN
                EXECUTE sql_statement;
                results := jsonb_set(results, '{created_columns}', 
                    results->'created_columns' || jsonb_build_array(
                        jsonb_build_object(
                            'table', field_record.table_name,
                            'column', column_name,
                            'type', field_record.field_type
                        )
                    )
                );
            EXCEPTION WHEN OTHERS THEN
                results := jsonb_set(results, '{errors}', 
                    results->'errors' || jsonb_build_array(
                        format('Error creating column %s.%s: %s', field_record.table_name, column_name, SQLERRM)
                    )
                );
            END;
        END IF;
    END LOOP;
    
    RETURN results;
END;
$$ LANGUAGE plpgsql;

-- =================================================
-- 4. MULTILINGUAL DATA MANAGEMENT FUNCTIONS
-- =================================================

-- Function to get all available languages
CREATE OR REPLACE FUNCTION get_available_languages(include_disabled BOOLEAN DEFAULT FALSE)
RETURNS TABLE (
    language_code VARCHAR(5),
    language_name_en VARCHAR(100),
    language_name_native VARCHAR(100),
    flag_emoji VARCHAR(10),
    is_rtl BOOLEAN,
    is_enabled BOOLEAN,
    is_primary BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        dl.language_code,
        dl.language_name_en,
        dl.language_name_native,
        dl.flag_emoji,
        dl.is_rtl,
        dl.is_enabled,
        dl.is_primary
    FROM dynamic_languages dl
    WHERE dl.is_enabled = TRUE OR include_disabled = TRUE
    ORDER BY dl.sort_order, dl.language_name_en;
END;
$$ LANGUAGE plpgsql;

-- Function to get localized content for any language
CREATE OR REPLACE FUNCTION get_localized_content(
    table_name TEXT,
    record_id UUID,
    field_name TEXT,
    preferred_language VARCHAR(5) DEFAULT 'en',
    fallback_language VARCHAR(5) DEFAULT 'en'
)
RETURNS TEXT AS $$
DECLARE
    result TEXT;
    sql_query TEXT;
    primary_field TEXT := field_name || '_' || preferred_language;
    fallback_field TEXT := field_name || '_' || fallback_language;
BEGIN
    -- Build and execute dynamic query
    sql_query := format('SELECT %I FROM %I WHERE id = $1', primary_field, table_name);
    
    BEGIN
        EXECUTE sql_query INTO result USING record_id;
        
        -- If primary language content is empty, try fallback
        IF result IS NULL OR result = '' THEN
            sql_query := format('SELECT %I FROM %I WHERE id = $1', fallback_field, table_name);
            EXECUTE sql_query INTO result USING record_id;
        END IF;
        
    EXCEPTION WHEN OTHERS THEN
        result := NULL;
    END;
    
    RETURN COALESCE(result, '');
END;
$$ LANGUAGE plpgsql;

-- =================================================
-- 5. TRANSLATION PROVIDER MANAGEMENT
-- =================================================

-- Table to manage multiple translation providers
CREATE TABLE IF NOT EXISTS translation_providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_code VARCHAR(50) NOT NULL UNIQUE,
    provider_name VARCHAR(100) NOT NULL,
    api_endpoint TEXT,
    is_enabled BOOLEAN DEFAULT TRUE,
    priority INTEGER DEFAULT 0, -- Higher priority used first
    supported_languages TEXT[], -- Array of language codes
    rate_limit_per_minute INTEGER DEFAULT 100,
    monthly_quota INTEGER,
    usage_this_month INTEGER DEFAULT 0,
    configuration JSONB DEFAULT '{}'::jsonb, -- Provider-specific settings
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Insert default translation providers
INSERT INTO translation_providers (
    provider_code, provider_name, is_enabled, priority, 
    supported_languages, rate_limit_per_minute, configuration
) VALUES 
    ('openai', 'OpenAI GPT Translation', TRUE, 100, 
     ARRAY['ar', 'en', 'fr', 'tr', 'fa', 'es', 'de', 'ru', 'zh'], 
     60, '{"model": "gpt-4", "temperature": 0.3}'::jsonb),
    ('google', 'Google Translate', TRUE, 90, 
     ARRAY['ar', 'en', 'fr', 'tr', 'fa', 'es', 'de', 'ru', 'zh'], 
     100, '{"format": "text"}'::jsonb),
    ('deepl', 'DeepL Translation', TRUE, 95, 
     ARRAY['ar', 'en', 'fr', 'tr', 'es', 'de', 'ru'], 
     80, '{"formality": "default"}'::jsonb)
ON CONFLICT (provider_code) DO UPDATE SET
    provider_name = EXCLUDED.provider_name,
    priority = EXCLUDED.priority,
    supported_languages = EXCLUDED.supported_languages,
    updated_at = NOW();

-- =================================================
-- 6. TTS PROVIDER MANAGEMENT
-- =================================================

-- Table to manage Text-to-Speech providers
CREATE TABLE IF NOT EXISTS tts_providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_code VARCHAR(50) NOT NULL UNIQUE,
    provider_name VARCHAR(100) NOT NULL,
    is_enabled BOOLEAN DEFAULT TRUE,
    priority INTEGER DEFAULT 0,
    supported_languages TEXT[], -- Array of language codes
    voice_configurations JSONB DEFAULT '{}'::jsonb, -- Language-specific voice settings
    rate_limit_per_minute INTEGER DEFAULT 50,
    monthly_quota INTEGER,
    usage_this_month INTEGER DEFAULT 0,
    configuration JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Insert default TTS providers
INSERT INTO tts_providers (
    provider_code, provider_name, is_enabled, priority, 
    supported_languages, voice_configurations
) VALUES 
    ('elevenlabs', 'ElevenLabs TTS', TRUE, 100, 
     ARRAY['ar', 'en', 'fr', 'tr', 'es', 'de'], 
     '{"ar": {"voice_id": "arabic_voice", "stability": 0.8, "similarity_boost": 0.8}, "en": {"voice_id": "english_voice", "stability": 0.8, "similarity_boost": 0.8}, "fr": {"voice_id": "french_voice", "stability": 0.8, "similarity_boost": 0.8}}'::jsonb),
    ('google_cloud', 'Google Cloud TTS', TRUE, 90, 
     ARRAY['ar', 'en', 'fr', 'tr', 'fa', 'es', 'de', 'ru', 'zh'], 
     '{"ar": {"name": "ar-XA-Wavenet-A", "language_code": "ar-XA"}, "en": {"name": "en-US-Wavenet-D", "language_code": "en-US"}, "fr": {"name": "fr-FR-Wavenet-A", "language_code": "fr-FR"}}'::jsonb),
    ('azure', 'Azure Cognitive Services TTS', TRUE, 85, 
     ARRAY['ar', 'en', 'fr', 'tr', 'es', 'de'], 
     '{"ar": {"voice": "ar-SA-ZariyahNeural", "style": "cheerful"}, "en": {"voice": "en-US-AriaNeural", "style": "cheerful"}, "fr": {"voice": "fr-FR-DeniseNeural", "style": "cheerful"}}'::jsonb)
ON CONFLICT (provider_code) DO UPDATE SET
    provider_name = EXCLUDED.provider_name,
    priority = EXCLUDED.priority,
    supported_languages = EXCLUDED.supported_languages,
    voice_configurations = EXCLUDED.voice_configurations,
    updated_at = NOW();

-- =================================================
-- 7. LANGUAGE ADDITION AUTOMATION
-- =================================================

-- Complete function to add a new language with automatic setup
CREATE OR REPLACE FUNCTION add_new_language(
    new_language_code VARCHAR(5),
    language_name_en VARCHAR(100),
    language_name_native VARCHAR(100),
    flag_emoji VARCHAR(10) DEFAULT '',
    is_rtl BOOLEAN DEFAULT FALSE,
    auto_create_columns BOOLEAN DEFAULT TRUE
)
RETURNS JSONB AS $$
DECLARE
    result JSONB := '{"success": false, "message": "", "details": {}}';
    column_creation_result JSONB;
BEGIN
    -- Validate inputs
    IF LENGTH(new_language_code) < 2 OR LENGTH(new_language_code) > 5 THEN
        result := jsonb_set(result, '{message}', '"Language code must be 2-5 characters"');
        RETURN result;
    END IF;
    
    -- Check if language already exists
    IF EXISTS (SELECT 1 FROM dynamic_languages WHERE language_code = new_language_code) THEN
        result := jsonb_set(result, '{message}', '"Language already exists"');
        RETURN result;
    END IF;
    
    -- Insert the new language
    INSERT INTO dynamic_languages (
        language_code, language_name_en, language_name_native, 
        flag_emoji, is_rtl, is_enabled, sort_order
    ) VALUES (
        new_language_code, language_name_en, language_name_native,
        flag_emoji, is_rtl, TRUE, 
        (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM dynamic_languages)
    );
    
    -- Create database columns if requested
    IF auto_create_columns THEN
        column_creation_result := create_language_columns(new_language_code);
        result := jsonb_set(result, '{details}', column_creation_result);
    END IF;
    
    -- Update user preferred_language constraint
    BEGIN
        EXECUTE format('ALTER TABLE profiles DROP CONSTRAINT IF EXISTS valid_language');
        EXECUTE format('ALTER TABLE profiles ADD CONSTRAINT valid_language CHECK (preferred_language IN (%s))', 
            (SELECT string_agg('''' || language_code || '''', ', ') FROM dynamic_languages WHERE is_enabled = TRUE)
        );
    EXCEPTION WHEN OTHERS THEN
        -- Log the error but don't fail the entire operation
        result := jsonb_set(result, '{warnings}', ARRAY[format('Could not update constraint: %s', SQLERRM)]);
    END;
    
    result := jsonb_set(result, '{success}', 'true');
    result := jsonb_set(result, '{message}', '"Language added successfully"');
    result := jsonb_set(result, '{language_code}', to_jsonb(new_language_code));
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- =================================================
-- 8. PERFORMANCE INDEXES
-- =================================================

-- Indexes for optimal performance
CREATE INDEX IF NOT EXISTS idx_dynamic_languages_enabled ON dynamic_languages(is_enabled, sort_order);
CREATE INDEX IF NOT EXISTS idx_dynamic_languages_code ON dynamic_languages(language_code) WHERE is_enabled = TRUE;
CREATE INDEX IF NOT EXISTS idx_multilingual_registry_table ON multilingual_field_registry(table_name);
CREATE INDEX IF NOT EXISTS idx_translation_providers_enabled ON translation_providers(is_enabled, priority DESC);
CREATE INDEX IF NOT EXISTS idx_tts_providers_enabled ON tts_providers(is_enabled, priority DESC);

-- =================================================
-- 9. UPDATE PROFILES CONSTRAINT
-- =================================================

-- Update profiles table to support all enabled languages
DO $$
DECLARE
    language_constraint TEXT;
BEGIN
    -- Get all enabled language codes for constraint
    SELECT string_agg('''' || language_code || '''', ', ') 
    INTO language_constraint
    FROM dynamic_languages 
    WHERE is_enabled = TRUE;
    
    -- Update constraint
    EXECUTE format('ALTER TABLE profiles DROP CONSTRAINT IF EXISTS valid_language');
    EXECUTE format('ALTER TABLE profiles ADD CONSTRAINT valid_language CHECK (preferred_language IN (%s))', 
        language_constraint);
END $$;

-- =================================================
-- 10. MIGRATION LOGGING
-- =================================================

-- Log this migration
INSERT INTO audit_logs (
    table_name, action, new_data, metadata, created_at
) VALUES (
    'dynamic_languages', 
    'phase4_infrastructure_setup',
    '{"tables_created": ["dynamic_languages", "multilingual_field_registry", "translation_providers", "tts_providers"]}',
    '{
        "phase": "4",
        "component": "dynamic_language_infrastructure",
        "description": "Foundation for unlimited multilingual support established"
    }'::jsonb,
    NOW()
);

COMMIT;

-- =================================================
-- COMPLETION MESSAGE
-- =================================================

DO $$
BEGIN
    RAISE NOTICE '🚀 SAMIA TAROT PHASE 4: DYNAMIC LANGUAGE INFRASTRUCTURE COMPLETE!';
    RAISE NOTICE '✅ Dynamic languages management table created';
    RAISE NOTICE '✅ Multilingual field registry established';
    RAISE NOTICE '✅ Translation providers configured (OpenAI, Google, DeepL)';
    RAISE NOTICE '✅ TTS providers configured (ElevenLabs, Google Cloud, Azure)';
    RAISE NOTICE '✅ Automatic column creation functions ready';
    RAISE NOTICE '✅ Language addition automation complete';
    RAISE NOTICE '🌍 Ready to add languages: French, Turkish, Farsi, Spanish, German, and more!';
    RAISE NOTICE '📊 Use: SELECT add_new_language(''fr'', ''French'', ''Français'', ''🇫🇷'', false);';
END $$; 