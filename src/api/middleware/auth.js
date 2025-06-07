// =============================================================================
// AUTHENTICATION MIDDLEWARE - مشترك لكل الـ APIs
// =============================================================================
// Reusable auth middleware for all API endpoints

const { supabaseAdmin: supabase } = require('../lib/supabase.js');

// =============================================================================
// AUTHENTICATION MIDDLEWARE
// =============================================================================

// التحقق من التوكن
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Access token required',
        code: 'AUTH_TOKEN_MISSING'
      });
    }

    // التحقق من التوكن مع Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return res.status(403).json({
        success: false,
        error: 'Invalid or expired token',
        code: 'AUTH_TOKEN_INVALID'
      });
    }

    // جلب بيانات البروفايل الكاملة
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return res.status(404).json({
        success: false,
        error: 'User profile not found',
        code: 'PROFILE_NOT_FOUND'
      });
    }

    // التحقق من أن الحساب نشط
    if (!profile.is_active) {
      return res.status(403).json({
        success: false,
        error: 'Account is deactivated',
        code: 'ACCOUNT_DEACTIVATED'
      });
    }

    req.user = user;
    req.profile = profile;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(500).json({
      success: false,
      error: 'Authentication failed',
      code: 'AUTH_ERROR'
    });
  }
};

// التحقق من الصلاحيات
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.profile || !allowedRoles.includes(req.profile.role)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS',
        required_roles: allowedRoles,
        user_role: req.profile?.role
      });
    }
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
    const { data: recentLogins } = await supabase
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
    const { data: adminActions } = await supabase
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

module.exports = {
  authenticateToken,
  requireRole,
  requireOwnershipOrAdmin,
  checkSecuritySettings,
  supabase
}; 