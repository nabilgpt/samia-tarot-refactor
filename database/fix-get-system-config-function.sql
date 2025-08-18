-- Fix get_system_config_value Function
-- This script ensures the function works correctly with the current schema

-- Step 1: Drop existing function if it exists
DROP FUNCTION IF EXISTS get_system_config_value(text);
DROP FUNCTION IF EXISTS get_system_config_value(varchar);

-- Step 2: Create the correct function that works with our schema
CREATE OR REPLACE FUNCTION get_system_config_value(p_config_key text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    config_value text;
BEGIN
    -- Get configuration value from system_configurations table
    SELECT 
        CASE 
            WHEN is_encrypted AND config_value_encrypted IS NOT NULL THEN config_value_encrypted
            ELSE config_value_plain
        END
    INTO config_value
    FROM system_configurations
    WHERE config_key = p_config_key
      AND is_active = true;
    
    -- Return the value (NULL if not found)
    RETURN config_value;
END;
$$;

-- Step 3: Test the function with OPENAI_API_KEY
SELECT get_system_config_value('OPENAI_API_KEY') as test_result;

-- Step 4: Grant necessary permissions
GRANT EXECUTE ON FUNCTION get_system_config_value(text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_system_config_value(text) TO service_role;

-- Step 5: Success message
SELECT 'get_system_config_value function fixed successfully!' as result; 