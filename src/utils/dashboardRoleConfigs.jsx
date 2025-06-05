import { 
  Shield, 
  Eye, 
  ShieldCheckIcon,
  Star
} from 'lucide-react';
import { StarIcon } from '@heroicons/react/24/outline';

// Define Monitor icon since it's not available in lucide-react
const Monitor = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);

export const getDashboardRoleConfig = (role, language) => {
  const configs = {
    super_admin: {
      icon: StarIcon,
      title: language === 'ar' ? 'سوبر أدمن' : 'Super Admin',
      subtitle: language === 'ar' ? 'تحكم كامل' : 'Full Control',
      shortTitle: 'Super Admin',
      iconGradient: 'from-purple-500 to-pink-500',
      titleGradient: 'from-purple-400 to-pink-400',
      activeGradient: 'from-purple-500/20 to-pink-500/20',
      activeText: 'text-purple-300',
      activeBorder: 'border-purple-400/30',
      focusRing: 'focus:ring-purple-400/50',
      focusBorder: 'focus:border-purple-400/50',
      statusDot: 'bg-purple-400',
      searchPlaceholder: language === 'ar' ? 'البحث في السوبر أدمن...' : 'Search super admin...',
      statusSection: {
        label: language === 'ar' ? 'حالة النظام' : 'System Status',
        icon: ShieldCheckIcon,
        iconColor: 'text-green-400',
        textColor: 'text-green-400',
        value: 'Active'
      }
    },
    admin: {
      icon: Shield,
      title: language === 'ar' ? 'لوحة الإدارة' : 'Admin Panel',
      subtitle: language === 'ar' ? 'إدارة النظام' : 'System Control',
      shortTitle: 'Admin',
      iconGradient: 'from-red-500 to-pink-500',
      titleGradient: 'from-red-400 to-pink-400',
      activeGradient: 'from-red-500/20 to-pink-500/20',
      activeText: 'text-red-300',
      activeBorder: 'border-red-400/30',
      focusRing: 'focus:ring-red-400/50',
      focusBorder: 'focus:border-red-400/50',
      statusDot: 'bg-red-400',
      searchPlaceholder: language === 'ar' ? 'البحث في الإدارة...' : 'Search admin...',
      statusSection: {
        label: language === 'ar' ? 'حالة النظام' : 'System Status',
        icon: null,
        iconColor: 'text-green-400',
        textColor: 'text-green-400',
        value: 'Online'
      }
    },
    reader: {
      icon: Eye,
      title: language === 'ar' ? 'منطقة القارئ' : 'Reader Portal',
      subtitle: language === 'ar' ? 'مساعدة الناس' : 'Helping people',
      shortTitle: 'Reader',
      iconGradient: 'from-cosmic-500 to-purple-500',
      titleGradient: 'from-cosmic-400 to-purple-400',
      activeGradient: 'from-cosmic-500/20 to-purple-500/20',
      activeText: 'text-cosmic-300',
      activeBorder: 'border-cosmic-400/30',
      focusRing: 'focus:ring-cosmic-400/50',
      focusBorder: 'focus:border-cosmic-400/50',
      statusDot: 'bg-green-400',
      searchPlaceholder: language === 'ar' ? 'البحث...' : 'Search...',
      statusSection: {
        label: language === 'ar' ? 'متاح للعمل' : 'Available for readings',
        icon: null,
        iconColor: 'text-green-400',
        textColor: 'text-green-400',
        value: 'Active'
      }
    },
    monitor: {
      icon: Monitor,
      title: language === 'ar' ? 'لوحة المراقبة' : 'Monitor Panel',
      subtitle: language === 'ar' ? 'مراقبة ومتابعة' : 'Watch & Moderate',
      shortTitle: 'Monitor',
      iconGradient: 'from-blue-500 to-cyan-500',
      titleGradient: 'from-blue-400 to-cyan-400',
      activeGradient: 'from-blue-500/20 to-cyan-500/20',
      activeText: 'text-blue-300',
      activeBorder: 'border-blue-400/30',
      focusRing: 'focus:ring-blue-400/50',
      focusBorder: 'focus:border-blue-400/50',
      statusDot: 'bg-blue-400',
      searchPlaceholder: language === 'ar' ? 'البحث في المراقبة...' : 'Search monitoring...',
      statusSection: {
        label: language === 'ar' ? 'حالة المراقبة' : 'Monitor Status',
        icon: ShieldCheckIcon,
        iconColor: 'text-green-400',
        textColor: 'text-green-400',
        value: 'Active'
      }
    },
    client: {
      icon: Star,
      title: language === 'ar' ? 'منطقة العميل' : 'Client Portal',
      subtitle: language === 'ar' ? 'مرحباً بك' : 'Welcome back',
      shortTitle: 'Client',
      iconGradient: 'from-gold-500 to-cosmic-500',
      titleGradient: 'from-gold-400 to-cosmic-400',
      activeGradient: 'from-gold-500/20 to-cosmic-500/20',
      activeText: 'text-gold-300',
      activeBorder: 'border-gold-400/30',
      focusRing: 'focus:ring-gold-400/50',
      focusBorder: 'focus:border-gold-400/50',
      statusDot: 'bg-gold-400',
      searchPlaceholder: language === 'ar' ? 'البحث...' : 'Search...',
      statusSection: {
        label: language === 'ar' ? 'حالة الحساب' : 'Account Status',
        icon: null,
        iconColor: 'text-green-400',
        textColor: 'text-green-400',
        value: 'Active'
      }
    }
  };

  return configs[role] || configs.admin;
};

