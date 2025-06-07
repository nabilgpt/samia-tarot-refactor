-- ============================================================================
-- PROFILES TABLE STRUCTURE FIX
-- Addresses: missing role column, missing user_id column, SQL syntax errors
-- ============================================================================

-- Fix 1: Add missing columns to profiles table
DO $$ 
BEGIN
    -- Add user_id column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'user_id'
    ) THEN
        ALTER TABLE profiles ADD COLUMN user_id UUID;
        
        -- Update existing records to have user_id = id for backward compatibility
        UPDATE profiles SET user_id = id WHERE user_id IS NULL;
        
        -- Make user_id unique after populating
        ALTER TABLE profiles ADD CONSTRAINT profiles_user_id_unique UNIQUE (user_id);
        
        -- Add index
        CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
        
        RAISE NOTICE 'Added user_id column to profiles table';
    ELSE
        RAISE NOTICE 'user_id column already exists in profiles table';
    END IF;
    
    -- Add role column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'role'
    ) THEN
        ALTER TABLE profiles ADD COLUMN role VARCHAR(50) DEFAULT 'client';
        
        -- Update existing records
        UPDATE profiles SET role = 'client' WHERE role IS NULL;
        
        -- Make role not null after populating
        ALTER TABLE profiles ALTER COLUMN role SET NOT NULL;
        
        -- Add index
        CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
        
        RAISE NOTICE 'Added role column to profiles table';
    ELSE
        RAISE NOTICE 'role column already exists in profiles table';
    END IF;
    
    -- Add other commonly needed columns if they don't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'email'
    ) THEN
        ALTER TABLE profiles ADD COLUMN email VARCHAR(255);
        CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
        RAISE NOTICE 'Added email column to profiles table';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'first_name'
    ) THEN
        ALTER TABLE profiles ADD COLUMN first_name VARCHAR(100);
        RAISE NOTICE 'Added first_name column to profiles table';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'last_name'
    ) THEN
        ALTER TABLE profiles ADD COLUMN last_name VARCHAR(100);
        RAISE NOTICE 'Added last_name column to profiles table';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'phone'
    ) THEN
        ALTER TABLE profiles ADD COLUMN phone VARCHAR(20);
        RAISE NOTICE 'Added phone column to profiles table';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'avatar_url'
    ) THEN
        ALTER TABLE profiles ADD COLUMN avatar_url TEXT;
        RAISE NOTICE 'Added avatar_url column to profiles table';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'is_active'
    ) THEN
        ALTER TABLE profiles ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
        UPDATE profiles SET is_active = TRUE WHERE is_active IS NULL;
        RAISE NOTICE 'Added is_active column to profiles table';
    END IF;

END $$;

-- Fix 2: Create reading_sessions table with proper syntax
CREATE TABLE IF NOT EXISTS reading_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    reader_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    tarot_spread_id UUID REFERENCES tarot_spreads(id),
    session_type VARCHAR(50) NOT NULL DEFAULT 'tarot_reading',
    session_status VARCHAR(50) NOT NULL DEFAULT 'scheduled',
    scheduled_at TIMESTAMP WITH TIME ZONE,
    started_at TIMESTAMP WITH TIME ZONE,
    ended_at TIMESTAMP WITH TIME ZONE,
    duration_minutes INTEGER,
    reading_data JSONB DEFAULT '{}'::jsonb,
    cards_drawn JSONB DEFAULT '[]'::jsonb,
    interpretation_notes TEXT,
    client_feedback TEXT,
    reader_notes TEXT,
    session_recording_url TEXT,
    payment_amount DECIMAL(10,2),
    payment_status VARCHAR(50) DEFAULT 'pending',
    payment_transaction_id TEXT,
    is_emergency BOOLEAN DEFAULT FALSE,
    emergency_details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for reading_sessions
CREATE INDEX IF NOT EXISTS idx_reading_sessions_reader_id ON reading_sessions(reader_id);
CREATE INDEX IF NOT EXISTS idx_reading_sessions_client_id ON reading_sessions(client_id);
CREATE INDEX IF NOT EXISTS idx_reading_sessions_session_status ON reading_sessions(session_status);
CREATE INDEX IF NOT EXISTS idx_reading_sessions_scheduled_at ON reading_sessions(scheduled_at);

-- Fix 3: Create updated_at trigger function with proper syntax
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to reading_sessions
DROP TRIGGER IF EXISTS update_reading_sessions_updated_at ON reading_sessions;
CREATE TRIGGER update_reading_sessions_updated_at 
    BEFORE UPDATE ON reading_sessions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add trigger to profiles
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at 
    BEFORE UPDATE ON profiles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Fix 4: Enable Row Level Security
