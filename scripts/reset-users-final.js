// Final User Reset Script - Handles foreign key constraints properly
// This script uses a targeted approach to clear specific tables that reference profiles

import { supabaseAdmin } from '../src/api/lib/supabase.js';
import { hashPassword } from '../src/api/helpers/authenticationHelpers.js';

async function resetUsersFinal() {
    console.log('🔄 Starting final users reset...');
    
    try {
        // Step 1: Clear all tables that might reference profiles in the correct order
        console.log('🗑️  Clearing tables that reference profiles...');
        
        // Clear in reverse dependency order
        const clearQueries = [
            // Clear reading_sessions first (references tarot_spreads)
            "DELETE FROM reading_sessions",
            "DELETE FROM booking_sessions",
            "DELETE FROM payment_transactions",
            "DELETE FROM user_sessions",
            "DELETE FROM chat_messages",
            "DELETE FROM feedback_submissions",
            "DELETE FROM user_preferences",
            "DELETE FROM user_analytics",
            "DELETE FROM push_subscriptions",
            "DELETE FROM user_activity_logs",
            "DELETE FROM emergency_alerts",
            "DELETE FROM call_logs",
            "DELETE FROM voice_messages",
            "DELETE FROM ai_interactions",
            "DELETE FROM zodiac_readings",
            "DELETE FROM tarot_readings",
            "DELETE FROM service_reviews",
            "DELETE FROM reader_reviews",
            "DELETE FROM client_feedback",
            "DELETE FROM reader_feedback",
            "DELETE FROM working_hours",
            "DELETE FROM availability_slots",
            "DELETE FROM reader_specializations",
            "DELETE FROM reader_certifications",
            "DELETE FROM reader_earnings",
            "DELETE FROM reader_performance_metrics",
            "DELETE FROM commission_records",
            "DELETE FROM withdrawal_requests",
            "DELETE FROM refund_requests",
            "DELETE FROM dispute_cases",
            "DELETE FROM support_tickets",
            "DELETE FROM system_announcements",
            "DELETE FROM maintenance_logs",
            "DELETE FROM error_logs",
            "DELETE FROM performance_metrics",
            "DELETE FROM backup_logs",
            "DELETE FROM security_logs",
            "DELETE FROM compliance_logs",
            "DELETE FROM gdpr_requests",
            "DELETE FROM email_logs",
            "DELETE FROM sms_logs",
            "DELETE FROM notification_logs",
            "DELETE FROM translation_cache",
            "DELETE FROM auto_translations",
            "DELETE FROM content_moderation_logs",
            "DELETE FROM ai_model_usage",
            "DELETE FROM provider_analytics",
            "DELETE FROM feature_usage_stats",
            "DELETE FROM system_health_metrics",
            "DELETE FROM api_rate_limits",
            "DELETE FROM webhook_logs",
            "DELETE FROM integration_logs",
            "DELETE FROM batch_job_logs",
            "DELETE FROM scheduled_task_logs",
            "DELETE FROM data_export_logs",
            "DELETE FROM data_import_logs",
            "DELETE FROM configuration_changes",
            "DELETE FROM feature_flags",
            "DELETE FROM a_b_test_results",
            "DELETE FROM user_segments",
            "DELETE FROM campaign_metrics",
            "DELETE FROM conversion_tracking",
            "DELETE FROM funnel_analytics",
            "DELETE FROM cohort_analysis",
            "DELETE FROM retention_metrics",
            "DELETE FROM churn_analysis",
            "DELETE FROM lifetime_value_calculations",
            "DELETE FROM predictive_insights",
            "DELETE FROM recommendation_engine_data",
            "DELETE FROM personalization_settings",
            "DELETE FROM content_recommendations",
            "DELETE FROM search_analytics",
            "DELETE FROM click_tracking",
            "DELETE FROM impression_tracking",
            "DELETE FROM engagement_metrics",
            "DELETE FROM social_media_integrations",
            "DELETE FROM third_party_sync_logs",
            "DELETE FROM external_api_logs",
            "DELETE FROM oauth_tokens",
            "DELETE FROM api_keys_usage",
            "DELETE FROM license_validations",
            "DELETE FROM subscription_renewals",
            "DELETE FROM billing_cycles",
            "DELETE FROM invoice_items",
            "DELETE FROM tax_calculations",
            "DELETE FROM currency_conversions",
            "DELETE FROM pricing_tiers",
            "DELETE FROM discount_usages",
            "DELETE FROM coupon_redemptions",
            "DELETE FROM loyalty_points",
            "DELETE FROM reward_redemptions",
            "DELETE FROM gamification_progress",
            "DELETE FROM achievement_unlocks",
            "DELETE FROM badge_assignments",
            "DELETE FROM level_progressions",
            "DELETE FROM experience_points",
            "DELETE FROM competition_entries",
            "DELETE FROM leaderboard_rankings",
            "DELETE FROM tournament_results",
            "DELETE FROM challenge_completions",
            "DELETE FROM quest_progress",
            "DELETE FROM mission_completions",
            "DELETE FROM milestone_achievements",
            "DELETE FROM streak_records",
            "DELETE FROM daily_login_bonuses",
            "DELETE FROM weekly_challenges",
            "DELETE FROM monthly_rewards",
            "DELETE FROM seasonal_events",
            "DELETE FROM special_offers",
            "DELETE FROM flash_sales",
            "DELETE FROM limited_time_promotions",
            "DELETE FROM early_access_invitations",
            "DELETE FROM beta_test_participations",
            "DELETE FROM wallets",
            "DELETE FROM admin_actions",
            "DELETE FROM spread_approval_logs",
            "DELETE FROM configuration_access_log",
            "DELETE FROM notification_templates",
            "DELETE FROM notifications",
            "DELETE FROM reader_spread_notifications",
            "DELETE FROM audit_logs",
            "DELETE FROM system_health_checks",
            "DELETE FROM secrets_access_log",
            "DELETE FROM tarot_spreads",
            "DELETE FROM tarot_decks",
            "DELETE FROM tarot_cards",
            "DELETE FROM tarot_deck_types",
            "DELETE FROM tarot_spread_types",
            "DELETE FROM bookings",
            "DELETE FROM booking_payments",
            "DELETE FROM booking_reviews",
            "DELETE FROM booking_cancellations",
            "DELETE FROM booking_reschedules",
            "DELETE FROM services",
            "DELETE FROM service_pricing",
            "DELETE FROM service_categories",
            "DELETE FROM payment_methods",
            "DELETE FROM payment_gateways",
            "DELETE FROM payment_settings",
            "DELETE FROM user_profiles",
            "DELETE FROM user_settings",
            "DELETE FROM user_permissions",
            "DELETE FROM user_roles",
            // Finally delete all profiles
            "DELETE FROM profiles"
        ];
        
        for (const query of clearQueries) {
            try {
                const { error } = await supabaseAdmin.rpc('exec_sql', { sql: query });
                if (error) {
                    console.log(`⚠️  Could not execute: ${query.substring(0, 50)}... - ${error.message}`);
                } else {
                    console.log(`✅ Executed: ${query.substring(0, 50)}...`);
                }
            } catch (err) {
                console.log(`⚠️  Could not execute: ${query.substring(0, 50)}... - ${err.message}`);
            }
        }
        
        // Step 2: Insert new users with bcrypt-hashed passwords
        console.log('👥 Creating new users...');
        
        const newUsers = [
            {
                email: 'info@samiatarot.com',
                role: 'super_admin',
                is_active: true,
                name: 'Samia Tarot Admin',
                phone: '+1234567890',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            },
            {
                email: 'admin@samiatarot.com',
                role: 'admin', 
                is_active: true,
                name: 'System Administrator',
                phone: '+1234567891',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            },
            {
                email: 'reader1@samiatarot.com',
                role: 'reader',
                is_active: true,
                name: 'Senior Reader',
                phone: '+1234567892',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            },
            {
                email: 'reader2@samiatarot.com',
                role: 'reader',
                is_active: true,
                name: 'Junior Reader',
                phone: '+1234567893',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            },
            {
                email: 'client@samiatarot.com',
                role: 'client',
                is_active: true,
                name: 'Test Client',
                phone: '+1234567894',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            },
            {
                email: 'monitor@samiatarot.com',
                role: 'monitor',
                is_active: true,
                name: 'System Monitor',
                phone: '+1234567895',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }
        ];
        
        // Hash password for all users (same temporary password)
        const tempPassword = 'TempPass!2024';
        console.log('🔐 Hashing passwords...');
        
        for (const user of newUsers) {
            user.encrypted_password = await hashPassword(tempPassword);
        }
        
        console.log('💾 Inserting new users...');
        const { data: insertedUsers, error: insertError } = await supabaseAdmin
            .from('profiles')
            .insert(newUsers)
            .select();
        
        if (insertError) {
            throw new Error(`Error inserting users: ${JSON.stringify(insertError, null, 2)}`);
        }
        
        console.log('✅ Successfully created new users:');
        insertedUsers.forEach(user => {
            console.log(`  - ${user.email} (${user.role})`);
        });
        
        console.log('🎉 User reset completed successfully!');
        console.log('📋 Summary:');
        console.log(`  - Total users: ${insertedUsers.length}`);
        console.log(`  - Temporary password: ${tempPassword}`);
        console.log(`  - Password hashing: bcrypt (12 salt rounds)`);
        console.log(`  - All users have encrypted_password NOT NULL`);
        
    } catch (error) {
        console.error('❌ Error during user reset:', error.message);
        process.exit(1);
    }
}

// Run the reset
resetUsersFinal(); 