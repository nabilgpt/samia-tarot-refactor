#!/usr/bin/env node
/**
 * 🚨 URGENT: Create .env file for SAMIA TAROT
 * This script creates the required .env file with proper Supabase configuration
 */

const fs = require('fs');
const path = require('path');

// Environment configuration template
const envTemplate = `# SAMIA TAROT - Environment Variables
# Generated: ${new Date().toISOString()}
# CRITICAL: These must be set for the system to function

# Supabase Configuration (Backend)
SUPABASE_URL=https://uuseflmielktdcltzwzt.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV1c2VmbG1pZWxrdGRjbHR6d3p0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgzNDUxMTUsImV4cCI6MjA2MzkyMTExNX0.Qcds_caGg7xbe4rl1Z8Rh4Nox79VJWRDabp5_Bt0YOw
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV1c2VmbG1pZWxrdGRjbHR6d3p0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODM0NTExNSwiZXhwIjoyMDYzOTIxMTE1fQ.TaHvGh5iUvlFqBqQaOcNqwNW_KXeKS3aEQEYZA2PG8k

# Supabase Configuration (Frontend)
VITE_SUPABASE_URL=https://uuseflmielktdcltzwzt.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV1c2VmbG1pZWxrdGRjbHR6d3p0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgzNDUxMTUsImV4cCI6MjA2MzkyMTExNX0.Qcds_caGg7xbe4rl1Z8Rh4Nox79VJWRDabp5_Bt0YOw

# Server Configuration
NODE_ENV=development
PORT=5001
JWT_SECRET=SamiaTarotSecureJWTSecretKey2025ForDevelopmentEnvironment

# Database Configuration
DATABASE_URL=postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres

# Security Configuration
CORS_ORIGIN=http://localhost:3000
SESSION_SECRET=SamiaTarotSessionSecretKey2025ForDevelopmentEnvironment

# Admin Configuration
ADMIN_EMAIL=info@samiatarot.com
SUPER_ADMIN_EMAIL=info@samiatarot.com

# File Upload Configuration
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=jpg,jpeg,png,gif,pdf,doc,docx,txt,mp3,wav,ogg

# Rate Limiting
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=100

# Logging Configuration
LOG_LEVEL=info
LOG_FILE=logs/app.log

# Development Settings
DEBUG=true
VERBOSE_LOGGING=true

# Health Check Configuration
HEALTH_CHECK_INTERVAL=30000
HEALTH_CHECK_TIMEOUT=5000

# CRITICAL POLICY ENFORCEMENT
# According to memory policy, ALL other credentials must be managed through
# Super Admin Dashboard → System Secrets Tab - NEVER in .env file
# This includes: OpenAI, ElevenLabs, Stripe, OAuth, etc.
`;

function createEnvFile() {
    try {
        const envPath = path.join(process.cwd(), '.env');
        
        // Check if .env already exists
        if (fs.existsSync(envPath)) {
            console.log('⚠️  .env file already exists!');
            console.log('📋 Current .env content:');
            console.log(fs.readFileSync(envPath, 'utf8'));
            
            const readline = require('readline');
            const rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout
            });
            
            rl.question('🔄 Do you want to overwrite it? (y/N): ', (answer) => {
                if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
                    fs.writeFileSync(envPath, envTemplate);
                    console.log('✅ .env file updated successfully!');
                } else {
                    console.log('🚫 .env file not modified.');
                }
                rl.close();
            });
        } else {
            // Create new .env file
            fs.writeFileSync(envPath, envTemplate);
            console.log('✅ .env file created successfully!');
            console.log('📍 Location:', envPath);
            console.log('');
            console.log('🚀 Next steps:');
            console.log('1. Run: npm run backend');
            console.log('2. Run: npm run frontend');
            console.log('3. Open: http://localhost:3000');
        }
    } catch (error) {
        console.error('❌ Error creating .env file:', error.message);
        console.log('');
        console.log('🔧 Manual creation instructions:');
        console.log('1. Create a file named ".env" in your project root');
        console.log('2. Copy the content from the template above');
        console.log('3. Save the file');
        console.log('4. Restart your servers');
    }
}

// Run the script
console.log('🚨 URGENT: Creating .env file for SAMIA TAROT');
console.log('='.repeat(60));
createEnvFile(); 