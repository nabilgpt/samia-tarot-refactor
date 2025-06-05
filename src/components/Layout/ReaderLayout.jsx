import React from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Home, 
  Calendar,
  DollarSign,
  User,
  Star,
  MessageCircle,
  Settings,
  Clock,
  TrendingUp,
  Users,
  Eye
} from 'lucide-react';
import UnifiedDashboardLayout from './UnifiedDashboardLayout';
import { getDashboardRoleConfig, getDashboardQuickStats } from '../../utils/dashboardRoleConfigs.jsx';
import { useUI } from '../../context/UIContext';

const ReaderLayout = ({ children }) => {
  const { t } = useTranslation();
  const { language } = useUI();

  const roleConfig = getDashboardRoleConfig('reader', language);
  const quickStats = getDashboardQuickStats('reader', language);

  const navigation = [
    { name: language === 'ar' ? 'لوحة التحكم' : 'Dashboard', href: '/reader', icon: Home },
    { name: language === 'ar' ? 'الجلسات' : 'Sessions', href: '/reader/sessions', icon: Eye },
    { name: language === 'ar' ? 'المواعيد' : 'Schedule', href: '/reader/schedule', icon: Calendar },
    { name: language === 'ar' ? 'العملاء' : 'Clients', href: '/reader/clients', icon: Users },
    { name: language === 'ar' ? 'التقييمات' : 'Reviews', href: '/reader/reviews', icon: Star },
    { name: language === 'ar' ? 'الرسائل' : 'Messages', href: '/reader/messages', icon: MessageCircle },
    { name: language === 'ar' ? 'الأرباح' : 'Earnings', href: '/reader/earnings', icon: DollarSign },
    { name: language === 'ar' ? 'الإحصائيات' : 'Analytics', href: '/reader/analytics', icon: TrendingUp },
    { name: language === 'ar' ? 'الساعات المتاحة' : 'Availability', href: '/reader/availability', icon: Clock },
    { name: language === 'ar' ? 'الملف الشخصي' : 'Profile', href: '/reader/profile', icon: User },
    { name: language === 'ar' ? 'الإعدادات' : 'Settings', href: '/reader/settings', icon: Settings },
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

export default ReaderLayout; 