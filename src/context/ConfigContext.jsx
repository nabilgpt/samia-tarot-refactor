import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

const ConfigContext = createContext();

export const useConfig = () => {
  const context = useContext(ConfigContext);
  if (!context) {
    throw new Error('useConfig must be used within a ConfigProvider');
  }
  return context;
};

export const ConfigProvider = ({ children }) => {
  const { user, profile } = useAuth();
  const [config, setConfig] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load configuration from database
  const loadConfig = async () => {
    try {
      setLoading(true);
      setError(null);

      // Use API endpoint for configuration instead of direct database access
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      if (!token) {
        console.log('🔧 Development Mode: Using fallback configuration (no auth token)');
        // Don't throw error, just use fallback configuration
        setConfig({
          ai_default_provider: 'openai',
          ai_default_model: 'gpt-4',
          database_type: 'supabase',
          storage_provider: 'supabase',
          notifications_enabled: true,
          app_name: 'Samia Tarot',
          app_version: '1.0.0',
          maintenance_mode: false
        });
        setLoading(false);
        return;
      }

      // Try to fetch from the backend API
      const response = await fetch('http://localhost:5001/api/config', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Config API error: ${response.status} ${response.statusText}`, errorText);
        
        // If we get HTML instead of JSON, it means the API endpoint doesn't exist
        if (errorText.includes('<!doctype') || errorText.includes('<html')) {
          throw new Error('Config API endpoint not available - backend server may not be running');
        }
        
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const responseData = await response.json();
      const configData = responseData.data || [];

      // Transform array to object for easy access
      const configObject = {};
      configData.forEach(item => {
        try {
          // Parse JSON values
          configObject[item.key] = typeof item.value === 'string' 
            ? JSON.parse(item.value) 
            : item.value;
        } catch (e) {
          // If JSON parsing fails, use raw value
          configObject[item.key] = item.value;
        }
      });

      setConfig(configObject);
    } catch (error) {
      console.error('Error loading configuration:', error);
      setError(error.message);
      
      // Fallback to default configuration
      setConfig({
        ai_default_provider: 'openai',
        ai_default_model: 'gpt-4',
        database_type: 'supabase',
        storage_provider: 'supabase',
        notifications_enabled: true,
        app_name: 'Samia Tarot',
        app_version: '1.0.0',
        maintenance_mode: false
      });
    } finally {
      setLoading(false);
    }
  };

  // Update configuration value
  const updateConfig = async (key, value, section = 'general') => {
    try {
      // Only admins can update config
      if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
        throw new Error('Unauthorized: Admin access required');
      }

      const response = await fetch('http://localhost:5001/api/config', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          key,
          value,
          section,
          updated_by: user.id
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      // Update local state
      setConfig(prev => ({
        ...prev,
        [key]: value
      }));

      return { success: true };
    } catch (error) {
      console.error('Error updating configuration:', error);
      return { success: false, error: error.message };
    }
  };

  // Get configuration by section
  const getConfigBySection = (section) => {
    return Object.entries(config)
      .filter(([key]) => {
        // Map keys to sections based on prefix
        if (key.startsWith('ai_')) return section === 'ai';
        if (key.startsWith('supabase_') || key.startsWith('database_')) return section === 'database';
        if (key.startsWith('storage_') || key.startsWith('b2_')) return section === 'storage';
        if (key.startsWith('notifications_') || key.startsWith('email_') || key.startsWith('push_')) return section === 'notifications';
        return section === 'general';
      })
      .reduce((acc, [key, value]) => {
        acc[key] = value;
        return acc;
      }, {});
  };

  // Get AI configuration
  const getAIConfig = () => {
    return {
      providers: config.ai_providers || [],
      defaultProvider: config.ai_default_provider || 'openai',
      defaultModel: config.ai_default_model || 'gpt-4',
      openaiApiKey: config.openai_api_key || '',
      geminiApiKey: config.gemini_api_key || ''
    };
  };

  // Get database configuration
  const getDatabaseConfig = () => {
    return {
      type: config.database_type || 'supabase',
      supabaseUrl: config.supabase_url || '',
      supabaseAnonKey: config.supabase_anon_key || '',
      supabaseServiceKey: config.supabase_service_key || '',
      storageBucket: config.supabase_storage_bucket || 'samia-tarot-uploads'
    };
  };

  // Get storage configuration
  const getStorageConfig = () => {
    return {
      provider: config.storage_provider || 'supabase',
      b2BucketName: config.b2_bucket_name || '',
      b2EndpointUrl: config.b2_endpoint_url || '',
      b2AccessKeyId: config.b2_access_key_id || '',
      b2SecretAccessKey: config.b2_secret_access_key || ''
    };
  };

  // Get notification configuration
  const getNotificationConfig = () => {
    return {
      enabled: config.notifications_enabled || true,
      emailProvider: config.email_provider || 'sendgrid',
      pushEnabled: config.push_notifications_enabled || true,
      sendgridApiKey: config.sendgrid_api_key || '',
      twilioAccountSid: config.twilio_account_sid || '',
      twilioAuthToken: config.twilio_auth_token || ''
    };
  };

  // Reload configuration
  const reloadConfig = () => {
    loadConfig();
  };

  // Load config on mount and when user changes
  useEffect(() => {
    loadConfig();
  }, [user]);

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
    getNotificationConfig
  };

  return (
    <ConfigContext.Provider value={value}>
      {children}
    </ConfigContext.Provider>
  );
};

export default ConfigContext; 