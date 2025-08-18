import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../../context/AuthContext';
import { useUI } from '../../../context/UIContext';
import PaymentsTab from '../PaymentsTab';
import PaymentSettingsManager from '../PaymentSettingsManager';
import RewardsManagement from '../RewardsManagement';
import {
  CurrencyDollarIcon,
  CogIcon,
  ChartBarIcon,
  CreditCardIcon,
  TrophyIcon
} from '@heroicons/react/24/outline';

const PaymentsAndWallets = () => {
  const { profile } = useAuth();
  const { language } = useUI();
  const [activeTab, setActiveTab] = useState('transactions');

  // Check if user has access to payment settings
  const hasSettingsAccess = profile?.role === 'admin' || profile?.role === 'super_admin';

  const tabs = [
    { 
      id: 'transactions', 
      label: language === 'ar' ? 'المعاملات' : 'Transactions',
      icon: CurrencyDollarIcon
    },
    { 
      id: 'analytics', 
      label: language === 'ar' ? 'التحليلات' : 'Analytics',
      icon: ChartBarIcon
    },
    { 
      id: 'rewards', 
      label: language === 'ar' ? 'نظام المكافآت' : 'Rewards System',
      icon: TrophyIcon
    }
  ];

  // Add settings tab only for admin/super admin
  if (hasSettingsAccess) {
    tabs.push({
      id: 'settings',
      label: language === 'ar' ? 'إعدادات الدفع' : 'Payment Settings',
      icon: CogIcon
    });
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'transactions':
        return <PaymentsTab />;
      case 'analytics':
        return (
          <div className="bg-white/5 backdrop-blur-sm border border-white/20 rounded-xl p-8 text-center">
            <ChartBarIcon className="w-16 h-16 text-cosmic-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">
              {language === 'ar' ? 'تحليلات المدفوعات' : 'Payment Analytics'}
            </h3>
            <p className="text-cosmic-300">
              {language === 'ar' ? 'قريباً...' : 'Coming soon...'}
            </p>
          </div>
        );
      case 'rewards':
        return <RewardsManagement />;
      case 'settings':
        return hasSettingsAccess ? <PaymentSettingsManager /> : null;
      default:
        return <PaymentsTab />;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 100, damping: 15 }}
      className="space-y-6"
    >
      {/* Title and Description */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-red-400 bg-clip-text text-transparent">
          {language === 'ar' ? 'إدارة المدفوعات' : 'Payments Management'}
        </h2>
        <p className="text-gray-400 mt-1">
          {language === 'ar' ? 'عرض وإدارة جميع المعاملات المالية في النظام' : 'View and manage all payment transactions in the system'}
        </p>
      </div>
      {/* Tab Navigation */}
      <div className="bg-white/5 backdrop-blur-sm border border-white/20 rounded-xl p-2">
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <motion.button
                key={tab.id}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                  activeTab === tab.id
                    ? 'bg-purple-600 text-white'
                    : 'text-cosmic-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="text-sm font-medium">{tab.label}</span>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {renderTabContent()}
      </motion.div>
    </motion.div>
  );
};

export default PaymentsAndWallets; 