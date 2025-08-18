import React from 'react';
import { useLanguage } from '../../context/LanguageContext';
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
  Eye,
  Sparkles,
  Award
} from 'lucide-react';
import UnifiedDashboardLayout from './UnifiedDashboardLayout';
import { getDashboardRoleConfig, getDashboardQuickStats } from '../../utils/dashboardRoleConfigs.jsx';
import { useUI } from '../../context/UIContext';

const ReaderLayout = ({ children }) => {
  const { currentLanguage, direction, isRtl } = useLanguage();
  const { } = useUI(); // Removed language - using LanguageContext instead

  const roleConfig = getDashboardRoleConfig('reader', currentLanguage);
  const quickStats = getDashboardQuickStats('reader', currentLanguage);

  const navigation = [
    { 
      name: currentLanguage === 'ar' ? 'لوحة التحكم' : 'Dashboard',
      href: '/reader', 
      icon: Home,
      description: currentLanguage === 'ar' ? 'عرض أساسي للإحصائيات والأنشطة' : 'Main overview of stats and activities'
    },
    { 
      name: currentLanguage === 'ar' ? 'الملف الشخصي' : 'Profile',
      href: '/reader?tab=profile', 
      icon: User,
      description: currentLanguage === 'ar' ? 'إدارة معلوماتك الشخصية' : 'Manage your personal information'
    },
    { 
      name: currentLanguage === 'ar' ? 'الخدمات' : 'Services',
      href: '/reader?tab=services', 
      icon: Settings,
      description: currentLanguage === 'ar' ? 'إدارة الخدمات المقدمة' : 'Manage your offered services'
    },
    { 
      name: currentLanguage === 'ar' ? 'انتشارات التاروت' : 'Tarot Spreads',
      href: '/reader?tab=spreads', 
      icon: Sparkles,
      description: currentLanguage === 'ar' ? 'إنشاء وإدارة انتشارات التاروت' : 'Create and manage tarot spreads'
    },
    { 
      name: currentLanguage === 'ar' ? 'ساعات العمل' : 'Working Hours',
      href: '/reader?tab=working-hours', 
      icon: Clock,
      description: currentLanguage === 'ar' ? 'إدارة الجدول الزمني المتاح' : 'Manage your availability schedule'
    },
    { 
      name: currentLanguage === 'ar' ? 'الحجوزات' : 'Bookings',
      href: '/reader?tab=bookings', 
      icon: Calendar,
      description: currentLanguage === 'ar' ? 'إدارة المواعيد والحجوزات' : 'Manage appointments and bookings'
    },
    { 
      name: currentLanguage === 'ar' ? 'الرسائل' : 'Messages',
      href: '/reader?tab=chat', 
      icon: MessageCircle,
      description: currentLanguage === 'ar' ? 'التواصل مع العملاء' : 'Chat with clients'
    },
    { 
      name: currentLanguage === 'ar' ? 'المكافآت' : 'Rewards',
      href: '/reader?tab=rewards', 
      icon: Award,
      description: currentLanguage === 'ar' ? 'نظام المكافآت والإنجازات' : 'Rewards and achievements system'
    },
    { 
      name: currentLanguage === 'ar' ? 'الأرباح' : 'Earnings',
      href: '/reader?tab=earnings', 
      icon: DollarSign,
      description: currentLanguage === 'ar' ? 'تتبع الأرباح والمدفوعات' : 'Track earnings and payments'
    },
    { 
      name: currentLanguage === 'ar' ? 'التقييمات' : 'Reviews',
      href: '/reader?tab=feedback', 
      icon: Star,
      description: currentLanguage === 'ar' ? 'تقييمات وآراء العملاء' : 'Client feedback and reviews'
    },
    { 
      name: currentLanguage === 'ar' ? 'التحليلات' : 'Analytics',
      href: '/reader?tab=analytics', 
      icon: TrendingUp,
      description: currentLanguage === 'ar' ? 'إحصائيات الأداء والتحليلات' : 'Performance analytics and insights'
    }
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