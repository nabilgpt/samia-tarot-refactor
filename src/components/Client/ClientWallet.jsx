import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { 
  Wallet, 
  CreditCard, 
  Plus,
  Minus,
  ArrowUpRight,
  ArrowDownLeft,
  Download,
  Filter,
  Search,
  Eye,
  EyeOff,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Banknote,
  DollarSign,
  Coins,
  RotateCcw,
  Upload
} from 'lucide-react';
import { useUI } from '../../context/UIContext';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/frontendApi.js';
import PaymentMethodService from '../../services/paymentMethodService';

const ClientWallet = () => {
  const { t } = useTranslation();
  const { language, showSuccess, showError } = useUI();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [walletData, setWalletData] = useState({
    balance: 0,
    total_deposits: 0,
    total_withdrawals: 0,
    pending_amount: 0
  });
  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [showBalance, setShowBalance] = useState(true);
  const [showAddFunds, setShowAddFunds] = useState(false);
  const [showRefundRequest, setShowRefundRequest] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [addFundsAmount, setAddFundsAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [availablePaymentMethods, setAvailablePaymentMethods] = useState([]);
  const [userCountryCode, setUserCountryCode] = useState('XX');
  const [refundBookingId, setRefundBookingId] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [receiptFile, setReceiptFile] = useState(null);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        delayChildren: 0.1,
        staggerChildren: 0.05
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 12
      }
    }
  };

  useEffect(() => {
    loadWalletData();
    loadPaymentMethods();
  }, []);

  useEffect(() => {
    filterTransactions();
  }, [transactions, searchTerm, typeFilter, dateFilter]);

  const loadWalletData = async () => {
    try {
      setLoading(true);
      
      const [walletResponse, transactionsResponse] = await Promise.all([
        api.getWallet(),
        api.getTransactions()
      ]);
      
      if (walletResponse.success) {
        setWalletData(walletResponse.data);
      } else {
        console.error('Failed to load wallet data:', walletResponse.error);
        setWalletData({
          balance: 0,
          total_deposits: 0,
          total_withdrawals: 0,
          pending_amount: 0
        });
      }

      if (transactionsResponse.success) {
        setTransactions(transactionsResponse.data);
      } else {
        console.error('Failed to load transactions:', transactionsResponse.error);
        setTransactions([]);
      }
    } catch (error) {
      console.error('Error loading wallet data:', error);
      showError(language === 'ar' ? 'فشل في تحميل بيانات المحفظة' : 'Failed to load wallet data');
    } finally {
      setLoading(false);
    }
  };

  const loadPaymentMethods = async () => {
    try {
      // Get user's country code
      const countryCode = await PaymentMethodService.getUserCountryCode(user?.profile);
      setUserCountryCode(countryCode);
      
      // Get available payment methods for this country
      const methods = await PaymentMethodService.getAvailablePaymentMethods(countryCode);
      setAvailablePaymentMethods(methods);
      
      // Set default payment method to the first available one
      if (methods.length > 0) {
        setPaymentMethod(methods[0].method);
      }
    } catch (error) {
      console.error('Error loading payment methods:', error);
      showError(language === 'ar' ? 'فشل في تحميل طرق الدفع' : 'Failed to load payment methods');
    }
  };

  const filterTransactions = () => {
    let filtered = transactions;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(transaction => {
        const description = language === 'ar' ? transaction.description_ar : transaction.description;
        return description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
               transaction.reference?.toLowerCase().includes(searchTerm.toLowerCase());
      });
    }

    // Filter by type
    if (typeFilter !== 'all') {
      filtered = filtered.filter(transaction => transaction.type === typeFilter);
    }

    // Filter by date
    if (dateFilter !== 'all') {
      const now = new Date();
      let filterDate = new Date();
      
      switch (dateFilter) {
        case 'today':
          filterDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          filterDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          filterDate.setMonth(now.getMonth() - 1);
          break;
        default:
          filterDate = null;
      }
      
      if (filterDate) {
        filtered = filtered.filter(transaction => 
          new Date(transaction.created_at) >= filterDate
        );
      }
    }

    setFilteredTransactions(filtered);
  };

  const getTransactionIcon = (type, status) => {
    if (status === 'pending') return Clock;
    if (status === 'failed') return XCircle;
    
    switch (type) {
      case 'deposit': return ArrowDownLeft;
      case 'payment': return ArrowUpRight;
      case 'refund': return RotateCcw;
      default: return Wallet;
    }
  };

  const getTransactionColor = (type, status) => {
    if (status === 'pending') return 'text-yellow-400 bg-yellow-500/20';
    if (status === 'failed') return 'text-red-400 bg-red-500/20';
    
    switch (type) {
      case 'deposit':
      case 'refund':
        return 'text-green-400 bg-green-500/20';
      case 'payment':
        return 'text-blue-400 bg-blue-500/20';
      default:
        return 'text-gray-400 bg-gray-500/20';
    }
  };

  const handleAddFunds = async () => {
    const amount = parseFloat(addFundsAmount);
    if (!amount || amount <= 0) {
      showError(language === 'ar' ? 'يرجى إدخال مبلغ صالح' : 'Please enter a valid amount');
      return;
    }

    if (!paymentMethod) {
      showError(language === 'ar' ? 'يرجى اختيار طريقة دفع' : 'Please select a payment method');
      return;
    }

    try {
      setLoading(true);

      // Validate payment method for user's country
      const isValidMethod = await PaymentMethodService.validatePaymentMethod(userCountryCode, paymentMethod);
      if (!isValidMethod) {
        showError(language === 'ar' ? 'طريقة الدفع غير متاحة في بلدك' : 'Payment method not available in your country');
        return;
      }

      // Create payment record using PaymentMethodService
      const paymentResult = await PaymentMethodService.createPayment({
        user_id: user.id,
        amount: amount,
        method: paymentMethod,
        country_code: userCountryCode,
        metadata: {
          type: 'wallet_topup',
          original_amount: amount,
          currency: 'USD'
        }
      });

      if (!paymentResult.success) {
        throw new Error(paymentResult.error);
      }

      const payment = paymentResult.data;

      // Get selected method details
      const selectedMethodDetails = availablePaymentMethods.find(m => m.method === paymentMethod);
      
      // Handle based on payment method
      if (selectedMethodDetails?.requires_receipt) {
        // For manual methods, show receipt upload
        setShowAddFunds(false);
        showSuccess(language === 'ar' ? 'تم إنشاء طلب الدفع، يرجى رفع إيصال الدفع' : 'Payment request created, please upload payment receipt');
        
        // You can implement receipt upload UI here or redirect to a receipt upload page
        
      } else if (selectedMethodDetails?.auto_confirm) {
        // For card payments (Stripe/Square), redirect to payment gateway
        const response = await api.addFunds(amount, paymentMethod);
        
        if (response.success) {
          window.location.href = response.data.payment_url;
        } else {
          throw new Error(response.error);
        }
      } else {
        // For other methods like USDT, show instructions
        showSuccess(language === 'ar' ? 'تم إنشاء طلب الدفع بنجاح' : 'Payment request created successfully');
        setShowAddFunds(false);
      }

    } catch (error) {
      showError(error.message || (language === 'ar' ? 'فشل في معالجة الدفع' : 'Failed to process payment'));
    } finally {
      setLoading(false);
    }
  };

  const handleRefundRequest = async () => {
    if (!refundBookingId || !refundReason) {
      showError(language === 'ar' ? 'يرجى ملء جميع الحقول' : 'Please fill all fields');
      return;
    }

    try {
      setLoading(true);
      const response = await api.requestRefund(refundBookingId, refundReason);
      
      if (response.success) {
        showSuccess(language === 'ar' ? 'تم إرسال طلب الاسترداد بنجاح' : 'Refund request submitted successfully');
        setShowRefundRequest(false);
        setRefundBookingId('');
        setRefundReason('');
        await loadWalletData();
      } else {
        showError(response.error || (language === 'ar' ? 'فشل في إرسال طلب الاسترداد' : 'Failed to submit refund request'));
      }
    } catch (error) {
      showError(language === 'ar' ? 'فشل في إرسال طلب الاسترداد' : 'Failed to submit refund request');
    } finally {
      setLoading(false);
    }
  };

  const exportTransactions = async () => {
    try {
      const response = await api.exportTransactions();
      if (response.success) {
        // Download CSV file
        const link = document.createElement('a');
        link.href = response.data.download_url;
        link.download = `transactions_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        showSuccess(language === 'ar' ? 'تم تصدير المعاملات بنجاح' : 'Transactions exported successfully');
      } else {
        showError(response.error || (language === 'ar' ? 'فشل في تصدير المعاملات' : 'Failed to export transactions'));
      }
    } catch (error) {
      showError(language === 'ar' ? 'فشل في تصدير المعاملات' : 'Failed to export transactions');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="relative">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold-400"></div>
          <div className="absolute inset-0 rounded-full border-2 border-gold-400/20"></div>
        </div>
        <span className="ml-4 text-gray-300">
          {language === 'ar' ? 'جاري التحميل...' : 'Loading...'}
        </span>
      </div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Header */}
      <motion.div
        variants={itemVariants}
        className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
      >
        <div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-green-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
            {language === 'ar' ? 'محفظتي' : 'My Wallet'}
          </h2>
          <p className="text-gray-400 mt-1">
            {language === 'ar' ? 'إدارة رصيدك والمعاملات المالية' : 'Manage your balance and financial transactions'}
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={exportTransactions}
            className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>{language === 'ar' ? 'تصدير' : 'Export'}</span>
          </button>
        </div>
      </motion.div>

      {/* Wallet Balance Card */}
      <motion.div
        variants={itemVariants}
        className="glassmorphism rounded-2xl p-8 border border-white/10 relative overflow-hidden"
      >
        {/* Background decoration */}
        <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 via-blue-500/10 to-purple-500/10"></div>
        
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-blue-500 rounded-xl flex items-center justify-center">
                <Wallet className="w-8 h-8 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white">
                  {language === 'ar' ? 'الرصيد الحالي' : 'Current Balance'}
                </h3>
                <p className="text-gray-400">
                  {language === 'ar' ? 'المتاح للاستخدام' : 'Available for use'}
                </p>
              </div>
            </div>
            
            <button
              onClick={() => setShowBalance(!showBalance)}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
            >
              {showBalance ? <EyeOff className="w-5 h-5 text-gray-400" /> : <Eye className="w-5 h-5 text-gray-400" />}
            </button>
          </div>
          
          <div className="text-center mb-6">
            <div className="text-5xl font-bold text-white mb-2">
              {showBalance ? `${(walletData.balance || 0).toFixed(2)}` : '••••••'}
              <span className="text-2xl text-gold-400 ml-2">
                {language === 'ar' ? 'ريال' : 'SAR'}
              </span>
            </div>
            {(walletData.pending_amount || 0) > 0 && (
              <p className="text-yellow-400 text-sm">
                {language === 'ar' ? `${walletData.pending_amount || 0} ريال في الانتظار` : `${walletData.pending_amount || 0} SAR pending`}
              </p>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="text-center p-4 bg-white/5 rounded-lg">
              <div className="flex items-center justify-center mb-2">
                <ArrowDownLeft className="w-5 h-5 text-green-400 mr-2" />
                <span className="text-green-400 font-semibold">
                  +{(walletData.total_deposits || 0).toFixed(2)}
                </span>
              </div>
              <p className="text-gray-400 text-sm">
                {language === 'ar' ? 'إجمالي الإيداعات' : 'Total Deposits'}
              </p>
            </div>
            
            <div className="text-center p-4 bg-white/5 rounded-lg">
              <div className="flex items-center justify-center mb-2">
                <ArrowUpRight className="w-5 h-5 text-blue-400 mr-2" />
                <span className="text-blue-400 font-semibold">
                  -{(walletData.total_withdrawals || 0).toFixed(2)}
                </span>
              </div>
              <p className="text-gray-400 text-sm">
                {language === 'ar' ? 'إجمالي المدفوعات' : 'Total Payments'}
              </p>
            </div>
            
            <div className="text-center p-4 bg-white/5 rounded-lg">
              <div className="flex items-center justify-center mb-2">
                <TrendingUp className="w-5 h-5 text-purple-400 mr-2" />
                <span className="text-purple-400 font-semibold">
                  {(() => {
                    const deposits = walletData.total_deposits || 0;
                    const withdrawals = walletData.total_withdrawals || 0;
                    if (deposits === 0) return '0.0';
                    return ((deposits - withdrawals) / deposits * 100).toFixed(1);
                  })()}%
                </span>
              </div>
              <p className="text-gray-400 text-sm">
                {language === 'ar' ? 'معدل الادخار' : 'Savings Rate'}
              </p>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowAddFunds(true)}
              className="flex-1 flex items-center justify-center space-x-2 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:from-green-600 hover:to-emerald-600 transition-colors"
            >
              <Plus className="w-5 h-5" />
              <span>{language === 'ar' ? 'شحن الرصيد' : 'Add Funds'}</span>
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowRefundRequest(true)}
              className="flex-1 flex items-center justify-center space-x-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg hover:from-orange-600 hover:to-red-600 transition-colors"
            >
              <RotateCcw className="w-5 h-5" />
              <span>{language === 'ar' ? 'طلب استرداد' : 'Request Refund'}</span>
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* Transactions */}
      <motion.div
        variants={itemVariants}
        className="glassmorphism rounded-2xl p-6 border border-white/10"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white">
            {language === 'ar' ? 'سجل المعاملات' : 'Transaction History'}
          </h3>
        </div>
        
        {/* Filters */}
        <div className="flex flex-col lg:flex-row gap-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={language === 'ar' ? 'البحث في المعاملات...' : 'Search transactions...'}
                className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-gold-400/50 transition-colors"
              />
            </div>
          </div>
          
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:border-gold-400/50 transition-colors"
          >
            <option value="all">{language === 'ar' ? 'كل الأنواع' : 'All Types'}</option>
            <option value="deposit">{language === 'ar' ? 'إيداع' : 'Deposit'}</option>
            <option value="payment">{language === 'ar' ? 'دفع' : 'Payment'}</option>
            <option value="refund">{language === 'ar' ? 'استرداد' : 'Refund'}</option>
          </select>
          
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:border-gold-400/50 transition-colors"
          >
            <option value="all">{language === 'ar' ? 'كل الفترات' : 'All Time'}</option>
            <option value="today">{language === 'ar' ? 'اليوم' : 'Today'}</option>
            <option value="week">{language === 'ar' ? 'هذا الأسبوع' : 'This Week'}</option>
            <option value="month">{language === 'ar' ? 'هذا الشهر' : 'This Month'}</option>
          </select>
        </div>
        
        {/* Transaction List */}
        <div className="space-y-3">
          {filteredTransactions.map((transaction) => {
            const Icon = getTransactionIcon(transaction.type, transaction.status);
            const description = language === 'ar' ? transaction.description_ar : transaction.description;
            
            return (
              <motion.div
                key={transaction.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center justify-between p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
              >
                <div className="flex items-center space-x-4">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${getTransactionColor(transaction.type, transaction.status)}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-white">
                      {description}
                    </h4>
                    <div className="flex items-center space-x-3 text-sm text-gray-400">
                      <span>{transaction.reference}</span>
                      <span>•</span>
                      <span>{new Date(transaction.created_at).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className={`text-lg font-bold ${(transaction.amount || 0) > 0 ? 'text-green-400' : 'text-blue-400'}`}>
                    {(transaction.amount || 0) > 0 ? '+' : ''}{(transaction.amount || 0).toFixed(2)} {language === 'ar' ? 'ريال' : 'SAR'}
                  </div>
                  <div className={`text-sm px-2 py-1 rounded text-center ${
                    transaction.status === 'completed' ? 'text-green-400 bg-green-500/20' :
                    transaction.status === 'pending' ? 'text-yellow-400 bg-yellow-500/20' :
                    'text-red-400 bg-red-500/20'
                  }`}>
                    {transaction.status === 'completed' ? (language === 'ar' ? 'مكتمل' : 'Completed') :
                     transaction.status === 'pending' ? (language === 'ar' ? 'في الانتظار' : 'Pending') :
                     (language === 'ar' ? 'فاشل' : 'Failed')
                    }
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
        
        {filteredTransactions.length === 0 && (
          <div className="text-center py-8">
            <Wallet className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-400 mb-2">
              {language === 'ar' ? 'لا توجد معاملات' : 'No Transactions'}
            </h3>
            <p className="text-gray-500">
              {language === 'ar' ? 'لم يتم العثور على معاملات مطابقة' : 'No transactions match your criteria'}
            </p>
          </div>
        )}
      </motion.div>

      {/* Add Funds Modal */}
      <AnimatePresence>
        {showAddFunds && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowAddFunds(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="glassmorphism rounded-2xl p-6 border border-white/10 max-w-md w-full"
            >
              <h3 className="text-xl font-bold text-white mb-6">
                {language === 'ar' ? 'شحن الرصيد' : 'Add Funds'}
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    {language === 'ar' ? 'المبلغ' : 'Amount'}
                  </label>
                  <input
                    type="number"
                    value={addFundsAmount}
                    onChange={(e) => setAddFundsAmount(e.target.value)}
                    placeholder="0.00"
                    min="10"
                    step="0.01"
                    className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:border-gold-400/50 transition-colors"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    {language === 'ar' ? 'طريقة الدفع' : 'Payment Method'}
                  </label>
                  
                  {availablePaymentMethods.length > 0 ? (
                    <div className="space-y-3">
                      {availablePaymentMethods.map((method) => (
                        <motion.div
                          key={method.method}
                          whileHover={{ scale: 1.02 }}
                          className={`relative cursor-pointer rounded-lg border-2 transition-all duration-200 ${
                            paymentMethod === method.method
                              ? `${method.color} border-current`
                              : 'bg-white/5 border-white/20 hover:border-white/40'
                          }`}
                          onClick={() => setPaymentMethod(method.method)}
                        >
                          <div className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <span className="text-2xl">{method.icon}</span>
                                <div>
                                  <h4 className="font-medium text-white">
                                    {method.details?.description || method.method}
                                  </h4>
                                  <div className="flex items-center space-x-4 text-sm text-gray-400">
                                    <span>{method.processing_time}</span>
                                    {method.fees && (
                                      <span>
                                        {method.fees.percentage && `${method.fees.percentage}%`}
                                        {method.fees.fixed && ` + $${method.fees.fixed}`}
                                        {method.fees.range && `$${method.fees.range}`}
                                        {method.fees.description && method.fees.description}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              
                              {/* Features badges */}
                              <div className="flex flex-col items-end space-y-1">
                                {method.supports_apple_pay && (
                                  <span className="px-2 py-1 bg-black/20 text-white text-xs rounded">
                                     Pay
                                  </span>
                                )}
                                {method.supports_google_pay && (
                                  <span className="px-2 py-1 bg-blue-500/20 text-blue-300 text-xs rounded">
                                    G Pay
                                  </span>
                                )}
                                {method.requires_receipt && (
                                  <span className="px-2 py-1 bg-yellow-500/20 text-yellow-300 text-xs rounded">
                                    {language === 'ar' ? 'يتطلب إيصال' : 'Receipt Required'}
                                  </span>
                                )}
                              </div>
                            </div>
                            
                            {/* Radio button indicator */}
                            <div className="absolute top-4 right-4">
                              <div className={`w-4 h-4 rounded-full border-2 ${
                                paymentMethod === method.method
                                  ? 'border-current bg-current'
                                  : 'border-gray-400'
                              }`}>
                                {paymentMethod === method.method && (
                                  <div className="w-2 h-2 bg-white rounded-full m-0.5"></div>
                                )}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-gray-400">
                        {language === 'ar' ? 'لا توجد طرق دفع متاحة' : 'No payment methods available'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex items-center space-x-3 mt-6">
                <button
                  onClick={() => setShowAddFunds(false)}
                  className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  {language === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  onClick={handleAddFunds}
                  disabled={loading || !addFundsAmount}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:from-green-600 hover:to-emerald-600 transition-colors disabled:opacity-50"
                >
                  {loading ? (
                    <div className="animate-spin w-4 h-4 border-b-2 border-white rounded-full mx-auto"></div>
                  ) : (
                    language === 'ar' ? 'متابعة للدفع' : 'Proceed to Payment'
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Refund Request Modal */}
      <AnimatePresence>
        {showRefundRequest && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowRefundRequest(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="glassmorphism rounded-2xl p-6 border border-white/10 max-w-md w-full"
            >
              <h3 className="text-xl font-bold text-white mb-6">
                {language === 'ar' ? 'طلب استرداد' : 'Request Refund'}
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    {language === 'ar' ? 'رقم الحجز' : 'Booking ID'}
                  </label>
                  <input
                    type="text"
                    value={refundBookingId}
                    onChange={(e) => setRefundBookingId(e.target.value)}
                                          placeholder={t('support.refundBookingId')}
                    className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:border-gold-400/50 transition-colors"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    {language === 'ar' ? 'سبب الاسترداد' : 'Refund Reason'}
                  </label>
                  <textarea
                    value={refundReason}
                    onChange={(e) => setRefundReason(e.target.value)}
                                          placeholder={t('support.refundReason')}
                    rows={4}
                    className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-gold-400/50 transition-colors resize-none"
                  />
                </div>
              </div>
              
              <div className="flex items-center space-x-3 mt-6">
                <button
                  onClick={() => setShowRefundRequest(false)}
                  className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  {language === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  onClick={handleRefundRequest}
                  disabled={loading || !refundBookingId || !refundReason}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg hover:from-orange-600 hover:to-red-600 transition-colors disabled:opacity-50"
                >
                  {loading ? (
                    <div className="animate-spin w-4 h-4 border-b-2 border-white rounded-full mx-auto"></div>
                  ) : (
                    language === 'ar' ? 'إرسال الطلب' : 'Submit Request'
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default ClientWallet;