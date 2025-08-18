-- =====================================================
-- DAILY ZODIAC (ABRAJ) SYSTEM DATABASE SCHEMA
-- =====================================================
-- Complete database setup for daily horoscope system
-- with bilingual support and TTS integration

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- MAIN DAILY ZODIAC TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS daily_zodiac (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    zodiac_sign VARCHAR(20) NOT NULL CHECK (zodiac_sign IN (
        'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
        'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'
    )),
    date DATE NOT NULL,
    text_ar TEXT NOT NULL,
    text_en TEXT NOT NULL,
    audio_ar_url TEXT,
    audio_en_url TEXT,
    voice_provider VARCHAR(20) DEFAULT 'openai' CHECK (voice_provider IN ('openai', 'elevenlabs')),
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique daily readings per sign
    UNIQUE(zodiac_sign, date)
);

-- =====================================================
-- ZODIAC SYSTEM CONFIGURATION TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS zodiac_system_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    config_key VARCHAR(50) UNIQUE NOT NULL,
    config_value TEXT NOT NULL,
    description TEXT,
    updated_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default configuration
INSERT INTO zodiac_system_config (config_key, config_value, description) VALUES
    ('default_tts_provider', 'openai', 'Default TTS provider for zodiac audio generation'),
    ('openai_voice_ar', 'nova', 'OpenAI voice for Arabic zodiac readings'),
    ('openai_voice_en', 'alloy', 'OpenAI voice for English zodiac readings'),
    ('elevenlabs_voice_ar', 'samia_ar', 'ElevenLabs voice ID for Arabic'),
    ('elevenlabs_voice_en', 'samia_en', 'ElevenLabs voice ID for English'),
    ('auto_generation_enabled', 'true', 'Enable automatic daily generation at midnight'),
    ('generation_timezone', 'UTC', 'Timezone for daily generation'),
    ('samia_tone_prompt', 'You are Samia, a mystical and wise tarot reader. Speak with warmth, insight, and gentle guidance. Use cosmic and spiritual language that feels authentic and caring.', 'AI prompt for Samia''s personality in horoscopes')
ON CONFLICT (config_key) DO NOTHING;

-- =====================================================
-- ZODIAC GENERATION LOGS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS zodiac_generation_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    generation_date DATE NOT NULL,
    generation_type VARCHAR(20) NOT NULL CHECK (generation_type IN ('automatic', 'manual', 'admin_override')),
    total_signs_generated INTEGER DEFAULT 0,
    successful_generations INTEGER DEFAULT 0,
    failed_generations INTEGER DEFAULT 0,
    tts_provider_used VARCHAR(20),
    error_details JSONB,
    generated_by UUID REFERENCES auth.users(id),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'partial'))
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Primary lookup indexes
CREATE INDEX IF NOT EXISTS idx_daily_zodiac_date ON daily_zodiac(date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_zodiac_sign ON daily_zodiac(zodiac_sign);
CREATE INDEX IF NOT EXISTS idx_daily_zodiac_sign_date ON daily_zodiac(zodiac_sign, date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_zodiac_created_at ON daily_zodiac(created_at DESC);

-- Config and logs indexes
CREATE INDEX IF NOT EXISTS idx_zodiac_config_key ON zodiac_system_config(config_key);
CREATE INDEX IF NOT EXISTS idx_zodiac_logs_date ON zodiac_generation_logs(generation_date DESC);
CREATE INDEX IF NOT EXISTS idx_zodiac_logs_status ON zodiac_generation_logs(status);

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE daily_zodiac ENABLE ROW LEVEL SECURITY;
ALTER TABLE zodiac_system_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE zodiac_generation_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "daily_zodiac_public_read" ON daily_zodiac;
DROP POLICY IF EXISTS "daily_zodiac_admin_write" ON daily_zodiac;
DROP POLICY IF EXISTS "daily_zodiac_system_write" ON daily_zodiac;
DROP POLICY IF EXISTS "daily_zodiac_system_update" ON daily_zodiac;
DROP POLICY IF EXISTS "zodiac_config_admin_access" ON zodiac_system_config;
DROP POLICY IF EXISTS "zodiac_config_system_access" ON zodiac_system_config;
DROP POLICY IF EXISTS "zodiac_logs_admin_access" ON zodiac_generation_logs;
DROP POLICY IF EXISTS "zodiac_logs_system_access" ON zodiac_generation_logs;

-- Public read access for daily zodiac (all users can read today's horoscopes)
CREATE POLICY "daily_zodiac_public_read" ON daily_zodiac
    FOR SELECT USING (true);

-- Admin/Super Admin write access for daily zodiac
CREATE POLICY "daily_zodiac_admin_write" ON daily_zodiac
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'super_admin')
        )
    );

-- System write access for daily zodiac (for automated generation)
CREATE POLICY "daily_zodiac_system_write" ON daily_zodiac
    FOR INSERT WITH CHECK (true);

CREATE POLICY "daily_zodiac_system_update" ON daily_zodiac
    FOR UPDATE USING (true);

