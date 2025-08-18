import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useUI } from '../../context/UIContext';
import api from '../../services/frontendApi.js';
import {
  TrophyIcon,
  UserGroupIcon,
  ChartBarIcon,
  CogIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  MinusIcon,
  PencilIcon,
  EyeIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  StarIcon,
  GiftIcon,
  ShareIcon,
  CurrencyDollarIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  FireIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';

const RewardsManagement = () => {
  const { user, profile } = useAuth();
  const { language, showSuccess, showError } = useUI();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [usersData, setUsersData] = useState([]);
  const [rewardsStats, setRewardsStats] = useState(null);
  const [rewardsConfig, setRewardsConfig] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [adjustmentData, setAdjustmentData] = useState({ points: '', reason: '' });
  const [adjusting, setAdjusting] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [configChanges, setConfigChanges] = useState({});

  // Check if user has admin access
  const hasAccess = profile?.role === 'admin' || profile?.role === 'super_admin';
  const isSuperAdmin = profile?.role === 'super_admin';

  useEffect(() => {
    if (hasAccess) {
      loadRewardsData();
    }
  }, [hasAccess]);

  const loadRewardsData = async () => {
    try {
      setLoading(true);
      
      // Load all data in parallel
      const [usersResult, statsResult, configResult] = await Promise.all([
        api.getAllUsersRewards(1, 50, searchTerm),
        api.getRewardsStats(),
        api.getRewardsConfig()
      ]);

      if (usersResult.success) {
        setUsersData(usersResult.data || []);
      }

      if (statsResult.success) {
        setRewardsStats(statsResult.data);
      }

      if (configResult.success) {
        setRewardsConfig(configResult.data || []);
        // Initialize config changes
        const initialChanges = {};
        configResult.data?.forEach(config => {
          initialChanges[config.key] = config.value;
        });
        setConfigChanges(initialChanges);
      }
    } catch (error) {
      console.error('Error loading rewards data:', error);
      showError('Failed to load rewards data');
    } finally {
      setLoading(false);
    }
  };

  const handleAdjustPoints = async () => {
    if (!selectedUser || !adjustmentData.points || !adjustmentData.reason) {
      showError('Please fill in all fields');
      return;
    }

    try {
      setAdjusting(true);
      const result = await api.adjustUserPoints(
        selectedUser.user_id,
        parseInt(adjustmentData.points),
        adjustmentData.reason
      );

      if (result.success) {
        showSuccess(result.message);
        setShowAdjustModal(false);
        setSelectedUser(null);
        setAdjustmentData({ points: '', reason: '' });
        await loadRewardsData(); // Refresh data
      } else {
        showError(result.error);
      }
    } catch (error) {
      console.error('Error adjusting points:', error);
      showError('Failed to adjust user points');
    } finally {
      setAdjusting(false);
    }
  };

  const handleUpdateConfig = async () => {
    try {
      const configArray = Object.entries(configChanges).map(([key, value]) => ({
        key,
        value: value.toString()
      }));

      const result = await api.updateRewardsConfig(configArray);

      if (result.success) {
        showSuccess(result.message);
        setShowConfigModal(false);
        await loadRewardsData(); // Refresh data
      } else {
        showError(result.error);
      }
    } catch (error) {
      console.error('Error updating config:', error);
      showError('Failed to update configuration');
    }
  };

  const getTransactionTypeColor = (type) => {
    const colors = {
      earn: 'text-green-400',
      redeem: 'text-red-400',
      referral: 'text-purple-400',
      booking_bonus: 'text-yellow-400',
      welcome_bonus: 'text-pink-400',
      admin_adjust: 'text-blue-400'
    };
    return colors[type] || 'text-cosmic-300';
  };

  const filteredUsers = usersData.filter(user => 
    user.profiles?.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.profiles?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!hasAccess) {
    return (
      <div className="bg-white/5 backdrop-blur-sm border border-white/20 rounded-xl p-8 text-center">
        <ExclamationTriangleIcon className="w-16 h-16 text-red-400 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-white mb-2">Access Denied</h3>
        <p className="text-cosmic-300">Rewards Management is only available to Admin and Super Admin users.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-white/5 backdrop-blur-sm border border-white/20 rounded-xl p-8 text-center">
        <div className="animate-spin w-12 h-12 border-4 border-purple-400 border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-cosmic-300">Loading rewards management...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center">
            <TrophyIcon className="w-8 h-8 text-yellow-400 mr-3" />
            {language === 'ar' ? 'إدارة نظام المكافآت' : 'Rewards Management'}
          </h2>
          <p className="text-cosmic-300 mt-1">
            {language === 'ar' 
              ? 'إدارة نقاط المستخدمين وإعدادات نظام المكافآت' 
              : 'Manage user points and rewards system configuration'
            }
          </p>
        </div>
      </div>

      {/* Stats Overview */}
      {rewardsStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 backdrop-blur-sm border border-white/20 rounded-xl p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-cosmic-300 text-sm">
                  {language === 'ar' ? 'إجمالي المستخدمين' : 'Total Users'}
                </p>
                <p className="text-2xl font-bold text-white">
                  {rewardsStats.total_users?.toLocaleString() || 0}
                </p>
              </div>
              <UserGroupIcon className="w-8 h-8 text-purple-400" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-r from-green-600/20 to-emerald-600/20 backdrop-blur-sm border border-white/20 rounded-xl p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-cosmic-300 text-sm">
                  {language === 'ar' ? 'النقاط المتداولة' : 'Points in Circulation'}
                </p>
                <p className="text-2xl font-bold text-white">
                  {rewardsStats.total_points_in_circulation?.toLocaleString() || 0}
                </p>
              </div>
              <StarIcon className="w-8 h-8 text-green-400" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-r from-blue-600/20 to-cyan-600/20 backdrop-blur-sm border border-white/20 rounded-xl p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-cosmic-300 text-sm">
                  {language === 'ar' ? 'المعاملات اليوم' : 'Today\'s Transactions'}
                </p>
                <p className="text-2xl font-bold text-white">
                  {rewardsStats.recent_activity?.length || 0}
                </p>
              </div>
              <ChartBarIcon className="w-8 h-8 text-blue-400" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="bg-gradient-to-r from-orange-600/20 to-red-600/20 backdrop-blur-sm border border-white/20 rounded-xl p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-cosmic-300 text-sm">
                  {language === 'ar' ? 'الاستبدالات' : 'Redemptions'}
                </p>
                <p className="text-2xl font-bold text-white">
                  {rewardsStats.transaction_stats?.find(s => s.type === 'redeem')?.count || 0}
                </p>
              </div>
              <GiftIcon className="w-8 h-8 text-orange-400" />
            </div>
          </motion.div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="bg-white/5 backdrop-blur-sm border border-white/20 rounded-xl p-2">
        <div className="flex space-x-2">
          {[
            { id: 'overview', label: language === 'ar' ? 'نظرة عامة' : 'Overview', icon: ChartBarIcon },
            { id: 'users', label: language === 'ar' ? 'المستخدمين' : 'Users', icon: UserGroupIcon },
            { id: 'activity', label: language === 'ar' ? 'النشاط' : 'Activity', icon: ClockIcon },
            ...(isSuperAdmin ? [{ id: 'config', label: language === 'ar' ? 'الإعدادات' : 'Config', icon: CogIcon }] : [])
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-300 ${
                activeTab === tab.id
                  ? 'bg-purple-600 text-white'
                  : 'text-cosmic-300 hover:text-white hover:bg-white/10'
              }`}
            >
              <tab.icon className="w-5 h-5" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'overview' && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* Transaction Stats */}
            <div className="bg-white/5 backdrop-blur-sm border border-white/20 rounded-xl p-6">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center">
                <ChartBarIcon className="w-6 h-6 text-cyan-400 mr-2" />
                {language === 'ar' ? 'إحصائيات المعاملات' : 'Transaction Statistics'}
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {rewardsStats?.transaction_stats?.map((stat) => (
                  <div key={stat.type} className="bg-white/5 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-cosmic-300 text-sm capitalize">
                          {stat.type.replace('_', ' ')}
                        </p>
                        <p className="text-xl font-bold text-white">
                          {stat.count || 0}
                        </p>
                        <p className={`text-sm ${getTransactionTypeColor(stat.type)}`}>
                          {stat.sum > 0 ? '+' : ''}{stat.sum || 0} pts
                        </p>
                      </div>
                      <div className={`p-2 rounded-lg ${
                        stat.type === 'earn' ? 'bg-green-500/20' :
                        stat.type === 'redeem' ? 'bg-red-500/20' :
                        stat.type === 'referral' ? 'bg-purple-500/20' :
                        'bg-blue-500/20'
                      }`}>
                        {stat.type === 'earn' && <ArrowUpIcon className="w-5 h-5 text-green-400" />}
                        {stat.type === 'redeem' && <ArrowDownIcon className="w-5 h-5 text-red-400" />}
                        {stat.type === 'referral' && <ShareIcon className="w-5 h-5 text-purple-400" />}
                        {!['earn', 'redeem', 'referral'].includes(stat.type) && <SparklesIcon className="w-5 h-5 text-blue-400" />}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'users' && (
          <motion.div
            key="users"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* Search and Filters */}
            <div className="bg-white/5 backdrop-blur-sm border border-white/20 rounded-xl p-4">
              <div className="flex items-center space-x-4">
                <div className="flex-1 relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-cosmic-300" />
                  <input
                    type="text"
                    placeholder={language === 'ar' ? 'البحث عن المستخدمين...' : 'Search users...'}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-cosmic-300 focus:border-purple-400 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Users Table */}
            <div className="bg-white/5 backdrop-blur-sm border border-white/20 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-white/10">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-cosmic-300 uppercase tracking-wider">
                        {language === 'ar' ? 'المستخدم' : 'User'}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-cosmic-300 uppercase tracking-wider">
                        {language === 'ar' ? 'الرصيد' : 'Balance'}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-cosmic-300 uppercase tracking-wider">
                        {language === 'ar' ? 'المكتسب' : 'Earned'}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-cosmic-300 uppercase tracking-wider">
                        {language === 'ar' ? 'المستبدل' : 'Redeemed'}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-cosmic-300 uppercase tracking-wider">
                        {language === 'ar' ? 'الإجراءات' : 'Actions'}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {filteredUsers.map((userData) => (
                      <tr key={userData.user_id} className="hover:bg-white/5">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-white">
                              {userData.profiles?.username || 'Unknown User'}
                            </div>
                            <div className="text-sm text-cosmic-300">
                              {userData.profiles?.email}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-bold text-purple-400">
                            {userData.balance?.toLocaleString() || 0}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-green-400">
                            {userData.lifetime_earned?.toLocaleString() || 0}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-red-400">
                            {userData.lifetime_redeemed?.toLocaleString() || 0}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => {
                                setSelectedUser(userData);
                                setShowAdjustModal(true);
                              }}
                              className="p-2 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded-lg transition-colors"
                              title={language === 'ar' ? 'تعديل النقاط' : 'Adjust Points'}
                            >
                              <PencilIcon className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'activity' && (
          <motion.div
            key="activity"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <div className="bg-white/5 backdrop-blur-sm border border-white/20 rounded-xl p-6">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center">
                <ClockIcon className="w-6 h-6 text-cyan-400 mr-2" />
                {language === 'ar' ? 'النشاط الأخير' : 'Recent Activity'}
              </h3>
              
              <div className="space-y-3">
                {rewardsStats?.recent_activity?.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-center justify-between p-4 bg-white/5 rounded-lg"
                  >
                    <div className="flex items-center space-x-4">
                      <div className={`p-2 rounded-lg ${
                        activity.type === 'earn' ? 'bg-green-500/20' :
                        activity.type === 'redeem' ? 'bg-red-500/20' :
                        activity.type === 'referral' ? 'bg-purple-500/20' :
                        'bg-blue-500/20'
                      }`}>
                        {activity.type === 'earn' && <ArrowUpIcon className="w-4 h-4 text-green-400" />}
                        {activity.type === 'redeem' && <ArrowDownIcon className="w-4 h-4 text-red-400" />}
                        {activity.type === 'referral' && <ShareIcon className="w-4 h-4 text-purple-400" />}
                        {!['earn', 'redeem', 'referral'].includes(activity.type) && <SparklesIcon className="w-4 h-4 text-blue-400" />}
                      </div>
                      <div>
                        <p className="text-white font-medium">
                          {activity.profiles?.username || 'Unknown User'}
                        </p>
                        <p className="text-cosmic-300 text-sm">
                          {activity.description}
                        </p>
                        <p className="text-cosmic-400 text-xs">
                          {new Date(activity.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className={`text-right ${getTransactionTypeColor(activity.type)}`}>
                      <p className="font-bold">
                        {activity.points > 0 ? '+' : ''}{activity.points}
                      </p>
                      <p className="text-xs text-cosmic-300">
                        {language === 'ar' ? 'نقطة' : 'pts'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'config' && isSuperAdmin && (
          <motion.div
            key="config"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <div className="bg-white/5 backdrop-blur-sm border border-white/20 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-white flex items-center">
                  <CogIcon className="w-6 h-6 text-purple-400 mr-2" />
                  {language === 'ar' ? 'إعدادات النظام' : 'System Configuration'}
                </h3>
                <button
                  onClick={() => setShowConfigModal(true)}
                  className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all duration-300"
                >
                  {language === 'ar' ? 'تعديل الإعدادات' : 'Edit Config'}
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {rewardsConfig.map((config) => (
                  <div key={config.key} className="bg-white/5 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white font-medium">
                          {config.key.replace('_', ' ').toUpperCase()}
                        </p>
                        <p className="text-cosmic-300 text-sm">
                          {config.description}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-purple-400">
                          {config.value}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Adjust Points Modal */}
      <AnimatePresence>
        {showAdjustModal && selectedUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6 w-full max-w-md"
            >
              <h3 className="text-xl font-bold text-white mb-4">
                {language === 'ar' ? 'تعديل النقاط' : 'Adjust Points'}
              </h3>
              
              <div className="space-y-4">
                <div className="p-4 bg-white/5 rounded-lg">
                  <p className="text-white font-medium">
                    {selectedUser.profiles?.username || 'Unknown User'}
                  </p>
                  <p className="text-cosmic-300 text-sm">
                    {language === 'ar' ? 'الرصيد الحالي:' : 'Current Balance:'} {selectedUser.balance || 0} {language === 'ar' ? 'نقطة' : 'points'}
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-cosmic-300 mb-2">
                    {language === 'ar' ? 'النقاط (+ للإضافة، - للخصم)' : 'Points (+ to add, - to deduct)'}
                  </label>
                  <input
                    type="number"
                    value={adjustmentData.points}
                    onChange={(e) => setAdjustmentData({ ...adjustmentData, points: e.target.value })}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-cosmic-300 focus:border-purple-400 focus:outline-none"
                    placeholder="e.g., +100 or -50"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-cosmic-300 mb-2">
                    {language === 'ar' ? 'السبب' : 'Reason'}
                  </label>
                  <textarea
                    value={adjustmentData.reason}
                    onChange={(e) => setAdjustmentData({ ...adjustmentData, reason: e.target.value })}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-cosmic-300 focus:border-purple-400 focus:outline-none"
                    placeholder={language === 'ar' ? 'اكتب سبب التعديل...' : 'Enter reason for adjustment...'}
                    rows="3"
                  />
                </div>
              </div>
              
              <div className="flex items-center justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowAdjustModal(false);
                    setSelectedUser(null);
                    setAdjustmentData({ points: '', reason: '' });
                  }}
                  className="px-4 py-2 text-cosmic-300 hover:text-white transition-colors"
                >
                  {language === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  onClick={handleAdjustPoints}
                  disabled={adjusting || !adjustmentData.points || !adjustmentData.reason}
                  className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all duration-300 disabled:opacity-50"
                >
                  {adjusting 
                    ? (language === 'ar' ? 'جاري التعديل...' : 'Adjusting...') 
                    : (language === 'ar' ? 'تأكيد التعديل' : 'Confirm Adjustment')
                  }
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Config Modal */}
      <AnimatePresence>
        {showConfigModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto"
            >
              <h3 className="text-xl font-bold text-white mb-4">
                {language === 'ar' ? 'تعديل إعدادات النظام' : 'Edit System Configuration'}
              </h3>
              
              <div className="space-y-4">
                {rewardsConfig.map((config) => (
                  <div key={config.key} className="p-4 bg-white/5 rounded-lg">
                    <label className="block text-sm font-medium text-white mb-2">
                      {config.key.replace('_', ' ').toUpperCase()}
                    </label>
                    <p className="text-cosmic-300 text-xs mb-2">
                      {config.description}
                    </p>
                    <input
                      type="number"
                      value={configChanges[config.key] || ''}
                      onChange={(e) => setConfigChanges({
                        ...configChanges,
                        [config.key]: e.target.value
                      })}
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-cosmic-300 focus:border-purple-400 focus:outline-none"
                    />
                  </div>
                ))}
              </div>
              
              <div className="flex items-center justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowConfigModal(false)}
                  className="px-4 py-2 text-cosmic-300 hover:text-white transition-colors"
                >
                  {language === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  onClick={handleUpdateConfig}
                  className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all duration-300"
                >
                  {language === 'ar' ? 'حفظ التغييرات' : 'Save Changes'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default RewardsManagement; 