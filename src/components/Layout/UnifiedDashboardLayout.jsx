import React, { useState, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../../context/LanguageContext';
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
import GlobalSearchField from '../Admin/GlobalSearchField';
import NotificationsBell from '../Admin/NotificationsBell';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

const UnifiedDashboardLayout = ({ 
  children, 
  roleConfig: providedRoleConfig,
  navigationItems = [],
  quickStats = [],
  onLogout,
  onEmergencyAlertsClick,
  onNavigate
}) => {
  const { currentLanguage, direction, isRtl, getLocalizedText } = useLanguage();
  const { } = useUI();
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
      x: direction === 'rtl' ? '100%' : '-100%',
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

  // Sidebar content component (shared between desktop and mobile)
  const SidebarContent = ({ onClose }) => (
    <div className={`flex flex-col h-full backdrop-blur-xl ${direction === 'rtl' ? 'border-l' : 'border-r'} border-purple-500/20 relative`}
      style={{
        background: 'linear-gradient(135deg, #1e293b 70%, #334155 100%, #475569 100%)'
      }}>
      {/* Cosmic background overlay for unified cosmic theme */}
      <div 
        className="absolute inset-0 rounded-none opacity-0 pointer-events-none"
        style={{
          background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(217, 70, 239, 0.2) 50%, rgba(168, 85, 247, 0.2) 100%)'
        }}
      />
      
      {/* Fixed Header Section - Always visible at top */}
      <div className="flex-shrink-0 relative z-10">
        <div className="bg-transparent">
          <div className="p-6 pb-4">
            <div className="flex items-center justify-between mb-6">
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
              {onClose && (
                <CosmicButton
                  variant="ghost"
                  size="sm"
                  className="lg:hidden"
                  onClick={onClose}
                >
                  <X className="w-5 h-5" />
                </CosmicButton>
              )}
            </div>

            {/* Quick Stats */}
            {validQuickStats.length > 0 && (
              <div className="mb-4 grid grid-cols-2 gap-3">
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

            {/* Global Search */}
            <div className="mb-0">
              <GlobalSearchField onNavigate={(result) => {
                console.log('🔥 UnifiedDashboardLayout: Navigation triggered for:', result);
                console.log('🔥 result.navigateTo:', result.navigateTo);
                console.log('🔥 validNavigationItems:', validNavigationItems);
                
                // Use the navigateTo property from search results (not entity)
                const targetKey = result.navigateTo || 'overview';
                console.log('🔥 Target key:', targetKey);
                const targetNavItem = validNavigationItems.find(item => item.key === targetKey);
                console.log('🔥 Target nav item:', targetNavItem);
                
                if (targetNavItem && targetNavItem.onClick) {
                  console.log('🔥 Triggering navigation via onClick for:', targetKey);
                  targetNavItem.onClick();
                } else {
                  console.log('🔥 Navigation item not found for:', result.navigateTo);
                  console.log('🔥 Available navigation keys:', validNavigationItems.map(item => item.key));
                  
                  // Fallback to overview if navigation item not found
                  const overviewItem = validNavigationItems.find(item => item.key === 'overview');
                  if (overviewItem && overviewItem.onClick) {
                    console.log('🔥 Falling back to overview navigation');
                    overviewItem.onClick();
                  }
                }
                
                console.log('🔥 Tab navigation completed');
              }} />
            </div>
          </div>
        </div>
      </div>

      {/* Scrollable Navigation Section - Takes remaining space */}
      <div className="flex-1 min-h-0 overflow-y-auto hide-scrollbar relative z-10">
        <div className="bg-transparent">
          <div className="px-6 py-6">
            <nav className="space-y-2">
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
          </div>
        </div>
      </div>

      {/* Fixed Footer Section - Always Visible at Bottom */}
      <div className="flex-shrink-0 relative z-10">
        <div className="bg-transparent">
          <div className="p-6 pt-4">
            {/* Status Section */}
            {roleConfig.statusSection && (
              <div className="mb-4 py-3 border-t border-white/10">
                <div className="flex items-center justify-between px-4 py-2">
                  <span className="text-sm font-medium text-gray-300">
                    {roleConfig.statusSection.label}
                  </span>
                  <div className="flex items-center space-x-3 rtl:space-x-reverse">
                    {/* Online Status */}
                  <div className="flex items-center space-x-2 rtl:space-x-reverse">
                      {roleConfig.statusSection.icon &&
                        React.createElement(roleConfig.statusSection.icon, {
                      className: `w-4 h-4 ${roleConfig.statusSection.iconColor}` 
                    })}
                    <span className={`text-xs ${roleConfig.statusSection.textColor}`}>
                      {roleConfig.statusSection.value}
                    </span>
                    </div>
                    
                    {/* Notifications Bell */}
                    <NotificationsBell
                      size="small"
                      showLabel={false}
                      className="flex-shrink-0"
                      onNavigate={onNavigate}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Logout */}
            <CosmicButton
              variant="danger"
              className="w-full"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4 mr-2 rtl:mr-0 rtl:ml-2" />
              {direction === 'rtl' ? 'تسجيل الخروج' : 'Logout'}
            </CosmicButton>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <MainLayout showNavbar={false} className={`lg:pl-72 rtl:lg:pl-0 rtl:lg:pr-72 ${direction === 'rtl' ? 'rtl' : 'ltr'}`}>
      {/* Desktop Sidebar - Always Visible */}
      <div className={`hidden lg:fixed lg:top-[65px] ${direction === 'rtl' ? 'lg:right-0' : 'lg:left-0'} lg:z-30 lg:w-72 lg:h-[calc(100vh-65px)] lg:block`}>
        <SidebarContent />
      </div>

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

      {/* Mobile Sidebar - Animated */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            variants={sidebarVariants}
            initial="closed"
            animate="open"
            exit="closed"
            className={`lg:hidden fixed top-[65px] ${direction === 'rtl' ? 'right-0' : 'left-0'} z-50 w-72 h-[calc(100vh-65px)]`}
            style={{ 
              position: 'fixed',
              top: '65px',
              [direction === 'rtl' ? 'right' : 'left']: 0,
              width: '18rem',
              height: 'calc(100vh - 65px)',
              zIndex: 50
            }}
          >
            <SidebarContent onClose={() => setIsSidebarOpen(false)} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dashboard Container - Proper flex layout */}
      <div className="h-full flex flex-col min-h-0">
        {/* Mobile header */}
        <div className="lg:hidden flex-shrink-0 sticky top-0 z-30 bg-gray-900/80 backdrop-blur-md border-b border-white/10 p-4">
          <div className="flex items-center justify-between">
            <CosmicButton
              variant="ghost"
              size="sm"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </CosmicButton>
            
            <h1 className={`text-xl font-bold bg-gradient-to-r ${roleConfig.titleGradient} bg-clip-text text-transparent`}>
              {roleConfig.shortTitle === 'Admin' 
                ? (currentLanguage === 'ar' ? 'لوحة تحكم المدير' : 'Admin Dashboard')
                : `${getLocalizedText('app.name')} ${roleConfig.shortTitle}`
              }
            </h1>
            
            <div className="flex items-center space-x-2 rtl:space-x-reverse">
              <div className={`w-2 h-2 ${roleConfig.statusDot} rounded-full animate-pulse`}></div>
              
              {/* Notifications Bell for Mobile */}
              <NotificationsBell
                size="small"
                showLabel={false}
                className="flex-shrink-0"
                onNavigate={onNavigate}
              />
              
              {onEmergencyAlertsClick && (
                <CosmicButton variant="ghost" size="sm" onClick={onEmergencyAlertsClick}>
                  <Bell className="w-5 h-5" />
                </CosmicButton>
              )}
            </div>
          </div>
        </div>

        {/* Desktop header */}
        <div className="hidden lg:block flex-shrink-0 sticky top-0 z-20 bg-gray-900/80 backdrop-blur-md border-b border-white/10 p-4">
          <div className="flex items-center justify-between">
            <h1 className={`text-xl font-bold bg-gradient-to-r ${roleConfig.titleGradient} bg-clip-text text-transparent`}>
              {roleConfig.shortTitle === 'Admin' 
                ? (currentLanguage === 'ar' ? 'لوحة تحكم المدير' : 'Admin Dashboard')
                : `${getLocalizedText('app.name')} ${roleConfig.shortTitle}`
              }
            </h1>
            
            <div className="flex items-center space-x-4 rtl:space-x-reverse">
              <div className="flex items-center space-x-2 rtl:space-x-reverse">
                <div className={`w-2 h-2 ${roleConfig.statusDot} rounded-full animate-pulse`}></div>
                <span className="text-sm text-gray-400">Online</span>
              </div>
              
              {/* Notifications Bell */}
              <NotificationsBell
                size="medium"
                showLabel={false}
                className="flex-shrink-0"
                onNavigate={onNavigate}
              />
              
              {onEmergencyAlertsClick && (
                <CosmicButton variant="ghost" size="sm" onClick={onEmergencyAlertsClick}>
                  <Bell className="w-5 h-5" />
                </CosmicButton>
              )}
            </div>
          </div>
        </div>

        {/* Main content container - Scrollable with proper bounds */}
        <main className="
          flex-1 
          min-h-0 
          overflow-y-auto overflow-x-hidden
          hide-scrollbar
        ">
          <div className="
            min-h-full 
            p-4 sm:p-6 lg:p-8
            container mx-auto max-w-full
          ">
            <div className="min-h-0 h-full">
              {children}
            </div>
          </div>
        </main>
      </div>
    </MainLayout>
  );
};

export default UnifiedDashboardLayout; 