import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import Particles from 'react-particles';
import { loadSlim } from 'tsparticles-slim';
import AdminLayout from '../../components/Layout/AdminLayout.jsx';
import { useAuth } from '../../context/AuthContext';
import { useUI } from '../../context/UIContext';

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

const AdminDashboard = () => {
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
      default:
        return <DashboardOverview />;
    }
  };

  return (
    <AdminLayout>
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
          {/* Tab Navigation */}
          <div className="mb-8">
            <div className="flex flex-wrap gap-2 p-2 bg-white/5 backdrop-blur-sm border border-white/20 rounded-2xl">
              {[
                { id: 'overview', label: language === 'ar' ? 'نظرة عامة' : 'Overview' },
                { id: 'users', label: language === 'ar' ? 'المستخدمين' : 'Users' },
                { id: 'services', label: language === 'ar' ? 'الخدمات' : 'Services' },
                { id: 'bookings', label: language === 'ar' ? 'الحجوزات' : 'Bookings' },
                { id: 'payments', label: language === 'ar' ? 'المدفوعات' : 'Payments' },
                { id: 'notifications', label: language === 'ar' ? 'الإشعارات' : 'Notifications' },
                { id: 'approvals', label: language === 'ar' ? 'الموافقات' : 'Approvals' },
                { id: 'monitoring', label: language === 'ar' ? 'المراقبة' : 'Monitoring' },
                { id: 'analytics', label: language === 'ar' ? 'الإحصائيات' : 'Analytics' },
                { id: 'support', label: language === 'ar' ? 'الدعم' : 'Support' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
                    activeTab === tab.id
                      ? 'bg-gradient-to-r from-red-500/20 to-pink-500/20 text-red-300 border border-red-400/30'
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
    </AdminLayout>
  );
};

export default AdminDashboard; 