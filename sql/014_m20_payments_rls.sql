-- M20: RLS Policies for Payment Tables
-- Enforce row-level security matching route guards exactly

-- Enable RLS on payment tables
ALTER TABLE payment_provider_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE manual_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE aml_kyc_checks ENABLE ROW LEVEL SECURITY;

-- Also enable RLS on existing payment tables from M14
ALTER TABLE payment_intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_events ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS payment_provider_rules_policy ON payment_provider_rules;
DROP POLICY IF EXISTS payment_attempts_policy_select ON payment_attempts;
DROP POLICY IF EXISTS payment_attempts_policy_insert ON payment_attempts;
DROP POLICY IF EXISTS manual_transfers_policy_select ON manual_transfers;
DROP POLICY IF EXISTS manual_transfers_policy_insert ON manual_transfers;
DROP POLICY IF EXISTS manual_transfers_policy_update ON manual_transfers;
DROP POLICY IF EXISTS wallets_policy_select ON wallets;
DROP POLICY IF EXISTS wallets_policy_insert ON wallets;
DROP POLICY IF EXISTS wallets_policy_update ON wallets;
DROP POLICY IF EXISTS wallet_ledger_policy_select ON wallet_ledger;
DROP POLICY IF EXISTS wallet_ledger_policy_insert ON wallet_ledger;
DROP POLICY IF EXISTS aml_kyc_checks_policy ON aml_kyc_checks;
DROP POLICY IF EXISTS payment_intents_policy_select ON payment_intents;
DROP POLICY IF EXISTS payment_intents_policy_insert ON payment_intents;
DROP POLICY IF EXISTS payment_events_policy ON payment_events;

-- PAYMENT_PROVIDER_RULES: Admin/Superadmin only
CREATE POLICY payment_provider_rules_policy ON payment_provider_rules
FOR ALL USING (
  public.get_user_role(current_setting('app.current_user_id', true)) IN ('admin', 'superadmin')
);

-- PAYMENT_ATTEMPTS: Client can see their own order attempts, Admin+ can see all
CREATE POLICY payment_attempts_policy_select ON payment_attempts
FOR SELECT USING (
  public.get_user_role(current_setting('app.current_user_id', true)) IN ('admin', 'superadmin')
  OR
  EXISTS (
    SELECT 1 FROM orders o
    WHERE o.id = payment_attempts.order_id
    AND o.user_id::text = current_setting('app.current_user_id', true)
  )
);

CREATE POLICY payment_attempts_policy_insert ON payment_attempts
FOR INSERT WITH CHECK (
  -- System can create attempts, or client for their own orders
  current_setting('app.current_user_id', true) = 'system'
  OR
  public.get_user_role(current_setting('app.current_user_id', true)) IN ('admin', 'superadmin')
  OR
  EXISTS (
    SELECT 1 FROM orders o
    WHERE o.id = payment_attempts.order_id
    AND o.user_id::text = current_setting('app.current_user_id', true)
  )
);

-- MANUAL_TRANSFERS: Client can see their own, Admin+ can see all
CREATE POLICY manual_transfers_policy_select ON manual_transfers
FOR SELECT USING (
  public.get_user_role(current_setting('app.current_user_id', true)) IN ('admin', 'superadmin')
  OR
  submitted_by::text = current_setting('app.current_user_id', true)
);

CREATE POLICY manual_transfers_policy_insert ON manual_transfers
FOR INSERT WITH CHECK (
  -- Client can submit for their own orders, Admin+ can submit for any order
  public.get_user_role(current_setting('app.current_user_id', true)) IN ('admin', 'superadmin')
  OR
  (submitted_by::text = current_setting('app.current_user_id', true)
   AND EXISTS (
     SELECT 1 FROM orders o
     WHERE o.id = manual_transfers.order_id
     AND o.user_id::text = current_setting('app.current_user_id', true)
   ))
);

CREATE POLICY manual_transfers_policy_update ON manual_transfers
FOR UPDATE USING (
  -- Only Admin+ can review/approve manual transfers
  public.get_user_role(current_setting('app.current_user_id', true)) IN ('admin', 'superadmin')
);

-- WALLETS: Users can only see their own wallet, Admin+ can see all
CREATE POLICY wallets_policy_select ON wallets
FOR SELECT USING (
  public.get_user_role(current_setting('app.current_user_id', true)) IN ('admin', 'superadmin')
  OR
  user_id::text = current_setting('app.current_user_id', true)
);

CREATE POLICY wallets_policy_insert ON wallets
FOR INSERT WITH CHECK (
  -- System or user can create their own wallet, Admin+ can create any
  current_setting('app.current_user_id', true) = 'system'
  OR
  public.get_user_role(current_setting('app.current_user_id', true)) IN ('admin', 'superadmin')
  OR
  user_id::text = current_setting('app.current_user_id', true)
);

