import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import Particles from 'react-tsparticles';
import { loadSlim } from 'tsparticles-slim';
import MonitorLayout from '../../components/Layout/MonitorLayout.jsx';
import { useAuth } from '../../context/AuthContext';
import { useUI } from '../../context/UIContext';

// Import monitor components
import MonitorLiveSessions from '../../components/Monitor/MonitorLiveSessions';
import MonitorApprovalQueue from '../../components/Monitor/MonitorApprovalQueue';
import MonitorReports from '../../components/Monitor/MonitorReports';
import MonitorActivityLog from '../../components/Monitor/MonitorActivityLog';
import MonitorNotifications from '../../components/Monitor/MonitorNotifications';
import MonitorSupport from '../../components/Monitor/MonitorSupport';

const MonitorDashboard = () => {
  const { t } = useTranslation();
  const { user, profile, logout } = useAuth();
  const { language, isDarkMode } = useUI();
  const [activeTab, setActiveTab] = useState('live-sessions');
  const [stats, setStats] = useState({
    active_sessions: 0,
    pending_approvals: 0,
    unresolved_violations: 0,
    unread_notifications: 0,
    flagged_sessions: 0
  });

  useEffect(() => {
    loadDashboardStats();
  }, []);

  // Particle configuration
  const particlesInit = useCallback(async (engine) => {
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

  const loadDashboardStats = async () => {
    try {
      // Mock data for demonstration - would be replaced with MonitorAPI.getDashboardStats()
      setStats({
        active_sessions: 12,
        pending_approvals: 8,
        unresolved_violations: 3,
        unread_notifications: 5,
        flagged_sessions: 2
      });
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'live-sessions':
        return <MonitorLiveSessions />;
      case 'approval-queue':
        return <MonitorApprovalQueue />;
      case 'reports':
        return <MonitorReports />;
      case 'activity-log':
        return <MonitorActivityLog />;
      case 'notifications':
        return <MonitorNotifications />;
      case 'support':
        return <MonitorSupport />;
      default:
        return <MonitorLiveSessions />;
    }
  };

  return (
    <MonitorLayout>
      <div className="min-h-screen relative overflow-hidden">
        {/* Particle Background */}
        <Particles
          id="monitor-particles"
          init={particlesInit}
          options={particlesConfig}
          className="absolute inset-0 z-0"
        />

        {/* Main Content with Tab Navigation */}
        <div className="relative z-10 p-6">
          {/* Tab Navigation */}
          <div className="mb-8">
            <div className="flex flex-wrap gap-2 p-2 bg-white/5 backdrop-blur-sm border border-white/20 rounded-2xl">
              {[
                { id: 'live-sessions', label: language === 'ar' ? 'الجلسات المباشرة' : 'Live Sessions', badge: stats.active_sessions },
                { id: 'approval-queue', label: language === 'ar' ? 'قائمة الموافقات' : 'Approval Queue', badge: stats.pending_approvals },
                { id: 'reports', label: language === 'ar' ? 'التقارير والمخالفات' : 'Reports & Violations', badge: stats.unresolved_violations },
                { id: 'activity-log', label: language === 'ar' ? 'سجل النشاط' : 'Activity Log' },
                { id: 'notifications', label: language === 'ar' ? 'الإشعارات' : 'Notifications', badge: stats.unread_notifications },
                { id: 'support', label: language === 'ar' ? 'أدوات الدعم' : 'Support Tools' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
                    activeTab === tab.id
                      ? 'bg-gradient-to-r from-blue-500/20 to-cyan-500/20 text-blue-300 border border-blue-400/30'
                      : 'text-gray-300 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {tab.label}
                  {tab.badge && tab.badge > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                      {tab.badge}
                    </span>
                  )}
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
    </MonitorLayout>
  );
};

export default MonitorDashboard; 