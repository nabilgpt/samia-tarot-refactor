import React from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Home, 
  Calendar,
  CreditCard,
  User,
  Heart,
  Star,
  MessageCircle,
  Settings
} from 'lucide-react';
import UnifiedDashboardLayout from './UnifiedDashboardLayout';
import { getDashboardRoleConfig, getDashboardQuickStats } from '../../utils/dashboardRoleConfigs.jsx';
import { useUI } from '../../context/UIContext';

const ClientLayout = ({ children }) => {
  const { t } = useTranslation();
  const { language } = useUI();

  const roleConfig = getDashboardRoleConfig('client', language);
  const quickStats = getDashboardQuickStats('client', language);

  const navigation = [
    { name: language === 'ar' ? 'الرئيسية' : 'Dashboard', href: '/client', icon: Home },
    { name: language === 'ar' ? 'الحجوزات' : 'Bookings', href: '/client/bookings', icon: Calendar },
    { name: language === 'ar' ? 'القراء المفضلون' : 'Favorite Readers', href: '/client/favorites', icon: Heart },
    { name: language === 'ar' ? 'تقييماتي' : 'My Reviews', href: '/client/reviews', icon: Star },
    { name: language === 'ar' ? 'الرسائل' : 'Messages', href: '/client/messages', icon: MessageCircle },
    { name: language === 'ar' ? 'المحفظة' : 'Wallet', href: '/client/wallet', icon: CreditCard },
    { name: language === 'ar' ? 'الملف الشخصي' : 'Profile', href: '/client/profile', icon: User },
    { name: language === 'ar' ? 'الإعدادات' : 'Settings', href: '/client/settings', icon: Settings },
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

export default ClientLayout; 