import express from 'express';
import { supabase, supabaseAdmin } from '../lib/supabase.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { dailyZodiacService } from '../services/dailyZodiacService.js';
import { getZodiacAIService } from '../services/zodiacAIService.js';
import { getZodiacTTSService } from '../services/zodiacTTSService.js';

const router = express.Router();

// =====================================================
// DAILY ZODIAC API ROUTES
// =====================================================

/**
 * @route POST /api/daily-zodiac/setup-storage
 * @desc Create Supabase Storage bucket for zodiac audio (One-time setup)
 * @access Admin
 */
router.post('/setup-storage', 
  authenticateToken, 
  requireRole(['admin', 'super_admin']), 
  async (req, res) => {
    try {
      console.log('🚨 [PRODUCTION SETUP] Creating zodiac-audio bucket...');
      
      // Create the bucket
      const { data, error } = await supabaseAdmin.storage.createBucket('zodiac-audio', {
        public: true,
        allowedMimeTypes: ['audio/mpeg', 'audio/mp3'],
        fileSizeLimit: 10485760 // 10MB per file
      });

      if (error && !error.message.includes('already exists')) {
        console.error('❌ Failed to create bucket:', error);
        return res.status(500).json({
          success: false,
          error: 'Failed to create storage bucket',
          details: error.message
        });
      }

      // Verify bucket exists
      const { data: buckets, error: listError } = await supabaseAdmin.storage.listBuckets();
      if (listError) {
        return res.status(500).json({
          success: false,
          error: 'Failed to verify bucket creation',
          details: listError.message
        });
      }

      const zodiacBucket = buckets.find(b => b.name === 'zodiac-audio');
      if (!zodiacBucket) {
        return res.status(500).json({
          success: false,
          error: 'Bucket not found after creation'
        });
      }

      // Test upload
      const testContent = Buffer.from('Test audio file for zodiac system');
      const testPath = `test/setup-test-${Date.now()}.mp3`;

      const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
        .from('zodiac-audio')
        .upload(testPath, testContent, {
          contentType: 'audio/mpeg'
        });

      if (uploadError) {
        return res.status(500).json({
          success: false,
          error: 'Bucket created but upload test failed',
          details: uploadError.message
        });
      }

      // Get public URL
      const { data: urlData } = supabaseAdmin.storage
        .from('zodiac-audio')
        .getPublicUrl(testPath);

      // Clean up test file
      await supabaseAdmin.storage
        .from('zodiac-audio')
        .remove([testPath]);

      console.log('✅ Zodiac storage bucket setup complete');

      res.json({
        success: true,
        message: 'Zodiac audio storage bucket created and tested successfully',
        data: {
          bucketName: 'zodiac-audio',
          bucketId: zodiacBucket.id,
          testUrl: urlData.publicUrl,
          isPublic: zodiacBucket.public,
          allowedMimeTypes: ['audio/mpeg', 'audio/mp3'],
          fileSizeLimit: '10MB'
        }
      });

    } catch (error) {
      console.error('🚨 Storage setup error:', error);
      res.status(500).json({
        success: false,
        error: 'Storage setup failed',
        details: error.message
      });
    }
  }
);

/**
 * @route GET /api/daily-zodiac
 * @desc Get today's zodiac readings for all signs
 * @access Public
 */
