#!/usr/bin/env node

/**
 * Check Notification Tables Structure
 * Investigates the actual current structure of notification tables
 */

import { createClient } from '@supabase/supabase-js';

// Load environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing required environment variables');
    console.error('Required: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkTableStructure() {
    console.log('🔍 Checking notification tables structure...\n');

    try {
        // Check if notification_templates table exists and get its structure
        console.log('📋 Checking notification_templates table structure:');
        const { data: templatesColumns, error: templatesError } = await supabase
            .rpc('sql', {
                query: `
                    SELECT column_name, data_type, is_nullable, column_default
                    FROM information_schema.columns 
                    WHERE table_name = 'notification_templates' 
                    ORDER BY ordinal_position;
                `
            });

        if (templatesError) {
            console.log('❌ Error checking notification_templates:', templatesError.message);
        } else if (!templatesColumns || templatesColumns.length === 0) {
            console.log('⚠️  notification_templates table does not exist');
        } else {
            console.log('✅ notification_templates table structure:');
            templatesColumns.forEach(col => {
                console.log(`   - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
            });
        }

        console.log('\n📋 Checking notifications table structure:');
        const { data: notificationsColumns, error: notificationsError } = await supabase
            .rpc('sql', {
                query: `
                    SELECT column_name, data_type, is_nullable, column_default
                    FROM information_schema.columns 
                    WHERE table_name = 'notifications' 
                    ORDER BY ordinal_position;
                `
            });

        if (notificationsError) {
            console.log('❌ Error checking notifications:', notificationsError.message);
        } else if (!notificationsColumns || notificationsColumns.length === 0) {
            console.log('⚠️  notifications table does not exist');
        } else {
            console.log('✅ notifications table structure:');
            notificationsColumns.forEach(col => {
                console.log(`   - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
            });
        }

        // Check for any notification-related tables
        console.log('\n📋 Checking all notification-related tables:');
        const { data: allTables, error: tablesError } = await supabase
            .rpc('sql', {
                query: `
                    SELECT table_name 
                    FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name LIKE '%notification%'
                    ORDER BY table_name;
                `
            });

        if (tablesError) {
            console.log('❌ Error checking notification tables:', tablesError.message);
        } else if (!allTables || allTables.length === 0) {
            console.log('⚠️  No notification-related tables found');
        } else {
            console.log('✅ Found notification-related tables:');
            allTables.forEach(table => {
                console.log(`   - ${table.table_name}`);
            });
        }

        // If notification_templates exists, show sample data
        if (templatesColumns && templatesColumns.length > 0) {
            console.log('\n📊 Sample notification_templates data:');
            const { data: sampleData, error: sampleError } = await supabase
                .from('notification_templates')
                .select('*')
                .limit(5);

            if (sampleError) {
                console.log('❌ Error fetching sample data:', sampleError.message);
            } else if (!sampleData || sampleData.length === 0) {
                console.log('⚠️  No data in notification_templates table');
            } else {
                console.log('✅ Sample data:');
                sampleData.forEach((row, index) => {
                    console.log(`   ${index + 1}. Type: ${row.type || 'N/A'}, Columns: ${Object.keys(row).join(', ')}`);
                });
            }
        }

    } catch (error) {
        console.error('❌ Error checking table structure:', error.message);
    }
}

// Run the check
checkTableStructure(); 