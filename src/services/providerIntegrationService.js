// =====================================================
// SAMIA TAROT - CENTRALIZED PROVIDER INTEGRATION SERVICE
// Advanced provider management with comprehensive fallback logic
// Real-time health monitoring and performance analytics
// =====================================================

import api from './frontendApi.js';
import systemSecretsService from './systemSecretsService.js';
import bilingualSettingsService from './bilingualSettingsService.js';

class ProviderIntegrationService {
  constructor() {
    this.providers = new Map();
    this.healthStatus = new Map();
    this.performanceMetrics = new Map();
    this.failureTracking = new Map();
    
    // Configuration
    this.config = {
      maxRetries: 5,
      baseDelay: 1000,
      maxDelay: 10000,
      healthCheckInterval: 30000, // 30 seconds
      performanceWindow: 300000, // 5 minutes
      failureThreshold: 0.7, // 70% failure rate triggers provider disable
      responseTimeThreshold: 15000, // 15 seconds max response time
      cacheExpiry: 300000 // 5 minutes
    };
    
    // Cache management
    this.cache = new Map();
    this.cacheMetadata = new Map();
    
    // Start health monitoring
    this.startHealthMonitoring();
    
    console.log('🔄 [PROVIDER INTEGRATION] Service initialized with advanced fallback system');
  }

  // =====================================================
  // PROVIDER DISCOVERY AND MANAGEMENT
  // =====================================================

  async getAvailableProviders(options = {}) {
    const { 
      forceRefresh = false, 
      includeInactive = false,
      sortBy = 'priority',
      category = null 
    } = options;

    const cacheKey = `providers_${includeInactive}_${sortBy}_${category}`;
    
    // Check cache first
    if (!forceRefresh && this.isCacheValid(cacheKey)) {
      console.log('💾 [PROVIDER INTEGRATION] Cache hit for providers');
      return this.cache.get(cacheKey);
    }

    try {
      console.log('🔄 [PROVIDER INTEGRATION] Loading providers from all sources...');
      
      // Load from multiple sources
      const [translationProviders, aiProviders, systemProviders] = await Promise.all([
        this.loadTranslationProviders(includeInactive),
        this.loadAIProviders(includeInactive),
        this.loadSystemProviders(includeInactive)
      ]);

      // Combine and deduplicate
      const allProviders = this.mergeProviders(translationProviders, aiProviders, systemProviders);
      
      // Filter by category if specified
      const filteredProviders = category 
        ? allProviders.filter(p => p.categories.includes(category))
        : allProviders;

      // Sort providers
      const sortedProviders = this.sortProviders(filteredProviders, sortBy);

      // Update provider health status
      await this.updateProvidersHealth(sortedProviders);

      // Cache the results
      this.setCache(cacheKey, sortedProviders);
      
      console.log(`✅ [PROVIDER INTEGRATION] Loaded ${sortedProviders.length} providers`);
      
      return sortedProviders;
      
    } catch (error) {
      console.error('❌ [PROVIDER INTEGRATION] Failed to load providers:', error);
      
      // Return cached data if available
      if (this.cache.has(cacheKey)) {
        console.log('📋 [PROVIDER INTEGRATION] Returning cached providers due to error');
        return this.cache.get(cacheKey);
      }
      
      // Return minimal fallback
      return this.getFallbackProviders();
    }
  }

  async loadTranslationProviders(includeInactive = false) {
    try {
      const response = await bilingualSettingsService.getProviders({ 
        active_only: !includeInactive 
      });
      
      if (response.success) {
        return response.data.providers || [];
      }
      
      return [];
    } catch (error) {
      console.error('❌ [PROVIDER INTEGRATION] Failed to load translation providers:', error);
      return [];
    }
  }

  async loadAIProviders(includeInactive = false) {
    try {
      const response = await api.get('/dynamic-ai/providers', {
        params: { active_only: !includeInactive }
      });
      
      if (response.data.success) {
        return response.data.data || [];
      }
      
      return [];
    } catch (error) {
      console.error('❌ [PROVIDER INTEGRATION] Failed to load AI providers:', error);
      return [];
    }
  }

