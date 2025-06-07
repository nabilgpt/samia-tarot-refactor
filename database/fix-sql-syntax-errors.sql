-- ============================================================================
-- SQL SYNTAX ERROR FIXES
-- Fixes: parameter name conflicts, role column issues, function syntax
-- ============================================================================

-- Fix 1: Drop and recreate the problematic function with correct syntax
DROP FUNCTION IF EXISTS get_user_profile(UUID);

-- Create get_user_profile function with unique parameter names
CREATE OR REPLACE FUNCTION get_user_profile(p_user_id UUID DEFAULT auth.uid())
RETURNS TABLE (
    id UUID,
    user_id UUID,
    email VARCHAR,
    first_name VARCHAR,
    last_name VARCHAR,
    role VARCHAR,
    phone VARCHAR,
    avatar_url TEXT,
    is_active BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.user_id,
        p.email,
        p.first_name,
        p.last_name,
        p.role,
        p.phone,
        p.avatar_url,
        p.is_active,
        p.created_at,
        p.updated_at
    FROM profiles p
    WHERE p.id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix 2: Drop and recreate check_user_role function with correct syntax
DROP FUNCTION IF EXISTS check_user_role(UUID, TEXT);

CREATE OR REPLACE FUNCTION check_user_role(
    p_user_id UUID,
    p_required_role TEXT DEFAULT 'client'
)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = p_user_id 
        AND role = p_required_role
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix 3: Ensure profiles table has all required columns (safer approach)
DO $$ 
BEGIN
    -- Add role column if it doesn't exist (with error handling)
    BEGIN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'profiles' 
            AND column_name = 'role'
        ) THEN
            ALTER TABLE public.profiles ADD COLUMN role VARCHAR(50) DEFAULT 'client';
            
            -- Update existing records
            UPDATE public.profiles SET role = 'client' WHERE role IS NULL;
            
            -- Make role not null after populating
            ALTER TABLE public.profiles ALTER COLUMN role SET NOT NULL;
            
            -- Add index
            CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
            
            RAISE NOTICE 'Added role column to profiles table';
        ELSE
            RAISE NOTICE 'Role column already exists in profiles table';
        END IF;
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Error adding role column: %', SQLERRM;
    END;

    -- Add user_id column if it doesn't exist (with error handling)
    BEGIN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'profiles' 
            AND column_name = 'user_id'
        ) THEN
            ALTER TABLE public.profiles ADD COLUMN user_id UUID;
            
            -- Update existing records to have user_id = id for backward compatibility
            UPDATE public.profiles SET user_id = id WHERE user_id IS NULL;
            
            -- Add unique constraint
            ALTER TABLE public.profiles ADD CONSTRAINT profiles_user_id_unique UNIQUE (user_id);
            
            -- Add index
            CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
            
            RAISE NOTICE 'Added user_id column to profiles table';
        ELSE
            RAISE NOTICE 'User_id column already exists in profiles table';
        END IF;
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Error adding user_id column: %', SQLERRM;
    END;

    -- Ensure updated_at column exists
    BEGIN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'profiles' 
            AND column_name = 'updated_at'
        ) THEN
            ALTER TABLE public.profiles ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
            RAISE NOTICE 'Added updated_at column to profiles table';
        END IF;
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Error adding updated_at column: %', SQLERRM;
    END;

END $$;

-- Fix 4: Create or replace updated_at trigger function (safer version)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Fix 5: Add updated_at trigger to profiles table safely
DO $$
BEGIN
    -- Drop trigger if it exists, then recreate
    DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
    
    -- Check if updated_at column exists before creating trigger
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'updated_at'
    ) THEN
        CREATE TRIGGER update_profiles_updated_at 
            BEFORE UPDATE ON public.profiles 
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        RAISE NOTICE 'Created updated_at trigger for profiles table';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error creating trigger: %', SQLERRM;
END $$;

-- Fix 6: Safe RLS policies (only create if table exists and has required columns)
DO $$
BEGIN
    -- Enable RLS on profiles if not already enabled
    ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
    
    -- Drop existing policies to avoid conflicts
    DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
    DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
    DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.profiles;
    
    -- Create basic read policy
    CREATE POLICY "Enable read access for authenticated users" ON public.profiles
        FOR SELECT USING (auth.uid() = id);
    
    -- Create update policy
    CREATE POLICY "Users can update their own profile" ON public.profiles
        FOR UPDATE USING (auth.uid() = id);
        
    RAISE NOTICE 'Created RLS policies for profiles table';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error creating RLS policies: %', SQLERRM;
