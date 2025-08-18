// SAMIA TAROT - Backend Starter with Environment Loading
import { readFileSync } from 'fs';
import { spawn } from 'child_process';

console.log('🚀 Starting SAMIA TAROT Backend Server...');

// Load .env file manually
try {
    const envFile = readFileSync('.env', 'utf8');
    const envVars = {};
    
    envFile.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) {
            envVars[key.trim()] = value.trim().replace(/['"]/g, '');
            process.env[key.trim()] = value.trim().replace(/['"]/g, '');
        }
    });
    
    console.log('✅ Environment variables loaded:');
    console.log('  - SUPABASE_URL:', process.env.SUPABASE_URL ? '✓' : '✗');
    console.log('  - SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? '✓' : '✗'); 
    console.log('  - SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✓' : '✗');
    
} catch (error) {
    console.error('❌ Error loading .env file:', error.message);
    process.exit(1);
}

// Start the server
const server = spawn('node', ['src/api/index.js'], {
    stdio: 'inherit',
    env: process.env
});

server.on('error', (error) => {
    console.error('❌ Failed to start server:', error);
});

server.on('close', (code) => {
    console.log(`🔴 Server process exited with code ${code}`);
}); 