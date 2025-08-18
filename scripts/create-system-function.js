#!/usr/bin/env node

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function createSystemFunction() {
    console.log('🔧 Creating get_system_config_value function...');
    
    const functionSQL = `
CREATE OR REPLACE FUNCTION get_system_config_value(
    p_config_key VARCHAR(100)
) RETURNS TEXT AS $$
DECLARE
    v_config RECORD;
BEGIN
    -- Get configuration
    SELECT * INTO v_config 
    FROM system_configurations 
    WHERE config_key = p_config_key 
    AND is_active = true;
    
    IF NOT FOUND THEN
        RETURN NULL;
    END IF;
    
    -- Return appropriate value (no access logging for system calls)
    IF v_config.is_encrypted THEN
        RETURN decrypt_config_value(p_config_key, v_config.config_value_encrypted);
    ELSE
        RETURN v_config.config_value_plain;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
    `;
    
    try {
        // Use a simple SQL execution approach
        const { data, error } = await supabase
            .from('system_configurations')
            .select('id')
            .limit(1);
            
        if (error) {
            console.error('❌ Database connection error:', error);
            return;
        }
        
        console.log('✅ Database connected, function should be created via schema');
        console.log('📋 The get_system_config_value function needs to be added to the database schema');
        console.log('   This function allows backend system to load configs without user authentication');
        
    } catch (error) {
        console.error('❌ Failed:', error.message);
    }
}

createSystemFunction(); 