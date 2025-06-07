// =============================================================================
// TAROT API ROUTES - روتيرات الـ Tarot API
// =============================================================================
// Express routes for all Tarot-related operations

const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');

// Import the TarotAPI functions
const { TarotAPI } = require('./tarotApi.js');

// Import authentication middleware
const { authenticateToken, requireRole } = require('./middleware/auth.js');

// =============================================================================
// RATE LIMITING
// =============================================================================

// Tarot-specific rate limits
const tarotRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 tarot requests per windowMs
  message: {
    error: 'حد أقصى من طلبات التاروت تم الوصول إليه، يرجى المحاولة لاحقاً',
    code: 'TAROT_RATE_LIMIT_EXCEEDED'
  }
});

// AI Reading rate limit (more restrictive)
const aiReadingRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // limit each IP to 10 AI reading requests per hour
  message: {
    error: 'حد أقصى من قراءات الذكاء الاصطناعي تم الوصول إليه، يرجى المحاولة لاحقاً',
    code: 'AI_READING_RATE_LIMIT_EXCEEDED'
  }
});

// =============================================================================
// TEST ENDPOINT
// =============================================================================

// GET /api/tarot/test - اختبار Tarot API
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Tarot API is working!',
    data: {
      cards_available: 78,
      spreads_available: 12,
      ai_enabled: true
    },
    timestamp: new Date().toISOString()
  });
});

// =============================================================================
// TAROT CARDS ENDPOINTS
// =============================================================================

// GET /api/tarot/cards - جلب جميع البطاقات
router.get('/cards', tarotRateLimit, async (req, res) => {
  try {
    const result = await TarotAPI.getAllCards();
    
    if (result.success) {
      res.json({
        success: true,
        data: result.data,
        count: result.data.length
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
        code: 'CARDS_FETCH_FAILED'
      });
    }
  } catch (error) {
    console.error('Get all cards error:', error);
    res.status(500).json({
      success: false,
      error: 'خطأ في جلب البطاقات',
      code: 'INTERNAL_ERROR'
    });
  }
});

// GET /api/tarot/cards/:id - جلب بطاقة واحدة
router.get('/cards/:id', tarotRateLimit, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await TarotAPI.getCardById(id);
    
    if (result.success) {
      res.json({
        success: true,
        data: result.data
      });
    } else {
      res.status(404).json({
        success: false,
        error: result.error,
        code: 'CARD_NOT_FOUND'
      });
    }
  } catch (error) {
    console.error('Get card by ID error:', error);
    res.status(500).json({
      success: false,
      error: 'خطأ في جلب البطاقة',
      code: 'INTERNAL_ERROR'
    });
  }
});

// GET /api/tarot/cards/suit/:suit - جلب البطاقات حسب النوع
router.get('/cards/suit/:suit', tarotRateLimit, async (req, res) => {
  try {
    const { suit } = req.params;
    const result = await TarotAPI.getCardsBySuit(suit);
    
    if (result.success) {
      res.json({
        success: true,
        data: result.data,
        count: result.data.length,
        suit: suit
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
        code: 'CARDS_BY_SUIT_FAILED'
      });
    }
  } catch (error) {
    console.error('Get cards by suit error:', error);
    res.status(500).json({
      success: false,
      error: 'خطأ في جلب البطاقات حسب النوع',
      code: 'INTERNAL_ERROR'
    });
  }
});

// POST /api/tarot/cards/draw - سحب بطاقات عشوائية
router.post('/cards/draw', [authenticateToken, tarotRateLimit], async (req, res) => {
  try {
    const { count = 1, excludeIds = [] } = req.body;
    
    // Validate count
    if (count < 1 || count > 10) {
      return res.status(400).json({
        success: false,
        error: 'عدد البطاقات يجب أن يكون بين 1 و 10',
        code: 'INVALID_CARD_COUNT'
      });
    }
    
    const result = await TarotAPI.drawRandomCards(count, excludeIds);
    
    if (result.success) {
      res.json({
        success: true,
        data: result.data,
        count: result.data.length,
        drawn_at: new Date().toISOString()
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
        code: 'CARD_DRAW_FAILED'
      });
    }
  } catch (error) {
    console.error('Draw cards error:', error);
    res.status(500).json({
      success: false,
      error: 'خطأ في سحب البطاقات',
      code: 'INTERNAL_ERROR'
    });
  }
});