END $$;

-- Fix 7: Create a simple function to check if user has role (without complex dependencies)
CREATE OR REPLACE FUNCTION user_has_role(p_user_id UUID, p_role TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    user_role TEXT;
BEGIN
    SELECT role INTO user_role FROM public.profiles WHERE id = p_user_id;
    RETURN COALESCE(user_role, 'client') = p_role;
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix 8: Create minimal analytics tables (without role dependencies)
CREATE TABLE IF NOT EXISTS daily_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date_recorded DATE NOT NULL DEFAULT CURRENT_DATE,
    total_sessions INTEGER DEFAULT 0,
    total_revenue DECIMAL(10,2) DEFAULT 0,
    total_users INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_daily_analytics_date UNIQUE(date_recorded)
);

CREATE TABLE IF NOT EXISTS reader_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reader_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    date_recorded DATE NOT NULL DEFAULT CURRENT_DATE,
    sessions_completed INTEGER DEFAULT 0,
    revenue_earned DECIMAL(10,2) DEFAULT 0,
    average_rating DECIMAL(3,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_reader_analytics_date UNIQUE(reader_id, date_recorded)
);

CREATE TABLE IF NOT EXISTS business_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(15,2) NOT NULL,
    metric_date DATE NOT NULL DEFAULT CURRENT_DATE,
    metric_category VARCHAR(50) DEFAULT 'general',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_business_metric UNIQUE(metric_name, metric_date)
);

CREATE TABLE IF NOT EXISTS revenue_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date_recorded DATE NOT NULL DEFAULT CURRENT_DATE,
    gross_revenue DECIMAL(10,2) DEFAULT 0,
    platform_commission DECIMAL(10,2) DEFAULT 0,
    reader_earnings DECIMAL(10,2) DEFAULT 0,
    payment_processing_fees DECIMAL(10,2) DEFAULT 0,
    net_revenue DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_revenue_analytics_date UNIQUE(date_recorded)
);

-- Add indexes for analytics tables
CREATE INDEX IF NOT EXISTS idx_daily_analytics_date ON daily_analytics(date_recorded);
CREATE INDEX IF NOT EXISTS idx_reader_analytics_reader_date ON reader_analytics(reader_id, date_recorded);
CREATE INDEX IF NOT EXISTS idx_business_analytics_category_date ON business_analytics(metric_category, metric_date);
CREATE INDEX IF NOT EXISTS idx_revenue_analytics_date ON revenue_analytics(date_recorded);

-- Enable RLS on analytics tables
ALTER TABLE daily_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE reader_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE revenue_analytics ENABLE ROW LEVEL SECURITY;

-- Create simple RLS policies for analytics
CREATE POLICY "Anyone can view daily analytics" ON daily_analytics FOR SELECT USING (true);
CREATE POLICY "Readers can view their own analytics" ON reader_analytics FOR SELECT USING (auth.uid() = reader_id);
CREATE POLICY "Authenticated users can view business analytics" ON business_analytics FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can view revenue analytics" ON revenue_analytics FOR SELECT USING (auth.uid() IS NOT NULL);

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Check profiles table structure
SELECT 
    'profiles_structure' as check_type,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'profiles' 
AND column_name IN ('id', 'user_id', 'role', 'email', 'first_name', 'last_name', 'updated_at')
ORDER BY column_name;

-- Check if analytics tables were created
SELECT 
    'analytics_tables' as check_type,
    table_name,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = t.table_name) 
         THEN '✅ Created' 
         ELSE '❌ Missing' 
    END as status
FROM (VALUES 
    ('daily_analytics'),
    ('reader_analytics'),
    ('business_analytics'),
    ('revenue_analytics')
) AS t(table_name);

-- Check if functions were created
SELECT 
    'functions' as check_type,
    proname as function_name,
    '✅ Created' as status
FROM pg_proc 
WHERE proname IN ('get_user_profile', 'check_user_role', 'user_has_role', 'update_updated_at_column')
ORDER BY proname; 