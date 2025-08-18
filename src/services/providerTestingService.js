// ============================================================================
// SAMIA TAROT - PROVIDER TESTING SERVICE
// Frontend service for testing AI/translation providers
// ============================================================================
// Date: 2025-01-13
// Purpose: Comprehensive provider testing with real-time validation
// Features: API connectivity, health monitoring, performance testing
// ============================================================================

import api from './frontendApi.js';
import systemSecretsService from './systemSecretsService.js';

export class ProviderTestingService {
    constructor() {
        this.testCache = new Map();
        this.healthMonitors = new Map();
        this.testTimeouts = new Map();
        this.validationRules = this.initializeValidationRules();
    }

    // ============================================================================
    // VALIDATION RULES
    // ============================================================================

    initializeValidationRules() {
        return {
            openai: {
                requiredFields: ['api_key', 'base_url'],
                apiKeyFormat: /^sk-[A-Za-z0-9]{48}$/,
                baseUrl: 'https://api.openai.com/v1',
                testEndpoint: '/models',
                timeout: 10000,
                expectedResponse: { object: 'list' }
            },
            anthropic: {
                requiredFields: ['api_key', 'base_url'],
                apiKeyFormat: /^sk-ant-[A-Za-z0-9-]{95}$/,
                baseUrl: 'https://api.anthropic.com/v1',
                testEndpoint: '/models',
                timeout: 10000,
                expectedResponse: { type: 'model_list' }
            },
            google: {
                requiredFields: ['api_key', 'base_url'],
                apiKeyFormat: /^[A-Za-z0-9_-]{39}$/,
                baseUrl: 'https://generativelanguage.googleapis.com/v1',
                testEndpoint: '/models',
                timeout: 10000,
                expectedResponse: { models: [] }
            },
            elevenlabs: {
                requiredFields: ['api_key', 'base_url'],
                apiKeyFormat: /^[A-Za-z0-9]{32}$/,
                baseUrl: 'https://api.elevenlabs.io/v1',
                testEndpoint: '/user',
                timeout: 10000,
                expectedResponse: { subscription: {} }
            },
            azure_openai: {
                requiredFields: ['api_key', 'base_url', 'deployment_name'],
                apiKeyFormat: /^[A-Za-z0-9]{32}$/,
                baseUrl: 'https://your-resource.openai.azure.com',
                testEndpoint: '/openai/deployments',
                timeout: 15000,
                expectedResponse: { object: 'deployment' }
            },
            custom: {
                requiredFields: ['api_key', 'base_url'],
                apiKeyFormat: null, // No specific format for custom providers
                baseUrl: null,
                testEndpoint: '/health',
                timeout: 10000,
                expectedResponse: null
            }
        };
    }

    // ============================================================================
    // REAL-TIME VALIDATION
    // ============================================================================

    async validateProviderConfiguration(providerConfig) {
        const { provider_type, ...config } = providerConfig;
        const rules = this.validationRules[provider_type];
        
        if (!rules) {
            return {
                valid: false,
                errors: [`Unknown provider type: ${provider_type}`],
                warnings: []
            };
        }

        const errors = [];
        const warnings = [];

        // Validate required fields
        for (const field of rules.requiredFields) {
            if (!config[field] || config[field].trim() === '') {
                errors.push(`Missing required field: ${field}`);
            }
        }

        // Validate API key format
        if (rules.apiKeyFormat && config.api_key) {
            if (!rules.apiKeyFormat.test(config.api_key)) {
                errors.push(`Invalid API key format for ${provider_type}`);
            }
        }

        // Validate base URL
        if (config.base_url) {
            try {
                const url = new URL(config.base_url);
                if (!['http:', 'https:'].includes(url.protocol)) {
                    errors.push('Base URL must use HTTP or HTTPS protocol');
                }
            } catch (error) {
                errors.push('Invalid base URL format');
            }
        }

        // Validate timeout
        if (config.timeout && (config.timeout < 1000 || config.timeout > 60000)) {
            warnings.push('Timeout should be between 1 and 60 seconds');
        }

        // Validate rate limits
        if (config.requests_per_minute && config.requests_per_minute > 1000) {
            warnings.push('Very high rate limit - may cause issues');
        }

        return {
            valid: errors.length === 0,
            errors,
            warnings
        };
    }

