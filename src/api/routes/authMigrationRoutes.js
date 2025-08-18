// =============================================================================
// AUTHENTICATION MIGRATION ROUTES - SAMIA TAROT
// Backend endpoints to apply database schema changes
// =============================================================================

import express from 'express';
import { supabaseAdmin } from '../lib/supabase.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// =============================================================================
// APPLY SCHEMA MIGRATION ENDPOINT
// =============================================================================

router.post('/apply-schema', authenticateToken, async (req, res) => {
    try {
        console.log('🔄 [MIGRATION] Applying authentication schema changes...');
        
        // Only super_admin can run migrations
        if (req.user.role !== 'super_admin') {
            return res.status(403).json({
                success: false,
                error: 'Super admin access required',
                code: 'INSUFFICIENT_PERMISSIONS'
            });
        }

        const results = [];
        
        // Step 1: Add encrypted_password column to profiles table
        console.log('📝 Step 1: Adding encrypted_password column...');
        
        try {
            const { error: addColumnError } = await supabaseAdmin.rpc('exec_sql', {
                sql: `
                    ALTER TABLE profiles 
                    ADD COLUMN IF NOT EXISTS encrypted_password VARCHAR(255) DEFAULT '';
                    
                    ALTER TABLE profiles 
                    ADD COLUMN IF NOT EXISTS password_updated_at TIMESTAMPTZ DEFAULT NOW(),
                    ADD COLUMN IF NOT EXISTS password_reset_token VARCHAR(255),
                    ADD COLUMN IF NOT EXISTS password_reset_expires TIMESTAMPTZ,
                    ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0,
                    ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ,
                    ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ,
                    ADD COLUMN IF NOT EXISTS last_login_ip INET;
                `
            });
            
            if (addColumnError) {
                console.error('❌ Step 1 failed:', addColumnError);
                results.push({ step: 1, success: false, error: addColumnError.message });
            } else {
                console.log('✅ Step 1 completed: Added encrypted_password and metadata columns');
                results.push({ step: 1, success: true, message: 'Added encrypted_password and metadata columns' });
            }
        } catch (error) {
            console.error('❌ Step 1 failed:', error);
            results.push({ step: 1, success: false, error: error.message });
        }

        // Step 2: Create authentication audit log table
        console.log('📝 Step 2: Creating authentication audit log table...');
        
        try {
            const { error: auditLogError } = await supabaseAdmin.rpc('exec_sql', {
                sql: `
                    CREATE TABLE IF NOT EXISTS auth_audit_log (
                        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                        user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
                        email VARCHAR(255) NOT NULL,
                        action VARCHAR(50) NOT NULL,
                        ip_address INET,
                        user_agent TEXT,
                        success BOOLEAN DEFAULT FALSE,
                        failure_reason TEXT,
                        session_id VARCHAR(255),
                        created_at TIMESTAMPTZ DEFAULT NOW(),
                        expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '90 days'
                    );
                    
                    CREATE INDEX IF NOT EXISTS idx_auth_audit_log_user_id ON auth_audit_log(user_id);
                    CREATE INDEX IF NOT EXISTS idx_auth_audit_log_email ON auth_audit_log(email);
                    CREATE INDEX IF NOT EXISTS idx_auth_audit_log_action ON auth_audit_log(action);
                    CREATE INDEX IF NOT EXISTS idx_auth_audit_log_created_at ON auth_audit_log(created_at);
                `
            });
            
            if (auditLogError) {
                console.error('❌ Step 2 failed:', auditLogError);
                results.push({ step: 2, success: false, error: auditLogError.message });
            } else {
                console.log('✅ Step 2 completed: Created authentication audit log table');
                results.push({ step: 2, success: true, message: 'Created authentication audit log table' });
            }
        } catch (error) {
            console.error('❌ Step 2 failed:', error);
            results.push({ step: 2, success: false, error: error.message });
        }

        // Step 3: Create migration log table
        console.log('📝 Step 3: Creating migration log table...');
        
        try {
            const { error: migrationLogError } = await supabaseAdmin.rpc('exec_sql', {
                sql: `
                    CREATE TABLE IF NOT EXISTS auth_migration_log (
                        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                        migration_step VARCHAR(100) NOT NULL,
                        description TEXT,
                        affected_users INTEGER DEFAULT 0,
                        status VARCHAR(20) DEFAULT 'completed',
                        error_message TEXT,
                        created_at TIMESTAMPTZ DEFAULT NOW()
                    );
                `
            });
            
            if (migrationLogError) {
                console.error('❌ Step 3 failed:', migrationLogError);
                results.push({ step: 3, success: false, error: migrationLogError.message });
            } else {
                console.log('✅ Step 3 completed: Created migration log table');
                results.push({ step: 3, success: true, message: 'Created migration log table' });
            }
        } catch (error) {
            console.error('❌ Step 3 failed:', error);
            results.push({ step: 3, success: false, error: error.message });
        }

        // Step 4: Create performance indexes
        console.log('📝 Step 4: Creating performance indexes...');
        
        try {
            const { error: indexError } = await supabaseAdmin.rpc('exec_sql', {
                sql: `
                    CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
                    CREATE INDEX IF NOT EXISTS idx_profiles_email_active ON profiles(email, is_active);
                    CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
                    CREATE INDEX IF NOT EXISTS idx_profiles_password_reset_token ON profiles(password_reset_token);
                    CREATE INDEX IF NOT EXISTS idx_profiles_locked_until ON profiles(locked_until);
                `
            });
            
            if (indexError) {
                console.error('❌ Step 4 failed:', indexError);
                results.push({ step: 4, success: false, error: indexError.message });
            } else {
                console.log('✅ Step 4 completed: Created performance indexes');
                results.push({ step: 4, success: true, message: 'Created performance indexes' });
            }
        } catch (error) {
            console.error('❌ Step 4 failed:', error);
            results.push({ step: 4, success: false, error: error.message });
        }

        // Log the migration
        try {
            await supabaseAdmin
                .from('auth_migration_log')
                .insert([{
                    migration_step: 'database_schema_migration',
                    description: 'Applied authentication system schema changes',
                    affected_users: 0,
                    status: results.every(r => r.success) ? 'completed' : 'partial'
                }]);
        } catch (logError) {
            console.warn('⚠️  Could not log migration:', logError);
        }

        const successCount = results.filter(r => r.success).length;
        const totalSteps = results.length;

        console.log(`🎉 Migration completed: ${successCount}/${totalSteps} steps successful`);

        res.json({
            success: successCount === totalSteps,
            message: `Authentication schema migration completed: ${successCount}/${totalSteps} steps successful`,
            results: results,
            next_steps: [
                'Run user migration script to fix existing users',
                'Test the new authentication system',
                'Add final NOT NULL constraint to encrypted_password'
            ]
        });

    } catch (error) {
        console.error('❌ [MIGRATION] Schema migration failed:', error);
        
        res.status(500).json({
            success: false,
            error: 'Schema migration failed',
            details: error.message
        });
    }
});

