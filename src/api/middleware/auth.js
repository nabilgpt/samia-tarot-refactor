// =============================================================================
// AUTHENTICATION MIDDLEWARE - مشترك لكل الـ APIs
// =============================================================================
// Reusable auth middleware for all API endpoints

import { supabase, supabaseAdmin } from '../lib/supabase.js';
import jwt from 'jsonwebtoken';

// =============================================================================
// AUTHENTICATION MIDDLEWARE
// =============================================================================

// التحقق من التوكن
const authenticateToken = async (req, res, next) => {
  try {
    console.log(`🔐 [AUTH] ${req.method} ${req.path} - Starting authentication...`);
    
    const authHeader = req.headers['authorization'];
    console.log('🔐 [AUTH] Authorization header:', authHeader);
    console.log('🔐 [AUTH] Authorization header type:', typeof authHeader);
    
    const token = authHeader && authHeader.split(' ')[1];
    console.log('🔐 [AUTH] Token extracted:', token ? 'success' : 'failed');
    console.log('🔐 [AUTH] Token extraction method:', authHeader ? 'split on space, index 1' : 'no header');

    if (!token) {
      console.log('🔐 [AUTH] No token provided');
      return res.status(401).json({
        success: false,
        error: 'Access token required',
        code: 'AUTH_TOKEN_MISSING'
      });
    }

    console.log('🔐 [AUTH] Token found, verifying...');
    console.log('🔐 [AUTH] Token:', token);
    console.log('🔐 [AUTH] Token length:', token.length);
    console.log('🔐 [AUTH] Token type:', typeof token);
    console.log('🔐 [AUTH] Token preview:', token.substring(0, 50) + '...');

    // Check JWT token structure
    const tokenParts = token.split('.');
    console.log('🔐 [AUTH] Token parts count:', tokenParts.length);
    console.log('🔐 [AUTH] Token parts lengths:', tokenParts.map(part => part.length));
    
    if (tokenParts.length !== 3) {
      console.log('🔐 [AUTH] Token validation failed: invalid JWT: unable to parse or verify signature, token is malformed: token contains an invalid number of segments');
      return res.status(401).json({
        success: false,
        error: 'Invalid token format',
        code: 'AUTH_TOKEN_MALFORMED'
      });
    }

    // Verify JWT token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
      console.log('🔐 [AUTH] JWT token verified successfully');
      console.log('🔐 [AUTH] Decoded payload:', JSON.stringify(decoded, null, 2));
    } catch (jwtError) {
      console.log('🔐 [AUTH] JWT verification failed:', jwtError.message);
      
      // Check if token is expired
      const isTokenExpired = jwtError.name === 'TokenExpiredError';
      
      return res.status(401).json({
        success: false,
        error: isTokenExpired ? 'Token expired' : 'Invalid or expired token',
        code: isTokenExpired ? 'AUTH_TOKEN_EXPIRED' : 'AUTH_TOKEN_INVALID',
        expired: isTokenExpired
      });
    }

    console.log(`🔐 [AUTH] Token valid for user: ${decoded.email}`);

    // جلب بيانات البروفايل الكاملة (using admin client for profile access)
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', decoded.user_id)
      .single();

    if (profileError || !profile) {
      console.log('🔐 [AUTH] Profile not found:', profileError?.message || 'No profile data');
      return res.status(404).json({
        success: false,
        error: 'User profile not found',
        code: 'PROFILE_NOT_FOUND'
      });
    }

    // Set user and profile data
    req.user = {
      id: decoded.user_id,
      email: decoded.email,
      role: decoded.role
    };
    req.profile = profile;

    console.log(`✅ [AUTH] Authentication successful for: ${decoded.email} (${decoded.role})`);
    next();

  } catch (error) {
    console.error('🚨 [AUTH] Authentication error:', error);
    return res.status(500).json({
      success: false,
      error: 'Authentication service error',
      code: 'AUTH_SERVICE_ERROR'
    });
  }
};

// التحقق من الصلاحيات
const requireRole = (allowedRoles) => {
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

// التحقق من الملكية (المستخدم نفسه أو admin)
const requireOwnershipOrAdmin = (userIdField = 'user_id') => {
  return async (req, res, next) => {
    try {
      const requestingUserId = req.user.id;
      const requestingUserRole = req.profile.role;
      
      // الـ admin يمكنه الوصول لكل شيء
      if (['admin', 'super_admin'].includes(requestingUserRole)) {
        return next();
      }

      // التحقق من الملكية
      const resourceUserId = req.params.id || req.body[userIdField];
      
      if (resourceUserId !== requestingUserId) {
        return res.status(403).json({
          success: false,
          error: 'You can only access your own resources',
          code: 'ACCESS_DENIED'
        });
      }

      next();
    } catch (error) {
      console.error('Ownership check error:', error);
      return res.status(500).json({
        success: false,
        error: 'Authorization check failed',
        code: 'AUTH_CHECK_ERROR'
      });
    }
  };
};

// التحقق من الإعدادات الأمنية الإضافية
const checkSecuritySettings = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    // التحقق من محاولات تسجيل الدخول المتعددة
    const { data: recentLogins } = await supabaseAdmin
      .from('user_sessions')
      .select('created_at')
      .eq('user_id', userId)
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false });

    if (recentLogins && recentLogins.length > 10) {
      console.warn(`Unusual login activity for user ${userId}`);
      // يمكن إضافة تدابير أمنية إضافية هنا
    }

    // التحقق من تجميد الحساب
    const { data: adminActions } = await supabaseAdmin
      .from('admin_actions')
      .select('action_type, created_at')
      .eq('target_user_id', userId)
      .eq('action_type', 'account_freeze')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .single();

    if (adminActions) {
      return res.status(403).json({
        success: false,
        error: 'Account is temporarily frozen',
        code: 'ACCOUNT_FROZEN'
      });
    }

    next();
  } catch (error) {
    // في حالة خطأ في التحقق، نكمل بدون منع الوصول
    console.error('Security check error:', error);
    next();
  }
};

export {
  authenticateToken,
  requireRole,
  requireOwnershipOrAdmin,
  checkSecuritySettings,
  supabase,
  supabaseAdmin
}; 