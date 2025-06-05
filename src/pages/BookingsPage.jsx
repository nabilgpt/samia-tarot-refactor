import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import { 
  Calendar, 
  Clock, 
  Star, 
  MapPin, 
  Phone, 
  Video,
  MessageCircle,
  CheckCircle,
  XCircle,
  AlertCircle,
  Filter
} from 'lucide-react';
import Button from '../components/Button';
import AnimatedBackground from '../components/UI/AnimatedBackground';

const BookingsPage = () => {
  const { t } = useTranslation();
  const { user, profile, isAuthenticated } = useAuth();
  const { showSuccess, showError } = useUI();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, upcoming, completed, cancelled

  useEffect(() => {
    // Mock bookings data
    setTimeout(() => {
      setBookings([
        {
          id: 1,
          reader: {
            name: 'سامية الأحمد',
            avatar: '/avatars/samia.jpg',
            rating: 4.9,
            specialties: ['التاروت', 'علم الفلك']
          },
          service: 'قراءة التاروت الشاملة',
          date: '2024-01-20',
          time: '14:30',
          duration: 60,
          price: 50,
          status: 'confirmed',
          type: 'video',
          notes: 'أريد التركيز على الحب والعلاقات'
        },
        {
          id: 2,
          reader: {
            name: 'فاطمة العلي',
            avatar: '/avatars/fatima.jpg',
            rating: 4.8,
            specialties: ['قراءة الكف', 'الأحلام']
          },
          service: 'قراءة الكف',
          date: '2024-01-15',
          time: '10:00',
          duration: 30,
          price: 25,
          status: 'completed',
          type: 'chat',
          notes: 'جلسة ممتازة!'
        },
        {
          id: 3,
          reader: {
            name: 'نور الدين',
            avatar: '/avatars/nour.jpg',
            rating: 4.7,
            specialties: ['علم الأرقام', 'الروحانيات']
          },
          service: 'استشارة روحانية',
          date: '2024-01-10',
          time: '16:00',
          duration: 45,
          price: 40,
          status: 'cancelled',
          type: 'phone',
          notes: 'تم الإلغاء بسبب ظروف طارئة'
        }
      ]);
      setLoading(false);
    }, 1000);
  }, []);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">تسجيل الدخول مطلوب</h2>
          <p className="text-gray-400 mb-6">يجب تسجيل الدخول لعرض الحجوزات</p>
          <Button href="/login">تسجيل الدخول</Button>
        </div>
      </div>
    );
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'confirmed':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-blue-400" />;
      case 'cancelled':
        return <XCircle className="w-5 h-5 text-red-400" />;
      default:
        return <AlertCircle className="w-5 h-5 text-yellow-400" />;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'confirmed':
        return 'مؤكد';
      case 'completed':
        return 'مكتمل';
      case 'cancelled':
        return 'ملغي';
      default:
        return 'في الانتظار';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed':
        return 'text-green-400 bg-green-400/10';
      case 'completed':
        return 'text-blue-400 bg-blue-400/10';
      case 'cancelled':
        return 'text-red-400 bg-red-400/10';
      default:
        return 'text-yellow-400 bg-yellow-400/10';
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'video':
        return <Video className="w-4 h-4" />;
      case 'phone':
        return <Phone className="w-4 h-4" />;
      case 'chat':
        return <MessageCircle className="w-4 h-4" />;
      default:
        return <Calendar className="w-4 h-4" />;
    }
  };

  const filteredBookings = bookings.filter(booking => {
    if (filter === 'all') return true;
    if (filter === 'upcoming') return booking.status === 'confirmed';
    if (filter === 'completed') return booking.status === 'completed';
    if (filter === 'cancelled') return booking.status === 'cancelled';
    return true;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gold-400"></div>
      </div>
    );
  }

  return (
    <AnimatedBackground variant="default" intensity="normal">
      <div className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">حجوزاتي</h1>
            <p className="text-gray-400">إدارة وتتبع جميع حجوزاتك</p>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center justify-between mb-8">
            <div className="flex items-center space-x-2 space-x-reverse mb-4 md:mb-0">
              <Filter className="w-5 h-5 text-gray-400" />
              <span className="text-gray-400">تصفية:</span>
              <div className="flex space-x-2 space-x-reverse">
                {[
                  { key: 'all', label: 'الكل' },
                  { key: 'upcoming', label: 'القادمة' },
                  { key: 'completed', label: 'مكتملة' },
                  { key: 'cancelled', label: 'ملغية' }
                ].map((option) => (
                  <button
                    key={option.key}
                    onClick={() => setFilter(option.key)}
                    className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                      filter === option.key
                        ? 'bg-gold-gradient text-dark-900'
                        : 'bg-dark-700 text-gray-300 hover:bg-dark-600'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <Button href="/readers" variant="outline">
              حجز جلسة جديدة
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-dark-800 rounded-xl p-6 border border-gold-400/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">إجمالي الحجوزات</p>
                  <p className="text-2xl font-bold text-white">{bookings.length}</p>
                </div>
                <Calendar className="w-8 h-8 text-gold-400" />
              </div>
            </div>

            <div className="bg-dark-800 rounded-xl p-6 border border-green-400/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">الحجوزات المؤكدة</p>
                  <p className="text-2xl font-bold text-green-400">
                    {bookings.filter(b => b.status === 'confirmed').length}
                  </p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-400" />
              </div>
            </div>

            <div className="bg-dark-800 rounded-xl p-6 border border-blue-400/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">الحجوزات المكتملة</p>
                  <p className="text-2xl font-bold text-blue-400">
                    {bookings.filter(b => b.status === 'completed').length}
                  </p>
                </div>
                <CheckCircle className="w-8 h-8 text-blue-400" />
              </div>
            </div>

            <div className="bg-dark-800 rounded-xl p-6 border border-red-400/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">المجموع المدفوع</p>
                  <p className="text-2xl font-bold text-gold-400">
                    ${bookings.filter(b => b.status === 'completed').reduce((sum, b) => sum + b.price, 0)}
                  </p>
                </div>
                <Clock className="w-8 h-8 text-gold-400" />
              </div>
            </div>
          </div>

          {/* Bookings List */}
          {filteredBookings.length === 0 ? (
            <div className="bg-dark-800 rounded-xl p-8 border border-gold-400/20 text-center">
              <Calendar className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-medium text-white mb-2">لا توجد حجوزات</h3>
              <p className="text-gray-400 mb-6">
                {filter === 'all' 
                  ? 'لم تقم بأي حجوزات بعد'
                  : `لا توجد حجوزات ${filter === 'upcoming' ? 'قادمة' : filter === 'completed' ? 'مكتملة' : 'ملغية'}`
                }
              </p>
              <Button href="/readers">احجز جلستك الأولى</Button>
            </div>
          ) : (
            <div className="space-y-6">
              {filteredBookings.map((booking) => (
                <div
                  key={booking.id}
                  className="bg-dark-800 rounded-xl p-6 border border-gold-400/20 hover:border-gold-400/40 transition-all"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
                    {/* Main Info */}
                    <div className="flex items-start space-x-4 space-x-reverse mb-4 lg:mb-0">
                      {/* Reader Avatar */}
                      <div className="w-16 h-16 bg-gold-gradient rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-xl font-bold text-dark-900">
                          {booking.reader.name.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>

                      {/* Booking Details */}
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 space-x-reverse mb-2">
                          <h3 className="text-lg font-bold text-white">{booking.service}</h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center ${getStatusColor(booking.status)}`}>
                            {getStatusIcon(booking.status)}
                            <span className="mr-1">{getStatusText(booking.status)}</span>
                          </span>
                        </div>

                        <div className="flex items-center text-gray-400 mb-2">
                          <span className="font-medium">{booking.reader.name}</span>
                          <span className="mx-2">•</span>
                          <Star className="w-4 h-4 text-gold-400 fill-current mr-1" />
                          <span className="text-gold-400">{booking.reader.rating}</span>
                        </div>

                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400">
                          <div className="flex items-center">
                            <Calendar className="w-4 h-4 mr-1" />
                            {booking.date}
                          </div>
                          <div className="flex items-center">
                            <Clock className="w-4 h-4 mr-1" />
                            {booking.time} ({booking.duration} دقيقة)
                          </div>
                          <div className="flex items-center">
                            {getTypeIcon(booking.type)}
                            <span className="mr-1">
                              {booking.type === 'video' ? 'مكالمة فيديو' : 
                               booking.type === 'phone' ? 'مكالمة هاتفية' : 'محادثة نصية'}
                            </span>
                          </div>
                        </div>

                        {booking.notes && (
                          <div className="mt-2 p-2 bg-dark-700 rounded-lg">
                            <p className="text-sm text-gray-300">{booking.notes}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col items-end space-y-2">
                      <div className="text-2xl font-bold text-gold-400">${booking.price}</div>
                      
                      <div className="flex space-x-2 space-x-reverse">
                        {booking.status === 'confirmed' && (
                          <>
                            <Button size="sm" variant="outline">
                              إلغاء
                            </Button>
                            <Button size="sm">
                              انضم الآن
                            </Button>
                          </>
                        )}
                        
                        {booking.status === 'completed' && (
                          <>
                            <Button size="sm" variant="outline">
                              إعادة الحجز
                            </Button>
                            <Button size="sm">
                              تقييم
                            </Button>
                          </>
                        )}
                        
                        {booking.status === 'cancelled' && (
                          <Button size="sm">
                            حجز مرة أخرى
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AnimatedBackground>
  );
};

export default BookingsPage; 