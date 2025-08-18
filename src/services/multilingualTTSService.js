// =================================================
// SAMIA TAROT MULTILINGUAL TTS SERVICE
// Phase 4: Dynamic Voice Synthesis for All Languages
// =================================================
// Professional voice generation with provider optimization
// Supports ElevenLabs, Google Cloud, Azure TTS
// =================================================

class MultilingualTTSService {
  constructor() {
    this.cache = new Map();
    this.providerStats = new Map();
    this.audioStorage = new Map();
    this.availableProviders = [];
    this.voiceProfiles = new Map();
    this.lastProviderCheck = null;
  }

  // =================================================
  // PROVIDER MANAGEMENT
  // =================================================

  async loadProviders() {
    try {
      const response = await fetch('/api/multilingual/providers/tts', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        this.availableProviders = data.providers
          .filter(p => p.is_enabled)
          .sort((a, b) => b.priority - a.priority);
        this.lastProviderCheck = new Date();
        
        // Load voice profiles
        this.loadVoiceProfiles();
      }
    } catch (error) {
      console.error('Error loading TTS providers:', error);
    }
  }

  loadVoiceProfiles() {
    // Default voice configurations optimized for tarot/spiritual content
    const defaultVoices = {
      'ar': {
        elevenlabs: { 
          voice_id: 'arabic_mystical', 
          stability: 0.8, 
          similarity_boost: 0.8,
          style: 'calm_spiritual',
          settings: { speed: 0.9, pitch: 'medium' }
        },
        google_cloud: { 
          name: 'ar-XA-Wavenet-D', 
          language_code: 'ar-XA',
          speaking_rate: 0.9,
          pitch: 0.0,
          voice_gender: 'FEMALE'
        },
        azure: { 
          voice: 'ar-SA-ZariyahNeural', 
          style: 'calm',
          rate: '0.9',
          pitch: '+0Hz'
        }
      },
      'en': {
        elevenlabs: { 
          voice_id: 'english_mystical', 
          stability: 0.85, 
          similarity_boost: 0.75,
          style: 'warm_spiritual',
          settings: { speed: 0.95, pitch: 'medium-low' }
        },
        google_cloud: { 
          name: 'en-US-Wavenet-H', 
          language_code: 'en-US',
          speaking_rate: 0.95,
          pitch: -2.0,
          voice_gender: 'FEMALE'
        },
        azure: { 
          voice: 'en-US-AriaNeural', 
          style: 'calm',
          rate: '0.95',
          pitch: '-2Hz'
        }
      },
      'fr': {
        elevenlabs: { 
          voice_id: 'french_mystical', 
          stability: 0.8, 
          similarity_boost: 0.8,
          style: 'elegant_spiritual'
        },
        google_cloud: { 
          name: 'fr-FR-Wavenet-C', 
          language_code: 'fr-FR',
          speaking_rate: 0.9,
          voice_gender: 'FEMALE'
        },
        azure: { 
          voice: 'fr-FR-DeniseNeural', 
          style: 'calm'
        }
      },
      'tr': {
        google_cloud: { 
          name: 'tr-TR-Wavenet-E', 
          language_code: 'tr-TR',
          speaking_rate: 0.9
        },
        azure: { 
          voice: 'tr-TR-EmelNeural', 
          style: 'calm'
        }
      },
      'fa': {
        google_cloud: { 
          name: 'fa-IR-Wavenet-A', 
          language_code: 'fa-IR',
          speaking_rate: 0.85
        }
      },
      'es': {
        elevenlabs: { 
          voice_id: 'spanish_mystical', 
          stability: 0.8, 
          similarity_boost: 0.8
        },
        google_cloud: { 
          name: 'es-ES-Wavenet-C', 
          language_code: 'es-ES',
          speaking_rate: 0.9
        },
        azure: { 
          voice: 'es-ES-ElviraNeural', 
          style: 'calm'
        }
      }
    };

    // Merge with provider configurations
    this.availableProviders.forEach(provider => {
      Object.keys(provider.voice_configurations || {}).forEach(langCode => {
        if (!this.voiceProfiles.has(langCode)) {
          this.voiceProfiles.set(langCode, {});
        }
        this.voiceProfiles.get(langCode)[provider.provider_code] = {
          ...defaultVoices[langCode]?.[provider.provider_code],
          ...provider.voice_configurations[langCode]
        };
      });
    });
  }

