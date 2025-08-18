// =================================================
// SAMIA TAROT BILINGUAL SYSTEM CONFIG UTILITY
// Handles bilingual display names for system configurations
// =================================================

import { useLanguage } from '../context/LanguageContext';

/**
 * Get bilingual display name for system configuration
 * @param {Object} config - Configuration object
 * @param {string} currentLanguage - Current language ('ar' or 'en')
 * @returns {string} - Localized display name
 */
export const getConfigDisplayName = (config, currentLanguage = 'en') => {
  if (!config) return '';

  // Check for bilingual display names first
  if (currentLanguage === 'ar' && config.display_name_ar) {
    return config.display_name_ar;
  }
  if (currentLanguage === 'en' && config.display_name_en) {
    return config.display_name_en;
  }

  // Fallback to opposite language
  const fallbackName = currentLanguage === 'ar' ? config.display_name_en : config.display_name_ar;
  if (fallbackName) {
    return fallbackName;
  }

  // Fallback to config key with formatting
  return formatConfigKey(config.config_key || config.key || '');
};

/**
 * Get bilingual description for system configuration
 * @param {Object} config - Configuration object
 * @param {string} currentLanguage - Current language ('ar' or 'en')
 * @returns {string} - Localized description
 */
export const getConfigDescription = (config, currentLanguage = 'en') => {
  if (!config) return '';

  // Check for bilingual descriptions first
  if (currentLanguage === 'ar' && config.description_ar) {
    return config.description_ar;
  }
  if (currentLanguage === 'en' && config.description_en) {
    return config.description_en;
  }

  // Fallback to opposite language
  const fallbackDesc = currentLanguage === 'ar' ? config.description_en : config.description_ar;
  if (fallbackDesc) {
    return fallbackDesc;
  }

  // Fallback to regular description
  return config.description || '';
};

/**
 * Format config key to readable text
 * @param {string} configKey - Configuration key
 * @returns {string} - Formatted display name
 */
export const formatConfigKey = (configKey) => {
  if (!configKey) return '';
  
  return configKey
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

/**
 * Get category display name with bilingual support
 * @param {string} category - Category name
 * @param {string} currentLanguage - Current language
 * @returns {string} - Localized category name
 */
export const getCategoryDisplayName = (category, currentLanguage = 'en') => {
  const categoryMap = {
    'ai_services': {
      ar: 'خدمات الذكاء الاصطناعي',
      en: 'AI Services'
    },
    'database': {
      ar: 'قاعدة البيانات',
      en: 'Database'
    },
    'storage': {
      ar: 'التخزين',
      en: 'Storage'
    },
    'notifications': {
      ar: 'الإشعارات',
      en: 'Notifications'
    },
    'payment': {
      ar: 'الدفع',
      en: 'Payment'
    },
    'security': {
      ar: 'الأمان',
      en: 'Security'
    },
    'zodiac': {
      ar: 'الأبراج اليومية',
      en: 'Daily Zodiac'
    },
    'tts': {
      ar: 'تحويل النص إلى صوت',
      en: 'Text-to-Speech'
    },
    'openai': {
      ar: 'أوبن أيه آي',
      en: 'OpenAI'
    },
    'elevenlabs': {
      ar: 'إليفن لابز',
      en: 'ElevenLabs'
    },
    'auth': {
      ar: 'المصادقة',
      en: 'Authentication'
    },
    'general': {
      ar: 'عام',
      en: 'General'
    }
  };

  return categoryMap[category]?.[currentLanguage] || formatConfigKey(category);
};

/**
 * React hook for bilingual system configuration
 */
export const useBilingualSystemConfig = () => {
  const { currentLanguage } = useLanguage();

  const getDisplayName = (config) => getConfigDisplayName(config, currentLanguage);
  const getDescription = (config) => getConfigDescription(config, currentLanguage);
  const getCategoryName = (category) => getCategoryDisplayName(category, currentLanguage);

  return {
    getDisplayName,
    getDescription,
    getCategoryName,
    currentLanguage
  };
};

/**
 * Transform configuration array to include bilingual fields
 * @param {Array} configs - Array of configuration objects
 * @param {string} currentLanguage - Current language
 * @returns {Array} - Transformed configurations with bilingual support
 */
export const transformConfigsForDisplay = (configs, currentLanguage = 'en') => {
  if (!Array.isArray(configs)) return [];

  return configs.map(config => ({
    ...config,
    displayName: getConfigDisplayName(config, currentLanguage),
    displayDescription: getConfigDescription(config, currentLanguage),
    categoryDisplayName: getCategoryDisplayName(config.category, currentLanguage)
  }));
};

/**
 * Group configurations by category with bilingual support
 * @param {Array} configs - Array of configuration objects
 * @param {string} currentLanguage - Current language
 * @returns {Object} - Grouped configurations by category
 */
export const groupConfigsByCategory = (configs, currentLanguage = 'en') => {
  if (!Array.isArray(configs)) return {};

  return configs.reduce((groups, config) => {
    const categoryKey = config.category || 'general';
    const categoryDisplayName = getCategoryDisplayName(categoryKey, currentLanguage);
    
    if (!groups[categoryKey]) {
      groups[categoryKey] = {
        key: categoryKey,
        name: categoryDisplayName,
        configs: []
      };
    }
    
    groups[categoryKey].configs.push({
      ...config,
      displayName: getConfigDisplayName(config, currentLanguage),
      displayDescription: getConfigDescription(config, currentLanguage)
    });
    
    return groups;
  }, {});
};

/**
 * Default system configuration mappings for common keys
 */
export const DEFAULT_CONFIG_MAPPINGS = {
  'openai_api_key': {
    display_name_ar: 'مفتاح OpenAI API',
    display_name_en: 'OpenAI API Key',
    description_ar: 'مفتاح API للوصول إلى خدمات OpenAI',
    description_en: 'API key for accessing OpenAI services'
  },
  'elevenlabs_api_key': {
    display_name_ar: 'مفتاح ElevenLabs API',
    display_name_en: 'ElevenLabs API Key',
    description_ar: 'مفتاح API لخدمات تحويل النص إلى صوت',
    description_en: 'API key for text-to-speech services'
  },
  'stripe_secret_key': {
    display_name_ar: 'مفتاح Stripe السري',
    display_name_en: 'Stripe Secret Key',
    description_ar: 'مفتاح سري لمعالجة المدفوعات عبر Stripe',
    description_en: 'Secret key for processing payments via Stripe'
  },
  'database_url': {
    display_name_ar: 'رابط قاعدة البيانات',
    display_name_en: 'Database URL',
    description_ar: 'رابط الاتصال بقاعدة البيانات',
    description_en: 'Database connection URL'
  },
  'jwt_secret': {
    display_name_ar: 'مفتاح JWT السري',
    display_name_en: 'JWT Secret',
    description_ar: 'مفتاح سري لتوقيع رموز JWT',
    description_en: 'Secret key for signing JWT tokens'
  }
};

export default {
  getConfigDisplayName,
  getConfigDescription,
  formatConfigKey,
  getCategoryDisplayName,
  useBilingualSystemConfig,
  transformConfigsForDisplay,
  groupConfigsByCategory,
  DEFAULT_CONFIG_MAPPINGS
}; 