// =============================================================================
// TAROT SPREADS ENDPOINTS
// =============================================================================

// GET /api/tarot/spreads - جلب جميع التوزيعات
router.get('/spreads', tarotRateLimit, async (req, res) => {
  try {
    const result = await TarotAPI.getAllSpreads();
    
    if (result.success) {
      res.json({
        success: true,
        data: result.data,
        count: result.data.length
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
        code: 'SPREADS_FETCH_FAILED'
      });
    }
  } catch (error) {
    console.error('Get all spreads error:', error);
    res.status(500).json({
      success: false,
      error: 'خطأ في جلب التوزيعات',
      code: 'INTERNAL_ERROR'
    });
  }
});

// GET /api/tarot/spreads/:id - جلب توزيع واحد
router.get('/spreads/:id', tarotRateLimit, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await TarotAPI.getSpreadById(id);
    
    if (result.success) {
      res.json({
        success: true,
        data: result.data
      });
    } else {
      res.status(404).json({
        success: false,
        error: result.error,
        code: 'SPREAD_NOT_FOUND'
      });
    }
  } catch (error) {
    console.error('Get spread by ID error:', error);
    res.status(500).json({
      success: false,
      error: 'خطأ في جلب التوزيع',
      code: 'INTERNAL_ERROR'
    });
  }
});

// GET /api/tarot/spreads/category/:category - جلب التوزيعات حسب الفئة
router.get('/spreads/category/:category', tarotRateLimit, async (req, res) => {
  try {
    const { category } = req.params;
    const result = await TarotAPI.getSpreadsByCategory(category);
    
    if (result.success) {
      res.json({
        success: true,
        data: result.data,
        count: result.data.length,
        category: category
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
        code: 'SPREADS_BY_CATEGORY_FAILED'
      });
    }
  } catch (error) {
    console.error('Get spreads by category error:', error);
    res.status(500).json({
      success: false,
      error: 'خطأ في جلب التوزيعات حسب الفئة',
      code: 'INTERNAL_ERROR'
    });
  }
});

// POST /api/tarot/spreads - إنشاء توزيع جديد (Admin only)
router.post('/spreads', [authenticateToken, requireRole(['super_admin', 'admin']), tarotRateLimit], async (req, res) => {
  try {
    const spreadData = {
      ...req.body,
      created_by: req.user.user_id,
      created_at: new Date().toISOString()
    };
    
    const result = await TarotAPI.createSpread(spreadData);
    
    if (result.success) {
      res.status(201).json({
        success: true,
        data: result.data,
        message: 'تم إنشاء التوزيع بنجاح'
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
        code: 'SPREAD_CREATION_FAILED'
      });
    }
  } catch (error) {
    console.error('Create spread error:', error);
    res.status(500).json({
      success: false,
      error: 'خطأ في إنشاء التوزيع',
      code: 'INTERNAL_ERROR'
    });
  }
});

// =============================================================================
// TAROT READINGS ENDPOINTS
// =============================================================================

// GET /api/tarot/readings/my - جلب قراءات المستخدم
router.get('/readings/my', [authenticateToken, tarotRateLimit], async (req, res) => {
  try {
    const userId = req.user.user_id;
    const userRole = req.user.role;
    
    // Determine role for fetching readings
    const role = ['reader', 'admin', 'super_admin'].includes(userRole) ? 'reader' : 'client';
    
    const result = await TarotAPI.getUserReadings(userId, role);
    
    if (result.success) {
      res.json({
        success: true,
        data: result.data,
        count: result.data.length,
        role: role
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
        code: 'USER_READINGS_FETCH_FAILED'
      });
    }
  } catch (error) {
    console.error('Get user readings error:', error);
    res.status(500).json({
      success: false,
      error: 'خطأ في جلب القراءات',
      code: 'INTERNAL_ERROR'
    });
  }
});

