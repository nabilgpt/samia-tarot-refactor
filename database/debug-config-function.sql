-- Debug get_system_config_value Function
-- This script tests the function directly and checks what's happening

-- Step 1: Test the function directly with OPENAI_API_KEY
SELECT get_system_config_value('OPENAI_API_KEY') as function_result;

-- Step 2: Check if the record exists in the table
SELECT 
    config_key,
    config_category,
    config_subcategory,
    config_value_plain,
    config_value_encrypted,
    is_encrypted,
    is_active
FROM system_configurations 
WHERE config_key = 'OPENAI_API_KEY';

-- Step 3: Check the function definition
SELECT 
    proname as function_name,
    prosrc as function_source
FROM pg_proc 
WHERE proname = 'get_system_config_value';

-- Step 4: Test with different parameter format
SELECT get_system_config_value('openai_api_key') as function_result_lowercase;

-- Step 5: Check all OpenAI related configs
SELECT 
    config_key,
    config_category,
    config_subcategory,
    LENGTH(config_value_plain) as value_length,
    is_active
FROM system_configurations 
WHERE config_key LIKE '%OPENAI%' OR config_key LIKE '%openai%'; 