#!/usr/bin/env node

/**
 * 🔍 ACCURATE DATABASE TABLE CHECKER
 * Checks all actual tables in Supabase vs expected tables
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://uuseflmielktdcltzwzt.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV1c2VmbG1pZWxrdGRjbHR6d3p0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgzNDUxMTUsImV4cCI6MjA2MzkyMTExNX0.Qcds_caGg7xbe4rl1Z8Rh4Nox79VJWRDabp5_Bt0YOw';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// All possible tables from all SQL files
const possibleTables = [
  // Core system
  'profiles', 'bookings', 'services', 'notifications',
  
  // Auth system  
  'user_profiles', 'user_sessions', 'auth_tokens',
  
  // Tarot system (from enhanced-tarot-spread-system.sql)
  'tarot_decks', 'tarot_spreads', 'tarot_spread_positions', 
  'reader_spreads', 'spread_approval_logs', 'client_tarot_sessions',
  
  // Payment system (from payment SQL files)
  'payment_methods', 'payment_gateway_configs', 'wallet_transactions',
  'wallet_balances', 'transaction_audit', 'payment_sessions',
  'commission_settings', 'refund_requests',
  
  // Call & Emergency system
  'call_sessions', 'call_recordings', 'emergency_call_logs',
  'escalation_logs', 'call_participants', 'emergency_escalations',
  
  // Working hours system
  'reader_schedule', 'working_hours_requests', 'working_hours_audit',
  'booking_window_settings',
  
  // Analytics & Business (from phase3-analytics-business.sql)
  'daily_analytics', 'reader_analytics', 'business_analytics',
  'revenue_analytics', 'platform_commissions', 'reader_earnings',
  'revenue_sharing', 'reader_performance_metrics',
  
  // Chat system (from chat-enhancements.sql)
  'chat_sessions', 'chat_messages', 'voice_notes', 'chat_participants',
  'message_reactions', 'chat_archives',
  
  // Admin & Approval system
  'approval_requests', 'system_settings', 'app_config',
  'admin_actions', 'audit_logs', 'user_feedback',
  
  // AI & Learning (from phase2-tarot-ai.sql)
  'ai_models', 'ai_prompts', 'ai_sessions', 'ai_feedback',
  'learning_paths', 'course_content', 'course_enrollments',
  
  // Advanced features
  'emergency_contacts', 'location_tracking', 'device_registrations',
  'push_notifications', 'email_templates', 'sms_templates',
  'subscription_plans', 'user_subscriptions', 'promotional_codes',
  
  // Storage & Files
  'file_uploads', 'media_storage', 'backup_logs'
];

async function checkTableExists(tableName) {
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1);
    
    if (error && error.code === '42P01') {
      return { exists: false, error: 'Table does not exist' };
    } else if (error) {
      return { exists: false, error: error.message };
    } else {
      return { exists: true, rowCount: data ? data.length : 0 };
    }
  } catch (err) {
    return { exists: false, error: err.message };
  }
}

async function checkAllTables() {
  console.log('🔍 COMPLETE DATABASE TABLE ANALYSIS\n');
  
  const results = {
    existing: [],
    missing: [],
    errors: []
  };
  
  console.log('Checking all possible tables...\n');
  
  for (const tableName of possibleTables) {
    const result = await checkTableExists(tableName);
    
    if (result.exists) {
      results.existing.push(tableName);
      console.log(`✅ ${tableName}`);
    } else if (result.error === 'Table does not exist') {
      results.missing.push(tableName);
      console.log(`❌ ${tableName} (missing)`);
    } else {
      results.errors.push({ table: tableName, error: result.error });
      console.log(`⚠️ ${tableName} (error: ${result.error})`);
    }
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('📊 SUMMARY:');
  console.log(`✅ Existing tables: ${results.existing.length}`);
  console.log(`❌ Missing tables: ${results.missing.length}`);
  console.log(`⚠️ Error tables: ${results.errors.length}`);
  
  console.log('\n📋 EXISTING TABLES:');
  results.existing.forEach(table => console.log(`   • ${table}`));
  
  if (results.missing.length > 0) {
    console.log('\n❌ MISSING TABLES:');
    results.missing.forEach(table => console.log(`   • ${table}`));
  }
  
  if (results.errors.length > 0) {
    console.log('\n⚠️ TABLES WITH ERRORS:');
    results.errors.forEach(error => console.log(`   • ${error.table}: ${error.error}`));
  }
  
  return results;
}

checkAllTables().catch(console.error); 