-- ===============================================
-- 🚀 QUICK FIX: Tarot Spreads RLS Policy 
-- ===============================================
-- Execute this directly in Supabase Dashboard → SQL Editor
-- Problem: super_admin can't delete spreads (403 Forbidden)
-- Solution: Allow admin/super_admin bypass in RLS policies

-- 🗑️ Drop all existing policies (clean slate)
DROP POLICY IF EXISTS "Users can only update own spreads" ON tarot_spreads;
DROP POLICY IF EXISTS "Users can only delete own spreads" ON tarot_spreads;
DROP POLICY IF EXISTS "Owners can update spreads" ON tarot_spreads;
DROP POLICY IF EXISTS "Owners can delete spreads" ON tarot_spreads;
DROP POLICY IF EXISTS "Allow owners to update spreads" ON tarot_spreads;
DROP POLICY IF EXISTS "Allow owners to delete spreads" ON tarot_spreads;
DROP POLICY IF EXISTS "Allow delete for owners and admins" ON tarot_spreads;
DROP POLICY IF EXISTS "Allow update for owners and admins" ON tarot_spreads;

-- 🔒 Enable RLS (if not already enabled)
ALTER TABLE tarot_spreads ENABLE ROW LEVEL SECURITY;

-- ✅ CREATE THE CRITICAL UPDATE POLICY
CREATE POLICY "Allow owners and admins to update spreads" ON tarot_spreads
    FOR UPDATE USING (
        -- Owner can update their own spreads
        (created_by = auth.uid())
        OR
        -- Admin/Super Admin can update any spread
        (EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
              AND role IN ('admin', 'super_admin')
              AND is_active = true
        ))
    );

-- ✅ CREATE THE CRITICAL DELETE POLICY  
CREATE POLICY "Allow owners and admins to delete spreads" ON tarot_spreads
    FOR DELETE USING (
        -- Owner can delete their own spreads
        (created_by = auth.uid())
        OR
        -- Admin/Super Admin can delete any spread
        (EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
              AND role IN ('admin', 'super_admin')
              AND is_active = true
        ))
    );

-- 👁️ SELECT Policy: Allow viewing active spreads
CREATE POLICY "Allow users to view active spreads" ON tarot_spreads
    FOR SELECT USING (
        auth.role() = 'authenticated' 
        AND is_active = true
    );

-- ✏️ INSERT Policy: Allow creating spreads
CREATE POLICY "Allow authenticated users to create spreads" ON tarot_spreads
    FOR INSERT WITH CHECK (
        auth.role() = 'authenticated'
        AND created_by = auth.uid()
    );

-- 🔧 Grant necessary permissions
GRANT ALL ON tarot_spreads TO authenticated;
GRANT ALL ON tarot_spreads TO service_role;

-- 🧪 TEST QUERY: Check if admin access works
SELECT 
    'c3922fea-329a-4d6e-800c-3e03c9fe341d' as user_id,
    (SELECT role FROM profiles WHERE id = 'c3922fea-329a-4d6e-800c-3e03c9fe341d') as user_role,
    EXISTS (
        SELECT 1 FROM profiles
        WHERE id = 'c3922fea-329a-4d6e-800c-3e03c9fe341d'
          AND role IN ('admin', 'super_admin')
          AND is_active = true
    ) as has_admin_access;

-- ✅ DONE! The policies now allow admin/super_admin to modify any spread.
-- 🚀 Go back to frontend and try deleting a spread now! 