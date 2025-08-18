import React, { useState, useEffect } from 'react';
import { 
  Brain, 
  Activity, 
  Bell, 
  Users, 
  Gift, 
  Settings, 
  Zap,
  Target,
  TrendingUp,
  Award,
  Command,
  BarChart3
} from 'lucide-react';
import AdminLayout from '../../components/Layout/AdminLayout';
import QuickCommandPalette from '../../components/Admin/QuickCommandPalette';
import ActivityFeed from '../../components/Admin/ActivityFeed';
import NotificationRulesBuilder from '../../components/Admin/NotificationRulesBuilder';
import AICopilotSuggestions from '../../components/Admin/AICopilotSuggestions';
import BulkOperationsManager from '../../components/Admin/BulkOperationsManager';
import ReferralSystemManager from '../../components/Admin/ReferralSystemManager';

const AdminAdvancedFeaturesPage = () => {
  const [activeTab, setActiveTab] = useState('activity');

  const tabs = [
    { id: 'activity', label: 'سجل الأنشطة', icon: Activity, component: ActivityFeed },
    { id: 'ai-copilot', label: 'المساعد الذكي', icon: Brain, component: AICopilotSuggestions },
    { id: 'notifications', label: 'قواعد الإشعارات', icon: Bell, component: NotificationRulesBuilder },
    { id: 'bulk-ops', label: 'العمليات الجماعية', icon: Users, component: BulkOperationsManager },
    { id: 'referrals', label: 'نظام الإحالات', icon: Gift, component: ReferralSystemManager }
  ];

  const renderTabContent = () => {
    const activeTabData = tabs.find(tab => tab.id === activeTab);
    if (!activeTabData) return null;

    const Component = activeTabData.component;
    
    switch (activeTab) {
      case 'activity':
        return <Component className="h-full" showFilters={true} limit={50} />;
      case 'ai-copilot':
        return <Component contextType="admin_dashboard" className="h-full" />;
      case 'notifications':
        return <Component />;
      case 'bulk-ops':
        return (
          <Component 
            entityType="users" 
            onDataUpdate={() => console.log('Data updated')}
            className="h-full"
          />
        );
      case 'referrals':
        return <Component />;
      default:
        return <div>المحتوى غير متاح</div>;
    }
  };

  return (
    <AdminLayout>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="py-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
                    <Zap className="w-6 h-6 mr-3 text-purple-600" />
                    الميزات المتقدمة للإدارة
                  </h1>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    أدوات متقدمة لإدارة المنصة بكفاءة عالية
                  </p>
                </div>
                
                <div className="flex items-center space-x-4">
                  <div className="flex items-center px-3 py-2 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-lg">
                    <Target className="w-4 h-4 mr-2" />
                    <span className="text-sm font-medium">جميع الأنظمة تعمل</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Activity className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                        الأنشطة اليوم
                      </dt>
                      <dd className="text-lg font-medium text-gray-900 dark:text-white">
                        1,247
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Brain className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                        اقتراحات الذكاء الاصطناعي
                      </dt>
                      <dd className="text-lg font-medium text-gray-900 dark:text-white">
                        23
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Bell className="h-6 w-6 text-yellow-600" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                        قواعد الإشعارات النشطة
                      </dt>
                      <dd className="text-lg font-medium text-gray-900 dark:text-white">
                        12
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <TrendingUp className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                        معدل الكفاءة
                      </dt>
                      <dd className="text-lg font-medium text-gray-900 dark:text-white">
                        94.5%
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
            {/* Tab Navigation */}
            <div className="border-b border-gray-200 dark:border-gray-700">
              <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
                {tabs.map((tab) => {
                  const IconComponent = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`${
                        activeTab === tab.id
                          ? 'border-purple-500 text-purple-600 dark:text-purple-400'
                          : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                      } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center transition-colors`}
                    >
                      <IconComponent className="w-4 h-4 mr-2" />
                      {tab.label}
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Tab Content */}
            <div className="p-6">
              {renderTabContent()}
            </div>
          </div>

          {/* Quick Actions Panel */}
          <div className="mt-8 bg-white dark:bg-gray-800 shadow rounded-lg">
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
                <Settings className="w-5 h-5 mr-2 text-gray-600 dark:text-gray-400" />
                إجراءات سريعة
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <button className="flex flex-col items-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors">
                  <Activity className="w-6 h-6 text-purple-600 dark:text-purple-400 mb-2" />
                  <span className="text-sm font-medium text-gray-900 dark:text-white">تحديث البيانات</span>
                </button>
                
                <button className="flex flex-col items-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors">
                  <Brain className="w-6 h-6 text-blue-600 dark:text-blue-400 mb-2" />
                  <span className="text-sm font-medium text-gray-900 dark:text-white">تحليل ذكي</span>
                </button>
                
                <button className="flex flex-col items-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors">
                  <Award className="w-6 h-6 text-green-600 dark:text-green-400 mb-2" />
                  <span className="text-sm font-medium text-gray-900 dark:text-white">منح مكافآت</span>
                </button>
                
                <button className="flex flex-col items-center p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg hover:bg-yellow-100 dark:hover:bg-yellow-900/30 transition-colors">
                  <Bell className="w-6 h-6 text-yellow-600 dark:text-yellow-400 mb-2" />
                  <span className="text-sm font-medium text-gray-900 dark:text-white">إرسال إشعار</span>
                </button>
                
                <button className="flex flex-col items-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors">
                  <Users className="w-6 h-6 text-red-600 dark:text-red-400 mb-2" />
                  <span className="text-sm font-medium text-gray-900 dark:text-white">عملية جماعية</span>
                </button>
                
                <button className="flex flex-col items-center p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-colors">
                  <Gift className="w-6 h-6 text-indigo-600 dark:text-indigo-400 mb-2" />
                  <span className="text-sm font-medium text-gray-900 dark:text-white">إدارة الإحالات</span>
                </button>
              </div>
            </div>
          </div>

          {/* Help & Documentation */}
          <div className="mt-8 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  هل تحتاج مساعدة؟
                </h3>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  تعرف على كيفية استخدام الميزات المتقدمة بكفاءة أكبر
                </p>
              </div>
              <div className="flex space-x-3">
                <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-purple-700 bg-purple-100 hover:bg-purple-200 dark:text-purple-300 dark:bg-purple-800 dark:hover:bg-purple-700 transition-colors">
                  دليل المستخدم
                </button>
                <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 transition-colors">
                  تواصل مع الدعم
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminAdvancedFeaturesPage; 