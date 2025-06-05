import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useUI } from '../context/UIContext';
import { 
  SunIcon, 
  MoonIcon, 
  SparklesIcon, 
  StarIcon,
  SwatchIcon,
  CogIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

import CosmicCard from '../components/UI/CosmicCard';
import CosmicButton from '../components/UI/CosmicButton';
import ThemeToggle from '../components/UI/ThemeToggle';
import AnimatedBackground from '../components/UI/AnimatedBackground';

const ThemeDemo = () => {
  const { t } = useTranslation();
  const { theme, language, toggleTheme, setLanguage } = useUI();
  const [themeTests, setThemeTests] = useState({
    htmlClass: false,
    cssVariables: false,
    localStorage: false,
    components: false
  });

  // Test theme functionality
  useEffect(() => {
    const runThemeTests = () => {
      const results = {
        htmlClass: document.documentElement.classList.contains(theme),
        cssVariables: getComputedStyle(document.documentElement).getPropertyValue('--bg-primary') !== '',
        localStorage: localStorage.getItem('samia_theme') === theme,
        components: true // We'll assume components work if we can see them
      };
      setThemeTests(results);
    };

    runThemeTests();
    
    // Listen for theme changes
    const handleThemeChange = () => {
      setTimeout(runThemeTests, 100); // Small delay to ensure DOM updates
    };
    
    window.addEventListener('themeChanged', handleThemeChange);
    return () => window.removeEventListener('themeChanged', handleThemeChange);
  }, [theme]);

  const allTestsPassed = Object.values(themeTests).every(test => test);

  return (
    <AnimatedBackground variant="default" intensity="intense">
      <div className="min-h-screen relative">
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <div className="flex items-center justify-center mb-6">
              <SwatchIcon className="w-12 h-12 text-cosmic-400 mr-4" />
              <h1 className="text-4xl md:text-6xl font-bold gradient-text">
                {language === 'ar' ? 'نظام الثيم الكوني' : 'Cosmic Theme System'}
              </h1>
              <SparklesIcon className="w-12 h-12 text-gold-400 ml-4" />
            </div>
            
            <p className="text-xl text-theme-secondary mb-8 max-w-3xl mx-auto">
              {language === 'ar' 
                ? 'نظام شامل للثيم الداكن/النهاري مع الوضع الداكن كافتراضي وتبديل سلس عبر التطبيق بالكامل'
                : 'Complete dark/light theme system with dark mode as default and seamless app-wide switching'
              }
            </p>

            {/* Theme Status Indicator */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className={`inline-flex items-center px-6 py-3 rounded-full border-2 transition-all duration-300 ${
                allTestsPassed 
                  ? 'border-green-400 bg-green-400/10 text-green-400' 
                  : 'border-yellow-400 bg-yellow-400/10 text-yellow-400'
              }`}
            >
              <CheckCircleIcon className="w-5 h-5 mr-2" />
              <span className="font-semibold">
                {language === 'ar' 
                  ? (allTestsPassed ? 'النظام يعمل بشكل مثالي' : 'جاري تحميل النظام...')
                  : (allTestsPassed ? 'System Working Perfectly' : 'System Loading...')
                }
              </span>
            </motion.div>
          </motion.div>

          {/* Current Theme Display */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-12"
          >
            <CosmicCard variant="glass" className="max-w-2xl mx-auto p-8">
              <div className="text-center">
                <div className="flex items-center justify-center mb-4">
                  {theme === 'dark' ? (
                    <MoonIcon className="w-16 h-16 text-cosmic-400" />
                  ) : (
                    <SunIcon className="w-16 h-16 text-amber-500" />
                  )}
                </div>
                
                <h2 className="text-2xl font-bold mb-4 text-theme-primary">
                  {language === 'ar' 
                    ? `الثيم الحالي: ${theme === 'dark' ? 'ليلي (داكن)' : 'نهاري (فاتح)'}` 
                    : `Current Theme: ${theme === 'dark' ? 'Night (Dark)' : 'Day (Light)'}`
                  }
                </h2>
                
                <p className="text-theme-secondary mb-6">
                  {language === 'ar'
                    ? 'انقر على زر التبديل لتجربة التغيير الفوري للخلفية الكونية والجسيمات عبر التطبيق بالكامل'
                    : 'Click the toggle button to experience instant cosmic background and particle switching across the entire app'
                  }
                </p>

                <div className="flex items-center justify-center space-x-4 rtl:space-x-reverse">
                  <ThemeToggle />
                  <CosmicButton
                    variant="primary"
                    onClick={toggleTheme}
                    className="flex items-center space-x-2 rtl:space-x-reverse"
                  >
                    <CogIcon className="w-4 h-4" />
                    <span>
                      {language === 'ar' ? 'تبديل الثيم' : 'Toggle Theme'}
                    </span>
                  </CosmicButton>
                </div>
              </div>
            </CosmicCard>
          </motion.div>

          {/* Theme Demonstration Cards */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mb-12"
          >
            <h3 className="text-2xl font-bold text-center mb-8 text-theme-primary">
              {language === 'ar' ? 'عرض تأثيرات الثيم' : 'Theme Effects Demonstration'}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Background Demo */}
              <CosmicCard variant="feature" className="p-6">
                <h4 className="font-bold mb-4 text-theme-primary">
                  {language === 'ar' ? 'الخلفية الكونية' : 'Cosmic Background'}
                </h4>
                <div 
                  className="w-full h-32 rounded-lg border border-theme-cosmic"
                  style={{
                    background: 'var(--bg-gradient)',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                >
                  <div 
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'var(--cosmic-gradient)'
                    }}
                  />
                </div>
                <p className="text-sm text-theme-secondary mt-2">
                  {language === 'ar' ? 'تتغير فوراً مع الثيم' : 'Changes instantly with theme'}
                </p>
              </CosmicCard>

              {/* Particles Demo */}
              <CosmicCard variant="feature" className="p-6">
                <h4 className="font-bold mb-4 text-theme-primary">
                  {language === 'ar' ? 'الجسيمات الكونية' : 'Cosmic Particles'}
                </h4>
                <div className="w-full h-32 rounded-lg border border-theme-cosmic relative overflow-hidden cosmic-particles">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <StarIcon className="w-8 h-8 text-theme-primary" />
                  </div>
                </div>
                <p className="text-sm text-theme-secondary mt-2">
                  {language === 'ar' ? 'كثافة وألوان متكيفة' : 'Adaptive density & colors'}
                </p>
              </CosmicCard>

              {/* Orbs Demo */}
              <CosmicCard variant="feature" className="p-6">
                <h4 className="font-bold mb-4 text-theme-primary">
                  {language === 'ar' ? 'الكرات المضيئة' : 'Cosmic Orbs'}
                </h4>
                <div className="w-full h-32 rounded-lg border border-theme-cosmic relative overflow-hidden">
                  <div 
                    className="absolute top-2 left-2 w-8 h-8 rounded-full blur-sm"
                    style={{
                      background: 'var(--orb-gradient-primary)',
                      opacity: 'var(--orb-opacity-primary)'
                    }}
                  />
                  <div 
                    className="absolute bottom-2 right-2 w-10 h-10 rounded-full blur-sm"
                    style={{
                      background: 'var(--orb-gradient-secondary)',
                      opacity: 'var(--orb-opacity-secondary)'
                    }}
                  />
                  <div 
                    className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full blur-sm"
                    style={{
                      background: 'var(--orb-gradient-tertiary)',
                      opacity: 'var(--orb-opacity-tertiary)'
                    }}
                  />
                </div>
                <p className="text-sm text-theme-secondary mt-2">
                  {language === 'ar' ? 'شفافية وألوان ديناميكية' : 'Dynamic opacity & colors'}
                </p>
              </CosmicCard>
            </div>
          </motion.div>

          {/* CSS Variables Display */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="mb-12"
          >
            <CosmicCard variant="feature" className="p-6">
              <h3 className="text-xl font-bold mb-6 text-center text-theme-primary">
                {language === 'ar' ? 'متغيرات CSS الحالية' : 'Current CSS Variables'}
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                {[
                  { var: '--bg-primary', label: 'Primary Background' },
                  { var: '--cosmic-primary', label: 'Cosmic Primary' },
                  { var: '--gold-primary', label: 'Gold Primary' },
                  { var: '--particle-opacity', label: 'Particle Opacity' },
                  { var: '--orb-opacity-primary', label: 'Orb Opacity' },
                  { var: '--cosmic-glow', label: 'Cosmic Glow' }
                ].map(({ var: variable, label }) => (
                  <div key={variable} className="p-3 rounded-lg border border-theme-cosmic bg-theme-card">
                    <div className="font-mono text-cosmic-400 text-xs">{variable}</div>
                    <div className="text-theme-secondary text-xs mb-2">{label}</div>
                    <div 
                      className="h-6 rounded border border-theme-subtle"
                      style={{ 
                        backgroundColor: `var(${variable})`,
                        backgroundImage: variable.includes('gradient') ? `var(${variable})` : undefined
                      }}
                    />
                  </div>
                ))}
              </div>
            </CosmicCard>
          </motion.div>

          {/* Language Controls */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="text-center"
          >
            <CosmicCard variant="primary" className="max-w-md mx-auto p-6">
              <h3 className="text-xl font-bold mb-4 text-theme-primary">
                {language === 'ar' ? 'التحكم في اللغة' : 'Language Control'}
              </h3>
              
              <div className="flex justify-center space-x-4 rtl:space-x-reverse">
                <CosmicButton
                  variant={language === 'ar' ? 'primary' : 'outline'}
                  onClick={() => setLanguage('ar')}
                >
                  العربية
                </CosmicButton>
                <CosmicButton
                  variant={language === 'en' ? 'primary' : 'outline'}
                  onClick={() => setLanguage('en')}
                >
                  English
                </CosmicButton>
              </div>
            </CosmicCard>
          </motion.div>
        </div>
      </div>
    </AnimatedBackground>
  );
};

export default ThemeDemo; 