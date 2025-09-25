-- M42 Security Audit Snapshot
-- Runs nightly to check critical security configurations
-- Results trigger GitHub issues if drift detected

\echo '=== SAMIA TAROT Security Audit Snapshot ==='
\echo 'Timestamp:' `date -u`
\echo ''

-- 1. RLS Configuration Audit
\echo '1. Row Level Security (RLS) Configuration:'
\echo '========================================='

SELECT
    schemaname,
    tablename,
    CASE WHEN rowsecurity THEN 'ENABLED' ELSE 'DISABLED' END as rls_status,
    CASE WHEN forcerowsecurity THEN 'FORCE' ELSE 'NORMAL' END as force_status,
    CASE
        WHEN rowsecurity AND forcerowsecurity THEN '✅ SECURE'
        WHEN rowsecurity AND NOT forcerowsecurity THEN '⚠️  RLS_ONLY'
        ELSE '❌ INSECURE'
    END as security_assessment
FROM pg_tables t
LEFT JOIN pg_class c ON c.relname = t.tablename
LEFT JOIN pg_namespace n ON c.relnamespace = n.oid AND n.nspname = t.schemaname
WHERE schemaname = 'public'
AND tablename IN (
    'profiles', 'orders', 'wa_messages', 'wa_templates', 'wa_conversations',
    'wa_automation_flows', 'wa_media_signatures', 'siren_incidents',
    'siren_events', 'siren_policies', 'siren_templates'
)
ORDER BY security_assessment DESC, tablename;

\echo ''

-- 2. RLS Policy Count
\echo '2. RLS Policy Coverage:'
\echo '======================'

SELECT
    schemaname,
    tablename,
    COUNT(pol.policyname) as policy_count,
    CASE
        WHEN COUNT(pol.policyname) >= 2 THEN '✅ GOOD'
        WHEN COUNT(pol.policyname) = 1 THEN '⚠️  MINIMAL'
        ELSE '❌ NO_POLICIES'
    END as coverage_status
FROM pg_tables t
LEFT JOIN pg_policies pol ON pol.schemaname = t.schemaname AND pol.tablename = t.tablename
WHERE t.schemaname = 'public'
AND t.tablename IN (
    'profiles', 'orders', 'wa_messages', 'wa_templates', 'wa_conversations',
    'wa_automation_flows', 'wa_media_signatures', 'siren_incidents',
    'siren_events', 'siren_policies', 'siren_templates'
)
GROUP BY t.schemaname, t.tablename
ORDER BY policy_count DESC, t.tablename;

\echo ''

-- 3. Security Definer Functions Audit
\echo '3. Security Definer Functions:'
\echo '============================='

SELECT
    proname as function_name,
    prosecdef as is_security_definer,
    CASE
        WHEN prosecdef AND proconfig @> ARRAY['search_path=public'] THEN '✅ SAFE'
        WHEN prosecdef THEN '⚠️  CHECK_SEARCH_PATH'
        ELSE '✅ INVOKER'
    END as security_status,
    proconfig as configuration
FROM pg_proc
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
AND prosecdef = true
ORDER BY security_status DESC, proname;

\echo ''

-- 4. Critical System Functions
\echo '4. Critical System Functions Integrity:'
\echo '======================================'

SELECT
    routine_name,
    routine_type,
    security_type,
    CASE
        WHEN routine_name LIKE '%_wa_%' THEN 'WhatsApp (M41)'
        WHEN routine_name LIKE '%siren%' THEN 'Siren (M40)'
        WHEN routine_name LIKE '%audit%' THEN 'Audit Trail'
        WHEN routine_name LIKE '%verify%' THEN 'Verification'
        ELSE 'Other'
    END as system_category
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN (
    'update_wa_conversation',
    'can_send_freeform_wa',
    'log_wa_audit',
    'log_siren_audit',
    'cleanup_expired_wa_media'
)
ORDER BY system_category, routine_name;

\echo ''

-- 5. Audit Trail Health
\echo '5. Audit Trail Health (Last 24h):'
\echo '================================='

SELECT
    DATE_TRUNC('hour', created_at) as hour,
    COUNT(*) as audit_entries,
    COUNT(DISTINCT actor) as unique_actors,
    COUNT(DISTINCT entity) as unique_entities,
    CASE
        WHEN COUNT(*) > 0 THEN '✅ ACTIVE'
        ELSE '❌ SILENT'
    END as status
FROM audit_log
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY DATE_TRUNC('hour', created_at)
ORDER BY hour DESC
LIMIT 24;

\echo ''

-- 6. Critical System Health Indicators
\echo '6. System Health Indicators:'
\echo '============================'

WITH health_check AS (
    SELECT
        'Active Profiles' as metric,
        COUNT(*)::text as value,
        CASE WHEN COUNT(*) > 0 THEN '✅' ELSE '❌' END as status
    FROM profiles
    WHERE created_at > NOW() - INTERVAL '30 days'

    UNION ALL

    SELECT
        'Verified Phones' as metric,
        COUNT(*)::text as value,
        CASE WHEN COUNT(*) > 0 THEN '✅' ELSE '⚠️' END as status
    FROM profiles
    WHERE phone_verified = true

    UNION ALL

    SELECT
        'Active Siren Policies' as metric,
        COUNT(*)::text as value,
        CASE WHEN COUNT(*) >= 1 THEN '✅' ELSE '❌' END as status
    FROM siren_policies
    WHERE enabled = true

    UNION ALL

    SELECT
        'WhatsApp Templates' as metric,
        COUNT(*)::text as value,
        CASE WHEN COUNT(*) >= 3 THEN '✅' ELSE '⚠️' END as status
    FROM wa_templates
    WHERE approval_status = 'approved'

    UNION ALL

    SELECT
        'Recent Orders' as metric,
        COUNT(*)::text as value,
        CASE WHEN COUNT(*) >= 0 THEN '✅' ELSE '❌' END as status
    FROM orders
    WHERE created_at > NOW() - INTERVAL '7 days'
)
SELECT
    metric,
    value,
    status,
    CASE
        WHEN status = '✅' THEN 'HEALTHY'
        WHEN status = '⚠️' THEN 'WARNING'
        ELSE 'CRITICAL'
    END as assessment
