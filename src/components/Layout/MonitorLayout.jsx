import React from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  const { language } = useUI();

  const roleConfig = getDashboardRoleConfig('monitor', language);
  const quickStats = getDashboardQuickStats('monitor', language);

  const navigation = [
    { name: language === 'ar' ? 'لوحة المراقبة' : 'Monitor Dashboard', href: '/monitor', icon: Home },
    { name: language === 'ar' ? 'المراقبة المباشرة' : 'Live Monitoring', href: '/monitor/live', icon: Activity },
    { name: language === 'ar' ? 'مراقبة الجلسات' : 'Session Monitoring', href: '/monitor/sessions', icon: Eye },
    { name: language === 'ar' ? 'مراقبة الرسائل' : 'Message Monitoring', href: '/monitor/messages', icon: MessageCircle },
    { name: language === 'ar' ? 'التقارير' : 'Reports', href: '/monitor/reports', icon: Flag },
    { name: language === 'ar' ? 'الحوادث' : 'Incidents', href: '/monitor/incidents', icon: AlertTriangle },
    { name: language === 'ar' ? 'مراجعة المحتوى' : 'Content Review', href: '/monitor/content', icon: FileText },
    { name: language === 'ar' ? 'مراقبة المستخدمين' : 'User Monitoring', href: '/monitor/users', icon: Users },
    { name: language === 'ar' ? 'تقييم المراجعات' : 'Review Moderation', href: '/monitor/review-moderation', icon: Star },
    { name: language === 'ar' ? 'السجلات' : 'Logs', href: '/monitor/logs', icon: Clock },
    { name: language === 'ar' ? 'الإعدادات' : 'Settings', href: '/monitor/settings', icon: Settings },
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