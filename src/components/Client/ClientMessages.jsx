import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { MessageSquare } from 'lucide-react';
import { useUI } from '../../context/UIContext';

// Import the unified chat system
import UnifiedChatDashboard from '../Chat/UnifiedChatDashboard.jsx';

const ClientMessages = () => {
  const { t } = useTranslation();
  const { language } = useUI();

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        delayChildren: 0.1,
        staggerChildren: 0.05
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 12
      }
    }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="h-full flex flex-col"
    >
      {/* Header */}
      <motion.div
        variants={itemVariants}
        className="mb-6 p-6 glassmorphism rounded-2xl border border-white/10"
      >
        <div className="flex items-center space-x-3 space-x-reverse">
          <div className="p-3 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl">
            <MessageSquare className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
              {language === 'ar' ? 'الرسائل' : 'Messages'}
            </h1>
            <p className="text-gray-400 text-sm">
              {language === 'ar' ? 'محادثاتك مع القراء والدعم' : 'Your conversations with readers and support'}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Unified Chat Dashboard */}
      <motion.div
        variants={itemVariants}
        className="flex-1 glassmorphism rounded-2xl border border-white/10 overflow-hidden"
      >
        <UnifiedChatDashboard />
      </motion.div>
    </motion.div>
  );
};

export default ClientMessages; 