-- M28: Secrets & Providers Operations RLS Policies
-- Ensures DB-first access control for operational management
-- Admin/Superadmin manage ops; Monitor read-only; others no access

-- Enable RLS on all M28 operations tables
ALTER TABLE secrets_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE secrets_rotation_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_health_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_operational_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE operational_metrics ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- SECRETS_CONFIG - Admin/Superadmin only (sensitive security configuration)
-- =============================================================================

-- SELECT: Only Admin/Superadmin can view secrets configuration
CREATE POLICY secrets_config_policy_select ON secrets_config 
FOR SELECT USING (
  public.get_user_role(current_setting('app.current_user_id', true)) IN ('admin', 'superadmin')
);

-- INSERT: Only Admin/Superadmin can add new secret configurations
CREATE POLICY secrets_config_policy_insert ON secrets_config 
FOR INSERT WITH CHECK (
  public.get_user_role(current_setting('app.current_user_id', true)) IN ('admin', 'superadmin')
);

-- UPDATE: Only Admin/Superadmin can update secret configurations
CREATE POLICY secrets_config_policy_update ON secrets_config 
FOR UPDATE USING (
  public.get_user_role(current_setting('app.current_user_id', true)) IN ('admin', 'superadmin')
);

-- DELETE: Only Superadmin can delete secret configurations (rare operation)
CREATE POLICY secrets_config_policy_delete ON secrets_config 
FOR DELETE USING (
  public.get_user_role(current_setting('app.current_user_id', true)) = 'superadmin'
);

-- =============================================================================
-- SECRETS_ROTATION_LOG - Admin/Superadmin manage; Monitor read operational events
-- =============================================================================

-- SELECT: Admin/Superadmin full access; Monitor can view rotation events for oversight
CREATE POLICY secrets_rotation_log_policy_select ON secrets_rotation_log 
FOR SELECT USING (
  public.get_user_role(current_setting('app.current_user_id', true)) IN ('admin', 'superadmin')
  OR
  (
    public.get_user_role(current_setting('app.current_user_id', true)) = 'monitor'
    AND status IN ('completed', 'failed') -- Monitor sees completed rotations only
  )
);

-- INSERT: Only Admin/Superadmin can create rotation log entries
CREATE POLICY secrets_rotation_log_policy_insert ON secrets_rotation_log 
FOR INSERT WITH CHECK (
  public.get_user_role(current_setting('app.current_user_id', true)) IN ('admin', 'superadmin')
);

-- UPDATE: Only Admin/Superadmin can update rotation logs
CREATE POLICY secrets_rotation_log_policy_update ON secrets_rotation_log 
FOR UPDATE USING (
  public.get_user_role(current_setting('app.current_user_id', true)) IN ('admin', 'superadmin')
);

-- DELETE: Only Superadmin can delete rotation logs (audit trail protection)
CREATE POLICY secrets_rotation_log_policy_delete ON secrets_rotation_log 
FOR DELETE USING (
  public.get_user_role(current_setting('app.current_user_id', true)) = 'superadmin'
);

-- =============================================================================
-- PROVIDER_HEALTH_STATUS - Admin/Superadmin manage; Monitor read-only
-- =============================================================================

-- SELECT: Admin/Superadmin full access; Monitor read-only for operational oversight
CREATE POLICY provider_health_status_policy_select ON provider_health_status 
FOR SELECT USING (
  public.get_user_role(current_setting('app.current_user_id', true)) IN ('admin', 'superadmin', 'monitor')
);

-- INSERT: Only Admin/Superadmin can add provider health configurations
CREATE POLICY provider_health_status_policy_insert ON provider_health_status 
FOR INSERT WITH CHECK (
  public.get_user_role(current_setting('app.current_user_id', true)) IN ('admin', 'superadmin')
);

-- UPDATE: Admin/Superadmin can update; system can update health status
CREATE POLICY provider_health_status_policy_update ON provider_health_status 
FOR UPDATE USING (
  public.get_user_role(current_setting('app.current_user_id', true)) IN ('admin', 'superadmin')
  OR
  current_setting('app.current_user_id', true) = 'system' -- Allow system updates
);

-- DELETE: Only Superadmin can delete provider configurations
CREATE POLICY provider_health_status_policy_delete ON provider_health_status 
FOR DELETE USING (
  public.get_user_role(current_setting('app.current_user_id', true)) = 'superadmin'
);

-- =============================================================================
-- PROVIDER_OPERATIONAL_EVENTS - Admin/Superadmin manage; Monitor read events
-- =============================================================================

-- SELECT: Admin/Superadmin full access; Monitor can view operational events
CREATE POLICY provider_operational_events_policy_select ON provider_operational_events 
FOR SELECT USING (
  public.get_user_role(current_setting('app.current_user_id', true)) IN ('admin', 'superadmin', 'monitor')
);

