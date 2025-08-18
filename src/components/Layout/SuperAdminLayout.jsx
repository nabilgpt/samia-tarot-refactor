import React from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { 
  StarIcon,
  UsersIcon, 
  CogIcon, 
  EyeIcon, 
  CircleStackIcon,
  CurrencyDollarIcon,
  ClipboardDocumentListIcon,
  UserIcon
} from '@heroicons/react/24/outline';
import UnifiedDashboardLayout from './UnifiedDashboardLayout';
import { getDashboardRoleConfig, getDashboardQuickStats } from '../../utils/dashboardRoleConfigs.jsx';
import { useUI } from '../../context/UIContext';

const SuperAdminLayout = ({ children, activeTab, setActiveTab }) => {
  const { currentLanguage, direction, isRtl, getLocalizedText } = useLanguage();
  const { language } = useUI();

  // Create fallback roleConfig to ensure layout always renders
  const defaultRoleConfig = {
    icon: StarIcon,
    title: 'Super Admin',
    subtitle: 'Full Control',
    shortTitle: 'Super Admin',
    iconGradient: 'from-purple-500 to-pink-500',
    titleGradient: 'from-purple-400 to-pink-400',
    activeGradient: 'from-purple-500/20 to-pink-500/20',
    activeText: 'text-purple-300',
    activeBorder: 'border-purple-400/30',
    focusRing: 'focus:ring-purple-400/50',
    focusBorder: 'focus:border-purple-400/50',
    statusDot: 'bg-purple-400',
    searchPlaceholder: 'Search super admin...',
    statusSection: {
      label: 'System Status',
      icon: null,
      iconColor: 'text-green-400',
      textColor: 'text-green-400',
      value: 'Active'
    }
  };

  const defaultQuickStats = [
    {
      label: 'Total Users',
      value: '---',
      gradient: 'from-purple-500/20 to-pink-500/20',
      borderColor: 'border-purple-400/30',
      textColor: 'text-purple-300'
    },
    {
      label: 'System',
      value: 'Loading...',
      gradient: 'from-green-500/20 to-emerald-500/20',
      borderColor: 'border-green-400/30',
      textColor: 'text-green-300'
    }
  ];

  // Safely get role config with fallback
  let roleConfig;
  let quickStats;
  
  try {
    roleConfig = getDashboardRoleConfig('super_admin', language || 'en');
    quickStats = getDashboardQuickStats('super_admin', language || 'en');
    
    // Ensure we have valid config
    if (!roleConfig || !roleConfig.icon) {
      roleConfig = defaultRoleConfig;
    }
    if (!quickStats || !Array.isArray(quickStats)) {
      quickStats = defaultQuickStats;
    }
  } catch (error) {
    console.error('Error loading dashboard config:', error);
    roleConfig = defaultRoleConfig;
    quickStats = defaultQuickStats;
  }

  // For Super Admin, we use navigation that mimics tabs
  const navigation = [
    { name: 'User Management', href: '#users', icon: UsersIcon, tabId: 'users' },
    { name: 'System Settings', href: '#system', icon: CogIcon, tabId: 'system' },
    { name: 'Real-Time Controls', href: '#realtime', icon: EyeIcon, tabId: 'realtime' },
    { name: 'Database Management', href: '#database', icon: CircleStackIcon, tabId: 'database' },
    { name: 'Financial Controls', href: '#financial', icon: CurrencyDollarIcon, tabId: 'financial' },
    { name: 'Audit Logs', href: '#audit', icon: ClipboardDocumentListIcon, tabId: 'audit' },
    { name: 'User Impersonation', href: '#impersonation', icon: UserIcon, tabId: 'impersonation' }
  ];

  // Override navigation click behavior for tab switching
  const handleNavClick = (e, item) => {
    e.preventDefault();
    if (setActiveTab && item.tabId) {
      setActiveTab(item.tabId);
    }
  };

  // Modify navigation items to include click handlers
  const enhancedNavigation = navigation.map(item => ({
    ...item,
    onClick: (e) => handleNavClick(e, item),
    isActive: activeTab === item.tabId
  }));

  return (
    <UnifiedDashboardLayout
      roleConfig={roleConfig}
      navigationItems={enhancedNavigation}
      quickStats={quickStats}
      isTabBased={true}
      activeTab={activeTab}
    >
      {children}
    </UnifiedDashboardLayout>
  );
};

export default SuperAdminLayout; 