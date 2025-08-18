-- MIGRATION SCRIPT FOR DYNAMIC AI PROVIDER CONFIGURATION KEYS
-- This script adds a dedicated `configuration_key` to the `ai_providers` table.
-- This key will be used to link a provider directly to its secret in the `system_secrets` table,
-- enabling a dropdown selection in the UI and preventing manual entry errors.

-- Step 1: Add the configuration_key column, allowing NULLs initially to handle existing rows.
ALTER TABLE public.ai_providers
ADD COLUMN configuration_key VARCHAR(100);

-- Step 2: Update existing rows to generate a default configuration_key based on the provider's name.
-- This logic mirrors the key generation logic in the backend API for consistency.
UPDATE public.ai_providers
SET configuration_key = LOWER(REPLACE(name, ' ', '_')) || '_api_key'
WHERE configuration_key IS NULL;

-- Step 3: Now that all rows are populated, enforce the NOT NULL constraint.
ALTER TABLE public.ai_providers
ALTER COLUMN configuration_key SET NOT NULL;

-- Step 4: Add a UNIQUE constraint to prevent duplicate configuration keys.
ALTER TABLE public.ai_providers
ADD CONSTRAINT ai_providers_configuration_key_key UNIQUE (configuration_key);

-- Step 5: Add comments for clarity on the new column.
COMMENT ON COLUMN public.ai_providers.configuration_key IS 'The unique key used to identify the secret for this provider in the system_secrets table (e.g., openai_api_key).'; 