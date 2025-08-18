// ===========================================
// ROLE-BASED ACCESS CONTROL MIDDLEWARE
// ===========================================

/**
 * Middleware to check if user has required role
 * @param {Array} allowedRoles - Array of allowed roles
 * @returns {Function} Express middleware function
 */
export const roleCheck = (allowedRoles) => {
  return (req, res, next) => {
    console.log(`🔐 [ROLE] Checking role access for ${req.path}`);
    console.log(`🔐 [ROLE] Required roles: [${allowedRoles.join(', ')}]`);
    console.log(`🔐 [ROLE] User role: ${req.profile?.role || 'undefined'}`);
    
    if (!req.profile || !allowedRoles.includes(req.profile.role)) {
      console.log(`🔐 [ROLE] ❌ Access denied - insufficient permissions`);
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS',
        required_roles: allowedRoles,
        user_role: req.profile?.role
      });
    }
    
    console.log(`🔐 [ROLE] ✅ Role access granted`);
    next();
  };
}; 