// =============================================================================
// PROFILES API - إدارة الملفات الشخصية
// =============================================================================
// Node.js + Express + Supabase integration
// Secure, scalable, production-ready API endpoints

const express = require('express');

const validator = require('validator');
const rateLimit = require('express-rate-limit');

const router = express.Router();

// =============================================================================
// SUPABASE CLIENT SETUP
// =============================================================================
const { supabaseAdmin: supabase } = require('./lib/supabase.js');

// =============================================================================
// RATE LIMITING - حماية من الـ spam
// =============================================================================
const profilesRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests, please try again later',
    code: 'RATE_LIMIT_EXCEEDED'
  }
});

// =============================================================================
// MIDDLEWARE - Authentication & Authorization
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
        required_roles: allowedRoles
      });
    }
    next();
  };
};

// =============================================================================
// VALIDATION HELPERS
// =============================================================================

const validateProfileData = (data, isUpdate = false) => {
  const errors = [];

  // التحقق من الايميل
  if (data.email && !validator.isEmail(data.email)) {
    errors.push('Invalid email format');
  }

  // التحقق من رقم الهاتف
  if (data.phone && !validator.isMobilePhone(data.phone)) {
    errors.push('Invalid phone number format');
  }

  // التحقق من الاسم الأول
  if (!isUpdate && (!data.first_name || data.first_name.trim().length < 2)) {
    errors.push('First name must be at least 2 characters');
  }

  // التحقق من الدور
  if (data.role && !['client', 'reader', 'admin', 'super_admin'].includes(data.role)) {
    errors.push('Invalid role specified');
  }

  // التحقق من الجنس
  if (data.gender && !['male', 'female', 'other'].includes(data.gender)) {
    errors.push('Invalid gender specified');
  }

  // التحقق من تاريخ الميلاد
  if (data.date_of_birth && !validator.isDate(data.date_of_birth)) {
    errors.push('Invalid date of birth format');
  }

  // التحقق من الـ URL للصورة
  if (data.avatar_url && !validator.isURL(data.avatar_url)) {
    errors.push('Invalid avatar URL format');
  }

  return errors;
};

// =============================================================================
// API ENDPOINTS
// =============================================================================

