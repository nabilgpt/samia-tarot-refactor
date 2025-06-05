import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Settings, 
  Cpu, 
  Database, 
  Bell,
  ChevronRight
} from 'lucide-react';
import { useUI } from '../../context/UIContext';
import AIProvidersPanel from './AIProvidersPanel';
import DatabaseStoragePanel from './DatabaseStoragePanel';
import BroadcastNotifications from './BroadcastNotifications';

const SystemSettingsTab = () => {
  const { t } = useTranslation();
  const { language } = useUI();
  const [activeSubTab, setActiveSubTab] = useState('ai-providers');

  const subTabs = [
    {
      id: 'ai-providers',
      name: language === 'ar' ? 'مقدمو الذكاء الاصطناعي' : 'AI Providers',
      icon: Cpu,
      component: AIProvidersPanel,
      description: language === 'ar' ? 'إدارة مقدمي الذكاء الاصطناعي والنماذج' : 'Manage AI providers and models'
    },
    {
      id: 'database-storage',
      name: language === 'ar' ? 'قاعدة البيانات والتخزين' : 'Database & Storage',
      icon: Database,
      component: DatabaseStoragePanel,
      description: language === 'ar' ? 'إعدادات Supabase و Backblaze B2' : 'Supabase and Backblaze B2 settings'
    },
    {
      id: 'notifications',
      name: language === 'ar' ? 'نظام الإشعارات' : 'Notification System',
      icon: Bell,
      component: BroadcastNotifications,
      description: language === 'ar' ? 'إرسال الإشعارات للمستخدمين' : 'Send notifications to users'
    }
  ];

  const ActiveComponent = subTabs.find(tab => tab.id === activeSubTab)?.component;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-3 rtl:space-x-reverse">
        <div className="w-10 h-10 bg-gradient-to-r from-cosmic-500 to-cosmic-600 rounded-lg flex items-center justify-center">
          <Settings className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">
            {language === 'ar' ? 'إعدادات النظام' : 'System Settings'}
          </h2>
          <p className="text-gray-400 text-sm">
            {language === 'ar' ? 'إدارة إعدادات النظام والخدمات الخارجية' : 'Manage system settings and external services'}
          </p>
        </div>
      </div>

      {/* Sub-tabs Navigation */}
      <div className="bg-dark-800/50 backdrop-blur-xl border border-gold-400/20 rounded-2xl overflow-hidden shadow-2xl shadow-cosmic-500/10">
        <div className="border-b border-gold-400/20">
          <nav className="flex flex-wrap">
            {subTabs.map((tab) => {
              const IconComponent = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveSubTab(tab.id)}
                  className={`flex-1 min-w-0 py-4 px-6 border-b-2 font-medium text-sm transition-all duration-200 ${
                    activeSubTab === tab.id
                      ? 'border-cosmic-500 text-cosmic-400 bg-cosmic-500/10'
                      : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-600 hover:bg-dark-700/30'
                  }`}
                >
                  <div className="flex items-center justify-center space-x-2 rtl:space-x-reverse">
                    <IconComponent className="w-4 h-4" />
                    <span className="hidden sm:inline">{tab.name}</span>
                  </div>
                  <p className={`text-xs mt-1 hidden md:block ${
                    activeSubTab === tab.id ? 'text-cosmic-300' : 'text-gray-500'
                  }`}>
                    {tab.description}
                  </p>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sub-tab Content */}
        <div className="p-6">
          {ActiveComponent && <ActiveComponent />}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {subTabs.map((tab) => {
          const IconComponent = tab.icon;
          return (
            <button
              key={`quick-${tab.id}`}
              onClick={() => setActiveSubTab(tab.id)}
              className={`p-4 rounded-xl border transition-all duration-200 text-left ${
                activeSubTab === tab.id
                  ? 'bg-cosmic-500/20 border-cosmic-400/40 shadow-lg shadow-cosmic-500/20'
                  : 'bg-dark-800/30 border-gold-400/20 hover:bg-dark-700/50 hover:border-gold-400/40'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  activeSubTab === tab.id
                    ? 'bg-cosmic-500/30 text-cosmic-300'
                    : 'bg-gold-500/20 text-gold-400'
                }`}>
                  <IconComponent className="w-4 h-4" />
                </div>
                <ChevronRight className={`w-4 h-4 transition-transform duration-200 ${
                  activeSubTab === tab.id ? 'text-cosmic-400 rotate-90' : 'text-gray-400'
                }`} />
              </div>
              <h3 className={`font-semibold mb-1 ${
                activeSubTab === tab.id ? 'text-cosmic-300' : 'text-white'
              }`}>
                {tab.name}
              </h3>
              <p className={`text-xs ${
                activeSubTab === tab.id ? 'text-cosmic-400' : 'text-gray-400'
              }`}>
                {tab.description}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default SystemSettingsTab; 