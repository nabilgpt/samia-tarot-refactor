import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize Supabase client
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('🔧 Creating chat_monitoring table directly...\n');

async function createMonitoringTable() {
    try {
        // First, try to create the table by inserting a test record
        // This will fail if the table doesn't exist, which is what we expect
        console.log('📋 Checking if chat_monitoring table exists...');
        
        const { data: testData, error: testError } = await supabase
            .from('chat_monitoring')
            .select('*')
            .limit(1);
            
        if (!testError) {
            console.log('✅ chat_monitoring table already exists!');
            return true;
        }
        
        if (testError.code === 'PGRST106') {
            console.log('❌ chat_monitoring table does not exist');
            console.log('⚠️ This table needs to be created manually in Supabase dashboard');
            console.log('\n📝 SQL to create the table:');
            console.log(`
-- Create chat_monitoring table for real-time monitoring
CREATE TABLE IF NOT EXISTS public.chat_monitoring (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    session_id UUID REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL CHECK (event_type IN (
        'user_connected', 'user_disconnected', 'session_joined', 
        'session_left', 'typing_start', 'typing_stop', 'message_sent'
    )),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_chat_monitoring_user_id ON public.chat_monitoring(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_monitoring_session_id ON public.chat_monitoring(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_monitoring_timestamp ON public.chat_monitoring(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_chat_monitoring_event_type ON public.chat_monitoring(event_type);

-- Enable RLS
ALTER TABLE public.chat_monitoring ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Admin users can view all monitoring data"
ON public.chat_monitoring FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() 
        AND role IN ('admin', 'super_admin')
    )
);

CREATE POLICY "System can insert monitoring data"
ON public.chat_monitoring FOR INSERT
WITH CHECK (true);
            `);
            
            console.log('\n🔗 Instructions:');
            console.log('1. Go to Supabase Dashboard → SQL Editor');
            console.log('2. Copy and paste the SQL above');
            console.log('3. Click "Run" to create the table');
            console.log('4. The unified chat system will then be fully operational');
            
            return false;
        }
        
        console.error('❌ Unexpected error:', testError);
        return false;
        
    } catch (error) {
        console.error('❌ Script error:', error.message);
        return false;
    }
}

createMonitoringTable(); 