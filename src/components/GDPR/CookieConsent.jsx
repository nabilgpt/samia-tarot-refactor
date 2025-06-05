import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useUI } from '../../context/UIContext';
import { 
  XMarkIcon, 
  CogIcon, 
  ShieldCheckIcon,
  GlobeAltIcon,
  ChartBarIcon,
  VideoCameraIcon
} from '@heroicons/react/24/outline';
import CosmicButton from '../UI/CosmicButton';
import CosmicCard from '../UI/CosmicCard';

const CookieConsent = () => {
  const { t } = useTranslation();
  const { language } = useUI();
  const [showBanner, setShowBanner] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [preferences, setPreferences] = useState({
    necessary: true, // Always true, cannot be disabled
    analytics: false,
    marketing: false,
    functional: false
  });

  // Check if user has already given consent
  useEffect(() => {
    const consent = localStorage.getItem('cookie_consent');
    const consentDate = localStorage.getItem('cookie_consent_date');
    
    // Show banner if no consent or consent is older than 6 months
    if (!consent || (consentDate && Date.now() - parseInt(consentDate) > 6 * 30 * 24 * 60 * 60 * 1000)) {
      setShowBanner(true);
    } else {
      // Load saved preferences
      const savedPrefs = JSON.parse(consent);
      setPreferences(savedPrefs);
    }
  }, []);

  const cookieCategories = [
    {
      id: 'necessary',
      titleAr: 'ملفات تعريف الارتباط الضرورية',
      titleEn: 'Necessary Cookies',
      descriptionAr: 'هذه الملفات ضرورية لتشغيل الموقع وتوفير الخدمات الأساسية ولا يمكن إلغاؤها',
      descriptionEn: 'These cookies are essential for the website to function and provide basic services and cannot be disabled',
      icon: ShieldCheckIcon,
      required: true,
      examples: ['الجلسة الآمنة', 'تسجيل الدخول', 'الأمان']
    },
    {
      id: 'functional',
      titleAr: 'ملفات تعريف الارتباط الوظيفية',
      titleEn: 'Functional Cookies',
      descriptionAr: 'تساعد في توفير ميزات محسنة مثل اللغة المفضلة والإعدادات الشخصية',
      descriptionEn: 'Help provide enhanced features like language preference and personal settings',
      icon: CogIcon,
      required: false,
      examples: ['اللغة المفضلة', 'السمة (فاتح/داكن)', 'الإعدادات المحفوظة']
    },
    {
      id: 'analytics',
      titleAr: 'ملفات تعريف الارتباط التحليلية',
      titleEn: 'Analytics Cookies',
      descriptionAr: 'تساعدنا في فهم كيفية استخدام الموقع لتحسين تجربة المستخدم',
      descriptionEn: 'Help us understand how the website is used to improve user experience',
      icon: ChartBarIcon,
      required: false,
      examples: ['Google Analytics', 'إحصائيات الاستخدام', 'تحليل الأداء']
    },
    {
      id: 'marketing',
      titleAr: 'ملفات تعريف الارتباط التسويقية',
      titleEn: 'Marketing Cookies',
      descriptionAr: 'تستخدم لتتبع الزوار عبر المواقع لعرض إعلانات مخصصة وذات صلة',
      descriptionEn: 'Used to track visitors across websites to display personalized and relevant ads',
      icon: GlobeAltIcon,
      required: false,
      examples: ['Facebook Pixel', 'Google Ads', 'إعلانات مخصصة']
    }
  ];

  const saveConsent = (prefs) => {
    localStorage.setItem('cookie_consent', JSON.stringify(prefs));
    localStorage.setItem('cookie_consent_date', Date.now().toString());
    
    // Initialize analytics and marketing based on consent
    if (prefs.analytics) {
      // Initialize Google Analytics
      if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('consent', 'update', {
          analytics_storage: 'granted'
        });
      }
    }
    
    if (prefs.marketing) {
      // Initialize marketing tools
      if (typeof window !== 'undefined' && window.fbq) {
        window.fbq('consent', 'grant');
      }
    }
    
    setShowBanner(false);
    setShowDetails(false);
  };

  const handleAcceptAll = () => {
    const allAccepted = {
      necessary: true,
      functional: true,
      analytics: true,
      marketing: true
    };
    setPreferences(allAccepted);
    saveConsent(allAccepted);
  };

  const handleAcceptNecessary = () => {
    const necessaryOnly = {
      necessary: true,
      functional: false,
      analytics: false,
      marketing: false
    };
    setPreferences(necessaryOnly);
    saveConsent(necessaryOnly);
  };

  const handleSavePreferences = () => {
    saveConsent(preferences);
  };

  const togglePreference = (category) => {
    if (category === 'necessary') return; // Cannot disable necessary cookies
    
    setPreferences(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  if (!showBanner) return null;

  return (
    <AnimatePresence>
      {showBanner && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end justify-center p-4 bg-black/50 backdrop-blur-sm"
        >
          {!showDetails ? (
            // Cookie Banner
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="w-full max-w-4xl"
            >
              <CosmicCard variant="glass" className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3 rtl:space-x-reverse">
                    <div className="p-2 rounded-lg bg-gold-500/20">
                      <ShieldCheckIcon className="w-6 h-6 text-gold-400" />
                    </div>
                    <h3 className="text-xl font-bold gradient-text">
                      {language === 'ar' ? 'ملفات تعريف الارتباط والخصوصية' : 'Cookies & Privacy'}
                    </h3>
                  </div>
                  <button
                    onClick={() => setShowBanner(false)}
                    className="p-1 text-gray-400 hover:text-gold-400 transition-colors"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>

                <p className="text-gray-300 mb-6 leading-relaxed">
                  {language === 'ar' 
                    ? 'نحن نستخدم ملفات تعريف الارتباط لتحسين تجربتك وتوفير خدمات مخصصة. يمكنك إدارة تفضيلاتك أو قبول جميع الملفات. لمزيد من المعلومات، اقرأ '
                    : 'We use cookies to enhance your experience and provide personalized services. You can manage your preferences or accept all cookies. For more information, read our '
                  }
                  <a 
                    href="https://docs.google.com/document/d/1o1qaqFrgv7R9gyu-peN6TbnQhvz9z27OHuHrP_yWYCc/edit?usp=sharing" 
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gold-400 hover:underline"
                  >
                    {language === 'ar' ? 'سياسة الخصوصية' : 'Privacy Policy'}
                  </a>
                  {language === 'ar' ? '.' : '.'}
                </p>

                <div className="flex flex-wrap gap-3">
                  <CosmicButton
                    variant="primary"
                    onClick={handleAcceptAll}
                    className="flex-1 min-w-0"
                  >
                    {language === 'ar' ? 'قبول جميع الملفات' : 'Accept All Cookies'}
                  </CosmicButton>
                  
                  <CosmicButton
                    variant="outline"
                    onClick={handleAcceptNecessary}
                    className="flex-1 min-w-0"
                  >
                    {language === 'ar' ? 'الضرورية فقط' : 'Necessary Only'}
                  </CosmicButton>
                  
                  <CosmicButton
                    variant="ghost"
                    onClick={() => setShowDetails(true)}
                    className="flex items-center space-x-2 rtl:space-x-reverse"
                  >
                    <CogIcon className="w-4 h-4" />
                    <span>{language === 'ar' ? 'إدارة التفضيلات' : 'Manage Preferences'}</span>
                  </CosmicButton>
                </div>
              </CosmicCard>
            </motion.div>
          ) : (
            // Detailed Preferences
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-4xl max-h-[80vh] overflow-y-auto"
            >
              <CosmicCard variant="glass" className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-bold gradient-text">
                    {language === 'ar' ? 'إعدادات ملفات تعريف الارتباط' : 'Cookie Settings'}
                  </h3>
                  <button
                    onClick={() => setShowDetails(false)}
                    className="p-2 text-gray-400 hover:text-gold-400 transition-colors"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-6">
                  {cookieCategories.map((category) => {
                    const Icon = category.icon;
                    return (
                      <div key={category.id} className="border border-gold-400/20 rounded-lg p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center space-x-3 rtl:space-x-reverse">
                            <div className="p-2 rounded-lg bg-cosmic-500/20">
                              <Icon className="w-5 h-5 text-cosmic-400" />
                            </div>
                            <div>
                              <h4 className="font-semibold text-white">
                                {language === 'ar' ? category.titleAr : category.titleEn}
                              </h4>
                              <p className="text-sm text-gray-400 mt-1">
                                {language === 'ar' ? category.descriptionAr : category.descriptionEn}
                              </p>
                            </div>
                          </div>
                          
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={preferences[category.id]}
                              onChange={() => togglePreference(category.id)}
                              disabled={category.required}
                              className="sr-only peer"
                            />
                            <div className={`
                              relative w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer 
                              peer-checked:after:translate-x-full peer-checked:after:border-white 
                              after:content-[''] after:absolute after:top-[2px] after:start-[2px] 
                              after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all
                              ${preferences[category.id] ? 'bg-gold-500' : ''}
                              ${category.required ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                            `} />
                          </label>
                        </div>
                        
                        <div className="text-xs text-gray-500">
                          <span>{language === 'ar' ? 'أمثلة: ' : 'Examples: '}</span>
                          {category.examples.join(', ')}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex flex-wrap gap-3 mt-6 pt-6 border-t border-gold-400/20">
                  <CosmicButton
                    variant="primary"
                    onClick={handleSavePreferences}
                    className="flex-1 min-w-0"
                  >
                    {language === 'ar' ? 'حفظ التفضيلات' : 'Save Preferences'}
                  </CosmicButton>
                  
                  <CosmicButton
                    variant="outline"
                    onClick={handleAcceptAll}
                    className="flex-1 min-w-0"
                  >
                    {language === 'ar' ? 'قبول الجميع' : 'Accept All'}
                  </CosmicButton>
                </div>

                <div className="mt-4 text-center">
                  <p className="text-xs text-gray-500">
                    {language === 'ar' 
                      ? 'يمكنك تغيير هذه الإعدادات في أي وقت من خلال إعدادات الحساب'
                      : 'You can change these settings anytime through your account settings'
                    }
                  </p>
                </div>
              </CosmicCard>
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CookieConsent; 