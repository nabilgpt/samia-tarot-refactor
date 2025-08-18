import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { 
  Calendar, 
  Clock, 
  User,
  Star,
  MapPin,
  Phone,
  Video,
  MessageSquare,
  X,
  Edit,
  Search,
  Filter,
  Download,
  CheckCircle,
  AlertCircle,
  XCircle,
  Play,
  Pause,
  MoreHorizontal
} from 'lucide-react';
import { useUI } from '../../context/UIContext';
import api from '../../services/frontendApi.js';

const ClientBookings = () => {
  const { t } = useTranslation();
  const { language, showSuccess, showError } = useUI();
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState([]);
  const [filteredBookings, setFilteredBookings] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [newDateTime, setNewDateTime] = useState('');

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
    loadBookings();
  }, []);

  useEffect(() => {
    filterBookings();
  }, [bookings, searchTerm, statusFilter]);

  const loadBookings = async () => {
    try {
      setLoading(true);
      const response = await api.getBookings();
      
      if (response.success) {
        setBookings(response.data);
      } else {
        console.error('Failed to load bookings:', response.error);
        setBookings([]);
        showError(response.error || (language === 'ar' ? 'فشل في تحميل الحجوزات' : 'Failed to load bookings'));
      }
    } catch (error) {
      console.error('Error loading bookings:', error);
      showError(language === 'ar' ? 'فشل في تحميل الحجوزات' : 'Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  const filterBookings = () => {
    let filtered = bookings;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(booking => {
        const serviceName = language === 'ar' ? booking.services?.name_ar : booking.services?.name;
        const readerName = `${booking.readers?.profiles?.first_name} ${booking.readers?.profiles?.last_name}`;
        return serviceName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
               readerName.toLowerCase().includes(searchTerm.toLowerCase());
      });
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(booking => booking.status === statusFilter);
    }

    setFilteredBookings(filtered);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed': return 'text-green-400 bg-green-500/20 border-green-500/30';
      case 'pending': return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30';
      case 'completed': return 'text-blue-400 bg-blue-500/20 border-blue-500/30';
      case 'cancelled': return 'text-red-400 bg-red-500/20 border-red-500/30';
      case 'in_progress': return 'text-purple-400 bg-purple-500/20 border-purple-500/30';
      default: return 'text-gray-400 bg-gray-500/20 border-gray-500/30';
    }
  };

  const getStatusText = (status) => {
    const statusTexts = {
      confirmed: language === 'ar' ? 'مؤكد' : 'Confirmed',
      pending: language === 'ar' ? 'في الانتظار' : 'Pending',
      completed: language === 'ar' ? 'مكتمل' : 'Completed',
      cancelled: language === 'ar' ? 'ملغى' : 'Cancelled',
      in_progress: language === 'ar' ? 'جاري' : 'In Progress'
    };
    return statusTexts[status] || status;
  };

  const isSessionActive = (booking) => {
    const now = new Date();
    const sessionStart = new Date(booking.scheduled_at);
    const sessionEnd = new Date(sessionStart.getTime() + (booking.duration || 30) * 60000);
    return now >= sessionStart && now <= sessionEnd && booking.status === 'confirmed';
  };

  const canCancel = (booking) => {
    const scheduledTime = new Date(booking.scheduled_at);
    const now = new Date();
    const hoursDifference = (scheduledTime - now) / (1000 * 60 * 60);
    return hoursDifference > 2 && ['pending', 'confirmed'].includes(booking.status);
  };

  const canReschedule = (booking) => {
    const scheduledTime = new Date(booking.scheduled_at);
    const now = new Date();
    return scheduledTime > now && ['pending', 'confirmed'].includes(booking.status);
  };

  const handleCancelBooking = async () => {
    if (!selectedBooking) return;

    try {
      setLoading(true);
      const response = await api.cancelBooking(selectedBooking.id, cancelReason);
      
      if (response.success) {
        showSuccess(language === 'ar' ? 'تم إلغاء الحجز بنجاح' : 'Booking cancelled successfully');
        setShowCancelModal(false);
        setCancelReason('');
        setSelectedBooking(null);
        await loadBookings();
      } else {
        showError(response.error || (language === 'ar' ? 'فشل في إلغاء الحجز' : 'Failed to cancel booking'));
      }
    } catch (error) {
      showError(language === 'ar' ? 'فشل في إلغاء الحجز' : 'Failed to cancel booking');
    } finally {
      setLoading(false);
    }
  };

  const handleRescheduleBooking = async () => {
    if (!selectedBooking || !newDateTime) return;

    try {
      setLoading(true);
      const response = await api.rescheduleBooking(selectedBooking.id, newDateTime);
      
      if (response.success) {
        showSuccess(language === 'ar' ? 'تم تعديل موعد الحجز بنجاح' : 'Booking rescheduled successfully');
        setShowRescheduleModal(false);
        setNewDateTime('');
        setSelectedBooking(null);
        await loadBookings();
      } else {
        showError(response.error || (language === 'ar' ? 'فشل في تعديل موعد الحجز' : 'Failed to reschedule booking'));
      }
    } catch (error) {
      showError(language === 'ar' ? 'فشل في تعديل موعد الحجز' : 'Failed to reschedule booking');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinSession = (booking) => {
    // Navigate to session room
    window.location.href = `/session/${booking.id}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="relative">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold-400"></div>
          <div className="absolute inset-0 rounded-full border-2 border-gold-400/20"></div>
        </div>
        <span className="ml-4 text-gray-300">
          {language === 'ar' ? 'جاري التحميل...' : 'Loading...'}
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
          <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            {language === 'ar' ? 'حجوزاتي' : 'My Bookings'}
          </h2>
          <p className="text-gray-400 mt-1">
            {language === 'ar' ? 'إدارة جلساتك وحجوزاتك' : 'Manage your sessions and bookings'}
          </p>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div
        variants={itemVariants}
        className="glassmorphism rounded-2xl p-6 border border-white/10"
      >
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={language === 'ar' ? 'البحث في الحجوزات...' : 'Search bookings...'}
                className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-gold-400/50 transition-colors"
              />
            </div>
          </div>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:border-gold-400/50 transition-colors"
          >
            <option value="all">{language === 'ar' ? 'كل الحالات' : 'All Status'}</option>
            <option value="confirmed">{language === 'ar' ? 'مؤكد' : 'Confirmed'}</option>
            <option value="pending">{language === 'ar' ? 'في الانتظار' : 'Pending'}</option>
            <option value="completed">{language === 'ar' ? 'مكتمل' : 'Completed'}</option>
            <option value="cancelled">{language === 'ar' ? 'ملغى' : 'Cancelled'}</option>
          </select>
        </div>
      </motion.div>

      {/* Bookings List */}
      <motion.div
        variants={containerVariants}
        className="space-y-4"
      >
        {filteredBookings.map((booking) => {
          const serviceName = language === 'ar' ? booking.services?.name_ar : booking.services?.name;
          const readerName = `${booking.readers?.profiles?.first_name} ${booking.readers?.profiles?.last_name}`;
          const isActive = isSessionActive(booking);
          
          return (
            <motion.div
              key={booking.id}
              variants={itemVariants}
              whileHover={{ scale: 1.01, y: -2 }}
              className="glassmorphism rounded-2xl p-6 border border-white/10 hover:border-gold-400/30 transition-all duration-300"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4 flex-1">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
                    <Calendar className="w-8 h-8 text-white" />
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="text-xl font-semibold text-white mb-1">
                          {serviceName}
                        </h3>
                        <div className="flex items-center space-x-4 text-sm text-gray-400 mb-2">
                          <span className="flex items-center">
                            <User className="w-4 h-4 mr-1" />
                            {readerName}
                          </span>
                          <span className="flex items-center">
                            <Clock className="w-4 h-4 mr-1" />
                            {booking.duration} {language === 'ar' ? 'دقيقة' : 'minutes'}
                          </span>
                          <span className="flex items-center">
                            <Calendar className="w-4 h-4 mr-1" />
                            {new Date(booking.scheduled_at).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex items-center space-x-3">
                          <span className={`px-3 py-1 rounded-lg text-sm font-medium border ${getStatusColor(booking.status)}`}>
                            {getStatusText(booking.status)}
                          </span>
                          <span className="text-gold-400 font-semibold">
                            {booking.total_amount} {language === 'ar' ? 'ريال' : 'SAR'}
                          </span>
                          {isActive && (
                            <span className="px-3 py-1 bg-green-500/20 text-green-400 border border-green-500/30 rounded-lg text-sm font-medium animate-pulse">
                              {language === 'ar' ? 'جلسة نشطة' : 'Active Session'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2 ml-4">
                  {isActive && (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleJoinSession(booking)}
                      className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:from-green-600 hover:to-emerald-600 transition-colors"
                    >
                      <Play className="w-4 h-4" />
                      <span>{language === 'ar' ? 'انضم للجلسة' : 'Join Session'}</span>
                    </motion.button>
                  )}
                  
                  {canReschedule(booking) && (
                    <button
                      onClick={() => {
                        setSelectedBooking(booking);
                        setShowRescheduleModal(true);
                      }}
                      className="p-2 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors"
                      title={language === 'ar' ? 'تعديل الموعد' : 'Reschedule'}
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                  )}
                  
                  {canCancel(booking) && (
                    <button
                      onClick={() => {
                        setSelectedBooking(booking);
                        setShowCancelModal(true);
                      }}
                      className="p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                      title={language === 'ar' ? 'إلغاء الحجز' : 'Cancel Booking'}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                  
                  <button className="p-2 rounded-lg bg-gray-500/20 text-gray-400 hover:bg-gray-500/30 transition-colors">
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {filteredBookings.length === 0 && (
        <motion.div
          variants={itemVariants}
          className="text-center py-12"
        >
          <Calendar className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-400 mb-2">
            {language === 'ar' ? 'لا توجد حجوزات' : 'No Bookings Found'}
          </h3>
          <p className="text-gray-500">
            {language === 'ar' ? 'لم يتم العثور على حجوزات مطابقة للبحث' : 'No bookings match your search criteria'}
          </p>
        </motion.div>
      )}

      {/* Cancel Modal */}
      <AnimatePresence>
        {showCancelModal && selectedBooking && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowCancelModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="glassmorphism rounded-2xl p-6 border border-white/10 max-w-md w-full"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-white">
                  {language === 'ar' ? 'إلغاء الحجز' : 'Cancel Booking'}
                </h3>
                <button
                  onClick={() => setShowCancelModal(false)}
                  className="p-2 rounded-lg bg-gray-500/20 text-gray-400 hover:bg-gray-500/30 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              <div className="mb-4">
                <p className="text-gray-300 mb-3">
                  {language === 'ar' 
                    ? 'هل أنت متأكد من إلغاء هذا الحجز؟ سيتم استرداد المبلغ إلى محفظتك.'
                    : 'Are you sure you want to cancel this booking? The amount will be refunded to your wallet.'
                  }
                </p>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder={language === 'ar' ? 'سبب الإلغاء (اختياري)' : 'Cancellation reason (optional)'}
                  className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-gold-400/50 transition-colors resize-none"
                  rows={3}
                />
              </div>
              
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setShowCancelModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  {language === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  onClick={handleCancelBooking}
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-lg hover:from-red-600 hover:to-pink-600 transition-colors disabled:opacity-50"
                >
                  {loading ? (
                    <div className="animate-spin w-4 h-4 border-b-2 border-white rounded-full mx-auto"></div>
                  ) : (
                    language === 'ar' ? 'تأكيد الإلغاء' : 'Confirm Cancel'
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reschedule Modal */}
      <AnimatePresence>
        {showRescheduleModal && selectedBooking && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowRescheduleModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="glassmorphism rounded-2xl p-6 border border-white/10 max-w-md w-full"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-white">
                  {language === 'ar' ? 'تعديل موعد الحجز' : 'Reschedule Booking'}
                </h3>
                <button
                  onClick={() => setShowRescheduleModal(false)}
                  className="p-2 rounded-lg bg-gray-500/20 text-gray-400 hover:bg-gray-500/30 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {language === 'ar' ? 'الموعد الجديد' : 'New Date & Time'}
                </label>
                <input
                  type="datetime-local"
                  value={newDateTime}
                  onChange={(e) => setNewDateTime(e.target.value)}
                  min={new Date().toISOString().slice(0, 16)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:border-gold-400/50 transition-colors"
                />
              </div>
              
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setShowRescheduleModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  {language === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  onClick={handleRescheduleBooking}
                  disabled={loading || !newDateTime}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg hover:from-blue-600 hover:to-cyan-600 transition-colors disabled:opacity-50"
                >
                  {loading ? (
                    <div className="animate-spin w-4 h-4 border-b-2 border-white rounded-full mx-auto"></div>
                  ) : (
                    language === 'ar' ? 'تأكيد التعديل' : 'Confirm Reschedule'
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default ClientBookings; 