-- =====================================================
-- ZODIAC AUDIO WORD TIMINGS SCHEMA
-- =====================================================
-- Add word-level timing support for perfect audio-text synchronization

-- Add word_timings columns to daily_zodiac table
ALTER TABLE daily_zodiac 
ADD COLUMN IF NOT EXISTS word_timings_ar JSONB,
ADD COLUMN IF NOT EXISTS word_timings_en JSONB;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_daily_zodiac_word_timings_ar ON daily_zodiac USING GIN (word_timings_ar);
CREATE INDEX IF NOT EXISTS idx_daily_zodiac_word_timings_en ON daily_zodiac USING GIN (word_timings_en);

-- Add comments for documentation
COMMENT ON COLUMN daily_zodiac.word_timings_ar IS 'Arabic word-level timing data for audio-text synchronization in format: [{"word": "كلمة", "start": 0.0, "end": 0.6}]';
COMMENT ON COLUMN daily_zodiac.word_timings_en IS 'English word-level timing data for audio-text synchronization in format: [{"word": "word", "start": 0.0, "end": 0.4}]';

-- Update RLS policies to include new columns
DROP POLICY IF EXISTS "daily_zodiac_select_policy" ON daily_zodiac;
CREATE POLICY "daily_zodiac_select_policy" ON daily_zodiac
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "daily_zodiac_insert_policy" ON daily_zodiac;
CREATE POLICY "daily_zodiac_insert_policy" ON daily_zodiac
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL AND (
            EXISTS (
                SELECT 1 FROM profiles 
                WHERE id = auth.uid() 
                AND role IN ('super_admin', 'admin')
            )
        )
    );

DROP POLICY IF EXISTS "daily_zodiac_update_policy" ON daily_zodiac;
CREATE POLICY "daily_zodiac_update_policy" ON daily_zodiac
    FOR UPDATE USING (
        auth.uid() IS NOT NULL AND (
            EXISTS (
                SELECT 1 FROM profiles 
                WHERE id = auth.uid() 
                AND role IN ('super_admin', 'admin')
            )
        )
    );

-- Create function to validate word timings JSON structure
CREATE OR REPLACE FUNCTION validate_word_timings(timings JSONB)
RETURNS BOOLEAN AS $$
BEGIN
    -- Check if it's an array
    IF jsonb_typeof(timings) != 'array' THEN
        RETURN FALSE;
    END IF;
    
    -- Check each timing object has required fields
    FOR i IN 0..jsonb_array_length(timings) - 1 LOOP
        IF NOT (
            timings->i ? 'word' AND
            timings->i ? 'start' AND
            timings->i ? 'end' AND
            jsonb_typeof(timings->i->'word') = 'string' AND
            jsonb_typeof(timings->i->'start') = 'number' AND
            jsonb_typeof(timings->i->'end') = 'number'
        ) THEN
            RETURN FALSE;
        END IF;
    END LOOP;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Add check constraints for word timings validation
ALTER TABLE daily_zodiac 
ADD CONSTRAINT check_word_timings_ar_format 
CHECK (word_timings_ar IS NULL OR validate_word_timings(word_timings_ar));

ALTER TABLE daily_zodiac 
ADD CONSTRAINT check_word_timings_en_format 
CHECK (word_timings_en IS NULL OR validate_word_timings(word_timings_en));

-- Create view for zodiac readings with timing metadata
CREATE OR REPLACE VIEW zodiac_readings_with_timings AS
SELECT 
    id,
    zodiac_sign,
    date,
    text_ar,
    text_en,
    audio_ar_url,
    audio_en_url,
    word_timings_ar,
    word_timings_en,
    voice_provider,
    generated_at,
    updated_at,
    -- Timing metadata
    CASE 
        WHEN word_timings_ar IS NOT NULL THEN jsonb_array_length(word_timings_ar)
        ELSE NULL 
    END AS ar_word_count,
    CASE 
        WHEN word_timings_en IS NOT NULL THEN jsonb_array_length(word_timings_en)
        ELSE NULL 
    END AS en_word_count,
    CASE 
        WHEN word_timings_ar IS NOT NULL AND jsonb_array_length(word_timings_ar) > 0 THEN
            (word_timings_ar->-1->>'end')::NUMERIC
        ELSE NULL 
    END AS ar_total_duration,
    CASE 
        WHEN word_timings_en IS NOT NULL AND jsonb_array_length(word_timings_en) > 0 THEN
            (word_timings_en->-1->>'end')::NUMERIC
        ELSE NULL 
    END AS en_total_duration