export const getDashboardQuickStats = (role, language, statsData = {}) => {
  const statConfigs = {
    super_admin: [
      {
        label: language === 'ar' ? 'إجمالي المستخدمين' : 'Total Users',
        value: statsData.totalUsers || '2,847',
        gradient: 'from-purple-500/20 to-pink-500/20',
        borderColor: 'border-purple-400/30',
        textColor: 'text-purple-300'
      },
      {
        label: language === 'ar' ? 'النظام' : 'System',
        value: statsData.systemHealth || '98%',
        gradient: 'from-green-500/20 to-emerald-500/20',
        borderColor: 'border-green-400/30',
        textColor: 'text-green-300'
      }
    ],
    admin: [
      {
        label: language === 'ar' ? 'المستخدمين النشطين' : 'Active Users',
        value: statsData.activeUsers || '2,847',
        gradient: 'from-green-500/20 to-emerald-500/20',
        borderColor: 'border-green-400/30',
        textColor: 'text-green-300'
      },
      {
        label: language === 'ar' ? 'التنبيهات' : 'Alerts',
        value: statsData.alerts || '12',
        gradient: 'from-red-500/20 to-pink-500/20',
        borderColor: 'border-red-400/30',
        textColor: 'text-red-300'
      }
    ],
    reader: [
      {
        label: language === 'ar' ? 'الجلسات اليوم' : 'Today',
        value: statsData.todaySessions || '8',
        gradient: 'from-gold-500/20 to-cosmic-500/20',
        borderColor: 'border-gold-400/30',
        textColor: 'text-gold-300'
      },
      {
        label: language === 'ar' ? 'التقييم' : 'Rating',
        value: statsData.rating || '4.9⭐',
        gradient: 'from-green-500/20 to-blue-500/20',
        borderColor: 'border-green-400/30',
        textColor: 'text-green-300'
      }
    ],
    monitor: [
      {
        label: language === 'ar' ? 'الجلسات النشطة' : 'Active Sessions',
        value: statsData.activeSessions || '156',
        gradient: 'from-blue-500/20 to-cyan-500/20',
        borderColor: 'border-blue-400/30',
        textColor: 'text-blue-300'
      },
      {
        label: language === 'ar' ? 'التقارير' : 'Reports',
        value: statsData.reports || '7',
        gradient: 'from-orange-500/20 to-red-500/20',
        borderColor: 'border-orange-400/30',
        textColor: 'text-orange-300'
      }
    ],
    client: [
      {
        label: language === 'ar' ? 'الجلسات المكتملة' : 'Completed Sessions',
        value: statsData.completedSessions || '24',
        gradient: 'from-gold-500/20 to-cosmic-500/20',
        borderColor: 'border-gold-400/30',
        textColor: 'text-gold-300'
      },
      {
        label: language === 'ar' ? 'النقاط المكتسبة' : 'Points Earned',
        value: statsData.pointsEarned || '1,250',
        gradient: 'from-cosmic-500/20 to-purple-500/20',
        borderColor: 'border-cosmic-400/30',
        textColor: 'text-cosmic-300'
      }
    ]
  };

  return statConfigs[role] || [];
}; 