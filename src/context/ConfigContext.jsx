import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import configurationService from '../services/configurationService';

const ConfigContext = createContext();

export const useConfig = () => {
  const context = useContext(ConfigContext);
  if (!context) {
    throw new Error('useConfig must be used within a ConfigProvider');
  }
  return context;
};

export const ConfigProvider = ({ children }) => {
  const { user, profile, loading: authLoading, initialized, isAuthenticated } = useAuth();
  const [config, setConfig] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load configuration from database
  const loadConfig = async () => {
    try {
      setLoading(true);
      setError(null);
      // Production: Use proper logging service instead of console
      // console.log('🔄 ConfigContext: Loading configuration...');

      // Load all categories and their configurations using configurationService
      const categories = await configurationService.getCategories();
      
      const configMap = {};
      
      // Load configurations for each category
      for (const category of categories) {
        try {
          const categoryConfig = await configurationService.getConfigurationsByCategory(category.category_key);
          configMap[category.category_key] = categoryConfig;
        } catch (error) {
          // Production: Log to proper logging service
          // console.warn(`Failed to load configurations for category ${category.category_key}:`, error);
        }
      }

      setConfig(configMap);
      // console.log('✅ ConfigContext: Configuration loaded successfully');
    } catch (error) {
      // console.error('❌ ConfigContext: Error loading configuration:', error);
      setError(error.message);
      setConfig({});
    } finally {
      setLoading(false);
    }
  };

  // Update configuration
  const updateConfig = async (updates) => {
    try {
      setLoading(true);
      
      // Update configurations in database
      for (const [key, value] of Object.entries(updates)) {
        await configurationService.updateConfiguration(key, value);
      }
      
      // Update local state
      setConfig(prev => ({ ...prev, ...updates }));
      
      return { success: true };
    } catch (error) {
      // console.error('Error updating configuration:', error);
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  // Get configuration by section
  const getConfigBySection = (section) => {
    const sectionConfigs = {};
    Object.keys(config).forEach(key => {
      if (key.startsWith(`${section}_`)) {
        sectionConfigs[key] = config[key];
      }
    });
    return sectionConfigs;
  };

  // Get AI configuration
  const getAIConfig = () => {
    return {
      openaiApiKey: config.OPENAI_API_KEY || '',
      anthropicApiKey: config.ANTHROPIC_API_KEY || '',
      geminiApiKey: config.GEMINI_API_KEY || '',
      defaultProvider: config.ai_default_provider || 'openai',
      maxTokens: parseInt(config.ai_max_tokens) || 2000,
      temperature: parseFloat(config.ai_temperature) || 0.7
    };
  };

  // Get database configuration
  const getDatabaseConfig = () => {
    return {
      type: config.database_type || 'supabase',
      supabaseUrl: config.SUPABASE_URL || '',
      supabaseAnonKey: config.SUPABASE_ANON_KEY || '',
      supabaseServiceKey: config.SUPABASE_SERVICE_ROLE_KEY || '',
      storageBucket: config.supabase_storage_bucket || 'samia-tarot-uploads'
    };
  };

  // Get storage configuration
  const getStorageConfig = () => {
    return {
      provider: config.storage_provider || 'supabase',
      b2BucketName: config.BACKBLAZE_BUCKET_NAME || '',
      b2EndpointUrl: config.b2_endpoint_url || '',
      b2AccessKeyId: config.BACKBLAZE_KEY_ID || '',
      b2SecretAccessKey: config.BACKBLAZE_APP_KEY || ''
    };
  };

  // Get notification configuration
  const getNotificationConfig = () => {
    return {
      enabled: config.notifications_enabled || true,
      emailProvider: config.email_provider || 'sendgrid',
      pushEnabled: config.push_notifications_enabled || true,
      sendgridApiKey: config.SENDGRID_API_KEY || '',
      twilioAccountSid: config.TWILIO_ACCOUNT_SID || '',
      twilioAuthToken: config.TWILIO_AUTH_TOKEN || ''
    };
  };

  // Get payment configuration
  const getPaymentConfig = () => {
    return {
      stripeSecretKey: config.STRIPE_SECRET_KEY || '',
      stripePublishableKey: config.STRIPE_PUBLISHABLE_KEY || '',
      squareAccessToken: config.SQUARE_ACCESS_TOKEN || '',
      squareApplicationId: config.SQUARE_APPLICATION_ID || ''
    };
  };

  // Reload configuration
  const reloadConfig = () => {
    // Only reload if user is authenticated
    if (isAuthenticated && user && profile) {
      loadConfig();
    }
  };

  // 🔄 CRITICAL FIX: Load config only when authentication is complete
  useEffect(() => {
    // 🚨 IMPORTANT: Only load config if user is authenticated and profile is loaded
    if (!initialized || authLoading || !isAuthenticated || !user || !profile) {
      // Production: Use proper logging service instead of console
      // console.log('🔄 ConfigContext: Waiting for authentication before loading config...', {
      //   initialized,
      //   authLoading,
      //   isAuthenticated,
      //   hasUser: !!user,
      //   hasProfile: !!profile
      // });
      return;
    }

    // Production: Use proper logging service instead of console
    // console.log('✅ ConfigContext: Authentication complete, loading configuration...');
    loadConfig();
  }, [initialized, authLoading, isAuthenticated, user?.id, profile?.id]); // Only depend on stable IDs

  // Add periodic refresh but much less frequent
  useEffect(() => {
    if (!isAuthenticated || !user || !profile) return;
    
    // Refresh config every 5 minutes instead of constantly
    const refreshInterval = setInterval(() => {
      // Production: Use proper logging service instead of console
      // console.log('🔄 ConfigContext: Periodic refresh...');
      loadConfig();
    }, 300000); // 5 minutes
    
    return () => clearInterval(refreshInterval);
  }, [isAuthenticated, user?.id, profile?.id]);

  const value = {
    config,
    loading,
    error,
    updateConfig,
    reloadConfig,
    getConfigBySection,
    getAIConfig,
    getDatabaseConfig,
    getStorageConfig,
    getNotificationConfig,
    getPaymentConfig
  };

  return (
    <ConfigContext.Provider value={value}>
      {children}
    </ConfigContext.Provider>
  );
};

export default ConfigContext; 