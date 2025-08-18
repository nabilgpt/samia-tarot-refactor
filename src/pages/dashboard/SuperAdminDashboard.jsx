import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import Particles from 'react-tsparticles';
import { loadSlim } from 'tsparticles-slim';
import SuperAdminLayout from '../../components/Layout/SuperAdminLayout.jsx';
import { useAuth } from '../../context/AuthContext';
import { useUI } from '../../context/UIContext';
import api from '../../services/frontendApi.js';
import ErrorBoundary from '../../components/ErrorBoundary.jsx';
import DynamicAIManagementTabV2 from '../../components/Admin/DynamicAIManagementTabV2.jsx';

// Tab Components
import UserManagementTab from './SuperAdmin/UserManagementTab.jsx';
import SystemSettingsTab from './SuperAdmin/SystemSettingsTab.jsx';
import RealTimeControlsTab from './SuperAdmin/RealTimeControlsTab.jsx';
import AuditLogsTab from './SuperAdmin/AuditLogsTab.jsx';
import DatabaseManagementTab from './SuperAdmin/DatabaseManagementTab.jsx';
import FinancialControlsTab from './SuperAdmin/FinancialControlsTab.jsx';
import ImpersonationPanel from './SuperAdmin/ImpersonationPanel.jsx';
import SystemSecretsTab from '../../components/Admin/SystemSecretsTab.jsx';
import DailyZodiacManagementTab from './SuperAdmin/DailyZodiacManagementTab.jsx';
import BilingualSettingsTab from './SuperAdmin/BilingualSettingsTab.jsx';
import TarotManagementTab from './SuperAdmin/TarotManagementTab.jsx';

