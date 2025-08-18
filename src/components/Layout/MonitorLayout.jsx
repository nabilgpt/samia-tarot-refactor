import React from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { 
  Home, 
  Activity,
  Eye,
  MessageCircle,
  AlertTriangle,
  Flag,
  Users,
  Star,
  FileText,
  Settings,
  Clock
} from 'lucide-react';
import UnifiedDashboardLayout from './UnifiedDashboardLayout';
import { getDashboardRoleConfig, getDashboardQuickStats } from '../../utils/dashboardRoleConfigs.jsx';
import { useUI } from '../../context/UIContext';

const MonitorLayout = ({ children }) => {
  const { currentLanguage, direction, isRtl, getLocalizedText } = useLanguage();
  const { language } = useUI();

  const roleConfig = getDashboardRoleConfig('monitor', language);
  const quickStats = getDashboardQuickStats('monitor', language);

  const navigation = [
    { name: getLocalizedText('navigation.monitoring'), href: '/monitor', icon: Home },
    { name: getLocalizedText('navigation.liveMonitoring'), href: '/monitor/live', icon: Activity },
    { name: getLocalizedText('navigation.sessionMonitoring'), href: '/monitor/sessions', icon: Eye },
    { name: getLocalizedText('navigation.messageMonitoring'), href: '/monitor/messages', icon: MessageCircle },
    { name: getLocalizedText('navigation.reports'), href: '/monitor/reports', icon: Flag },
    { name: getLocalizedText('navigation.incidents'), href: '/monitor/incidents', icon: AlertTriangle },
    { name: getLocalizedText('navigation.contentReview'), href: '/monitor/content', icon: FileText },
    { name: getLocalizedText('navigation.userMonitoring'), href: '/monitor/users', icon: Users },
    { name: getLocalizedText('navigation.reviewModeration'), href: '/monitor/review-moderation', icon: Star },
    { name: getLocalizedText('navigation.logs'), href: '/monitor/logs', icon: Clock },
    { name: getLocalizedText('navigation.settings'), href: '/monitor/settings', icon: Settings },
  ];

  return (
    <UnifiedDashboardLayout
      roleConfig={roleConfig}
      navigationItems={navigation}
      quickStats={quickStats}
    >
      {children}
    </UnifiedDashboardLayout>
  );
};

export default MonitorLayout; 