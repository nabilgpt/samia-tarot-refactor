-- ================================================================
-- 🚨 FINAL RLS CLEANUP - COMPLETE POLICY RESET 
-- ================================================================
-- Execute this in Supabase Dashboard → SQL Editor
-- This will completely reset all tarot_spreads policies

-- 🧹 STEP 1: NUCLEAR CLEANUP - Remove ALL policies
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    -- Get all policies for tarot_spreads table
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'tarot_spreads' 
          AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON tarot_spreads', pol.policyname);
        RAISE NOTICE 'Dropped policy: %', pol.policyname;
    END LOOP;
END $$;

-- 🔒 STEP 2: Ensure RLS is enabled
ALTER TABLE tarot_spreads ENABLE ROW LEVEL SECURITY;

-- 🎯 STEP 3: Create SINGLE, CLEAN policies

-- SELECT Policy: Anyone can view active spreads
CREATE POLICY "tarot_spreads_select_policy" ON tarot_spreads
    FOR SELECT USING (
        is_active = true
    );

-- INSERT Policy: Authenticated users can create spreads
CREATE POLICY "tarot_spreads_insert_policy" ON tarot_spreads
    FOR INSERT WITH CHECK (
        auth.role() = 'authenticated'
        AND created_by = auth.uid()
    );

-- 🔥 THE CRITICAL UPDATE POLICY
CREATE POLICY "tarot_spreads_update_policy" ON tarot_spreads
    FOR UPDATE USING (
        -- Owner can update
        (created_by = auth.uid())
        OR
        -- Admin/Super Admin can update ANY spread
        (EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid()
              AND p.role IN ('admin', 'super_admin')
              AND p.is_active = true
        ))
    )
    WITH CHECK (
        -- Same condition for WITH CHECK
        (created_by = auth.uid())
        OR
        (EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid()
              AND p.role IN ('admin', 'super_admin')
              AND p.is_active = true
        ))
    );

-- 🗑️ THE CRITICAL DELETE POLICY (just in case)
CREATE POLICY "tarot_spreads_delete_policy" ON tarot_spreads
    FOR DELETE USING (
        -- Owner can delete
        (created_by = auth.uid())
        OR
        -- Admin/Super Admin can delete ANY spread
        (EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid()
              AND p.role IN ('admin', 'super_admin')
              AND p.is_active = true
        ))
    );

-- 🔧 Grant full permissions
GRANT ALL ON tarot_spreads TO authenticated;
GRANT ALL ON tarot_spreads TO service_role;

-- 📊 Verify the cleanup worked
SELECT 
    'Policy Cleanup Results:' as status,
    COUNT(*) as total_policies
FROM pg_policies 
WHERE tablename = 'tarot_spreads' 
  AND schemaname = 'public';

-- 🧪 Test the admin access again
SELECT 
    'Final Test:' as test_name,
    'c3922fea-329a-4d6e-800c-3e03c9fe341d' as user_id,
    (SELECT role FROM profiles WHERE id = 'c3922fea-329a-4d6e-800c-3e03c9fe341d') as user_role,
    (SELECT is_active FROM profiles WHERE id = 'c3922fea-329a-4d6e-800c-3e03c9fe341d') as user_active,
    EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = 'c3922fea-329a-4d6e-800c-3e03c9fe341d'
          AND p.role IN ('admin', 'super_admin')
          AND p.is_active = true
    ) as should_have_access;

-- ✅ Final verification
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    cmd,
    CASE WHEN LENGTH(qual) > 50 THEN LEFT(qual, 50) || '...' ELSE qual END as condition_preview
FROM pg_policies 
WHERE tablename = 'tarot_spreads' 
  AND schemaname = 'public'
ORDER BY cmd, policyname;

-- 🎉 CLEANUP COMPLETE!
-- Now try the frontend delete operation again! 