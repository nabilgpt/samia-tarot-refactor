#!/usr/bin/env node

// Simple test runner for database parts
const { execSync } = require('child_process');
const fs = require('fs');

console.log('🔧 SAMIA TAROT - Database Parts Test Runner');
console.log('═'.repeat(50));

const parts = [
    { name: 'Part 1: Tarot Core Tables', file: 'database/part-1-tarot-core-tables.sql' },
    { name: 'Part 2: Call Enhancements', file: 'database/part-2-call-enhancements.sql' },
    { name: 'Part 3: AI System', file: 'database/part-3-ai-system.sql' },
    { name: 'Part 4: Fix Trigger Conflicts', file: 'database/part-4-fix-trigger-conflicts.sql' },
    { name: 'Part 5: Fix JSONB Error', file: 'database/part-5-fix-jsonb-error.sql' }
];

console.log('\n📋 Available Parts:');
parts.forEach((part, index) => {
    const exists = fs.existsSync(part.file);
    console.log(`${index + 1}. ${part.name} ${exists ? '✅' : '❌'}`);
});

console.log('\n💡 Instructions:');
console.log('1. Test each part individually by copying the SQL content');
console.log('2. Run in your Supabase SQL editor or pgAdmin');
console.log('3. Check for errors before proceeding to next part');
console.log('4. This avoids the trigger and JSONB errors by running smaller chunks');

console.log('\n🚀 You can now run each part safely!'); 