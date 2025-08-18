// Check existing schema for Enhanced Providers System
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qhgpxvuijdkdgqiuehqp.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFoZ3B4dnVpamRrZGdxaXVlaHFwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyMTA0MjcyNSwiZXhwIjoyMDM2NjE4NzI1fQ.gGBzqIJlGCOiVhkqYOqIhL7Q8WMHqJAiVYAGKJhfPzM';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkSchema() {
    console.log('🔍 Checking Enhanced Providers System schema...');
    
    try {
        // Check if tables exist
        const tableNames = ['providers', 'provider_services', 'provider_models', 'provider_secrets'];
        
        for (const tableName of tableNames) {
            const { data, error } = await supabase
                .from(tableName)
                .select('*')
                .limit(1);
            
            if (error) {
                console.log(`❌ Table '${tableName}' does not exist or has error:`, error.message);
            } else {
                console.log(`✅ Table '${tableName}' exists`);
                
                // Get count
                const { count } = await supabase
                    .from(tableName)
                    .select('*', { count: 'exact', head: true });
                
                console.log(`   Records: ${count || 0}`);
            }
        }
        
        // If providers table exists, check its structure
        const { data: providers } = await supabase
            .from('providers')
            .select('*')
            .limit(1);
        
        if (providers && providers.length > 0) {
            console.log('📋 Sample provider record structure:');
            console.log(JSON.stringify(providers[0], null, 2));
        }
        
    } catch (err) {
        console.error('💥 Schema check failed:', err);
    }
}

checkSchema(); 