router.get('/', async (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date || new Date().toISOString().split('T')[0];

    const result = await dailyZodiacService.getTodaysReadings(targetDate);
    
    if (result.success) {
      res.json({
        success: true,
        data: {
          readings: result.data,
          date: targetDate,
          total_signs: result.data.length
        }
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
        code: 'ZODIAC_FETCH_FAILED'
      });
    }
  } catch (error) {
    console.error('Get daily zodiac error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch daily zodiac readings',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * @route GET /api/daily-zodiac/signs
 * @desc Get all zodiac signs with their basic information
 * @access Public
 */
router.get('/signs', async (req, res) => {
  try {
    const { language = 'en' } = req.query;
    
    const zodiacSigns = await dailyZodiacService.getAllZodiacSigns(language);
    
    res.json({
      success: true,
      data: {
        signs: zodiacSigns,
        language: language,
        total: zodiacSigns.length
      }
    });
  } catch (error) {
    console.error('Get zodiac signs error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch zodiac signs',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * @route GET /api/daily-zodiac/history
 * @desc Get historical readings for a specific sign
 * @access Public
 */
router.get('/history', async (req, res) => {
  try {
    const { zodiac_sign, limit = 30, page = 1 } = req.query;
    
    if (!zodiac_sign) {
      return res.status(400).json({
        success: false,
        error: 'Zodiac sign is required',
        code: 'ZODIAC_SIGN_REQUIRED'
      });
    }

    const result = await dailyZodiacService.getSignHistory(zodiac_sign, {
      limit: parseInt(limit),
      page: parseInt(page)
    });
    
    if (result.success) {
      res.json({
        success: true,
        data: result.data
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
        code: 'HISTORY_FETCH_FAILED'
      });
    }
  } catch (error) {
    console.error('Get zodiac history error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch zodiac history',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * @route POST /api/daily-zodiac/generate
 * @desc Generate new daily horoscopes for all signs (Admin only)
 * @access Admin/Super Admin
 */
router.post('/generate', 
  authenticateToken, 
  requireRole(['admin', 'super_admin']), 
  async (req, res) => {
    try {
      const { 
        date, 
        force_regenerate = false, 
        specific_signs = null,
        tts_provider = null 
      } = req.body;
      
      const targetDate = date || new Date().toISOString().split('T')[0];
      const userId = req.user.id;

      // Start generation process
      const result = await dailyZodiacService.generateDailyReadings({
        date: targetDate,
        forceRegenerate: force_regenerate,
        specificSigns: specific_signs,
        ttsProvider: tts_provider,
        generatedBy: userId,
        generationType: 'manual'
      });

      if (result.success) {
        res.json({
          success: true,
          data: {
            generation_id: result.generationId,
            message: 'Daily zodiac generation started successfully',
            date: targetDate,
            signs_to_generate: result.signsToGenerate,
            estimated_completion: result.estimatedCompletion
          }
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error,
          code: 'GENERATION_FAILED'
        });
      }
    } catch (error) {
      console.error('Generate daily zodiac error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to start zodiac generation',
        code: 'INTERNAL_ERROR'
      });
    }
  }
);

/**
 * @route GET /api/daily-zodiac/generation-status/:id
 * @desc Get status of a zodiac generation process
 * @access Admin/Super Admin
 */
router.get('/generation-status/:id', 
  authenticateToken, 
  requireRole(['admin', 'super_admin']), 
  async (req, res) => {
    try {
      const { id } = req.params;
      
      const result = await dailyZodiacService.getGenerationStatus(id);
      
      if (result.success) {
        res.json({
          success: true,
          data: result.data
        });
      } else {
        res.status(404).json({
          success: false,
          error: result.error,
          code: 'GENERATION_NOT_FOUND'
        });
      }
    } catch (error) {
      console.error('Get generation status error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get generation status',
        code: 'INTERNAL_ERROR'
      });
    }
  }
);

/**
 * @route PATCH /api/daily-zodiac/:id
 * @desc Update a specific zodiac reading (Admin only)
 * @access Admin/Super Admin
 */
router.patch('/:id', 
  authenticateToken, 
  requireRole(['admin', 'super_admin']), 
  async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;
      const userId = req.user.id;

      const result = await dailyZodiacService.updateReading(id, updateData, userId);
      
      if (result.success) {
        res.json({
          success: true,
          data: result.data,
          message: 'Zodiac reading updated successfully'
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error,
          code: 'UPDATE_FAILED'
        });
      }
    } catch (error) {
      console.error('Update zodiac reading error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update zodiac reading',
        code: 'INTERNAL_ERROR'
      });
    }
  }
);

/**
 * @route DELETE /api/daily-zodiac/:id
 * @desc Delete a specific zodiac reading (Admin only)
 * @access Admin/Super Admin
 */
router.delete('/:id', 
  authenticateToken, 
  requireRole(['admin', 'super_admin']), 
  async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const result = await dailyZodiacService.deleteReading(id, userId);
      
      if (result.success) {
        res.json({
          success: true,
          message: 'Zodiac reading deleted successfully'
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error,
          code: 'DELETE_FAILED'
        });
      }
    } catch (error) {
      console.error('Delete zodiac reading error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete zodiac reading',
        code: 'INTERNAL_ERROR'
      });
    }
  }
);

/**
 * @route GET /api/daily-zodiac/config
 * @desc Get zodiac system configuration (Admin only)
 * @access Admin/Super Admin
 */
router.get('/config', 
  authenticateToken, 
  requireRole(['admin', 'super_admin']), 
  async (req, res) => {
    try {
      const result = await dailyZodiacService.getSystemConfig();
      
      if (result.success) {
        res.json({
          success: true,
          data: result.data
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error,
          code: 'CONFIG_FETCH_FAILED'
        });
      }
    } catch (error) {
      console.error('Get zodiac config error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch zodiac configuration',
        code: 'INTERNAL_ERROR'
      });
    }
  }
);

/**
 * @route PUT /api/daily-zodiac/config
 * @desc Update zodiac system configuration (Admin only)
 * @access Admin/Super Admin
 */
router.put('/config', 
  authenticateToken, 
  requireRole(['admin', 'super_admin']), 
  async (req, res) => {
    try {
      const configUpdates = req.body;
      const userId = req.user.id;

      const result = await dailyZodiacService.updateSystemConfig(configUpdates, userId);
      
      if (result.success) {
        res.json({
          success: true,
          data: result.data,
          message: 'Zodiac configuration updated successfully'
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error,
          code: 'CONFIG_UPDATE_FAILED'
        });
      }
    } catch (error) {
      console.error('Update zodiac config error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update zodiac configuration',
        code: 'INTERNAL_ERROR'
      });
    }
  }
);

/**
 * @route POST /api/daily-zodiac/test-voice
 * @desc Test TTS voice generation (Admin only)
 * @access Admin/Super Admin
 */
router.post('/test-voice', 
  authenticateToken, 
  requireRole(['admin', 'super_admin']), 
  async (req, res) => {
    try {
      const { text, language, provider, voice_id } = req.body;
      
      if (!text || !language) {
        return res.status(400).json({
          success: false,
          error: 'Text and language are required',
          code: 'MISSING_PARAMETERS'
        });
      }

      const zodiacTTSService = getZodiacTTSService();
      const result = await zodiacTTSService.testVoice({
        text,
        language,
        provider,
        voiceId: voice_id
      });
      
      if (result.success) {
        res.json({
          success: true,
          data: {
            audio_url: result.audioUrl,
            provider_used: result.provider,
            voice_used: result.voice,
            test_timestamp: new Date().toISOString()
          }
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error,
          code: 'VOICE_TEST_FAILED'
        });
      }
    } catch (error) {
      console.error('Test voice error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to test voice',
        code: 'INTERNAL_ERROR'
      });
    }
  }
);

