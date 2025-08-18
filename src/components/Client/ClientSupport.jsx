import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { 
  HelpCircle, 
  MessageSquare,
  Phone,
  Mail,
  Send,
  Search,
  Filter,
  MoreHorizontal,
  User,
  Clock,
  CheckCircle,
  AlertCircle,
  Book,
  FileText,
  Plus,
  X,
  ExternalLink,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { useUI } from '../../context/UIContext';

const ClientSupport = () => {
  const { t } = useTranslation();
  const { language, showSuccess, showError } = useUI();
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState([]);
  const [faqs, setFaqs] = useState([]);
  const [activeTab, setActiveTab] = useState('tickets');
  const [showNewTicketModal, setShowNewTicketModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedFaq, setExpandedFaq] = useState(null);
  const [newTicket, setNewTicket] = useState({
    subject: '',
    category: 'general',
    priority: 'medium',
    description: ''
  });

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
    loadSupportData();
  }, []);

  const loadSupportData = async () => {
    try {
      setLoading(true);
      
      const [ticketsResponse, faqsResponse] = await Promise.all([
        api.getSupportTickets(),
        api.getFAQs()
      ]);
      
      if (ticketsResponse.success) {
        setTickets(ticketsResponse.data);
      } else {
        console.error('Failed to load support tickets:', ticketsResponse.error);
        setTickets([]);
      }

      if (faqsResponse.success) {
        setFaqs(faqsResponse.data);
      } else {
        console.error('Failed to load FAQs:', faqsResponse.error);
        setFaqs([]);
      }
    } catch (error) {
      console.error('Error loading support data:', error);
      setTickets([]);
      setFaqs([]);
      showError(language === 'ar' ? 'فشل في تحميل بيانات الدعم' : 'Failed to load support data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitTicket = async () => {
    if (!newTicket.subject.trim() || !newTicket.description.trim()) {
      showError(language === 'ar' ? 'يرجى ملء جميع الحقول المطلوبة' : 'Please fill all required fields');
      return;
    }

    try {
      const ticket = {
        id: Date.now().toString(),
        subject: newTicket.subject,
        subject_ar: newTicket.subject,
        category: newTicket.category,
        priority: newTicket.priority,
        status: 'open',
        description: newTicket.description,
        description_ar: newTicket.description,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        responses: []
      };

      setTickets(prev => [ticket, ...prev]);
      setShowNewTicketModal(false);
      setNewTicket({ subject: '', category: 'general', priority: 'medium', description: '' });
      showSuccess(language === 'ar' ? 'تم إرسال التذكرة بنجاح' : 'Ticket submitted successfully');
    } catch (error) {
      showError(language === 'ar' ? 'فشل في إرسال التذكرة' : 'Failed to submit ticket');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'open': return 'text-blue-400 bg-blue-500/20';
      case 'in_progress': return 'text-yellow-400 bg-yellow-500/20';
      case 'resolved': return 'text-green-400 bg-green-500/20';
      case 'closed': return 'text-gray-400 bg-gray-500/20';
      default: return 'text-gray-400 bg-gray-500/20';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'text-red-400 bg-red-500/20';
      case 'medium': return 'text-yellow-400 bg-yellow-500/20';
      case 'low': return 'text-green-400 bg-green-500/20';
      default: return 'text-gray-400 bg-gray-500/20';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredTickets = tickets.filter(ticket => {
    if (!searchTerm) return true;
    const subject = language === 'ar' ? ticket.subject_ar : ticket.subject;
    const description = language === 'ar' ? ticket.description_ar : ticket.description;
    return subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
           description.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const filteredFaqs = faqs.filter(faq => {
    if (!searchTerm) return true;
    const question = language === 'ar' ? faq.question_ar : faq.question;
    const answer = language === 'ar' ? faq.answer_ar : faq.answer;
    return question.toLowerCase().includes(searchTerm.toLowerCase()) ||
           answer.toLowerCase().includes(searchTerm.toLowerCase());
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="relative">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400"></div>
          <div className="absolute inset-0 rounded-full border-2 border-purple-400/20"></div>
        </div>
        <span className="ml-4 text-gray-300">
          {language === 'ar' ? 'جاري تحميل الدعم...' : 'Loading support...'}
        </span>
      </div>
    );
  }

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
          <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
            {language === 'ar' ? 'الدعم والمساعدة' : 'Support & Help'}
          </h2>
          <p className="text-gray-400 mt-1">
            {language === 'ar' ? 'احصل على المساعدة وأجوبة على أسئلتك' : 'Get help and answers to your questions'}
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowNewTicketModal(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>{language === 'ar' ? 'تذكرة جديدة' : 'New Ticket'}</span>
          </button>
        </div>
      </motion.div>

      {/* Contact Options */}
      <motion.div
        variants={itemVariants}
        className="grid grid-cols-1 lg:grid-cols-3 gap-4"
      >
        <div className="glassmorphism rounded-xl p-4 border border-white/10 text-center">
          <MessageSquare className="w-8 h-8 text-purple-400 mx-auto mb-2" />
          <h3 className="font-semibold text-white mb-1">
            {language === 'ar' ? 'دردشة مباشرة' : 'Live Chat'}
          </h3>
          <p className="text-sm text-gray-400 mb-3">
            {language === 'ar' ? 'متاح 24/7' : 'Available 24/7'}
          </p>
          <button className="px-4 py-2 bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 transition-colors">
            {language === 'ar' ? 'بدء الدردشة' : 'Start Chat'}
          </button>
        </div>

        <div className="glassmorphism rounded-xl p-4 border border-white/10 text-center">
          <Mail className="w-8 h-8 text-blue-400 mx-auto mb-2" />
          <h3 className="font-semibold text-white mb-1">
            {language === 'ar' ? 'البريد الإلكتروني' : 'Email Support'}
          </h3>
          <p className="text-sm text-gray-400 mb-3">support@samia-tarot.com</p>
          <button className="px-4 py-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors">
            {language === 'ar' ? 'إرسال ايميل' : 'Send Email'}
          </button>
        </div>

        <div className="glassmorphism rounded-xl p-4 border border-white/10 text-center">
          <Phone className="w-8 h-8 text-green-400 mx-auto mb-2" />
          <h3 className="font-semibold text-white mb-1">
            {language === 'ar' ? 'الهاتف' : 'Phone Support'}
          </h3>
          <p className="text-sm text-gray-400 mb-3">+1 (555) 123-4567</p>
          <button className="px-4 py-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors">
            {language === 'ar' ? 'اتصل بنا' : 'Call Now'}
          </button>
        </div>
      </motion.div>

      {/* Tabs */}
      <motion.div
        variants={itemVariants}
        className="glassmorphism rounded-2xl p-6 border border-white/10"
      >
        <div className="flex items-center space-x-6 mb-6">
          <button
            onClick={() => setActiveTab('tickets')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
              activeTab === 'tickets'
                ? 'bg-purple-500/20 text-purple-400'
                : 'text-gray-400 hover:bg-white/10'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>{language === 'ar' ? 'تذاكر الدعم' : 'Support Tickets'}</span>
          </button>
          <button
            onClick={() => setActiveTab('faq')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
              activeTab === 'faq'
                ? 'bg-purple-500/20 text-purple-400'
                : 'text-gray-400 hover:bg-white/10'
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            <span>{language === 'ar' ? 'الأسئلة الشائعة' : 'FAQ'}</span>
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder={t('support.searchPlaceholder')}
            className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-400/50 transition-colors"
          />
        </div>

        {/* Content */}
        {activeTab === 'tickets' ? (
          <div className="space-y-4">
            {filteredTickets.map((ticket) => {
              const subject = language === 'ar' ? ticket.subject_ar : ticket.subject;
              const description = language === 'ar' ? ticket.description_ar : ticket.description;
              
              return (
                <motion.div
                  key={ticket.id}
                  variants={itemVariants}
                  whileHover={{ scale: 1.01, y: -2 }}
                  className="bg-white/5 rounded-xl p-4 border border-white/10 hover:border-purple-400/30 transition-all duration-300"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-white mb-1">{subject}</h3>
                      <p className="text-sm text-gray-400 mb-2 line-clamp-2">{description}</p>
                      <div className="flex items-center space-x-3">
                        <span className={`px-2 py-1 rounded-lg text-xs font-medium ${getStatusColor(ticket.status)}`}>
                          {ticket.status}
                        </span>
                        <span className={`px-2 py-1 rounded-lg text-xs font-medium ${getPriorityColor(ticket.priority)}`}>
                          {ticket.priority}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatDate(ticket.created_at)}
                        </span>
                      </div>
                    </div>
                    <button className="p-2 rounded-lg bg-gray-500/20 text-gray-400 hover:bg-gray-500/30 transition-colors">
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </div>
                  
                  {ticket.responses && ticket.responses.length > 0 && (
                    <div className="border-t border-white/10 pt-3">
                      <p className="text-xs text-gray-400 mb-2">
                        {language === 'ar' ? 'آخر رد:' : 'Latest Response:'}
                      </p>
                      <p className="text-sm text-gray-300">
                        {language === 'ar' ? ticket.responses[0].message_ar : ticket.responses[0].message}
                      </p>
                    </div>
                  )}
                </motion.div>
              );
            })}

            {filteredTickets.length === 0 && (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400">
                  {language === 'ar' ? 'لا توجد تذاكر دعم' : 'No support tickets found'}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredFaqs.map((faq) => {
              const question = language === 'ar' ? faq.question_ar : faq.question;
              const answer = language === 'ar' ? faq.answer_ar : faq.answer;
              const isExpanded = expandedFaq === faq.id;
              
              return (
                <motion.div
                  key={faq.id}
                  variants={itemVariants}
                  className="bg-white/5 rounded-xl border border-white/10"
                >
                  <button
                    onClick={() => setExpandedFaq(isExpanded ? null : faq.id)}
                    className="w-full flex items-center justify-between p-4 text-left hover:bg-white/5 transition-colors"
                  >
                    <h3 className="font-semibold text-white">{question}</h3>
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </button>
                  
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-white/10"
                      >
                        <div className="p-4">
                          <p className="text-gray-300 leading-relaxed">{answer}</p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}

            {filteredFaqs.length === 0 && (
              <div className="text-center py-8">
                <Book className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400">
                  {language === 'ar' ? 'لا توجد أسئلة شائعة' : 'No FAQs found'}
                </p>
              </div>
            )}
          </div>
        )}
      </motion.div>

      {/* New Ticket Modal */}
      <AnimatePresence>
        {showNewTicketModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowNewTicketModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="glassmorphism rounded-2xl p-6 border border-white/10 max-w-md w-full"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white">
                  {language === 'ar' ? 'تذكرة دعم جديدة' : 'New Support Ticket'}
                </h3>
                <button
                  onClick={() => setShowNewTicketModal(false)}
                  className="p-2 rounded-lg bg-gray-500/20 text-gray-400 hover:bg-gray-500/30 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    {language === 'ar' ? 'الموضوع' : 'Subject'}
                  </label>
                  <input
                    type="text"
                    value={newTicket.subject}
                    onChange={(e) => setNewTicket(prev => ({ ...prev, subject: e.target.value }))}
                    placeholder={t('support.ticketSubject')}
                    className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-400/50 transition-colors"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      {language === 'ar' ? 'الفئة' : 'Category'}
                    </label>
                    <select
                      value={newTicket.category}
                      onChange={(e) => setNewTicket(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:border-purple-400/50 transition-colors"
                    >
                      <option value="general">{language === 'ar' ? 'عام' : 'General'}</option>
                      <option value="booking">{language === 'ar' ? 'الحجز' : 'Booking'}</option>
                      <option value="payment">{language === 'ar' ? 'الدفع' : 'Payment'}</option>
                      <option value="technical">{language === 'ar' ? 'تقني' : 'Technical'}</option>
                      <option value="account">{language === 'ar' ? 'الحساب' : 'Account'}</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      {language === 'ar' ? 'الأولوية' : 'Priority'}
                    </label>
                    <select
                      value={newTicket.priority}
                      onChange={(e) => setNewTicket(prev => ({ ...prev, priority: e.target.value }))}
                      className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:border-purple-400/50 transition-colors"
                    >
                      <option value="low">{language === 'ar' ? 'منخفض' : 'Low'}</option>
                      <option value="medium">{language === 'ar' ? 'متوسط' : 'Medium'}</option>
                      <option value="high">{language === 'ar' ? 'عالي' : 'High'}</option>
                    </select>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    {language === 'ar' ? 'الوصف' : 'Description'}
                  </label>
                  <textarea
                    value={newTicket.description}
                    onChange={(e) => setNewTicket(prev => ({ ...prev, description: e.target.value }))}
                    placeholder={language === 'ar' ? 'اشرح مشكلتك بالتفصيل...' : 'Describe your issue in detail...'}
                    rows={4}
                    className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-400/50 transition-colors resize-none"
                  />
                </div>
              </div>
              
              <div className="flex items-center space-x-3 mt-6">
                <button
                  onClick={() => setShowNewTicketModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  {language === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  onClick={handleSubmitTicket}
                  disabled={!newTicket.subject.trim() || !newTicket.description.trim()}
                  className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-colors disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  <span>{language === 'ar' ? 'إرسال التذكرة' : 'Submit Ticket'}</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default ClientSupport; 