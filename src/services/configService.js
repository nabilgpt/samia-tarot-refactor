import { supabase } from '../lib/supabase.js';

class ConfigService {
  constructor() {
    this.cache = new Map();
    this.cacheExpiry = new Map();
    this.CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  }

  // Clear cache for a specific config type
  clearCache(configType) {
    this.cache.delete(configType);
    this.cacheExpiry.delete(configType);
  }

  // Clear all cache
  clearAllCache() {
    this.cache.clear();
    this.cacheExpiry.clear();
  }

  // Check if cache is valid
  isCacheValid(configType) {
    const expiry = this.cacheExpiry.get(configType);
    return expiry && Date.now() < expiry;
  }

  // Get configuration from cache or database
  async getConfig(configType) {
    // Check cache first
    if (this.isCacheValid(configType)) {
      return this.cache.get(configType);
    }

    try {
      const { data, error } = await supabase
        .from('system_configurations')
        .select('config_data, is_active')
        .eq('config_type', configType)
        .eq('is_active', true)
        .single();

      if (error) {
        console.warn(`Config not found for ${configType}:`, error);
        return null;
      }

      const config = data.config_data;
      
      // Cache the result
      this.cache.set(configType, config);
      this.cacheExpiry.set(configType, Date.now() + this.CACHE_DURATION);

      return config;
    } catch (error) {
      console.error(`Error fetching config for ${configType}:`, error);
      return null;
    }
  }

  // Get active AI provider configuration
  async getActiveAIProvider() {
    const cacheKey = 'active_ai_provider';
    
    if (this.isCacheValid(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      const { data, error } = await supabase
        .from('ai_providers')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        console.warn('No active AI provider found:', error);
        return null;
      }

      // Parse models if it's a string
      if (typeof data.models === 'string') {
        data.models = JSON.parse(data.models);
      }

      // Cache the result
      this.cache.set(cacheKey, data);
      this.cacheExpiry.set(cacheKey, Date.now() + this.CACHE_DURATION);

      return data;
    } catch (error) {
      console.error('Error fetching active AI provider:', error);
      return null;
    }
  }

  // Get AI provider by ID
  async getAIProvider(providerId) {
    try {
      const { data, error } = await supabase
        .from('ai_providers')
        .select('*')
        .eq('id', providerId)
        .single();

      if (error) throw error;

      // Parse models if it's a string
      if (typeof data.models === 'string') {
        data.models = JSON.parse(data.models);
      }

      return data;
    } catch (error) {
      console.error('Error fetching AI provider:', error);
      return null;
    }
  }

  // Get all active AI providers
  async getAllAIProviders() {
    try {
      const { data, error } = await supabase
        .from('ai_providers')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Parse models for each provider
      return data.map(provider => ({
        ...provider,
        models: typeof provider.models === 'string' 
          ? JSON.parse(provider.models) 
          : provider.models
      }));
    } catch (error) {
      console.error('Error fetching AI providers:', error);
      return [];
    }
  }

  // Get Supabase configuration
  async getSupabaseConfig() {
    return await this.getConfig('supabase');
  }

  // Get Backblaze B2 configuration
  async getB2Config() {
    return await this.getConfig('backblaze_b2');
  }

  // Get SMTP configuration
  async getSMTPConfig() {
    return await this.getConfig('smtp');
  }

  // Get payment gateway configuration
  async getPaymentConfig() {
    return await this.getConfig('payment_gateway');
  }

  // Make AI API call using active provider
  async makeAICall(messages, options = {}) {
    const provider = await this.getActiveAIProvider();
    
    if (!provider) {
      throw new Error('No active AI provider configured');
    }

    const {
      model = provider.active_model,
      temperature = 0.7,
      max_tokens = 1000,
      ...otherOptions
    } = options;

    try {
      let apiCall;

      switch (provider.provider_type) {
        case 'openai':
          apiCall = this.makeOpenAICall(provider, messages, {
            model,
            temperature,
            max_tokens,
            ...otherOptions
          });
          break;

        case 'gemini':
          apiCall = this.makeGeminiCall(provider, messages, {
            model,
            temperature,
            max_tokens,
            ...otherOptions
          });
          break;

        case 'anthropic':
          apiCall = this.makeAnthropicCall(provider, messages, {
            model,
            temperature,
            max_tokens,
            ...otherOptions
          });
          break;

        default:
          throw new Error(`Unsupported AI provider type: ${provider.provider_type}`);
      }

      return await apiCall;
    } catch (error) {
      console.error('AI API call failed:', error);
      throw error;
    }
  }