const SuperAdminDashboard = () => {
  const { t } = useTranslation();
  const { user, profile, loading: authLoading, initialized, isAuthenticated } = useAuth();
  const { language } = useUI();
  const [activeTab, setActiveTab] = useState('users');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({});
  const [systemHealth, setSystemHealth] = useState({});
  const [impersonationActive, setImpersonationActive] = useState(false);

  // Particle configuration for cosmic background (exactly same as Admin)
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
        value: ["#fbbf24", "#8b5cf6", "#06b6d4", "#ec4899"],
      },
      links: {
        color: "#fbbf24",
        distance: 150,
        enable: true,
        opacity: 0.2,
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
        speed: 1,
        straight: false,
      },
      number: {
        density: {
          enable: true,
          area: 800,
        },
        value: 50,
      },
      opacity: {
        value: 0.3,
      },
      shape: {
        type: "circle",
      },
      size: {
        value: { min: 1, max: 3 },
      },
    },
    detectRetina: true,
  }), []);

  // 🔄 CRITICAL FIX: Wait for authentication BEFORE loading dashboard data
  useEffect(() => {
    const loadDashboardData = async () => {
      // 🚨 IMPORTANT: Only load data if user is authenticated and profile is loaded
      if (!initialized || authLoading || !isAuthenticated || !user || !profile) {
        console.log('🔄 SuperAdminDashboard: Waiting for authentication...', {
          initialized,
          authLoading,
          isAuthenticated,
          hasUser: !!user,
          hasProfile: !!profile,
          profileRole: profile?.role
        });
        return;
      }

      // 🔒 SECURITY: Verify super admin role before proceeding
      if (profile.role !== 'super_admin') {
        console.error('❌ SuperAdminDashboard: Access denied - not super admin:', profile.role);
        setError('Super Admin access required');
        return;
      }

      try {
        console.log('✅ SuperAdminDashboard: Loading dashboard data for super admin...');
        setLoading(true);
        setError(null);
        
        // Verify super admin access with backend
        const verification = await api.verifySuperAdmin();
        console.log('🔍 DEBUG: SuperAdmin verification response:', verification);
        console.log('🔍 DEBUG: verification.success =', verification.success);
        console.log('🔍 DEBUG: verification type =', typeof verification);
        
        // Temporary: check if verification exists and has success property
        if (!verification || verification.success !== true) {
          console.log('❌ DEBUG: Verification failed. Full response:', JSON.stringify(verification, null, 2));
          throw new Error('Super Admin access verification failed');
        }

        // Load dashboard stats and system health
        const [statsResult, healthResult] = await Promise.all([
          api.getDatabaseStats(),
          api.getSystemHealth()
        ]);

        if (statsResult.success) {
          setStats(statsResult.data);
          console.log('✅ SuperAdminDashboard: Stats loaded successfully');
        } else {
          console.warn('⚠️ SuperAdminDashboard: Failed to load stats:', statsResult.error);
        }

        if (healthResult.success) {
          setSystemHealth(healthResult.data);
          console.log('✅ SuperAdminDashboard: System health loaded successfully');
        } else {
          console.warn('⚠️ SuperAdminDashboard: Failed to load system health:', healthResult.error);
        }

      } catch (error) {
        console.error('❌ SuperAdminDashboard: Error loading dashboard data:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    // 🎯 KEY FIX: Only trigger when authentication is complete
    loadDashboardData();
  }, [initialized, authLoading, isAuthenticated, user, profile]); // Dependencies ensure proper timing

  // 🔄 Show loading spinner while authentication is being checked
  if (authLoading || !initialized) {
    console.log('🔄 SuperAdminDashboard: Showing auth loading state...');
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-black flex items-center justify-center">
        <div className="text-center">
          <div className="relative mb-6">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-400"></div>
            <div className="absolute inset-0 rounded-full border-2 border-purple-400/20"></div>
          </div>
          <div className="space-y-2">
            <p className="text-gray-300 text-lg font-medium">
              {t('auth.checking')}
            </p>
            <p className="text-gray-500 text-sm">
              Verifying super admin access...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // 🔒 Redirect if not authenticated
  if (!isAuthenticated || !user) {
    console.log('❌ SuperAdminDashboard: User not authenticated, should redirect...');
    return null; // ProtectedRoute will handle redirect
  }

  // 🔒 Wait for profile to load
  if (!profile) {
    console.log('🔄 SuperAdminDashboard: Waiting for profile to load...');
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-black flex items-center justify-center">
        <div className="text-center">
          <div className="relative mb-6">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-400"></div>
            <div className="absolute inset-0 rounded-full border-2 border-purple-400/20"></div>
          </div>
          <div className="space-y-2">
            <p className="text-gray-300 text-lg font-medium">
              Loading profile...
            </p>
            <p className="text-gray-500 text-sm">
              Fetching your permissions...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // 🔒 Access control - verify super admin role
  if (profile.role !== 'super_admin') {
    console.error('❌ SuperAdminDashboard: Access denied for role:', profile.role);
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-black flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8 bg-black/30 backdrop-blur-sm rounded-2xl border border-red-500/20">
          <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="text-red-400 w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-4">
            Access Denied
          </h2>
          <p className="text-gray-300 mb-6 leading-relaxed">
            Super Admin access required. Your current role: <span className="text-red-400 font-medium">{profile.role}</span>
          </p>
          <button
            onClick={() => window.history.back()}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'users':
        return (
          <ErrorBoundary>
            <UserManagementTab />
          </ErrorBoundary>
        );
      case 'system':
        return (
          <ErrorBoundary>
            <SystemSettingsTab />
          </ErrorBoundary>
        );
      case 'realtime':
        return (
          <ErrorBoundary>
            <RealTimeControlsTab />
          </ErrorBoundary>
        );
      case 'database':
        return (
          <ErrorBoundary>
            <DatabaseManagementTab />
          </ErrorBoundary>
        );
      case 'financial':
        return (
          <ErrorBoundary>
            <FinancialControlsTab />
          </ErrorBoundary>
        );
      case 'audit':
        return (
          <ErrorBoundary>
            <AuditLogsTab />
          </ErrorBoundary>
        );
      case 'impersonation':
        return (
          <ErrorBoundary>
            <ImpersonationPanel />
          </ErrorBoundary>
        );
      case 'secrets':
        return (
          <ErrorBoundary>
            <SystemSecretsTab />
          </ErrorBoundary>
        );
      case 'zodiac':
        return (
          <ErrorBoundary>
            <DailyZodiacManagementTab />
          </ErrorBoundary>
        );
      case 'bilingual':
        return (
          <ErrorBoundary>
            <BilingualSettingsTab />
          </ErrorBoundary>
        );
      case 'tarot':
        return (
          <ErrorBoundary>
            <TarotManagementTab />
          </ErrorBoundary>
        );
      case 'dynamic-ai-v2':
        return (
          <ErrorBoundary>
            <DynamicAIManagementTabV2 />
          </ErrorBoundary>
        );
      default:
        return (
          <ErrorBoundary>
            <UserManagementTab />
          </ErrorBoundary>
        );
    }
  };

  return (
    <SuperAdminLayout activeTab={activeTab} setActiveTab={setActiveTab}>
      <div className="min-h-screen relative overflow-hidden">
        {/* Particle Background */}
        <Particles
          id="super-admin-particles"
          init={particlesInit}
          options={particlesConfig}
          className="absolute inset-0 z-0"
        />

        {/* Cosmic background effects */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-20 left-10 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 right-10 w-80 h-80 bg-gold-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-cyan-500/15 rounded-full blur-3xl animate-pulse delay-500"></div>
        </div>

        {/* Main Content with Tab Navigation */}
        <div className="relative z-10 p-6">
          {/* Tab Navigation */}
          <div className="mb-8">
            <div className="flex flex-wrap gap-2 p-2 bg-white/5 backdrop-blur-sm border border-white/20 rounded-2xl">
              {[
                { id: 'users', label: language === 'ar' ? 'إدارة المستخدمين' : 'User Management' },
                { id: 'system', label: language === 'ar' ? 'إعدادات النظام' : 'System Settings' },
                { id: 'secrets', label: language === 'ar' ? 'المفاتيح السرية' : 'System Secrets' },
                { id: 'tarot', label: language === 'ar' ? 'إدارة التاروت' : 'Tarot Management' },
                { id: 'zodiac', label: language === 'ar' ? 'إدارة الأبراج اليومية' : 'Daily Zodiac Management' },
                { id: 'bilingual', label: language === 'ar' ? 'إعدادات الترجمة' : 'Bilingual Settings' },
                { id: 'realtime', label: language === 'ar' ? 'التحكم المباشر' : 'Real-Time Controls' },
                { id: 'database', label: language === 'ar' ? 'إدارة قاعدة البيانات' : 'Database Management' },
                { id: 'financial', label: language === 'ar' ? 'التحكم المالي' : 'Financial Controls' },
                { id: 'audit', label: language === 'ar' ? 'سجلات المراجعة' : 'Audit Logs' },
                { id: 'impersonation', label: language === 'ar' ? 'انتحال الهوية' : 'User Impersonation' },
                { id: 'dynamic-ai-v2', label: language === 'ar' ? 'إدارة الذكاء الديناميكي V2' : 'Dynamic AI Management V2' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
                    activeTab === tab.id
                      ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-300 border border-purple-400/30'
                      : 'text-gray-300 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {tab.label}
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
    </SuperAdminLayout>
  );
};

export default SuperAdminDashboard; 