import express from 'express';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';

// Initialize Supabase client
import { supabase } from './lib/supabase.js';

// Import authentication middleware
import { authenticateToken } from './middleware/auth.js';

const router = express.Router();

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
    
    // 🔥 CRITICAL FIX: Generate JWT token for frontend
    const jwtPayload = {
      user_id: data.user.id,
      email: data.user.email,
      role: data.user.role || data.user.user_metadata?.role || 'client',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
    };
    
    const jwtSecret = process.env.JWT_SECRET || '17b58aaac837fe02ebc43c5e13784d59a67ca98c0af98950427f188db90f2dc1';
    const jwtToken = jwt.sign(jwtPayload, jwtSecret);
    
    console.log('🎉 [AUTH] JWT token generated for:', data.user.email);
    console.log('🔑 [AUTH] Token length:', jwtToken.length);
    
    res.json({
      success: true,
      data: {
        user: data.user,
        session: data.session
      },
      token: jwtToken, // ✅ CRITICAL: JWT token for frontend localStorage
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

export default router; 