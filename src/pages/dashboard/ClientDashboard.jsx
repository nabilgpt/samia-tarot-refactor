import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import Particles from 'react-tsparticles';
import { loadSlim } from 'tsparticles-slim';
import ClientLayout from '../../components/Layout/ClientLayout.jsx';
import { useAuth } from '../../context/AuthContext';
import { useUI } from '../../context/UIContext';

// Import client components
import ClientOverview from '../../components/Client/ClientOverview';
import ClientProfile from '../../components/Client/ClientProfile';
import ClientBookings from '../../components/Client/ClientBookings';
import ClientWallet from '../../components/Client/ClientWallet';
import ClientNotifications from '../../components/Client/ClientNotifications';
import ClientMessages from '../../components/Client/ClientMessages';
import ClientFeedback from '../../components/Client/ClientFeedback';
import ClientSupport from '../../components/Client/ClientSupport';

const ClientDashboard = () => {
  const { t } = useTranslation();
  const { user, profile } = useAuth();
  const { language } = useUI();
  const [activeTab, setActiveTab] = useState('overview');

  // Particle configuration for cosmic background
  const particlesInit = useCallback(async engine => {
    await loadSlim(engine);
  }, []);

  const particlesConfig = useMemo(() => ({
    background: {
      color: {
        value: "transparent",
      },
    },
    fpsLimit: 120,
    interactivity: {
      events: {
        onClick: {
          enable: true,
          mode: "push",
        },
        onHover: {
          enable: true,
          mode: "repulse",
        },
        resize: true,
      },
      modes: {
        push: {
          quantity: 4,
        },
        repulse: {
          distance: 200,
          duration: 0.4,
        },
      },
    },
    particles: {
      color: {
        value: ["#fbbf24", "#d946ef", "#06b6d4", "#ffffff"],
      },
      links: {
        color: "#fbbf24",
        distance: 150,
        enable: true,
        opacity: 0.1,
        width: 1,
      },
      collisions: {
        enable: true,
      },
      move: {
        direction: "none",
        enable: true,
        outModes: {
          default: "bounce",
        },
        random: false,
        speed: 0.5,
        straight: false,
      },
      number: {
        density: {
          enable: true,
          area: 800,
        },
        value: 40,
      },
      opacity: {
        value: 0.2,
      },
      shape: {
        type: "circle",
      },
      size: {
        value: { min: 1, max: 2 },
      },
    },
    detectRetina: true,
  }), []);

  // Tab configuration
  const tabs = [
    {
      id: 'overview',
      name: language === 'ar' ? 'النظرة العامة' : 'Overview',
      description: language === 'ar' ? 'ملخص حسابك وأنشطتك' : 'Your account summary and activities'
    },
    {
      id: 'profile',
      name: language === 'ar' ? 'الملف الشخصي' : 'Profile',
      description: language === 'ar' ? 'إدارة معلوماتك الشخصية' : 'Manage your personal information'
    },
    {
      id: 'bookings',
      name: language === 'ar' ? 'الحجوزات' : 'My Bookings',
      description: language === 'ar' ? 'عرض وإدارة حجوزاتك' : 'View and manage your bookings'
    },
    {
      id: 'wallet',
      name: language === 'ar' ? 'المحفظة' : 'Wallet',
      description: language === 'ar' ? 'رصيدك والمعاملات المالية' : 'Your balance and transactions'
    },
    {
      id: 'messages',
      name: language === 'ar' ? 'الرسائل' : 'Messages',
      description: language === 'ar' ? 'محادثاتك مع القراء' : 'Your conversations with readers'
    },
    {
      id: 'notifications',
      name: language === 'ar' ? 'الإشعارات' : 'Notifications',
      description: language === 'ar' ? 'إشعاراتك وتنبيهاتك' : 'Your notifications and alerts'
    },
    {
      id: 'feedback',
      name: language === 'ar' ? 'التقييمات' : 'Reviews',
      description: language === 'ar' ? 'تقييماتك للقراء' : 'Your reviews and ratings'
    },
    {
      id: 'support',
      name: language === 'ar' ? 'الدعم' : 'Support',
      description: language === 'ar' ? 'احصل على المساعدة والدعم' : 'Get help and support'
    }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return <ClientOverview />;
      case 'profile':
        return <ClientProfile />;
      case 'bookings':
        return <ClientBookings />;
      case 'wallet':
        return <ClientWallet />;
      case 'messages':
        return <ClientMessages />;
      case 'notifications':
        return <ClientNotifications />;
      case 'feedback':
        return <ClientFeedback />;
      case 'support':
        return <ClientSupport />;
      default:
        return <ClientOverview />;
    }
  };

  return (
    <ClientLayout>
      <div className="min-h-screen relative overflow-hidden">
        {/* Particle Background */}
        <Particles
          id="client-particles"
          init={particlesInit}
          options={particlesConfig}
          className="absolute inset-0 z-0"
        />

        {/* Cosmic background effects */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-20 left-10 w-96 h-96 bg-gold-500/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 right-10 w-80 h-80 bg-cosmic-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-purple-500/15 rounded-full blur-3xl animate-pulse delay-500"></div>
        </div>

        {/* Main Content with Tab Navigation */}
        <div className="relative z-10 p-6">
          {/* Tab Navigation */}
          <div className="mb-8">
            <div className="flex flex-wrap gap-2 p-2 bg-white/5 backdrop-blur-sm border border-white/20 rounded-2xl">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
                    activeTab === tab.id
                      ? 'bg-gradient-to-r from-gold-500/20 to-cosmic-500/20 text-gold-300 border border-gold-400/30'
                      : 'text-gray-300 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {tab.name}
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 100, damping: 15 }}
            className="bg-white/5 backdrop-blur-sm border border-white/20 rounded-2xl min-h-[600px] p-6"
          >
            {renderTabContent()}
          </motion.div>
        </div>
      </div>
    </ClientLayout>
  );
};

export default ClientDashboard; 