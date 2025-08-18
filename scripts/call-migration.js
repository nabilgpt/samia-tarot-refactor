#!/usr/bin/env node

/**
 * 🔧 Simple script to call the tarot cards schema migration endpoint
 */

import fetch from 'node-fetch';

async function callMigration() {
  try {
    console.log('🔧 Calling tarot cards schema migration endpoint...');
    
    const response = await fetch('http://localhost:5001/api/migrate/fix-tarot-cards-schema', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Using a simple test token - in production this would be a real JWT
        'Authorization': 'Bearer test-token'
      }
    });

    console.log('📊 Response Status:', response.status);
    
    const result = await response.text();
    console.log('📄 Response:', result);
    
    if (response.ok) {
      console.log('✅ Migration completed successfully!');
    } else {
      console.log('❌ Migration failed');
    }
    
  } catch (error) {
    console.error('💥 Error calling migration:', error.message);
  }
}

callMigration(); 