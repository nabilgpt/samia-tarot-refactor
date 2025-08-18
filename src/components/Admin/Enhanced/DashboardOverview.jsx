import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { 
  Users, 
  Calendar, 
  CreditCard, 
  Star, 
  TrendingUp, 
  Activity,
  Clock,
  AlertCircle,
  Eye,
  UserCheck,
  Settings,
  Shield,
  Bell,
  BarChart3
} from 'lucide-react';
import { useUI } from '../../../context/UIContext';
import api from '../../../services/frontendApi.js';

const DashboardOverview = () => {
  const { t } = useTranslation();
  const { language } = useUI();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalReaders: 0,
    totalBookings: 0,
    totalRevenue: 0,
    activeUsers: 0,
    pendingApprovals: 0,
    emergencyAlerts: 0,
    systemHealth: 98
  });

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        delayChildren: 0.1,
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 12
      }
    }
  };

  useEffect(() => {
    loadDashboardStats();
  }, []);

  const loadDashboardStats = async () => {
    const abortController = new AbortController();
    try {
      setLoading(true);
      const response = await api.getAdminStats({ signal: abortController.signal });
      if (response.success) {
        setStats(response.data);
      } else {
        console.error('Failed to load admin stats:', response.status);
        setStats({
          totalUsers: 0,
          totalReaders: 0,
          totalBookings: 0,
          totalRevenue: 0,
          activeUsers: 0,
          pendingApprovals: 0,
          emergencyAlerts: 0,
          systemHealth: 0
        });
      }
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
      setStats({
        totalUsers: 0,
        totalReaders: 0,
        totalBookings: 0,
        totalRevenue: 0,
        activeUsers: 0,
        pendingApprovals: 0,
        emergencyAlerts: 0,
        systemHealth: 0
      });
    } finally {
      setLoading(false);
    }
  };

  const statsCards = [
    {
      title: language === 'ar' ? 'إجمالي المستخدمين' : 'Total Users',
      value: stats.totalUsers,
      icon: Users,
      gradient: 'from-blue-500 via-purple-500 to-cyan-500',
      change: '+12.5%',
      changeType: 'positive'
    },
    {
      title: language === 'ar' ? 'القراء النشطون' : 'Active Readers',
      value: stats.totalReaders,
      icon: UserCheck,
      gradient: 'from-green-500 via-emerald-500 to-teal-500',
      change: '+8.2%',
      changeType: 'positive'
    },
    {
      title: language === 'ar' ? 'الحجوزات اليوم' : 'Today\'s Bookings',
      value: stats.totalBookings,
      icon: Calendar,
      gradient: 'from-orange-500 via-red-500 to-pink-500',
      change: '+15.7%',
      changeType: 'positive'
    },
    {
      title: language === 'ar' ? 'الإيرادات الشهرية' : 'Monthly Revenue',
      value: `$${(stats.totalRevenue || 0).toLocaleString()}`,
      icon: CreditCard,
      gradient: 'from-yellow-500 via-orange-500 to-red-500',
      change: '+23.1%',
      changeType: 'positive'
    },
    {
      title: language === 'ar' ? 'المستخدمون المتصلون' : 'Active Users',
      value: stats.activeUsers,
      icon: Activity,
      gradient: 'from-green-500 via-lime-500 to-emerald-500',
      change: 'Live',
      changeType: 'live'
    },
    {
      title: language === 'ar' ? 'الموافقات المعلقة' : 'Pending Approvals',
      value: stats.pendingApprovals,
      icon: Clock,
      gradient: 'from-yellow-500 via-amber-500 to-orange-500',
      change: stats.pendingApprovals > 10 ? 'High' : 'Normal',
      changeType: stats.pendingApprovals > 10 ? 'warning' : 'neutral'
    },
    {
      title: language === 'ar' ? 'تنبيهات الطوارئ' : 'Emergency Alerts',
      value: stats.emergencyAlerts,
      icon: AlertCircle,
      gradient: 'from-red-500 via-pink-500 to-rose-500',
      change: stats.emergencyAlerts > 0 ? 'Active' : 'Clear',
      changeType: stats.emergencyAlerts > 0 ? 'warning' : 'positive'
    },
    {
      title: language === 'ar' ? 'صحة النظام' : 'System Health',
      value: `${stats.systemHealth}%`,
      icon: BarChart3,
      gradient: 'from-emerald-500 via-green-500 to-teal-500',
      change: 'Excellent',
      changeType: 'positive'
    }
  ];

  const quickActions = [
    {
      title: language === 'ar' ? 'إدارة المستخدمين' : 'Manage Users',
      description: language === 'ar' ? 'عرض وتعديل المستخدمين' : 'View and edit users',
      icon: Users,
      color: 'purple',
      action: 'users'
    },
    {
      title: language === 'ar' ? 'مراجعة الحجوزات' : 'Review Bookings',
      description: language === 'ar' ? 'إدارة الحجوزات اليومية' : 'Manage daily bookings',
      icon: Calendar,
      color: 'blue',
      action: 'bookings'
    },
    {
      title: language === 'ar' ? 'طابور الموافقات' : 'Approval Queue',
      description: language === 'ar' ? 'موافقة طلبات القراء' : 'Approve reader requests',
      icon: Shield,
      color: 'green',
      action: 'approvals'
    },
    {
      title: language === 'ar' ? 'إرسال إشعار' : 'Send Notification',
      description: language === 'ar' ? 'إشعار جماعي للمستخدمين' : 'Broadcast to users',
      icon: Bell,
      color: 'indigo',
      action: 'notifications'
    },
    {
      title: language === 'ar' ? 'المراقبة المباشرة' : 'Live Monitoring',
      description: language === 'ar' ? 'مراقبة الجلسات النشطة' : 'Monitor active sessions',
      icon: Eye,
      color: 'cyan',
      action: 'monitoring'
    },
    {
      title: language === 'ar' ? 'إعدادات الخدمات' : 'Service Settings',
      description: language === 'ar' ? 'تكوين الخدمات المتاحة' : 'Configure available services',
      icon: Settings,
      color: 'pink',
      action: 'services'
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold-400"></div>
      </div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8"
    >
      {/* Title and Description */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-red-400 bg-clip-text text-transparent">
          {language === 'ar' ? 'نظرة عامة' : 'Overview'}
        </h2>
        <p className="text-gray-400 mt-1">
          {language === 'ar' ? 'مرحباً بك في نظام إدارة سامية تاروت' : 'Welcome to Samia Tarot Management System'}
        </p>
      </div>


      {/* Stats Grid */}
      <motion.div
        variants={containerVariants}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        {statsCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={index}
              variants={itemVariants}
              whileHover={{ scale: 1.02, y: -5 }}
              className="relative group"
            >
              <div className="glassmorphism rounded-2xl p-6 shadow-cosmic hover:shadow-2xl transition-all duration-300 border border-white/10 overflow-hidden">
                {/* Background gradient */}
                <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient} opacity-5 group-hover:opacity-10 transition-opacity duration-300`}></div>
                
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <div className={`p-3 rounded-xl bg-gradient-to-br ${card.gradient} shadow-lg`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <div className={`text-xs font-medium px-2 py-1 rounded-full ${
                      card.changeType === 'positive' ? 'bg-green-500/20 text-green-400' :
                      card.changeType === 'warning' ? 'bg-yellow-500/20 text-yellow-400' :
                      card.changeType === 'live' ? 'bg-blue-500/20 text-blue-400 animate-pulse' :
                      'bg-gray-500/20 text-gray-400'
                    }`}>
                      {card.change}
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-gray-400 text-sm font-medium mb-1">
                      {card.title}
                    </p>
                    <p className="text-3xl font-bold text-white">
                      {card.value}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        variants={itemVariants}
        className="glassmorphism rounded-2xl p-8 shadow-cosmic border border-white/10"
      >
        <h3 className="text-2xl font-bold text-gold-300 mb-6">
          {language === 'ar' ? 'الإجراءات السريعة' : 'Quick Actions'}
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {quickActions.map((action, index) => {
            const Icon = action.icon;
            return (
              <motion.button
                key={index}
                variants={itemVariants}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`group p-6 rounded-xl bg-gradient-to-br from-${action.color}-500/10 to-${action.color}-600/10 border border-${action.color}-500/30 hover:border-${action.color}-400/50 transition-all duration-300 text-left`}
              >
                <div className="flex items-start space-x-4">
                  <div className={`p-3 rounded-lg bg-${action.color}-500/20 group-hover:bg-${action.color}-500/30 transition-colors`}>
                    <Icon className={`w-6 h-6 text-${action.color}-400`} />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-white group-hover:text-gold-300 transition-colors">
                      {action.title}
                    </h4>
                    <p className="text-sm text-gray-400 mt-1">
                      {action.description}
                    </p>
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>
      </motion.div>

      {/* Recent Activity */}
      <motion.div
        variants={itemVariants}
        className="glassmorphism rounded-2xl p-8 shadow-cosmic border border-white/10"
      >
        <h3 className="text-2xl font-bold text-gold-300 mb-6">
          {language === 'ar' ? 'النشاط الأخير' : 'Recent Activity'}
        </h3>
        
        <div className="space-y-4">
          {[
            {
              action: language === 'ar' ? 'تسجيل مستخدم جديد' : 'New user registration',
              user: 'Sarah Ahmed',
              time: language === 'ar' ? 'منذ 5 دقائق' : '5 minutes ago',
              type: 'user'
            },
            {
              action: language === 'ar' ? 'حجز جديد مكتمل' : 'New booking completed',
              user: 'Mohamed Ali',
              time: language === 'ar' ? 'منذ 12 دقيقة' : '12 minutes ago',
              type: 'booking'
            },
            {
              action: language === 'ar' ? 'طلب موافقة من قارئ' : 'Reader approval request',
              user: 'Fatima Hassan',
              time: language === 'ar' ? 'منذ 25 دقيقة' : '25 minutes ago',
              type: 'approval'
            },
            {
              action: language === 'ar' ? 'دفعة جديدة مستلمة' : 'New payment received',
              user: 'Ahmad Omar',
              time: language === 'ar' ? 'منذ 1 ساعة' : '1 hour ago',
              type: 'payment'
            }
          ].map((activity, index) => (
            <div key={index} className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className={`w-2 h-2 rounded-full ${
                  activity.type === 'user' ? 'bg-blue-400' :
                  activity.type === 'booking' ? 'bg-green-400' :
                  activity.type === 'approval' ? 'bg-yellow-400' :
                  'bg-purple-400'
                }`}></div>
                <div>
                  <p className="text-white font-medium">{activity.action}</p>
                  <p className="text-gray-400 text-sm">{activity.user}</p>
                </div>
              </div>
              <span className="text-gray-400 text-sm">{activity.time}</span>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default DashboardOverview; 