// GET /api/profiles - استعلام كل البروفايلات (admin only)
router.get('/', profilesRateLimit, authenticateToken, requireRole(['admin', 'super_admin']), async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      role, 
      is_active, 
      search,
      sort_by = 'created_at',
      sort_order = 'desc'
    } = req.query;

    // بناء الـ query
    let query = supabase
      .from('profiles')
      .select(`
        id, first_name, last_name, email, phone, role, is_active, 
        avatar_url, country, created_at, updated_at,
        specialties, languages, timezone
      `);

    // فلترة حسب الدور
    if (role) {
      query = query.eq('role', role);
    }

    // فلترة حسب الحالة
    if (is_active !== undefined) {
      query = query.eq('is_active', is_active === 'true');
    }

    // البحث في الاسم أو الايميل
    if (search) {
      query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    // الترتيب
    query = query.order(sort_by, { ascending: sort_order === 'asc' });

    // التقسيم إلى صفحات
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + parseInt(limit) - 1);

    const { data: profiles, error, count } = await query;

    if (error) {
      console.error('Error fetching profiles:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch profiles',
        code: 'FETCH_ERROR'
      });
    }

    // إحصائيات إضافية للـ admin
    const { data: stats } = await supabase
      .from('profiles')
      .select('role')
      .eq('is_active', true);

    const roleStats = stats?.reduce((acc, profile) => {
      acc[profile.role] = (acc[profile.role] || 0) + 1;
      return acc;
    }, {}) || {};

    res.json({
      success: true,
      data: {
        profiles,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count,
          total_pages: Math.ceil(count / limit)
        },
        stats: roleStats
      }
    });

  } catch (error) {
    console.error('Profiles fetch error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// GET /api/profiles/:id - بيانات بروفايل معيّن
router.get('/:id', profilesRateLimit, authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const requestingUserId = req.user.id;
    const requestingUserRole = req.profile.role;

    // التحقق من الصلاحية (المستخدم نفسه أو admin)
    if (id !== requestingUserId && !['admin', 'super_admin'].includes(requestingUserRole)) {
      return res.status(403).json({
        success: false,
        error: 'You can only access your own profile',
        code: 'ACCESS_DENIED'
      });
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .select(`
        id, first_name, last_name, email, phone, date_of_birth, gender,
        country, country_code, zodiac, avatar_url, role, is_active, bio,
        specialties, languages, timezone, created_at, updated_at
      `)
      .eq('id', id)
      .single();

    if (error || !profile) {
      return res.status(404).json({
        success: false,
        error: 'Profile not found',
        code: 'PROFILE_NOT_FOUND'
      });
    }

    // إحصائيات إضافية للقارئين
    if (profile.role === 'reader') {
      const { data: readerStats } = await supabase
        .rpc('get_reader_stats', { reader_id: id });

      profile.stats = readerStats?.[0] || {
        total_bookings: 0,
        completed_bookings: 0,
        average_rating: 0,
        total_earnings: 0
      };
    }

    res.json({
      success: true,
      data: profile
    });

  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// POST /api/profiles - إنشاء بروفايل جديد
router.post('/', profilesRateLimit, authenticateToken, requireRole(['admin', 'super_admin']), async (req, res) => {
  try {
    const profileData = req.body;

    // التحقق من صحة البيانات
    const validationErrors = validateProfileData(profileData);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: validationErrors
      });
    }

    // التحقق من عدم وجود ايميل مكرر
    if (profileData.email) {
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', profileData.email)
        .single();

      if (existingProfile) {
        return res.status(409).json({
          success: false,
          error: 'Email already exists',
          code: 'EMAIL_EXISTS'
        });
      }
    }

    // إنشاء حساب جديد في Auth
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: profileData.email,
      password: profileData.password || Math.random().toString(36).slice(-8),
      email_confirm: true,
      user_metadata: {
        first_name: profileData.first_name,
        last_name: profileData.last_name,
        role: profileData.role || 'client'
      }
    });

    if (authError) {
      console.error('Auth user creation error:', authError);
      return res.status(500).json({
        success: false,
        error: 'Failed to create user account',
        code: 'AUTH_CREATION_ERROR'
      });
    }

    // إنشاء البروفايل
    const newProfile = {
      id: authUser.user.id,
      first_name: profileData.first_name,
      last_name: profileData.last_name,
      email: profileData.email,
      phone: profileData.phone,
      date_of_birth: profileData.date_of_birth,
      gender: profileData.gender,
      country: profileData.country,
      country_code: profileData.country_code,
      zodiac: profileData.zodiac,
      avatar_url: profileData.avatar_url,
      role: profileData.role || 'client',
      is_active: profileData.is_active !== undefined ? profileData.is_active : true,
      bio: profileData.bio,
      specialties: profileData.specialties || [],
      languages: profileData.languages || ['en'],
      timezone: profileData.timezone || 'UTC'
    };

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .insert([newProfile])
      .select()
      .single();

    if (profileError) {
      console.error('Profile creation error:', profileError);
      // حذف المستخدم من Auth إذا فشل إنشاء البروفايل
      await supabase.auth.admin.deleteUser(authUser.user.id);
      
      return res.status(500).json({
        success: false,
        error: 'Failed to create profile',
        code: 'PROFILE_CREATION_ERROR'
      });
    }

    // إرسال إشعار ترحيب
    await supabase
      .from('notifications')
      .insert([{
        user_id: profile.id,
        title: 'Welcome to SAMIA TAROT!',
        message: 'Your account has been successfully created.',
        type: 'system'
      }]);

    res.status(201).json({
      success: true,
      data: profile,
      message: 'Profile created successfully'
    });

  } catch (error) {
    console.error('Profile creation error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// PUT /api/profiles/:id - تعديل بروفايل
router.put('/:id', profilesRateLimit, authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const requestingUserId = req.user.id;
    const requestingUserRole = req.profile.role;

    // التحقق من الصلاحية
    if (id !== requestingUserId && !['admin', 'super_admin'].includes(requestingUserRole)) {
      return res.status(403).json({
        success: false,
        error: 'You can only update your own profile',
        code: 'ACCESS_DENIED'
      });
    }

    // التحقق من صحة البيانات
    const validationErrors = validateProfileData(updateData, true);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: validationErrors
      });
    }

    // منع المستخدمين العاديين من تغيير الدور
    if (updateData.role && !['admin', 'super_admin'].includes(requestingUserRole)) {
      delete updateData.role;
    }

    // منع المستخدمين العاديين من تغيير حالة التفعيل
    if (updateData.is_active !== undefined && !['admin', 'super_admin'].includes(requestingUserRole)) {
      delete updateData.is_active;
    }

    // إضافة timestamp التحديث
    updateData.updated_at = new Date().toISOString();

    // تحديث البروفايل
    const { data: updatedProfile, error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Profile update error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to update profile',
        code: 'UPDATE_ERROR'
      });
    }

    // تسجيل في الـ audit log
    await supabase
      .from('audit_logs')
      .insert([{
        user_id: requestingUserId,
        action: 'profile_update',
        resource_type: 'profile',
        resource_id: id,
        details: {
          updated_fields: Object.keys(updateData),
          updated_by: requestingUserId
        }
      }]);

    res.json({
      success: true,
      data: updatedProfile,
      message: 'Profile updated successfully'
    });

  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// DELETE /api/profiles/:id - حذف بروفايل (admin only)
