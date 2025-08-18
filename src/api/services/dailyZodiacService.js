import { supabase } from '../lib/supabase.js';
import { getZodiacAIService } from './zodiacAIService.js';
import { getZodiacTTSService } from './zodiacTTSService.js';
import { zodiacCleanupService } from './zodiacCleanupService.js';

// =====================================================
// DAILY ZODIAC SERVICE
// =====================================================
// Main service for managing daily zodiac operations

class DailyZodiacService {
  constructor() {
    this.zodiacSigns = [
      'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
      'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'
    ];

    this.zodiacData = {
      aries: { name: { en: 'Aries', ar: 'الحمل' }, symbol: '♈', emoji: '🐏', element: { en: 'Fire', ar: 'النار' } },
      taurus: { name: { en: 'Taurus', ar: 'الثور' }, symbol: '♉', emoji: '🐂', element: { en: 'Earth', ar: 'الأرض' } },
      gemini: { name: { en: 'Gemini', ar: 'الجوزاء' }, symbol: '♊', emoji: '👯', element: { en: 'Air', ar: 'الهواء' } },
      cancer: { name: { en: 'Cancer', ar: 'السرطان' }, symbol: '♋', emoji: '🦀', element: { en: 'Water', ar: 'الماء' } },
      leo: { name: { en: 'Leo', ar: 'الأسد' }, symbol: '♌', emoji: '🦁', element: { en: 'Fire', ar: 'النار' } },
      virgo: { name: { en: 'Virgo', ar: 'العذراء' }, symbol: '♍', emoji: '👩', element: { en: 'Earth', ar: 'الأرض' } },
      libra: { name: { en: 'Libra', ar: 'الميزان' }, symbol: '♎', emoji: '⚖️', element: { en: 'Air', ar: 'الهواء' } },
      scorpio: { name: { en: 'Scorpio', ar: 'العقرب' }, symbol: '♏', emoji: '🦂', element: { en: 'Water', ar: 'الماء' } },
      sagittarius: { name: { en: 'Sagittarius', ar: 'القوس' }, symbol: '♐', emoji: '🏹', element: { en: 'Fire', ar: 'النار' } },
      capricorn: { name: { en: 'Capricorn', ar: 'الجدي' }, symbol: '♑', emoji: '🐐', element: { en: 'Earth', ar: 'الأرض' } },
      aquarius: { name: { en: 'Aquarius', ar: 'الدلو' }, symbol: '♒', emoji: '🏺', element: { en: 'Air', ar: 'الهواء' } },
      pisces: { name: { en: 'Pisces', ar: 'الحوت' }, symbol: '♓', emoji: '🐟', element: { en: 'Water', ar: 'الماء' } }
    };
  }

