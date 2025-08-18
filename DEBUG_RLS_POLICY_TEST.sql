-- ================================================================
-- 🔍 DEBUG RLS POLICY TEST
-- ================================================================
-- Execute this in Supabase Dashboard → SQL Editor
-- This will help debug why RLS policies are failing

-- 🔍 STEP 1: Check current user authentication in Supabase context
SELECT 
  auth.uid() as current_user_id,
  auth.role() as current_role,
  auth.jwt() ->> 'email' as current_email,
  auth.jwt() ->> 'role' as jwt_role,
  current_setting('request.jwt.claims', true)::json ->> 'email' as jwt_claims_email;

-- 🔍 STEP 2: Test profile lookup with current authenticated user
SELECT 
  p.id,
  p.email,
  p.role,
  p.is_active,
  (auth.uid() = p.id) as is_current_user
FROM profiles p 
WHERE p.id = auth.uid();

-- 🔍 STEP 3: Test the specific UPDATE policy condition
SELECT 
  'f93998f5-41d2-4a3b-b61e-326f6144428b'::uuid as spread_id,
  (
    (created_by = auth.uid()) OR 
    (EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('admin', 'super_admin')
        AND p.is_active = true
    ))
  ) as can_update_spread
FROM tarot_spreads 
WHERE id = 'f93998f5-41d2-4a3b-b61e-326f6144428b';

-- 🔍 STEP 4: Show all current policies for tarot_spreads
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  cmd, 
  permissive,
  roles,
  qual
FROM pg_policies 
WHERE tablename = 'tarot_spreads' 
  AND schemaname = 'public'
ORDER BY cmd, policyname;

-- 🔍 STEP 5: Test manual UPDATE to see exact error
-- (Comment this out if you don't want to test)
/*
UPDATE tarot_spreads 
SET is_active = false 
WHERE id = 'f93998f5-41d2-4a3b-b61e-326f6144428b';
*/ 