router.delete('/:id', profilesRateLimit, authenticateToken, requireRole(['admin', 'super_admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const requestingUserId = req.user.id;

    // منع حذف نفسه
    if (id === requestingUserId) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete your own profile',
        code: 'SELF_DELETE_ERROR'
      });
    }

    // التحقق من وجود البروفايل
    const { data: existingProfile, error: fetchError } = await supabase
      .from('profiles')
      .select('id, role, first_name, last_name')
      .eq('id', id)
      .single();

    if (fetchError || !existingProfile) {
      return res.status(404).json({
        success: false,
        error: 'Profile not found',
        code: 'PROFILE_NOT_FOUND'
      });
    }

    // منع حذف super_admin إلا من super_admin آخر
    if (existingProfile.role === 'super_admin' && req.profile.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        error: 'Cannot delete super admin profile',
        code: 'SUPER_ADMIN_DELETE_ERROR'
      });
    }

    // بدء transaction - حذف البروفايل أولاً
    const { error: profileDeleteError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', id);

    if (profileDeleteError) {
      console.error('Profile deletion error:', profileDeleteError);
      return res.status(500).json({
        success: false,
        error: 'Failed to delete profile',
        code: 'DELETE_ERROR'
      });
    }

    // حذف المستخدم من Auth
    const { error: authDeleteError } = await supabase.auth.admin.deleteUser(id);
    
    if (authDeleteError) {
      console.error('Auth user deletion error:', authDeleteError);
      // البروفايل تم حذفه بالفعل، لذا نكمل
    }

    // تسجيل في الـ audit log
    await supabase
      .from('audit_logs')
      .insert([{
        user_id: requestingUserId,
        action: 'profile_delete',
        resource_type: 'profile',
        resource_id: id,
        details: {
          deleted_profile: {
            name: `${existingProfile.first_name} ${existingProfile.last_name}`,
            role: existingProfile.role
          },
          deleted_by: requestingUserId
        }
      }]);

    res.json({
      success: true,
      message: 'Profile deleted successfully'
    });

  } catch (error) {
    console.error('Profile deletion error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// GET /api/profiles/me - بيانات المستخدم الحالي
router.get('/me', profilesRateLimit, authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const { data: profile, error } = await supabase
      .from('profiles')
      .select(`
        id, first_name, last_name, email, phone, date_of_birth, gender,
        country, country_code, zodiac, avatar_url, role, is_active, bio,
        specialties, languages, timezone, created_at, updated_at
      `)
      .eq('id', userId)
      .single();

    if (error || !profile) {
      return res.status(404).json({
        success: false,
        error: 'Profile not found',
        code: 'PROFILE_NOT_FOUND'
      });
    }

    // إحصائيات خاصة بالمستخدم
    const stats = {};

    if (profile.role === 'reader') {
      const { data: readerStats } = await supabase
        .rpc('get_reader_dashboard_stats', { reader_id: userId });
      stats.reader = readerStats?.[0] || {};
    }

    if (profile.role === 'client') {
      const { data: clientStats } = await supabase
        .rpc('get_client_dashboard_stats', { client_id: userId });
      stats.client = clientStats?.[0] || {};
    }

    res.json({
      success: true,
      data: {
        ...profile,
        stats
      }
    });

  } catch (error) {
    console.error('My profile fetch error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// =============================================================================
// ERROR HANDLING MIDDLEWARE
// =============================================================================
router.use((error, req, res, _next) => {
  console.error('Profiles API Error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    code: 'INTERNAL_ERROR'
  });
});

module.exports = router; 