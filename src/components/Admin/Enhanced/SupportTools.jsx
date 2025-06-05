import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  HelpCircle, 
  MessageSquare, 
  FileText, 
  Settings, 
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  Clock,
  CheckCircle,
  User,
  Mail,
  Phone,
  AlertCircle,
  BookOpen,
  Wrench,
  Shield,
  Database
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useUI } from '../../../context/UIContext';

const SupportTools = () => {
  const { t } = useTranslation();
  const { language, showSuccess, showError } = useUI();
  const [activeTab, setActiveTab] = useState('faq');
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [faqItems, setFaqItems] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        delayChildren: 0.1,
        staggerChildren: 0.05
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
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      if (activeTab === 'faq') {
        // Mock FAQ data
        setFaqItems([
          {
            id: '1',
            question: language === 'ar' ? 'كيف يمكنني حجز جلسة تاروت؟' : 'How can I book a tarot session?',
            answer: language === 'ar' ? 'يمكنك حجز جلسة من خلال اختيار القارئ المناسب والوقت المتاح.' : 'You can book a session by selecting your preferred reader and available time slot.',
            category: 'booking',
            priority: 'high',
            created_at: '2024-01-15T10:30:00Z'
          },
          {
            id: '2',
            question: language === 'ar' ? 'ما هي طرق الدفع المقبولة؟' : 'What payment methods are accepted?',
            answer: language === 'ar' ? 'نقبل جميع البطاقات الائتمانية والمحافظ الرقمية.' : 'We accept all major credit cards and digital wallets.',
            category: 'payment',
            priority: 'medium',
            created_at: '2024-01-14T14:20:00Z'
          }
        ]);
      } else if (activeTab === 'tickets') {
        // Mock ticket data
        setTickets([
          {
            id: '1',
            title: language === 'ar' ? 'مشكلة في الدفع' : 'Payment Issue',
            description: language === 'ar' ? 'لا أستطيع إكمال عملية الدفع' : 'Unable to complete payment process',
            user: 'Sarah Ahmed',
            email: 'sarah@example.com',
            status: 'open',
            priority: 'high',
            category: 'payment',
            created_at: '2024-01-20T09:15:00Z'
          },
          {
            id: '2',
            title: language === 'ar' ? 'طلب استرداد' : 'Refund Request',
            description: language === 'ar' ? 'أريد استرداد مبلغ الجلسة الملغاة' : 'Want refund for cancelled session',
            user: 'Mohamed Ali',
            email: 'mohamed@example.com',
            status: 'resolved',
            priority: 'medium',
            category: 'refund',
            created_at: '2024-01-19T16:30:00Z'
          }
        ]);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    {
      id: 'faq',
      name: language === 'ar' ? 'الأسئلة الشائعة' : 'FAQ Management',
      icon: HelpCircle,
      gradient: 'from-blue-500 to-cyan-500'
    },
    {
      id: 'tickets',
      name: language === 'ar' ? 'إدارة التذاكر' : 'Support Tickets',
      icon: MessageSquare,
      gradient: 'from-green-500 to-emerald-500'
    },
    {
      id: 'knowledge',
      name: language === 'ar' ? 'قاعدة المعرفة' : 'Knowledge Base',
      icon: BookOpen,
      gradient: 'from-purple-500 to-pink-500'
    },
    {
      id: 'system',
      name: language === 'ar' ? 'إعدادات النظام' : 'System Settings',
      icon: Settings,
      gradient: 'from-orange-500 to-red-500'
    }
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case 'open': return 'text-red-400 bg-red-500/20 border-red-500/30';
      case 'in_progress': return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30';
      case 'resolved': return 'text-green-400 bg-green-500/20 border-green-500/30';
      case 'closed': return 'text-gray-400 bg-gray-500/20 border-gray-500/30';
      default: return 'text-gray-400 bg-gray-500/20 border-gray-500/30';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'text-red-400 bg-red-500/20 border-red-500/30';
      case 'medium': return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30';
      case 'low': return 'text-green-400 bg-green-500/20 border-green-500/30';
      default: return 'text-gray-400 bg-gray-500/20 border-gray-500/30';
    }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Header */}
      <motion.div
        variants={itemVariants}
        className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
      >
        <div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-violet-400 via-purple-400 to-indigo-400 bg-clip-text text-transparent">
            {language === 'ar' ? 'أدوات الدعم' : 'Support Tools'}
          </h2>
          <p className="text-gray-400 mt-1">
            {language === 'ar' ? 'إدارة الدعم الفني والمساعدة للمستخدمين' : 'Manage technical support and user assistance'}
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowAddModal(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-violet-500 to-purple-500 text-white rounded-lg hover:from-violet-600 hover:to-purple-600 transition-colors shadow-lg"
          >
            <Plus className="w-4 h-4" />
            <span>
              {activeTab === 'faq' ? (language === 'ar' ? 'إضافة سؤال' : 'Add FAQ') : 
               activeTab === 'tickets' ? (language === 'ar' ? 'تذكرة جديدة' : 'New Ticket') :
               (language === 'ar' ? 'إضافة عنصر' : 'Add Item')}
            </span>
          </motion.button>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <motion.div
        variants={containerVariants}
        className="grid grid-cols-1 md:grid-cols-4 gap-6"
      >
        {[
          {
            title: language === 'ar' ? 'التذاكر المفتوحة' : 'Open Tickets',
            value: tickets.filter(t => t.status === 'open').length,
            icon: MessageSquare,
            color: 'from-red-500 to-pink-500'
          },
          {
            title: language === 'ar' ? 'الأسئلة الشائعة' : 'FAQ Items',
            value: faqItems.length,
            icon: HelpCircle,
            color: 'from-blue-500 to-cyan-500'
          },
          {
            title: language === 'ar' ? 'معدل الحل' : 'Resolution Rate',
            value: '94%',
            icon: CheckCircle,
            color: 'from-green-500 to-emerald-500'
          },
          {
            title: language === 'ar' ? 'متوسط وقت الرد' : 'Avg Response Time',
            value: '2.5h',
            icon: Clock,
            color: 'from-orange-500 to-red-500'
          }
        ].map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={index}
              variants={itemVariants}
              whileHover={{ scale: 1.02, y: -5 }}
              className="glassmorphism rounded-2xl p-6 border border-white/10 hover:border-gold-400/30 transition-all duration-300"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm font-medium mb-1">
                    {stat.title}
                  </p>
                  <p className="text-2xl font-bold text-white">
                    {stat.value}
                  </p>
                </div>
                <div className={`w-12 h-12 bg-gradient-to-br ${stat.color} rounded-xl flex items-center justify-center shadow-lg`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Tab Navigation */}
      <motion.div
        variants={itemVariants}
        className="glassmorphism rounded-2xl p-6 border border-white/10"
      >
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <motion.button
                key={tab.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-4 py-3 rounded-xl transition-all duration-300 ${
                  isActive
                    ? `bg-gradient-to-r ${tab.gradient} shadow-lg text-white`
                    : 'bg-white/5 hover:bg-white/10 text-gray-300'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{tab.name}</span>
              </motion.button>
            );
          })}
        </div>
      </motion.div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          {/* FAQ Management Tab */}
          {activeTab === 'faq' && (
            <div className="space-y-6">
              {/* Search and Filters */}
              <div className="glassmorphism rounded-2xl p-6 border border-white/10">
                <div className="flex flex-col lg:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder={language === 'ar' ? 'البحث في الأسئلة الشائعة...' : 'Search FAQ items...'}
                        className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-gold-400/50 transition-colors"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* FAQ Items */}
              <div className="space-y-4">
                {faqItems.map((item) => (
                  <motion.div
                    key={item.id}
                    variants={itemVariants}
                    whileHover={{ scale: 1.01, y: -2 }}
                    className="glassmorphism rounded-2xl p-6 border border-white/10 hover:border-gold-400/30 transition-all duration-300"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-3">
                          <h3 className="text-lg font-semibold text-white mb-2">
                            {item.question}
                          </h3>
                          <span className={`px-2 py-1 rounded-lg text-xs font-medium border ${getPriorityColor(item.priority)}`}>
                            {item.priority.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-gray-400 mb-3">{item.answer}</p>
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          <span>{language === 'ar' ? 'الفئة:' : 'Category:'} {item.category}</span>
                          <span>{language === 'ar' ? 'تاريخ الإنشاء:' : 'Created:'} {new Date(item.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 ml-4">
                        <button className="p-2 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button className="p-2 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button className="p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Support Tickets Tab */}
          {activeTab === 'tickets' && (
            <div className="space-y-6">
              {/* Search and Filters */}
              <div className="glassmorphism rounded-2xl p-6 border border-white/10">
                <div className="flex flex-col lg:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder={language === 'ar' ? 'البحث في التذاكر...' : 'Search tickets...'}
                        className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-gold-400/50 transition-colors"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Tickets List */}
              <div className="space-y-4">
                {tickets.map((ticket) => (
                  <motion.div
                    key={ticket.id}
                    variants={itemVariants}
                    whileHover={{ scale: 1.01, y: -2 }}
                    className="glassmorphism rounded-2xl p-6 border border-white/10 hover:border-gold-400/30 transition-all duration-300"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4 flex-1">
                        <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center">
                          <MessageSquare className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h3 className="text-lg font-semibold text-white mb-1">
                                {ticket.title}
                              </h3>
                              <p className="text-sm text-gray-400 mb-2">
                                {ticket.description}
                              </p>
                              <div className="flex items-center space-x-4 text-xs text-gray-500">
                                <span className="flex items-center space-x-1">
                                  <User className="w-4 h-4" />
                                  <span>{ticket.user}</span>
                                </span>
                                <span className="flex items-center space-x-1">
                                  <Mail className="w-4 h-4" />
                                  <span>{ticket.email}</span>
                                </span>
                                <span className="flex items-center space-x-1">
                                  <Clock className="w-4 h-4" />
                                  <span>{new Date(ticket.created_at).toLocaleDateString()}</span>
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className={`px-2 py-1 rounded-lg text-xs font-medium border ${getPriorityColor(ticket.priority)}`}>
                                {ticket.priority.toUpperCase()}
                              </span>
                              <span className={`px-2 py-1 rounded-lg text-xs font-medium border ${getStatusColor(ticket.status)}`}>
                                {ticket.status.toUpperCase()}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 ml-4">
                        <button className="p-2 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button className="p-2 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors">
                          <MessageSquare className="w-4 h-4" />
                        </button>
                        <button className="p-2 rounded-lg bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 transition-colors">
                          <CheckCircle className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Knowledge Base Tab */}
          {activeTab === 'knowledge' && (
            <div className="glassmorphism rounded-2xl p-8 border border-white/10">
              <h3 className="text-xl font-bold text-gold-300 mb-6">
                {language === 'ar' ? 'قاعدة المعرفة' : 'Knowledge Base'}
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[
                  {
                    title: language === 'ar' ? 'دليل المستخدم' : 'User Guide',
                    description: language === 'ar' ? 'دليل شامل لاستخدام المنصة' : 'Comprehensive platform usage guide',
                    icon: BookOpen,
                    color: 'from-blue-500 to-cyan-500',
                    articles: 25
                  },
                  {
                    title: language === 'ar' ? 'أسئلة التقنية' : 'Technical Issues',
                    description: language === 'ar' ? 'حلول للمشاكل التقنية الشائعة' : 'Solutions for common technical problems',
                    icon: Wrench,
                    color: 'from-orange-500 to-red-500',
                    articles: 18
                  },
                  {
                    title: language === 'ar' ? 'الأمان والخصوصية' : 'Security & Privacy',
                    description: language === 'ar' ? 'معلومات حول الأمان والخصوصية' : 'Information about security and privacy',
                    icon: Shield,
                    color: 'from-green-500 to-emerald-500',
                    articles: 12
                  }
                ].map((category, index) => {
                  const Icon = category.icon;
                  return (
                    <motion.div
                      key={index}
                      whileHover={{ scale: 1.05 }}
                      className={`p-6 rounded-xl bg-gradient-to-br ${category.color} opacity-80 hover:opacity-100 transition-opacity cursor-pointer`}
                    >
                      <Icon className="w-8 h-8 text-white mb-3" />
                      <h4 className="text-white font-semibold mb-2">{category.title}</h4>
                      <p className="text-white/80 text-sm mb-3">{category.description}</p>
                      <p className="text-white/60 text-xs">{category.articles} {language === 'ar' ? 'مقال' : 'articles'}</p>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}

          {/* System Settings Tab */}
          {activeTab === 'system' && (
            <div className="glassmorphism rounded-2xl p-8 border border-white/10">
              <h3 className="text-xl font-bold text-gold-300 mb-6">
                {language === 'ar' ? 'إعدادات النظام' : 'System Settings'}
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[
                  {
                    title: language === 'ar' ? 'إعدادات البريد الإلكتروني' : 'Email Configuration',
                    description: language === 'ar' ? 'تكوين خادم البريد الإلكتروني' : 'Configure email server settings',
                    icon: Mail,
                    color: 'from-blue-500 to-cyan-500'
                  },
                  {
                    title: language === 'ar' ? 'إعدادات الإشعارات' : 'Notification Settings',
                    description: language === 'ar' ? 'إدارة إعدادات الإشعارات' : 'Manage notification preferences',
                    icon: AlertCircle,
                    color: 'from-purple-500 to-pink-500'
                  },
                  {
                    title: language === 'ar' ? 'النسخ الاحتياطي' : 'Backup Settings',
                    description: language === 'ar' ? 'إعدادات النسخ الاحتياطي التلقائي' : 'Automatic backup configuration',
                    icon: Database,
                    color: 'from-green-500 to-emerald-500'
                  },
                  {
                    title: language === 'ar' ? 'إعدادات الأمان' : 'Security Settings',
                    description: language === 'ar' ? 'تكوين إعدادات الأمان والحماية' : 'Configure security and protection settings',
                    icon: Shield,
                    color: 'from-red-500 to-pink-500'
                  }
                ].map((setting, index) => {
                  const Icon = setting.icon;
                  return (
                    <motion.div
                      key={index}
                      whileHover={{ scale: 1.02 }}
                      className="bg-white/5 rounded-xl p-6 border border-white/10 hover:border-gold-400/30 transition-all duration-300 cursor-pointer"
                    >
                      <div className="flex items-start space-x-4">
                        <div className={`w-12 h-12 bg-gradient-to-br ${setting.color} rounded-xl flex items-center justify-center shadow-lg`}>
                          <Icon className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-white mb-2">{setting.title}</h4>
                          <p className="text-sm text-gray-400">{setting.description}</p>
                        </div>
                        <button className="text-gold-400 hover:text-gold-300 transition-colors">
                          <Settings className="w-5 h-5" />
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
};

export default SupportTools; 