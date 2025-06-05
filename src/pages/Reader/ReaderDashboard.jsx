import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { 
  Calendar,
  DollarSign,
  Star,
  Users,
  Clock,
  Eye,
  TrendingUp,
  MessageCircle,
  Activity,
  Zap,
  Gift,
  Target
} from 'lucide-react';
import ReaderLayout from '../../components/Layout/ReaderLayout';
import CosmicCard from '../../components/UI/CosmicCard';
import CosmicButton from '../../components/UI/CosmicButton';
import { useUI } from '../../context/UIContext';

const ReaderDashboard = () => {
  const { t } = useTranslation();
  const { language } = useUI();

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

  const todaySchedule = [
    {
      id: 1,
      client: language === 'ar' ? 'سارة أحمد' : 'Sarah Ahmed',
      time: '10:00',
      type: language === 'ar' ? 'قراءة التاروت' : 'Tarot Reading',
      duration: '30 min',
      status: 'confirmed'
    },
    {
      id: 2,
      client: language === 'ar' ? 'محمد علي' : 'Mohamed Ali',
      time: '14:30',
      type: language === 'ar' ? 'علم التنجيم' : 'Astrology',
      duration: '45 min',
      status: 'pending'
    },
    {
      id: 3,
      client: language === 'ar' ? 'فاطمة نور' : 'Fatima Nour',
      time: '16:00',
      type: language === 'ar' ? 'علم الأرقام' : 'Numerology',
      duration: '30 min',
      status: 'confirmed'
    }
  ];

  const recentClients = [
    {
      id: 1,
      name: language === 'ar' ? 'ليلى حسن' : 'Layla Hassan',
      rating: 5,
      session: language === 'ar' ? 'قراءة التاروت' : 'Tarot Reading',
      time: language === 'ar' ? 'منذ ساعتين' : '2 hours ago'
    },
    {
      id: 2,
      name: language === 'ar' ? 'أحمد محمود' : 'Ahmed Mahmoud',
      rating: 4,
      session: language === 'ar' ? 'علم التنجيم' : 'Astrology',
      time: language === 'ar' ? 'أمس' : 'Yesterday'
    }
  ];

  const quickActions = [
    {
      title: language === 'ar' ? 'بدء جلسة مباشرة' : 'Start Live Session',
      description: language === 'ar' ? 'ابدأ جلسة فورية مع العملاء المتاحين' : 'Start instant session with available clients',
      icon: <Eye className="w-6 h-6" />,
      color: 'from-cosmic-500 to-purple-500',
      href: '/reader/live-session'
    },
    {
      title: language === 'ar' ? 'إدارة الجدول' : 'Manage Schedule',
      description: language === 'ar' ? 'نظم أوقاتك وجلساتك القادمة' : 'Organize your time and upcoming sessions',
      icon: <Calendar className="w-6 h-6" />,
      color: 'from-gold-500 to-yellow-500',
      href: '/reader/schedule'
    },
    {
      title: language === 'ar' ? 'عرض الأرباح' : 'View Earnings',
      description: language === 'ar' ? 'تتبع دخلك وإحصائياتك المالية' : 'Track your income and financial stats',
      icon: <DollarSign className="w-6 h-6" />,
      color: 'from-green-500 to-emerald-500',
      href: '/reader/earnings'
    },
    {
      title: language === 'ar' ? 'الرسائل' : 'Messages',
      description: language === 'ar' ? 'تواصل مع عملائك والرد على استفساراتهم' : 'Communicate with clients and answer inquiries',
      icon: <MessageCircle className="w-6 h-6" />,
      color: 'from-cyan-500 to-blue-500',
      href: '/reader/messages'
    }
  ];

  const stats = [
    {
      label: language === 'ar' ? 'جلسات اليوم' : 'Today\'s Sessions',
      value: '8',
      icon: <Eye className="w-5 h-5" />,
      color: 'text-cosmic-400',
      change: '+2'
    },
    {
      label: language === 'ar' ? 'الأرباح اليومية' : 'Daily Earnings',
      value: '$240',
      icon: <DollarSign className="w-5 h-5" />,
      color: 'text-green-400',
      change: '+15%'
    },
    {
      label: language === 'ar' ? 'متوسط التقييم' : 'Avg Rating',
      value: '4.9',
      icon: <Star className="w-5 h-5" />,
      color: 'text-gold-400',
      change: '+0.1'
    },
    {
      label: language === 'ar' ? 'العملاء الجدد' : 'New Clients',
      value: '12',
      icon: <Users className="w-5 h-5" />,
      color: 'text-pink-400',
      change: '+3'
    }
  ];

  const performanceMetrics = [
    {
      label: language === 'ar' ? 'معدل الاستجابة' : 'Response Rate',
      value: '98%',
      color: 'bg-green-500'
    },
    {
      label: language === 'ar' ? 'رضا العملاء' : 'Client Satisfaction',
      value: '96%',
      color: 'bg-gold-500'
    },
    {
      label: language === 'ar' ? 'نسبة الإكمال' : 'Completion Rate',
      value: '94%',
      color: 'bg-cosmic-500'
    }
  ];

  return (
    <ReaderLayout>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-8"
      >
        {/* Welcome Header */}
        <motion.div variants={itemVariants} className="text-center">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">
            <span className="bg-gradient-to-r from-cosmic-400 via-purple-400 to-gold-400 bg-clip-text text-transparent">
              {language === 'ar' ? 'أهلاً بك مدام سامية' : 'Welcome Back, Madame Samia'}
            </span>
          </h1>
          <p className="text-gray-400 text-lg">
            {language === 'ar' 
              ? 'ساعد عملائك على اكتشاف طريقهم وتحقيق أهدافهم الروحانية' 
              : 'Help your clients discover their path and achieve their spiritual goals'
            }
          </p>
        </motion.div>

        {/* Stats Cards */}
        <motion.div variants={itemVariants}>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat, index) => (
              <CosmicCard key={index} className="p-6" variant="feature" glow>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 rtl:space-x-reverse">
                    <div className={`${stat.color}`}>
                      {stat.icon}
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-white">{stat.value}</div>
                      <div className="text-sm text-gray-400">{stat.label}</div>
                    </div>
                  </div>
                  <div className="text-green-400 text-sm font-medium">
                    {stat.change}
                  </div>
                </div>
              </CosmicCard>
            ))}
          </div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div variants={itemVariants}>
          <h2 className="text-2xl font-bold mb-6 text-cosmic-300">
            {language === 'ar' ? 'إجراءات سريعة' : 'Quick Actions'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {quickActions.map((action, index) => (
              <motion.div
                key={index}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <CosmicCard className="p-6 h-full cursor-pointer" hover glow>
                  <div className={`w-12 h-12 bg-gradient-to-br ${action.color} rounded-xl flex items-center justify-center mb-4`}>
                    {action.icon}
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">{action.title}</h3>
                  <p className="text-gray-400 text-sm">{action.description}</p>
                </CosmicCard>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Today's Schedule */}
          <motion.div variants={itemVariants} className="lg:col-span-2">
            <CosmicCard className="p-6" variant="primary">
              <h3 className="text-xl font-bold text-white mb-6 flex items-center">
                <Calendar className="w-6 h-6 mr-3 rtl:mr-0 rtl:ml-3 text-cosmic-400" />
                {language === 'ar' ? 'جدول اليوم' : 'Today\'s Schedule'}
              </h3>
              <div className="space-y-4">
                {todaySchedule.map((session) => (
                  <div key={session.id} className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10">
                    <div className="flex items-center space-x-4 rtl:space-x-reverse">
                      <div className="w-12 h-12 bg-gradient-to-br from-cosmic-500 to-purple-500 rounded-full flex items-center justify-center">
                        <span className="text-white font-bold">
                          {session.client.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <h4 className="font-semibold text-white">{session.client}</h4>
                        <p className="text-gray-400 text-sm">{session.type} • {session.duration}</p>
                      </div>
                    </div>
                    <div className="text-right rtl:text-left">
                      <div className="text-cosmic-400 font-semibold">{session.time}</div>
                      <div className={`text-sm px-2 py-1 rounded-full ${
                        session.status === 'confirmed' 
                          ? 'bg-green-500/20 text-green-400' 
                          : 'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {session.status === 'confirmed' 
                          ? (language === 'ar' ? 'مؤكد' : 'Confirmed')
                          : (language === 'ar' ? 'في الانتظار' : 'Pending')
                        }
                      </div>
                    </div>
                  </div>
                ))}
                <CosmicButton variant="cosmic" className="w-full">
                  <Calendar className="w-4 h-4 mr-2 rtl:mr-0 rtl:ml-2" />
                  {language === 'ar' ? 'عرض الجدول كاملاً' : 'View Full Schedule'}
                </CosmicButton>
              </div>
            </CosmicCard>
          </motion.div>

          {/* Performance Metrics */}
          <motion.div variants={itemVariants}>
            <CosmicCard className="p-6" variant="gold">
              <h3 className="text-xl font-bold text-white mb-6 flex items-center">
                <TrendingUp className="w-6 h-6 mr-3 rtl:mr-0 rtl:ml-3 text-gold-400" />
                {language === 'ar' ? 'مؤشرات الأداء' : 'Performance Metrics'}
              </h3>
              <div className="space-y-6">
                {performanceMetrics.map((metric, index) => (
                  <div key={index}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white font-medium text-sm">{metric.label}</span>
                      <span className="text-gold-400 font-bold">{metric.value}</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${metric.color}`}
                        style={{ width: metric.value }}
                      ></div>
                    </div>
                  </div>
                ))}
                <CosmicButton variant="secondary" className="w-full">
                  <Activity className="w-4 h-4 mr-2 rtl:mr-0 rtl:ml-2" />
                  {language === 'ar' ? 'عرض التحليلات' : 'View Analytics'}
                </CosmicButton>
              </div>
            </CosmicCard>
          </motion.div>
        </div>

        {/* Recent Clients & Notifications */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Clients */}
          <motion.div variants={itemVariants}>
            <CosmicCard className="p-6" variant="glass">
              <h3 className="text-xl font-bold text-white mb-6 flex items-center">
                <Users className="w-6 h-6 mr-3 rtl:mr-0 rtl:ml-3 text-cyan-400" />
                {language === 'ar' ? 'العملاء الحاليون' : 'Recent Clients'}
              </h3>
              <div className="space-y-4">
                {recentClients.map((client) => (
                  <div key={client.id} className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                    <div className="flex items-center space-x-3 rtl:space-x-reverse">
                      <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-full flex items-center justify-center">
                        <span className="text-white font-bold text-sm">
                          {client.name.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <h4 className="font-medium text-white text-sm">{client.name}</h4>
                        <p className="text-gray-400 text-xs">{client.session}</p>
                      </div>
                    </div>
                    <div className="text-right rtl:text-left">
                      <div className="flex items-center space-x-1 rtl:space-x-reverse mb-1">
                        {[...Array(5)].map((_, i) => (
                          <Star 
                            key={i} 
                            className={`w-3 h-3 ${
                              i < client.rating ? 'text-gold-400 fill-current' : 'text-gray-600'
                            }`} 
                          />
                        ))}
                      </div>
                      <div className="text-gray-400 text-xs">{client.time}</div>
                    </div>
                  </div>
                ))}
                <CosmicButton variant="outline" className="w-full">
                  <Users className="w-4 h-4 mr-2 rtl:mr-0 rtl:ml-2" />
                  {language === 'ar' ? 'عرض جميع العملاء' : 'View All Clients'}
                </CosmicButton>
              </div>
            </CosmicCard>
          </motion.div>

          {/* Goals & Achievements */}
          <motion.div variants={itemVariants}>
            <CosmicCard className="p-6" variant="feature">
              <h3 className="text-xl font-bold text-white mb-6 flex items-center">
                <Target className="w-6 h-6 mr-3 rtl:mr-0 rtl:ml-3 text-green-400" />
                {language === 'ar' ? 'الأهداف والإنجازات' : 'Goals & Achievements'}
              </h3>
              <div className="space-y-4">
                <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
                  <div className="flex items-center space-x-3 rtl:space-x-reverse">
                    <Gift className="w-5 h-5 text-green-400" />
                    <div>
                      <h4 className="text-green-400 font-semibold">
                        {language === 'ar' ? 'إنجاز جديد!' : 'New Achievement!'}
                      </h4>
                      <p className="text-gray-300 text-sm">
                        {language === 'ar' ? '100 جلسة مكتملة هذا الشهر' : '100 sessions completed this month'}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="p-4 bg-gold-500/10 border border-gold-500/30 rounded-xl">
                  <div className="flex items-center space-x-3 rtl:space-x-reverse">
                    <Zap className="w-5 h-5 text-gold-400" />
                    <div>
                      <h4 className="text-gold-400 font-semibold">
                        {language === 'ar' ? 'الهدف الشهري' : 'Monthly Goal'}
                      </h4>
                      <p className="text-gray-300 text-sm">
                        {language === 'ar' ? '75% - $1,500 من أصل $2,000' : '75% - $1,500 of $2,000'}
                      </p>
                      <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
                        <div className="h-2 rounded-full bg-gold-500" style={{ width: '75%' }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CosmicCard>
          </motion.div>
        </div>
      </motion.div>
    </ReaderLayout>
  );
};

export default ReaderDashboard; 