// =============================================================================
// CHECK MIGRATION STATUS ENDPOINT
// =============================================================================

router.get('/status', authenticateToken, async (req, res) => {
    try {
        // Check if encrypted_password column exists
        const { data: columns } = await supabaseAdmin
            .from('information_schema.columns')
            .select('column_name')
            .eq('table_name', 'profiles')
            .eq('column_name', 'encrypted_password');

        const hasEncryptedPassword = columns && columns.length > 0;

        // Check if audit log table exists
        const { data: auditLogData, error: auditLogError } = await supabaseAdmin
            .from('auth_audit_log')
            .select('id')
            .limit(1);

        const hasAuditLog = !auditLogError;

        // Check if migration log table exists
        const { data: migrationLogData, error: migrationLogError } = await supabaseAdmin
            .from('auth_migration_log')
            .select('id')
            .limit(1);

        const hasMigrationLog = !migrationLogError;

        // Count users without encrypted passwords
        const { data: usersWithoutPassword, error: usersError } = await supabaseAdmin
            .from('profiles')
            .select('id, email')
            .or('encrypted_password.is.null,encrypted_password.eq.')
            .limit(10);

        const usersMissingPasswords = usersWithoutPassword ? usersWithoutPassword.length : 0;

        res.json({
            success: true,
            migration_status: {
                encrypted_password_column: hasEncryptedPassword,
                audit_log_table: hasAuditLog,
                migration_log_table: hasMigrationLog,
                users_missing_passwords: usersMissingPasswords,
                schema_migration_complete: hasEncryptedPassword && hasAuditLog && hasMigrationLog,
                ready_for_user_migration: hasEncryptedPassword && usersMissingPasswords > 0
            }
        });

    } catch (error) {
        console.error('❌ [MIGRATION] Status check failed:', error);
        
        res.status(500).json({
            success: false,
            error: 'Status check failed',
            details: error.message
        });
    }
});

export default router; 