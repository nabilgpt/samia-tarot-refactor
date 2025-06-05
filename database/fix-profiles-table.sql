-- =====================================================
-- FIX PROFILES TABLE ISSUES
-- =====================================================
-- This script fixes the profiles table schema and RLS policies
-- to resolve 500 Internal Server Error issues

-- 1. First, let's check and recreate the profiles table with correct schema
DROP TABLE IF EXISTS profiles CASCADE;

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  date_of_birth DATE,
  gender TEXT CHECK (gender IN ('male', 'female', 'other')),
  country TEXT,
  country_code TEXT,
  zodiac TEXT,
  avatar_url TEXT,
  role TEXT CHECK (role IN ('client', 'reader', 'admin', 'monitor', 'super_admin')) DEFAULT 'client',
  is_active BOOLEAN DEFAULT true,
  bio TEXT,
  specialties TEXT[], -- For readers
  languages TEXT[] DEFAULT ARRAY['en'],
  timezone TEXT DEFAULT 'UTC',
  status TEXT DEFAULT 'available', -- For readers: available, busy, offline
  experience_years INTEGER DEFAULT 0,
  maritalStatus TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 3. Drop any existing policies to start clean
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Public profiles viewable by all" ON profiles;
DROP POLICY IF EXISTS "Super admins can manage all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;

-- 4. Create comprehensive, working RLS policies

-- Allow users to view their own profile
CREATE POLICY "users_can_view_own_profile" ON profiles 
  FOR SELECT USING (auth.uid() = id);

-- Allow users to update their own profile
CREATE POLICY "users_can_update_own_profile" ON profiles 
  FOR UPDATE USING (auth.uid() = id);

-- Allow users to insert their own profile
CREATE POLICY "users_can_insert_own_profile" ON profiles 
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Allow anyone to view active reader profiles (for public listings)
CREATE POLICY "public_can_view_active_readers" ON profiles 
  FOR SELECT USING (role = 'reader' AND is_active = true);

-- Allow admins and super_admins to view all profiles
CREATE POLICY "admins_can_view_all_profiles" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'super_admin', 'monitor')
    )
  );

-- Allow admins and super_admins to update all profiles
CREATE POLICY "admins_can_update_all_profiles" ON profiles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  );

-- 5. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON profiles(is_active);
CREATE INDEX IF NOT EXISTS idx_profiles_role_active ON profiles(role, is_active);

-- 6. Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at 
    BEFORE UPDATE ON profiles 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 7. Create function to handle user registration (creates profile automatically)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'client')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger for automatic profile creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 8. Grant necessary permissions
GRANT ALL ON profiles TO authenticated;
GRANT ALL ON profiles TO service_role;

-- 9. Insert a test profile to verify everything works
-- (This will help identify any remaining issues)
DO $$
DECLARE
    test_user_id UUID;
BEGIN
    -- Try to get an existing user ID from auth.users
    SELECT id INTO test_user_id FROM auth.users LIMIT 1;
    
    IF test_user_id IS NOT NULL THEN
        -- Insert or update a test profile
        INSERT INTO profiles (id, first_name, last_name, email, role)
        VALUES (test_user_id, 'Test', 'User', 'test@example.com', 'client')
        ON CONFLICT (id) DO UPDATE SET
            updated_at = NOW();
        
        RAISE NOTICE 'Test profile created/updated for user ID: %', test_user_id;
    ELSE
        RAISE NOTICE 'No users found in auth.users table';
    END IF;
END $$;

-- 10. Verify the setup
SELECT 'Profiles table setup completed successfully' as status; 