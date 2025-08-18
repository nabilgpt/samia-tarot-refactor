import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('🔍 VERIFYING AUDIT_LOGS FIX...');

async function verifyFix() {
  try {
    // Test 1: Check if all required columns exist by doing the Phase 4 insert
    console.log('📝 Test 1: Phase 4 compatibility test...');
    
    const phase4TestInsert = {
      table_name: 'dynamic_languages',
      action: 'phase4_infrastructure_setup',
      new_data: {
        tables_created: ["dynamic_languages", "multilingual_field_registry", "translation_providers", "tts_providers"]
      },
      metadata: {
        phase: "4",
        component: "dynamic_language_infrastructure",
        description: "Foundation for unlimited multilingual support established"
      },
      created_at: new Date().toISOString()
    };
    
    const { data: insertData, error: insertError } = await supabase
      .from('audit_logs')
      .insert([phase4TestInsert])
      .select();
    
    if (insertError) {
      console.log('❌ PHASE 4 INSERT STILL FAILING:');
      console.log('   Error:', insertError.message);
      console.log('   Code:', insertError.code);
      console.log('\n🔧 Please run the SQL fix in AUDIT_LOGS_SCHEMA_FIX.md');
      return false;
    }
    
    console.log('✅ Phase 4 insert test PASSED!');
    
    // Test 2: Verify all required columns are accessible
    console.log('📋 Test 2: Column verification...');
    
    const { data: selectData, error: selectError } = await supabase
      .from('audit_logs')
      .select('id, table_name, action, new_data, metadata, created_at')
      .eq('action', 'phase4_infrastructure_setup')
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (selectError) {
      console.log('❌ Column access failed:', selectError.message);
      return false;
    }
    
    const record = selectData[0];
    console.log('✅ All columns accessible:');
    console.log('   📌 table_name:', record.table_name);
    console.log('   🎬 action:', record.action);
    console.log('   📄 new_data:', JSON.stringify(record.new_data));
    console.log('   📋 metadata:', JSON.stringify(record.metadata));
    console.log('   🕐 created_at:', record.created_at);
    
    // Clean up test record
    if (record.id) {
      await supabase
        .from('audit_logs')
        .delete()
        .eq('id', record.id);
      console.log('🧹 Test record cleaned up');
    }
    
    console.log('\n🎉 AUDIT_LOGS FIX VERIFICATION SUCCESSFUL!');
    console.log('✅ All required columns present and working');
    console.log('✅ Phase 4 script compatibility confirmed');
    console.log('✅ Ready to proceed with Phase 4 dynamic language infrastructure');
    
    return true;
    
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    return false;
  }
}

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

verifyFix(); 