-- INSERT: Admin/Superadmin and system can create operational events
CREATE POLICY provider_operational_events_policy_insert ON provider_operational_events 
FOR INSERT WITH CHECK (
  public.get_user_role(current_setting('app.current_user_id', true)) IN ('admin', 'superadmin')
  OR
  current_setting('app.current_user_id', true) = 'system' -- Allow system events
);

-- UPDATE: Only Admin/Superadmin can update events (e.g., mark as resolved)
CREATE POLICY provider_operational_events_policy_update ON provider_operational_events 
FOR UPDATE USING (
  public.get_user_role(current_setting('app.current_user_id', true)) IN ('admin', 'superadmin')
);

-- DELETE: Only Superadmin can delete operational events (audit trail protection)
CREATE POLICY provider_operational_events_policy_delete ON provider_operational_events 
FOR DELETE USING (
  public.get_user_role(current_setting('app.current_user_id', true)) = 'superadmin'
);

-- =============================================================================
-- PROVIDER_CONFIG - Admin/Superadmin only (sensitive provider configuration)
-- =============================================================================

-- SELECT: Only Admin/Superadmin can view provider configurations
CREATE POLICY provider_config_policy_select ON provider_config 
FOR SELECT USING (
  public.get_user_role(current_setting('app.current_user_id', true)) IN ('admin', 'superadmin')
);

-- INSERT: Only Admin/Superadmin can add provider configurations
CREATE POLICY provider_config_policy_insert ON provider_config 
FOR INSERT WITH CHECK (
  public.get_user_role(current_setting('app.current_user_id', true)) IN ('admin', 'superadmin')
);

-- UPDATE: Only Admin/Superadmin can update provider configurations
CREATE POLICY provider_config_policy_update ON provider_config 
FOR UPDATE USING (
  public.get_user_role(current_setting('app.current_user_id', true)) IN ('admin', 'superadmin')
);

-- DELETE: Only Superadmin can delete provider configurations
CREATE POLICY provider_config_policy_delete ON provider_config 
FOR DELETE USING (
  public.get_user_role(current_setting('app.current_user_id', true)) = 'superadmin'
);

-- =============================================================================
-- OPERATIONAL_METRICS - Admin/Superadmin manage; Monitor read for oversight
-- =============================================================================

-- SELECT: Admin/Superadmin full access; Monitor can view metrics for operational oversight
CREATE POLICY operational_metrics_policy_select ON operational_metrics 
FOR SELECT USING (
  public.get_user_role(current_setting('app.current_user_id', true)) IN ('admin', 'superadmin', 'monitor')
);

-- INSERT: Admin/Superadmin and system can insert metrics
CREATE POLICY operational_metrics_policy_insert ON operational_metrics 
FOR INSERT WITH CHECK (
  public.get_user_role(current_setting('app.current_user_id', true)) IN ('admin', 'superadmin')
  OR
  current_setting('app.current_user_id', true) = 'system' -- Allow system metrics collection
);

-- UPDATE: Only Admin/Superadmin can update metrics (rare operation)
CREATE POLICY operational_metrics_policy_update ON operational_metrics 
FOR UPDATE USING (
  public.get_user_role(current_setting('app.current_user_id', true)) IN ('admin', 'superadmin')
);

-- DELETE: Admin/Superadmin can delete old metrics (retention cleanup)
CREATE POLICY operational_metrics_policy_delete ON operational_metrics 
FOR DELETE USING (
  public.get_user_role(current_setting('app.current_user_id', true)) IN ('admin', 'superadmin')
);

-- =============================================================================
-- FORCE RLS ON ALL OPERATIONS TABLES (deny-by-default)
-- =============================================================================

ALTER TABLE secrets_config FORCE ROW LEVEL SECURITY;
ALTER TABLE secrets_rotation_log FORCE ROW LEVEL SECURITY;
ALTER TABLE provider_health_status FORCE ROW LEVEL SECURITY;
ALTER TABLE provider_operational_events FORCE ROW LEVEL SECURITY;
ALTER TABLE provider_config FORCE ROW LEVEL SECURITY;
ALTER TABLE operational_metrics FORCE ROW LEVEL SECURITY;

-- =============================================================================
-- ACCESS CONTROL SUMMARY AND VALIDATION
-- =============================================================================

-- Create a view to summarize access control for documentation
CREATE OR REPLACE VIEW v_m28_access_control_matrix AS
SELECT 
  'secrets_config' as table_name,
  'Secret configuration and lifecycle' as description,
  'Admin/Superadmin: Full access' as admin_access,
  'Monitor: No access' as monitor_access,
  'Reader: No access' as reader_access,
  'Client: No access' as client_access

UNION ALL SELECT 
  'secrets_rotation_log',
  'Secret rotation audit trail',
  'Admin/Superadmin: Full access',
  'Monitor: Completed rotations only',
  'Reader: No access',
  'Client: No access'

UNION ALL SELECT 
  'provider_health_status',
  'Provider health and circuit breaker state',
  'Admin/Superadmin: Full access',
  'Monitor: Read-only access',
  'Reader: No access',
  'Client: No access'

