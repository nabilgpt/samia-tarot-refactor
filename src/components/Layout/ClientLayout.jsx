import React from 'react';
import { useLanguage } from '../../context/LanguageContext';
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
  const { currentLanguage, direction, isRtl, getLocalizedText } = useLanguage();
  const { language } = useUI();

  const roleConfig = getDashboardRoleConfig('client', language);
  const quickStats = getDashboardQuickStats('client', language);

  const navigation = [
    { name: getLocalizedText('navigation.clientDashboard'), href: '/client', icon: Home },
    { name: getLocalizedText('navigation.bookings'), href: '/client/bookings', icon: Calendar },
    { name: getLocalizedText('navigation.favoriteReaders'), href: '/client/favorites', icon: Heart },
    { name: getLocalizedText('navigation.myReviews'), href: '/client/reviews', icon: Star },
    { name: getLocalizedText('navigation.messages'), href: '/client/messages', icon: MessageCircle },
    { name: getLocalizedText('navigation.wallet'), href: '/client/wallet', icon: CreditCard },
    { name: getLocalizedText('navigation.profile'), href: '/client/profile', icon: User },
    { name: getLocalizedText('navigation.settings'), href: '/client/settings', icon: Settings },
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