  /**
   * Get today's zodiac readings for all signs
   */
  async getTodaysReadings(date = null) {
    try {
      const targetDate = date || new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('daily_zodiac')
        .select('*')
        .eq('date', targetDate)
        .order('zodiac_sign');

      if (error) {
        console.error('Error fetching today\'s readings:', error);
        return { success: false, error: error.message };
      }

      // Enrich data with zodiac metadata
      const enrichedData = data.map(reading => ({
        ...reading,
        zodiac_info: this.zodiacData[reading.zodiac_sign] || null
      }));

      return { 
        success: true, 
        data: enrichedData 
      };
    } catch (error) {
      console.error('Get today\'s readings error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get all zodiac signs with their basic information
   */
  async getAllZodiacSigns(language = 'en') {
    try {
      const signs = this.zodiacSigns.map(sign => ({
        sign,
        name: this.zodiacData[sign].name[language] || this.zodiacData[sign].name.en,
        symbol: this.zodiacData[sign].symbol,
        emoji: this.zodiacData[sign].emoji,
        element: this.zodiacData[sign].element[language] || this.zodiacData[sign].element.en
      }));

      return signs;
    } catch (error) {
      console.error('Get all zodiac signs error:', error);
      throw error;
    }
  }

  /**
   * Get historical readings for a specific sign
   */
  async getSignHistory(zodiacSign, options = {}) {
    try {
      const { limit = 30, page = 1 } = options;
      const offset = (page - 1) * limit;

      const { data, error, count } = await supabase
        .from('daily_zodiac')
        .select('*', { count: 'exact' })
        .eq('zodiac_sign', zodiacSign)
        .order('date', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('Error fetching sign history:', error);
        return { success: false, error: error.message };
      }

      return {
        success: true,
        data: {
          readings: data,
          pagination: {
            page,
            limit,
            total: count,
            pages: Math.ceil(count / limit)
          }
        }
      };
    } catch (error) {
      console.error('Get sign history error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Generate daily readings for all or specific signs
   */
  async generateDailyReadings(options = {}) {
    const {
      date,
      forceRegenerate = false,
      specificSigns = null,
      ttsProvider = null,
      generatedBy,
      generationType = 'automatic'
    } = options;

    try {
      const targetDate = date || new Date().toISOString().split('T')[0];
      const signsToGenerate = specificSigns || this.zodiacSigns;

      // Create generation log entry
      const { data: logEntry, error: logError } = await supabase
        .from('zodiac_generation_logs')
        .insert({
          generation_date: targetDate,
          generation_type: generationType,
          total_signs_generated: signsToGenerate.length,
          tts_provider_used: ttsProvider,
          generated_by: generatedBy,
          status: 'running'
        })
        .select()
        .single();

      if (logError) {
        console.error('Error creating generation log:', logError);
        return { success: false, error: 'Failed to create generation log' };
      }

      // Start background generation process
      this.processGenerationInBackground(logEntry.id, targetDate, signsToGenerate, {
        forceRegenerate,
        ttsProvider,
        generatedBy
      });

      return {
        success: true,
        generationId: logEntry.id,
        signsToGenerate: signsToGenerate,
        estimatedCompletion: new Date(Date.now() + (signsToGenerate.length * 30000)) // 30 seconds per sign
      };
    } catch (error) {
      console.error('Generate daily readings error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Process generation in background (async)
   */
  async processGenerationInBackground(logId, date, signs, options) {
    let successCount = 0;
    let failCount = 0;
    const errors = [];

    try {
      // Get current TTS provider from config
      const ttsProvider = options.ttsProvider || await this.getConfigValue('default_tts_provider') || 'openai';

      for (const sign of signs) {
        try {
          // Check if reading already exists and force regenerate is false
          if (!options.forceRegenerate) {
            const { data: existing } = await supabase
              .from('daily_zodiac')
              .select('id')
              .eq('zodiac_sign', sign)
              .eq('date', date)
              .single();

            if (existing) {
              console.log(`Skipping ${sign} - reading already exists`);
              successCount++;
              continue;
            }
          }

          // Generate AI content for both languages
          const zodiacAIService = getZodiacAIService();
          const aiResult = await zodiacAIService.generateDailyHoroscope(sign, date);
          if (!aiResult.success) {
            throw new Error(`AI generation failed: ${aiResult.error}`);
          }

          // Generate TTS audio for both languages
          const zodiacTTSService = getZodiacTTSService();
          const audioResult = await zodiacTTSService.generateZodiacAudio({
            textAr: aiResult.data.text_ar,
            textEn: aiResult.data.text_en,
            provider: ttsProvider,
            sign: sign
          });

          // Save to database
          const readingData = {
            zodiac_sign: sign,
            date: date,
            text_ar: aiResult.data.text_ar,
            text_en: aiResult.data.text_en,
            audio_ar_url: audioResult.success ? audioResult.data.audio_ar_url : null,
            audio_en_url: audioResult.success ? audioResult.data.audio_en_url : null,
            voice_provider: ttsProvider,
            created_by: options.generatedBy
          };

          if (options.forceRegenerate) {
            // Update existing record
            const { error: updateError } = await supabase
              .from('daily_zodiac')
              .upsert(readingData, { onConflict: 'zodiac_sign,date' });

            if (updateError) throw updateError;
          } else {
            // Insert new record
            const { error: insertError } = await supabase
              .from('daily_zodiac')
              .insert(readingData);

            if (insertError) throw insertError;
          }

          successCount++;
          console.log(`Successfully generated reading for ${sign}`);

        } catch (error) {
          console.error(`Error generating reading for ${sign}:`, error);
          failCount++;
          errors.push({ sign, error: error.message });
        }
      }

      // 🧹 CLEANUP POLICY: Auto-delete old audio files after successful generation
      if (successCount > 0) {
        try {
          console.log('🧹 [PRODUCTION] Starting automatic cleanup of old zodiac files...');
          const cleanupResults = await zodiacCleanupService.cleanupOldZodiacFiles(date, options.generatedBy);
          
          if (cleanupResults.success) {
            console.log('✅ [PRODUCTION] Cleanup completed successfully');
            console.log(`📊 Deleted ${cleanupResults.summary.storageFilesDeleted} old files`);
            console.log(`📊 Updated ${cleanupResults.summary.databaseRecordsUpdated} database records`);
          } else {
            console.error('⚠️ [PRODUCTION] Cleanup completed with errors:', cleanupResults.errors);
          }
        } catch (cleanupError) {
          console.error('🚨 [PRODUCTION] Cleanup failed:', cleanupError);
          // Don't fail the entire generation if cleanup fails
        }
      }

      // Update generation log
      await supabase
        .from('zodiac_generation_logs')
        .update({
          successful_generations: successCount,
          failed_generations: failCount,
          error_details: errors.length > 0 ? errors : null,
          status: failCount === 0 ? 'completed' : (successCount > 0 ? 'partial' : 'failed'),
          completed_at: new Date().toISOString()
        })
        .eq('id', logId);

      console.log(`Generation completed: ${successCount} success, ${failCount} failed`);

    } catch (error) {
      console.error('Background generation error:', error);
      
      // Update log with failure
      await supabase
        .from('zodiac_generation_logs')
        .update({
          successful_generations: successCount,
          failed_generations: failCount,
          error_details: [...errors, { general: error.message }],
          status: 'failed',
          completed_at: new Date().toISOString()
        })
        .eq('id', logId);
    }
  }

  /**
   * Get generation status
   */
  async getGenerationStatus(logId) {
    try {
      const { data, error } = await supabase
        .from('zodiac_generation_logs')
        .select('*')
        .eq('id', logId)
        .single();

      if (error) {
        return { success: false, error: 'Generation log not found' };
      }

      return { success: true, data };
    } catch (error) {
      console.error('Get generation status error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update a specific reading
   */
  async updateReading(id, updateData, userId) {
    try {
      const { data, error } = await supabase
        .from('daily_zodiac')
        .update({
          ...updateData,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating reading:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (error) {
      console.error('Update reading error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete a specific reading
   */
  async deleteReading(id, userId) {
    try {
      const { error } = await supabase
        .from('daily_zodiac')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting reading:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Delete reading error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get system configuration
   */
  async getSystemConfig() {
    try {
      const { data, error } = await supabase
        .from('zodiac_system_config')
        .select('*')
        .order('config_key');

      if (error) {
        console.error('Error fetching system config:', error);
        return { success: false, error: error.message };
      }

      // Convert to key-value object (flat format for frontend compatibility)
      const config = {};
      data.forEach(item => {
        config[item.config_key] = item.config_value;
      });

      return { success: true, data: config };
    } catch (error) {
      console.error('Get system config error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update system configuration
   */
  async updateSystemConfig(configUpdates, userId) {
    try {
      const updates = [];
      
      for (const [key, value] of Object.entries(configUpdates)) {
        updates.push({
          config_key: key,
          config_value: value,
          updated_by: userId,
          updated_at: new Date().toISOString()
        });
      }

      const { data, error } = await supabase
        .from('zodiac_system_config')
        .upsert(updates, { onConflict: 'config_key' })
        .select();

      if (error) {
        console.error('Error updating system config:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (error) {
      console.error('Update system config error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get generation logs
   */
  async getGenerationLogs(options = {}) {
    try {
      const { limit = 50, page = 1, status } = options;
      const offset = (page - 1) * limit;

      let query = supabase
        .from('zodiac_generation_logs')
        .select('*', { count: 'exact' });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error, count } = await query
        .order('started_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('Error fetching generation logs:', error);
        return { success: false, error: error.message };
      }

      return {
        success: true,
        data: data
      };
    } catch (error) {
      console.error('Get generation logs error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get a specific config value
   */
  async getConfigValue(key) {
    try {
      const { data, error } = await supabase
        .from('zodiac_system_config')
        .select('config_value')
        .eq('config_key', key)
        .single();

      if (error) {
        console.error(`Error fetching config value for ${key}:`, error);
        return null;
      }

      return data.config_value;
    } catch (error) {
      console.error('Get config value error:', error);
      return null;
    }
  }

  /**
   * Get system statistics
   */
  async getSystemStats() {
    try {
      // Get total readings count
      const { count: totalReadings } = await supabase
        .from('daily_zodiac')
        .select('*', { count: 'exact', head: true });

      // Get today's readings count
      const today = new Date().toISOString().split('T')[0];
      const { count: todayGenerated } = await supabase
        .from('daily_zodiac')
        .select('*', { count: 'exact', head: true })
        .eq('date', today);

      // Get audio files count (readings with audio URLs)
      const { count: audioFiles } = await supabase
        .from('daily_zodiac')
        .select('*', { count: 'exact', head: true })
        .or('audio_ar_url.not.is.null,audio_en_url.not.is.null');

      // Get recent generation logs
      const { data: recentLogs } = await supabase
        .from('zodiac_generation_logs')
        .select('status, completed_at')
        .order('started_at', { ascending: false })
        .limit(10);

      // Calculate success rate from recent logs
      const completedLogs = recentLogs?.filter(log => log.status === 'completed') || [];
      const successRate = recentLogs?.length > 0 
        ? Math.round((completedLogs.length / recentLogs.length) * 100) 
        : 0;

      // Get last generation time
      const { data: lastGeneration } = await supabase
        .from('zodiac_generation_logs')
        .select('completed_at, status')
        .order('started_at', { ascending: false })
        .limit(1)
        .single();

      return {
        success: true,
        data: {
          total_readings: totalReadings || 0,
          today_generated: todayGenerated || 0,
          audio_files: audioFiles || 0,
          storage_size: '0 MB', // This would need actual file size calculation
          success_rate: successRate,
          last_generation: lastGeneration?.completed_at || null,
          last_generation_status: lastGeneration?.status || 'none',
          system_status: todayGenerated >= 12 ? 'healthy' : 'needs_generation'
        }
      };
    } catch (error) {
      console.error('Get system stats error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Check credential status for TTS providers (dedicated zodiac keys only)
   */
  async checkCredentialStatus() {
    try {
      // Get dedicated zodiac API keys from database (NEVER from .env)
      const { data, error } = await supabase
        .from('system_configurations')
        .select('config_key, config_value_plain')
        .in('config_key', ['ZODIAC_OPENAI_API_KEY', 'ZODIAC_ELEVENLABS_API_KEY'])
        .eq('config_category', 'ai_services')
        .eq('config_subcategory', 'zodiac_system');

      if (error) {
        console.error('Error checking zodiac credentials:', error);
        return { success: false, error: error.message };
      }

      const keys = {};
      data.forEach(config => {
        keys[config.config_key] = config.config_value_plain;
      });

      const zodiacOpenAIKey = keys.ZODIAC_OPENAI_API_KEY;
      const zodiacElevenLabsKey = keys.ZODIAC_ELEVENLABS_API_KEY;

      const status = {
        openai: {
          available: !!(zodiacOpenAIKey && zodiacOpenAIKey.trim() !== ''),
          status: (zodiacOpenAIKey && zodiacOpenAIKey.trim() !== '') ? 'active' : 'missing',
          message: (zodiacOpenAIKey && zodiacOpenAIKey.trim() !== '') 
            ? 'Dedicated OpenAI API key configured for zodiac system' 
            : 'ZODIAC_OPENAI_API_KEY not found in system secrets'
        },
        elevenlabs: {
          available: !!(zodiacElevenLabsKey && zodiacElevenLabsKey.trim() !== ''),
          status: (zodiacElevenLabsKey && zodiacElevenLabsKey.trim() !== '') ? 'active' : 'missing',
          message: (zodiacElevenLabsKey && zodiacElevenLabsKey.trim() !== '') 
            ? 'Dedicated ElevenLabs API key configured for zodiac system' 
            : 'ZODIAC_ELEVENLABS_API_KEY not found in system secrets'
        },
        system_status: 'partial'
      };

      // Determine overall system status
      if (status.openai.available && status.elevenlabs.available) {
        status.system_status = 'healthy';
      } else if (status.openai.available || status.elevenlabs.available) {
        status.system_status = 'partial';
      } else {
        status.system_status = 'critical';
      }

      return { success: true, data: status };
    } catch (error) {
      console.error('Check credential status error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Schedule automatic daily generation (called by cron job)
   */
  async runAutomaticDailyGeneration() {
    try {
      console.log('Starting automatic daily zodiac generation...');
      
      const isEnabled = await this.getConfigValue('auto_generation_enabled');
      if (isEnabled !== 'true') {
        console.log('Automatic generation is disabled');
        return { success: false, error: 'Automatic generation disabled' };
      }

      const today = new Date().toISOString().split('T')[0];
      
      const result = await this.generateDailyReadings({
        date: today,
        forceRegenerate: false,
        generationType: 'automatic'
      });

      console.log('Automatic generation result:', result);
      return result;
    } catch (error) {
      console.error('Automatic daily generation error:', error);
      return { success: false, error: error.message };
    }
  }
}

const dailyZodiacService = new DailyZodiacService();
export { dailyZodiacService }; 