// GET /api/tarot/readings/:id - جلب قراءة واحدة
router.get('/readings/:id', [authenticateToken, tarotRateLimit], async (req, res) => {
  try {
    const { id } = req.params;
    const result = await TarotAPI.getReading(id);
    
    if (result.success) {
      // Check if user has access to this reading
      const userId = req.user.user_id;
      const reading = result.data;
      
      const hasAccess = reading.client_id === userId || 
                       reading.reader_id === userId ||
                       ['admin', 'super_admin'].includes(req.user.role);
      
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          error: 'غير مسموح لك بالوصول لهذه القراءة',
          code: 'ACCESS_DENIED'
        });
      }
      
      res.json({
        success: true,
        data: result.data
      });
    } else {
      res.status(404).json({
        success: false,
        error: result.error,
        code: 'READING_NOT_FOUND'
      });
    }
  } catch (error) {
    console.error('Get reading error:', error);
    res.status(500).json({
      success: false,
      error: 'خطأ في جلب القراءة',
      code: 'INTERNAL_ERROR'
    });
  }
});

// POST /api/tarot/readings - إنشاء قراءة جديدة
router.post('/readings', [authenticateToken, tarotRateLimit], async (req, res) => {
  try {
    const readingData = {
      ...req.body,
      created_at: new Date().toISOString()
    };
    
    const result = await TarotAPI.createReading(readingData);
    
    if (result.success) {
      res.status(201).json({
        success: true,
        data: result.data,
        message: 'تم إنشاء القراءة بنجاح'
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
        code: 'READING_CREATION_FAILED'
      });
    }
  } catch (error) {
    console.error('Create reading error:', error);
    res.status(500).json({
      success: false,
      error: 'خطأ في إنشاء القراءة',
      code: 'INTERNAL_ERROR'
    });
  }
});

// POST /api/tarot/readings/perform - تنفيذ قراءة كاملة
router.post('/readings/perform', [authenticateToken, requireRole(['reader', 'admin', 'super_admin']), tarotRateLimit], async (req, res) => {
  try {
    const { bookingId, clientId, spreadId, question, questionCategory } = req.body;
    const readerId = req.user.user_id;
    
    // Validate required fields
    if (!bookingId || !clientId || !spreadId || !question) {
      return res.status(400).json({
        success: false,
        error: 'جميع الحقول مطلوبة: bookingId, clientId, spreadId, question',
        code: 'MISSING_REQUIRED_FIELDS'
      });
    }
    
    const result = await TarotAPI.performReading(
      bookingId, 
      clientId, 
      readerId, 
      spreadId, 
      question, 
      questionCategory
    );
    
    if (result.success) {
      res.status(201).json({
        success: true,
        data: result.data,
        message: 'تم تنفيذ القراءة بنجاح'
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
        code: 'READING_PERFORMANCE_FAILED'
      });
    }
  } catch (error) {
    console.error('Perform reading error:', error);
    res.status(500).json({
      success: false,
      error: 'خطأ في تنفيذ القراءة',
      code: 'INTERNAL_ERROR'
    });
  }
});

// =============================================================================
// AI READING ENDPOINTS
// =============================================================================

// POST /api/tarot/ai/generate - طلب قراءة بالذكاء الاصطناعي
router.post('/ai/generate', [authenticateToken, requireRole(['reader', 'admin', 'super_admin']), aiReadingRateLimit], async (req, res) => {
  try {
    const { bookingId, clientId, readingType, inputData, priority = 1 } = req.body;
    
    // Validate required fields
    if (!bookingId || !clientId || !readingType || !inputData) {
      return res.status(400).json({
        success: false,
        error: 'جميع الحقول مطلوبة: bookingId, clientId, readingType, inputData',
        code: 'MISSING_REQUIRED_FIELDS'
      });
    }
    
    const result = await TarotAPI.queueAIReading(
      bookingId, 
      clientId, 
      readingType, 
      inputData, 
      priority
    );
    
    if (result.success) {
      res.status(201).json({
        success: true,
        data: result.data,
        message: 'تم إضافة القراءة لقائمة الانتظار'
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
        code: 'AI_READING_QUEUE_FAILED'
      });
    }
  } catch (error) {
    console.error('AI reading generation error:', error);
    res.status(500).json({
      success: false,
      error: 'خطأ في طلب قراءة الذكاء الاصطناعي',
      code: 'INTERNAL_ERROR'
    });
  }
});

