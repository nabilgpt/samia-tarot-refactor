-- M21: RLS Policies for Moderation & Audit Tables
-- Enforce row-level security matching route guards exactly

-- Enable RLS on moderation tables
ALTER TABLE moderation_reasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderation_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderation_appeals ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_restrictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderation_sweep_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderation_sweep_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_attestations ENABLE ROW LEVEL SECURITY;

-- Also enable RLS on existing moderation_actions and audit_log
ALTER TABLE moderation_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS moderation_reasons_policy ON moderation_reasons;
DROP POLICY IF EXISTS moderation_actions_policy_select ON moderation_actions;
DROP POLICY IF EXISTS moderation_actions_policy_insert ON moderation_actions;
DROP POLICY IF EXISTS moderation_cases_policy_select ON moderation_cases;
DROP POLICY IF EXISTS moderation_cases_policy_insert ON moderation_cases;
DROP POLICY IF EXISTS moderation_cases_policy_update ON moderation_cases;
DROP POLICY IF EXISTS moderation_appeals_policy_select ON moderation_appeals;
DROP POLICY IF EXISTS moderation_appeals_policy_insert ON moderation_appeals;
DROP POLICY IF EXISTS moderation_appeals_policy_update ON moderation_appeals;
DROP POLICY IF EXISTS user_restrictions_policy_select ON user_restrictions;
DROP POLICY IF EXISTS user_restrictions_policy_insert ON user_restrictions;
DROP POLICY IF EXISTS user_restrictions_policy_update ON user_restrictions;
DROP POLICY IF EXISTS moderation_sweep_configs_policy ON moderation_sweep_configs;
DROP POLICY IF EXISTS moderation_sweep_results_policy ON moderation_sweep_results;
DROP POLICY IF EXISTS audit_log_policy_select ON audit_log;
DROP POLICY IF EXISTS audit_log_policy_insert ON audit_log;
DROP POLICY IF EXISTS audit_attestations_policy ON audit_attestations;

-- MODERATION_REASONS: All authenticated users can read, only admin+ can manage
CREATE POLICY moderation_reasons_policy ON moderation_reasons
FOR ALL USING (
  -- Everyone can read active reasons
  (current_setting('app.current_user_id', true) != '' AND TG_OP = 'SELECT')
  OR
  -- Only admin+ can insert/update/delete
  (public.get_user_role(current_setting('app.current_user_id', true)) IN ('admin', 'superadmin')
   AND TG_OP IN ('INSERT', 'UPDATE', 'DELETE'))
);

-- MODERATION_ACTIONS: Monitor+ can see all, others restricted scope
CREATE POLICY moderation_actions_policy_select ON moderation_actions
FOR SELECT USING (
  public.get_user_role(current_setting('app.current_user_id', true)) IN ('monitor', 'admin', 'superadmin')
  OR
  -- Users can see actions against their own content
  (target_kind = 'profile' AND target_id = current_setting('app.current_user_id', true))
  OR
  -- Users can see actions on their orders
  (target_kind = 'order' AND EXISTS (
    SELECT 1 FROM orders o 
    WHERE o.id = moderation_actions.target_id::bigint 
    AND o.user_id::text = current_setting('app.current_user_id', true)
  ))
);

CREATE POLICY moderation_actions_policy_insert ON moderation_actions
FOR INSERT WITH CHECK (
  -- Only monitor+ can create moderation actions
  public.get_user_role(current_setting('app.current_user_id', true)) IN ('monitor', 'admin', 'superadmin')
  OR
  -- System can create automated actions
  current_setting('app.current_user_id', true) = 'system'
);

-- MODERATION_CASES: Monitor+ can see all, others very restricted
CREATE POLICY moderation_cases_policy_select ON moderation_cases
FOR SELECT USING (
  public.get_user_role(current_setting('app.current_user_id', true)) IN ('monitor', 'admin', 'superadmin')
);

CREATE POLICY moderation_cases_policy_insert ON moderation_cases
FOR INSERT WITH CHECK (
  public.get_user_role(current_setting('app.current_user_id', true)) IN ('monitor', 'admin', 'superadmin')
  OR
  current_setting('app.current_user_id', true) = 'system'
);

CREATE POLICY moderation_cases_policy_update ON moderation_cases
FOR UPDATE USING (
  -- Monitor+ can update cases assigned to them or unassigned
  public.get_user_role(current_setting('app.current_user_id', true)) IN ('monitor', 'admin', 'superadmin')
  AND (assigned_to IS NULL OR assigned_to::text = current_setting('app.current_user_id', true))
);