ALTER TABLE reading_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Fix 5: Create simplified RLS policies that don't reference non-existent columns
DROP POLICY IF EXISTS "Users can view their own reading sessions" ON reading_sessions;
CREATE POLICY "Users can view their own reading sessions" ON reading_sessions
    FOR SELECT USING (
        auth.uid() = reader_id OR 
        auth.uid() = client_id OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'super_admin')
        )
    );

DROP POLICY IF EXISTS "Readers can create reading sessions" ON reading_sessions;
CREATE POLICY "Readers can create reading sessions" ON reading_sessions
    FOR INSERT WITH CHECK (
        auth.uid() = reader_id
    );

DROP POLICY IF EXISTS "Participants can update their reading sessions" ON reading_sessions;
CREATE POLICY "Participants can update their reading sessions" ON reading_sessions
    FOR UPDATE USING (
        auth.uid() = reader_id OR 
        auth.uid() = client_id
    );

-- Fix 6: Create basic profiles policies
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
CREATE POLICY "Users can view their own profile" ON profiles
    FOR SELECT USING (
        auth.uid() = id OR
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid() 
            AND p.role IN ('admin', 'super_admin')
        )
    );

DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
CREATE POLICY "Users can update their own profile" ON profiles
    FOR UPDATE USING (
        auth.uid() = id OR
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid() 
            AND p.role IN ('admin', 'super_admin')
        )
    );

-- Fix 7: Create helper function to check user roles (with proper parameter defaults)
CREATE OR REPLACE FUNCTION check_user_role(
    user_id UUID,
    required_role TEXT DEFAULT 'client'
)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = user_id 
        AND role = required_role
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix 8: Create function to get user profile safely
CREATE OR REPLACE FUNCTION get_user_profile(user_id UUID DEFAULT auth.uid())
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
    WHERE p.id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix 9: Create tarot_spread_positions table
CREATE TABLE IF NOT EXISTS tarot_spread_positions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    spread_id UUID NOT NULL REFERENCES tarot_spreads(id) ON DELETE CASCADE,
    position_number INTEGER NOT NULL,
    position_name VARCHAR(100) NOT NULL,
    position_description TEXT,
    position_meaning TEXT,
    x_coordinate DECIMAL(5,2) DEFAULT 0,
    y_coordinate DECIMAL(5,2) DEFAULT 0,
    rotation_angle DECIMAL(5,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_spread_position UNIQUE(spread_id, position_number)
);

-- Add indexes for tarot_spread_positions
CREATE INDEX IF NOT EXISTS idx_tarot_spread_positions_spread_id ON tarot_spread_positions(spread_id);
CREATE INDEX IF NOT EXISTS idx_tarot_spread_positions_position_number ON tarot_spread_positions(position_number);

-- Add trigger for tarot_spread_positions
DROP TRIGGER IF EXISTS update_tarot_spread_positions_updated_at ON tarot_spread_positions;
CREATE TRIGGER update_tarot_spread_positions_updated_at 
    BEFORE UPDATE ON tarot_spread_positions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS for tarot_spread_positions
ALTER TABLE tarot_spread_positions ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for tarot_spread_positions
DROP POLICY IF EXISTS "Everyone can view tarot spread positions" ON tarot_spread_positions;
CREATE POLICY "Everyone can view tarot spread positions" ON tarot_spread_positions
    FOR SELECT USING (TRUE);

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check if columns were added successfully
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name IN ('user_id', 'role', 'email', 'first_name', 'last_name', 'phone', 'avatar_url', 'is_active')
ORDER BY column_name;

-- Check if tables exist
SELECT 
    table_name,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = t.table_name) 
         THEN '✅ Exists' 
         ELSE '❌ Missing' 
    END as status
FROM (VALUES 
    ('profiles'),
    ('reading_sessions'),
    ('tarot_spread_positions')
) AS t(table_name);

-- Test the helper functions
SELECT 'Helper functions test' as test_name,
       CASE WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'check_user_role') 
            THEN '✅ check_user_role created' 
            ELSE '❌ check_user_role missing' 
       END as status
UNION ALL
SELECT 'get_user_profile function',
       CASE WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_user_profile') 
            THEN '✅ get_user_profile created' 
            ELSE '❌ get_user_profile missing' 
       END as status; 