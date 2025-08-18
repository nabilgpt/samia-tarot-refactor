import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Gift, 
  TrendingUp, 
  Award, 
  Settings, 
  Edit, 
  Save, 
  X,
  Star,
  DollarSign,
  Target,
  Share2,
  Crown,
  Zap
} from 'lucide-react';

const ReferralSystemManager = () => {
  const [stats, setStats] = useState(null);
  const [settings, setSettings] = useState([]);
  const [topReferrers, setTopReferrers] = useState([]);
  const [editingSettings, setEditingSettings] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReferralData();
  }, []);

  const loadReferralData = async () => {
    setLoading(true);
    try {
      const [statsRes, settingsRes] = await Promise.all([
        fetch('/api/admin/referrals/stats', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }),
        fetch('/api/admin/referrals/settings', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        })
      ]);

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData.data);
        setTopReferrers(statsData.data.top_referrers || []);
      }

      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        setSettings(settingsData.data || []);
      }
    } catch (error) {
      console.error('Failed to load referral data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (settingId, updates) => {
    try {
      const response = await fetch(`/api/admin/referrals/settings/${settingId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(updates)
      });

      if (response.ok) {
        const updatedSetting = await response.json();
        setSettings(prev => prev.map(s => 
          s.id === settingId ? { ...s, ...updates } : s
        ));
      }
    } catch (error) {
      console.error('Failed to update setting:', error);
    }
  };

  const generateReferralCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
            <Share2 className="w-6 h-6 mr-3 text-purple-600" />
            نظام الإحالات والمكافآت
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            إدارة برنامج الإحالات ونقاط المكافآت
          </p>
        </div>
        <button
          onClick={() => setEditingSettings(!editingSettings)}
          className="inline-flex items-center px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
        >
          <Settings className="w-4 h-4 mr-2" />
          {editingSettings ? 'إنهاء التعديل' : 'تعديل الإعدادات'}
        </button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <Users className="w-6 h-6 text-blue-600 dark:text-blue-300" />
            </div>
            <div className="mr-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                إجمالي الإحالات
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats?.total_referrals || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg">
              <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-300" />
            </div>
            <div className="mr-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                الإحالات النشطة
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats?.active_referrals || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
              <Award className="w-6 h-6 text-yellow-600 dark:text-yellow-300" />
            </div>
            <div className="mr-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                الإحالات المكتملة
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats?.completed_referrals || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-lg">
              <Star className="w-6 h-6 text-purple-600 dark:text-purple-300" />
            </div>
            <div className="mr-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                النقاط الممنوحة
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats?.total_points_awarded || 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Referral Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
              <Settings className="w-5 h-5 mr-2 text-gray-600 dark:text-gray-400" />
              إعدادات المكافآت
            </h3>
          </div>
          
          <div className="p-6 space-y-4">
            {settings.map((setting) => (
              <ReferralSettingCard
                key={setting.id}
                setting={setting}
                editing={editingSettings}
                onUpdate={(updates) => updateSetting(setting.id, updates)}
              />
            ))}
          </div>
        </div>

        {/* Top Referrers */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
              <Crown className="w-5 h-5 mr-2 text-yellow-600" />
              أفضل المحيلين
            </h3>
          </div>
          
          <div className="p-6">
            {topReferrers.length === 0 ? (
              <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>لا توجد إحالات حتى الآن</p>
              </div>
            ) : (
              <div className="space-y-4">
                {topReferrers.map((referrer, index) => (
                  <div
                    key={referrer.user_id}
                    className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
                  >
                    <div className="flex items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mr-3 ${
                        index === 0 ? 'bg-yellow-100 text-yellow-800' :
                        index === 1 ? 'bg-gray-100 text-gray-800' :
                        index === 2 ? 'bg-orange-100 text-orange-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {referrer.name}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {referrer.referrals_count} إحالة
                        </p>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="flex items-center text-purple-600 dark:text-purple-300">
                        <Star className="w-4 h-4 mr-1" />
                        <span className="font-bold">{referrer.points_earned}</span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">نقطة</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Referral Code Generator */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
            <Zap className="w-5 h-5 mr-2 text-purple-600" />
            مولد رموز الإحالة
          </h3>
        </div>
        
        <div className="p-6">
          <ReferralCodeGenerator onGenerate={generateReferralCode} />
        </div>
      </div>
    </div>
  );
};

// Referral Setting Card Component
const ReferralSettingCard = ({ setting, editing, onUpdate }) => {
  const [localValue, setLocalValue] = useState(setting.points_value);
  const [isActive, setIsActive] = useState(setting.is_active);

  const handleSave = () => {
    onUpdate({
      points_value: localValue,
      is_active: isActive
    });
  };

  const getSettingIcon = (type) => {
    const iconMap = {
      referral_bonus_referrer: Share2,
      referral_bonus_referred: Gift,
      service_completion: Target,
      feedback_submission: Star,
      profile_completion: Users
    };
    return iconMap[type] || Award;
  };

  const getSettingTitle = (type) => {
    const titleMap = {
      referral_bonus_referrer: 'مكافأة المحيل',
      referral_bonus_referred: 'مكافأة المحال',
      service_completion: 'إكمال الخدمة',
      feedback_submission: 'تقديم تقييم',
      profile_completion: 'إكمال الملف الشخصي'
    };
    return titleMap[type] || type;
  };

  const IconComponent = getSettingIcon(setting.setting_type);

  return (
    <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center">
          <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg mr-3">
            <IconComponent className="w-4 h-4 text-purple-600 dark:text-purple-300" />
          </div>
          <div>
            <h4 className="font-medium text-gray-900 dark:text-white">
              {getSettingTitle(setting.setting_type)}
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {setting.conditions && Object.entries(setting.conditions).map(([key, value]) => 
                `${key}: ${value}`
              ).join(', ')}
            </p>
          </div>
        </div>
        
        {editing && (
          <button
            onClick={handleSave}
            className="p-2 bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-300 rounded-lg hover:bg-green-200 dark:hover:bg-green-800 transition-colors"
          >
            <Save className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            النقاط
          </label>
          {editing ? (
            <input
              type="number"
              value={localValue}
              onChange={(e) => setLocalValue(parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
          ) : (
            <div className="flex items-center">
              <Star className="w-4 h-4 text-yellow-500 mr-1" />
              <span className="font-bold text-gray-900 dark:text-white">
                {setting.points_value}
              </span>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            الحالة
          </label>
          {editing ? (
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="rounded border-gray-300 text-purple-600 shadow-sm focus:border-purple-300 focus:ring focus:ring-purple-200 focus:ring-opacity-50"
              />
              <span className="mr-2 text-sm text-gray-700 dark:text-gray-300">
                نشط
              </span>
            </label>
          ) : (
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
              setting.is_active
                ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
            }`}>
              {setting.is_active ? 'نشط' : 'معطل'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

// Referral Code Generator Component
const ReferralCodeGenerator = ({ onGenerate }) => {
  const [generatedCode, setGeneratedCode] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [generating, setGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!userEmail.trim()) {
      alert('يرجى إدخال البريد الإلكتروني للمستخدم');
      return;
    }

    setGenerating(true);
    try {
      const code = onGenerate();
      setGeneratedCode(code);
      
      // Here you would typically create the referral code in the backend
      const response = await fetch('/api/admin/referrals/generate-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          user_email: userEmail,
          referral_code: code
        })
      });

      if (response.ok) {
        alert(`تم إنشاء رمز الإحالة بنجاح: ${code}`);
      }
    } catch (error) {
      console.error('Failed to generate referral code:', error);
      alert('فشل في إنشاء رمز الإحالة');
    } finally {
      setGenerating(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedCode);
    alert('تم نسخ الرمز');
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            البريد الإلكتروني للمستخدم
          </label>
          <input
            type="email"
            value={userEmail}
            onChange={(e) => setUserEmail(e.target.value)}
            placeholder="user@example.com"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            رمز الإحالة المولد
          </label>
          <div className="flex">
            <input
              type="text"
              value={generatedCode}
              readOnly
                              placeholder={t('admin.referralSystem.codeGenerated')}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-l-lg bg-gray-50 dark:bg-gray-600 text-gray-900 dark:text-white"
            />
            {generatedCode && (
              <button
                onClick={copyToClipboard}
                className="px-3 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-r-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
                title={t('admin.referralSystem.copyCode')}
              >
                📋
              </button>
            )}
          </div>
        </div>
      </div>

      <button
        onClick={handleGenerate}
        disabled={generating || !userEmail.trim()}
        className="w-full py-2 px-4 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white rounded-lg transition-colors disabled:cursor-not-allowed"
      >
        {generating ? 'جاري التوليد...' : 'توليد رمز إحالة جديد'}
      </button>
    </div>
  );
};

export default ReferralSystemManager; 