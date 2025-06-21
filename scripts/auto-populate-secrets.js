#!/usr/bin/env node

/**
 * SAMIA TAROT - System Secrets Auto-Population Script
 * 
 * This script auto-populates the system_secrets table with all required
 * operational secrets for the SAMIA TAROT platform.
 * 
 * Usage: node scripts/auto-populate-secrets.js
 */

const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

// Import Supabase client
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase configuration in environment variables');
  console.error('Required: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Default system secrets template
const defaultSecrets = [
  // Payment Gateway Secrets
  { config_key: 'stripe_publishable', config_value: 'pk_live_placeholder_replace_with_real_key', category: 'payment', description: 'Stripe Publishable Key for frontend integration' },
  { config_key: 'stripe_secret', config_value: 'sk_live_placeholder_replace_with_real_key', category: 'payment', description: 'Stripe Secret Key for backend API calls' },
  { config_key: 'stripe_webhook', config_value: 'whsec_placeholder_replace_with_real_key', category: 'payment', description: 'Stripe Webhook Secret for event verification' },
  { config_key: 'stripe_dashboard_url', config_value: 'https://dashboard.stripe.com/', category: 'payment', description: 'Stripe Dashboard URL for management' },
  
  { config_key: 'square_publishable', config_value: 'sq0idp-placeholder_replace_with_real_key', category: 'payment', description: 'Square Application ID for frontend' },
  { config_key: 'square_secret', config_value: 'EAAAl_placeholder_replace_with_real_key', category: 'payment', description: 'Square Access Token for API calls' },
  { config_key: 'square_webhook', config_value: 'sq0csp-placeholder_replace_with_real_key', category: 'payment', description: 'Square Webhook Signature Key' },
  { config_key: 'square_dashboard_url', config_value: 'https://squareup.com/dashboard/', category: 'payment', description: 'Square Dashboard URL' },
  
  { config_key: 'usdt_wallet_trc20', config_value: 'TXplaceholder_replace_with_real_wallet', category: 'payment', description: 'USDT Wallet Address TRC20 Network' },
  { config_key: 'usdt_wallet_erc20', config_value: '0xplaceholder_replace_with_real_wallet', category: 'payment', description: 'USDT Wallet Address ERC20 Network' },
  { config_key: 'usdt_api_key', config_value: 'usdt_api_placeholder_replace_with_real_key', category: 'payment', description: 'USDT Provider API Key for transactions' },
  { config_key: 'usdt_explorer_url', config_value: 'https://tronscan.org/', category: 'payment', description: 'USDT Transaction Explorer URL' },
  
  // AI & Machine Learning Secrets
  { config_key: 'openai_api_key', config_value: 'sk-placeholder_replace_with_real_openai_key', category: 'ai', description: 'OpenAI API Key for GPT models' },
  { config_key: 'openai_org_id', config_value: 'org-placeholder_replace_with_real_org_id', category: 'ai', description: 'OpenAI Organization ID' },
  { config_key: 'openai_default_model', config_value: 'gpt-4o', category: 'ai', description: 'Default OpenAI Model for AI readings' },
  { config_key: 'openai_max_tokens', config_value: '2000', category: 'ai', description: 'Maximum tokens per AI request' },
  
  { config_key: 'anthropic_api_key', config_value: 'sk-ant-placeholder_replace_with_real_key', category: 'ai', description: 'Anthropic Claude API Key', is_active: false },
  { config_key: 'gemini_api_key', config_value: 'AIza_placeholder_replace_with_real_key', category: 'ai', description: 'Google Gemini API Key', is_active: false },
  
  // Database & Backend Secrets
  { config_key: 'supabase_url', config_value: supabaseUrl, category: 'database', description: 'Supabase Project URL' },
  { config_key: 'supabase_anon_key', config_value: process.env.SUPABASE_ANON_KEY || 'placeholder_replace_with_real_anon_key', category: 'database', description: 'Supabase Anonymous Key for frontend' },
  { config_key: 'supabase_service_role_key', config_value: 'placeholder_replace_with_real_service_key', category: 'database', description: 'Supabase Service Role Key for backend' },
  { config_key: 'supabase_dashboard_url', config_value: 'https://supabase.com/dashboard/projects', category: 'database', description: 'Supabase Dashboard URL' },
  
  // WebRTC & Communication Secrets
  { config_key: 'webrtc_ice_servers', config_value: 'stun:stun1.l.google.com:19302,stun:stun2.l.google.com:19302', category: 'webrtc', description: 'WebRTC ICE STUN Servers for video calls' },
  { config_key: 'webrtc_turn_server', config_value: 'turn:turnserver.example.com:3478', category: 'webrtc', description: 'WebRTC TURN Server for NAT traversal', is_active: false },
  { config_key: 'webrtc_turn_user', config_value: 'turnuser_placeholder', category: 'webrtc', description: 'WebRTC TURN Server Username', is_active: false },
  { config_key: 'webrtc_turn_pass', config_value: 'turnpass_placeholder', category: 'webrtc', description: 'WebRTC TURN Server Password', is_active: false },
  
  // Backup & Storage Secrets
  { config_key: 'backup_storage_url', config_value: 'https://backup.samia-tarot.com/', category: 'backup', description: 'Primary Backup Storage URL' },
  { config_key: 'backup_access_key', config_value: 'AKIA_placeholder_replace_with_real_key', category: 'backup', description: 'Backup Storage Access Key' },
  { config_key: 'backup_secret_key', config_value: 'placeholder_replace_with_real_secret_key', category: 'backup', description: 'Backup Storage Secret Key' },
  { config_key: 'backup_bucket_name', config_value: 'samia-tarot-backups', category: 'backup', description: 'Backup Storage Bucket Name' },
  { config_key: 'backup_schedule', config_value: '0 2 * * *', category: 'backup', description: 'Backup Schedule (Cron Format)' },
  
  // Notification & Communication Secrets
  { config_key: 'sendgrid_api_key', config_value: 'SG.placeholder_replace_with_real_sendgrid_key', category: 'notification', description: 'SendGrid API Key for email notifications' },
  { config_key: 'sendgrid_from_email', config_value: 'noreply@samia-tarot.com', category: 'notification', description: 'SendGrid From Email Address' },
  { config_key: 'sendgrid_template_welcome', config_value: 'd-placeholder_template_id', category: 'notification', description: 'SendGrid Welcome Email Template ID' },
  
  { config_key: 'twilio_sid', config_value: 'AC_placeholder_replace_with_real_sid', category: 'notification', description: 'Twilio Account SID for SMS' },
  { config_key: 'twilio_token', config_value: 'placeholder_replace_with_real_token', category: 'notification', description: 'Twilio Auth Token' },
  { config_key: 'twilio_phone', config_value: '+1234567890', category: 'notification', description: 'Twilio Phone Number' },
  
  // Security & Authentication Secrets
  { config_key: 'jwt_secret', config_value: 'samia_tarot_jwt_secret_replace_with_secure_random_string', category: 'security', description: 'JWT Secret Key for API authentication' },
  { config_key: 'jwt_expiry', config_value: '24h', category: 'security', description: 'JWT Token Expiry Duration' },
  { config_key: 'encryption_key', config_value: 'samia_tarot_encryption_replace_with_secure_random_string', category: 'security', description: 'Data Encryption Key' },
  { config_key: 'password_salt_rounds', config_value: '12', category: 'security', description: 'Password Hashing Salt Rounds' },
  
  { config_key: 'api_rate_limit', config_value: '1000', category: 'security', description: 'API Rate Limit per hour per IP' },
  { config_key: 'cors_origins', config_value: 'https://samia-tarot.com,https://admin.samia-tarot.com', category: 'security', description: 'Allowed CORS Origins' },
  
  // System & Application Secrets
  { config_key: 'app_version', config_value: '1.0.0', category: 'system', description: 'Current Application Version' },
  { config_key: 'app_environment', config_value: 'production', category: 'system', description: 'Application Environment' },
  { config_key: 'maintenance_mode', config_value: 'off', category: 'system', description: 'Application Maintenance Mode' },
  { config_key: 'debug_mode', config_value: 'false', category: 'system', description: 'Debug Mode Status' },
  
  { config_key: 'feature_ai_readings', config_value: 'true', category: 'system', description: 'Enable AI-powered tarot readings' },
  { config_key: 'feature_video_calls', config_value: 'true', category: 'system', description: 'Enable video call functionality' },
  { config_key: 'feature_crypto_payments', config_value: 'true', category: 'system', description: 'Enable cryptocurrency payments' },
  { config_key: 'feature_auto_backup', config_value: 'true', category: 'system', description: 'Enable automatic backups' },
  
  // Monitoring & Analytics Secrets
  { config_key: 'google_analytics_id', config_value: 'GA-placeholder_replace_with_real_id', category: 'analytics', description: 'Google Analytics Tracking ID' },
  { config_key: 'mixpanel_token', config_value: 'placeholder_replace_with_real_token', category: 'analytics', description: 'Mixpanel Analytics Token', is_active: false },
  
  { config_key: 'sentry_dsn', config_value: 'https://placeholder@sentry.io/placeholder', category: 'monitoring', description: 'Sentry Error Tracking DSN' },
  { config_key: 'uptime_robot_key', config_value: 'ur_placeholder_replace_with_real_key', category: 'monitoring', description: 'UptimeRobot API Key', is_active: false }
];

async function populateSecrets(overwrite = false) {
  console.log('🌟 SAMIA TAROT - System Secrets Auto-Population');
  console.log('============================================================');
  console.log(`🔍 Populating ${defaultSecrets.length} system secrets...`);
  
  const results = {
    created: 0,
    updated: 0,
    skipped: 0,
    errors: []
  };

  for (const secret of defaultSecrets) {
    try {
      // Check if secret already exists
      const { data: existing, error: checkError } = await supabase
        .from('system_secrets')
        .select('id')
        .eq('config_key', secret.config_key)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        // Error other than "not found"
        results.errors.push(`Check failed for ${secret.config_key}: ${checkError.message}`);
        continue;
      }

      if (existing && !overwrite) {
        results.skipped++;
        console.log(`⏭️  Skipped: ${secret.config_key} (already exists)`);
        continue;
      }

      const secretData = {
        config_key: secret.config_key,
        config_value: secret.config_value,
        category: secret.category,
        description: secret.description,
        is_active: secret.is_active !== undefined ? secret.is_active : true,
        created_at: new Date().toISOString(),
        last_updated: new Date().toISOString()
      };

      if (existing && overwrite) {
        // Update existing secret
        const { error: updateError } = await supabase
          .from('system_secrets')
          .update({
            config_value: secretData.config_value,
            category: secretData.category,
            description: secretData.description,
            is_active: secretData.is_active,
            last_updated: secretData.last_updated
          })
          .eq('id', existing.id);

        if (updateError) {
          results.errors.push(`Update failed for ${secret.config_key}: ${updateError.message}`);
        } else {
          results.updated++;
          console.log(`✅ Updated: ${secret.config_key}`);
        }
      } else {
        // Create new secret
        const { error: insertError } = await supabase
          .from('system_secrets')
          .insert(secretData);

        if (insertError) {
          results.errors.push(`Create failed for ${secret.config_key}: ${insertError.message}`);
        } else {
          results.created++;
          console.log(`✅ Created: ${secret.config_key}`);
        }
      }
    } catch (error) {
      results.errors.push(`Processing failed for ${secret.config_key}: ${error.message}`);
    }
  }

  console.log('\n============================================================');
  console.log('📊 POPULATION RESULTS:');
  console.log(`✅ Created: ${results.created}`);
  console.log(`🔄 Updated: ${results.updated}`);
  console.log(`⏭️  Skipped: ${results.skipped}`);
  console.log(`❌ Errors: ${results.errors.length}`);

  if (results.errors.length > 0) {
    console.log('\n❌ ERRORS:');
    results.errors.forEach(error => console.log(`   ${error}`));
  }

  console.log('\n🎉 System secrets auto-population completed!');
  console.log('============================================================');

  return results;
}

// Main execution
async function main() {
  try {
    const overwrite = process.argv.includes('--overwrite');
    
    if (overwrite) {
      console.log('⚠️  OVERWRITE MODE: Existing secrets will be updated');
    }

    await populateSecrets(overwrite);
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { populateSecrets, defaultSecrets }; 