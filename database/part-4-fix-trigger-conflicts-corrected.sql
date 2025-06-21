-- ============================================================
-- PART 4: FIX TRIGGER CONFLICTS (CORRECTED)
-- Safe creation and update of triggers without conflicts
-- Fixed: ambiguous column reference error
-- ============================================================

-- ============================================================
-- FUNCTION TO CREATE TRIGGERS SAFELY (FIXED VERSION)
-- ============================================================
CREATE OR REPLACE FUNCTION create_trigger_if_not_exists(
    p_trigger_name TEXT,
    p_table_name TEXT,
    p_function_name TEXT
) RETURNS VOID AS $$
BEGIN
    -- Check if trigger exists, if so drop it first
    -- Use schema-qualified column names to avoid ambiguity
    IF EXISTS (
        SELECT 1 FROM information_schema.triggers 
        WHERE information_schema.triggers.trigger_name = p_trigger_name 
        AND information_schema.triggers.event_object_table = p_table_name
    ) THEN
        EXECUTE format('DROP TRIGGER %I ON %I', p_trigger_name, p_table_name);
        RAISE NOTICE 'Dropped existing trigger % from table %', p_trigger_name, p_table_name;
    END IF;
    
    -- Create the trigger
    EXECUTE format('
        CREATE TRIGGER %I
        BEFORE UPDATE ON %I
        FOR EACH ROW
        EXECUTE FUNCTION %I()', p_trigger_name, p_table_name, p_function_name);
        
    RAISE NOTICE 'Trigger % created/updated for table %', p_trigger_name, p_table_name;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- CREATE UPDATE TIMESTAMP FUNCTION IF NOT EXISTS
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- SAFELY CREATE ALL UPDATE TRIGGERS
-- ============================================================

-- Payment methods trigger (the one causing original conflict)
SELECT create_trigger_if_not_exists(
    'update_payment_methods_updated_at',
    'payment_methods',
    'update_updated_at_column'
);

-- Tarot system triggers
SELECT create_trigger_if_not_exists(
    'update_tarot_cards_updated_at',
    'tarot_cards',
    'update_updated_at_column'
);

SELECT create_trigger_if_not_exists(
    'update_tarot_readings_updated_at',
    'tarot_readings',
    'update_updated_at_column'
);

SELECT create_trigger_if_not_exists(
    'update_spread_positions_updated_at',
    'spread_positions',
    'update_updated_at_column'
);

-- Call system triggers
SELECT create_trigger_if_not_exists(
    'update_call_notifications_updated_at',
    'call_notifications',
    'update_updated_at_column'
);

SELECT create_trigger_if_not_exists(
    'update_reader_availability_updated_at',
    'reader_availability',
    'update_updated_at_column'
);

SELECT create_trigger_if_not_exists(
    'update_call_quality_metrics_updated_at',
    'call_quality_metrics',
    'update_updated_at_column'
);

-- AI system triggers
SELECT create_trigger_if_not_exists(
    'update_ai_analytics_updated_at',
    'ai_analytics',
    'update_updated_at_column'
);

SELECT create_trigger_if_not_exists(
    'update_user_enrollments_updated_at',
    'user_enrollments',
    'update_updated_at_column'
);

SELECT create_trigger_if_not_exists(
    'update_learning_progress_updated_at',
    'learning_progress',
    'update_updated_at_column'
);

-- ============================================================
-- CLEAN UP FUNCTION (no longer needed after execution)
-- ============================================================
DROP FUNCTION IF EXISTS create_trigger_if_not_exists(TEXT, TEXT, TEXT);

-- ============================================================
-- SUCCESS MESSAGE
-- ============================================================
SELECT 
    '✅ PART 4 COMPLETED: Trigger Conflicts Fixed (Corrected)' as status,
    'All update triggers created/updated safely without ambiguity errors' as result,
    timezone('utc'::text, now()) as completed_at; 