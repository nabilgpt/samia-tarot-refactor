const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function updateUserName() {
    console.log('🔧 Updating user name...');
    
    try {
        const userId = 'c1a12781-5fef-46df-a1fc-2bf4e4cb6356';
        
        // First, let's check current data
        console.log('📋 Checking current user data...');
        const { data: currentUser, error: fetchError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();
            
        if (fetchError) {
            console.error('❌ Error fetching user:', fetchError);
            return;
        }
        
        console.log('📄 Current user data:', {
            id: currentUser.id,
            first_name: currentUser.first_name,
            last_name: currentUser.last_name,
            display_name: currentUser.display_name,
            email: currentUser.email
        });
        
        // Update the user
        console.log('🔄 Updating user name to "Nabil Zein"...');
        const { data: updatedUser, error: updateError } = await supabase
            .from('profiles')
            .update({
                first_name: 'Nabil',
                last_name: 'Zein',
                display_name: 'Nabil Zein',
                updated_at: new Date().toISOString()
            })
            .eq('id', userId)
            .select()
            .single();
            
        if (updateError) {
            console.error('❌ Error updating user:', updateError);
            return;
        }
        
        console.log('✅ User updated successfully!');
        console.log('📄 Updated user data:', {
            id: updatedUser.id,
            first_name: updatedUser.first_name,
            last_name: updatedUser.last_name,
            display_name: updatedUser.display_name,
            email: updatedUser.email
        });
        
    } catch (error) {
        console.error('❌ Script error:', error);
    }
}

updateUserName(); 