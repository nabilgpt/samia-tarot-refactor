-- OPTIONAL SECURITY HARDENING — SAMIA TAROT
-- Block test accounts from creating real payment transactions
-- Apply this in production for extra safety

-- Enable RLS on payment_transactions if not already enabled
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;

-- Drop existing restrictive policy if exists
DROP POLICY IF EXISTS pay_tx_block_tests ON payment_transactions;

-- Create restrictive policy to block test accounts from real payments
CREATE POLICY pay_tx_block_tests
ON payment_transactions AS RESTRICTIVE  
FOR INSERT TO authenticated
WITH CHECK (
  -- Allow non-test users to create any transactions
  NOT EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid()
    AND COALESCE(p.is_test, false) = true
  )
  OR 
  -- Allow test users only for small amounts or test mode
  (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid()
      AND COALESCE(p.is_test, false) = true
    )
    AND (
      amount < 100 -- Less than $1.00 in cents
      OR 
      metadata->>'test_mode' = 'true'
      OR
      metadata->>'environment' = 'staging'
    )
  )
);

-- Verification query
SELECT 
  'Test Account Payment Protection' as policy_name,
  COUNT(*) as protected_tables
FROM information_schema.tables 
WHERE table_name = 'payment_transactions' 
AND row_security = 'YES';

-- Test the policy (should succeed for small amounts)
-- INSERT INTO payment_transactions (user_id, amount, metadata) 
-- VALUES (auth.uid(), 50, '{"test_mode": "true"}'::jsonb);

-- Test the policy (should fail for large amounts from test accounts)  
-- INSERT INTO payment_transactions (user_id, amount, metadata)
-- VALUES (auth.uid(), 5000, '{"real_transaction": "true"}'::jsonb);