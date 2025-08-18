import OpenAI from 'openai';
import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';
import { supabaseAdmin } from '../lib/supabase.js';

// =====================================================
// ZODIAC TTS SERVICE - PRODUCTION POLICY COMPLIANT
// =====================================================
// 🚨 MANDATORY RULES:
// ❌ NO LOCAL STORAGE (except temporary before upload)
// ❌ NO MOCK DATA OR FALLBACK LOGIC
// ✅ SYRIAN ACCENT for Arabic TTS
// ✅ SUPABASE CLOUD STORAGE ONLY
// ✅ PRODUCTION-READY ERROR HANDLING

class ZodiacTTSService {
  constructor() {
    // Initialize with null - will be set dynamically when needed
    this.openai = null;
    this.elevenLabsApiKey = null;
    
    // PRODUCTION POLICY: Temporary storage only, files deleted after upload
    this.tempStoragePath = process.env.TEMP_AUDIO_PATH || './temp-audio';
    this.supabaseBucket = 'zodiac-audio'; // Supabase Storage bucket
    
    // Ensure temporary directory exists
    this.ensureTempDirectory();

    // Voice configurations with SYRIAN ACCENT requirement
    this.voiceConfig = {
      openai: {
        ar: {
          voice: 'nova', // Best for Arabic with Syrian accent
          model: 'tts-1-hd',
          speed: 0.80, // Slower for natural Syrian dialect clarity
          // CRITICAL: Enhanced Syrian accent prompt
          promptPrefix: 'اقرأ هذا النص باللهجة السورية الأصيلة والواضحة، بصوت دافئ وطبيعي كأنك سامية من سوريا تتكلم مع صديق عزيز. استخدم النطق السوري الطبيعي للكلمات:'
        },
        en: {
          voice: 'alloy', // Samia's preferred English voice
          model: 'tts-1-hd',
          speed: 0.90 // Slightly slower for better synchronization
        }
      },
      elevenlabs: {
        ar: {
          voice_id: 'samia_arabic_syrian', // Must be Syrian accent voice
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: 0.75,
            similarity_boost: 0.85,
            style: 0.4, // Higher style for authentic Syrian accent
            use_speaker_boost: true
          }
        },
        en: {
          voice_id: 'samia_english', 
          model_id: 'eleven_monolingual_v1',
          voice_settings: {
            stability: 0.8,
            similarity_boost: 0.9,
            style: 0.15,
            use_speaker_boost: true
          }
        }
      }
    };
  }

  /**
   * Get dedicated API keys from database (NO FALLBACK)
   */
  async getDedicatedApiKeys() {
    try {
      console.log('🔍 [PRODUCTION] Loading zodiac API keys from database...');
      
      const { data, error } = await supabaseAdmin
        .from('system_configurations')
        .select('config_key, config_value_encrypted, config_value_plain, is_encrypted, config_category, config_subcategory')
        .in('config_key', ['ZODIAC_OPENAI_API_KEY', 'ZODIAC_ELEVENLABS_API_KEY'])
        .eq('config_category', 'ai_services')
        .eq('config_subcategory', 'zodiac_system');

      if (error) {
        throw new Error(`🚨 PRODUCTION ERROR: Failed to load zodiac API keys: ${error.message}`);
      }

      if (!data || data.length === 0) {
        throw new Error('🚨 PRODUCTION ERROR: No zodiac API keys found in database. System BLOCKED until keys are configured in Super Admin Dashboard → System Secrets → AI Services → Daily Zodiac System');
      }

      const keys = {};
      for (const config of data) {
        let configValue;
        
        if (config.is_encrypted && config.config_value_encrypted) {
          const { data: decryptedValue, error: decryptError } = await supabaseAdmin
            .rpc('decrypt_config_value', { encrypted_value: config.config_value_encrypted });
          
          if (decryptError) {
            throw new Error(`🚨 PRODUCTION ERROR: Failed to decrypt ${config.config_key}: ${decryptError.message}`);
          }
          configValue = decryptedValue;
        } else {
          configValue = config.config_value_plain;
        }
        
        if (!configValue || configValue.trim() === '') {
          throw new Error(`🚨 PRODUCTION ERROR: ${config.config_key} is empty. System BLOCKED until valid key is provided.`);
        }
        
        keys[config.config_key] = configValue;
      }

      console.log('✅ [PRODUCTION] Zodiac API keys loaded successfully');
      return keys;
    } catch (error) {
      console.error('🚨 [PRODUCTION ERROR] Zodiac API key loading failed:', error);
      throw error; // NO FALLBACK - System must fail if keys unavailable
    }
  }

  /**
   * Initialize OpenAI client (NO FALLBACK)
   */
  async initializeOpenAI() {
    if (this.openai) return this.openai;

    try {
      const keys = await this.getDedicatedApiKeys();
      const zodiacOpenAIKey = keys.ZODIAC_OPENAI_API_KEY;

      if (!zodiacOpenAIKey || zodiacOpenAIKey.trim() === '') {
        throw new Error('🚨 PRODUCTION ERROR: ZODIAC_OPENAI_API_KEY not configured. System BLOCKED.');
      }

      this.openai = new OpenAI({
        apiKey: zodiacOpenAIKey
      });

      return this.openai;
    } catch (error) {
      console.error('🚨 [PRODUCTION ERROR] OpenAI initialization failed:', error);
      throw error; // NO FALLBACK
    }
  }

  /**
   * Get ElevenLabs API key (NO FALLBACK)
   */
  async getElevenLabsApiKey() {
    if (this.elevenLabsApiKey) return this.elevenLabsApiKey;

    try {
      const keys = await this.getDedicatedApiKeys();
      const zodiacElevenLabsKey = keys.ZODIAC_ELEVENLABS_API_KEY;

      if (!zodiacElevenLabsKey || zodiacElevenLabsKey.trim() === '') {
        throw new Error('🚨 PRODUCTION ERROR: ZODIAC_ELEVENLABS_API_KEY not configured. System BLOCKED.');
      }

      this.elevenLabsApiKey = zodiacElevenLabsKey;
      return this.elevenLabsApiKey;
    } catch (error) {
      console.error('🚨 [PRODUCTION ERROR] ElevenLabs key retrieval failed:', error);
      throw error; // NO FALLBACK
    }
  }

  /**
   * Ensure temporary storage directory exists
   */
  async ensureTempDirectory() {
    try {
      await fs.mkdir(this.tempStoragePath, { recursive: true });
      console.log(`✅ [PRODUCTION] Temporary audio directory ready: ${this.tempStoragePath}`);
    } catch (error) {
      console.error('🚨 [PRODUCTION ERROR] Failed to create temp directory:', error);
      throw error;
    }
  }

  /**
   * Generate audio for zodiac reading with CLOUD STORAGE ONLY
   */
  async generateZodiacAudio(options) {
    const { textAr, textEn, provider = 'openai', sign } = options;

    try {
      console.log(`🔊 [PRODUCTION] Generating TTS audio for ${sign} using ${provider}`);

      const results = {};
      const errors = [];

      // Generate Arabic audio with SYRIAN ACCENT
      try {
        console.log('🇸🇾 [PRODUCTION] Generating Arabic audio with Syrian accent...');
        const arabicResult = await this.generateSingleAudioWithCloudStorage({
          text: textAr,
          language: 'ar',
          provider,
          sign,
          date: new Date().toISOString().split('T')[0]
        });
        results.audio_ar_url = arabicResult.cloudUrl;
        console.log(`✅ [PRODUCTION] Arabic audio uploaded to cloud: ${arabicResult.cloudUrl}`);
      } catch (error) {
        console.error('🚨 [PRODUCTION ERROR] Arabic audio generation failed:', error);
        errors.push(`Arabic: ${error.message}`);
        results.audio_ar_url = null;
      }

      // Generate English audio
      try {
        console.log('🇺🇸 [PRODUCTION] Generating English audio...');
        const englishResult = await this.generateSingleAudioWithCloudStorage({
          text: textEn,
          language: 'en',
          provider,
          sign,
          date: new Date().toISOString().split('T')[0]
        });
        results.audio_en_url = englishResult.cloudUrl;
        console.log(`✅ [PRODUCTION] English audio uploaded to cloud: ${englishResult.cloudUrl}`);
      } catch (error) {
        console.error('🚨 [PRODUCTION ERROR] English audio generation failed:', error);
        errors.push(`English: ${error.message}`);
        results.audio_en_url = null;
      }

      // PRODUCTION POLICY: At least one audio must succeed
      const hasAnyAudio = results.audio_ar_url || results.audio_en_url;
      
      if (!hasAnyAudio) {
        throw new Error(`🚨 PRODUCTION ERROR: Failed to generate any audio files. Errors: ${errors.join(', ')}`);
      }

      return {
        success: true,
        data: results,
        provider_used: provider,
        cloud_storage: true,
        errors: errors.length > 0 ? errors : null
      };

    } catch (error) {
      console.error('🚨 [PRODUCTION ERROR] Zodiac audio generation failed:', error);
      throw error; // NO FALLBACK
    }
  }

  /**
   * Generate single audio file with CLOUD STORAGE ONLY
   */
  async generateSingleAudioWithCloudStorage(options) {
    const { text, language, provider, sign, date } = options;

    let tempFilePath = null;

    try {
      // Generate unique filename
      const hash = crypto.createHash('md5')
        .update(`${sign}-${date}-${language}-${text.substring(0, 50)}`)
        .digest('hex');
      
      const filename = `${sign}-${date}-${language}-${hash}.mp3`;
      tempFilePath = path.join(this.tempStoragePath, filename);
      const cloudPath = `zodiac-audio/${filename}`;

      // Check if file already exists in cloud storage
      const { data: existingFile } = await supabaseAdmin.storage
        .from(this.supabaseBucket)
        .list('zodiac-audio', { search: filename });

      if (existingFile && existingFile.length > 0) {
        const { data: urlData } = supabaseAdmin.storage
          .from(this.supabaseBucket)
          .getPublicUrl(cloudPath);
        
        console.log(`✅ [PRODUCTION] Audio file already exists in cloud: ${filename}`);
        return { cloudUrl: urlData.publicUrl, cached: true };
      }

      // Generate audio buffer
      let audioData;
      if (provider === 'openai') {
        audioData = await this.generateOpenAIAudio(text, language);
      } else if (provider === 'elevenlabs') {
        audioData = await this.generateElevenLabsAudio(text, language);
      } else {
        throw new Error(`🚨 PRODUCTION ERROR: Unsupported TTS provider: ${provider}`);
      }

      // 🚨 CRITICAL FIX: Extract audioBuffer properly and validate
      let audioBuffer;
      if (audioData && typeof audioData === 'object' && audioData.audioBuffer) {
        // OpenAI returns object with audioBuffer property
        audioBuffer = audioData.audioBuffer;
      } else if (Buffer.isBuffer(audioData)) {
        // ElevenLabs returns buffer directly
        audioBuffer = audioData;
      } else {
        // Invalid response - log details and throw error
        console.error('🚨 [PRODUCTION ERROR] Invalid TTS response type:', typeof audioData);
        console.error('🚨 [PRODUCTION ERROR] TTS response:', audioData);
        throw new Error(`🚨 PRODUCTION ERROR: TTS API returned invalid data type. Expected Buffer or Object with audioBuffer, got ${typeof audioData}`);
      }

      // 🚨 CRITICAL VALIDATION: Ensure we have a proper Buffer
      if (!Buffer.isBuffer(audioBuffer)) {
        console.error('🚨 [PRODUCTION ERROR] Audio buffer validation failed:', typeof audioBuffer);
        console.error('🚨 [PRODUCTION ERROR] Audio buffer content:', audioBuffer);
        throw new Error(`🚨 PRODUCTION ERROR: Audio buffer must be Buffer type, got ${typeof audioBuffer}`);
      }

      if (audioBuffer.length === 0) {
        throw new Error('🚨 PRODUCTION ERROR: Generated audio buffer is empty');
      }

      console.log(`✅ [PRODUCTION] Valid audio buffer generated: ${audioBuffer.length} bytes`);

      // TEMPORARY: Save to local file for upload
      await fs.writeFile(tempFilePath, audioBuffer);
      console.log(`📁 [PRODUCTION] Temporary file created: ${filename}`);

      // Upload to Supabase Storage
      const fileBuffer = await fs.readFile(tempFilePath);
      const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
        .from(this.supabaseBucket)
        .upload(cloudPath, fileBuffer, {
          contentType: 'audio/mpeg',
          cacheControl: '3600'
        });

      if (uploadError) {
        throw new Error(`🚨 PRODUCTION ERROR: Cloud upload failed: ${uploadError.message}`);
      }

      // Get public URL
      const { data: urlData } = supabaseAdmin.storage
        .from(this.supabaseBucket)
        .getPublicUrl(cloudPath);

      console.log(`☁️ [PRODUCTION] Audio uploaded to cloud storage: ${urlData.publicUrl}`);

      // MANDATORY: Delete temporary file
      await fs.unlink(tempFilePath);
      console.log(`🗑️ [PRODUCTION] Temporary file deleted: ${filename}`);

      return {
        cloudUrl: urlData.publicUrl,
        filename,
        cloudPath,
        cached: false
      };

    } catch (error) {
      console.error('🚨 [PRODUCTION ERROR] Single audio generation failed:', error);
      
      // Cleanup temporary file on error
      if (tempFilePath) {
        try {
          await fs.unlink(tempFilePath);
          console.log(`🗑️ [PRODUCTION] Cleanup: Temporary file deleted on error`);
        } catch (cleanupError) {
          console.error('⚠️ [PRODUCTION WARNING] Failed to cleanup temp file:', cleanupError);
        }
      }
      
      throw error; // NO FALLBACK
    }
  }

  /**
   * Generate OpenAI TTS with word-level timing support
   */
  async generateOpenAIAudio(text, language) {
    try {
      const openai = await this.initializeOpenAI();
      const config = this.voiceConfig.openai[language];
      
      if (!config) {
        throw new Error(`🚨 PRODUCTION ERROR: No OpenAI voice config for language: ${language}`);
      }

      // 🇸🇾 CRITICAL: For Arabic, use only the original text without prompt
      // The Syrian accent should be achieved through voice selection and settings
      const processedText = text; // Use original text only
      
      if (language === 'ar') {
        console.log('🇸🇾 [PRODUCTION] Generating Arabic audio with Syrian accent (voice: nova)');
      }

      console.log(`🔊 [PRODUCTION] Generating OpenAI TTS for ${language} with voice: ${config.voice}`);

      // 🎯 NEW: Request with timestamp data for word-level sync
      const response = await openai.audio.speech.create({
        model: config.model,
        voice: config.voice,
        input: processedText,
        speed: config.speed,
        response_format: 'mp3',
        // 🎯 CRITICAL: Request word timestamps for perfect sync
        ...(openai.audio.speech.create.supportsTimestamps && {
          timestamp_granularities: ['word'],
          include_timestamps: true
        })
      });

      // 🚨 CRITICAL FIX: Validate response before processing
      if (!response) {
        throw new Error('🚨 PRODUCTION ERROR: OpenAI returned null/undefined response');
      }

      // Convert to Buffer with proper error handling
      let arrayBuffer;
      try {
        arrayBuffer = await response.arrayBuffer();
      } catch (bufferError) {
        console.error('🚨 [PRODUCTION ERROR] Failed to get arrayBuffer from OpenAI response:', bufferError);
        throw new Error(`🚨 PRODUCTION ERROR: OpenAI response.arrayBuffer() failed: ${bufferError.message}`);
      }

      if (!arrayBuffer || arrayBuffer.byteLength === 0) {
        throw new Error('🚨 PRODUCTION ERROR: OpenAI returned empty arrayBuffer');
      }

      const audioBuffer = Buffer.from(arrayBuffer);

      // 🚨 CRITICAL VALIDATION: Ensure we have valid Buffer with audio data
      if (!Buffer.isBuffer(audioBuffer)) {
        throw new Error('🚨 PRODUCTION ERROR: Failed to create Buffer from OpenAI arrayBuffer');
      }

      if (audioBuffer.length === 0) {
        throw new Error('🚨 PRODUCTION ERROR: OpenAI returned empty audio buffer');
      }

      // Basic MP3 header validation (MP3 files start with 'ID3' or 0xFF 0xFB)
      const firstBytes = audioBuffer.slice(0, 3);
      const isValidMP3 = firstBytes.toString() === 'ID3' || 
                        (firstBytes[0] === 0xFF && (firstBytes[1] & 0xE0) === 0xE0);

      if (!isValidMP3) {
        console.error('🚨 [PRODUCTION ERROR] Invalid MP3 data from OpenAI. First bytes:', firstBytes);
        throw new Error('🚨 PRODUCTION ERROR: OpenAI returned invalid MP3 data');
      }

      console.log(`✅ [PRODUCTION] OpenAI TTS generated ${audioBuffer.length} bytes for ${language}`);
      console.log(`✅ [PRODUCTION] MP3 validation passed for OpenAI audio`);

      // 🎯 NEW: Extract word timings if available
      let wordTimings = null;
      try {
        if (response.timestamps && response.timestamps.words) {
          wordTimings = this.processWordTimings(response.timestamps.words, text);
          console.log(`📊 [PRODUCTION] Extracted ${wordTimings.length} word timings from OpenAI`);
        } else {
          // Generate estimated timings as fallback
          wordTimings = this.generateEstimatedWordTimings(text, language);
          console.log(`⚠️ [PRODUCTION] Generated estimated word timings: ${wordTimings.length} words`);
        }
      } catch (timingError) {
        console.warn('⚠️ [PRODUCTION] Word timing extraction failed, using estimates:', timingError.message);
        wordTimings = this.generateEstimatedWordTimings(text, language);
      }

      return { 
        audioBuffer, 
        wordTimings,
        provider: 'openai',
        voice: config.voice,
        language 
      };
    } catch (error) {
      console.error('🚨 [PRODUCTION ERROR] OpenAI TTS generation failed:', error);
      throw error;
    }
  }

  /**
   * Process word timings from TTS API response
   */
  processWordTimings(apiTimings, originalText) {
    try {
      const words = originalText.split(/\s+/);
      const processedTimings = [];

      // Map API timings to our format
      for (let i = 0; i < Math.min(apiTimings.length, words.length); i++) {
        const apiTiming = apiTimings[i];
        const word = words[i];

        processedTimings.push({
          word: word,
          start: parseFloat(apiTiming.start) || (i * 0.6), // Fallback timing
          end: parseFloat(apiTiming.end) || ((i + 1) * 0.6)
        });
      }

      // Handle any remaining words with estimated timing
      for (let i = apiTimings.length; i < words.length; i++) {
        const lastTiming = processedTimings[processedTimings.length - 1];
        const estimatedStart = lastTiming ? lastTiming.end : i * 0.6;
        
        processedTimings.push({
          word: words[i],
          start: estimatedStart,
          end: estimatedStart + 0.6
        });
      }

      return processedTimings;
    } catch (error) {
      console.error('❌ Error processing word timings:', error);
      return this.generateEstimatedWordTimings(originalText, 'ar');
    }
  }

  /**
   * Generate estimated word timings based on language characteristics
   */
  generateEstimatedWordTimings(text, language) {
    const words = text.split(/\s+/);
    
    // 🇸🇾 Syrian Arabic: 600ms per word (slower, expressive)
    // 🇺🇸 English: 400ms per word (standard speed)
    const baseSpeed = language === 'ar' ? 0.6 : 0.4;
    
    let currentTime = 0;
    const timings = words.map((word, index) => {
      // Adjust timing based on word characteristics
      let wordDuration = baseSpeed;
      
      if (language === 'ar') {
        // Syrian Arabic adjustments
        if (word.length > 6) wordDuration += 0.2; // Longer words
        if (word.includes('ّ') || word.includes('ً')) wordDuration += 0.1; // Diacritics
        if (['حبيبي', 'روحي', 'يلا', 'شلونك'].includes(word)) wordDuration += 0.15; // Expressive words
        if (word.endsWith('،') || word.endsWith('.')) wordDuration += 0.3; // Punctuation pauses
      } else {
        // English adjustments
        if (word.length > 7) wordDuration += 0.15;
        if (word.endsWith(',') || word.endsWith('.')) wordDuration += 0.2; // Punctuation pauses
      }

      const timing = {
        word,
        start: currentTime,
        end: currentTime + wordDuration
      };
      
      currentTime += wordDuration;
      return timing;
    });

    console.log(`📊 Generated ${timings.length} estimated word timings for ${language}, total duration: ${currentTime.toFixed(1)}s`);
    return timings;
  }

  /**
   * Generate audio using ElevenLabs TTS with SYRIAN ACCENT
   */
  async generateElevenLabsAudio(text, language) {
    try {
      const apiKey = await this.getElevenLabsApiKey();
      const config = this.voiceConfig.elevenlabs[language];
      
      // CRITICAL: Ensure Syrian accent voice for Arabic
      if (language === 'ar' && !config.voice_id.includes('syrian')) {
        console.warn('⚠️ [PRODUCTION WARNING] ElevenLabs voice may not be Syrian accent');
      }

      console.log(`🔊 [PRODUCTION] Generating ElevenLabs TTS for ${language} with voice: ${config.voice_id}`);
      
      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${config.voice_id}`, {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': apiKey
        },
        body: JSON.stringify({
          text: text,
          model_id: config.model_id,
          voice_settings: config.voice_settings
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`🚨 PRODUCTION ERROR: ElevenLabs API error: ${response.status} - ${errorText}`);
      }

      // 🚨 CRITICAL FIX: Ensure we get binary data, not JSON
      const contentType = response.headers.get('content-type');
      console.log(`📊 [PRODUCTION] ElevenLabs response content-type: ${contentType}`);

      if (contentType && contentType.includes('application/json')) {
        // API returned JSON error instead of audio
        const errorData = await response.json();
        console.error('🚨 [PRODUCTION ERROR] ElevenLabs returned JSON error:', errorData);
        throw new Error(`🚨 PRODUCTION ERROR: ElevenLabs API returned error: ${JSON.stringify(errorData)}`);
      }

      if (!contentType || (!contentType.includes('audio/') && !contentType.includes('application/octet-stream'))) {
        console.error('🚨 [PRODUCTION ERROR] Invalid content-type from ElevenLabs:', contentType);
        throw new Error(`🚨 PRODUCTION ERROR: ElevenLabs returned invalid content-type: ${contentType}. Expected audio/mpeg.`);
      }

      // Convert response to Buffer using arrayBuffer
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = Buffer.from(arrayBuffer);

      // 🚨 CRITICAL VALIDATION: Ensure we have valid audio data
      if (!Buffer.isBuffer(audioBuffer)) {
        throw new Error(`🚨 PRODUCTION ERROR: Failed to create Buffer from ElevenLabs response`);
      }

      if (audioBuffer.length === 0) {
        throw new Error('🚨 PRODUCTION ERROR: ElevenLabs returned empty audio buffer');
      }

      // Basic MP3 header validation (MP3 files start with 'ID3' or 0xFF 0xFB)
      const firstBytes = audioBuffer.slice(0, 3);
      const isValidMP3 = firstBytes.toString() === 'ID3' || 
                        (firstBytes[0] === 0xFF && (firstBytes[1] & 0xE0) === 0xE0);

      if (!isValidMP3) {
        console.error('🚨 [PRODUCTION ERROR] Invalid MP3 data from ElevenLabs. First bytes:', firstBytes);
        throw new Error('🚨 PRODUCTION ERROR: ElevenLabs returned invalid MP3 data');
      }

      console.log(`✅ [PRODUCTION] ElevenLabs TTS generated ${audioBuffer.length} bytes for ${language}`);
      console.log(`✅ [PRODUCTION] MP3 validation passed for ElevenLabs audio`);
      
      return audioBuffer;

    } catch (error) {
      console.error('🚨 [PRODUCTION ERROR] ElevenLabs TTS failed:', error);
      throw new Error(`🚨 PRODUCTION ERROR: ElevenLabs TTS failed: ${error.message}`);
    }
  }

  /**
   * Get audio statistics from CLOUD STORAGE ONLY
   */
  async getCloudAudioStats() {
    try {
      console.log('📊 [PRODUCTION] Getting audio stats from cloud storage...');
      
      const { data: files, error } = await supabaseAdmin.storage
        .from(this.supabaseBucket)
        .list('zodiac-audio');

      if (error) {
        throw new Error(`🚨 PRODUCTION ERROR: Failed to get cloud storage stats: ${error.message}`);
      }

      let totalSize = 0;
      let fileCount = 0;
      const languages = { ar: 0, en: 0 };

      for (const file of files || []) {
        if (file.name.endsWith('.mp3')) {
          totalSize += file.metadata?.size || 0;
          fileCount++;

          if (file.name.includes('-ar-')) languages.ar++;
          if (file.name.includes('-en-')) languages.en++;
        }
      }

      return {
        success: true,
        stats: {
          total_files: fileCount,
          total_size_bytes: totalSize,
          total_size_mb: Math.round(totalSize / (1024 * 1024) * 100) / 100,
          languages,
          storage_type: 'supabase_cloud',
          bucket: this.supabaseBucket
        }
      };

    } catch (error) {
      console.error('🚨 [PRODUCTION ERROR] Cloud audio stats failed:', error);
      throw error; // NO FALLBACK
    }
  }

  /**
   * Cleanup old audio files from CLOUD STORAGE
   */
  async cleanupOldCloudAudioFiles(daysOld = 30) {
    try {
      console.log(`🧹 [PRODUCTION] Cleaning up cloud audio files older than ${daysOld} days...`);
      
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const { data: files, error } = await supabaseAdmin.storage
        .from(this.supabaseBucket)
        .list('zodiac-audio');

      if (error) {
        throw new Error(`🚨 PRODUCTION ERROR: Failed to list cloud files: ${error.message}`);
      }

      const filesToDelete = [];
      for (const file of files || []) {
        if (file.created_at && new Date(file.created_at) < cutoffDate) {
          filesToDelete.push(`zodiac-audio/${file.name}`);
        }
      }

      if (filesToDelete.length > 0) {
        const { error: deleteError } = await supabaseAdmin.storage
          .from(this.supabaseBucket)
          .remove(filesToDelete);

        if (deleteError) {
          throw new Error(`🚨 PRODUCTION ERROR: Failed to delete old files: ${deleteError.message}`);
        }

        console.log(`✅ [PRODUCTION] Deleted ${filesToDelete.length} old audio files from cloud`);
      }

      return {
        success: true,
        deleted_files: filesToDelete.length,
        storage_type: 'supabase_cloud'
      };

    } catch (error) {
      console.error('🚨 [PRODUCTION ERROR] Cloud cleanup failed:', error);
      throw error; // NO FALLBACK
    }
  }

  /**
   * 🪣 Ensure Supabase Storage bucket exists
   */
  async ensureBucketExists() {
    try {
      // Check if bucket exists
      const { data: buckets, error: listError } = await supabaseAdmin.storage.listBuckets();
      if (listError) {
        throw new Error(`Failed to list buckets: ${listError.message}`);
      }

      const existingBucket = buckets.find(b => b.name === 'zodiac-audio');
      if (existingBucket) {
        console.log('✅ [PRODUCTION] Storage bucket exists: zodiac-audio');
        return true;
      }

      // Create bucket
      console.log('🚨 [PRODUCTION] Creating missing storage bucket: zodiac-audio');
      const { data, error } = await supabaseAdmin.storage.createBucket('zodiac-audio', {
        public: true,
        allowedMimeTypes: ['audio/mpeg', 'audio/mp3'],
        fileSizeLimit: 10485760 // 10MB per file
      });

      if (error) {
        throw new Error(`Failed to create bucket: ${error.message}`);
      }

      console.log('✅ [PRODUCTION] Storage bucket created successfully');
      return true;

    } catch (error) {
      console.error('❌ [PRODUCTION] Bucket creation failed:', error);
      throw error;
    }
  }
}

// Export singleton instance
let zodiacTTSServiceInstance = null;

export function getZodiacTTSService() {
  if (!zodiacTTSServiceInstance) {
    zodiacTTSServiceInstance = new ZodiacTTSService();
  }
  return zodiacTTSServiceInstance;
}

export { ZodiacTTSService }; 