  // OpenAI API call
  async makeOpenAICall(provider, messages, options) {
    const response = await fetch(`${provider.host_url}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${provider.api_key}`
      },
      body: JSON.stringify({
        model: options.model,
        messages: messages,
        temperature: options.temperature,
        max_tokens: options.max_tokens,
        ...options
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }

  // Google Gemini API call
  async makeGeminiCall(provider, messages, options) {
    // Convert OpenAI format to Gemini format
    const contents = messages.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

    const response = await fetch(`${provider.host_url}/models/${options.model}:generateContent?key=${provider.api_key}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: contents,
        generationConfig: {
          temperature: options.temperature,
          maxOutputTokens: options.max_tokens
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
  }

  // Anthropic Claude API call
  async makeAnthropicCall(provider, messages, options) {
    const response = await fetch(`${provider.host_url}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': provider.api_key,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: options.model,
        messages: messages,
        temperature: options.temperature,
        max_tokens: options.max_tokens
      })
    });

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.content[0].text;
  }

  // Update configuration
  async updateConfig(configType, configData) {
    try {
      const { error } = await supabase
        .from('system_configurations')
        .upsert({
          config_type: configType,
          config_data: configData,
          updated_at: new Date().toISOString()
        }, { onConflict: 'config_type' });

      if (error) throw error;

      // Clear cache for this config type
      this.clearCache(configType);
      
      return true;
    } catch (error) {
      console.error('Error updating configuration:', error);
      throw error;
    }
  }

  // Initialize dynamic Supabase client (if needed)
  async createDynamicSupabaseClient() {
    const config = await this.getSupabaseConfig();
    
    if (!config) {
      console.warn('No Supabase configuration found, using default');
      return supabase;
    }

    // This would create a new Supabase client with dynamic config
    // For now, we'll return the existing client
    return supabase;
  }

  // Get storage configuration (B2 or Supabase)
  async getStorageConfig() {
    const b2Config = await this.getB2Config();
    
    if (b2Config && b2Config.is_active) {
      return {
        type: 'backblaze_b2',
        config: b2Config
      };
    }

    const supabaseConfig = await this.getSupabaseConfig();
    return {
      type: 'supabase',
      config: supabaseConfig
    };
  }

  // Upload file using configured storage
  async uploadFile(file, path) {
    const storageConfig = await this.getStorageConfig();

    switch (storageConfig.type) {
      case 'backblaze_b2':
        return await this.uploadToB2(file, path, storageConfig.config);
      
      case 'supabase':
      default:
        return await this.uploadToSupabase(file, path);
    }
  }

  // Upload to Supabase Storage
  async uploadToSupabase(file, path) {
    const { data, error } = await supabase.storage
      .from('uploads')
      .upload(path, file);

    if (error) throw error;
    return data;
  }

  // Upload to Backblaze B2 (placeholder implementation)
  async uploadToB2(file, path, config) {
    // This would implement B2 upload logic
    // For now, fallback to Supabase
    console.warn('B2 upload not implemented, falling back to Supabase');
    return await this.uploadToSupabase(file, path);
  }
}

// Create singleton instance
const configService = new ConfigService();

export default configService;

// Export specific methods for convenience
export const {
  getConfig,
  getActiveAIProvider,
  getAllAIProviders,
  getSupabaseConfig,
  getB2Config,
  makeAICall,
  updateConfig,
  uploadFile,
  clearCache,
  clearAllCache
} = configService; 
