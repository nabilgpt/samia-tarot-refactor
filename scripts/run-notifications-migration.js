import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing required environment variables');
    console.error('Required: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkTableStructure() {
    console.log('🔍 Checking table structures...');
    
    // Check notifications table structure
    const { data: notificationsColumns, error: notificationsError } = await supabase
        .rpc('get_table_columns', { table_name: 'notifications' })
        .single();
    
    if (notificationsError) {
        // Fallback query
        const { data: notificationsInfo, error: fallbackError } = await supabase
            .from('information_schema.columns')
            .select('column_name, data_type')
            .eq('table_name', 'notifications')
            .eq('table_schema', 'public');
            
        if (fallbackError) {
            console.error('❌ Error checking notifications table:', fallbackError);
        } else {
            console.log('📋 Notifications table columns:', notificationsInfo);
        }
    }
    
    // Check notification_templates table structure
    const { data: templatesInfo, error: templatesError } = await supabase
        .from('information_schema.columns')
        .select('column_name, data_type')
        .eq('table_name', 'notification_templates')
        .eq('table_schema', 'public');
        
    if (templatesError) {
        console.error('❌ Error checking notification_templates table:', templatesError);
    } else {
        console.log('📋 Notification_templates table columns:', templatesInfo);
    }
}

async function runSimpleMigration() {
    try {
        console.log('🚀 Starting notifications bilingual migration...');
        
        // First check table structure
        await checkTableStructure();
        
        // Step 1: Add Arabic columns to notifications table
        console.log('📝 Adding Arabic columns to notifications table...');
        const { error: notificationsError } = await supabase.rpc('exec_sql', {
            sql: `
                ALTER TABLE notifications 
                ADD COLUMN IF NOT EXISTS title_ar TEXT,
                ADD COLUMN IF NOT EXISTS message_ar TEXT;
            `
        });
        
        if (notificationsError) {
            console.error('❌ Error adding columns to notifications table:', notificationsError);
            return;
        }
        
        console.log('✅ Successfully added Arabic columns to notifications table');
        
        // Step 2: Add Arabic columns to notification_templates table
        console.log('📝 Adding Arabic columns to notification_templates table...');
        const { error: templatesError } = await supabase.rpc('exec_sql', {
            sql: `
                ALTER TABLE notification_templates 
                ADD COLUMN IF NOT EXISTS title_template_ar TEXT,
                ADD COLUMN IF NOT EXISTS body_template_ar TEXT;
            `
        });
        
        if (templatesError) {
            console.error('❌ Error adding columns to notification_templates table:', templatesError);
            return;
        }
        
        console.log('✅ Successfully added Arabic columns to notification_templates table');
        
        // Step 3: Update existing notifications with basic Arabic translations
        console.log('📝 Updating existing notifications with Arabic translations...');
        const { error: updateError } = await supabase.rpc('exec_sql', {
            sql: `
                UPDATE notifications SET 
                    title_ar = CASE 
                        WHEN title LIKE '%approval%' OR title LIKE '%Approval%' THEN 'طلب موافقة جديد'
                        WHEN title LIKE '%review%' OR title LIKE '%Review%' THEN 'مراجعة جديدة'
                        WHEN title LIKE '%booking%' OR title LIKE '%Booking%' THEN 'حجز جديد'
                        WHEN title LIKE '%payment%' OR title LIKE '%Payment%' THEN 'دفعة مستلمة'
                        ELSE 'إشعار جديد'
                    END,
                    message_ar = CASE 
                        WHEN message LIKE '%approval%' THEN 'طلب موافقة جديد يحتاج إلى مراجعة'
                        WHEN message LIKE '%review%' THEN 'تمت إضافة مراجعة جديدة'
                        WHEN message LIKE '%booking%' THEN 'تم إنشاء حجز جديد'
                        WHEN message LIKE '%payment%' THEN 'تم استلام دفعة جديدة'
                        ELSE message
                    END
                WHERE title_ar IS NULL OR message_ar IS NULL;
            `
        });
        
        if (updateError) {
            console.error('❌ Error updating notifications:', updateError);
            return;
        }
        
        console.log('✅ Successfully updated existing notifications with Arabic translations');
        
        console.log('🎉 Migration completed successfully!');
        
    } catch (error) {
        console.error('💥 Migration failed:', error.message);
    }
}

// Run the migration
runSimpleMigration(); 