# Environment Setup Guide

## Required Environment Variables

Create a `.env` file in the project root with the following variables:

```bash
# Supabase Configuration
VITE_SUPABASE_URL=process.env.VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY=process.env.VITE_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=process.env.SUPABASE_SERVICE_ROLE_KEY


# Node Environment
NODE_ENV=development

# API Configuration  
API_PORT=5000
API_HOST=localhost

# Additional API Keys (Optional)
OPENAI_API_KEY=your_openai_api_key_here
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
STRIPE_SECRET_KEY=your_stripe_secret_key_here
SQUARE_ACCESS_TOKEN=your_square_access_token_here
```

## How to Get Supabase Keys

1. Go to your Supabase project: https://app.supabase.com/project/uuseflmielktdcltzwzt
2. Navigate to **Settings** → **API**
3. Copy the **anon public** key for `VITE_SUPABASE_ANON_KEY`
4. Copy the **service_role secret** key for `SUPABASE_SERVICE_ROLE_KEY`

⚠️ **Important**: Never commit your `.env` file to version control! 