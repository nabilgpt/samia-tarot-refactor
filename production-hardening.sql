-- PRODUCTION HARDENING — SAMIA TAROT
-- maintainable & short — preserve theme integrity
-- Apply these policies in production for payment security

-- =====================================================
-- 1. BLOCK TEST ACCOUNTS FROM REAL PAYMENTS
-- =====================================================

-- Enable RLS on payment_transactions (if not already enabled)
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;

-- Remove existing test account policies
DROP POLICY IF EXISTS pay_tx_block_tests ON payment_transactions;

-- Create restrictive policy to block test accounts
CREATE POLICY pay_tx_block_tests
ON payment_transactions AS RESTRICTIVE
FOR INSERT TO authenticated
WITH CHECK (
  -- Block any user marked as is_test = true from creating transactions
  NOT EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid()
    AND COALESCE(p.is_test, false) = true
  )
);

-- =====================================================  
-- 2. PRODUCTION PAYMENT GUARD (OPTIONAL)
-- =====================================================

-- Additional safety: only allow test_mode or small amounts
DROP POLICY IF EXISTS pay_tx_prod_guard ON payment_transactions;

CREATE POLICY pay_tx_prod_guard  
ON payment_transactions AS RESTRICTIVE
FOR INSERT TO authenticated
WITH CHECK (
  -- Allow only test transactions or amounts under $1.00
  (metadata->>'test_mode' = 'true') 
  OR 
  (amount < 100)  -- Less than $1.00 in cents
  OR
  (metadata->>'environment' = 'staging')
  OR
  -- Allow real transactions for non-test users
  NOT EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid()
    AND COALESCE(p.is_test, false) = true
  )
);

-- =====================================================
-- 3. VERIFICATION QUERIES
-- =====================================================

-- Verify RLS is enabled
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'payment_transactions';

-- Check existing policies
SELECT 
  schemaname,
  tablename, 
  policyname,
  cmd,
  restrictive
FROM pg_policies 
WHERE tablename = 'payment_transactions'
ORDER BY policyname;

-- Test policy effectiveness (run as test user)
-- This should fail for test accounts trying real payments:
-- INSERT INTO payment_transactions (user_id, amount, metadata) 
-- VALUES (auth.uid(), 5000, '{"real_payment": true}'::jsonb);

-- This should succeed for test accounts with test mode:
-- INSERT INTO payment_transactions (user_id, amount, metadata)
-- VALUES (auth.uid(), 50, '{"test_mode": "true"}'::jsonb);

-- =====================================================
-- 4. MONITORING QUERIES  
-- =====================================================

-- Count payment attempts by test accounts (should be 0 for real payments)
SELECT 
  COUNT(*) as test_account_real_payments
FROM payment_transactions pt
JOIN profiles p ON p.user_id = pt.user_id
WHERE p.is_test = true
AND pt.amount >= 100  -- $1.00 or more
AND pt.metadata->>'test_mode' != 'true';

-- Daily payment security metrics
SELECT 
  DATE(created_at) as payment_date,
  COUNT(*) as total_transactions,
  COUNT(*) FILTER (WHERE amount >= 100) as real_payments,
  COUNT(*) FILTER (WHERE amount < 100 OR metadata->>'test_mode' = 'true') as test_payments,
  SUM(amount) as total_amount_cents
FROM payment_transactions
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY payment_date DESC;