// GET /api/tarot/ai/status/:queueId - حالة قراءة الذكاء الاصطناعي
router.get('/ai/status/:queueId', [authenticateToken, tarotRateLimit], async (req, res) => {
  try {
    const { queueId } = req.params;
    const result = await TarotAPI.getAIReadingStatus(queueId);
    
    if (result.success) {
      res.json({
        success: true,
        data: result.data
      });
    } else {
      res.status(404).json({
        success: false,
        error: result.error,
        code: 'AI_READING_STATUS_NOT_FOUND'
      });
    }
  } catch (error) {
    console.error('Get AI reading status error:', error);
    res.status(500).json({
      success: false,
      error: 'خطأ في جلب حالة قراءة الذكاء الاصطناعي',
      code: 'INTERNAL_ERROR'
    });
  }
});

// =============================================================================
// READING SESSIONS ENDPOINTS
// =============================================================================

// GET /api/tarot/sessions/:bookingId - جلب جلسة قراءة
router.get('/sessions/:bookingId', [authenticateToken, tarotRateLimit], async (req, res) => {
  try {
    const { bookingId } = req.params;
    const result = await TarotAPI.getReadingSession(bookingId);
    
    if (result.success) {
      res.json({
        success: true,
        data: result.data
      });
    } else {
      res.status(404).json({
        success: false,
        error: result.error,
        code: 'READING_SESSION_NOT_FOUND'
      });
    }
  } catch (error) {
    console.error('Get reading session error:', error);
    res.status(500).json({
      success: false,
      error: 'خطأ في جلب جلسة القراءة',
      code: 'INTERNAL_ERROR'
    });
  }
});

// POST /api/tarot/sessions/:bookingId/start - بدء جلسة قراءة
router.post('/sessions/:bookingId/start', [authenticateToken, requireRole(['reader', 'admin', 'super_admin']), tarotRateLimit], async (req, res) => {
  try {
    const { bookingId } = req.params;
    const result = await TarotAPI.startReadingSession(bookingId);
    
    if (result.success) {
      res.status(201).json({
        success: true,
        data: result.data,
        message: 'تم بدء جلسة القراءة بنجاح'
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
        code: 'READING_SESSION_START_FAILED'
      });
    }
  } catch (error) {
    console.error('Start reading session error:', error);
    res.status(500).json({
      success: false,
      error: 'خطأ في بدء جلسة القراءة',
      code: 'INTERNAL_ERROR'
    });
  }
});

// POST /api/tarot/sessions/:bookingId/end - إنهاء جلسة قراءة
router.post('/sessions/:bookingId/end', [authenticateToken, requireRole(['reader', 'admin', 'super_admin']), tarotRateLimit], async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { notes = '', followUpRecommendations = '' } = req.body;
    
    const result = await TarotAPI.endReadingSession(bookingId, notes, followUpRecommendations);
    
    if (result.success) {
      res.json({
        success: true,
        data: result.data,
        message: 'تم إنهاء جلسة القراءة بنجاح'
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
        code: 'READING_SESSION_END_FAILED'
      });
    }
  } catch (error) {
    console.error('End reading session error:', error);
    res.status(500).json({
      success: false,
      error: 'خطأ في إنهاء جلسة القراءة',
      code: 'INTERNAL_ERROR'
    });
  }
});

// =============================================================================
// STATISTICS & ANALYTICS ENDPOINTS
// =============================================================================

// GET /api/tarot/stats/my - إحصائيات المستخدم
router.get('/stats/my', [authenticateToken, tarotRateLimit], async (req, res) => {
  try {
    const userId = req.user.user_id;
    const userRole = req.user.role;
    
    // Determine role for statistics
    const role = ['reader', 'admin', 'super_admin'].includes(userRole) ? 'reader' : 'client';
    
    const result = await TarotAPI.getReadingStatistics(userId, role);
    
    if (result.success) {
      res.json({
        success: true,
        data: result.data,
        role: role
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
        code: 'STATS_FETCH_FAILED'
      });
    }
  } catch (error) {
    console.error('Get reading statistics error:', error);
    res.status(500).json({
      success: false,
      error: 'خطأ في جلب الإحصائيات',
      code: 'INTERNAL_ERROR'
    });
  }
});

// =============================================================================
// EXPORT ROUTER
// =============================================================================

module.exports = router; 