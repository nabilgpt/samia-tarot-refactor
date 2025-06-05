import React from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Home, 
  Users,
  Shield,
  User,
  Star,
  MessageCircle,
  Settings,
  BarChart3,
  DollarSign,
  AlertTriangle,
  FileText,
  Database,
  Eye
} from 'lucide-react';
import UnifiedDashboardLayout from './UnifiedDashboardLayout';
import { getDashboardRoleConfig, getDashboardQuickStats } from '../../utils/dashboardRoleConfigs.jsx';
import { useUI } from '../../context/UIContext';

const AdminLayout = ({ children, onEmergencyAlertsClick }) => {
  const { t } = useTranslation();
  const { language } = useUI();

  const roleConfig = getDashboardRoleConfig('admin', language);
  const quickStats = getDashboardQuickStats('admin', language);

  const navigation = [
    { name: language === 'ar' ? 'لوحة التحكم' : 'Dashboard', href: '/admin', icon: Home },
    { name: language === 'ar' ? 'إدارة المستخدمين' : 'User Management', href: '/admin/users', icon: Users },
    { name: language === 'ar' ? 'إدارة القراء' : 'Reader Management', href: '/admin/readers', icon: Eye },
    { name: language === 'ar' ? 'التقارير المالية' : 'Financial Reports', href: '/admin/finances', icon: DollarSign },
    { name: language === 'ar' ? 'الإحصائيات' : 'Analytics', href: '/admin/analytics', icon: BarChart3 },
    { name: language === 'ar' ? 'المراجعات' : 'Reviews', href: '/admin/reviews', icon: Star },
    { name: language === 'ar' ? 'الرسائل' : 'Messages', href: '/admin/messages', icon: MessageCircle },
    { name: language === 'ar' ? 'التقارير' : 'Reports', href: '/admin/reports', icon: FileText },
    { name: language === 'ar' ? 'الحوادث' : 'Incidents', href: '/admin/incidents', icon: AlertTriangle },
    { name: language === 'ar' ? 'النظام' : 'System', href: '/admin/system', icon: Database },
    { name: language === 'ar' ? 'الأمان' : 'Security', href: '/admin/security', icon: Shield },
    { name: language === 'ar' ? 'الملف الشخصي' : 'Profile', href: '/admin/profile', icon: User },
    { name: language === 'ar' ? 'الإعدادات' : 'Settings', href: '/admin/settings', icon: Settings },
  ];

  return (
    <UnifiedDashboardLayout
      roleConfig={roleConfig}
      navigationItems={navigation}
      quickStats={quickStats}
      onEmergencyAlertsClick={onEmergencyAlertsClick}
    >
      {children}
    </UnifiedDashboardLayout>
  );
};

export default AdminLayout; 