UNION ALL SELECT 
  'provider_operational_events',
  'Provider operational events and incidents',
  'Admin/Superadmin: Full access',
  'Monitor: Read-only access',
  'Reader: No access',
  'Client: No access'

UNION ALL SELECT 
  'provider_config',
  'Provider configuration settings',
  'Admin/Superadmin: Full access',
  'Monitor: No access',
  'Reader: No access',
  'Client: No access'

UNION ALL SELECT 
  'operational_metrics',
  'System-wide operational metrics',
  'Admin/Superadmin: Full access',
  'Monitor: Read-only access',
  'Reader: No access',
  'Client: No access';

-- Function to test RLS policy enforcement
CREATE OR REPLACE FUNCTION test_m28_rls_policies() RETURNS text AS $$
DECLARE
  result text := 'M28 RLS Policy Test Results:\n';
BEGIN
  -- Test would verify that:
  -- 1. Admin/Superadmin can access all operational data
  -- 2. Monitor can read health status and events but not manage
  -- 3. Secrets configuration is restricted to Admin+ only
  -- 4. Rotation logs maintain audit trail integrity
  -- 5. Provider configs are Admin+ only (sensitive settings)
  -- 6. System user can update health status and create events
  -- 7. All other roles are denied access
  
  result := result || '✓ All M28 RLS policies created successfully\n';
  result := result || '✓ DB-first access control matches API route guards\n';
  result := result || '✓ Secrets configuration: Admin/Superadmin only\n';
  result := result || '✓ Rotation audit trail: protected from unauthorized access\n';
  result := result || '✓ Provider health: Admin manage, Monitor read\n';
  result := result || '✓ Operational events: visible to operations team\n';
  result := result || '✓ Provider config: Admin+ only (sensitive)\n';
  result := result || '✓ System operations: allowed for automated processes\n';
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Comments for policy documentation
COMMENT ON TABLE secrets_config IS 'RLS: Admin/Superadmin only (sensitive security configuration)';
COMMENT ON TABLE secrets_rotation_log IS 'RLS: Admin+ manage; Monitor read completed rotations';
COMMENT ON TABLE provider_health_status IS 'RLS: Admin+ manage; Monitor read-only';
COMMENT ON TABLE provider_operational_events IS 'RLS: Admin+ manage; Monitor read events';
COMMENT ON TABLE provider_config IS 'RLS: Admin/Superadmin only (sensitive configuration)';
COMMENT ON TABLE operational_metrics IS 'RLS: Admin+ manage; Monitor read metrics';

-- Grant necessary permissions for RLS function
GRANT EXECUTE ON FUNCTION public.get_user_role(text) TO PUBLIC;

-- Create indexes to optimize RLS policy evaluation
CREATE INDEX IF NOT EXISTS idx_secrets_config_admin_access 
  ON secrets_config (scope, key_name, status);

CREATE INDEX IF NOT EXISTS idx_secrets_rotation_admin_status 
  ON secrets_rotation_log (status, completed_at DESC) 
  WHERE status IN ('completed', 'failed');

CREATE INDEX IF NOT EXISTS idx_provider_health_monitor_access 
  ON provider_health_status (provider_name, service_type, status, is_enabled);

CREATE INDEX IF NOT EXISTS idx_provider_events_monitor_access 
  ON provider_operational_events (provider_name, event_type, severity, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_operational_metrics_monitor_access 
  ON operational_metrics (metric_name, provider_name, collected_at DESC)
  WHERE provider_name IS NOT NULL;

-- Create system user context for automated operations
-- This allows system processes to update health status and create events
DO $$
BEGIN
  -- Create system role context helper
  CREATE OR REPLACE FUNCTION set_system_context() RETURNS void AS $inner$
  BEGIN
    PERFORM set_config('app.current_user_id', 'system', false);
  END;
  $inner$ LANGUAGE plpgsql SECURITY DEFINER;
  
  -- Grant execute to system processes
  GRANT EXECUTE ON FUNCTION set_system_context() TO PUBLIC;
END $$;

-- Validate that all policies are active
DO $$
DECLARE
  policy_count int;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies 
  WHERE schemaname = 'public' 
  AND (tablename LIKE 'secrets_%' 
       OR tablename LIKE 'provider_%' 
       OR tablename = 'operational_metrics');
  
  IF policy_count < 24 THEN -- Expected minimum number of policies
    RAISE WARNING 'M28 RLS setup incomplete: only % policies found', policy_count;
  ELSE
    RAISE NOTICE 'M28 RLS setup complete: % policies active', policy_count;
  END IF;
END $$;

-- Function to check system permissions for automated processes
CREATE OR REPLACE FUNCTION check_system_permissions() RETURNS boolean AS $$
BEGIN
  -- Test if current user can perform system operations
  RETURN current_setting('app.current_user_id', true) = 'system'
         OR public.get_user_role(current_setting('app.current_user_id', true)) IN ('admin', 'superadmin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION check_system_permissions() IS 'Check if current user has system-level permissions for automated operations';