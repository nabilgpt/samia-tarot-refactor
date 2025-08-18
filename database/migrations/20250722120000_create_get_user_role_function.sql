-- ============================================================================
-- CRITICAL FIX: Add missing public.get_user_role(uuid) function
-- This function is essential for Row Level Security (RLS) policies.
-- ============================================================================

-- Drop the function if it exists with a different signature to avoid conflicts
DROP FUNCTION IF EXISTS public.get_user_role(uuid);

-- Create the function to get a user's role by their ID (UUID)
CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID)
RETURNS TEXT AS $$
BEGIN
  RETURN (
    SELECT role 
    FROM public.profiles 
    WHERE id = user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_role(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role(UUID) TO service_role;


-- Log migration completion
-- You would typically have a migrations table for this
-- INSERT INTO public.migrations (name) VALUES ('20250722120000_create_get_user_role_function');

SELECT 'CRITICAL FIX: public.get_user_role(uuid) function created successfully.' as result;

-- --- END OF MIGRATION --- 