/**
 * @route GET /api/daily-zodiac/stats
 * @desc Get zodiac system statistics (Admin only)
 * @access Admin/Super Admin
 */
router.get('/stats', 
  authenticateToken, 
  requireRole(['admin', 'super_admin']), 
  async (req, res) => {
    try {
      const result = await dailyZodiacService.getSystemStats();
      
      if (result.success) {
        res.json({
          success: true,
          data: result.data
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error,
          code: 'STATS_FETCH_FAILED'
        });
      }
    } catch (error) {
      console.error('Get zodiac stats error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch zodiac statistics',
        code: 'INTERNAL_ERROR'
      });
    }
  }
);

/**
 * @route GET /api/daily-zodiac/credential-status
 * @desc Check TTS provider credential status (Admin only)
 * @access Admin/Super Admin
 */
router.get('/credential-status', 
  authenticateToken, 
  requireRole(['admin', 'super_admin']), 
  async (req, res) => {
    try {
      const result = await dailyZodiacService.checkCredentialStatus();
      
      if (result.success) {
        res.json({
          success: true,
          data: result.data
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error,
          code: 'CREDENTIAL_CHECK_FAILED'
        });
      }
    } catch (error) {
      console.error('Check credential status error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to check credential status',
        code: 'INTERNAL_ERROR'
      });
    }
  }
);

/**
 * @route GET /api/daily-zodiac/logs
 * @desc Get generation logs (Admin only)
 * @access Admin/Super Admin
 */
router.get('/logs', 
  authenticateToken, 
  requireRole(['admin', 'super_admin']), 
  async (req, res) => {
    try {
      const { limit = 50, page = 1, status } = req.query;
      
      const result = await dailyZodiacService.getGenerationLogs({
        limit: parseInt(limit),
        page: parseInt(page),
        status
      });
      
      if (result.success) {
        res.json({
          success: true,
          data: result.data
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error,
          code: 'LOGS_FETCH_FAILED'
        });
      }
    } catch (error) {
      console.error('Get zodiac logs error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch zodiac logs',
        code: 'INTERNAL_ERROR'
      });
    }
  }
);