FROM daily_zodiac;

-- Grant permissions
GRANT SELECT ON zodiac_readings_with_timings TO authenticated;
GRANT ALL ON zodiac_readings_with_timings TO service_role;

-- Add audit logging for word timings updates
CREATE OR REPLACE FUNCTION log_word_timings_update()
RETURNS TRIGGER AS $$
BEGIN
    -- Log when word timings are added or updated
    IF (OLD.word_timings_ar IS DISTINCT FROM NEW.word_timings_ar) OR 
       (OLD.word_timings_en IS DISTINCT FROM NEW.word_timings_en) THEN
        
        INSERT INTO audit_logs (
            event_type,
            table_name,
            record_id,
            performed_by,
            event_data
        ) VALUES (
            'word_timings_updated',
            'daily_zodiac',
            NEW.id,
            auth.uid(),
            jsonb_build_object(
                'zodiac_sign', NEW.zodiac_sign,
                'date', NEW.date,
                'ar_timings_updated', (OLD.word_timings_ar IS DISTINCT FROM NEW.word_timings_ar),
                'en_timings_updated', (OLD.word_timings_en IS DISTINCT FROM NEW.word_timings_en),
                'ar_word_count', CASE WHEN NEW.word_timings_ar IS NOT NULL THEN jsonb_array_length(NEW.word_timings_ar) ELSE NULL END,
                'en_word_count', CASE WHEN NEW.word_timings_en IS NOT NULL THEN jsonb_array_length(NEW.word_timings_en) ELSE NULL END
            )
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for word timings audit
DROP TRIGGER IF EXISTS trigger_word_timings_audit ON daily_zodiac;
CREATE TRIGGER trigger_word_timings_audit
    AFTER UPDATE ON daily_zodiac
    FOR EACH ROW
    EXECUTE FUNCTION log_word_timings_update();

-- Create function to get word timing at specific time
CREATE OR REPLACE FUNCTION get_word_at_time(
    timings JSONB,
    target_time NUMERIC
)
RETURNS JSONB AS $$
DECLARE
    timing JSONB;
BEGIN
    -- Find the word that should be playing at target_time
    FOR timing IN SELECT * FROM jsonb_array_elements(timings)
    LOOP
        IF (timing->>'start')::NUMERIC <= target_time AND 
           (timing->>'end')::NUMERIC > target_time THEN
            RETURN timing;
        END IF;
    END LOOP;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create function to get progress percentage at specific time
CREATE OR REPLACE FUNCTION get_timing_progress(
    timings JSONB,
    target_time NUMERIC
)
RETURNS NUMERIC AS $$
DECLARE
    total_duration NUMERIC;
    word_count INTEGER;
    current_word_index INTEGER := 0;
    timing JSONB;
BEGIN
    IF timings IS NULL OR jsonb_array_length(timings) = 0 THEN
        RETURN 0;
    END IF;
    
    word_count := jsonb_array_length(timings);
    total_duration := (timings->-1->>'end')::NUMERIC;
    
    -- Find current word index
    FOR timing IN SELECT * FROM jsonb_array_elements(timings)
    LOOP
        IF (timing->>'start')::NUMERIC <= target_time AND 
           (timing->>'end')::NUMERIC > target_time THEN
            EXIT;
        END IF;
        current_word_index := current_word_index + 1;
    END LOOP;
    
    -- Return progress as percentage
    RETURN ROUND((current_word_index::NUMERIC / word_count::NUMERIC) * 100, 2);
END;
$$ LANGUAGE plpgsql;

-- Insert initial documentation
INSERT INTO system_configurations (
    config_key,
    config_value_plain,
    config_category,
    config_subcategory,
    description,
    is_encrypted,
    created_by
) VALUES (
    'ZODIAC_WORD_TIMING_ENABLED',
    'true',
    'ai_services',
    'zodiac_system',
    'Enable word-level timing for perfect audio-text synchronization in zodiac readings',
    false,
    (SELECT id FROM profiles WHERE role = 'super_admin' LIMIT 1)
) ON CONFLICT (config_key) DO UPDATE SET
    config_value_plain = EXCLUDED.config_value_plain,
    updated_at = CURRENT_TIMESTAMP;

-- Success message
SELECT 'Word timings schema for zodiac audio-text sync created successfully! ✅' AS status;
