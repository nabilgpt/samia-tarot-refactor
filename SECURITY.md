# 🔐 SECURITY DOCUMENTATION

## Environment Variables Security

### CRITICAL SECURITY RULES:

1. **NEVER commit .env files to version control**
2. **NEVER expose service role keys to frontend**
3. **Use different keys for dev/staging/production**
4. **Rotate keys regularly**

### Key Types:

- `VITE_*` variables: Exposed to frontend (use only for public keys)
- Non-VITE variables: Server-side only (use for secrets)

### Production Checklist:

- [ ] All placeholder values replaced with real keys
- [ ] Service role key secured and not exposed
- [ ] Environment-specific keys for each deployment
- [ ] Backup of production keys stored securely
- [ ] Key rotation schedule established

## Fixed Security Issues:

✅ Removed hardcoded Supabase URLs
✅ Removed hardcoded JWT tokens  
✅ Removed hardcoded OpenAI keys
✅ Removed hardcoded ReCaptcha keys
✅ Created proper environment variable structure
✅ Added comprehensive documentation