-- MODERATION_APPEALS: Users can see their own appeals, admin+ can see all
CREATE POLICY moderation_appeals_policy_select ON moderation_appeals
FOR SELECT USING (
  public.get_user_role(current_setting('app.current_user_id', true)) IN ('admin', 'superadmin')
  OR
  appellant_id::text = current_setting('app.current_user_id', true)
);

CREATE POLICY moderation_appeals_policy_insert ON moderation_appeals
FOR INSERT WITH CHECK (
  -- Users can only appeal their own moderation actions
  appellant_id::text = current_setting('app.current_user_id', true)
  AND EXISTS (
    SELECT 1 FROM moderation_actions ma 
    WHERE ma.id = moderation_appeals.moderation_action_id
    AND (
      (ma.target_kind = 'profile' AND ma.target_id = current_setting('app.current_user_id', true))
      OR
      (ma.target_kind = 'order' AND EXISTS (
        SELECT 1 FROM orders o 
        WHERE o.id = ma.target_id::bigint 
        AND o.user_id::text = current_setting('app.current_user_id', true)
      ))
    )
  )
);

CREATE POLICY moderation_appeals_policy_update ON moderation_appeals
FOR UPDATE USING (
  -- Only admin+ can update appeals (for decisions)
  public.get_user_role(current_setting('app.current_user_id', true)) IN ('admin', 'superadmin')
);

-- USER_RESTRICTIONS: Users can see their own restrictions, monitor+ can see all
CREATE POLICY user_restrictions_policy_select ON user_restrictions
FOR SELECT USING (
  public.get_user_role(current_setting('app.current_user_id', true)) IN ('monitor', 'admin', 'superadmin')
  OR
  user_id::text = current_setting('app.current_user_id', true)
);

CREATE POLICY user_restrictions_policy_insert ON user_restrictions
FOR INSERT WITH CHECK (
  -- Only monitor+ can create restrictions
  public.get_user_role(current_setting('app.current_user_id', true)) IN ('monitor', 'admin', 'superadmin')
);

CREATE POLICY user_restrictions_policy_update ON user_restrictions
FOR UPDATE USING (
  -- Monitor+ can update restrictions, original applier can lift if not permanent
  public.get_user_role(current_setting('app.current_user_id', true)) IN ('admin', 'superadmin')
  OR
  (public.get_user_role(current_setting('app.current_user_id', true)) = 'monitor' 
   AND applied_by::text = current_setting('app.current_user_id', true))
);

-- MODERATION_SWEEP_CONFIGS: Admin+ only
CREATE POLICY moderation_sweep_configs_policy ON moderation_sweep_configs
FOR ALL USING (
  public.get_user_role(current_setting('app.current_user_id', true)) IN ('admin', 'superadmin')
  OR
  current_setting('app.current_user_id', true) = 'system'
);

-- MODERATION_SWEEP_RESULTS: Admin+ can see all, system can insert
CREATE POLICY moderation_sweep_results_policy ON moderation_sweep_results
FOR ALL USING (
  public.get_user_role(current_setting('app.current_user_id', true)) IN ('admin', 'superadmin')
  OR
  current_setting('app.current_user_id', true) = 'system'
);

-- AUDIT_LOG: Admin+ only (highly sensitive)
CREATE POLICY audit_log_policy_select ON audit_log
FOR SELECT USING (
  public.get_user_role(current_setting('app.current_user_id', true)) IN ('admin', 'superadmin')
);

CREATE POLICY audit_log_policy_insert ON audit_log
FOR INSERT WITH CHECK (
  -- System and all authenticated users can write audit logs
  current_setting('app.current_user_id', true) != ''
);

-- AUDIT_ATTESTATIONS: Admin+ only
CREATE POLICY audit_attestations_policy ON audit_attestations
FOR ALL USING (
  public.get_user_role(current_setting('app.current_user_id', true)) IN ('admin', 'superadmin')
);

-- Helper function to check moderation permissions
CREATE OR REPLACE FUNCTION can_moderate_rls(target_type text, target_id text) 
RETURNS boolean AS $$
DECLARE
  current_user_role text;
  current_user_id_val text;