    // ============================================================================
    // REAL-TIME TESTING
    // ============================================================================

    async testProviderConnection(providerConfig, options = {}) {
        const startTime = Date.now();
        const testId = `${providerConfig.id || 'new'}_${startTime}`;
        
        try {
            // Clear previous test timeout
            if (this.testTimeouts.has(testId)) {
                clearTimeout(this.testTimeouts.get(testId));
            }

            // Set test timeout
            const timeout = options.timeout || this.validationRules[providerConfig.provider_type]?.timeout || 10000;
            const timeoutPromise = new Promise((_, reject) => {
                const timer = setTimeout(() => {
                    reject(new Error('Test timeout'));
                }, timeout);
                this.testTimeouts.set(testId, timer);
            });

            // Validate configuration first
            const validation = await this.validateProviderConfiguration(providerConfig);
            if (!validation.valid) {
                return {
                    success: false,
                    status: 'validation_failed',
                    errors: validation.errors,
                    warnings: validation.warnings,
                    response_time: Date.now() - startTime
                };
            }

            // Perform actual connection test
            const testPromise = this.performConnectionTest(providerConfig, testId);
            const result = await Promise.race([testPromise, timeoutPromise]);

            // Clear timeout
            if (this.testTimeouts.has(testId)) {
                clearTimeout(this.testTimeouts.get(testId));
                this.testTimeouts.delete(testId);
            }

            return {
                ...result,
                warnings: validation.warnings,
                response_time: Date.now() - startTime
            };

        } catch (error) {
            // Clear timeout
            if (this.testTimeouts.has(testId)) {
                clearTimeout(this.testTimeouts.get(testId));
                this.testTimeouts.delete(testId);
            }

            return {
                success: false,
                status: 'connection_failed',
                error: error.message,
                response_time: Date.now() - startTime
            };
        }
    }

    async performConnectionTest(providerConfig, testId) {
        const { provider_type, api_key, base_url, ...config } = providerConfig;
        const rules = this.validationRules[provider_type];

        switch (provider_type) {
            case 'openai':
                return await this.testOpenAIConnection(api_key, base_url, config);
            case 'anthropic':
                return await this.testAnthropicConnection(api_key, base_url, config);
            case 'google':
                return await this.testGoogleConnection(api_key, base_url, config);
            case 'elevenlabs':
                return await this.testElevenLabsConnection(api_key, base_url, config);
            case 'azure_openai':
                return await this.testAzureOpenAIConnection(api_key, base_url, config);
            case 'custom':
                return await this.testCustomConnection(api_key, base_url, config);
            default:
                throw new Error(`Unknown provider type: ${provider_type}`);
        }
    }

    // ============================================================================
    // PROVIDER-SPECIFIC TESTING
    // ============================================================================

    async testOpenAIConnection(apiKey, baseUrl, config) {
        try {
            const response = await api.post('/system-secrets/test-connection', {
                provider_type: 'openai',
                api_key: apiKey,
                base_url: baseUrl || 'https://api.openai.com/v1',
                test_endpoint: '/models'
            });

            if (response.data.success) {
                const models = response.data.data?.data || [];
                return {
                    success: true,
                    status: 'connected',
                    message: `OpenAI connection successful. ${models.length} models available.`,
                    details: {
                        models_count: models.length,
                        available_models: models.slice(0, 5).map(m => m.id),
                        organization: response.data.data?.organization || 'Default'
                    }
                };
            } else {
                return {
                    success: false,
                    status: 'api_error',
                    error: response.data.error || 'OpenAI API test failed'
                };
            }
        } catch (error) {
            return {
                success: false,
                status: 'connection_failed',
                error: `OpenAI connection failed: ${error.message}`
            };
        }
    }

