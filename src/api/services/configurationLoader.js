// ============================================================================
// 🔒 DYNAMIC CONFIGURATION LOADER SERVICE
// ============================================================================
// This service loads all non-bootstrap configurations from the database
// NEVER loads sensitive settings from .env in production
// ============================================================================

import { supabase } from '../lib/supabase.js';

class ConfigurationLoader {
    constructor() {
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
        this.lastCacheUpdate = 0;
        this.isLoading = false;
    }

    /**
     * Get configuration value by key
     * Loads from database, not .env (except bootstrap credentials)
     */
    async getConfig(configKey) {
        try {
            // Check cache first
            if (this.isCacheValid() && this.cache.has(configKey)) {
                return this.cache.get(configKey);
            }

            // Load from database using system function (no user auth required)
            const { data, error } = await supabase
                .rpc('get_system_config_value', { config_key: configKey });

            if (error) {
                console.warn(`⚠️ Failed to load config '${configKey}' from database:`, error.message);
                return null;
            }

            // Cache the result
            this.cache.set(configKey, data);
            return data;

        } catch (error) {
            console.error(`❌ Error loading config '${configKey}':`, error.message);
            return null;
        }
    }

    /**
     * Get multiple configuration values by category
     */
    async getConfigsByCategory(category) {
        try {
            const { data, error } = await supabase
                .from('system_configurations')
                .select('config_key, config_value_encrypted, config_value_plain, is_encrypted')
                .eq('config_category', category)
                .eq('is_active', true);

            if (error) throw error;

            const configs = {};
            for (const config of data || []) {
                let configValue;
                
                // Get the appropriate value based on encryption status
                if (config.is_encrypted && config.config_value_encrypted) {
                    // Decrypt if necessary using database function
                    const { data: decryptedValue } = await supabase
                        .rpc('decrypt_config_value', { encrypted_value: config.config_value_encrypted });
                    configValue = decryptedValue;
                } else {
                    // Use plain value
                    configValue = config.config_value_plain;
                }
                
                configs[config.config_key] = configValue;
            }

            return configs;

        } catch (error) {
            console.error(`❌ Error loading configs for category '${category}':`, error.message);
            return {};
        }
    }

