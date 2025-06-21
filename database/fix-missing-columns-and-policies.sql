-- =============================================================================
-- FIX MISSING COLUMNS AND POLICIES - SAMIA TAROT
-- =============================================================================
-- This script fixes all the database issues mentioned:
-- 1. Missing columns (rating, role, is_active)
-- 2. RLS policy recursion issues
-- 3. Missing procedures/functions
-- =============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- 1. ADD MISSING COLUMNS
-- =============================================================================

-- Add rating column to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS rating NUMERIC(3,2) DEFAULT 5.00;

-- Add role column to profiles (if not exists)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS role VARCHAR(24) DEFAULT 'client';

-- Add is_active column to services
ALTER TABLE services 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- Add other commonly missing columns
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW();

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS phone VARCHAR(20);

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- =============================================================================
-- 2. FIX RLS POLICIES (Remove Recursive Policies)
-- =============================================================================

-- Temporarily disable RLS on profiles to fix recursion
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies on profiles
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Public profiles are viewable" ON profiles;
DROP POLICY IF EXISTS "Admin can manage profiles" ON profiles;
DROP POLICY IF EXISTS "Readers can view client profiles" ON profiles;

-- Re-enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create simple, non-recursive policies
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Public profiles viewable" ON profiles
  FOR SELECT USING (true);

CREATE POLICY "Admin full access" ON profiles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.raw_user_meta_data->>'role' IN ('admin', 'super_admin')
    )
  );

-- =============================================================================
-- 3. CREATE MISSING PROCEDURES/FUNCTIONS
-- =============================================================================

-- Create emergency call function
CREATE OR REPLACE FUNCTION create_emergency_call(
  p_user_id UUID,
  p_emergency_type VARCHAR DEFAULT 'general',
  p_description TEXT DEFAULT '',
  p_priority VARCHAR DEFAULT 'medium'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_call_id UUID;
  v_result JSON;
BEGIN
  -- Insert emergency call
  INSERT INTO emergency_calls (
    id,
    user_id,
    emergency_type,
    description,
    priority,
    status,
    created_at
  ) VALUES (
    gen_random_uuid(),
    p_user_id,
    p_emergency_type,
    p_description,
    p_priority,
    'pending',
    NOW()
  ) RETURNING id INTO v_call_id;

  -- Return result
  SELECT json_build_object(
    'success', true,
    'call_id', v_call_id,
    'message', 'Emergency call created successfully'
  ) INTO v_result;

  RETURN v_result;
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- Create emergency_calls table if not exists
CREATE TABLE IF NOT EXISTS emergency_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  emergency_type VARCHAR(50) DEFAULT 'general',
  description TEXT,
  priority VARCHAR(20) DEFAULT 'medium',
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES auth.users(id)
);

-- Enable RLS on emergency_calls
ALTER TABLE emergency_calls ENABLE ROW LEVEL SECURITY;

-- Create policies for emergency_calls
CREATE POLICY "Users can create emergency calls" ON emergency_calls
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own emergency calls" ON emergency_calls
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admin can manage emergency calls" ON emergency_calls
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.raw_user_meta_data->>'role' IN ('admin', 'super_admin')
    )
  );

-- =============================================================================
-- 4. CREATE MISSING INDEXES FOR PERFORMANCE
-- =============================================================================

-- Indexes for profiles
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_rating ON profiles(rating);
CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON profiles(is_active);

-- Indexes for services
CREATE INDEX IF NOT EXISTS idx_services_is_active ON services(is_active);

-- Indexes for emergency_calls
CREATE INDEX IF NOT EXISTS idx_emergency_calls_user_id ON emergency_calls(user_id);
CREATE INDEX IF NOT EXISTS idx_emergency_calls_status ON emergency_calls(status);
CREATE INDEX IF NOT EXISTS idx_emergency_calls_created_at ON emergency_calls(created_at);

-- =============================================================================
-- 5. UPDATE EXISTING DATA
-- =============================================================================

-- Set default roles for existing users
UPDATE profiles 
SET role = 'client' 
WHERE role IS NULL OR role = '';

-- Set default ratings for existing profiles
UPDATE profiles 
SET rating = 5.00 
WHERE rating IS NULL;

-- Set default is_active for existing profiles
UPDATE profiles 
SET is_active = TRUE 
WHERE is_active IS NULL;

-- Set default is_active for existing services
UPDATE services 
SET is_active = TRUE 
WHERE is_active IS NULL;

-- =============================================================================
-- 6. GRANT PERMISSIONS
-- =============================================================================

-- Grant permissions on profiles
GRANT ALL ON profiles TO authenticated;
GRANT ALL ON profiles TO anon;

-- Grant permissions on services
GRANT ALL ON services TO authenticated;
GRANT ALL ON services TO anon;

-- Grant permissions on emergency_calls
GRANT ALL ON emergency_calls TO authenticated;

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION create_emergency_call TO authenticated;

-- =============================================================================
-- 7. VERIFICATION QUERIES
-- =============================================================================

-- Verify columns exist
DO $$
BEGIN
  -- Check if rating column exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'rating'
  ) THEN
    RAISE EXCEPTION 'Rating column not added to profiles table';
  END IF;

  -- Check if role column exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'role'
  ) THEN
    RAISE EXCEPTION 'Role column not added to profiles table';
  END IF;

  -- Check if is_active column exists in services
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'services' AND column_name = 'is_active'
  ) THEN
    RAISE EXCEPTION 'is_active column not added to services table';
  END IF;

  RAISE NOTICE 'All required columns have been added successfully!';
END
$$;

-- =============================================================================
-- COMPLETION MESSAGE
-- =============================================================================

SELECT 
  'Database fixes completed successfully!' as status,
  'All missing columns added' as columns_status,
  'RLS policies fixed' as policies_status,
  'Emergency call function created' as functions_status,
  'Indexes created for performance' as indexes_status; 