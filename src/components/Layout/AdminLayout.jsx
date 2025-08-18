import React from 'react';
import { useLanguage } from '../../context/LanguageContext';
import UnifiedDashboardLayout from './UnifiedDashboardLayout';
import { getDashboardRoleConfig, getDashboardQuickStats } from '../../utils/dashboardRoleConfigs.jsx';
import { getSidebarNavigationItems } from '../../utils/navigationConfig.js';
import { useUI } from '../../context/UIContext';

const AdminLayout = ({ children, onEmergencyAlertsClick, onTabChange, activeTab }) => {
  const { currentLanguage, direction, isRtl } = useLanguage();
  const { } = useUI(); // Removed language - using LanguageContext instead

  const roleConfig = getDashboardRoleConfig('admin', currentLanguage);
  const quickStats = getDashboardQuickStats('admin', currentLanguage);

  // Get ALL navigation items from unified config (main + system + account)
  const navigationItems = getSidebarNavigationItems(currentLanguage, onTabChange);
  
  // Convert to format expected by UnifiedDashboardLayout
  const navigation = navigationItems.map(item => ({
    name: item.label,
    href: item.href,
    icon: item.icon,
    key: item.key,
    type: item.type,
    onClick: item.onClick,
    isActive: item.tabId === activeTab
  }));

  return (
    <UnifiedDashboardLayout
      roleConfig={roleConfig}
      navigationItems={navigation}
      quickStats={quickStats}
      onEmergencyAlertsClick={onEmergencyAlertsClick}
      onNavigate={onTabChange}
    >
      {children}
    </UnifiedDashboardLayout>
  );
};

export default AdminLayout; 