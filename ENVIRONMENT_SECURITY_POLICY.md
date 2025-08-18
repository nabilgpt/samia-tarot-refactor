# 🚨 STRICT CREDENTIALS POLICY FOR SAMIA TAROT - ZODIAC & ALL FEATURES

## 🔒 ABSOLUTE PROHIBITION - NO EXCEPTIONS

**You are strictly forbidden from saving, generating, or referencing any API key, credential, or secret in the `.env` file for any new feature, integration, or third-party API (such as OpenAI, ElevenLabs, Google, Facebook, Apple, etc.).**

**All such credentials must ONLY be created, stored, managed, and retrieved securely through the Super Admin Dashboard (or the dedicated Secrets Tab in the Admin panel).**

---

## ✅ ALLOWED .env VARIABLES ONLY

The `.env` file MAY ONLY contain these variables:

```env
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NODE_ENV=development
PORT=5001
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
JWT_SECRET=
```

**No other variables are allowed. Period.**

---

## 🔒 FOR EVERY NEW PROMPT, FEATURE, OR INTEGRATION REQUIRING CREDENTIALS:

Credentials or API keys **MUST NOT** go in `.env` or code.

### You must:
1. **Create** the credentials/secret config page in the Super Admin Dashboard if not already present
2. **Always save and retrieve** those credentials from the database (via the Secrets/Config table)
3. **Load the credentials at runtime** from the Super Admin Secrets, never from `.env`
4. **Double-check** before completing any implementation or prompt, and **explicitly confirm** that credentials are taken from the dashboard, NOT from the .env

---

## ⚡️ IN ALL FUTURE PROMPTS:

If the feature you're building needs credentials, you MUST include in your prompt a clear warning:

- **"All credentials for this feature must be managed via the Super Admin Dashboard/Secrets, not in .env."**
- **"Before finalizing, double-check that the system retrieves all credentials from the dashboard, never from environment files."**

---

## 🚨 VIOLATION CONSEQUENCES

**If any prompt or code violates this policy, you must stop, alert the user, and fix the implementation to comply with this security requirement.**

**Never modify or suggest changes to .env except for the allowed variables above, and only if Nabil requests it directly.**

---

## 📋 SECURITY CHECKLIST FOR NEW FEATURES

Before completing any new feature implementation:

- [ ] ✅ All API keys stored in Super Admin Dashboard only
- [ ] ✅ No credentials in `.env` file
- [ ] ✅ No credentials hardcoded in source code
- [ ] ✅ Runtime credential loading from database
- [ ] ✅ Proper error handling when credentials missing
- [ ] ✅ Clear error messages directing to Super Admin Dashboard
- [ ] ✅ Documentation updated with credential management steps

---

## 🌟 EXAMPLES OF COMPLIANT IMPLEMENTATION

### ❌ WRONG (Forbidden):
```javascript
// NEVER DO THIS
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});
```

### ✅ CORRECT (Required):
```javascript
// ALWAYS DO THIS
import { getSecretValue } from '../services/secretsService.js';

const openaiKey = await getSecretValue('OPENAI_API_KEY');
if (!openaiKey) {
  throw new Error('OpenAI API key not configured. Please set it in Super Admin Dashboard > Secrets Tab.');
}

const openai = new OpenAI({
  apiKey: openaiKey
});
```

---

## 🎯 CURRENT SYSTEM STATUS

✅ **Daily Zodiac System**: Fully compliant - requires Super Admin Dashboard configuration  
✅ **TTS Services**: Fully compliant - no mock data fallbacks  
✅ **Environment Policy**: Enforced and documented  
✅ **Security Memory**: Stored in system memory for future reference  

---

**This policy is effective immediately and applies to ALL future development, integrations, and feature additions.**

---

*Last Updated: January 2025*  
*Policy Version: 2.0 Final*  
*Status: ENFORCED* 