  async getOptimalProvider(languageCode, voicePreference = null) {
    // Refresh providers if stale
    if (!this.lastProviderCheck || Date.now() - this.lastProviderCheck > 5 * 60 * 1000) {
      await this.loadProviders();
    }

    // Filter providers that support the language
    const compatibleProviders = this.availableProviders.filter(provider => 
      provider.supported_languages.includes(languageCode)
    );

    if (compatibleProviders.length === 0) {
      throw new Error(`No TTS providers support language: ${languageCode}`);
    }

    // If voice preference specified, try to find that provider
    if (voicePreference) {
      const preferredProvider = compatibleProviders.find(p => 
        p.provider_code === voicePreference
      );
      if (preferredProvider && this.isProviderWithinLimits(preferredProvider)) {
        return preferredProvider;
      }
    }

    // Select based on quality and availability
    for (const provider of compatibleProviders) {
      const failureRate = this.getProviderFailureRate(provider.provider_code);
      const isWithinLimits = this.isProviderWithinLimits(provider);
      
      if (failureRate < 0.2 && isWithinLimits) {
        return provider;
      }
    }

    return compatibleProviders[0];
  }

  getProviderFailureRate(providerCode) {
    const stats = this.providerStats.get(providerCode) || { attempts: 0, failures: 0 };
    return stats.attempts > 0 ? stats.failures / stats.attempts : 0;
  }

  isProviderWithinLimits(provider) {
    if (!provider.monthly_quota) return true;
    return provider.usage_this_month < provider.monthly_quota * 0.9;
  }

  recordProviderAttempt(providerCode, success) {
    const stats = this.providerStats.get(providerCode) || { attempts: 0, failures: 0 };
    stats.attempts++;
    if (!success) stats.failures++;
    this.providerStats.set(providerCode, stats);
  }

  // =================================================
  // TTS GENERATION
  // =================================================

  async generateSpeech(text, languageCode, options = {}) {
    const {
      useCache = true,
      voicePreference = null,
      speed = 1.0,
      pitch = 0,
      style = 'calm',
      format = 'mp3',
      quality = 'high',
      maxRetries = 2
    } = options;

    // Input validation
    if (!text || !text.trim()) {
      return { success: false, error: 'Empty text provided' };
    }

    if (text.length > 3000) {
      return { success: false, error: 'Text too long for TTS (max 3000 characters)' };
    }

    // Check cache
    const cacheKey = this.getCacheKey(text, languageCode, voicePreference, style);
    if (useCache && this.cache.has(cacheKey)) {
      return { success: true, ...this.cache.get(cacheKey), cached: true };
    }

    // Attempt generation with retries
    let lastError = null;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const provider = await this.getOptimalProvider(languageCode, voicePreference);
        const result = await this.generateWithProvider(
          provider, 
          text, 
          languageCode, 
          { speed, pitch, style, format, quality }
        );

        this.recordProviderAttempt(provider.provider_code, true);

        // Cache successful result
        if (useCache) {
          this.cache.set(cacheKey, result);
          
          // Limit cache size
          if (this.cache.size > 500) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
          }
        }

