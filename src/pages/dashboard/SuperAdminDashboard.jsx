import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import Particles from 'react-tsparticles';
import { loadSlim } from 'tsparticles-slim';
import SuperAdminLayout from '../../components/Layout/SuperAdminLayout.jsx';
import { useAuth } from '../../context/AuthContext';
import { useUI } from '../../context/UIContext';
import SuperAdminAPI from '../../api/superAdminApi.js';
import ErrorBoundary from '../../components/ErrorBoundary.jsx';

// Tab Components
import UserManagementTab from './SuperAdmin/UserManagementTab.jsx';
import SystemSettingsTab from './SuperAdmin/SystemSettingsTab.jsx';
import RealTimeControlsTab from './SuperAdmin/RealTimeControlsTab.jsx';
import AuditLogsTab from './SuperAdmin/AuditLogsTab.jsx';
import DatabaseManagementTab from './SuperAdmin/DatabaseManagementTab.jsx';
import FinancialControlsTab from './SuperAdmin/FinancialControlsTab.jsx';
import ImpersonationPanel from './SuperAdmin/ImpersonationPanel.jsx';
import SystemSecretsTab from '../../components/Admin/SystemSecretsTab.jsx';

const SuperAdminDashboard = () => {
  const { t } = useTranslation();
  const { user, profile } = useAuth();
  const { language } = useUI();
  const [activeTab, setActiveTab] = useState('users');
  const [loading, setLoading] = useState(true);
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

  // Load dashboard data
  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Verify super admin access
        const verification = await SuperAdminAPI.verifySuperAdmin();
        if (!verification.success) {
          throw new Error('Super Admin access required');
        }

        // Load dashboard stats and system health
        const [statsResult, healthResult] = await Promise.all([
          SuperAdminAPI.getDatabaseStats(),
          SuperAdminAPI.getSystemHealth()
        ]);

        if (statsResult.success) {
          setStats(statsResult.data);
        }

        if (healthResult.success) {
          setSystemHealth(healthResult.data);
        }

      } catch (error) {
        console.error('Error loading Super Admin dashboard:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

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
                { id: 'realtime', label: language === 'ar' ? 'التحكم المباشر' : 'Real-Time Controls' },
                { id: 'database', label: language === 'ar' ? 'إدارة قاعدة البيانات' : 'Database Management' },
                { id: 'financial', label: language === 'ar' ? 'التحكم المالي' : 'Financial Controls' },
                { id: 'audit', label: language === 'ar' ? 'سجلات المراجعة' : 'Audit Logs' },
                { id: 'impersonation', label: language === 'ar' ? 'انتحال الهوية' : 'User Impersonation' }
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