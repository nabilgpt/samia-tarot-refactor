# Users Reset Instructions - SAMIA TAROT

## Overview
This document provides instructions for resetting all users in the SAMIA TAROT system with new bcrypt-hashed passwords.

## ⚠️ **CRITICAL WARNING**
This operation will **DELETE ALL EXISTING USERS** and create new ones. This is irreversible. Make sure you have a database backup before proceeding.

## 🔧 **Available Methods**

### **Method 1: Node.js Script (Recommended)**
Uses existing authentication helpers for consistency and production safety.

```bash
node scripts/reset-users.js
```

**Features:**
- ✅ Uses existing authentication helpers
- ✅ Automatic password hashing with 12 salt rounds
- ✅ Comprehensive error handling
- ✅ Real-time verification and logging
- ✅ Production-ready with security best practices

### **Method 2: Direct SQL Script**
Direct database execution for environments without Node.js access.

```sql
-- Run in Supabase Dashboard → SQL Editor
-- Copy and paste content from: database/reset-users.sql
```

**Features:**
- ✅ Direct database execution
- ✅ Pre-generated bcrypt hashes (12 salt rounds)
- ✅ Immediate verification queries
- ✅ Simple and fast execution

## 👥 **New Users Created**

| Email | Role | Password | Full Name |
|-------|------|----------|-----------|
| info@samiatarot.com | super_admin | SuperAdmin!2024 | Super Administrator |
| admin@samiatarot.com | admin | Admin!2024 | System Administrator |
| monitor@samiatarot.com | monitor | Monitor!2024 | System Monitor |
| reader@samiatarot.com | reader | Reader!2024 | Tarot Reader |
| client@samiatarot.com | client | Client!2024 | Test Client |

## 🔐 **Security Features**

- **Bcrypt Hashing**: All passwords use 12 salt rounds for production security
- **Strong Passwords**: All passwords meet complexity requirements (8+ chars, mixed case, numbers, symbols)
- **Unique Emails**: Each user has a unique email address
- **Valid Roles**: All roles are validated against system roles
- **NOT NULL Constraint**: All users have encrypted_password field enforced

## 📋 **Step-by-Step Execution**

### **Using Node.js Script:**

1. **Backup Database** (Critical!)
   ```bash
   # Create backup before proceeding
   ```

2. **Run Reset Script**
   ```bash
   node scripts/reset-users.js
   ```

3. **Verify Results**
   - Check console output for success messages
   - Verify all 5 users created
   - Note login credentials displayed

### **Using SQL Script:**

1. **Backup Database** (Critical!)

2. **Open Supabase Dashboard**
   - Go to SQL Editor

3. **Execute SQL Script**
   ```sql
   -- Copy and paste entire content from database/reset-users.sql
   ```

4. **Verify Results**
   - Check verification queries output
   - Confirm 5 users created with passwords

## ✅ **Expected Results**

**Console Output (Node.js):**
```
🔄 Starting users reset...
🗑️  Dropping all existing users...
✅ All existing users dropped successfully
👥 Inserting new users...
🔐 Creating user: info@samiatarot.com (super_admin)
✅ User created: info@samiatarot.com
[...continues for all users...]

📊 FINAL VERIFICATION:
👥 Total users created: 5
✅ info@samiatarot.com (super_admin)
✅ admin@samiatarot.com (admin)
✅ monitor@samiatarot.com (monitor)
✅ reader@samiatarot.com (reader)
✅ client@samiatarot.com (client)

🎉 Users reset completed successfully!
```

**Database Result:**
- 5 users created with unique emails
- All users have NOT NULL encrypted_password
- All users are active (is_active = true)
- All passwords are bcrypt-hashed with 12 salt rounds

## 🚨 **Troubleshooting**

**Common Issues:**
1. **Permission Denied**: Ensure you have database admin permissions
2. **Constraint Violations**: Check if encrypted_password column exists and accepts NOT NULL
3. **Import Errors**: Verify all dependencies are installed (`npm install`)

**Verification Queries:**
```sql
-- Check all users exist
SELECT email, role, encrypted_password IS NOT NULL as has_password 
FROM profiles ORDER BY email;

-- Check password hashes format
SELECT email, LEFT(encrypted_password, 10) as hash_prefix 
FROM profiles;
```

## 📚 **Technical Details**

**Files Created:**
- `scripts/reset-users.js` - Main Node.js script
- `database/reset-users.sql` - SQL alternative
- `USERS_RESET_INSTRUCTIONS.md` - This documentation

**Dependencies:**
- bcrypt (via existing authentication helpers)
- Supabase client (via existing configuration)
- dotenv (for environment variables)

**Security Compliance:**
- ✅ Password strength requirements met
- ✅ Bcrypt hashing with 12 salt rounds
- ✅ Unique email constraints
- ✅ Role validation
- ✅ NOT NULL password enforcement

## 🎯 **Post-Reset Steps**

1. **Test Authentication**
   - Try logging in with each user
   - Verify JWT token generation
   - Test role-based access

2. **Update Passwords**
   - Encourage users to change passwords on first login
   - Implement password change functionality

3. **Monitor System**
   - Check authentication logs
   - Verify no errors in application

---

**Ready to reset users? Choose your method and follow the instructions above.** 