-- Admin/Super Admin access for system config
CREATE POLICY "zodiac_config_admin_access" ON zodiac_system_config
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'super_admin')
        )
    );

-- System access for config updates (for automated operations)
CREATE POLICY "zodiac_config_system_access" ON zodiac_system_config
    FOR ALL WITH CHECK (true);

-- Admin/Super Admin access for generation logs
CREATE POLICY "zodiac_logs_admin_access" ON zodiac_generation_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'super_admin')
        )
    );

-- System access for generation logs (for automated logging)
CREATE POLICY "zodiac_logs_system_access" ON zodiac_generation_logs
    FOR INSERT WITH CHECK (true);

-- =====================================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- =====================================================

-- Update timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to daily_zodiac table
CREATE TRIGGER update_daily_zodiac_updated_at 
    BEFORE UPDATE ON daily_zodiac 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to zodiac_system_config table
CREATE TRIGGER update_zodiac_config_updated_at 
    BEFORE UPDATE ON zodiac_system_config 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to get today's zodiac readings
CREATE OR REPLACE FUNCTION get_todays_zodiac_readings()
RETURNS TABLE (
    zodiac_sign VARCHAR(20),
    text_ar TEXT,
    text_en TEXT,
    audio_ar_url TEXT,
    audio_en_url TEXT,
    voice_provider VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        dz.zodiac_sign,
        dz.text_ar,
        dz.text_en,
        dz.audio_ar_url,
        dz.audio_en_url,
        dz.voice_provider,
        dz.created_at
    FROM daily_zodiac dz
    WHERE dz.date = CURRENT_DATE
    ORDER BY 
        CASE dz.zodiac_sign
            WHEN 'aries' THEN 1
            WHEN 'taurus' THEN 2
            WHEN 'gemini' THEN 3
            WHEN 'cancer' THEN 4
            WHEN 'leo' THEN 5
            WHEN 'virgo' THEN 6
            WHEN 'libra' THEN 7
            WHEN 'scorpio' THEN 8
            WHEN 'sagittarius' THEN 9
            WHEN 'capricorn' THEN 10
            WHEN 'aquarius' THEN 11
            WHEN 'pisces' THEN 12
        END;
END;
$$ LANGUAGE plpgsql;

-- Function to get system configuration
CREATE OR REPLACE FUNCTION get_zodiac_config(key_name VARCHAR(50))
RETURNS TEXT AS $$
DECLARE
    config_value TEXT;
BEGIN
    SELECT zsc.config_value INTO config_value
    FROM zodiac_system_config zsc
    WHERE zsc.config_key = key_name;
    
    RETURN config_value;
END;
$$ LANGUAGE plpgsql;

-- Function to update system configuration
CREATE OR REPLACE FUNCTION update_zodiac_config(
    key_name VARCHAR(50),
    new_value TEXT,
    user_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE zodiac_system_config 
    SET 
        config_value = new_value,
        updated_by = COALESCE(user_id, auth.uid()),
        updated_at = NOW()
    WHERE config_key = key_name;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- SAMPLE DATA FOR TESTING
-- =====================================================

-- Insert sample zodiac readings for today (for testing)
DO $$
DECLARE
    today_date DATE := CURRENT_DATE;
    zodiac_signs VARCHAR(20)[] := ARRAY['aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo', 'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'];
    sign VARCHAR(20);
BEGIN
    FOREACH sign IN ARRAY zodiac_signs
    LOOP
        INSERT INTO daily_zodiac (zodiac_sign, date, text_ar, text_en, voice_provider)
        VALUES (
            sign,
            today_date,
            'قراءة يومية تجريبية لبرج ' || sign || ' - اليوم يحمل لك طاقة إيجابية وفرص جديدة للنمو الشخصي والروحي.',
            'Sample daily reading for ' || sign || ' - Today brings positive energy and new opportunities for personal and spiritual growth.',
            'openai'
        )
        ON CONFLICT (zodiac_sign, date) DO NOTHING;
    END LOOP;
END $$;

-- =====================================================
-- GRANTS AND PERMISSIONS
-- =====================================================

-- Grant necessary permissions for the service role
GRANT ALL ON daily_zodiac TO service_role;
GRANT ALL ON zodiac_system_config TO service_role;
GRANT ALL ON zodiac_generation_logs TO service_role;

-- Grant read permissions for authenticated users
GRANT SELECT ON daily_zodiac TO authenticated;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION get_todays_zodiac_readings() TO authenticated;
GRANT EXECUTE ON FUNCTION get_zodiac_config(VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION update_zodiac_config(VARCHAR, TEXT, UUID) TO service_role;

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '✅ Daily Zodiac (Abraj) System database schema created successfully!';
    RAISE NOTICE '📊 Tables created: daily_zodiac, zodiac_system_config, zodiac_generation_logs';
    RAISE NOTICE '🔒 RLS policies applied for security';
    RAISE NOTICE '⚡ Indexes created for performance';
    RAISE NOTICE '🔧 Helper functions available';
    RAISE NOTICE '📝 Sample data inserted for testing';
END $$; 