-- SAMIA TAROT — Test Accounts Profile Setup
-- Marks test accounts in profiles table and ensures proper role assignment
-- Run this after creating test accounts via the Admin API

-- Ensure profiles table exists (adjust schema/table names if different)
-- Assuming: profiles(user_id uuid primary key, role text, is_test boolean default false)

-- Client Test Account
INSERT INTO profiles (user_id, role, is_test, display_name, created_at, updated_at)
SELECT 
  u.id, 
  'client', 
  true,
  'Client Test Account',
  NOW(),
  NOW()
FROM auth.users u 
WHERE u.email = 'client@test.app'
ON CONFLICT (user_id) 
DO UPDATE SET 
  role = EXCLUDED.role, 
  is_test = true,
  display_name = EXCLUDED.display_name,
  updated_at = NOW();

-- Reader Test Account  
INSERT INTO profiles (user_id, role, is_test, display_name, created_at, updated_at)
SELECT 
  u.id, 
  'reader', 
  true,
  'Reader Test Account',
  NOW(),
  NOW()
FROM auth.users u 
WHERE u.email = 'reader@test.app'
ON CONFLICT (user_id) 
DO UPDATE SET 
  role = EXCLUDED.role, 
  is_test = true,
  display_name = EXCLUDED.display_name,
  updated_at = NOW();

-- Monitor Test Account
INSERT INTO profiles (user_id, role, is_test, display_name, created_at, updated_at)
SELECT 
  u.id, 
  'monitor', 
  true,
  'Monitor Test Account',
  NOW(),
  NOW()
FROM auth.users u 
WHERE u.email = 'monitor@test.app'
ON CONFLICT (user_id) 
DO UPDATE SET 
  role = EXCLUDED.role, 
  is_test = true,
  display_name = EXCLUDED.display_name,
  updated_at = NOW();

-- Admin Test Account
INSERT INTO profiles (user_id, role, is_test, display_name, created_at, updated_at)
SELECT 
  u.id, 
  'admin', 
  true,
  'Admin Test Account',
  NOW(),
  NOW()
FROM auth.users u 
WHERE u.email = 'admin@test.app'
ON CONFLICT (user_id) 
DO UPDATE SET 
  role = EXCLUDED.role, 
  is_test = true,
  display_name = EXCLUDED.display_name,
  updated_at = NOW();

-- Super Admin Test Account
INSERT INTO profiles (user_id, role, is_test, display_name, created_at, updated_at)
SELECT 
  u.id, 
  'super_admin', 
  true,
  'Super Admin Test Account',
  NOW(),
  NOW()
FROM auth.users u 
WHERE u.email = 'sa@test.app'
ON CONFLICT (user_id) 
DO UPDATE SET 
  role = EXCLUDED.role, 
  is_test = true,
  display_name = EXCLUDED.display_name,
  updated_at = NOW();

-- Security: RLS Policy to prevent test accounts from real payments in production
-- (Optional safety measure)
CREATE OR REPLACE POLICY "test_accounts_no_real_payments" 
ON payment_transactions
FOR ALL 
TO authenticated
USING (
  -- Allow all operations if not a test user
  NOT EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.is_test = true
  )
  OR 
  -- Allow test users only for test transactions (amount < $1.00 or test mode)
  (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.user_id = auth.uid() 
      AND p.is_test = true
    )
    AND (
      amount < 100 -- Less than $1.00 in cents
      OR 
      metadata->>'test_mode' = 'true'
    )
  )
);

-- Verification: Show all test accounts created
SELECT 
  p.user_id,
  p.role,
  p.is_test,
  p.display_name,
  u.email,
  u.created_at as auth_created_at,
  p.created_at as profile_created_at
FROM profiles p
JOIN auth.users u ON u.id = p.user_id
WHERE p.is_test = true
ORDER BY p.role;

-- Show count by role
SELECT 
  p.role,
  COUNT(*) as test_accounts
FROM profiles p
WHERE p.is_test = true
GROUP BY p.role
ORDER BY p.role;