/**
 * @route POST /api/daily-zodiac/cleanup
 * @desc Manually trigger cleanup of old zodiac audio files
 * @access Admin/Super Admin
 */
router.post('/cleanup', 
  authenticateToken, 
  requireRole(['admin', 'super_admin']), 
  async (req, res) => {
    try {
      const { date } = req.body;
      const currentDate = date || new Date().toISOString().split('T')[0];
      const userId = req.user.id;

      console.log('🧹 [MANUAL CLEANUP] Starting manual cleanup for date:', currentDate);

      const { zodiacCleanupService } = await import('../services/zodiacCleanupService.js');
      const cleanupResults = await zodiacCleanupService.cleanupOldZodiacFiles(currentDate, userId);

      if (cleanupResults.success) {
        res.json({
          success: true,
          message: 'Cleanup completed successfully',
          data: {
            current_date: cleanupResults.currentDate,
            files_deleted: cleanupResults.summary.storageFilesDeleted,
            records_updated: cleanupResults.summary.databaseRecordsUpdated,
            deleted_files: cleanupResults.deletedFiles,
            updated_records: cleanupResults.updatedRecords
          }
        });
      } else {
        res.status(400).json({
          success: false,
          error: 'Cleanup completed with errors',
          details: cleanupResults.errors,
          data: cleanupResults.summary
        });
      }

    } catch (error) {
      console.error('Manual cleanup error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to perform cleanup',
        details: error.message
      });
    }
  }
);

/**
 * @route GET /api/daily-zodiac/cleanup-status
 * @desc Get cleanup status and storage statistics
 * @access Admin/Super Admin
 */
router.get('/cleanup-status', 
  authenticateToken, 
  requireRole(['admin', 'super_admin']), 
  async (req, res) => {
    try {
      const { zodiacCleanupService } = await import('../services/zodiacCleanupService.js');
      const statusResult = await zodiacCleanupService.getCleanupStatus();

      if (statusResult.success) {
        res.json({
          success: true,
          data: statusResult.data
        });
      } else {
        res.status(400).json({
          success: false,
          error: statusResult.error
        });
      }

    } catch (error) {
      console.error('Get cleanup status error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get cleanup status',
        details: error.message
      });
    }
  }
);

/**
 * @route POST /api/daily-zodiac/add-word-timings-columns
 * @desc Add word timing columns to daily_zodiac table (One-time setup)
 * @access Admin
 */
router.post('/add-word-timings-columns', 
  authenticateToken, 
  requireRole(['admin', 'super_admin']),
  async (req, res) => {
    try {
      console.log('🔧 [SCHEMA UPDATE] Adding word timings columns to daily_zodiac table...');
      
      // First, let's check if the columns already exist by trying to select them
      const { data: testData, error: testError } = await supabaseAdmin
        .from('daily_zodiac')
        .select('id, word_timings_ar, word_timings_en')
        .limit(1);
      
      if (!testError) {
        console.log('✅ Word timings columns already exist');
        return res.json({
          success: true,
          message: 'Word timings columns already exist',
          data: {
            columnsExist: true,
            testResult: testData
          }
        });
      }
      
      console.log('ℹ️ Word timings columns do not exist, they need to be added manually');
      console.log('❌ Test error:', testError.message);
      
      // Since we can't run DDL directly, we'll provide instructions
      res.json({
        success: false,
        message: 'Word timings columns need to be added manually to the database',
        error: testError.message,
        instructions: {
          sql: [
            'ALTER TABLE daily_zodiac ADD COLUMN IF NOT EXISTS word_timings_ar JSONB;',
            'ALTER TABLE daily_zodiac ADD COLUMN IF NOT EXISTS word_timings_en JSONB;',
            'CREATE INDEX IF NOT EXISTS idx_daily_zodiac_word_timings_ar ON daily_zodiac USING GIN (word_timings_ar);',
            'CREATE INDEX IF NOT EXISTS idx_daily_zodiac_word_timings_en ON daily_zodiac USING GIN (word_timings_en);'
          ],
          note: 'These SQL commands need to be run directly in the Supabase SQL editor'
        }
      });

    } catch (error) {
      console.error('🚨 Schema update error:', error);
      res.status(500).json({
        success: false,
        error: 'Schema update failed',
        details: error.message
      });
    }
  }
);

export default router; 