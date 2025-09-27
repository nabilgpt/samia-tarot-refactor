-- M38 Security Hardening: Remove TikTok Legacy Column
-- Enforces admin-only uploads policy per SAMIA-TAROT-CONTEXT-ENGINEERING-MASTER

-- Remove TikTok column from horoscopes table
ALTER TABLE horoscopes DROP COLUMN IF EXISTS tiktok_post_url;

-- Remove TikTok-related trigger and function (cleanup)
DROP TRIGGER IF EXISTS horoscopes_no_tiktok ON horoscopes;
DROP FUNCTION IF EXISTS deny_tiktok_urls();

-- Add audit entry for TikTok removal
INSERT INTO audit_log (event, entity, entity_id, actor, meta)
VALUES (
  'tiktok_column_removed',
  'horoscopes',
  'schema',
  'system',
  '{"reason": "admin_only_uploads_enforced", "compliance": "M38_security_hardening"}'
);