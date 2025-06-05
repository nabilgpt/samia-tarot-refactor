import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Phone, X, Loader, Zap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import { CallAPI } from '../api/callApi';
import { supabase } from '../lib/supabase';
import EmergencyAlertsService from '../services/emergencyAlertsService';

const EmergencyCallButton = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const { user, profile, isAuthenticated } = useAuth();
  const { language, showSuccess, showError } = useUI();
  const [showModal, setShowModal] = useState(false);
  const [isCreatingCall, setIsCreatingCall] = useState(false);
  const [error, setError] = useState(null);

  // Pages where emergency button should NOT appear
  const excludedPaths = ['/login', '/signup', '/signout', '/auth'];
  const shouldShowButton = !excludedPaths.includes(location.pathname);

  // Check if we should show emergency button based on user role
  // Show ONLY for:
  // - Users with "client" role
  // - Unauthenticated users (guests)
  // Do NOT show for: super_admin, admin, reader, monitor
  const shouldShowEmergencyButton = !isAuthenticated || (isAuthenticated && profile?.role === 'client');

  // Don't render if on excluded pages OR if user role shouldn't see button
  if (!shouldShowButton || !shouldShowEmergencyButton) {
    return null;
  }

  const handleEmergencyClick = async () => {
    setShowModal(true);
    setError(null);

    // Immediately send admin alert when emergency button is pressed
    if (isAuthenticated && user) {
      try {
        // Get user profile to determine role
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        const userRole = profile?.role || 'client';

        // Send emergency alert to admin
        const alertResult = await EmergencyAlertsService.sendEmergencyAlert(
          user.id,
          userRole,
          `Emergency button pressed by ${userRole}`
        );

        if (alertResult.success) {
          console.log('Admin alert sent successfully:', alertResult.data);
        } else {
          console.error('Failed to send admin alert:', alertResult.error);
        }
      } catch (error) {
        console.error('Error sending admin alert:', error);
      }
    }
  };

  const handleConfirmEmergency = async () => {
    try {
      setIsCreatingCall(true);
      setError(null);

      if (!isAuthenticated) {
        // For unauthenticated users, show a message to sign up/login first
        showError(
          language === 'ar' 
            ? 'يرجى تسجيل الدخول أولاً لاستخدام خدمة الطوارئ'
            : 'Please sign in first to use emergency service'
        );
        setShowModal(false);
        return;
      }

      // Create emergency call for authenticated users
      const result = await CallAPI.createEmergencyCall(user.id, 'voice');
      
      if (result.success) {
        setShowModal(false);
        showSuccess(
          language === 'ar'
            ? 'تم إنشاء مكالمة الطوارئ بنجاح'
            : 'Emergency call created successfully'
        );
      } else {
        setError(result.error || (language === 'ar' ? 'فشل في إنشاء مكالمة الطوارئ' : 'Failed to create emergency call'));
      }
    } catch (error) {
      console.error('Error creating emergency call:', error);
      setError(language === 'ar' ? 'فشل في إنشاء مكالمة الطوارئ' : 'Failed to create emergency call');
    } finally {
      setIsCreatingCall(false);
    }
  };

  const handleCancel = () => {
    setShowModal(false);
    setError(null);
  };

  return (
    <>
      {/* Floating Emergency Button */}
      <motion.div
        className={`fixed z-40 ${
          language === 'ar' ? 'left-4 md:left-6' : 'right-4 md:right-6'
        } top-20 md:top-24`}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ 
          type: "spring", 
          stiffness: 260, 
          damping: 20,
          delay: 1 
        }}
      >
        <motion.button
          onClick={handleEmergencyClick}
          className="group relative bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold px-4 py-3 md:px-6 md:py-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 backdrop-blur-sm border border-red-500/30"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          title={language === 'ar' ? 'مكالمة طوارئ' : 'Emergency Call'}
        >
          {/* Pulsing ring animation */}
          <div className="absolute inset-0 rounded-full bg-red-500/30 animate-ping group-hover:animate-none" />
          
          {/* Button content */}
          <div className="relative flex items-center space-x-2 rtl:space-x-reverse">
            <motion.div
              animate={{ 
                rotate: [0, 10, -10, 0],
                scale: [1, 1.1, 1]
              }}
              transition={{ 
                duration: 2, 
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              <AlertTriangle className="w-5 h-5 md:w-6 md:h-6" />
            </motion.div>
            <span className="text-sm md:text-base font-bold">
              {language === 'ar' ? 'طوارئ' : 'SOS'}
            </span>
          </div>

          {/* Cosmic sparkles effect */}
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            {[...Array(3)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1 h-1 bg-white rounded-full"
                style={{
                  left: `${20 + i * 30}%`,
                  top: `${20 + i * 20}%`,
                }}
                animate={{
                  scale: [0, 1, 0],
                  opacity: [0, 1, 0],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  delay: i * 0.3,
                }}
              />
            ))}
          </div>
        </motion.button>
      </motion.div>

      {/* Emergency Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <motion.div
              className="bg-dark-800/95 backdrop-blur-xl border border-gold-400/20 rounded-2xl p-6 max-w-md w-full shadow-2xl shadow-cosmic-500/10"
              initial={{ scale: 0.8, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3 rtl:space-x-reverse">
                  <div className="w-10 h-10 bg-gradient-to-r from-red-500 to-red-600 rounded-lg flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6 text-white" />
                  </div>
                  <h2 className="text-xl font-bold text-white">
                    {language === 'ar' ? 'مكالمة طوارئ' : 'Emergency Call'}
                  </h2>
                </div>
                <button
                  onClick={handleCancel}
                  disabled={isCreatingCall}
                  className="text-gray-400 hover:text-white transition-colors disabled:opacity-50"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Content */}
              <div className="mb-6">
                <p className="text-gray-300 mb-4">
                  {language === 'ar' 
                    ? 'أنت على وشك بدء مكالمة طوارئ. هذا سوف:'
                    : 'You are about to initiate an emergency call. This will:'
                  }
                </p>
                <ul className="list-disc list-inside space-y-2 text-sm text-gray-400">
                  <li>
                    {language === 'ar' 
                      ? 'يربطك فوراً مع قارئ متاح'
                      : 'Connect you immediately with an available reader'
                    }
                  </li>
                  <li>
                    {language === 'ar' 
                      ? 'يتجاوز الوضع الصامت للقارئ بصوت إنذار عالي'
                      : 'Override the reader\'s silent mode with a loud siren'
                    }
                  </li>
                  <li>
                    {language === 'ar' 
                      ? 'يسجل المكالمة تلقائياً للأمان'
                      : 'Automatically record the call for safety'
                    }
                  </li>
                  <li>
                    {language === 'ar' 
                      ? 'يصعد للمدير إذا لم يتم الرد خلال 5 دقائق'
                      : 'Escalate to admin if not answered within 5 minutes'
                    }
                  </li>
                  <li>
                    {language === 'ar' 
                      ? 'يعامل كأولوية قصوى'
                      : 'Be treated as highest priority'
                    }
                  </li>
                </ul>
                
                {error && (
                  <motion.div
                    className="mt-4 p-3 bg-red-900/50 border border-red-500/30 rounded-lg backdrop-blur-sm"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <p className="text-red-300 text-sm">{error}</p>
                  </motion.div>
                )}

                {!isAuthenticated && (
                  <motion.div
                    className="mt-4 p-3 bg-gold-900/50 border border-gold-500/30 rounded-lg backdrop-blur-sm"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <p className="text-gold-300 text-sm">
                      {language === 'ar' 
                        ? 'يرجى تسجيل الدخول أولاً لاستخدام خدمة الطوارئ'
                        : 'Please sign in first to use emergency service'
                      }
                    </p>
                  </motion.div>
                )}
              </div>

              {/* Actions */}
              <div className="flex space-x-3 rtl:space-x-reverse">
                <button
                  onClick={handleCancel}
                  disabled={isCreatingCall}
                  className="flex-1 px-4 py-3 bg-dark-700/50 border border-gray-600/30 text-gray-300 rounded-lg hover:bg-dark-600/50 hover:border-gray-500/30 transition-all duration-200 disabled:opacity-50"
                >
                  {language === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  onClick={handleConfirmEmergency}
                  disabled={isCreatingCall}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-lg transition-all duration-200 disabled:opacity-50 flex items-center justify-center space-x-2 rtl:space-x-reverse"
                >
                  {isCreatingCall ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      <span>{language === 'ar' ? 'جاري الاتصال...' : 'Connecting...'}</span>
                    </>
                  ) : (
                    <>
                      <Phone className="w-4 h-4" />
                      <span>{language === 'ar' ? 'بدء مكالمة الطوارئ' : 'Start Emergency Call'}</span>
                    </>
                  )}
                </button>
              </div>

              {/* Warning */}
              <motion.div
                className="mt-4 p-3 bg-yellow-900/30 border border-yellow-500/30 rounded-lg backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <p className="text-yellow-300 text-xs flex items-center space-x-2 rtl:space-x-reverse">
                  <Zap className="w-3 h-3" />
                  <span>
                    {language === 'ar' 
                      ? '⚠️ استخدم هذا فقط للطوارئ الحقيقية. سوء الاستخدام قد يؤدي إلى تعليق الحساب.'
                      : '⚠️ Only use this for genuine emergencies. Misuse may result in account suspension.'
                    }
                  </span>
                </p>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default EmergencyCallButton; 