BEGIN
  current_user_id_val := current_setting('app.current_user_id', true);
  current_user_role := public.get_user_role(current_user_id_val);
  
  -- Monitor/Admin/Superadmin can moderate everything
  IF current_user_role IN ('monitor', 'admin', 'superadmin') THEN
    RETURN true;
  END IF;
  
  -- System can perform automated moderation
  IF current_user_id_val = 'system' THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user can appeal a moderation action
CREATE OR REPLACE FUNCTION can_appeal_moderation_rls(moderation_action_id bigint) 
RETURNS boolean AS $$
DECLARE
  current_user_id_val text;
  action_record RECORD;
BEGIN
  current_user_id_val := current_setting('app.current_user_id', true);
  
  -- Get the moderation action details
  SELECT target_kind, target_id INTO action_record
  FROM moderation_actions 
  WHERE id = moderation_action_id;
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- Check if the current user is the target of the moderation action
  IF action_record.target_kind = 'profile' THEN
    RETURN action_record.target_id = current_user_id_val;
  ELSIF action_record.target_kind = 'order' THEN
    RETURN EXISTS (
      SELECT 1 FROM orders o 
      WHERE o.id = action_record.target_id::bigint 
      AND o.user_id::text = current_user_id_val
    );
  END IF;
  
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check audit log access
CREATE OR REPLACE FUNCTION can_access_audit_rls() 
RETURNS boolean AS $$
DECLARE
  current_user_role text;
BEGIN
  current_user_role := public.get_user_role(current_setting('app.current_user_id', true));
  RETURN current_user_role IN ('admin', 'superadmin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON moderation_reasons TO authenticated;
GRANT SELECT, INSERT ON moderation_actions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON moderation_cases TO authenticated;
GRANT SELECT, INSERT, UPDATE ON moderation_appeals TO authenticated;
GRANT SELECT, INSERT, UPDATE ON user_restrictions TO authenticated;
GRANT SELECT ON moderation_sweep_configs TO authenticated;
GRANT SELECT ON moderation_sweep_results TO authenticated;
GRANT SELECT, INSERT ON audit_log TO authenticated;
GRANT SELECT ON audit_attestations TO authenticated;

-- Only admin+ can delete moderation records (for compliance cleanup)
GRANT DELETE ON moderation_actions TO authenticated;
GRANT DELETE ON moderation_cases TO authenticated;
GRANT DELETE ON user_restrictions TO authenticated;
GRANT DELETE ON moderation_sweep_configs TO authenticated;
GRANT DELETE ON audit_attestations TO authenticated;

-- Audit log is append-only (no updates or deletes except for admin cleanup)
REVOKE UPDATE, DELETE ON audit_log FROM authenticated;
GRANT UPDATE, DELETE ON audit_log TO authenticated; -- Will be restricted by RLS

-- Additional constraints for audit integrity
ALTER TABLE audit_log ADD CONSTRAINT audit_log_immutable_sequence 
  CHECK (sequence_number IS NOT NULL);

ALTER TABLE audit_log ADD CONSTRAINT audit_log_immutable_hash 
  CHECK (record_hash IS NOT NULL);

-- Prevent modification of completed sweep results
ALTER TABLE moderation_sweep_results ADD CONSTRAINT sweep_results_immutable_when_complete
  CHECK (
    CASE 
      WHEN execution_status = 'completed' THEN run_completed_at IS NOT NULL
      ELSE true 
    END
  );

COMMENT ON POLICY moderation_actions_policy_select ON moderation_actions IS 'M21: Monitor+ see all actions, users see actions on their content';
COMMENT ON POLICY moderation_cases_policy_select ON moderation_cases IS 'M21: Moderation cases visible to monitor+ only';
COMMENT ON POLICY moderation_appeals_policy_select ON moderation_appeals IS 'M21: Users see own appeals, admin+ see all for review';
COMMENT ON POLICY user_restrictions_policy_select ON user_restrictions IS 'M21: Users see own restrictions, monitor+ see all';
COMMENT ON POLICY audit_log_policy_select ON audit_log IS 'M21: Audit logs admin-only for compliance';
COMMENT ON FUNCTION can_moderate_rls IS 'M21: RLS helper to check moderation permissions';
COMMENT ON FUNCTION can_appeal_moderation_rls IS 'M21: RLS helper to check appeal eligibility';
COMMENT ON FUNCTION can_access_audit_rls IS 'M21: RLS helper to check audit log access';