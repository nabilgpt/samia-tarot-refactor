import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { MessageCircle } from 'lucide-react';
import Button from '../components/Button';
import AnimatedBackground from '../components/UI/AnimatedBackground';
import EmergencyCallButton from '../components/EmergencyCallButton';

// Import the unified chat system
import UnifiedChatDashboard from '../components/Chat/UnifiedChatDashboard.jsx';

const MessagesPage = () => {
  const { t } = useTranslation();
  const { user, profile, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return (
      <AnimatedBackground variant="default" intensity="normal">
        <div className="min-h-screen flex items-center justify-center px-4">
          <div className="text-center bg-dark-800/50 backdrop-blur-xl border border-gold-400/20 rounded-2xl p-8 shadow-2xl shadow-cosmic-500/10">
            <h2 className="text-2xl font-bold text-white mb-4">تسجيل الدخول مطلوب</h2>
            <p className="text-gray-400 mb-6">يجب تسجيل الدخول لعرض الرسائل</p>
            <Button href="/login" className="bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-600 hover:to-gold-700 text-dark-900 font-bold">
              تسجيل الدخول
            </Button>
          </div>
        </div>
      </AnimatedBackground>
    );
  }

  return (
    <AnimatedBackground variant="default" intensity="normal">
      {/* Emergency Call Button */}
      <EmergencyCallButton />
      
      {/* Page Header */}
      <div className="p-6">
        <div className="flex items-center space-x-3 space-x-reverse mb-6">
          <div className="p-3 bg-gradient-to-br from-gold-500/20 to-cosmic-500/20 rounded-xl">
            <MessageCircle className="w-8 h-8 text-gold-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-gold-400 via-cosmic-400 to-cyan-400 bg-clip-text text-transparent">
              الرسائل
            </h1>
            <p className="text-gray-400">
              محادثاتك مع القراء والدعم الفني
            </p>
          </div>
        </div>
      </div>

      {/* Unified Chat Dashboard */}
      <div className="h-[calc(100vh-200px)] mx-6 mb-6 bg-dark-800/50 backdrop-blur-xl border border-gold-400/20 rounded-2xl overflow-hidden">
        <UnifiedChatDashboard />
      </div>
    </AnimatedBackground>
  );
};

export default MessagesPage; 