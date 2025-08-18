-- ============================================================================
-- CRITICAL FIX: Add missing public.execute_sql(text) function
-- This function is a core utility for running dynamic SQL from migration scripts.
-- ============================================================================

-- Drop the function if it exists to allow for parameter renaming.
DROP FUNCTION IF EXISTS public.execute_sql(text);

CREATE OR REPLACE FUNCTION public.execute_sql(sql_text TEXT)
RETURNS VOID AS $$
BEGIN
    EXECUTE sql_text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.execute_sql(TEXT) TO postgres;
GRANT EXECUTE ON FUNCTION public.execute_sql(TEXT) TO service_role;

COMMENT ON FUNCTION public.execute_sql(TEXT) IS 'A security-definer function to execute arbitrary SQL passed as text. Essential for migration scripts.'; 