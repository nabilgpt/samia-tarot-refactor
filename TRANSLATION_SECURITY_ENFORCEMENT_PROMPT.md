# 🚨 **TRANSLATION SECURITY SEPARATION - ENFORCEMENT PROMPT**
## **SAMIA TAROT - MANDATORY DEVELOPMENT POLICY**

> **⚠️ COPY THIS SECTION INTO ALL DEVELOPMENT REQUESTS, QA CHECKLISTS, AND PROJECT SPECIFICATIONS**

---

## 🛡️ **ORGANIZATIONAL POLICY: SEPARATION OF TRANSLATION SETTINGS & SYSTEM SECRETS**

### 📋 **MANDATORY REQUIREMENTS:**

**✅ BILINGUAL SETTINGS TAB (Non-Sensitive Configuration)**
- **Location:** Super Admin Dashboard → Bilingual Settings Tab ONLY
- **Allowed:** Provider selection, quality levels, fallback options, monitoring preferences
- **Forbidden:** API keys, tokens, credentials, secrets

**🔐 SYSTEM SECRETS TAB (Sensitive Credentials)**  
- **Location:** Super Admin Dashboard → System Secrets Tab ONLY
- **Allowed:** API keys, secret tokens, sensitive credentials
- **Forbidden:** Public configuration, UI settings, non-sensitive options

**❌ STRICT PROHIBITIONS:**
- Duplicating credentials outside System Secrets
- Hardcoding any API keys or secrets in code
- Accessing credentials from any location other than System Secrets manager
- Storing secrets in .env files, configuration files, or database directly
- Displaying credentials in any other admin interface section

**✅ BACKEND REQUIREMENTS:**
- ALL credentials MUST be fetched dynamically from System Secrets at runtime
- NO hardcoded keys, tokens, or secrets anywhere in codebase
- MUST use System Secrets manager service for all credential access

---

## 🔍 **MANDATORY QA CHECKLIST - BEFORE ANY DEPLOYMENT:**

### **Translation Features Development:**
- [ ] **Settings Separation:** All non-sensitive settings in Bilingual Settings tab only
- [ ] **Credentials Isolation:** All API keys/secrets in System Secrets tab only  
- [ ] **No Duplication:** Zero credential duplication across admin interface
- [ ] **Dynamic Fetching:** Backend fetches secrets from System Secrets manager only
- [ ] **No Hardcoding:** No hardcoded credentials anywhere in codebase
- [ ] **No .env Secrets:** No translation provider credentials in .env files
- [ ] **Runtime Loading:** All secrets loaded dynamically at runtime only

### **Code Review Requirements:**
- [ ] **Search Codebase:** No Google/OpenAI/Claude API keys in source code
- [ ] **Check Services:** All translation services use System Secrets manager
- [ ] **Verify Routes:** No credential exposure in API endpoints
- [ ] **Review Frontend:** No secrets accessible in frontend code
- [ ] **Database Check:** No plain-text credentials in database
- [ ] **Environment Audit:** Only essential variables in .env files

### **Security Verification:**
- [ ] **Access Control:** Only System Secrets tab can modify credentials
- [ ] **Separation Maintained:** No mixing of settings and secrets
- [ ] **Audit Trail:** All credential changes logged properly
- [ ] **Role Restrictions:** Only super_admin can access System Secrets
- [ ] **Error Handling:** No credential leakage in error messages

---

## 🛑 **VIOLATION RESPONSE PROTOCOL:**

**HIGH-PRIORITY SECURITY BLOCKER:** Any violation of this separation is considered a critical security issue requiring immediate resolution.

**Immediate Actions Required:**
1. **STOP DEPLOYMENT** - Do not proceed with any release
2. **IDENTIFY VIOLATION** - Document exact location and nature of breach
3. **ISOLATE CREDENTIALS** - Move all secrets to System Secrets immediately  
4. **AUDIT CODEBASE** - Search for any other potential violations
5. **FIX BACKEND** - Implement dynamic fetching from System Secrets
6. **TEST THOROUGHLY** - Verify complete separation before proceeding
7. **DOCUMENT RESOLUTION** - Record fix and prevention measures

---

## 📚 **DEVELOPER IMPLEMENTATION GUIDE:**

### **Correct Implementation Pattern:**
```javascript
// ✅ CORRECT: Dynamic credential fetching
const translationConfig = await systemSecretsManager.getSecrets('translation_providers');
const openaiKey = translationConfig.openai_api_key;
const googleKey = translationConfig.google_translate_key;

// ✅ CORRECT: Settings from Bilingual Settings
const bilingualSettings = await bilingualSettingsService.getSettings();
const preferredProvider = bilingualSettings.preferred_provider;
```

### **Forbidden Patterns:**
```javascript
// ❌ FORBIDDEN: Hardcoded credentials
const OPENAI_KEY = "sk-proj-abc123...";

// ❌ FORBIDDEN: Environment variables for secrets
const apiKey = process.env.OPENAI_API_KEY;

// ❌ FORBIDDEN: Direct database access for credentials
const { data } = await supabase.from('config').select('api_key');
```

---

## 🎨 **THEME PRESERVATION REQUIREMENT:**

**⚠️ CRITICAL:** Never modify theme, design, or styling files during any translation security implementation. Theme preservation is mandatory across all environments.

---

## 📖 **ONBOARDING REQUIREMENTS:**

**All new developers MUST:**
- [ ] Read and acknowledge this policy
- [ ] Understand System Secrets vs Bilingual Settings separation
- [ ] Know how to use System Secrets manager properly
- [ ] Complete security training on credential management
- [ ] Review violation response protocol

---

## 🔄 **CONTINUOUS COMPLIANCE:**

**Regular Audits Required:**
- Weekly codebase scans for hardcoded credentials
- Monthly System Secrets access reviews  
- Quarterly separation compliance audits
- Annual security policy updates

---

**📌 USE THIS PROMPT IN:**
- Development task specifications
- Pull request templates
- QA testing checklists  
- Security review processes
- Onboarding documentation
- Deployment verification steps

**🚨 REMEMBER:** This is not optional - this is mandatory organizational policy for all SAMIA TAROT development activities. 