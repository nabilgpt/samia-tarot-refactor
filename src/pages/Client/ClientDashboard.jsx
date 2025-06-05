import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { 
  Calendar,
  Clock,
  Star,
  Heart,
  MessageCircle,
  Eye,
  CreditCard,
  TrendingUp,
  Users,
  Sparkles
} from 'lucide-react';
import ClientLayout from '../../components/Layout/ClientLayout';
import CosmicCard from '../../components/UI/CosmicCard';
import CosmicButton from '../../components/UI/CosmicButton';
import { useUI } from '../../context/UIContext';

const ClientDashboard = () => {
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

  const upcomingBookings = [
    {
      id: 1,
      reader: language === 'ar' ? 'الأستاذة نورا' : 'Nora Ahmad',
      type: language === 'ar' ? 'قراءة التاروت' : 'Tarot Reading',
      date: '2024-01-15',
      time: '14:30',
      avatar: '/api/placeholder/40/40'
    },
    {
      id: 2,
      reader: language === 'ar' ? 'الأستاذ أحمد' : 'Ahmed Hassan',
      type: language === 'ar' ? 'علم التنجيم' : 'Astrology',
      date: '2024-01-16',
      time: '16:00',
      avatar: '/api/placeholder/40/40'
    }
  ];

  const favoriteReaders = [
    {
      id: 1,
      name: language === 'ar' ? 'الأستاذة سارة' : 'Sarah Ali',
      rating: 4.9,
      speciality: language === 'ar' ? 'التاروت' : 'Tarot',
      status: 'online',
      avatar: '/api/placeholder/60/60'
    },
    {
      id: 2,
      name: language === 'ar' ? 'الأستاذ محمد' : 'Mohamed Khaled',
      rating: 4.8,
      speciality: language === 'ar' ? 'الأبراج' : 'Astrology',
      status: 'offline',
      avatar: '/api/placeholder/60/60'
    },
    {
      id: 3,
      name: language === 'ar' ? 'الأستاذة فاطمة' : 'Fatima Nour',
      rating: 4.7,
      speciality: language === 'ar' ? 'الأرقام' : 'Numerology',
      status: 'online',
      avatar: '/api/placeholder/60/60'
    }
  ];

  const recentActivity = [
    {
      id: 1,
      action: language === 'ar' ? 'جلسة تاروت مكتملة' : 'Tarot session completed',
      reader: language === 'ar' ? 'الأستاذة نورا' : 'Nora Ahmad',
      time: language === 'ar' ? 'منذ ساعتين' : '2 hours ago',
      rating: 5
    },
    {
      id: 2,
      action: language === 'ar' ? 'مراجعة مُضافة' : 'Review added',
      reader: language === 'ar' ? 'الأستاذ أحمد' : 'Ahmed Hassan',
      time: language === 'ar' ? 'أمس' : 'Yesterday',
      rating: 4
    }
  ];

  const quickActions = [
    {
      title: language === 'ar' ? 'حجز قراءة فورية' : 'Book Instant Reading',
      description: language === 'ar' ? 'احجز جلسة مع قارئ متاح الآن' : 'Book a session with an available reader now',
      icon: <Eye className="w-6 h-6" />,
      color: 'from-gold-500 to-yellow-500',
      href: '/client/instant-booking'
    },
    {
      title: language === 'ar' ? 'تصفح القراء' : 'Browse Readers',
      description: language === 'ar' ? 'اختر من بين مئات القراء المحترفين' : 'Choose from hundreds of professional readers',
      icon: <Users className="w-6 h-6" />,
      color: 'from-cosmic-500 to-purple-500',
      href: '/readers'
    },
    {
      title: language === 'ar' ? 'الرسائل' : 'Messages',
      description: language === 'ar' ? 'تحدث مع القراء والحصول على نصائح' : 'Chat with readers and get advice',
      icon: <MessageCircle className="w-6 h-6" />,
      color: 'from-cyan-500 to-blue-500',
      href: '/client/messages'
    },
    {
      title: language === 'ar' ? 'تاريخ الجلسات' : 'Session History',
      description: language === 'ar' ? 'مراجعة جلساتك السابقة' : 'Review your previous sessions',
      icon: <Clock className="w-6 h-6" />,
      color: 'from-green-500 to-emerald-500',
      href: '/client/history'
    }
  ];

  const stats = [
    {
      label: language === 'ar' ? 'الجلسات المكتملة' : 'Completed Sessions',
      value: '24',
      icon: <Eye className="w-5 h-5" />,
      color: 'text-gold-400'
    },
    {
      label: language === 'ar' ? 'القراء المفضلون' : 'Favorite Readers',
      value: '8',
      icon: <Heart className="w-5 h-5" />,
      color: 'text-pink-400'
    },
    {
      label: language === 'ar' ? 'النقاط المكتسبة' : 'Points Earned',
      value: '1,250',
      icon: <Star className="w-5 h-5" />,
      color: 'text-cosmic-400'
    },
    {
      label: language === 'ar' ? 'المبلغ المدفوع' : 'Total Spent',
      value: '$180',
      icon: <CreditCard className="w-5 h-5" />,
      color: 'text-cyan-400'
    }
  ];

  return (
    <ClientLayout>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-8"
      >
        {/* Welcome Header */}
        <motion.div variants={itemVariants} className="text-center">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">
            <span className="bg-gradient-to-r from-gold-400 via-cosmic-400 to-cyan-400 bg-clip-text text-transparent">
              {language === 'ar' ? 'أهلاً وسهلاً بك' : 'Welcome Back'}
            </span>
          </h1>
          <p className="text-gray-400 text-lg">
            {language === 'ar' 
              ? 'استكشف رحلتك الروحانية واكتشف أسرار مستقبلك' 
              : 'Explore your spiritual journey and discover your future mysteries'
            }
          </p>
        </motion.div>

        {/* Stats Cards */}
        <motion.div variants={itemVariants}>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat, index) => (
              <CosmicCard key={index} className="p-6" variant="feature" glow>
                <div className="flex items-center space-x-3 rtl:space-x-reverse">
                  <div className={`${stat.color}`}>
                    {stat.icon}
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-white">{stat.value}</div>
                    <div className="text-sm text-gray-400">{stat.label}</div>
                  </div>
                </div>
              </CosmicCard>
            ))}
          </div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div variants={itemVariants}>
          <h2 className="text-2xl font-bold mb-6 text-gold-300">
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
          {/* Upcoming Bookings */}
          <motion.div variants={itemVariants} className="lg:col-span-2">
            <CosmicCard className="p-6" variant="primary">
              <h3 className="text-xl font-bold text-white mb-6 flex items-center">
                <Calendar className="w-6 h-6 mr-3 rtl:mr-0 rtl:ml-3 text-gold-400" />
                {language === 'ar' ? 'المواعيد القادمة' : 'Upcoming Bookings'}
              </h3>
              <div className="space-y-4">
                {upcomingBookings.map((booking) => (
                  <div key={booking.id} className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10">
                    <div className="flex items-center space-x-4 rtl:space-x-reverse">
                      <div className="w-12 h-12 bg-gradient-to-br from-cosmic-500 to-purple-500 rounded-full flex items-center justify-center">
                        <span className="text-white font-bold">
                          {booking.reader.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <h4 className="font-semibold text-white">{booking.reader}</h4>
                        <p className="text-gray-400 text-sm">{booking.type}</p>
                      </div>
                    </div>
                    <div className="text-right rtl:text-left">
                      <div className="text-gold-400 font-semibold">{booking.time}</div>
                      <div className="text-gray-400 text-sm">{booking.date}</div>
                    </div>
                  </div>
                ))}
                <CosmicButton variant="cosmic" className="w-full">
                  <Calendar className="w-4 h-4 mr-2 rtl:mr-0 rtl:ml-2" />
                  {language === 'ar' ? 'عرض جميع المواعيد' : 'View All Bookings'}
                </CosmicButton>
              </div>
            </CosmicCard>
          </motion.div>

          {/* Favorite Readers */}
          <motion.div variants={itemVariants}>
            <CosmicCard className="p-6" variant="gold">
              <h3 className="text-xl font-bold text-white mb-6 flex items-center">
                <Heart className="w-6 h-6 mr-3 rtl:mr-0 rtl:ml-3 text-pink-400" />
                {language === 'ar' ? 'القراء المفضلون' : 'Favorite Readers'}
              </h3>
              <div className="space-y-4">
                {favoriteReaders.map((reader) => (
                  <div key={reader.id} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 rtl:space-x-reverse">
                      <div className="relative">
                        <div className="w-10 h-10 bg-gradient-to-br from-gold-500 to-cosmic-500 rounded-full flex items-center justify-center">
                          <span className="text-white font-bold text-sm">
                            {reader.name.charAt(0)}
                          </span>
                        </div>
                        <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full ${
                          reader.status === 'online' ? 'bg-green-400' : 'bg-gray-400'
                        }`}></div>
                      </div>
                      <div>
                        <h4 className="font-medium text-white text-sm">{reader.name}</h4>
                        <div className="flex items-center space-x-1 rtl:space-x-reverse">
                          <Star className="w-3 h-3 text-gold-400 fill-current" />
                          <span className="text-gold-400 text-xs">{reader.rating}</span>
                        </div>
                      </div>
                    </div>
                    <CosmicButton variant="outline" size="sm">
                      {language === 'ar' ? 'حجز' : 'Book'}
                    </CosmicButton>
                  </div>
                ))}
                <CosmicButton variant="secondary" className="w-full">
                  <Users className="w-4 h-4 mr-2 rtl:mr-0 rtl:ml-2" />
                  {language === 'ar' ? 'تصفح المزيد' : 'Browse More'}
                </CosmicButton>
              </div>
            </CosmicCard>
          </motion.div>
        </div>

        {/* Recent Activity */}
        <motion.div variants={itemVariants}>
          <CosmicCard className="p-6" variant="glass">
            <h3 className="text-xl font-bold text-white mb-6 flex items-center">
              <TrendingUp className="w-6 h-6 mr-3 rtl:mr-0 rtl:ml-3 text-green-400" />
              {language === 'ar' ? 'النشاط الأخير' : 'Recent Activity'}
            </h3>
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                  <div className="flex items-center space-x-4 rtl:space-x-reverse">
                    <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center">
                      <Sparkles className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h4 className="font-medium text-white">{activity.action}</h4>
                      <p className="text-gray-400 text-sm">{activity.reader}</p>
                    </div>
                  </div>
                  <div className="text-right rtl:text-left">
                    <div className="flex items-center space-x-1 rtl:space-x-reverse mb-1">
                      {[...Array(5)].map((_, i) => (
                        <Star 
                          key={i} 
                          className={`w-3 h-3 ${
                            i < activity.rating ? 'text-gold-400 fill-current' : 'text-gray-600'
                          }`} 
                        />
                      ))}
                    </div>
                    <div className="text-gray-400 text-sm">{activity.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </CosmicCard>
        </motion.div>
      </motion.div>
    </ClientLayout>
  );
};

export default ClientDashboard; 