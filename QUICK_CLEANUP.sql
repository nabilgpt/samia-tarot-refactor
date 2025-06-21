-- ============================================================
-- QUICK CLEANUP - SAMIA TAROT
-- مسح سريع للـ policies المتضاربة
-- ============================================================

-- Drop problematic policies if they exist
DROP POLICY IF EXISTS "vn_select_safe" ON voice_notes;
DROP POLICY IF EXISTS "vn_manage_safe" ON voice_notes;
DROP POLICY IF EXISTS "cs_select_safe" ON chat_sessions;
DROP POLICY IF EXISTS "cs_manage_safe" ON chat_sessions;
DROP POLICY IF EXISTS "cm_select_safe" ON chat_messages;
DROP POLICY IF EXISTS "cm_insert_safe" ON chat_messages;

-- Drop any other conflicting policies
DROP POLICY IF EXISTS "pm_select_v3" ON payment_methods;
DROP POLICY IF EXISTS "wt_select_v3" ON wallet_transactions;
DROP POLICY IF EXISTS "pr_select_v3" ON payment_receipts;

-- Success message
SELECT 'Cleanup completed - ready for SIMPLE_COMPLETE_TABLES.sql' as status; 