    /**
     * Load all configurations and populate cache
     */
    async loadAllConfigurations() {
        if (this.isLoading) {
            console.log('🔄 Configuration loading already in progress...');
            return;
        }

        this.isLoading = true;
        console.log('🔄 Loading all configurations from database...');

        try {
            const { data, error } = await supabase
                .from('system_configurations')
                .select('config_key, config_value_encrypted, config_value_plain, is_encrypted, config_category, config_subcategory')
                .eq('is_active', true);

            if (error) throw error;

            console.log('🔍 [DEBUG] Raw configuration data from database:');
            console.log('🔍 [DEBUG] Total records found:', data?.length || 0);
            
            // Log zodiac-specific configs
            const zodiacConfigs = data?.filter(c => c.config_key?.includes('ZODIAC')) || [];
            console.log('🔍 [DEBUG] Zodiac configs found:', zodiacConfigs.length);
            zodiacConfigs.forEach(config => {
                console.log(`🔍 [DEBUG] Zodiac config: ${config.config_key}`);
                console.log(`   Category: ${config.config_category}`);
                console.log(`   Subcategory: ${config.config_subcategory}`);
                console.log(`   Is Encrypted: ${config.is_encrypted}`);
                console.log(`   Has Encrypted Value: ${!!config.config_value_encrypted}`);
                console.log(`   Has Plain Value: ${!!config.config_value_plain}`);
            });

            let loaded = 0;
            for (const config of data || []) {
                try {
                    let value;
                    
                    // Get the appropriate value based on encryption status
                    if (config.is_encrypted && config.config_value_encrypted) {
                        // Decrypt if necessary
                        const { data: decryptedValue } = await supabase
                            .rpc('decrypt_config_value', { encrypted_value: config.config_value_encrypted });
                        value = decryptedValue;
                        
                        // Debug zodiac keys specifically
                        if (config.config_key?.includes('ZODIAC')) {
                            console.log(`🔍 [DEBUG] Decrypted ${config.config_key}: ${value ? 'HAS_VALUE' : 'NULL_OR_EMPTY'}`);
                        }
                    } else {
                        // Use plain value
                        value = config.config_value_plain;
                        
                        // Debug zodiac keys specifically
                        if (config.config_key?.includes('ZODIAC')) {
                            console.log(`🔍 [DEBUG] Plain value ${config.config_key}: ${value ? 'HAS_VALUE' : 'NULL_OR_EMPTY'}`);
                        }
                    }

                    this.cache.set(config.config_key, value);
                    loaded++;
                } catch (decryptError) {
                    console.warn(`⚠️ Failed to decrypt config '${config.config_key}':`, decryptError.message);
                }
            }

            this.lastCacheUpdate = Date.now();
            console.log(`✅ Loaded ${loaded} configurations from database`);
            
            // Debug: Show all cached keys that include ZODIAC
            const zodiacCacheKeys = Array.from(this.cache.keys()).filter(key => key.includes('ZODIAC'));
            console.log('🔍 [DEBUG] Zodiac keys in cache after loading:', zodiacCacheKeys);

        } catch (error) {
            console.error('❌ Failed to load configurations:', error.message);
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * Get Stripe configuration from database
     */
    async getStripeConfig() {
        const stripeConfig = await this.getConfigsByCategory('payments');
        return {
            secretKey: stripeConfig.stripe_secret_key,
            publishableKey: stripeConfig.stripe_publishable_key,
            webhookSecret: stripeConfig.stripe_webhook_secret
        };
    }

    /**
     * Get OpenAI configuration from database
     */
    async getOpenAIConfig() {
        const aiConfig = await this.getConfigsByCategory('ai_services');
        return {
            apiKey: aiConfig.openai_api_key,
            orgId: aiConfig.openai_org_id
        };
    }

    /**
     * Get Twilio configuration from database
     */
    async getTwilioConfig() {
        const commConfig = await this.getConfigsByCategory('communication');
        return {
            accountSid: commConfig.twilio_account_sid,
            authToken: commConfig.twilio_auth_token,
            phoneNumber: commConfig.twilio_phone_number
        };
    }

    /**
     * Get SMTP configuration from database
     */
    async getSMTPConfig() {
        const commConfig = await this.getConfigsByCategory('communication');
        return {
            host: commConfig.smtp_host,
            user: commConfig.smtp_user,
            pass: commConfig.smtp_pass
        };
    }

    /**
     * Get Agora configuration from database
     */
    async getAgoraConfig() {
        const commConfig = await this.getConfigsByCategory('communication');
        return {
            appId: commConfig.agora_app_id,
            appCertificate: commConfig.agora_app_certificate
        };
    }

    /**
     * Check if cache is still valid
     */
    isCacheValid() {
        return (Date.now() - this.lastCacheUpdate) < this.cacheTimeout;
    }

    /**
     * Clear cache and force reload
     */
    clearCache() {
        this.cache.clear();
        this.lastCacheUpdate = 0;
        console.log('🗑️ Configuration cache cleared');
    }

    /**
     * Get cache statistics
     */
    getCacheStats() {
        return {
            size: this.cache.size,
            lastUpdate: new Date(this.lastCacheUpdate).toISOString(),
            isValid: this.isCacheValid(),
            isLoading: this.isLoading
        };
    }

    /**
     * SECURITY: Ensure no .env variables are used for dynamic configs
     */
    validateNoEnvUsage(configKey) {
        const forbiddenEnvVars = [
            'STRIPE_SECRET_KEY',
            'OPENAI_API_KEY',
            'TWILIO_AUTH_TOKEN',
            'SMTP_PASS',
            'AGORA_APP_CERTIFICATE'
        ];

        if (forbiddenEnvVars.includes(configKey.toUpperCase())) {
            console.warn(`🚨 SECURITY WARNING: Attempted to use .env for '${configKey}' - this should be in database!`);
            return false;
        }
        return true;
    }
}

// Export singleton instance
const configurationLoader = new ConfigurationLoader();

export const getConfig = (key) => configurationLoader.getConfig(key);
export const getConfigsByCategory = (category) => configurationLoader.getConfigsByCategory(category);
export const loadAllConfigurations = () => configurationLoader.loadAllConfigurations();
export const getStripeConfig = () => configurationLoader.getStripeConfig();
export const getOpenAIConfig = () => configurationLoader.getOpenAIConfig();
export const getTwilioConfig = () => configurationLoader.getTwilioConfig();
export const getSMTPConfig = () => configurationLoader.getSMTPConfig();
export const getAgoraConfig = () => configurationLoader.getAgoraConfig();
export const clearCache = () => configurationLoader.clearCache();
export const getCacheStats = () => configurationLoader.getCacheStats();
export { ConfigurationLoader }; 