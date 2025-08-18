# 🔍 TRANSLATION SECURITY QA CHECKLIST
## SAMIA TAROT - Pre-Deployment Verification

### 📋 **QUICK COMPLIANCE CHECK**

**Use this checklist before ANY deployment involving translation features.**

---

## ✅ **BILINGUAL SETTINGS VERIFICATION**

**Super Admin Dashboard → Bilingual Settings Tab:**
- [ ] Translation provider selection dropdown (names only, no keys)
- [ ] Quality level preferences (fast/balanced/accurate)
- [ ] Fallback behavior toggles
- [ ] Auto-translation on/off switches
- [ ] Language pair selections
- [ ] Performance monitoring settings
- [ ] Cache configuration options
- [ ] NO API keys or secrets visible anywhere

---

## 🔐 **SYSTEM SECRETS VERIFICATION** 

**Super Admin Dashboard → System Secrets Tab:**
- [ ] OpenAI API keys stored securely
- [ ] Google Translate API keys stored securely  
- [ ] Any other provider credentials stored securely
- [ ] NO translation preferences mixed with secrets
- [ ] Secrets encrypted in database
- [ ] NO plaintext credential storage

---

## 💻 **CODE SECURITY SCAN**

**Backend Files:**
- [ ] NO `process.env.OPENAI_API_KEY` or similar hardcoding
- [ ] All credentials fetched via `systemSecretsManager.getSecret()`
- [ ] NO credential exposure in API responses
- [ ] NO credential logging in console/files
- [ ] Proper error handling without credential leakage

**Frontend Files:**
- [ ] NO direct secret access from frontend code
- [ ] Settings fetched from Bilingual Settings service only
- [ ] NO API key handling in React components
- [ ] NO credential storage in localStorage/sessionStorage

**Database Schema:**
- [ ] Secrets and settings in separate tables
- [ ] NO mixed storage of keys and preferences
- [ ] Proper access controls and encryption

---

## 🎨 **THEME PRESERVATION CHECK**

**Design System:**
- [ ] Cosmic/dark neon theme unchanged
- [ ] NO modifications to existing dashboard layout
- [ ] Security features integrated with current design
- [ ] NO color scheme or animation changes

---

## 🚨 **CRITICAL VIOLATIONS SCAN**

**Immediate Blockers:**
- [ ] API keys NOT visible in Bilingual Settings
- [ ] Translation preferences NOT in System Secrets  
- [ ] NO hardcoded credentials anywhere
- [ ] NO credential duplication across sections
- [ ] NO theme modifications during security work

---

## ✅ **DEPLOYMENT APPROVAL**

**Final Sign-off:**
- [ ] All checklist items verified ✅
- [ ] Security team approval obtained
- [ ] Code review completed by certified reviewer
- [ ] Automated security scan passed
- [ ] Theme preservation confirmed

**Approved by:** _________________ **Date:** _________

---

## 🆘 **VIOLATION FOUND?**

**Stop deployment immediately and:**
1. Document the violation type and location
2. Notify security team lead within 2 hours
3. Implement fix following security separation policy
4. Re-run complete checklist verification
5. Obtain new approval before deployment

---

**Policy Reference:** `TRANSLATION_SECURITY_SEPARATION_POLICY.md`  
**Emergency Contact:** Security Team Lead  
**Documentation:** SAMIA TAROT Security Policy Suite 