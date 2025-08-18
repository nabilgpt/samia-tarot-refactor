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
  Eye,
  CreditCard,
  Wand2,
  Bell,
  CheckCircle,
  Monitor,
  TrendingUp,
  HelpCircle,
  Calendar,
  ThumbsUp
} from 'lucide-react';

/**
 * Unified Navigation Configuration
 * This configuration separates items by type to control where they appear
 */

/**
 * Main navigation items - appear in both sidebar and top tabs
 */
export const getMainNavigationItems = (language = 'en', onTabChange = null) => {
  const isArabic = language === 'ar';
  
  return [
    {
      key: 'overview',
      type: 'main',
      label: isArabic ? 'نظرة عامة' : 'Overview',
      icon: Home,
      href: '/dashboard/admin',
      tabId: 'overview',
      onClick: onTabChange ? () => onTabChange('overview') : null
    },
    {
      key: 'readers',
      type: 'main',
      label: isArabic ? 'القراء' : 'Readers',
      icon: Eye,
      href: '/dashboard/admin',
      tabId: 'readers',
      onClick: onTabChange ? () => onTabChange('readers') : null
    },
    {
      key: 'tarot',
      type: 'main',
      label: isArabic ? 'التاروت' : 'Tarot',
      icon: Wand2,
      href: '/dashboard/admin',
      tabId: 'tarot',
      onClick: onTabChange ? () => onTabChange('tarot') : null
    },
    {
      key: 'services',
      type: 'main',
      label: isArabic ? 'الخدمات' : 'Services',
      icon: Star,
      href: '/dashboard/admin',
      tabId: 'services',
      onClick: onTabChange ? () => onTabChange('services') : null
    },
    {
      key: 'reviews',
      type: 'main',
      label: isArabic ? 'التقييمات' : 'Reviews',
      icon: ThumbsUp,
      href: '/dashboard/admin',
      tabId: 'reviews',
      onClick: onTabChange ? () => onTabChange('reviews') : null
    },
    {
      key: 'approvals',
      type: 'main',
      label: isArabic ? 'الموافقات' : 'Approvals',
      icon: CheckCircle,
      href: '/dashboard/admin',
      tabId: 'approvals',
      onClick: onTabChange ? () => onTabChange('approvals') : null
    },
    {
      key: 'monitoring',
      type: 'main',
      label: isArabic ? 'المراقبة' : 'Monitoring',
      icon: Monitor,
      href: '/dashboard/admin',
      tabId: 'monitoring',
      onClick: onTabChange ? () => onTabChange('monitoring') : null
    },
    {
      key: 'users',
      type: 'main',
      label: isArabic ? 'المستخدمين' : 'Users',
      icon: Users,
      href: '/dashboard/admin',
      tabId: 'users',
      onClick: onTabChange ? () => onTabChange('users') : null
    },
    {
      key: 'bookings',
      type: 'main',
      label: isArabic ? 'الحجوزات' : 'Bookings',
      icon: Calendar,
      href: '/dashboard/admin',
      tabId: 'bookings',
      onClick: onTabChange ? () => onTabChange('bookings') : null
    },
    {
      key: 'payments',
      type: 'main',
      label: isArabic ? 'المدفوعات' : 'Payments',
      icon: CreditCard,
      href: '/dashboard/admin',
      tabId: 'payments',
      onClick: onTabChange ? () => onTabChange('payments') : null
    },
    {
      key: 'analytics',
      type: 'main',
      label: isArabic ? 'الإحصائيات' : 'Analytics',
      icon: TrendingUp,
      href: '/dashboard/admin',
      tabId: 'analytics',
      onClick: onTabChange ? () => onTabChange('analytics') : null
    },
    {
      key: 'finances',
      type: 'main',
      label: isArabic ? 'الماليات' : 'Finance',
      icon: DollarSign,
      href: '/dashboard/admin',
      tabId: 'finances',
      onClick: onTabChange ? () => onTabChange('finances') : null
    },
    {
      key: 'reports',
      type: 'main',
      label: isArabic ? 'التقارير' : 'Reports',
      icon: FileText,
      href: '/dashboard/admin',
      tabId: 'reports',
      onClick: onTabChange ? () => onTabChange('reports') : null
    },
    {
      key: 'notifications',
      type: 'main',
      label: isArabic ? 'الإشعارات' : 'Notifications',
      icon: Bell,
      href: '/dashboard/admin',
      tabId: 'notifications',
      onClick: onTabChange ? () => onTabChange('notifications') : null
    },
    {
      key: 'messages',
      type: 'main',
      label: isArabic ? 'الرسائل' : 'Messages',
      icon: MessageCircle,
      href: '/dashboard/admin',
      tabId: 'messages',
      onClick: onTabChange ? () => onTabChange('messages') : null
    },
    {
      key: 'support',
      type: 'main',
      label: isArabic ? 'الدعم' : 'Support',
      icon: HelpCircle,
      href: '/dashboard/admin',
      tabId: 'support',
      onClick: onTabChange ? () => onTabChange('support') : null
    }
  ];
};

/**
 * System navigation items - appear in sidebar only
 */
export const getSystemNavigationItems = (language = 'en', onTabChange = null) => {
  const isArabic = language === 'ar';
  
  return [
    {
      key: 'incidents',
      type: 'system',
      label: isArabic ? 'الحوادث' : 'Incidents',
      icon: AlertTriangle,
      href: '/dashboard/admin',
      tabId: 'incidents',
      onClick: onTabChange ? () => onTabChange('incidents') : null
    },
    {
      key: 'system',
      type: 'system',
      label: isArabic ? 'النظام' : 'System',
      icon: Database,
      href: '/dashboard/admin',
      tabId: 'system',
      onClick: onTabChange ? () => onTabChange('system') : null
    },
    {
      key: 'security',
      type: 'system',
      label: isArabic ? 'الأمان' : 'Security',
      icon: Shield,
      href: '/dashboard/admin',
      tabId: 'security',
      onClick: onTabChange ? () => onTabChange('security') : null
    }
  ];
};

/**
 * Account navigation items - appear in sidebar only
 */
export const getAccountNavigationItems = (language = 'en', onTabChange = null) => {
  const isArabic = language === 'ar';
  
  return [
    {
      key: 'profile',
      type: 'account',
      label: isArabic ? 'الملف الشخصي' : 'Profile',
      icon: User,
      href: '/dashboard/admin',
      tabId: 'profile',
      onClick: onTabChange ? () => onTabChange('profile') : null
    },
    {
      key: 'settings',
      type: 'account',
      label: isArabic ? 'الإعدادات' : 'Settings',
      icon: Settings,
      href: '/dashboard/admin',
      tabId: 'settings',
      onClick: onTabChange ? () => onTabChange('settings') : null
    }
  ];
};

/**
 * Get navigation items for sidebar (includes all items)
 */
export const getSidebarNavigationItems = (language = 'en', onTabChange = null) => {
  return [
    ...getMainNavigationItems(language, onTabChange),
    ...getSystemNavigationItems(language, onTabChange),
    ...getAccountNavigationItems(language, onTabChange)
  ];
};

/**
 * Get navigation items for top tabs (only main items)
 */
export const getTabNavigationItems = (language = 'en') => {
  return getMainNavigationItems(language);
};

/**
 * Legacy function for backward compatibility
 */
export const getNavigationItems = (language = 'en') => {
  return getMainNavigationItems(language);
}; 