    async testAnthropicConnection(apiKey, baseUrl, config) {
        try {
            const response = await api.post('/system-secrets/test-connection', {
                provider_type: 'anthropic',
                api_key: apiKey,
                base_url: baseUrl || 'https://api.anthropic.com/v1',
                test_endpoint: '/models'
            });

            if (response.data.success) {
                return {
                    success: true,
                    status: 'connected',
                    message: 'Anthropic (Claude) connection successful',
                    details: {
                        models_available: ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'],
                        api_version: response.data.data?.api_version || 'v1'
                    }
                };
            } else {
                return {
                    success: false,
                    status: 'api_error',
                    error: response.data.error || 'Anthropic API test failed'
                };
            }
        } catch (error) {
            return {
                success: false,
                status: 'connection_failed',
                error: `Anthropic connection failed: ${error.message}`
            };
        }
    }

    async testGoogleConnection(apiKey, baseUrl, config) {
        try {
            const response = await api.post('/system-secrets/test-connection', {
                provider_type: 'google',
                api_key: apiKey,
                base_url: baseUrl || 'https://generativelanguage.googleapis.com/v1',
                test_endpoint: '/models'
            });

            if (response.data.success) {
                const models = response.data.data?.models || [];
                return {
                    success: true,
                    status: 'connected',
                    message: `Google AI connection successful. ${models.length} models available.`,
                    details: {
                        models_count: models.length,
                        available_models: models.slice(0, 5).map(m => m.name),
                        service: 'Google AI Studio'
                    }
                };
            } else {
                return {
                    success: false,
                    status: 'api_error',
                    error: response.data.error || 'Google AI API test failed'
                };
            }
        } catch (error) {
            return {
                success: false,
                status: 'connection_failed',
                error: `Google AI connection failed: ${error.message}`
            };
        }
    }

    async testElevenLabsConnection(apiKey, baseUrl, config) {
        try {
            const response = await api.post('/system-secrets/test-connection', {
                provider_type: 'elevenlabs',
                api_key: apiKey,
                base_url: baseUrl || 'https://api.elevenlabs.io/v1',
                test_endpoint: '/user'
            });

            if (response.data.success) {
                const userData = response.data.data;
                return {
                    success: true,
                    status: 'connected',
                    message: 'ElevenLabs connection successful',
                    details: {
                        user_id: userData?.user_id || 'Unknown',
                        subscription: userData?.subscription?.tier || 'Free',
                        characters_remaining: userData?.subscription?.character_count || 0
                    }
                };
            } else {
                return {
                    success: false,
                    status: 'api_error',
                    error: response.data.error || 'ElevenLabs API test failed'
                };
            }
        } catch (error) {
            return {
                success: false,
                status: 'connection_failed',
                error: `ElevenLabs connection failed: ${error.message}`
            };
        }
    }

    async testAzureOpenAIConnection(apiKey, baseUrl, config) {
        try {
            const response = await api.post('/system-secrets/test-connection', {
                provider_type: 'azure_openai',
                api_key: apiKey,
                base_url: baseUrl,
                deployment_name: config.deployment_name,
                test_endpoint: `/openai/deployments/${config.deployment_name}/models`
            });

            if (response.data.success) {
                return {
                    success: true,
                    status: 'connected',
                    message: 'Azure OpenAI connection successful',
                    details: {
                        deployment: config.deployment_name,
                        region: this.extractRegionFromUrl(baseUrl),
                        api_version: config.api_version || '2023-12-01-preview'
                    }
                };
            } else {
                return {
                    success: false,
                    status: 'api_error',
                    error: response.data.error || 'Azure OpenAI API test failed'
                };
            }
        } catch (error) {
            return {
                success: false,
                status: 'connection_failed',
                error: `Azure OpenAI connection failed: ${error.message}`
            };
        }
    }

