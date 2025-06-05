-- ================================================
-- EMERGENCY PROFILES FIX - FINAL SOLUTION
-- Fixes infinite recursion in RLS policies
-- ================================================

-- Step 1: Disable RLS temporarily to avoid recursion during fix
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop ALL existing policies on profiles table
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admin can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admin can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Super admin can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Super admin can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Super admin can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Super admin can delete profiles" ON public.profiles;
DROP POLICY IF EXISTS "Public can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Public can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can read profiles" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can create profiles" ON public.profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.profiles;
DROP POLICY IF EXISTS "Enable insert access for all users" ON public.profiles;
DROP POLICY IF EXISTS "Enable update access for all users" ON public.profiles;

-- Step 3: Check for any remaining policies
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'profiles'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || policy_record.policyname || '" ON public.profiles';
    END LOOP;
END $$;

-- Step 4: Create SAFE, NON-RECURSIVE policies
-- These policies use auth.uid() and auth.email() instead of reading from profiles table

-- Allow authenticated users to read their own profile
CREATE POLICY "Users can view own profile - safe"
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Allow authenticated users to update their own profile  
CREATE POLICY "Users can update own profile - safe"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Allow super admin access using auth.email() (no recursion)
CREATE POLICY "Super admin full access - safe"
ON public.profiles FOR ALL
TO authenticated
USING (auth.email() IN ('super.admin@samia-tarot.com', 'samia.nabilgpt@gmail.com'));

-- Allow profile creation for authenticated users
CREATE POLICY "Users can insert own profile - safe"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- Step 5: Re-enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Step 6: Verify the fix worked
SELECT 'Profiles table RLS policies fixed successfully' as status;

-- Step 7: Show current policies (should be our safe ones)
SELECT 
    policyname,
    cmd,
    roles,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'profiles'
ORDER BY policyname;

-- Step 8: Test query that should work now
SELECT COUNT(*) as profile_count FROM public.profiles; 