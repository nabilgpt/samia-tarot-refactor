#!/usr/bin/env node

// Load environment variables from .env file
import { config } from 'dotenv';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env file manually
try {
  const envPath = join(__dirname, '.env');
  const envContent = readFileSync(envPath, 'utf8');
  
  envContent.split('\n').forEach(line => {
    const trimmedLine = line.trim();
    if (trimmedLine && !trimmedLine.startsWith('#')) {
      const [key, ...valueParts] = trimmedLine.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').replace(/^["']|["']$/g, '');
        process.env[key] = value;
      }
    }
  });
  
  console.log('✅ Environment variables loaded successfully');
  console.log('🔗 SUPABASE_URL:', process.env.SUPABASE_URL ? 'Set' : 'Missing');
  console.log('🔑 SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? 'Set' : 'Missing');
  
} catch (error) {
  console.error('❌ Failed to load .env file:', error.message);
  process.exit(1);
}

// Now start the backend server
import('./src/api/index.js').catch(error => {
  console.error('❌ Failed to start backend server:', error);
  process.exit(1);
}); 