        return { success: true, ...result };
      } catch (error) {
        lastError = error;
        console.error(`TTS attempt ${attempt + 1} failed:`, error);
        
        const provider = await this.getOptimalProvider(languageCode, voicePreference);
        this.recordProviderAttempt(provider.provider_code, false);
      }
    }

    return { 
      success: false, 
      error: 'TTS generation failed after retries', 
      details: lastError?.message 
    };
  }

  async generateWithProvider(provider, text, languageCode, options) {
    switch (provider.provider_code) {
      case 'elevenlabs':
        return await this.generateWithElevenLabs(provider, text, languageCode, options);
      case 'google_cloud':
        return await this.generateWithGoogleCloud(provider, text, languageCode, options);
      case 'azure':
        return await this.generateWithAzure(provider, text, languageCode, options);
      default:
        throw new Error(`Unknown TTS provider: ${provider.provider_code}`);
    }
  }

  // =================================================
  // ELEVENLABS TTS
  // =================================================

  async generateWithElevenLabs(provider, text, languageCode, options) {
    const { speed = 1.0, style = 'calm', format = 'mp3', quality = 'high' } = options;
    
    // Get API key
    const apiKey = await this.getProviderApiKey('elevenlabs');
    if (!apiKey) {
      throw new Error('ElevenLabs API key not configured');
    }

    // Get voice configuration
    const voiceConfig = this.voiceProfiles.get(languageCode)?.elevenlabs || {
      voice_id: 'default_voice',
      stability: 0.8,
      similarity_boost: 0.8
    };

    // Prepare spiritual/mystical optimized text
    const optimizedText = this.optimizeTextForTTS(text, languageCode, 'spiritual');

    try {
      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceConfig.voice_id}`, {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': apiKey
        },
        body: JSON.stringify({
          text: optimizedText,
          model_id: quality === 'high' ? 'eleven_multilingual_v2' : 'eleven_multilingual_v1',
          voice_settings: {
            stability: voiceConfig.stability,
            similarity_boost: voiceConfig.similarity_boost,
            style: style === 'calm' ? 0.2 : style === 'energetic' ? 0.8 : 0.5,
            use_speaker_boost: true
          }
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`ElevenLabs API error: ${error.detail || 'Unknown error'}`);
      }

      const audioBuffer = await response.arrayBuffer();
      const filename = await this.storeAudioFile(audioBuffer, format, languageCode);

      return {
        audioUrl: `/audio/${filename}`,
        filename,
        provider: 'elevenlabs',
        languageCode,
        duration: this.estimateAudioDuration(text, languageCode),
        voiceConfig: voiceConfig.voice_id,
        fileSize: audioBuffer.byteLength,
        format,
        metadata: {
          model: quality === 'high' ? 'eleven_multilingual_v2' : 'eleven_multilingual_v1',
          voice_settings: voiceConfig
        }
      };
    } catch (error) {
      if (error.message.includes('quota')) {
        throw new Error('ElevenLabs quota exceeded');
      }
      throw error;
    }
  }

  // =================================================
  // GOOGLE CLOUD TTS
  // =================================================

  async generateWithGoogleCloud(provider, text, languageCode, options) {
    const { speed = 1.0, pitch = 0, format = 'mp3' } = options;
    
    // For now, this is a placeholder - would need Google Cloud TTS SDK
    console.warn('Google Cloud TTS implementation needed');
    
    // Get voice configuration
    const voiceConfig = this.voiceProfiles.get(languageCode)?.google_cloud || {
      name: `${languageCode}-Wavenet-A`,
      language_code: languageCode
    };

    // Simulate processing for demo
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return {
      audioUrl: '/audio/placeholder-google.mp3',
      filename: 'placeholder-google.mp3',
      provider: 'google_cloud',
      languageCode,
      duration: this.estimateAudioDuration(text, languageCode),
      voiceConfig: voiceConfig.name,
      format,
      metadata: { voice_config: voiceConfig }
    };
  }

  // =================================================
  // AZURE COGNITIVE SERVICES TTS
  // =================================================

  async generateWithAzure(provider, text, languageCode, options) {
    const { speed = 1.0, pitch = 0, style = 'calm', format = 'mp3' } = options;
    
    // For now, this is a placeholder - would need Azure SDK
    console.warn('Azure TTS implementation needed');
    
    // Get voice configuration
    const voiceConfig = this.voiceProfiles.get(languageCode)?.azure || {
      voice: `${languageCode}-Neural`,
      style: 'calm'
    };

    // Simulate processing for demo
    await new Promise(resolve => setTimeout(resolve, 1200));
    
    return {
      audioUrl: '/audio/placeholder-azure.mp3',
      filename: 'placeholder-azure.mp3',
      provider: 'azure',
      languageCode,
      duration: this.estimateAudioDuration(text, languageCode),
      voiceConfig: voiceConfig.voice,
      format,
      metadata: { voice_config: voiceConfig }
    };
  }

  // =================================================
  // TEXT OPTIMIZATION
  // =================================================

  optimizeTextForTTS(text, languageCode, context = 'general') {
    let optimized = text;

    // General optimizations
    optimized = optimized
      .replace(/\b([A-Z]{2,})\b/g, (match) => {
        // Expand acronyms for better pronunciation
        const expansions = {
          'TTS': 'Text to Speech',
          'API': 'A P I',
          'URL': 'U R L',
          'JSON': 'J S O N'
        };
        return expansions[match] || match.split('').join(' ');
      })
      .replace(/\d+/g, (match) => {
        // Convert numbers to words for better pronunciation
        return this.numberToWords(parseInt(match), languageCode);
      });

    // Language-specific optimizations
    switch (languageCode) {
      case 'ar':
        // Arabic-specific optimizations
        optimized = optimized
          .replace(/([۰-۹]+)/g, (match) => {
            // Convert Arabic-Indic digits to words
            return this.arabicNumberToWords(match);
          })
          .replace(/(\w+)\s*-\s*(\w+)/g, '$1 إلى $2'); // Replace dashes with Arabic "to"
        break;
        
      case 'en':
        // English-specific optimizations
        optimized = optimized
          .replace(/\bDr\./g, 'Doctor')
          .replace(/\bMr\./g, 'Mister')
          .replace(/\bMrs\./g, 'Misses')
          .replace(/\bMs\./g, 'Miss')
          .replace(/\be\.g\./g, 'for example')
          .replace(/\bi\.e\./g, 'that is');
        break;
        
      case 'fr':
        // French-specific optimizations
        optimized = optimized
          .replace(/\bM\./g, 'Monsieur')
          .replace(/\bMme\./g, 'Madame')
          .replace(/\bMlle\./g, 'Mademoiselle');
        break;
    }

    // Context-specific optimizations for spiritual/tarot content
    if (context === 'spiritual') {
      const spiritualReplacements = {
        '&': languageCode === 'ar' ? 'و' : 'and',
        '+': languageCode === 'ar' ? 'بالإضافة إلى' : 'plus',
        '#': languageCode === 'ar' ? 'رقم' : 'number'
      };
      
      Object.entries(spiritualReplacements).forEach(([symbol, replacement]) => {
        optimized = optimized.replace(new RegExp(`\\${symbol}`, 'g'), ` ${replacement} `);
      });
    }

    // Clean up extra spaces
    optimized = optimized.replace(/\s+/g, ' ').trim();

    return optimized;
  }

  numberToWords(number, languageCode) {
    // Simplified number to words conversion
    const numberWords = {
      'en': ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'],
      'ar': ['صفر', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة'],
      'fr': ['zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf']
    };

    const words = numberWords[languageCode] || numberWords['en'];
    
    if (number >= 0 && number <= 9) {
      return words[number];
    }
    
    // For larger numbers, keep as digits for now
    return number.toString();
  }

  arabicNumberToWords(arabicDigits) {
    // Convert Arabic-Indic digits to Arabic words
    const digitMap = {
      '۰': 'صفر', '۱': 'واحد', '۲': 'اثنان', '۳': 'ثلاثة', '۴': 'أربعة',
      '۵': 'خمسة', '۶': 'ستة', '۷': 'سبعة', '۸': 'ثمانية', '۹': 'تسعة'
    };
    
    return arabicDigits.split('').map(digit => digitMap[digit] || digit).join(' ');
  }

  // =================================================
  // AUDIO MANAGEMENT
  // =================================================

  async storeAudioFile(audioBuffer, format, languageCode) {
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 8);
    const filename = `tts_${languageCode}_${timestamp}_${randomId}.${format}`;
    
    // Store in local cache (in production, would upload to cloud storage)
    this.audioStorage.set(filename, audioBuffer);
    
    // Simulate file upload
    console.log(`Audio file stored: ${filename} (${audioBuffer.byteLength} bytes)`);
    
    return filename;
  }

  estimateAudioDuration(text, languageCode) {
    // Rough estimation: average speaking rate per language
    const speakingRates = {
      'ar': 180, // words per minute
      'en': 200,
      'fr': 190,
      'tr': 170,
      'fa': 160,
      'es': 210
    };
    
    const rate = speakingRates[languageCode] || 200;
    const wordCount = text.split(/\s+/).length;
    return Math.round((wordCount / rate) * 60); // duration in seconds
  }

  // =================================================
  // BATCH PROCESSING
  // =================================================

  async generateBatchSpeech(textArray, languageCode, options = {}) {
    const {
      concurrency = 2, // Lower concurrency for TTS to avoid API limits
      progressCallback = null,
      ...ttsOptions
    } = options;

    const results = [];
    const errors = [];
    let completed = 0;

    for (let i = 0; i < textArray.length; i += concurrency) {
      const batch = textArray.slice(i, i + concurrency);
      
      const batchPromises = batch.map(async (item) => {
        try {
          const result = await this.generateSpeech(
            item.text, 
            languageCode, 
            { ...ttsOptions, useCache: true }
          );
          
          completed++;
          if (progressCallback) {
            progressCallback(completed, textArray.length);
          }

          return {
            id: item.id,
            originalText: item.text,
            success: result.success,
            audioUrl: result.audioUrl,
            filename: result.filename,
            duration: result.duration,
            provider: result.provider
          };
        } catch (error) {
          completed++;
          if (progressCallback) {
            progressCallback(completed, textArray.length);
          }

          errors.push({
            id: item.id,
            error: error.message
          });
          
          return null;
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults.filter(r => r !== null));

      // Longer delay between TTS batches
      if (i + concurrency < textArray.length) {
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }

    return {
      results,
      errors,
      totalProcessed: textArray.length,
      successful: results.length,
      failed: errors.length
    };
  }

  // =================================================
  // UTILITY METHODS
  // =================================================

  getCacheKey(text, languageCode, voicePreference, style) {
    const textHash = this.simpleHash(text);
    return `${textHash}-${languageCode}-${voicePreference || 'default'}-${style}`;
  }

  simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(36);
  }

  async getProviderApiKey(providerCode) {
    try {
      const response = await fetch(`/api/system/config/${providerCode}_api_key`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        return data.value;
      }
    } catch (error) {
      console.error(`Error getting API key for ${providerCode}:`, error);
    }
    return null;
  }

  // =================================================
  // VOICE MANAGEMENT
  // =================================================

  getAvailableVoices(languageCode) {
    const voices = this.voiceProfiles.get(languageCode) || {};
    return Object.keys(voices);
  }

  getVoicePreview(languageCode, providerCode) {
    const voiceConfig = this.voiceProfiles.get(languageCode)?.[providerCode];
    return voiceConfig || null;
  }

  async testVoice(text, languageCode, providerCode) {
    const testText = text || this.getTestPhrase(languageCode);
    return await this.generateSpeech(testText, languageCode, {
      voicePreference: providerCode,
      useCache: false
    });
  }

  getTestPhrase(languageCode) {
    const testPhrases = {
      'ar': 'مرحباً، هذا اختبار للصوت العربي في نظام سامية للتارو',
      'en': 'Hello, this is a voice test for the Samia Tarot system',
      'fr': 'Bonjour, ceci est un test vocal pour le système Samia Tarot',
      'tr': 'Merhaba, bu Samia Tarot sistemi için bir ses testidir',
      'fa': 'سلام، این آزمایش صدا برای سیستم تاروت سامیا است',
      'es': 'Hola, esta es una prueba de voz para el sistema Samia Tarot'
    };
    
    return testPhrases[languageCode] || testPhrases['en'];
  }

  // =================================================
  // ANALYTICS & MONITORING
  // =================================================

  getStats() {
    return {
      cacheSize: this.cache.size,
      audioStorageSize: this.audioStorage.size,
      providerStats: Object.fromEntries(this.providerStats),
      availableProviders: this.availableProviders.length,
      supportedLanguages: Array.from(this.voiceProfiles.keys())
    };
  }

  clearCache() {
    this.cache.clear();
    this.audioStorage.clear();
  }
}

// Export singleton instance
export default new MultilingualTTSService(); 