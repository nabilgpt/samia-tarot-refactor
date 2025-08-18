// ================================================================
// SAMIA TAROT: Environment Variables Loader for ES Modules
// ================================================================
// Fixes: Missing required environment variable: SUPABASE_URL

import { readFileSync } from 'fs';
import { join } from 'path';

// Load .env file manually for ES modules
export function loadEnvironment() {
  try {
    const envPath = join(process.cwd(), '.env');
    const envContent = readFileSync(envPath, 'utf8');
    
    // Parse .env content
    const lines = envContent.split('\n');
    let loadedVars = 0;
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Skip empty lines and comments
      if (!trimmedLine || trimmedLine.startsWith('#')) {
        continue;
      }
      
      // Parse KEY=VALUE format
      const match = trimmedLine.match(/^([^=]+)=(.*)$/);
      if (match) {
        const [, key, value] = match;
        
        // Only set if not already set
        if (!process.env[key.trim()]) {
          process.env[key.trim()] = value.trim();
          loadedVars++;
        }
      }
    }
    
    console.log(`✅ Environment loaded: ${loadedVars} variables from .env`);
    console.log(`🔧 SUPABASE_URL: ${process.env.SUPABASE_URL ? 'LOADED ✅' : 'MISSING ❌'}`);
    console.log(`🔧 SUPABASE_ANON_KEY: ${process.env.SUPABASE_ANON_KEY ? 'LOADED ✅' : 'MISSING ❌'}`);
    console.log(`🔧 SUPABASE_SERVICE_ROLE_KEY: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? 'LOADED ✅' : 'MISSING ❌'}`);
    
    return true;
  } catch (error) {
    console.error('❌ Failed to load .env file:', error.message);
    return false;
  }
}

// Load environment immediately when this module is imported
loadEnvironment(); 