    async testCustomConnection(apiKey, baseUrl, config) {
        try {
            const testEndpoint = config.test_endpoint || '/health';
            const response = await api.post('/system-secrets/test-connection', {
                provider_type: 'custom',
                api_key: apiKey,
                base_url: baseUrl,
                test_endpoint: testEndpoint,
                headers: config.custom_headers || {}
            });

            if (response.data.success) {
                return {
                    success: true,
                    status: 'connected',
                    message: 'Custom provider connection successful',
                    details: {
                        endpoint: `${baseUrl}${testEndpoint}`,
                        response_status: response.data.status,
                        custom_provider: true
                    }
                };
            } else {
                return {
                    success: false,
                    status: 'api_error',
                    error: response.data.error || 'Custom provider API test failed'
                };
            }
        } catch (error) {
            return {
                success: false,
                status: 'connection_failed',
                error: `Custom provider connection failed: ${error.message}`
            };
        }
    }

    // ============================================================================
    // HEALTH MONITORING
    // ============================================================================

    async startHealthMonitoring(providerId, interval = 30000) {
        if (this.healthMonitors.has(providerId)) {
            this.stopHealthMonitoring(providerId);
        }

        const monitor = setInterval(async () => {
            try {
                const provider = await this.getProviderById(providerId);
                if (provider) {
                    const testResult = await this.testProviderConnection(provider, { timeout: 5000 });
                    await this.updateProviderHealth(providerId, testResult);
                }
            } catch (error) {
                console.error(`Health monitoring error for provider ${providerId}:`, error);
            }
        }, interval);

        this.healthMonitors.set(providerId, monitor);
        console.log(`✅ Health monitoring started for provider ${providerId}`);
    }

    stopHealthMonitoring(providerId) {
        if (this.healthMonitors.has(providerId)) {
            clearInterval(this.healthMonitors.get(providerId));
            this.healthMonitors.delete(providerId);
            console.log(`🛑 Health monitoring stopped for provider ${providerId}`);
        }
    }

    async updateProviderHealth(providerId, testResult) {
        try {
            const healthStatus = testResult.success ? 'healthy' : 'unhealthy';
            const healthData = {
                provider_id: providerId,
                status: healthStatus,
                response_time: testResult.response_time,
                error_message: testResult.error || null,
                checked_at: new Date().toISOString()
            };

            await api.post('/system-secrets/health-update', healthData);
        } catch (error) {
            console.error('Failed to update provider health:', error);
        }
    }

    // ============================================================================
    // UTILITY METHODS
    // ============================================================================

    extractRegionFromUrl(url) {
        try {
            const parsed = new URL(url);
            const hostname = parsed.hostname;
            const parts = hostname.split('.');
            return parts[0].split('-').pop() || 'Unknown';
        } catch (error) {
            return 'Unknown';
        }
    }

    async getProviderById(providerId) {
        try {
            const response = await api.get(`/system-secrets/providers/${providerId}`);
            return response.data.data;
        } catch (error) {
            console.error(`Failed to get provider ${providerId}:`, error);
            return null;
        }
    }

    getTestResultIcon(status) {
        switch (status) {
            case 'connected':
                return '✅';
            case 'connection_failed':
                return '❌';
            case 'api_error':
                return '⚠️';
            case 'validation_failed':
                return '🔍';
            case 'timeout':
                return '⏱️';
            default:
                return '❓';
        }
    }

    getTestResultColor(status) {
        switch (status) {
            case 'connected':
                return 'text-green-400';
            case 'connection_failed':
                return 'text-red-400';
            case 'api_error':
                return 'text-yellow-400';
            case 'validation_failed':
                return 'text-purple-400';
            case 'timeout':
                return 'text-orange-400';
            default:
                return 'text-gray-400';
        }
    }

    // ============================================================================
    // CLEANUP
    // ============================================================================

    cleanup() {
        // Stop all health monitors
        for (const [providerId, monitor] of this.healthMonitors) {
            clearInterval(monitor);
        }
        this.healthMonitors.clear();

        // Clear all test timeouts
        for (const [testId, timeout] of this.testTimeouts) {
            clearTimeout(timeout);
        }
        this.testTimeouts.clear();

        // Clear caches
        this.testCache.clear();
        
        console.log('🧹 Provider testing service cleaned up');
    }
}

// Export singleton instance
const providerTestingService = new ProviderTestingService();
export default providerTestingService; 