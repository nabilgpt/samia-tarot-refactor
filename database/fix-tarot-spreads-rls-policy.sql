-- ===============================================
-- 🔧 TAROT SPREADS RLS POLICY FIX
-- ===============================================
-- Fix: Allow admin/super_admin to UPDATE/DELETE any spread
-- Problem: Current policy only allows owners to modify spreads
-- Solution: Add admin/super_admin bypass to all policies

-- 🗑️ Drop existing restrictive policies (if any)
DROP POLICY IF EXISTS "Users can only update own spreads" ON tarot_spreads;
DROP POLICY IF EXISTS "Users can only delete own spreads" ON tarot_spreads;
DROP POLICY IF EXISTS "Owners can update spreads" ON tarot_spreads;
DROP POLICY IF EXISTS "Owners can delete spreads" ON tarot_spreads;
DROP POLICY IF EXISTS "Allow owners to update spreads" ON tarot_spreads;
DROP POLICY IF EXISTS "Allow owners to delete spreads" ON tarot_spreads;

-- 🔒 Enable RLS on tarot_spreads (if not already enabled)
ALTER TABLE tarot_spreads ENABLE ROW LEVEL SECURITY;

-- 👁️ SELECT Policy: Allow all authenticated users to view active spreads
CREATE POLICY "Allow users to view active spreads" ON tarot_spreads
    FOR SELECT USING (
        auth.role() = 'authenticated' 
        AND is_active = true
    );

-- ✏️ INSERT Policy: Allow authenticated users to create spreads
CREATE POLICY "Allow authenticated users to create spreads" ON tarot_spreads
    FOR INSERT WITH CHECK (
        auth.role() = 'authenticated'
        AND created_by = auth.uid()
    );

-- 🔄 UPDATE Policy: Allow owners OR admin/super_admin to update
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

-- 🗑️ DELETE Policy: Allow owners OR admin/super_admin to delete (soft delete)
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

-- 🔧 Ensure proper permissions for the table
GRANT ALL ON tarot_spreads TO authenticated;
GRANT ALL ON tarot_spreads TO service_role;

-- 📊 Test queries to validate the policies work
-- Note: These are for manual testing in Supabase SQL Editor

/*
-- Test 1: Update as admin/super_admin (should work)
UPDATE tarot_spreads 
SET is_active = false 
WHERE id = 'f20007ff-2715-4237-8c67-9eb0965e51a6';

-- Test 2: Check if admin role is detected properly
SELECT 
    auth.uid() as current_user_id,
    (SELECT role FROM profiles WHERE id = auth.uid()) as current_user_role,
    EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
          AND role IN ('admin', 'super_admin')
          AND is_active = true
    ) as has_admin_access;

-- Test 3: Check spread ownership vs admin access
SELECT 
    ts.id,
    ts.name,
    ts.created_by,
    ts.is_active,
    (ts.created_by = auth.uid()) as is_owner,
    (EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
          AND role IN ('admin', 'super_admin')
          AND is_active = true
    )) as has_admin_access,
    (ts.created_by = auth.uid() OR EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
          AND role IN ('admin', 'super_admin')
          AND is_active = true
    )) as can_modify
FROM tarot_spreads ts
WHERE ts.id = 'f20007ff-2715-4237-8c67-9eb0965e51a6';
*/

-- ✅ Policy fix completed
-- The RLS policies now allow:
-- 1. All authenticated users to view active spreads
-- 2. Users to create spreads (with proper ownership)
-- 3. Owners OR admin/super_admin to update spreads
-- 4. Owners OR admin/super_admin to delete spreads 