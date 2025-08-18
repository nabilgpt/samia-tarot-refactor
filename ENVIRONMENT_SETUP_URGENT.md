# 🚨 URGENT: Environment Variables Setup

## Problem
Backend fails with: `Missing required environment variable: SUPABASE_URL`

## 🔧 IMMEDIATE FIX

### Step 1: Create .env File
Create a `.env` file in the root directory with:

```bash
# SUPABASE CONFIGURATION (REQUIRED)
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# VITE FRONTEND CONFIGURATION  
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here

# SERVER CONFIGURATION
NODE_ENV=development
PORT=5001
JWT_SECRET=your_super_secure_jwt_secret_here_at_least_32_characters
```

### Step 2: Get Your Supabase Credentials
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Settings** → **API**
4. Copy the **Project URL** and **API Keys**:
   - Project URL → `SUPABASE_URL`
   - anon/public key → `SUPABASE_ANON_KEY` and `VITE_SUPABASE_ANON_KEY`
   - service_role key → `SUPABASE_SERVICE_ROLE_KEY`

### Step 3: Generate JWT Secret
```bash
# Generate a secure JWT secret (32+ characters)
openssl rand -base64 32
```

### Step 4: Example .env File
```bash
SUPABASE_URL=https://abcdefghijk.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_SUPABASE_URL=https://abcdefghijk.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NODE_ENV=development
PORT=5001
JWT_SECRET=YourSuperSecureJWTSecretHereAtLeast32Characters
```

## ✅ Verification
After creating .env file, test with:
```bash
npm run backend
```

Should show:
```
🔧 Backend Supabase Configuration:
  URL: https://your-project-id.supabase.co
  Mode: Backend (Server)
🚀 Server running on port 5001
```

## 🚨 Security Notes
- **.env file should NEVER be committed to git**
- Keep your service_role key secure
- JWT_SECRET should be long and random
- Only share credentials through secure channels 