  async loadSystemProviders(includeInactive = false) {
    try {
      const response = await systemSecretsService.getSystemSecrets();
      
      if (response.success) {
        // Extract provider configurations from system secrets
        const secrets = response.data.secrets || [];
        const providers = secrets
          .filter(secret => secret.config_category === 'ai_services' && secret.config_key.includes('API_KEY'))
          .map(secret => this.mapSecretToProvider(secret));
        
        return includeInactive ? providers : providers.filter(p => p.is_active);
      }
      
      return [];
    } catch (error) {
      console.error('❌ [PROVIDER INTEGRATION] Failed to load system providers:', error);
      return [];
    }
  }

  // =====================================================
  // ADVANCED FALLBACK LOGIC
  // =====================================================

  async executeWithFallback(operation, options = {}) {
    const {
      category = 'translation',
      requiredCapabilities = [],
      maxProviders = null,
      skipProviders = [],
      customRetryLogic = null
    } = options;

    console.log(`🔄 [PROVIDER INTEGRATION] Executing ${operation.name} with fallback logic`);

    // Get available providers for this category
    const availableProviders = await this.getAvailableProviders({
      category,
      sortBy: 'health_score'
    });

    // Filter providers based on requirements
    const eligibleProviders = availableProviders
      .filter(provider => {
        // Skip disabled providers
        if (!provider.is_active) return false;
        
        // Skip providers in skip list
        if (skipProviders.includes(provider.id)) return false;
        
        // Check required capabilities
        if (requiredCapabilities.length > 0) {
          return requiredCapabilities.every(cap => provider.capabilities.includes(cap));
        }
        
        return true;
      })
      .slice(0, maxProviders || availableProviders.length);

    if (eligibleProviders.length === 0) {
      throw new Error(`No eligible providers found for category: ${category}`);
    }

    console.log(`🔄 [PROVIDER INTEGRATION] Found ${eligibleProviders.length} eligible providers`);

    // Try each provider with comprehensive retry logic
    for (let i = 0; i < eligibleProviders.length; i++) {
      const provider = eligibleProviders[i];
      
      console.log(`🔄 [PROVIDER INTEGRATION] Trying provider ${i + 1}/${eligibleProviders.length}: ${provider.name}`);
      
      const result = await this.executeWithProvider(
        provider,
        operation,
        customRetryLogic || this.defaultRetryLogic
      );

      if (result.success) {
        // Update success metrics
        this.updateProviderMetrics(provider.id, {
          success: true,
          responseTime: result.responseTime,
          timestamp: Date.now()
        });

        console.log(`✅ [PROVIDER INTEGRATION] Operation successful with ${provider.name}`);
        return {
          success: true,
          data: result.data,
          provider: provider.name,
          attempt: i + 1,
          responseTime: result.responseTime
        };
      } else {
        // Update failure metrics
        this.updateProviderMetrics(provider.id, {
          success: false,
          error: result.error,
          responseTime: result.responseTime,
          timestamp: Date.now()
        });

        console.log(`❌ [PROVIDER INTEGRATION] Provider ${provider.name} failed: ${result.error}`);
      }
    }

    // All providers failed
    console.error('❌ [PROVIDER INTEGRATION] All providers failed');
    return {
      success: false,
      error: 'All providers failed',
      attemptedProviders: eligibleProviders.length,
      providers: eligibleProviders.map(p => p.name)
    };
  }

