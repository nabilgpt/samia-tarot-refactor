-- =============================================================================
-- SAMIA TAROT - SYSTEM SECRETS AUTO-POPULATION
-- =============================================================================
-- Auto-populate system_secrets table with all required operational secrets
-- Categories: Payment, AI, Database, WebRTC, Backup, Notification, Security, System

-- Clear existing placeholder data (optional - remove if you want to keep existing)
-- DELETE FROM system_secrets WHERE description LIKE '%placeholder%' OR description LIKE '%example%';

-- =============================================================================
-- PAYMENT GATEWAY SECRETS
-- =============================================================================

-- Stripe Configuration
INSERT INTO system_secrets (config_key, config_value, category, description, is_active, created_at, last_updated) VALUES
('stripe_publishable', 'pk_live_51234567890abcdef_placeholder', 'payment', 'Stripe Publishable Key for frontend integration', true, NOW(), NOW()),
('stripe_secret', 'sk_live_51234567890abcdef_placeholder', 'payment', 'Stripe Secret Key for backend API calls', true, NOW(), NOW()),
('stripe_webhook', 'whsec_1234567890abcdef_placeholder', 'payment', 'Stripe Webhook Secret for event verification', true, NOW(), NOW()),
('stripe_dashboard_url', 'https://dashboard.stripe.com/', 'payment', 'Stripe Dashboard URL for management', true, NOW(), NOW()),

-- Square Configuration
('square_publishable', 'sq0idp-1234567890abcdef_placeholder', 'payment', 'Square Application ID for frontend', true, NOW(), NOW()),
('square_secret', 'EAAAl1234567890abcdef_placeholder', 'payment', 'Square Access Token for API calls', true, NOW(), NOW()),
('square_webhook', 'sq0csp-1234567890abcdef_placeholder', 'payment', 'Square Webhook Signature Key', true, NOW(), NOW()),
('square_dashboard_url', 'https://squareup.com/dashboard/', 'payment', 'Square Dashboard URL', true, NOW(), NOW()),

-- USDT Cryptocurrency
('usdt_wallet_trc20', 'TXabcdef1234567890123456789012345678', 'payment', 'USDT Wallet Address TRC20 Network', true, NOW(), NOW()),
('usdt_wallet_erc20', '0xabcdef1234567890123456789012345678901234', 'payment', 'USDT Wallet Address ERC20 Network', true, NOW(), NOW()),
('usdt_api_key', 'usdt_api_1234567890abcdef_placeholder', 'payment', 'USDT Provider API Key for transactions', true, NOW(), NOW()),
('usdt_explorer_url', 'https://tronscan.org/', 'payment', 'USDT Transaction Explorer URL', true, NOW(), NOW()),

-- =============================================================================
-- AI & MACHINE LEARNING SECRETS
-- =============================================================================

-- OpenAI Configuration
('openai_api_key', 'sk-1234567890abcdefghijklmnopqrstuvwxyz_placeholder', 'ai', 'OpenAI API Key for GPT models', true, NOW(), NOW()),
('openai_org_id', 'org-1234567890abcdef_placeholder', 'ai', 'OpenAI Organization ID', true, NOW(), NOW()),
('openai_default_model', 'gpt-4o', 'ai', 'Default OpenAI Model for AI readings', true, NOW(), NOW()),
('openai_max_tokens', '2000', 'ai', 'Maximum tokens per AI request', true, NOW(), NOW()),

-- Additional AI Services
('anthropic_api_key', 'sk-ant-1234567890abcdef_placeholder', 'ai', 'Anthropic Claude API Key', false, NOW(), NOW()),
('gemini_api_key', 'AIza1234567890abcdef_placeholder', 'ai', 'Google Gemini API Key', false, NOW(), NOW()),

-- =============================================================================
-- DATABASE & BACKEND SECRETS
-- =============================================================================

