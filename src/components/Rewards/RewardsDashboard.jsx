import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useUI } from '../../context/UIContext';
import api from '../../services/frontendApi.js';
import {
  StarIcon,
  GiftIcon,
  ShareIcon,
  ClockIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  CurrencyDollarIcon,
  UserGroupIcon,
  DocumentDuplicateIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  SparklesIcon,
  TrophyIcon,
  FireIcon
} from '@heroicons/react/24/outline';

const RewardsDashboard = () => {
  const { user, profile } = useAuth();
  const { language, showSuccess, showError } = useUI();
  const [loading, setLoading] = useState(true);
  const [pointsData, setPointsData] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [redemptionOptions, setRedemptionOptions] = useState([]);
  const [referralData, setReferralData] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [showRedeemModal, setShowRedeemModal] = useState(false);
  const [selectedRedemption, setSelectedRedemption] = useState(null);
  const [redeeming, setRedeeming] = useState(false);
  const [referralCode, setReferralCode] = useState('');
  const [showReferralModal, setShowReferralModal] = useState(false);

  useEffect(() => {
    if (user) {
      loadRewardsData();
    }
  }, [user]);

  const loadRewardsData = async () => {
    try {
      setLoading(true);
      
      // Load all data in parallel
      const [pointsResult, transactionsResult, redemptionResult, referralResult] = await Promise.all([
        api.getUserPoints(),
        api.getTransactionHistory(1, 10),
        api.getRedemptionOptions(),
        api.getReferralCode()
      ]);

      if (pointsResult.success) {
        setPointsData(pointsResult.data);
        setTransactions(pointsResult.data.recent_transactions || []);
      }

      if (transactionsResult.success) {
        setTransactions(transactionsResult.data.transactions || []);
      }

      if (redemptionResult.success) {
        setRedemptionOptions(redemptionResult.data || []);
      }

      if (referralResult.success) {
        setReferralData(referralResult.data);
      }
    } catch (error) {
      console.error('Error loading rewards data:', error);
      showError('Failed to load rewards data');
    } finally {
      setLoading(false);
    }
  };

  const handleRedemption = async (option) => {
    try {
      setRedeeming(true);
      const result = await api.redeemPoints(option.id);
      
      if (result.success) {
        showSuccess(result.message);
        setShowRedeemModal(false);
        setSelectedRedemption(null);
        await loadRewardsData(); // Refresh data
      } else {
        showError(result.error);
      }
    } catch (error) {
      console.error('Error redeeming points:', error);
      showError('Failed to redeem points');
    } finally {
      setRedeeming(false);
    }
  };

  const handleUseReferralCode = async () => {
    if (!referralCode.trim()) {
      showError('Please enter a referral code');
      return;
    }

    try {
      const result = await api.useReferralCode(referralCode.trim());
      
      if (result.success) {
        showSuccess(result.message);
        setReferralCode('');
        setShowReferralModal(false);
        await loadRewardsData(); // Refresh data
      } else {
        showError(result.error);
      }
    } catch (error) {
      console.error('Error using referral code:', error);
      showError('Failed to apply referral code');
    }
  };

  const copyReferralLink = () => {
    if (referralData?.referral_link) {
      navigator.clipboard.writeText(referralData.referral_link);
      showSuccess('Referral link copied to clipboard!');
    }
  };

  const getTransactionIcon = (type) => {
    const icons = {
      earn: <ArrowUpIcon className="w-5 h-5 text-green-400" />,
      redeem: <ArrowDownIcon className="w-5 h-5 text-red-400" />,
      referral: <UserGroupIcon className="w-5 h-5 text-purple-400" />,
      booking_bonus: <StarIcon className="w-5 h-5 text-yellow-400" />,
      welcome_bonus: <GiftIcon className="w-5 h-5 text-pink-400" />,
      admin_adjust: <SparklesIcon className="w-5 h-5 text-blue-400" />
    };
    return icons[type] || <CurrencyDollarIcon className="w-5 h-5 text-cosmic-300" />;
  };

  const getTransactionColor = (type) => {
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cosmic-900 via-cosmic-800 to-cosmic-900 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white/5 backdrop-blur-sm border border-white/20 rounded-xl p-8 text-center">
            <div className="animate-spin w-12 h-12 border-4 border-purple-400 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-cosmic-300">Loading your rewards...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-cosmic-900 via-cosmic-800 to-cosmic-900 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl font-bold text-white mb-2 flex items-center justify-center"
          >
            <TrophyIcon className="w-10 h-10 text-yellow-400 mr-3" />
            {language === 'ar' ? 'نظام المكافآت' : 'Rewards Dashboard'}
          </motion.h1>
          <p className="text-cosmic-300">
            {language === 'ar' 
              ? 'اكسب النقاط واستبدلها بمكافآت رائعة' 
              : 'Earn points and redeem them for amazing rewards'
            }
          </p>
        </div>

        {/* Points Balance Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 backdrop-blur-sm border border-white/20 rounded-xl p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-cosmic-300 text-sm">
                  {language === 'ar' ? 'الرصيد الحالي' : 'Current Balance'}
                </p>
                <p className="text-3xl font-bold text-white">
                  {pointsData?.balance?.toLocaleString() || 0}
                </p>
                <p className="text-purple-300 text-sm">
                  {language === 'ar' ? 'نقطة' : 'Points'}
                </p>
              </div>
              <div className="p-3 bg-purple-500/20 rounded-full">
                <StarIcon className="w-8 h-8 text-purple-400" />
              </div>
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
                  {language === 'ar' ? 'إجمالي المكتسب' : 'Total Earned'}
                </p>
                <p className="text-3xl font-bold text-white">
                  {pointsData?.lifetime_earned?.toLocaleString() || 0}
                </p>
                <p className="text-green-300 text-sm">
                  {language === 'ar' ? 'نقطة' : 'Points'}
                </p>
              </div>
              <div className="p-3 bg-green-500/20 rounded-full">
                <FireIcon className="w-8 h-8 text-green-400" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-r from-orange-600/20 to-red-600/20 backdrop-blur-sm border border-white/20 rounded-xl p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-cosmic-300 text-sm">
                  {language === 'ar' ? 'إجمالي المستبدل' : 'Total Redeemed'}
                </p>
                <p className="text-3xl font-bold text-white">
                  {pointsData?.lifetime_redeemed?.toLocaleString() || 0}
                </p>
                <p className="text-orange-300 text-sm">
                  {language === 'ar' ? 'نقطة' : 'Points'}
                </p>
              </div>
              <div className="p-3 bg-orange-500/20 rounded-full">
                <GiftIcon className="w-8 h-8 text-orange-400" />
              </div>
            </div>
          </motion.div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white/5 backdrop-blur-sm border border-white/20 rounded-xl p-2">
          <div className="flex space-x-2">
            {[
              { id: 'overview', label: language === 'ar' ? 'نظرة عامة' : 'Overview', icon: StarIcon },
              { id: 'redeem', label: language === 'ar' ? 'الاستبدال' : 'Redeem', icon: GiftIcon },
              { id: 'referral', label: language === 'ar' ? 'الإحالة' : 'Referral', icon: ShareIcon },
              { id: 'history', label: language === 'ar' ? 'السجل' : 'History', icon: ClockIcon }
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
              {/* Recent Transactions */}
              <div className="bg-white/5 backdrop-blur-sm border border-white/20 rounded-xl p-6">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center">
                  <ClockIcon className="w-6 h-6 text-cyan-400 mr-2" />
                  {language === 'ar' ? 'المعاملات الأخيرة' : 'Recent Transactions'}
                </h3>
                
                <div className="space-y-3">
                  {transactions.slice(0, 5).map((transaction) => (
                    <div
                      key={transaction.id}
                      className="flex items-center justify-between p-3 bg-white/5 rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        {getTransactionIcon(transaction.type)}
                        <div>
                          <p className="text-white font-medium">
                            {transaction.description}
                          </p>
                          <p className="text-cosmic-300 text-sm">
                            {new Date(transaction.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className={`text-right ${getTransactionColor(transaction.type)}`}>
                        <p className="font-bold">
                          {transaction.points > 0 ? '+' : ''}{transaction.points}
                        </p>
                        <p className="text-xs text-cosmic-300">
                          {language === 'ar' ? 'نقطة' : 'pts'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setActiveTab('redeem')}
                  className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 backdrop-blur-sm border border-white/20 rounded-xl p-6 text-left hover:from-purple-600/30 hover:to-pink-600/30 transition-all duration-300"
                >
                  <GiftIcon className="w-8 h-8 text-purple-400 mb-3" />
                  <h4 className="text-lg font-bold text-white mb-2">
                    {language === 'ar' ? 'استبدل النقاط' : 'Redeem Points'}
                  </h4>
                  <p className="text-cosmic-300">
                    {language === 'ar' 
                      ? 'استبدل نقاطك بمكافآت رائعة' 
                      : 'Exchange your points for amazing rewards'
                    }
                  </p>
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setActiveTab('referral')}
                  className="bg-gradient-to-r from-green-600/20 to-emerald-600/20 backdrop-blur-sm border border-white/20 rounded-xl p-6 text-left hover:from-green-600/30 hover:to-emerald-600/30 transition-all duration-300"
                >
                  <ShareIcon className="w-8 h-8 text-green-400 mb-3" />
                  <h4 className="text-lg font-bold text-white mb-2">
                    {language === 'ar' ? 'ادع الأصدقاء' : 'Invite Friends'}
                  </h4>
                  <p className="text-cosmic-300">
                    {language === 'ar' 
                      ? 'احصل على نقاط عند دعوة الأصدقاء' 
                      : 'Earn points by inviting friends'
                    }
                  </p>
                </motion.button>
              </div>
            </motion.div>
          )}

          {activeTab === 'redeem' && (
            <motion.div
              key="redeem"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="bg-white/5 backdrop-blur-sm border border-white/20 rounded-xl p-6">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center">
                  <GiftIcon className="w-6 h-6 text-purple-400 mr-2" />
                  {language === 'ar' ? 'خيارات الاستبدال' : 'Redemption Options'}
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {redemptionOptions.map((option) => (
                    <motion.div
                      key={option.id}
                      whileHover={{ scale: 1.02 }}
                      className="bg-white/5 border border-white/20 rounded-lg p-4"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-bold text-white">{option.name}</h4>
                        <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-1 rounded">
                          {option.type}
                        </span>
                      </div>
                      
                      <p className="text-cosmic-300 text-sm mb-4">
                        {option.description}
                      </p>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-lg font-bold text-purple-400">
                            {option.points_required} {language === 'ar' ? 'نقطة' : 'pts'}
                          </p>
                          {option.value_amount && (
                            <p className="text-sm text-green-400">
                              ${option.value_amount} {language === 'ar' ? 'قيمة' : 'value'}
                            </p>
                          )}
                        </div>
                        
                        <button
                          onClick={() => {
                            setSelectedRedemption(option);
                            setShowRedeemModal(true);
                          }}
                          disabled={!pointsData || pointsData.balance < option.points_required}
                          className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {language === 'ar' ? 'استبدل' : 'Redeem'}
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'referral' && (
            <motion.div
              key="referral"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Referral Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white/5 backdrop-blur-sm border border-white/20 rounded-xl p-6">
                  <h3 className="text-xl font-bold text-white mb-4 flex items-center">
                    <ShareIcon className="w-6 h-6 text-green-400 mr-2" />
                    {language === 'ar' ? 'رمز الإحالة الخاص بك' : 'Your Referral Code'}
                  </h3>
                  
                  {referralData && (
                    <div className="space-y-4">
                      <div className="flex items-center space-x-3">
                        <div className="flex-1 p-3 bg-white/10 rounded-lg font-mono text-lg text-center text-white">
                          {referralData.code}
                        </div>
                        <button
                          onClick={copyReferralLink}
                          className="p-3 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
                        >
                          <DocumentDuplicateIcon className="w-5 h-5 text-white" />
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-center">
                        <div>
                          <p className="text-2xl font-bold text-green-400">
                            {referralData.total_referrals}
                          </p>
                          <p className="text-cosmic-300 text-sm">
                            {language === 'ar' ? 'إحالات' : 'Referrals'}
                          </p>
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-purple-400">
                            {referralData.usage_count}
                          </p>
                          <p className="text-cosmic-300 text-sm">
                            {language === 'ar' ? 'استخدامات' : 'Uses'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="bg-white/5 backdrop-blur-sm border border-white/20 rounded-xl p-6">
                  <h3 className="text-xl font-bold text-white mb-4 flex items-center">
                    <UserGroupIcon className="w-6 h-6 text-blue-400 mr-2" />
                    {language === 'ar' ? 'استخدم رمز إحالة' : 'Use Referral Code'}
                  </h3>
                  
                  <button
                    onClick={() => setShowReferralModal(true)}
                    className="w-full p-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:from-blue-700 hover:to-cyan-700 transition-all duration-300"
                  >
                    {language === 'ar' ? 'أدخل رمز الإحالة' : 'Enter Referral Code'}
                  </button>
                  
                  <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                    <p className="text-blue-300 text-sm">
                      {language === 'ar' 
                        ? 'احصل على 50 نقطة عند استخدام رمز إحالة صديق!' 
                        : 'Get 50 points when you use a friend\'s referral code!'
                      }
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'history' && (
            <motion.div
              key="history"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="bg-white/5 backdrop-blur-sm border border-white/20 rounded-xl p-6">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center">
                  <ClockIcon className="w-6 h-6 text-cyan-400 mr-2" />
                  {language === 'ar' ? 'سجل المعاملات' : 'Transaction History'}
                </h3>
                
                <div className="space-y-3">
                  {transactions.map((transaction) => (
                    <div
                      key={transaction.id}
                      className="flex items-center justify-between p-4 bg-white/5 rounded-lg"
                    >
                      <div className="flex items-center space-x-4">
                        {getTransactionIcon(transaction.type)}
                        <div>
                          <p className="text-white font-medium">
                            {transaction.description}
                          </p>
                          <p className="text-cosmic-300 text-sm">
                            {new Date(transaction.created_at).toLocaleString()}
                          </p>
                          {transaction.source && (
                            <p className="text-cosmic-400 text-xs">
                              Source: {transaction.source}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className={`text-right ${getTransactionColor(transaction.type)}`}>
                        <p className="text-lg font-bold">
                          {transaction.points > 0 ? '+' : ''}{transaction.points}
                        </p>
                        <p className="text-xs text-cosmic-300">
                          {language === 'ar' ? 'نقطة' : 'points'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Redemption Confirmation Modal */}
        <AnimatePresence>
          {showRedeemModal && selectedRedemption && (
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
                  {language === 'ar' ? 'تأكيد الاستبدال' : 'Confirm Redemption'}
                </h3>
                
                <div className="space-y-4">
                  <div className="p-4 bg-white/5 rounded-lg">
                    <h4 className="font-bold text-white">{selectedRedemption.name}</h4>
                    <p className="text-cosmic-300 text-sm">{selectedRedemption.description}</p>
                    <p className="text-purple-400 font-bold mt-2">
                      {selectedRedemption.points_required} {language === 'ar' ? 'نقطة' : 'points'}
                    </p>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-cosmic-300">
                      {language === 'ar' ? 'رصيدك الحالي:' : 'Your current balance:'}
                    </span>
                    <span className="text-white font-bold">
                      {pointsData?.balance || 0} {language === 'ar' ? 'نقطة' : 'points'}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-cosmic-300">
                      {language === 'ar' ? 'الرصيد بعد الاستبدال:' : 'Balance after redemption:'}
                    </span>
                    <span className="text-white font-bold">
                      {(pointsData?.balance || 0) - selectedRedemption.points_required} {language === 'ar' ? 'نقطة' : 'points'}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center justify-end space-x-3 mt-6">
                  <button
                    onClick={() => {
                      setShowRedeemModal(false);
                      setSelectedRedemption(null);
                    }}
                    className="px-4 py-2 text-cosmic-300 hover:text-white transition-colors"
                  >
                    {language === 'ar' ? 'إلغاء' : 'Cancel'}
                  </button>
                  <button
                    onClick={() => handleRedemption(selectedRedemption)}
                    disabled={redeeming}
                    className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all duration-300 disabled:opacity-50"
                  >
                    {redeeming 
                      ? (language === 'ar' ? 'جاري الاستبدال...' : 'Redeeming...') 
                      : (language === 'ar' ? 'تأكيد الاستبدال' : 'Confirm Redemption')
                    }
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Referral Code Modal */}
        <AnimatePresence>
          {showReferralModal && (
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
                  {language === 'ar' ? 'أدخل رمز الإحالة' : 'Enter Referral Code'}
                </h3>
                
                <div className="space-y-4">
                  <input
                    type="text"
                    value={referralCode}
                    onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                    placeholder={language === 'ar' ? 'أدخل الرمز هنا' : 'Enter code here'}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-cosmic-300 focus:border-purple-400 focus:outline-none font-mono text-center text-lg"
                  />
                  
                  <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                    <p className="text-green-300 text-sm text-center">
                      {language === 'ar' 
                        ? 'ستحصل على 50 نقطة عند استخدام رمز صحيح!' 
                        : 'You\'ll get 50 points for using a valid code!'
                      }
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center justify-end space-x-3 mt-6">
                  <button
                    onClick={() => {
                      setShowReferralModal(false);
                      setReferralCode('');
                    }}
                    className="px-4 py-2 text-cosmic-300 hover:text-white transition-colors"
                  >
                    {language === 'ar' ? 'إلغاء' : 'Cancel'}
                  </button>
                  <button
                    onClick={handleUseReferralCode}
                    disabled={!referralCode.trim()}
                    className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all duration-300 disabled:opacity-50"
                  >
                    {language === 'ar' ? 'استخدم الرمز' : 'Use Code'}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default RewardsDashboard; 