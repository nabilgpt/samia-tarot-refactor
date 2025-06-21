import React, { useState, useEffect } from 'react';
import { User, Mail, Phone, MapPin, Calendar, Edit, Save, X, Camera, Shield } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import AdminLayout from '../../components/Layout/AdminLayout';

const AdminProfilePage = () => {
  const { profile, updateProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    bio: '',
    country: '',
    city: '',
    timezone: '',
    languages: [],
    avatar_url: ''
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        email: profile.email || '',
        phone: profile.phone || '',
        bio: profile.bio || '',
        country: profile.country || '',
        city: profile.city || '',
        timezone: profile.timezone || '',
        languages: profile.languages || ['ar'],
        avatar_url: profile.avatar_url || ''
      });
    }
  }, [profile]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleLanguageChange = (language, checked) => {
    setFormData(prev => ({
      ...prev,
      languages: checked 
        ? [...prev.languages, language]
        : prev.languages.filter(lang => lang !== language)
    }));
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      await updateProfile(formData);
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    // Reset form data to original profile data
    if (profile) {
      setFormData({
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        email: profile.email || '',
        phone: profile.phone || '',
        bio: profile.bio || '',
        country: profile.country || '',
        city: profile.city || '',
        timezone: profile.timezone || '',
        languages: profile.languages || ['ar'],
        avatar_url: profile.avatar_url || ''
      });
    }
    setIsEditing(false);
  };

  const adminStats = {
    totalActions: 1247,
    lastLogin: '2024-01-20 15:30',
    accountCreated: '2023-06-15',
    sessionsToday: 8,
    averageSessionTime: '2h 45m'
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
              <User className="w-8 h-8 mr-3 text-purple-600" />
              الملف الشخصي للإدارة
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              إدارة معلومات الملف الشخصي والإعدادات
            </p>
          </div>
          <div className="flex items-center space-x-3">
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
              >
                <Edit className="w-4 h-4 mr-2" />
                تعديل الملف الشخصي
              </button>
            ) : (
              <div className="flex space-x-2">
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {loading ? 'جاري الحفظ...' : 'حفظ'}
                </button>
                <button
                  onClick={handleCancel}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                >
                  <X className="w-4 h-4 mr-2" />
                  إلغاء
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Card */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="text-center">
                <div className="relative inline-block">
                  <div className="w-32 h-32 bg-gradient-to-br from-purple-400 to-purple-600 rounded-full flex items-center justify-center text-white text-4xl font-bold mx-auto">
                    {formData.avatar_url ? (
                      <img 
                        src={formData.avatar_url} 
                        alt="Profile" 
                        className="w-32 h-32 rounded-full object-cover"
                      />
                    ) : (
                      `${formData.first_name?.[0] || 'A'}${formData.last_name?.[0] || 'D'}`
                    )}
                  </div>
                  {isEditing && (
                    <button className="absolute bottom-0 right-0 bg-purple-600 hover:bg-purple-700 text-white p-2 rounded-full">
                      <Camera className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <h3 className="mt-4 text-xl font-medium text-gray-900 dark:text-white">
                  {formData.first_name} {formData.last_name}
                </h3>
                <div className="flex items-center justify-center mt-2">
                  <Shield className="w-4 h-4 text-purple-600 mr-1" />
                  <span className="text-sm text-purple-600 font-medium">مدير النظام</span>
                </div>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  {formData.bio || 'لا توجد سيرة ذاتية'}
                </p>
              </div>

              {/* Admin Stats */}
              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-600">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">إحصائيات الإدارة</h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">إجمالي الإجراءات:</span>
                    <span className="font-medium text-gray-900 dark:text-white">{adminStats.totalActions}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">آخر دخول:</span>
                    <span className="font-medium text-gray-900 dark:text-white">{adminStats.lastLogin}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">تاريخ إنشاء الحساب:</span>
                    <span className="font-medium text-gray-900 dark:text-white">{adminStats.accountCreated}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">جلسات اليوم:</span>
                    <span className="font-medium text-gray-900 dark:text-white">{adminStats.sessionsToday}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Profile Information */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-6">معلومات الملف الشخصي</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Basic Information */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      الاسم الأول
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        name="first_name"
                        value={formData.first_name}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                      />
                    ) : (
                      <div className="flex items-center text-gray-900 dark:text-white">
                        <User className="w-4 h-4 mr-2 text-gray-400" />
                        {formData.first_name || 'غير محدد'}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      الاسم الأخير
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        name="last_name"
                        value={formData.last_name}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                      />
                    ) : (
                      <div className="flex items-center text-gray-900 dark:text-white">
                        <User className="w-4 h-4 mr-2 text-gray-400" />
                        {formData.last_name || 'غير محدد'}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      البريد الإلكتروني
                    </label>
                    {isEditing ? (
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                      />
                    ) : (
                      <div className="flex items-center text-gray-900 dark:text-white">
                        <Mail className="w-4 h-4 mr-2 text-gray-400" />
                        {formData.email || 'غير محدد'}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      رقم الهاتف
                    </label>
                    {isEditing ? (
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                      />
                    ) : (
                      <div className="flex items-center text-gray-900 dark:text-white">
                        <Phone className="w-4 h-4 mr-2 text-gray-400" />
                        {formData.phone || 'غير محدد'}
                      </div>
                    )}
                  </div>
                </div>

                {/* Location & Preferences */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      البلد
                    </label>
                    {isEditing ? (
                      <select
                        name="country"
                        value={formData.country}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                      >
                        <option value="">اختر البلد</option>
                        <option value="MA">المغرب</option>
                        <option value="SA">السعودية</option>
                        <option value="AE">الإمارات</option>
                        <option value="EG">مصر</option>
                        <option value="JO">الأردن</option>
                      </select>
                    ) : (
                      <div className="flex items-center text-gray-900 dark:text-white">
                        <MapPin className="w-4 h-4 mr-2 text-gray-400" />
                        {formData.country || 'غير محدد'}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      المدينة
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        name="city"
                        value={formData.city}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                      />
                    ) : (
                      <div className="flex items-center text-gray-900 dark:text-white">
                        <MapPin className="w-4 h-4 mr-2 text-gray-400" />
                        {formData.city || 'غير محدد'}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      المنطقة الزمنية
                    </label>
                    {isEditing ? (
                      <select
                        name="timezone"
                        value={formData.timezone}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                      >
                        <option value="">اختر المنطقة الزمنية</option>
                        <option value="Africa/Casablanca">الدار البيضاء (GMT+1)</option>
                        <option value="Asia/Riyadh">الرياض (GMT+3)</option>
                        <option value="Asia/Dubai">دبي (GMT+4)</option>
                        <option value="Africa/Cairo">القاهرة (GMT+2)</option>
                      </select>
                    ) : (
                      <div className="flex items-center text-gray-900 dark:text-white">
                        <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                        {formData.timezone || 'غير محدد'}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      اللغات
                    </label>
                    {isEditing ? (
                      <div className="space-y-2">
                        {[
                          { code: 'ar', name: 'العربية' },
                          { code: 'en', name: 'English' },
                          { code: 'fr', name: 'Français' }
                        ].map((language) => (
                          <label key={language.code} className="flex items-center">
                            <input
                              type="checkbox"
                              checked={formData.languages.includes(language.code)}
                              onChange={(e) => handleLanguageChange(language.code, e.target.checked)}
                              className="rounded border-gray-300 text-purple-600 shadow-sm focus:border-purple-300 focus:ring focus:ring-purple-200 focus:ring-opacity-50"
                            />
                            <span className="mr-2 text-sm text-gray-700 dark:text-gray-300">{language.name}</span>
                          </label>
                        ))}
                      </div>
                    ) : (
                      <div className="text-gray-900 dark:text-white">
                        {formData.languages.length > 0 ? formData.languages.join(', ') : 'غير محدد'}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Bio Section */}
              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-600">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  السيرة الذاتية
                </label>
                {isEditing ? (
                  <textarea
                    name="bio"
                    value={formData.bio}
                    onChange={handleInputChange}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    placeholder="اكتب نبذة عن نفسك..."
                  />
                ) : (
                  <div className="text-gray-900 dark:text-white p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    {formData.bio || 'لا توجد سيرة ذاتية'}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminProfilePage; 