-- Supabase Configuration
('supabase_url', 'https://abcdefghijklmnop.supabase.co', 'database', 'Supabase Project URL', true, NOW(), NOW()),
('supabase_anon_key', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder', 'database', 'Supabase Anonymous Key for frontend', true, NOW(), NOW()),
('supabase_service_role_key', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.service_placeholder', 'database', 'Supabase Service Role Key for backend', true, NOW(), NOW()),
('supabase_dashboard_url', 'https://supabase.com/dashboard/projects', 'database', 'Supabase Dashboard URL', true, NOW(), NOW()),

-- =============================================================================
-- WEBRTC & COMMUNICATION SECRETS
-- =============================================================================

-- WebRTC Configuration
('webrtc_ice_servers', 'stun:stun1.l.google.com:19302,stun:stun2.l.google.com:19302', 'webrtc', 'WebRTC ICE STUN Servers for video calls', true, NOW(), NOW()),
('webrtc_turn_server', 'turn:turnserver.example.com:3478', 'webrtc', 'WebRTC TURN Server for NAT traversal', false, NOW(), NOW()),
('webrtc_turn_user', 'turnuser_placeholder', 'webrtc', 'WebRTC TURN Server Username', false, NOW(), NOW()),
('webrtc_turn_pass', 'turnpass_placeholder', 'webrtc', 'WebRTC TURN Server Password', false, NOW(), NOW()),

-- =============================================================================
-- BACKUP & STORAGE SECRETS
-- =============================================================================

-- Backup Configuration
('backup_storage_url', 'https://backup.samia-tarot.com/', 'backup', 'Primary Backup Storage URL', true, NOW(), NOW()),
('backup_access_key', 'AKIA1234567890ABCDEF', 'backup', 'Backup Storage Access Key', true, NOW(), NOW()),
('backup_secret_key', 'abcdef1234567890/placeholder/secret', 'backup', 'Backup Storage Secret Key', true, NOW(), NOW()),
('backup_bucket_name', 'samia-tarot-backups', 'backup', 'Backup Storage Bucket Name', true, NOW(), NOW()),
('backup_schedule', '0 2 * * *', 'backup', 'Backup Schedule (Cron Format)', true, NOW(), NOW()),

-- =============================================================================
-- NOTIFICATION & COMMUNICATION SECRETS
-- =============================================================================

-- SendGrid Email
('sendgrid_api_key', 'SG.1234567890abcdef.placeholder_key', 'notification', 'SendGrid API Key for email notifications', true, NOW(), NOW()),
('sendgrid_from_email', 'noreply@samia-tarot.com', 'notification', 'SendGrid From Email Address', true, NOW(), NOW()),
('sendgrid_template_welcome', 'd-1234567890abcdef', 'notification', 'SendGrid Welcome Email Template ID', true, NOW(), NOW()),

-- Twilio SMS
('twilio_sid', 'AC1234567890abcdef1234567890abcdef', 'notification', 'Twilio Account SID for SMS', true, NOW(), NOW()),
('twilio_token', '1234567890abcdef1234567890abcdef', 'notification', 'Twilio Auth Token', true, NOW(), NOW()),
('twilio_phone', '+1234567890', 'notification', 'Twilio Phone Number', true, NOW(), NOW()),

-- =============================================================================
-- SECURITY & AUTHENTICATION SECRETS
-- =============================================================================

-- JWT & Encryption
('jwt_secret', 'samia_tarot_jwt_secret_1234567890abcdef', 'security', 'JWT Secret Key for API authentication', true, NOW(), NOW()),
('jwt_expiry', '24h', 'security', 'JWT Token Expiry Duration', true, NOW(), NOW()),
('encryption_key', 'samia_tarot_encryption_1234567890abcdef', 'security', 'Data Encryption Key', true, NOW(), NOW()),
('password_salt_rounds', '12', 'security', 'Password Hashing Salt Rounds', true, NOW(), NOW()),

-- API Security
('api_rate_limit', '1000', 'security', 'API Rate Limit per hour per IP', true, NOW(), NOW()),
('cors_origins', 'https://samia-tarot.com,https://admin.samia-tarot.com', 'security', 'Allowed CORS Origins', true, NOW(), NOW()),

-- =============================================================================
-- SYSTEM & APPLICATION SECRETS
-- =============================================================================

-- Application Configuration
('app_version', '1.0.0', 'system', 'Current Application Version', true, NOW(), NOW()),
('app_environment', 'production', 'system', 'Application Environment', true, NOW(), NOW()),
('maintenance_mode', 'off', 'system', 'Application Maintenance Mode', true, NOW(), NOW()),
('debug_mode', 'false', 'system', 'Debug Mode Status', true, NOW(), NOW()),

-- Feature Flags
('feature_ai_readings', 'true', 'system', 'Enable AI-powered tarot readings', true, NOW(), NOW()),
('feature_video_calls', 'true', 'system', 'Enable video call functionality', true, NOW(), NOW()),
('feature_crypto_payments', 'true', 'system', 'Enable cryptocurrency payments', true, NOW(), NOW()),
('feature_auto_backup', 'true', 'system', 'Enable automatic backups', true, NOW(), NOW()),

-- =============================================================================
-- MONITORING & ANALYTICS SECRETS
-- =============================================================================

-- Analytics
('google_analytics_id', 'GA-1234567890', 'analytics', 'Google Analytics Tracking ID', true, NOW(), NOW()),
('mixpanel_token', 'abcdef1234567890', 'analytics', 'Mixpanel Analytics Token', false, NOW(), NOW()),

-- Monitoring
('sentry_dsn', 'https://1234567890abcdef@sentry.io/1234567', 'monitoring', 'Sentry Error Tracking DSN', true, NOW(), NOW()),
('uptime_robot_key', 'ur1234567890abcdef', 'monitoring', 'UptimeRobot API Key', false, NOW(), NOW())

ON CONFLICT (config_key) DO UPDATE SET
  config_value = EXCLUDED.config_value,
  description = EXCLUDED.description,
  is_active = EXCLUDED.is_active,
  last_updated = NOW();

-- =============================================================================
-- VERIFICATION QUERY
-- =============================================================================

-- Verify insertion
SELECT 
  category,
  COUNT(*) as secret_count,
  COUNT(CASE WHEN is_active THEN 1 END) as active_count
FROM system_secrets 
GROUP BY category 
ORDER BY category;

-- Show sample of inserted data
SELECT config_key, category, description, is_active 
FROM system_secrets 
ORDER BY category, config_key 
LIMIT 20; 