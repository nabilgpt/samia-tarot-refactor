import { supabase } from '../lib/supabase.js';

class TTSService {
  constructor() {
    this.apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    this.baseUrl = 'https://api.openai.com/v1/audio/speech';
  }

  /**
   * Generate speech from text using OpenAI TTS
   * @param {string} text - Text to convert to speech
   * @param {Object} options - TTS options
   * @returns {Promise<Object>} - Result with audio URL
   */
  async generateSpeech(text, options = {}) {
    try {
      const {
        voice = 'alloy', // alloy, echo, fable, onyx, nova, shimmer
        model = 'tts-1', // tts-1 or tts-1-hd
        speed = 1.0, // 0.25 to 4.0
        format = 'mp3' // mp3, opus, aac, flac
      } = options;

      // Validate input
      if (!text || text.trim().length === 0) {
        return {
          success: false,
          error: 'Text is required for speech generation'
        };
      }

      if (!this.apiKey) {
        return {
          success: false,
          error: 'OpenAI API key not configured'
        };
      }

      // Make request to OpenAI TTS API
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          input: text,
          voice,
          speed,
          response_format: format
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          error: errorData.error?.message || `TTS API error: ${response.status}`
        };
      }

      // Get audio blob
      const audioBlob = await response.blob();
      
      // Create object URL for immediate playback
      const audioUrl = URL.createObjectURL(audioBlob);

      // Optionally save to Supabase storage for persistence
      const storageUrl = await this.saveToStorage(audioBlob, format);

      return {
        success: true,
        audioUrl, // For immediate playback
        storageUrl, // For persistent storage
        blob: audioBlob,
        metadata: {
          voice,
          model,
          speed,
          format,
          textLength: text.length,
          generatedAt: new Date().toISOString()
        }
      };

    } catch (error) {
      console.error('TTS generation error:', error);
      return {
        success: false,
        error: error.message || 'Failed to generate speech'
      };
    }
  }

  /**
   * Save audio blob to Supabase storage
   * @param {Blob} audioBlob - Audio blob to save
   * @param {string} format - Audio format
   * @returns {Promise<string|null>} - Storage URL or null
   */
  async saveToStorage(audioBlob, format) {
    try {
      const fileName = `tts_${Date.now()}.${format}`;
      const filePath = `audio/tts/${fileName}`;

      const { data, error } = await supabase.storage
        .from('media')
        .upload(filePath, audioBlob, {
          contentType: `audio/${format}`,
          cacheControl: '3600'
        });

      if (error) {
        console.error('Storage upload error:', error);
        return null;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('media')
        .getPublicUrl(filePath);

      return urlData.publicUrl;

    } catch (error) {
      console.error('Storage save error:', error);
      return null;
    }
  }

  /**
   * Generate speech for tarot reading with optimized settings
   * @param {string} reading - Tarot reading text
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} - Result with audio URL
   */
  async generateTarotReading(reading, options = {}) {
    const tarotOptions = {
      voice: 'nova', // Calm, mystical voice
      speed: 0.85, // Slightly slower for contemplation
      model: 'tts-1-hd', // Higher quality for readings
      format: 'mp3',
      ...options
    };

    // Add pauses for better flow
    const formattedReading = this.formatTarotText(reading);

    return this.generateSpeech(formattedReading, tarotOptions);
  }

  /**
   * Format tarot reading text for better speech flow
   * @param {string} text - Original text
   * @returns {string} - Formatted text with pauses
   */
  formatTarotText(text) {
    return text
      // Add pauses after sentences
      .replace(/\. /g, '... ')
      // Add pauses after card names
      .replace(/([A-Z][a-z]+ of [A-Z][a-z]+)/g, '$1...')
      // Add pauses after "The" (for Major Arcana)
      .replace(/The ([A-Z][a-z]+)/g, 'The $1...')
      // Add longer pauses for paragraph breaks
      .replace(/\n\n/g, '......')
      // Clean up multiple spaces
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Get available voices
   * @returns {Array} - List of available voices
   */
  getAvailableVoices() {
    return [
      { id: 'alloy', name: 'Alloy', description: 'Neutral, balanced voice' },
      { id: 'echo', name: 'Echo', description: 'Clear, professional voice' },
      { id: 'fable', name: 'Fable', description: 'Warm, storytelling voice' },
      { id: 'onyx', name: 'Onyx', description: 'Deep, authoritative voice' },
      { id: 'nova', name: 'Nova', description: 'Calm, mystical voice (recommended for tarot)' },
      { id: 'shimmer', name: 'Shimmer', description: 'Bright, energetic voice' }
    ];
  }

  /**
   * Validate TTS configuration
   * @returns {Object} - Validation result
   */
  validateConfiguration() {
    const issues = [];

    if (!this.apiKey) {
      issues.push('OpenAI API key not configured');
    }

    if (!navigator.mediaDevices) {
      issues.push('Audio playback not supported in this browser');
    }

    return {
      isValid: issues.length === 0,
      issues
    };
  }

  /**
   * Clean up object URLs to prevent memory leaks
   * @param {string} audioUrl - Object URL to revoke
   */
  cleanup(audioUrl) {
    if (audioUrl && audioUrl.startsWith('blob:')) {
      URL.revokeObjectURL(audioUrl);
    }
  }

  /**
   * Estimate speech duration
   * @param {string} text - Text to analyze
   * @param {number} speed - Speech speed (default 1.0)
   * @returns {number} - Estimated duration in seconds
   */
  estimateDuration(text, speed = 1.0) {
    // Average speaking rate: ~150 words per minute
    const wordsPerMinute = 150 * speed;
    const wordCount = text.split(/\s+/).length;
    const minutes = wordCount / wordsPerMinute;
    return Math.ceil(minutes * 60); // Return seconds
  }

  /**
   * Create audio player with controls
   * @param {string} audioUrl - Audio URL
   * @param {Object} options - Player options
   * @returns {HTMLAudioElement} - Audio element
   */
  createAudioPlayer(audioUrl, options = {}) {
    const audio = new Audio(audioUrl);
    
    const {
      autoplay = false,
      loop = false,
      volume = 1.0,
      onEnded = null,
      onError = null,
      onPlay = null,
      onPause = null
    } = options;

    audio.autoplay = autoplay;
    audio.loop = loop;
    audio.volume = Math.max(0, Math.min(1, volume));

    // Event listeners
    if (onEnded) audio.addEventListener('ended', onEnded);
    if (onError) audio.addEventListener('error', onError);
    if (onPlay) audio.addEventListener('play', onPlay);
    if (onPause) audio.addEventListener('pause', onPause);

    return audio;
  }
}

// Create singleton instance
export const ttsService = new TTSService();

// Export class for testing
export { TTSService }; 