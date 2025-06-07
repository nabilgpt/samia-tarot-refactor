const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');

// Initialize Supabase client
const { supabase } = require('./lib/supabase.js');

// Import authentication middleware
const { authenticateToken } = require('./middleware/auth.js');

// Auth-specific rate limits
const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // limit each IP to 20 auth requests per windowMs
  message: {
    error: 'حد أقصى من محاولات المصادقة تم الوصول إليه، يرجى المحاولة لاحقاً',
    code: 'AUTH_RATE_LIMIT_EXCEEDED'
  }
});

// POST /api/auth/login - تسجيل الدخول
router.post('/login', authRateLimit, async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'البريد الإلكتروني وكلمة المرور مطلوبان',
        code: 'MISSING_CREDENTIALS'
      });
    }
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) {
      return res.status(401).json({
        success: false,
        error: 'بيانات الدخول غير صحيحة',
        code: 'INVALID_CREDENTIALS'
      });
    }
    
    res.json({
      success: true,
      data: {
        user: data.user,
        session: data.session
      },
      message: 'تم تسجيل الدخول بنجاح'
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'خطأ في تسجيل الدخول',
      code: 'INTERNAL_ERROR'
    });
  }
});

// GET /api/auth/me - جلب بيانات المستخدم الحالي
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser(req.token);
    
    if (error || !user) {
      return res.status(401).json({
        success: false,
        error: 'المستخدم غير مصادق عليه',
        code: 'UNAUTHORIZED'
      });
    }
    
    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    
    if (profileError) {
      console.error('Profile fetch error:', profileError);
      // Continue without profile data if profile doesn't exist
    }
    
    res.json({
      success: true,
      data: {
        user,
        profile
      }
    });
    
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      error: 'خطأ في جلب بيانات المستخدم',
      code: 'INTERNAL_ERROR'
    });
  }
});

module.exports = router; 