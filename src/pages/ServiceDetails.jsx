import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useUI } from '../context/UIContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import AnimatedBackground from '../components/UI/AnimatedBackground';
import ReaderCard from '../components/ReaderCard';
import Loader from '../components/Loader';
import { 
  Clock, 
  DollarSign, 
  Star, 
  Users, 
  ArrowLeft, 
  Calendar,
  Sparkles,
  Crown,
  CheckCircle
} from 'lucide-react';

const ServiceDetails = () => {
  const { serviceId } = useParams();
  const { t } = useTranslation();
  const { language } = useUI();
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  
  const [service, setService] = useState(null);
  const [readers, setReaders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [readersLoading, setReadersLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (serviceId) {
      loadServiceDetails();
      loadAvailableReaders();
    }
  }, [serviceId]);

  const loadServiceDetails = async () => {
    try {
      setLoading(true);
      setError('');

      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('id', serviceId)
        .eq('is_active', true)
        .single();

      if (error) throw error;

      if (!data) {
        setError(language === 'ar' ? 'الخدمة غير موجودة' : 'Service not found');
        return;
      }

      setService(data);

    } catch (error) {
      console.error('Error loading service details:', error);
      setError(language === 'ar' ? 'فشل في تحميل تفاصيل الخدمة' : 'Failed to load service details');
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableReaders = async () => {
    try {
      setReadersLoading(true);

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'reader')
        .eq('is_active', true)
        .order('rating', { ascending: false });

      if (error) throw error;

      setReaders(data || []);

    } catch (error) {
      console.error('Error loading readers:', error);
    } finally {
      setReadersLoading(false);
    }
  };

  const handleBookNow = () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { returnTo: `/booking/${serviceId}` } });
      return;
    }
    navigate(`/booking/${serviceId}`);
  };

  const handleReaderSelect = (reader) => {
    if (!isAuthenticated) {
      navigate('/login', { state: { returnTo: `/booking/${serviceId}?reader=${reader.id}` } });
      return;
    }
    navigate(`/booking/${serviceId}?reader=${reader.id}`);
  };

  const handleBackToServices = () => {
    navigate('/services');
  };

  if (loading) {
    return (
      <AnimatedBackground variant="default" intensity="normal">
        <div className="py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <Loader 
              variant="cosmic" 
              size="lg" 
              text={language === 'ar' ? 'جاري التحميل...' : 'Loading...'} 
              className="py-20"
            />
          </div>
        </div>
      </AnimatedBackground>
    );
  }

  if (error || !service) {
    return (
      <AnimatedBackground variant="default" intensity="normal">
        <div className="py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto text-center">
            <div className="bg-dark-800/50 backdrop-blur-xl border border-red-400/20 rounded-2xl p-8 shadow-2xl shadow-red-500/10">
              <div className="w-16 h-16 bg-gradient-to-br from-red-500/20 to-red-600/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Sparkles className="w-8 h-8 text-red-400" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-4">
                {language === 'ar' ? 'خطأ' : 'Error'}
              </h2>
              <p className="text-red-300 mb-6">
                {error || (language === 'ar' ? 'الخدمة غير موجودة' : 'Service not found')}
              </p>
              <button
                onClick={handleBackToServices}
                className="bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-600 hover:to-gold-700 text-dark-900 font-bold px-6 py-3 rounded-lg shadow-lg shadow-gold-500/30 transition-all duration-200 transform hover:scale-105"
              >
                {language === 'ar' ? 'العودة للخدمات' : 'Back to Services'}
              </button>
            </div>
          </div>
        </div>
      </AnimatedBackground>
    );
  }

  return (
    <AnimatedBackground variant="default" intensity="normal">
      <div className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          {/* Back Button */}
          <button
            onClick={handleBackToServices}
            className="flex items-center space-x-2 text-gold-400 hover:text-gold-300 mb-8 transition-colors duration-200"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>{language === 'ar' ? 'العودة للخدمات' : 'Back to Services'}</span>
          </button>

          {/* Service Header */}
          <div className="bg-dark-800/50 backdrop-blur-xl border border-gold-400/20 rounded-2xl p-8 mb-8 shadow-2xl shadow-cosmic-500/10">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Service Icon & Basic Info */}
              <div className="lg:col-span-1">
                <div className="text-center">
                  <div className="w-24 h-24 bg-gradient-to-br from-gold-500 to-gold-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-gold-500/30">
                    <span className="text-4xl">{service.icon || '🔮'}</span>
                  </div>
                  
                  {service.is_vip && (
                    <div className="flex items-center justify-center mb-4">
                      <Crown className="w-5 h-5 text-purple-400 mr-2" />
                      <span className="px-3 py-1 bg-gradient-to-r from-purple-500 to-purple-600 text-white text-sm font-medium rounded-full">
                        VIP Service
                      </span>
                    </div>
                  )}

                  <h1 className="text-3xl font-bold text-white mb-4">
                    {language === 'ar' ? service.name_ar : service.name}
                  </h1>

                  <div className="flex items-center justify-center space-x-4 text-sm text-gray-300">
                    <div className="flex items-center">
                      <Clock className="w-4 h-4 mr-1 text-gold-400" />
                      {service.duration_minutes} {language === 'ar' ? 'دقيقة' : 'min'}
                    </div>
                    <div className="flex items-center">
                      <DollarSign className="w-4 h-4 mr-1 text-gold-400" />
                      ${service.price}
                    </div>
                  </div>
                </div>
              </div>

              {/* Service Description */}
              <div className="lg:col-span-2">
                <h2 className="text-xl font-bold text-white mb-4">
                  {language === 'ar' ? 'وصف الخدمة' : 'Service Description'}
                </h2>
                <p className="text-gray-300 leading-relaxed mb-6">
                  {language === 'ar' ? service.description_ar : service.description}
                </p>

                {/* Service Features */}
                {service.features && service.features.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-white mb-3">
                      {language === 'ar' ? 'ما ستحصل عليه' : 'What You\'ll Get'}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {service.features.map((feature, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                          <span className="text-gray-300">{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Book Now Button */}
                <button
                  onClick={handleBookNow}
                  className="w-full bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-600 hover:to-gold-700 text-dark-900 font-bold py-4 px-8 rounded-lg shadow-lg shadow-gold-500/30 transition-all duration-200 transform hover:scale-105 flex items-center justify-center space-x-2"
                >
                  <Calendar className="w-5 h-5" />
                  <span>
                    {language === 'ar' ? 'احجز الآن' : 'Book Now'}
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Service Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-dark-800/50 backdrop-blur-xl border border-gold-400/20 rounded-2xl p-6 text-center shadow-2xl shadow-cosmic-500/10">
              <div className="w-12 h-12 bg-gradient-to-br from-gold-500/20 to-gold-600/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Star className="w-6 h-6 text-gold-400" />
              </div>
              <div className="text-2xl font-bold text-white mb-1">
                {service.average_rating || '4.8'}
              </div>
              <div className="text-gray-400 text-sm">
                {language === 'ar' ? 'متوسط التقييم' : 'Average Rating'}
              </div>
            </div>

            <div className="bg-dark-800/50 backdrop-blur-xl border border-gold-400/20 rounded-2xl p-6 text-center shadow-2xl shadow-cosmic-500/10">
              <div className="w-12 h-12 bg-gradient-to-br from-cosmic-500/20 to-cosmic-600/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Users className="w-6 h-6 text-cosmic-400" />
              </div>
              <div className="text-2xl font-bold text-white mb-1">
                {service.total_bookings || '1,234'}
              </div>
              <div className="text-gray-400 text-sm">
                {language === 'ar' ? 'إجمالي الحجوزات' : 'Total Bookings'}
              </div>
            </div>

            <div className="bg-dark-800/50 backdrop-blur-xl border border-gold-400/20 rounded-2xl p-6 text-center shadow-2xl shadow-cosmic-500/10">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500/20 to-green-600/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-6 h-6 text-green-400" />
              </div>
              <div className="text-2xl font-bold text-white mb-1">
                {service.satisfaction_rate || '98%'}
              </div>
              <div className="text-gray-400 text-sm">
                {language === 'ar' ? 'معدل الرضا' : 'Satisfaction Rate'}
              </div>
            </div>
          </div>

          {/* Available Readers */}
          <div className="bg-dark-800/50 backdrop-blur-xl border border-gold-400/20 rounded-2xl p-8 shadow-2xl shadow-cosmic-500/10">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">
                {language === 'ar' ? 'القراء المتاحون' : 'Available Readers'}
              </h2>
              <span className="text-gray-400 text-sm">
                {readers.length} {language === 'ar' ? 'قارئ متاح' : 'readers available'}
              </span>
            </div>

            {readersLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="bg-dark-700/30 rounded-2xl p-6 animate-pulse">
                    <div className="w-20 h-20 bg-gold-400/20 rounded-full mx-auto mb-4"></div>
                    <div className="h-4 bg-gold-400/20 rounded w-3/4 mx-auto mb-2"></div>
                    <div className="h-3 bg-cosmic-400/20 rounded w-1/2 mx-auto mb-4"></div>
                    <div className="h-8 bg-gold-400/20 rounded"></div>
                  </div>
                ))}
              </div>
            ) : readers.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {readers.slice(0, 6).map((reader) => (
                  <ReaderCard
                    key={reader.id}
                    reader={reader}
                    onSelect={handleReaderSelect}
                    showBio={false}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gradient-to-br from-gray-500/20 to-gray-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-white mb-2">
                  {language === 'ar' ? 'لا يوجد قراء متاحون' : 'No Readers Available'}
                </h3>
                <p className="text-gray-400">
                  {language === 'ar' 
                    ? 'جميع القراء مشغولون حالياً. يرجى المحاولة لاحقاً.'
                    : 'All readers are currently busy. Please try again later.'
                  }
                </p>
              </div>
            )}

            {readers.length > 6 && (
              <div className="text-center mt-6">
                <button
                  onClick={() => navigate('/readers')}
                  className="border border-gold-400/30 text-gold-400 hover:bg-gold-400/10 font-medium px-6 py-3 rounded-lg transition-all duration-200"
                >
                  {language === 'ar' ? 'عرض جميع القراء' : 'View All Readers'}
                </button>
              </div>
            )}
          </div>

          {/* Related Services */}
          {service.category && (
            <div className="mt-12">
              <h2 className="text-2xl font-bold text-white mb-6">
                {language === 'ar' ? 'خدمات مشابهة' : 'Related Services'}
              </h2>
              <div className="bg-dark-800/50 backdrop-blur-xl border border-gold-400/20 rounded-2xl p-6 shadow-2xl shadow-cosmic-500/10">
                <p className="text-gray-300 text-center">
                  {language === 'ar' 
                    ? 'استكشف المزيد من الخدمات في فئة ' + service.category
                    : 'Explore more services in the ' + service.category + ' category'
                  }
                </p>
                <div className="text-center mt-4">
                  <button
                    onClick={() => navigate(`/services?category=${service.category}`)}
                    className="bg-gradient-to-r from-cosmic-500 to-cosmic-600 hover:from-cosmic-600 hover:to-cosmic-700 text-white font-bold px-6 py-3 rounded-lg shadow-lg shadow-cosmic-500/30 transition-all duration-200 transform hover:scale-105"
                  >
                    {language === 'ar' ? 'عرض الفئة' : 'View Category'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AnimatedBackground>
  );
};

export default ServiceDetails; 