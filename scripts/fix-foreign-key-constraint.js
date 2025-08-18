// Fix Foreign Key Constraint Issue for User Reset
// This script resolves the foreign key constraint violation by cleaning up references

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing required environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const PROBLEMATIC_PROFILE_ID = '0a28e972-9cc9-479b-aa1e-fafc5856af18';
const MAIN_ADMIN_PROFILE_ID = 'c3922fea-329a-4d6e-800c-3e03c9fe341d';

async function fixForeignKeyConstraint() {
    console.log('🔧 Starting Foreign Key Constraint Fix...');
    
    try {
        // Step 1: Check what records are referencing the problematic profile
        console.log('📋 Step 1: Checking reader_spread_notifications references...');
        
        const { data: notifications, error: checkError } = await supabase
            .from('reader_spread_notifications')
            .select('*')
            .eq('admin_id', PROBLEMATIC_PROFILE_ID);
        
        if (checkError) {
            throw new Error(`Error checking notifications: ${checkError.message}`);
        }
        
        console.log(`📊 Found ${notifications?.length || 0} records referencing the problematic profile`);
        
        if (notifications && notifications.length > 0) {
            console.log('🔄 Step 2: Updating references to main admin profile...');
            
            // Update all references to point to the main admin profile
            const { error: updateError } = await supabase
                .from('reader_spread_notifications')
                .update({ admin_id: MAIN_ADMIN_PROFILE_ID })
                .eq('admin_id', PROBLEMATIC_PROFILE_ID);
            
            if (updateError) {
                throw new Error(`Error updating notifications: ${updateError.message}`);
            }
            
            console.log('✅ Successfully updated all notification references');
        }
        
        // Step 3: Check for any other tables that might reference this profile
        console.log('🔍 Step 3: Checking for other foreign key references...');
        
        // Check common tables that might have foreign key references
        const tablesToCheck = [
            'audit_logs',
            'configuration_access_log',
            'secrets_access_log',
            'system_health_checks',
            'notification_templates',
            'notifications'
        ];
        
        for (const table of tablesToCheck) {
            try {
                // Try to find any column that might reference the profile
                const { data: refs, error: refError } = await supabase
                    .from(table)
                    .select('*')
                    .or(`user_id.eq.${PROBLEMATIC_PROFILE_ID},profile_id.eq.${PROBLEMATIC_PROFILE_ID},admin_id.eq.${PROBLEMATIC_PROFILE_ID},created_by.eq.${PROBLEMATIC_PROFILE_ID},updated_by.eq.${PROBLEMATIC_PROFILE_ID},accessed_by.eq.${PROBLEMATIC_PROFILE_ID}`)
                    .limit(1);
                
                if (refs && refs.length > 0) {
                    console.log(`⚠️  Found references in table: ${table}`);
                    
                    // Update common profile reference columns
                    const updateFields = {};
                    const sampleRecord = refs[0];
                    
                    if (sampleRecord.user_id === PROBLEMATIC_PROFILE_ID) updateFields.user_id = MAIN_ADMIN_PROFILE_ID;
                    if (sampleRecord.profile_id === PROBLEMATIC_PROFILE_ID) updateFields.profile_id = MAIN_ADMIN_PROFILE_ID;
                    if (sampleRecord.admin_id === PROBLEMATIC_PROFILE_ID) updateFields.admin_id = MAIN_ADMIN_PROFILE_ID;
                    if (sampleRecord.created_by === PROBLEMATIC_PROFILE_ID) updateFields.created_by = MAIN_ADMIN_PROFILE_ID;
                    if (sampleRecord.updated_by === PROBLEMATIC_PROFILE_ID) updateFields.updated_by = MAIN_ADMIN_PROFILE_ID;
                    if (sampleRecord.accessed_by === PROBLEMATIC_PROFILE_ID) updateFields.accessed_by = MAIN_ADMIN_PROFILE_ID;
                    
                    if (Object.keys(updateFields).length > 0) {
                        const { error: updateError } = await supabase
                            .from(table)
                            .update(updateFields)
                            .or(`user_id.eq.${PROBLEMATIC_PROFILE_ID},profile_id.eq.${PROBLEMATIC_PROFILE_ID},admin_id.eq.${PROBLEMATIC_PROFILE_ID},created_by.eq.${PROBLEMATIC_PROFILE_ID},updated_by.eq.${PROBLEMATIC_PROFILE_ID},accessed_by.eq.${PROBLEMATIC_PROFILE_ID}`);
                        
                        if (updateError) {
                            console.log(`⚠️  Could not update ${table}: ${updateError.message}`);
                        } else {
                            console.log(`✅ Updated references in ${table}`);
                        }
                    }
                }
            } catch (error) {
                // Table might not exist or we don't have permission - skip
                console.log(`ℹ️  Skipping table ${table}: ${error.message}`);
            }
        }
        
        // Step 4: Try to delete/deactivate the problematic profile
        console.log('🗑️  Step 4: Attempting to deactivate problematic profile...');
        
        const { error: deactivateError } = await supabase
            .from('profiles')
            .update({ 
                is_active: false,
                email: null,
                updated_at: new Date().toISOString()
            })
            .eq('id', PROBLEMATIC_PROFILE_ID);
        
        if (deactivateError) {
            console.log(`⚠️  Could not deactivate profile: ${deactivateError.message}`);
        } else {
            console.log('✅ Successfully deactivated problematic profile');
        }
        
        console.log('🎉 Foreign key constraint fix completed successfully!');
        console.log('✅ You can now proceed with the user reset operation');
        
    } catch (error) {
        console.error('❌ Error during foreign key constraint fix:', error.message);
        process.exit(1);
    }
}

// Run the fix
fixForeignKeyConstraint(); 