CREATE POLICY wallets_policy_update ON wallets
FOR UPDATE USING (
  -- Only system (for balance updates via trigger) or Admin+ can update wallets
  current_setting('app.current_user_id', true) = 'system'
  OR
  public.get_user_role(current_setting('app.current_user_id', true)) IN ('admin', 'superadmin')
);

-- WALLET_LEDGER: Users can see their own transactions, Admin+ can see all
CREATE POLICY wallet_ledger_policy_select ON wallet_ledger
FOR SELECT USING (
  public.get_user_role(current_setting('app.current_user_id', true)) IN ('admin', 'superadmin')
  OR
  EXISTS (
    SELECT 1 FROM wallets w
    WHERE w.id = wallet_ledger.wallet_id
    AND w.user_id::text = current_setting('app.current_user_id', true)
  )
);

CREATE POLICY wallet_ledger_policy_insert ON wallet_ledger
FOR INSERT WITH CHECK (
  -- System can create ledger entries, Admin+ can create any
  current_setting('app.current_user_id', true) = 'system'
  OR
  public.get_user_role(current_setting('app.current_user_id', true)) IN ('admin', 'superadmin')
);

-- AML_KYC_CHECKS: User can see their own, Admin+ can see all
CREATE POLICY aml_kyc_checks_policy ON aml_kyc_checks
FOR ALL USING (
  public.get_user_role(current_setting('app.current_user_id', true)) IN ('admin', 'superadmin')
  OR
  user_id::text = current_setting('app.current_user_id', true)
);

-- PAYMENT_INTENTS: Client can see their own order intents, Admin+ can see all
CREATE POLICY payment_intents_policy_select ON payment_intents
FOR SELECT USING (
  public.get_user_role(current_setting('app.current_user_id', true)) IN ('admin', 'superadmin')
  OR
  EXISTS (
    SELECT 1 FROM orders o
    WHERE o.id = payment_intents.order_id
    AND o.user_id::text = current_setting('app.current_user_id', true)
  )
);

CREATE POLICY payment_intents_policy_insert ON payment_intents
FOR INSERT WITH CHECK (
  -- System can create intents, Admin+ can create any
  current_setting('app.current_user_id', true) = 'system'
  OR
  public.get_user_role(current_setting('app.current_user_id', true)) IN ('admin', 'superadmin')
);

-- PAYMENT_EVENTS: Admin+ only (contains webhook data)
CREATE POLICY payment_events_policy ON payment_events
FOR ALL USING (
  public.get_user_role(current_setting('app.current_user_id', true)) IN ('admin', 'superadmin')
  OR
  current_setting('app.current_user_id', true) = 'system'
);

-- Helper function to check payment access
CREATE OR REPLACE FUNCTION can_access_payment_rls(order_id_param bigint) 
RETURNS boolean AS $$
DECLARE
  current_user_role text;
  current_user_id_val text;
BEGIN
  current_user_id_val := current_setting('app.current_user_id', true);
  current_user_role := public.get_user_role(current_user_id_val);
  
  -- Admin/Superadmin always have access
  IF current_user_role IN ('admin', 'superadmin') THEN
    RETURN true;
  END IF;
  
  -- Check if user owns the order
  RETURN EXISTS (
    SELECT 1 FROM orders o
    WHERE o.id = order_id_param
    AND o.user_id::text = current_user_id_val
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON payment_provider_rules TO authenticated;
GRANT SELECT, INSERT, UPDATE ON payment_attempts TO authenticated;
GRANT SELECT, INSERT, UPDATE ON manual_transfers TO authenticated;
GRANT SELECT, INSERT, UPDATE ON wallets TO authenticated;
GRANT SELECT, INSERT ON wallet_ledger TO authenticated;
GRANT SELECT, INSERT, UPDATE ON aml_kyc_checks TO authenticated;
GRANT SELECT, INSERT, UPDATE ON payment_intents TO authenticated;
GRANT SELECT, INSERT ON payment_events TO authenticated;

-- Only admin+ can delete payment records (for compliance)
GRANT DELETE ON payment_attempts TO authenticated;
GRANT DELETE ON manual_transfers TO authenticated;
GRANT DELETE ON payment_events TO authenticated;

COMMENT ON POLICY payment_attempts_policy_select ON payment_attempts IS 'M20: Allow payment attempt access based on order ownership and role hierarchy';
COMMENT ON POLICY manual_transfers_policy_select ON manual_transfers IS 'M20: Manual transfer access for submitters and admin reviewers';
COMMENT ON POLICY wallets_policy_select ON wallets IS 'M20: Wallet access restricted to owner and admin+';
COMMENT ON POLICY wallet_ledger_policy_select ON wallet_ledger IS 'M20: Wallet transaction history access via wallet ownership';
COMMENT ON POLICY payment_events_policy ON payment_events IS 'M20: Webhook events admin-only for security';
COMMENT ON FUNCTION can_access_payment_rls IS 'M20: RLS helper function to check payment access permissions';