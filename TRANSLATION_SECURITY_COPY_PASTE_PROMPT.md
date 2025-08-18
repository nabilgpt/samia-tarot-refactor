# 📋 **COPY-PASTE PROMPT FOR DEV/QA/SPECS**

> **Copy the section below into all development requests, pull request templates, QA checklists, and project specifications:**

---

## 🚨 **MANDATORY: TRANSLATION SECURITY SEPARATION POLICY**

**🛡️ ORGANIZATIONAL REQUIREMENT:** All translation-related development MUST follow strict separation between settings and secrets.

### **✅ REQUIRED SEPARATION:**
- **Bilingual Settings Tab:** Provider selection, quality levels, fallback options (NON-sensitive)
- **System Secrets Tab:** API keys, tokens, credentials (SENSITIVE only)

### **❌ STRICTLY FORBIDDEN:**
- Hardcoding ANY API keys or secrets in code
- Storing credentials in .env files
- Duplicating secrets outside System Secrets tab
- Accessing credentials from anywhere except System Secrets manager

### **✅ MANDATORY BACKEND PATTERN:**
```javascript
// ✅ CORRECT: Dynamic fetching from System Secrets
const secrets = await systemSecretsManager.getSecrets('translation_providers');
const settings = await bilingualSettingsService.getSettings();
```

### **🔍 PRE-DEPLOYMENT CHECKLIST:**
- [ ] All API keys in System Secrets tab only
- [ ] All settings in Bilingual Settings tab only  
- [ ] No hardcoded credentials in codebase
- [ ] Backend uses dynamic credential fetching
- [ ] No secrets in .env files
- [ ] Theme/design files untouched

### **🛑 VIOLATION = HIGH-PRIORITY SECURITY BLOCKER**
Any mixing of settings/secrets or credential leakage requires immediate fix before deployment.

**⚠️ Theme Preservation:** Never modify theme/design files during implementation.

---

> **This policy is mandatory for ALL SAMIA TAROT development. No exceptions.** 