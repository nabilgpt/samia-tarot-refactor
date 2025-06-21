const { supabase } = require('./src/api/lib/supabase');

async function applyUserIdFixes() {
    console.log('🔧 APPLYING USER_ID COLUMN FIXES');
    console.log('='.repeat(80));
    
    console.log('📋 Checking current status...\n');
    
    const tables = ['voice_notes', 'emergency_escalations', 'emergency_alerts'];
    const results = [];
    
    for (const table of tables) {
        try {
            console.log(`🔧 Checking ${table}...`);
            
            const { data, error } = await supabase
                .from(table)
                .select('user_id')
                .limit(1);
            
            if (error && error.message.includes('user_id')) {
                console.log(`   ❌ ${table}: user_id column missing`);
                results.push({ table, needsFix: true });
            } else {
                console.log(`   ✅ ${table}: user_id column exists`);
                results.push({ table, needsFix: false });
            }
            
        } catch (err) {
            console.log(`   ❌ Error checking ${table}: ${err.message}`);
            results.push({ table, needsFix: true });
        }
    }
    
    const needsFix = results.filter(r => r.needsFix);
    
    if (needsFix.length === 0) {
        console.log('\n🎉 ALL USER_ID COLUMNS ALREADY EXIST!');
        return true;
    }
    
    console.log(`\n⚠️ ${needsFix.length} tables need user_id column fixes`);
    console.log('📝 Creating manual SQL script...');
    
    // Create a manual SQL script
    const manualScript = `-- ============================================================
-- MANUAL USER_ID COLUMN FIXES - Run in Supabase SQL Editor
-- Copy and paste this into Supabase Dashboard > SQL Editor
-- ============================================================

-- Fix voice_notes table
ALTER TABLE voice_notes ADD COLUMN IF NOT EXISTS user_id UUID NOT NULL DEFAULT gen_random_uuid();
CREATE INDEX IF NOT EXISTS idx_voice_notes_user_id ON voice_notes(user_id);

-- Fix emergency_escalations table  
ALTER TABLE emergency_escalations ADD COLUMN IF NOT EXISTS user_id UUID NOT NULL DEFAULT gen_random_uuid();
CREATE INDEX IF NOT EXISTS idx_emergency_escalations_user_id ON emergency_escalations(user_id);

-- Fix emergency_alerts table
ALTER TABLE emergency_alerts ADD COLUMN IF NOT EXISTS user_id UUID NOT NULL DEFAULT gen_random_uuid();
CREATE INDEX IF NOT EXISTS idx_emergency_alerts_user_id ON emergency_alerts(user_id);

-- Optional: Add foreign key constraints (uncomment if needed)
-- ALTER TABLE voice_notes ADD CONSTRAINT fk_voice_notes_user_id FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
-- ALTER TABLE emergency_escalations ADD CONSTRAINT fk_emergency_escalations_user_id FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
-- ALTER TABLE emergency_alerts ADD CONSTRAINT fk_emergency_alerts_user_id FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Verify the fixes
SELECT 'voice_notes' as table_name, COUNT(*) as row_count FROM voice_notes;
SELECT 'emergency_escalations' as table_name, COUNT(*) as row_count FROM emergency_escalations;
SELECT 'emergency_alerts' as table_name, COUNT(*) as row_count FROM emergency_alerts;
`;
    
    const fs = require('fs');
    fs.writeFileSync('manual-user-id-fix.sql', manualScript);
    console.log('✅ Created manual-user-id-fix.sql');
    
    console.log('\n📋 NEXT STEPS:');
    console.log('1. Go to Supabase Dashboard > SQL Editor');
    console.log('2. Copy and paste the contents of manual-user-id-fix.sql');
    console.log('3. Run the SQL script');
    console.log('4. Verify the fixes by running the verification script again');
    
    return false;
}

if (require.main === module) {
    applyUserIdFixes()
        .then((allFixed) => {
            if (allFixed) {
                console.log('\n🎯 ALL FIXES ALREADY APPLIED!');
            } else {
                console.log('\n⚠️ Manual intervention required - check manual-user-id-fix.sql');
            }
            process.exit(0);
        })
        .catch(err => {
            console.error('❌ Fix application failed:', err);
            process.exit(1);
        });
} 