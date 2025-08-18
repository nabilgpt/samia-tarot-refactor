import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import Particles from 'react-tsparticles';
import { loadSlim } from 'tsparticles-slim';
import AdminLayout from '../../components/Layout/AdminLayout.jsx';
import { useAuth } from '../../context/AuthContext';
import { useUI } from '../../context/UIContext';
import { useLanguage } from '../../context/LanguageContext';
import { getSidebarNavigationItems } from '../../utils/navigationConfig.js';

// Import enhanced tab components
import DashboardOverview from '../../components/Admin/Enhanced/DashboardOverview';
import UserManagement from '../../components/Admin/Enhanced/UserManagement';
import ServicesManagement from '../../components/Admin/Enhanced/ServicesManagement';
import BookingsManagement from '../../components/Admin/Enhanced/BookingsManagement';
import PaymentsAndWallets from '../../components/Admin/Enhanced/PaymentsAndWallets';
import NotificationsSystem from '../../components/Admin/Enhanced/NotificationsSystem';
import ApprovalQueue from '../../components/Admin/Enhanced/ApprovalQueue';
import MonitoringAndReports from '../../components/Admin/Enhanced/MonitoringAndReports';
import Analytics from '../../components/Admin/Enhanced/Analytics';
import SupportTools from '../../components/Admin/Enhanced/SupportTools';
import TarotManagement from '../../components/Admin/Enhanced/TarotManagementRefactored';
import ReviewsManagement from '../../components/Admin/Enhanced/ReviewsManagement';

// Placeholder components for system and account tabs
const ReadersManagement = () => (
  <div className="p-6">
    <h2 className="text-2xl font-bold text-white mb-4">Readers Management</h2>
    <p className="text-gray-300">Readers management functionality will be implemented here.</p>
  </div>
);

const FinancesManagement = () => (
  <div className="p-6">
    <h2 className="text-2xl font-bold text-white mb-4">Finances Management</h2>
    <p className="text-gray-300">Financial management functionality will be implemented here.</p>
  </div>
);

const MessagesManagement = () => (
  <div className="p-6">
    <h2 className="text-2xl font-bold text-white mb-4">Messages Management</h2>
    <p className="text-gray-300">Message management functionality will be implemented here.</p>
  </div>
);

const ReportsManagement = () => (
  <div className="p-6">
    <h2 className="text-2xl font-bold text-white mb-4">Reports Management</h2>
    <p className="text-gray-300">Reports functionality will be implemented here.</p>
  </div>
);

const IncidentsManagement = () => (
  <div className="p-6">
    <h2 className="text-2xl font-bold text-white mb-4">Incidents Management</h2>
    <p className="text-gray-300">Incident management functionality will be implemented here.</p>
  </div>
);

const SystemManagement = () => (
  <div className="p-6">
    <h2 className="text-2xl font-bold text-white mb-4">System Management</h2>
    <p className="text-gray-300">System management functionality will be implemented here.</p>
  </div>
);

const SecurityManagement = () => (
  <div className="p-6">
    <h2 className="text-2xl font-bold text-white mb-4">Security Management</h2>
    <p className="text-gray-300">Security management functionality will be implemented here.</p>
  </div>
);

const ProfileManagement = () => (
  <div className="p-6">
    <h2 className="text-2xl font-bold text-white mb-4">Profile Management</h2>
    <p className="text-gray-300">Profile management functionality will be implemented here.</p>
  </div>
);

const SettingsManagement = () => (
  <div className="p-6">
    <h2 className="text-2xl font-bold text-white mb-4">Settings Management</h2>
    <p className="text-gray-300">Settings management functionality will be implemented here.</p>
  </div>
);

const AdminDashboard = () => {
  const { t } = useTranslation();
  const { user, profile } = useAuth();
  const { language } = useUI();
  const { currentLanguage, direction, isRtl } = useLanguage();
  const [activeTab, setActiveTab] = useState('overview');

  // Get ALL navigation items from unified config (main + system + account)  
  const allNavigationItems = getSidebarNavigationItems(currentLanguage, (tabId) => setActiveTab(tabId));
  
  // Convert to tabs format for top navigation
  const tabNavigationItems = allNavigationItems.map(item => ({
    key: item.key,
    tabId: item.tabId || item.key,
    label: item.label,
    icon: item.icon,
    type: item.type
  }));

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

  const renderTabContent = () => {
    switch (activeTab) {
      // Main tabs
      case 'overview':
        return <DashboardOverview />;
      case 'users':
        return <UserManagement />;
      case 'services':
        return <ServicesManagement />;
      case 'bookings':
        return <BookingsManagement />;
      case 'payments':
        return <PaymentsAndWallets />;
      case 'tarot':
        return <TarotManagement />;
      case 'notifications':
        return <NotificationsSystem />;
      case 'approvals':
        return <ApprovalQueue />;
      case 'monitoring':
        return <MonitoringAndReports />;
      case 'analytics':
        return <Analytics />;
      case 'support':
        return <SupportTools />;
      case 'reviews':
        return <ReviewsManagement />;
      
      // System tabs
      case 'readers':
        return <ReadersManagement />;
      case 'finances':
        return <FinancesManagement />;
      case 'messages':
        return <MessagesManagement />;
      case 'reports':
        return <ReportsManagement />;
      case 'incidents':
        return <IncidentsManagement />;
      case 'system':
        return <SystemManagement />;
      case 'security':
        return <SecurityManagement />;
      
      // Account tabs
      case 'profile':
        return <ProfileManagement />;
      case 'settings':
        return <SettingsManagement />;
      
      default:
        return <DashboardOverview />;
    }
  };

  // Handle tab change from sidebar
  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
  };

  // Handle navigation from notifications
  const handleNavigate = (tabId) => {
    setActiveTab(tabId);
  };

  return (
    <AdminLayout onTabChange={handleTabChange} activeTab={activeTab} onNavigate={handleNavigate}>
      <div className="min-h-screen relative overflow-hidden">
        {/* Particle Background */}
        <Particles
          id="admin-particles"
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
          {/* Page Header */}
          <div className="mb-8 text-center">
            <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-purple-400 via-pink-400 to-red-400 bg-clip-text text-transparent">
              {isRtl ? 'لوحة تحكم المدير' : 'Admin Dashboard'}
            </h1>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              {isRtl ? 'مرحباً بك في نظام إدارة سامية تاروت' : 'Welcome to Samia Tarot Management System'}
            </p>
          </div>

          {/* Tab Navigation */}
          <div className="mb-8">
            <div className="bg-white/5 backdrop-blur-sm border border-white/20 rounded-2xl p-2">
              <div className="flex flex-wrap gap-2">
                {tabNavigationItems.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.tabId}
                      onClick={() => setActiveTab(tab.tabId)}
                      className={`flex items-center justify-center md:space-x-33 px-3 md:px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 min-h-[44px] ${
                        activeTab === tab.tabId
                          ? 'bg-gradient-to-r from-red-500/20 to-pink-500/20 text-red-300 border border-red-400/30'
                          : 'text-gray-300 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <Icon className="w-5 h-5 md:w-4 md:h-4" />
                      <span className="hidden md:inline ml-2">{tab.label}</span>
                    </button>
                  );
                })}
              </div>
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
    </AdminLayout>
  );
};

export default AdminDashboard; 