FROM health_check
ORDER BY
    CASE status
        WHEN '❌' THEN 1
        WHEN '⚠️' THEN 2
        WHEN '✅' THEN 3
    END,
    metric;

\echo ''

-- 7. Permission Drift Detection
\echo '7. Permission Drift Detection:'
\echo '============================='

SELECT
    grantee,
    table_schema,
    table_name,
    privilege_type,
    is_grantable,
    CASE
        WHEN grantee IN ('postgres', 'supabase_admin') THEN '✅ SYSTEM'
        WHEN grantee LIKE 'service_%' THEN '✅ SERVICE'
        WHEN privilege_type IN ('SELECT', 'INSERT', 'UPDATE', 'DELETE') THEN '⚠️  CHECK'
        ELSE '❌ REVIEW'
    END as risk_level
FROM information_schema.table_privileges
WHERE table_schema = 'public'
AND table_name IN (
    'profiles', 'orders', 'wa_messages', 'siren_incidents'
)
AND grantee NOT IN ('PUBLIC')
ORDER BY
    CASE risk_level
        WHEN '❌ REVIEW' THEN 1
        WHEN '⚠️  CHECK' THEN 2
        WHEN '✅ SERVICE' THEN 3
        WHEN '✅ SYSTEM' THEN 4
    END,
    table_name,
    grantee;

\echo ''

-- 8. Configuration Drift Summary
\echo '8. Security Configuration Summary:'
\echo '================================='

WITH security_summary AS (
    -- RLS Coverage
    SELECT
        'RLS Coverage' as check_type,
        COUNT(CASE WHEN c.relrowsecurity AND c.relforcerowsecurity THEN 1 END) as secure_count,
        COUNT(*) as total_count,
        CASE
            WHEN COUNT(CASE WHEN c.relrowsecurity AND c.relforcerowsecurity THEN 1 END) = COUNT(*) THEN 'PASS'
            ELSE 'FAIL'
        END as status
    FROM pg_tables t
    LEFT JOIN pg_class c ON c.relname = t.tablename
    LEFT JOIN pg_namespace n ON c.relnamespace = n.oid AND n.nspname = t.schemaname
    WHERE t.schemaname = 'public'
    AND t.tablename IN (
        'profiles', 'orders', 'wa_messages', 'wa_templates', 'wa_conversations',
        'wa_automation_flows', 'wa_media_signatures', 'siren_incidents',
        'siren_events', 'siren_policies', 'siren_templates'
    )

    UNION ALL

    -- Audit Functions
    SELECT
        'Audit Functions' as check_type,
        COUNT(*) as secure_count,
        4 as total_count,  -- Expected audit functions
        CASE WHEN COUNT(*) >= 4 THEN 'PASS' ELSE 'FAIL' END as status
    FROM pg_proc
    WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    AND proname LIKE '%audit%'

    UNION ALL

    -- Recent Audit Activity
    SELECT
        'Audit Activity' as check_type,
        COUNT(*) as secure_count,
        1 as total_count,
        CASE WHEN COUNT(*) > 0 THEN 'PASS' ELSE 'FAIL' END as status
    FROM audit_log
    WHERE created_at > NOW() - INTERVAL '1 hour'
)
SELECT
    check_type,
    secure_count || '/' || total_count as coverage,
    status,
    CASE
        WHEN status = 'PASS' THEN '✅ COMPLIANT'
        ELSE '❌ DRIFT_DETECTED'
    END as compliance_status
FROM security_summary
ORDER BY status, check_type;

\echo ''
\echo '=== End of Security Audit Snapshot ==='
\echo ''

-- Return summary for CI processing
SELECT
    COUNT(CASE WHEN status = 'FAIL' THEN 1 END) as failures,
    COUNT(CASE WHEN status = 'PASS' THEN 1 END) as passes,
    CASE
        WHEN COUNT(CASE WHEN status = 'FAIL' THEN 1 END) = 0 THEN 'AUDIT_PASS'
        ELSE 'AUDIT_FAIL'
    END as overall_status
FROM (
    -- RLS Coverage Check
    SELECT
        CASE
            WHEN COUNT(CASE WHEN c.relrowsecurity AND c.relforcerowsecurity THEN 1 END) = COUNT(*) THEN 'PASS'
            ELSE 'FAIL'
        END as status
    FROM pg_tables t
    LEFT JOIN pg_class c ON c.relname = t.tablename
    LEFT JOIN pg_namespace n ON c.relnamespace = n.oid AND n.nspname = t.schemaname
    WHERE t.schemaname = 'public'
    AND t.tablename IN (
        'profiles', 'orders', 'wa_messages', 'wa_templates', 'wa_conversations',
        'wa_automation_flows', 'wa_media_signatures', 'siren_incidents',
        'siren_events', 'siren_policies', 'siren_templates'
    )

    UNION ALL

    -- Audit Activity Check
    SELECT
        CASE WHEN COUNT(*) > 0 THEN 'PASS' ELSE 'FAIL' END as status
    FROM audit_log
    WHERE created_at > NOW() - INTERVAL '1 hour'
) audit_results;