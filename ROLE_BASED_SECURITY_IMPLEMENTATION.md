# 🔐 SAMIA TAROT - Role-Based Security Implementation

## 🎯 Overview

This document outlines the comprehensive role-based access control (RBAC) system implemented for the SAMIA TAROT platform. The system ensures that users can ONLY access data and functionality appropriate to their assigned role.

## 🏗️ Security Architecture

### Frontend Security
- **ProtectedRoute Component**: Validates user authentication and role permissions
- **Route Protection**: All sensitive routes are wrapped with role-specific guards
- **API Security Layer**: Client-side validation with secure API wrappers
- **Unauthorized Access Pages**: Custom error pages for access violations

### Backend Security
- **Row Level Security (RLS)**: Database-level access control for all tables
- **Role-Based Policies**: Granular permissions for each user role
- **Helper Functions**: Centralized role checking in the database
- **Audit Logging**: Security event tracking and monitoring

## 👥 User Roles & Permissions

### 1. **Client** (`client`)
- ✅ View and manage own profile
- ✅ Create and view own bookings
- ✅ View and create own payments
- ✅ View own wallet and transactions
- ✅ Send/receive messages in own bookings
- ✅ Create reviews for completed sessions
- ❌ Cannot access other users' data
- ❌ Cannot access admin functions

### 2. **Reader** (`reader`)
- ✅ View and manage own profile
- ✅ View assigned bookings
- ✅ Update status of assigned bookings
- ✅ View client profiles for assigned bookings
- ✅ Send/receive messages in assigned bookings
- ✅ View reviews about themselves
- ✅ View payments for their bookings
- ❌ Cannot view all bookings/payments
- ❌ Cannot access admin functions

### 3. **Monitor** (`monitor`)
- ✅ View all profiles (read-only)
- ✅ View all bookings (read-only)
- ✅ View all payments (read-only)
- ✅ View all messages (read-only)
- ✅ Access monitoring tools
- ❌ Cannot modify data
- ❌ Cannot manage users or services

### 4. **Admin** (`admin`)
- ✅ All monitor permissions
- ✅ Manage all users (except role changes)
- ✅ Manage all services
- ✅ Manage all bookings
- ✅ Manage all payments
- ✅ Manage system settings
- ✅ Create system notifications
- ❌ Cannot change user roles (only super_admin)

### 5. **Super Admin** (`super_admin`)
- ✅ All admin permissions
- ✅ Manage user roles
- ✅ Full system access
- ✅ Override all restrictions
- ✅ Access security testing tools

## 🛡️ Security Implementation

### Frontend Protection

#### ProtectedRoute Component
```jsx
// Route protection with role validation
<ProtectedRoute requiredRoles={['admin']} showUnauthorized={true}>
  <AdminDashboard />
</ProtectedRoute>
```

#### Features:
- **Authentication Check**: Validates user is logged in
- **Role Validation**: Ensures user has required role(s)
- **Loading States**: Prevents race conditions
- **Timeout Handling**: Handles authentication failures
- **Redirect Logic**: Routes users to appropriate dashboards
- **Unauthorized Pages**: Shows detailed access denied messages

### Database Security (RLS Policies)

#### Example Policy Structure:
```sql
-- Clients can only view their own bookings
CREATE POLICY "Clients can view own bookings" ON bookings
FOR SELECT USING (
  auth.is_client() AND user_id = auth.uid()
);

-- Admins can manage all bookings
CREATE POLICY "Admins can manage all bookings" ON bookings
FOR ALL USING (auth.is_admin());
```

#### Security Functions:
```sql
-- Get current user's role
auth.get_user_role() → returns TEXT

-- Role checking functions
auth.is_client() → returns BOOLEAN
auth.is_reader() → returns BOOLEAN
auth.is_monitor() → returns BOOLEAN
auth.is_admin() → returns BOOLEAN (includes super_admin)
```

### API Security Layer

#### Secure API Wrapper
```javascript
// Example: Role-based API access
const bookings = await secureAPI.getAllBookings(); 
// ↑ Only works for admin/monitor roles

const userBookings = await secureAPI.getUserBookings(userId);
// ↑ Only works for the user's own bookings or admin
```

#### Permission Matrix:
| Function | Client | Reader | Monitor | Admin | Super Admin |
|----------|--------|--------|---------|-------|-------------|
| `getUsers()` | ❌ | ❌ | ❌ | ✅ | ✅ |
| `getAllBookings()` | ❌ | ❌ | ✅ | ✅ | ✅ |
| `getUserBookings(own)` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `getAllServices()` | ❌ | ❌ | ❌ | ✅ | ✅ |
| `updateUserRole()` | ❌ | ❌ | ❌ | ❌ | ✅ |

## 🚀 Deployment Instructions

### 1. Database Setup
Execute the deployment script in your Supabase SQL Editor:
```bash
# Run this SQL file in Supabase Dashboard > SQL Editor
scripts/deploy-security.sql
```

### 2. Frontend Deployment
The frontend security is already integrated into the React application. No additional setup required.

### 3. Verification
Access the security test suite (admin only):
```
https://your-domain.com/security-test
```

