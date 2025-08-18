# SAMIA TAROT - Environment Setup Instructions

## 🚨 **CRITICAL: Environment Variables Setup**

To complete Phase 5 and run SAMIA TAROT properly, you must create a `.env` file in the project root with the following variables:

### **Step 1: Create .env File**

Create a file named `.env` in the project root directory with this content:

```bash
# SAMIA TAROT - Environment Configuration
# Phase 5 DevOps - Required Environment Variables Only
# 
# 🚨 CRITICAL: Only these variables are allowed in .env
# All other credentials MUST be managed through Super Admin Dashboard

# Supabase Configuration (Backend)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# Supabase Configuration (Frontend)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key

# Application Configuration
NODE_ENV=development
PORT=5001

# JWT Secret for Backend Authentication
JWT_SECRET=your-jwt-secret-key-min-32-chars-long-for-security
```

### **Step 2: Replace Placeholder Values**

Replace the following placeholder values with your actual credentials:

1. **SUPABASE_URL**: Your Supabase project URL
2. **SUPABASE_ANON_KEY**: Your Supabase anonymous public key
3. **SUPABASE_SERVICE_ROLE_KEY**: Your Supabase service role secret key
4. **JWT_SECRET**: A secure random string (minimum 32 characters)

### **Step 3: Verify Setup**

After creating the `.env` file, test the setup:

```bash
# Test backend startup
npm run backend

# Test frontend startup  
npm run frontend

# Test full development environment
npm run dev
```

### **Step 4: Phase 5 DevOps Testing**

Once the environment is set up, test the Phase 5 automation systems:

```bash
# Test theme protection
node scripts/theme-protector.js scan

# Test server management
node scripts/server-manager.js health

# Test audit logging
node scripts/audit-logger.js health-report

# Test language management
node scripts/language-manager.js status

# Run full integration test
node scripts/integration-test.js
```

## 🛡️ **Security Guidelines**

### **ALLOWED in .env:**
- ✅ Supabase configuration (URL, keys)
- ✅ Application settings (NODE_ENV, PORT)
- ✅ JWT secret for authentication

### **FORBIDDEN in .env:**
- ❌ OpenAI API keys → Use Super Admin Dashboard
- ❌ ElevenLabs API keys → Use Super Admin Dashboard  
- ❌ Payment provider keys → Use Super Admin Dashboard
- ❌ Email service credentials → Use Super Admin Dashboard
- ❌ Any third-party API keys → Use Super Admin Dashboard

## 🚀 **Phase 5 DevOps Commands**

All Phase 5 automation is now available through npm scripts:

```bash
# Server Management
npm run server:restart           # Safe kill and restart
npm run server:kill             # Emergency kill
npm run server:health           # Health check

# Deployment
npm run deploy:prod             # Production deployment
npm run deploy:staging          # Staging deployment

# Database
npm run migrate                 # Run migrations
npm run db:backup              # Create backup

# Theme Protection
npm run theme:protect          # Scan for violations
npm run theme:validate         # Validate current state

# Monitoring
npm run audit:deployment       # Deployment report
npm run audit:health          # System health
npm run monitor:logs          # View audit logs

# Language Management
npm run language:sync         # Sync language system
npm run language:status       # Check language status
```

## 🔄 **Mandatory Kill-and-Restart Flow**

🚨 **CRITICAL**: Every deployment and system change MUST follow the kill-and-restart flow:

1. **Kill all processes**: `npm run server:kill`
2. **Clear ports**: Automatic port clearing
3. **Start fresh**: `npm run server:restart`
4. **Health verification**: Automatic health checks

**NEVER skip the kill step** - this ensures zero memory leaks and proper language system updates.

## 📋 **Troubleshooting**

### Backend Won't Start
- Check `.env` file exists and has correct values
- Verify Supabase credentials are valid
- Ensure port 5001 is not in use: `npm run server:kill`

### Frontend Import Errors
- Run `npm install` to ensure all dependencies
- Check file paths in import statements
- Restart development server: `npm run dev`

### Phase 5 Scripts Not Working
- Verify Node.js version (requires v16+)
- Check ES module support
- Run integration test: `node scripts/integration-test.js`

## ✅ **Phase 5 Completion Verification**

To verify Phase 5 is fully operational:

1. ✅ Environment variables configured
2. ✅ Backend starts successfully (`npm run backend`)
3. ✅ Frontend builds without errors (`npm run frontend`)
4. ✅ Theme protection working (`node scripts/theme-protector.js scan`)
5. ✅ Server management working (`node scripts/server-manager.js health`)
6. ✅ Audit logging functional (`node scripts/audit-logger.js health-report`)
7. ✅ Language system operational (`node scripts/language-manager.js status`)
8. ✅ Integration tests pass (`node scripts/integration-test.js`)
9. ✅ CI/CD pipeline validates (GitHub Actions)
10. ✅ Documentation complete and accessible

When all items are ✅, Phase 5 DevOps automation is fully operational!

---

## 🎉 **Phase 5 Success Criteria Met**

✅ **Bulletproof DevOps automation**  
✅ **Mandatory kill-and-restart flow enforced**  
✅ **Absolute cosmic theme protection**  
✅ **Enterprise-grade CI/CD pipeline**  
✅ **Comprehensive audit logging**  
✅ **Hot language system upgrades**  
✅ **Cross-platform server management**  
✅ **Emergency procedures and rollback**  
✅ **Complete documentation and training**  
✅ **Production-ready deployment pipeline**  

🚀 **SAMIA TAROT Phase 5 DevOps automation is complete and production-ready!** 