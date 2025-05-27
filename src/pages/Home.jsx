import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Star, Clock, Users, ArrowRight, Sparkles } from 'lucide-react';
import Button from '../components/Button';
import { mockServices, mockReaders, mockTestimonials, mockCategories } from '../utils/mockData';
import { useUI } from '../context/UIContext';

const Home = () => {
  const { t } = useTranslation();
  const { language } = useUI();

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative py-20 lg:py-32 overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-cosmic-pattern opacity-10"></div>
        <div className="absolute top-20 left-10 w-72 h-72 bg-cosmic-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-gold-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-8">
            <div className="space-y-4">
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white text-shadow">
                <span className="gradient-text">{t('home.title')}</span>
              </h1>
              <p className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
                {t('home.subtitle')}
              </p>
            </div>
            
            <p className="text-lg text-gray-400 max-w-4xl mx-auto leading-relaxed">
              {t('home.description')}
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link to="/services">
                <Button size="lg" className="animate-pulse-glow">
                  <Sparkles className="w-5 h-5 mr-2 rtl:mr-0 rtl:ml-2" />
                  {t('home.cta')}
                </Button>
              </Link>
              <Link to="/readers">
                <Button variant="secondary" size="lg">
                  {t('home.topReaders')}
                  <ArrowRight className="w-5 h-5 ml-2 rtl:ml-0 rtl:mr-2" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-20 bg-dark-800/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              {t('services.title')}
            </h2>
            <p className="text-lg text-gray-400 max-w-2xl mx-auto">
              {t('services.subtitle')}
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {mockCategories.slice(0, 6).map((category) => (
              <Link
                key={category.id}
                to={`/services?category=${category.id}`}
                className="card-glow group cursor-pointer"
              >
                <div className="text-center space-y-4">
                  <div className="text-4xl mb-4">{category.icon}</div>
                  <h3 className="text-xl font-semibold text-white group-hover:text-gold-400 transition-colors">
                    {language === 'ar' ? category.name : category.nameEn}
                  </h3>
                  <p className="text-gray-400 text-sm">
                    {language === 'ar' ? category.description : category.descriptionEn}
                  </p>
                  <div className="flex items-center justify-center text-sm text-gold-400">
                    <span>{category.serviceCount} خدمة متاحة</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Services */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              {t('home.featuredServices')}
            </h2>
            <p className="text-lg text-gray-400">
              أشهر الخدمات المطلوبة من عملائنا
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {mockServices.slice(0, 3).map((service) => (
              <div key={service.id} className="card-glow floating-card">
                <div className="space-y-4">
                  <div className="aspect-video bg-gradient-to-br from-cosmic-600 to-gold-600 rounded-lg flex items-center justify-center">
                    <span className="text-4xl">🔮</span>
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="text-xl font-semibold text-white">
                      {language === 'ar' ? service.title : service.titleEn}
                    </h3>
                    <p className="text-gray-400 text-sm">
                      {language === 'ar' ? service.description : service.descriptionEn}
                    </p>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 rtl:space-x-reverse">
                      <Star className="w-4 h-4 text-gold-400 fill-current" />
                      <span className="text-sm text-gray-300">{service.rating}</span>
                      <span className="text-sm text-gray-500">({service.reviewCount})</span>
                    </div>
                    <div className="flex items-center space-x-1 rtl:space-x-reverse">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-400">{service.duration} دقيقة</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between pt-4">
                    <div className="text-2xl font-bold text-gold-400">
                      {service.price} {service.currency}
                    </div>
                    <Link to={`/services/${service.id}`}>
                      <Button size="sm">
                        {t('services.bookNow')}
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="text-center mt-12">
            <Link to="/services">
              <Button variant="secondary" size="lg">
                عرض جميع الخدمات
                <ArrowRight className="w-5 h-5 ml-2 rtl:ml-0 rtl:mr-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Top Readers */}
      <section className="py-20 bg-dark-800/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              {t('home.topReaders')}
            </h2>
            <p className="text-lg text-gray-400">
              أفضل القراء المعتمدين لدينا
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {mockReaders.map((reader) => (
              <div key={reader.id} className="card-glow">
                <div className="text-center space-y-4">
                  <div className="relative">
                    <div className="w-24 h-24 bg-gold-gradient rounded-full mx-auto flex items-center justify-center text-2xl font-bold text-dark-900">
                      {reader.name.charAt(0)}
                    </div>
                    {reader.isOnline && (
                      <div className="absolute bottom-0 right-1/2 transform translate-x-1/2 translate-y-1/2">
                        <div className="w-6 h-6 bg-green-500 rounded-full border-2 border-dark-800 flex items-center justify-center">
                          <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="text-xl font-semibold text-white">
                      {language === 'ar' ? reader.name : reader.nameEn}
                    </h3>
                    <p className="text-gold-400 text-sm">
                      {language === 'ar' ? reader.title : reader.titleEn}
                    </p>
                    <p className="text-gray-400 text-sm">
                      {language === 'ar' ? reader.bio : reader.bioEn}
                    </p>
                  </div>
                  
                  <div className="flex items-center justify-center space-x-4 rtl:space-x-reverse">
                    <div className="flex items-center space-x-1 rtl:space-x-reverse">
                      <Star className="w-4 h-4 text-gold-400 fill-current" />
                      <span className="text-sm text-gray-300">{reader.rating}</span>
                    </div>
                    <div className="flex items-center space-x-1 rtl:space-x-reverse">
                      <Users className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-400">{reader.totalSessions}</span>
                    </div>
                  </div>
                  
                  <div className="pt-4">
                    <Button className="w-full" size="sm">
                      بدء محادثة - {reader.pricePerMinute} {reader.currency}/دقيقة
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              {t('home.testimonials')}
            </h2>
            <p className="text-lg text-gray-400">
              ماذا يقول عملاؤنا عن تجربتهم معنا
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {mockTestimonials.map((testimonial) => (
              <div key={testimonial.id} className="card">
                <div className="space-y-4">
                  <div className="flex items-center space-x-1 rtl:space-x-reverse">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-5 h-5 ${
                          i < testimonial.rating
                            ? 'text-gold-400 fill-current'
                            : 'text-gray-600'
                        }`}
                      />
                    ))}
                  </div>
                  
                  <p className="text-gray-300 italic">
                    "{language === 'ar' ? testimonial.comment : testimonial.commentEn}"
                  </p>
                  
                  <div className="flex items-center space-x-3 rtl:space-x-reverse">
                    <div className="w-10 h-10 bg-gold-gradient rounded-full flex items-center justify-center text-sm font-bold text-dark-900">
                      {testimonial.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-white font-semibold">
                        {language === 'ar' ? testimonial.name : testimonial.nameEn}
                      </p>
                      <p className="text-gray-400 text-sm">{testimonial.service}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-cosmic-900 to-gold-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="space-y-8">
            <h2 className="text-3xl md:text-4xl font-bold text-white">
              ابدأ رحلتك الروحية اليوم
            </h2>
            <p className="text-xl text-gray-300">
              انضم إلى آلاف العملاء الذين اكتشفوا مستقبلهم معنا
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/signup">
                <Button size="lg">
                  إنشاء حساب مجاني
                </Button>
              </Link>
              <Link to="/services">
                <Button variant="secondary" size="lg">
                  تصفح الخدمات
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home; 