## 🧪 Testing the Security

### Automated Testing
The platform includes a comprehensive security test suite accessible at `/security-test` (admin only).

#### Test Categories:
1. **API Access Tests**: Verify each role can only access appropriate APIs
2. **Permission Tests**: Validate permission checking functions
3. **Role Hierarchy Tests**: Confirm role hierarchy is working
4. **Route Protection Tests**: Ensure routes are properly protected

### Manual Testing Checklist

#### For Each Role:
- [ ] Can access their designated dashboard
- [ ] Cannot access other role dashboards
- [ ] Can only view/modify appropriate data
- [ ] Receives proper error messages for unauthorized access
- [ ] Cannot bypass restrictions via direct URL navigation

#### Database Level:
- [ ] Row Level Security (RLS) is enabled on all tables
- [ ] Policies prevent cross-user data access
- [ ] Role functions return correct values
- [ ] Unauthorized queries fail appropriately

## 📊 Security Monitoring

### Access Logging
All security events are logged for audit purposes:
```javascript
// Example security log entry
{
  user_id: "uuid",
  user_role: "client",
  event_type: "unauthorized_access_attempt",
  details: { attempted_resource: "/admin/users" },
  timestamp: "2025-01-XX",
  ip_address: "xxx.xxx.xxx.xxx"
}
```

### Monitoring Dashboard
Admins and monitors have access to:
- Real-time security alerts
- Access attempt logs
- Role assignment audit trail
- Failed authentication attempts
- Suspicious activity patterns

## ⚠️ Security Best Practices

### Development
1. **Never hardcode roles**: Always check via database functions
2. **Validate on both ends**: Frontend AND backend validation
3. **Fail securely**: Default to denying access when in doubt
4. **Log everything**: Track all security-relevant events
5. **Test thoroughly**: Use automated tests for all role combinations

### Production
1. **Regular audits**: Review access logs periodically
2. **Role reviews**: Validate user roles quarterly
3. **Update policies**: Keep RLS policies in sync with features
4. **Monitor alerts**: Set up alerts for suspicious activity
5. **Backup security**: Ensure RLS policies are backed up

## 🔧 Troubleshooting

### Common Issues

#### Users Can't Access Their Dashboard
1. Check if user has correct role in database
2. Verify RLS policies are enabled
3. Check if profile exists and is loaded
4. Review authentication state

#### API Calls Failing
1. Verify user has required permissions
2. Check RLS policies on target tables
3. Ensure helper functions are properly defined
4. Review error logs for specific denial reasons

#### Security Tests Failing
1. Confirm database policies are deployed
2. Check if all required functions exist
3. Verify test user has expected role
4. Review test scenarios match current permissions

### Debug Commands
```sql
-- Check user's current role
SELECT auth.get_user_role();

-- List all policies for a table
SELECT * FROM pg_policies WHERE tablename = 'bookings';

-- Verify RLS is enabled
SELECT tablename, rowsecurity FROM pg_tables 
WHERE schemaname = 'public' AND rowsecurity = true;
```

## 📋 Role Assignment Guide

### Assigning Roles (Super Admin Only)

#### Via Admin Dashboard:
1. Navigate to User Management
2. Select user to modify
3. Change role dropdown
4. Confirm change

#### Via SQL (Emergency):
```sql
-- Update user role (super admin only)
UPDATE profiles 
SET role = 'admin' 
WHERE email = 'user@example.com';
```

### Role Change Effects
- **Immediate**: User will be redirected to appropriate dashboard
- **Session**: May require logout/login for full effect
- **Permissions**: Database access changes immediately
- **UI**: Dashboard content updates on next page load

## 🚨 Emergency Procedures

### Security Breach Response
1. **Identify scope**: Determine which roles/data affected
2. **Revoke access**: Temporarily disable affected user accounts
3. **Audit logs**: Review access logs for breach timeline
4. **Patch vulnerability**: Fix identified security gap
5. **Reset credentials**: Force password resets if needed

### System Lockdown
```sql
-- Emergency: Disable all non-super-admin access
UPDATE profiles SET is_active = false 
WHERE role != 'super_admin';

-- Re-enable after security review
UPDATE profiles SET is_active = true 
WHERE role != 'super_admin' AND id = 'specific_user_id';
```

## 📚 Additional Resources

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL Policy Documentation](https://www.postgresql.org/docs/current/sql-createpolicy.html)
- [React Route Protection Patterns](https://reactrouter.com/en/main)

## ✅ Security Checklist

### Deployment Readiness
- [ ] All RLS policies deployed
- [ ] Helper functions created
- [ ] Role constraints updated
- [ ] Frontend routes protected
- [ ] API security layer implemented
- [ ] Security tests passing
- [ ] Admin accounts created
- [ ] Emergency procedures documented
- [ ] Monitoring alerts configured
- [ ] Backup procedures tested

---

**🔒 Remember**: Security is not a feature, it's a foundation. This implementation provides enterprise-grade role-based access control to ensure your SAMIA TAROT platform is secure and compliant with data protection requirements. 