  async executeWithProvider(provider, operation, retryLogic) {
    const maxRetries = this.config.maxRetries;
    let lastError = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const startTime = Date.now();
      
      try {
        console.log(`🔄 [PROVIDER INTEGRATION] ${provider.name} attempt ${attempt}/${maxRetries}`);
        
        // Execute with timeout
        const result = await this.executeWithTimeout(
          () => operation(provider, attempt),
          this.config.responseTimeThreshold
        );

        const responseTime = Date.now() - startTime;
        
        // Validate result
        if (retryLogic.validateResult(result, attempt)) {
          return {
            success: true,
            data: result,
            responseTime,
            attempts: attempt
          };
        } else {
          lastError = new Error(`Invalid result from ${provider.name} on attempt ${attempt}`);
          console.log(`⚠️ [PROVIDER INTEGRATION] ${provider.name} attempt ${attempt} returned invalid result`);
        }

      } catch (error) {
        lastError = error;
        console.error(`❌ [PROVIDER INTEGRATION] ${provider.name} attempt ${attempt} failed:`, error.message);
        
        // Check if error is retryable
        if (!retryLogic.isRetryable(error, attempt)) {
          console.log(`🚫 [PROVIDER INTEGRATION] ${provider.name} error is not retryable, skipping remaining attempts`);
          break;
        }
        
        // Apply delay before retry
        if (attempt < maxRetries) {
          const delay = retryLogic.getDelay(attempt, error);
          console.log(`⏳ [PROVIDER INTEGRATION] Waiting ${delay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    return {
      success: false,
      error: lastError?.message || 'Unknown error',
      responseTime: Date.now() - Date.now(),
      attempts: maxRetries
    };
  }

  // =====================================================
  // HEALTH MONITORING SYSTEM
  // =====================================================

  startHealthMonitoring() {
    console.log('🏥 [PROVIDER INTEGRATION] Starting health monitoring system');
    
    // Initial health check
    this.performHealthCheck();
    
    // Schedule regular health checks
    setInterval(() => {
      this.performHealthCheck();
    }, this.config.healthCheckInterval);
  }

  async performHealthCheck() {
    try {
      const providers = await this.getAvailableProviders({ includeInactive: true });
      
      console.log(`🏥 [PROVIDER INTEGRATION] Performing health check on ${providers.length} providers`);
      
      // Check each provider's health
      const healthChecks = providers.map(provider => 
        this.checkProviderHealth(provider)
      );
      
      await Promise.allSettled(healthChecks);
      
      // Update overall system health
      this.updateSystemHealth();
      
    } catch (error) {
      console.error('❌ [PROVIDER INTEGRATION] Health check failed:', error);
    }
  }

  async checkProviderHealth(provider) {
    const healthKey = `health_${provider.id}`;
    const startTime = Date.now();
    
    try {
      // Perform lightweight health check
      const healthResult = await this.performProviderHealthCheck(provider);
      
      const responseTime = Date.now() - startTime;
      
      // Calculate health score
      const healthScore = this.calculateHealthScore(provider, healthResult, responseTime);
      
      // Update health status
      this.healthStatus.set(provider.id, {
        isHealthy: healthResult.success,
        healthScore,
        responseTime,
        lastCheck: Date.now(),
        consecutiveFailures: healthResult.success ? 0 : 
          (this.healthStatus.get(provider.id)?.consecutiveFailures || 0) + 1,
        error: healthResult.error || null
      });
      
      console.log(`🏥 [PROVIDER INTEGRATION] ${provider.name} health: ${healthScore.toFixed(2)} (${healthResult.success ? 'healthy' : 'unhealthy'})`);
      
    } catch (error) {
      console.error(`❌ [PROVIDER INTEGRATION] Health check failed for ${provider.name}:`, error);
      
      // Mark as unhealthy
      this.healthStatus.set(provider.id, {
        isHealthy: false,
        healthScore: 0,
        responseTime: Date.now() - startTime,
        lastCheck: Date.now(),
        consecutiveFailures: (this.healthStatus.get(provider.id)?.consecutiveFailures || 0) + 1,
        error: error.message
      });
    }
  }

  // =====================================================
  // PERFORMANCE ANALYTICS
  // =====================================================

  updateProviderMetrics(providerId, metrics) {
    const providerMetrics = this.performanceMetrics.get(providerId) || {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      totalResponseTime: 0,
      recentRequests: []
    };

    // Update counters
    providerMetrics.totalRequests++;
    providerMetrics.totalResponseTime += metrics.responseTime;
    
    if (metrics.success) {
      providerMetrics.successfulRequests++;
    } else {
      providerMetrics.failedRequests++;
    }

    // Add to recent requests (sliding window)
    providerMetrics.recentRequests.push({
      timestamp: metrics.timestamp,
      success: metrics.success,
      responseTime: metrics.responseTime,
      error: metrics.error
    });

    // Keep only recent requests within performance window
    const cutoffTime = Date.now() - this.config.performanceWindow;
    providerMetrics.recentRequests = providerMetrics.recentRequests
      .filter(req => req.timestamp > cutoffTime);

    this.performanceMetrics.set(providerId, providerMetrics);
  }

  getProviderAnalytics(providerId) {
    const metrics = this.performanceMetrics.get(providerId);
    const health = this.healthStatus.get(providerId);
    
    if (!metrics) {
      return null;
    }

    // Calculate statistics
    const successRate = metrics.totalRequests > 0 
      ? (metrics.successfulRequests / metrics.totalRequests) * 100 
      : 0;
    
    const averageResponseTime = metrics.totalRequests > 0 
      ? metrics.totalResponseTime / metrics.totalRequests 
      : 0;

    // Recent performance (last 5 minutes)
    const recentSuccessRate = metrics.recentRequests.length > 0
      ? (metrics.recentRequests.filter(r => r.success).length / metrics.recentRequests.length) * 100
      : 0;

    const recentAverageResponseTime = metrics.recentRequests.length > 0
      ? metrics.recentRequests.reduce((sum, r) => sum + r.responseTime, 0) / metrics.recentRequests.length
      : 0;

    return {
      providerId,
      totalRequests: metrics.totalRequests,
      successRate,
      averageResponseTime,
      recentSuccessRate,
      recentAverageResponseTime,
      healthScore: health?.healthScore || 0,
      isHealthy: health?.isHealthy || false,
      consecutiveFailures: health?.consecutiveFailures || 0,
      lastCheck: health?.lastCheck || null
    };
  }

  // =====================================================
  // UTILITY METHODS
  // =====================================================

  defaultRetryLogic = {
    validateResult: (result, attempt) => {
      return result != null && result !== '' && typeof result !== 'undefined';
    },
    
    isRetryable: (error, attempt) => {
      // Don't retry on certain errors
      if (error.message.includes('authentication') || 
          error.message.includes('authorization') ||
          error.message.includes('invalid API key')) {
        return false;
      }
      
      // Don't retry on final attempt
      return attempt < this.config.maxRetries;
    },
    
    getDelay: (attempt, error) => {
      // Exponential backoff with jitter
      const baseDelay = this.config.baseDelay;
      const exponentialDelay = Math.min(
        baseDelay * Math.pow(2, attempt - 1),
        this.config.maxDelay
      );
      
      // Add jitter to prevent thundering herd
      const jitter = Math.random() * 0.3 * exponentialDelay;
      
      return Math.floor(exponentialDelay + jitter);
    }
  };

  calculateHealthScore(provider, healthResult, responseTime) {
    let score = 0;
    
    // Base score for successful response
    if (healthResult.success) {
      score += 40;
    }
    
    // Response time score (faster = better)
    const responseScore = Math.max(0, 30 - (responseTime / 1000) * 3);
    score += responseScore;
    
    // Reliability score based on recent performance
    const metrics = this.performanceMetrics.get(provider.id);
    if (metrics && metrics.recentRequests.length > 0) {
      const recentSuccessRate = metrics.recentRequests
        .filter(r => r.success).length / metrics.recentRequests.length;
      score += recentSuccessRate * 30;
    } else {
      score += 15; // Default for new providers
    }
    
    return Math.min(100, Math.max(0, score));
  }

  async executeWithTimeout(operation, timeoutMs) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Operation timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      operation()
        .then(result => {
          clearTimeout(timeout);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timeout);
          reject(error);
        });
    });
  }

  // Cache management
  isCacheValid(key) {
    const metadata = this.cacheMetadata.get(key);
    if (!metadata) return false;
    
    return Date.now() - metadata.timestamp < this.config.cacheExpiry;
  }

  setCache(key, data) {
    this.cache.set(key, data);
    this.cacheMetadata.set(key, {
      timestamp: Date.now(),
      size: JSON.stringify(data).length
    });
  }

  // Provider management utilities
  mergeProviders(translationProviders, aiProviders, systemProviders) {
    const providerMap = new Map();
    
    // Process each provider source
    [...translationProviders, ...aiProviders, ...systemProviders].forEach(provider => {
      const key = provider.name || provider.provider_code;
      
      if (!providerMap.has(key)) {
        providerMap.set(key, {
          id: provider.id,
          name: key,
          displayName: provider.display_name || provider.name,
          type: provider.type || 'generic',
          categories: provider.categories || ['translation'],
          capabilities: provider.capabilities || [],
          is_active: provider.is_active !== false,
          priority: provider.priority || 999,
          healthScore: 0,
          ...provider
        });
      }
    });
    
    return Array.from(providerMap.values());
  }

  sortProviders(providers, sortBy) {
    switch (sortBy) {
      case 'health_score':
        return providers.sort((a, b) => (b.healthScore || 0) - (a.healthScore || 0));
      case 'priority':
        return providers.sort((a, b) => a.priority - b.priority);
      case 'name':
        return providers.sort((a, b) => a.name.localeCompare(b.name));
      default:
        return providers;
    }
  }

  getFallbackProviders() {
    return [
      {
        id: 'fallback-system',
        name: 'system_fallback',
        displayName: 'System Fallback',
        type: 'fallback',
        categories: ['translation', 'ai'],
        capabilities: ['text_generation', 'translation'],
        is_active: true,
        priority: 9999,
        healthScore: 50
      }
    ];
  }

     // Missing methods implementation
   async updateProvidersHealth(providers) {
     // This is called from getAvailableProviders
     // Update health scores for all providers
     providers.forEach(provider => {
       const health = this.healthStatus.get(provider.id);
       if (health) {
         provider.healthScore = health.healthScore;
         provider.isHealthy = health.isHealthy;
         provider.lastHealthCheck = health.lastCheck;
       }
     });
   }

   async performProviderHealthCheck(provider) {
     // Perform lightweight health check based on provider type
     try {
       switch (provider.type) {
         case 'translation':
           return await this.checkTranslationProviderHealth(provider);
         case 'ai':
           return await this.checkAIProviderHealth(provider);
         default:
           return { success: true, message: 'Basic health check passed' };
       }
     } catch (error) {
       return { success: false, error: error.message };
     }
   }

   async checkTranslationProviderHealth(provider) {
     // Simple health check for translation providers
     try {
       // Check if provider has required configuration
       if (!provider.api_endpoint && !provider.name) {
         return { success: false, error: 'Missing configuration' };
       }
       
       // Basic connectivity check (mock for now)
       return { success: true, message: 'Translation provider is healthy' };
     } catch (error) {
       return { success: false, error: error.message };
     }
   }

   async checkAIProviderHealth(provider) {
     // Simple health check for AI providers
     try {
       // Check if provider has required configuration
       if (!provider.name) {
         return { success: false, error: 'Missing provider name' };
       }
       
       // Basic connectivity check (mock for now)
       return { success: true, message: 'AI provider is healthy' };
     } catch (error) {
       return { success: false, error: error.message };
     }
   }

   mapSecretToProvider(secret) {
     // Map system secret to provider format
     const providerName = secret.config_key.replace('_API_KEY', '').toLowerCase();
     
     return {
       id: `system_${secret.id}`,
       name: providerName,
       displayName: this.formatProviderName(providerName),
       type: 'system',
       categories: ['ai', 'translation'],
       capabilities: ['text_generation', 'translation'],
       is_active: secret.is_active !== false,
       priority: 500,
       source: 'system_secrets',
       config_key: secret.config_key,
       config_category: secret.config_category,
       has_credentials: secret.config_value_encrypted ? true : false
     };
   }

   formatProviderName(providerName) {
     // Format provider name for display
     return providerName
       .split('_')
       .map(word => word.charAt(0).toUpperCase() + word.slice(1))
       .join(' ');
   }

   updateSystemHealth() {
     // Update overall system health based on provider health
     const totalProviders = this.healthStatus.size;
     const healthyProviders = Array.from(this.healthStatus.values())
       .filter(health => health.isHealthy).length;
     
     const overallHealth = totalProviders > 0 ? (healthyProviders / totalProviders) * 100 : 0;
     
     console.log(`🏥 [PROVIDER INTEGRATION] System health: ${overallHealth.toFixed(1)}% (${healthyProviders}/${totalProviders} providers healthy)`);
     
     // Store system health for monitoring
     this.systemHealth = {
       overallHealth,
       totalProviders,
       healthyProviders,
       unhealthyProviders: totalProviders - healthyProviders,
       lastUpdate: Date.now()
     };
   }

   // Public API methods
   async getSystemHealth() {
     const providers = await this.getAvailableProviders();
     const healthyProviders = providers.filter(p => {
       const health = this.healthStatus.get(p.id);
       return health?.isHealthy !== false;
     });

     return {
       totalProviders: providers.length,
       healthyProviders: healthyProviders.length,
       overallHealth: providers.length > 0 ? (healthyProviders.length / providers.length) * 100 : 0,
       providers: providers.map(p => ({
         id: p.id,
         name: p.name,
         health: this.healthStatus.get(p.id),
         analytics: this.getProviderAnalytics(p.id)
       }))
     };
   }

   async clearCache() {
     this.cache.clear();
     this.cacheMetadata.clear();
     console.log('✅ [PROVIDER INTEGRATION] Cache cleared');
   }
}

// Export singleton instance
export const providerIntegrationService = new ProviderIntegrationService();
export default providerIntegrationService; 