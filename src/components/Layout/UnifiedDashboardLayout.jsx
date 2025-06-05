import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { 
  Menu,
  X,
  Bell,
  Search,
  LogOut,
  ShieldCheck
} from 'lucide-react';
import { StarIcon } from '@heroicons/react/24/outline';
import MainLayout from './MainLayout';
import CosmicCard from '../UI/CosmicCard';
import CosmicButton from '../UI/CosmicButton';
import { useUI } from '../../context/UIContext';
import { useAuth } from '../../context/AuthContext';

const UnifiedDashboardLayout = ({ 
  children, 
  roleConfig: providedRoleConfig,
  navigationItems = [],
  quickStats = [],
  onLogout,
  onEmergencyAlertsClick 
}) => {
  const { t } = useTranslation();
  const { language } = useUI();
  const { logout } = useAuth();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Create fallback roleConfig to ensure layout always renders
  const fallbackRoleConfig = {
    icon: StarIcon,
    title: 'Dashboard',
    subtitle: 'Loading...',
    shortTitle: 'Dashboard',
    iconGradient: 'from-purple-500 to-pink-500',
    titleGradient: 'from-purple-400 to-pink-400',
    activeGradient: 'from-purple-500/20 to-pink-500/20',
    activeText: 'text-purple-300',
    activeBorder: 'border-purple-400/30',
    focusRing: 'focus:ring-purple-400/50',
    focusBorder: 'focus:border-purple-400/50',
    statusDot: 'bg-purple-400',
    searchPlaceholder: 'Search...',
    statusSection: {
      label: 'Status',
      icon: null,
      iconColor: 'text-green-400',
      textColor: 'text-green-400',
      value: 'Active'
    }
  };

  // Validate and use roleConfig with fallback
  const roleConfig = React.useMemo(() => {
    if (!providedRoleConfig) {
      console.warn('UnifiedDashboardLayout: roleConfig is missing, using fallback');
      return fallbackRoleConfig;
    }

    // Check for required properties
    const requiredProps = ['icon', 'title', 'subtitle', 'iconGradient', 'titleGradient'];
    const missingProps = requiredProps.filter(prop => !providedRoleConfig[prop]);
    
    if (missingProps.length > 0) {
      console.warn(`UnifiedDashboardLayout: roleConfig missing required props: ${missingProps.join(', ')}, using fallback`);
      return { ...fallbackRoleConfig, ...providedRoleConfig };
    }

    return providedRoleConfig;
  }, [providedRoleConfig]);

  const sidebarVariants = {
    open: {
      x: 0,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 30
      }
    },
    closed: {
      x: language === 'ar' ? '100%' : '-100%',
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 30
      }
    }
  };

  const handleLogout = async () => {
    try {
      if (onLogout) {
        await onLogout();
      } else {
        await logout();
      }
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  // Validate navigationItems
  const validNavigationItems = React.useMemo(() => {
    return navigationItems.filter(item => {
      if (!item.name || !item.icon) {
        console.warn('UnifiedDashboardLayout: Invalid navigation item', item);
        return false;
      }
      return true;
    });
  }, [navigationItems]);

  // Validate quickStats
  const validQuickStats = React.useMemo(() => {
    if (!Array.isArray(quickStats)) {
      return [];
    }
    return quickStats.filter(stat => {
      if (!stat.label || !stat.value) {
        console.warn('UnifiedDashboardLayout: Invalid quick stat', stat);
        return false;
      }
      return true;
    });
  }, [quickStats]);

  return (
    <MainLayout showNavbar={false} className="lg:pl-72 rtl:lg:pl-0 rtl:lg:pr-72">
      {/* Mobile sidebar backdrop */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-gray-900/50 backdrop-blur-sm lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.div
        variants={sidebarVariants}
        initial="closed"
        animate={isSidebarOpen ? "open" : "closed"}
        className={`fixed top-0 ${language === 'ar' ? 'right-0' : 'left-0'} z-50 w-72 h-full lg:translate-x-0 lg:z-30`}
      >
        <CosmicCard className="h-full rounded-none border-r border-white/10 p-6" variant="glass">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-3 rtl:space-x-reverse">
              <div className={`w-10 h-10 bg-gradient-to-br ${roleConfig.iconGradient} rounded-xl flex items-center justify-center`}>
                {React.createElement(roleConfig.icon, { className: "w-6 h-6 text-white" })}
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">
                  {roleConfig.title}
                </h2>
                <p className="text-sm text-gray-400">
                  {roleConfig.subtitle}
                </p>
              </div>
            </div>
            <CosmicButton
              variant="ghost"
              size="sm"
              className="lg:hidden"
              onClick={() => setIsSidebarOpen(false)}
            >
              <X className="w-5 h-5" />
            </CosmicButton>
          </div>

          {/* Quick Stats */}
          {validQuickStats.length > 0 && (
            <div className="mb-6 grid grid-cols-2 gap-3">
              {validQuickStats.map((stat, index) => (
                <div 
                  key={index}
                  className={`bg-gradient-to-br ${stat.gradient || 'from-gray-500/20 to-gray-600/20'} p-3 rounded-lg border ${stat.borderColor || 'border-gray-400/30'}`}
                >
                  <div className="text-xs text-gray-400">{stat.label}</div>
                  <div className={`text-lg font-bold ${stat.textColor || 'text-gray-300'}`}>{stat.value}</div>
                </div>
              ))}
            </div>
          )}

          {/* Search */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder={roleConfig.searchPlaceholder || 'Search...'}
                className={`w-full pl-10 rtl:pl-4 rtl:pr-10 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 ${roleConfig.focusRing || 'focus:ring-purple-400/50'} ${roleConfig.focusBorder || 'focus:border-purple-400/50'}`}
              />
            </div>
          </div>

          {/* Navigation */}
          <nav className="space-y-2 flex-1 overflow-y-auto">
            {validNavigationItems.map((item) => {
              const isActive = item.isActive !== undefined ? item.isActive : location.pathname === item.href;
              const Icon = item.icon;
              
              const navElement = (
                <div
                  className={`flex items-center space-x-3 rtl:space-x-reverse px-4 py-3 rounded-xl transition-all duration-300 cursor-pointer ${
                    isActive
                      ? `bg-gradient-to-r ${roleConfig.activeGradient} ${roleConfig.activeText} border ${roleConfig.activeBorder}`
                      : 'text-gray-300 hover:bg-white/10 hover:text-white'
                  }`}
                  onClick={item.onClick}
                >
                  {React.createElement(Icon, { className: "w-5 h-5" })}
                  <span className="font-medium text-sm">{item.name}</span>
                </div>
              );

              // If it has onClick handler (tab-based), render div, otherwise Link
              if (item.onClick) {
                return (
                  <div key={item.name}>
                    {navElement}
                  </div>
                );
              } else {
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                  >
                    {navElement}
                  </Link>
                );
              }
            })}
          </nav>

          {/* Status Section */}
          {roleConfig.statusSection && (
            <div className="py-4 border-t border-white/10">
              <div className="flex items-center justify-between px-4 py-2">
                <span className="text-sm font-medium text-gray-300">
                  {roleConfig.statusSection.label}
                </span>
                <div className="flex items-center space-x-2 rtl:space-x-reverse">
                  {roleConfig.statusSection.icon && React.createElement(roleConfig.statusSection.icon, { 
                    className: `w-4 h-4 ${roleConfig.statusSection.iconColor}` 
                  })}
                  <span className={`text-xs ${roleConfig.statusSection.textColor}`}>
                    {roleConfig.statusSection.value}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Logout */}
          <div className="pt-4">
            <CosmicButton
              variant="danger"
              className="w-full"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4 mr-2 rtl:mr-0 rtl:ml-2" />
              {language === 'ar' ? 'تسجيل الخروج' : 'Logout'}
            </CosmicButton>
          </div>
        </CosmicCard>
      </motion.div>

      {/* Mobile header */}
      <div className="lg:hidden sticky top-0 z-30 bg-gray-900/80 backdrop-blur-md border-b border-white/10 p-4">
        <div className="flex items-center justify-between">
          <CosmicButton
            variant="ghost"
            size="sm"
            onClick={() => setIsSidebarOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </CosmicButton>
          
          <h1 className={`text-xl font-bold bg-gradient-to-r ${roleConfig.titleGradient} bg-clip-text text-transparent`}>
            {t('app.name')} {roleConfig.shortTitle}
          </h1>
          
          <div className="flex items-center space-x-2 rtl:space-x-reverse">
            <div className={`w-2 h-2 ${roleConfig.statusDot} rounded-full animate-pulse`}></div>
            {onEmergencyAlertsClick && (
              <CosmicButton variant="ghost" size="sm" onClick={onEmergencyAlertsClick}>
                <Bell className="w-5 h-5" />
              </CosmicButton>
            )}
          </div>
        </div>
      </div>

      {/* Main content */}
      <main className="relative z-10 min-h-screen">
        <div className="p-6 lg:p-8">
          {children}
        </div>
      </main>
    </MainLayout>
  );
};

export default UnifiedDashboardLayout; 