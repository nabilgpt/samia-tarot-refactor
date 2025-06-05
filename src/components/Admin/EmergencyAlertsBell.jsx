import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useUI } from '../../context/UIContext';
import EmergencyAlertsService from '../../services/emergencyAlertsService';

const EmergencyAlertsBell = ({ onClick }) => {
  const { t } = useTranslation();
  const { language } = useUI();
  const [pendingCount, setPendingCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [subscription, setSubscription] = useState(null);

  useEffect(() => {
    loadPendingCount();
    setupRealtimeSubscription();

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, []);

  const loadPendingCount = async () => {
    try {
      setIsLoading(true);
      const result = await EmergencyAlertsService.getPendingAlertsCount();
      
      if (result.success) {
        setPendingCount(result.count);
      }
    } catch (error) {
      console.error('Error loading pending alerts count:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    const subscriptionResult = EmergencyAlertsService.subscribeToAlerts((payload) => {
      // Reload count when alerts change
      loadPendingCount();
    });

    if (subscriptionResult.success) {
      setSubscription(subscriptionResult.subscription);
    }
  };

  const handleClick = () => {
    if (onClick) {
      onClick();
    }
  };

  return (
    <motion.button
      onClick={handleClick}
      className="relative p-2 rounded-lg bg-dark-700/50 border border-gold-400/30 hover:border-gold-400/60 backdrop-blur-sm transition-all duration-300 hover:scale-105 group"
      whileHover={{ 
        boxShadow: "0 0 15px rgba(251, 191, 36, 0.4)" 
      }}
      whileTap={{ scale: 0.95 }}
      title={language === 'ar' ? 'تنبيهات الطوارئ' : 'Emergency Alerts'}
    >
      {/* Bell Icon */}
      <div className="relative">
        <Bell className="w-5 h-5 text-gold-400 group-hover:text-gold-300 transition-colors duration-200" />
        
        {/* Notification Badge */}
        <AnimatePresence>
          {pendingCount > 0 && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="absolute -top-2 -right-2 min-w-[18px] h-[18px] bg-gradient-to-r from-red-500 to-red-600 rounded-full flex items-center justify-center border-2 border-dark-800"
            >
              <span className="text-white text-xs font-bold leading-none">
                {pendingCount > 99 ? '99+' : pendingCount}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Pulsing effect for urgent alerts */}
        {pendingCount > 0 && (
          <motion.div
            className="absolute inset-0 rounded-full bg-red-500/30"
            animate={{
              scale: [1, 1.3, 1],
              opacity: [0.5, 0, 0.5]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        )}
      </div>

      {/* Loading indicator */}
      {isLoading && (
        <motion.div
          className="absolute inset-0 rounded-lg bg-gold-400/10 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="w-3 h-3 border border-gold-400 border-t-transparent rounded-full animate-spin" />
        </motion.div>
      )}

      {/* Hover tooltip */}
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
        <div className="bg-dark-800/95 backdrop-blur-xl border border-gold-400/20 rounded-lg px-3 py-2 text-sm text-white whitespace-nowrap">
          {pendingCount > 0 ? (
            <div className="flex items-center space-x-2 rtl:space-x-reverse">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <span>
                {language === 'ar' 
                  ? `${pendingCount} تنبيه طوارئ معلق`
                  : `${pendingCount} pending emergency alert${pendingCount > 1 ? 's' : ''}`
                }
              </span>
            </div>
          ) : (
            <span>
              {language === 'ar' ? 'لا توجد تنبيهات طوارئ' : 'No emergency alerts'}
            </span>
          )}
          
          {/* Tooltip arrow */}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gold-400/20" />
        </div>
      </div>
    </motion.button>
  );
};

export default EmergencyAlertsBell; 