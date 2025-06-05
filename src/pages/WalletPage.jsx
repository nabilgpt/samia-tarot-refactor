import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import { 
  CreditCard, 
  Wallet, 
  Plus, 
  Minus, 
  ArrowUpRight, 
  ArrowDownLeft,
  History,
  TrendingUp,
  DollarSign,
  Coins
} from 'lucide-react';
import Button from '../components/Button';
import AnimatedBackground from '../components/UI/AnimatedBackground';
import EmergencyCallButton from '../components/EmergencyCallButton';

const WalletPage = () => {
  const { t } = useTranslation();
  const { user, profile, isAuthenticated } = useAuth();
  const { showSuccess, showError } = useUI();
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [showAddFunds, setShowAddFunds] = useState(false);
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Mock wallet data
    setBalance(250.75);
    setTransactions([
      {
        id: 1,
        type: 'credit',
        amount: 50,
        description: 'إيداع عبر البطاقة الائتمانية',
        date: '2024-01-15',
        status: 'completed'
      },
      {
        id: 2,
        type: 'debit',
        amount: 25,
        description: 'جلسة قراءة تاروت مع سامية',
        date: '2024-01-14',
        status: 'completed'
      },
      {
        id: 3,
        type: 'credit',
        amount: 100,
        description: 'مكافأة ترحيب',
        date: '2024-01-10',
        status: 'completed'
      }
    ]);
  }, []);

  if (!isAuthenticated) {
    return (
      <AnimatedBackground variant="default" intensity="normal">
        <div className="min-h-screen flex items-center justify-center px-4">
          <div className="text-center bg-dark-800/50 backdrop-blur-xl border border-gold-400/20 rounded-2xl p-8 shadow-2xl shadow-cosmic-500/10">
            <h2 className="text-2xl font-bold text-white mb-4">تسجيل الدخول مطلوب</h2>
            <p className="text-gray-400 mb-6">يجب تسجيل الدخول لعرض المحفظة</p>
            <Button href="/login" className="bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-600 hover:to-gold-700 text-dark-900 font-bold">
              تسجيل الدخول
            </Button>
          </div>
        </div>
      </AnimatedBackground>
    );
  }

  const handleAddFunds = async () => {
    if (!amount || isNaN(amount) || Number(amount) <= 0) {
      showError('يرجى إدخال مبلغ صحيح');
      return;
    }

    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const newBalance = balance + Number(amount);
      setBalance(newBalance);
      
      const newTransaction = {
        id: Date.now(),
        type: 'credit',
        amount: Number(amount),
        description: 'إيداع عبر البطاقة الائتمانية',
        date: new Date().toISOString().split('T')[0],
        status: 'completed'
      };
      
      setTransactions(prev => [newTransaction, ...prev]);
      setAmount('');
      setShowAddFunds(false);
      showSuccess(`تم إضافة ${amount}$ بنجاح إلى محفظتك`);
    } catch (error) {
      showError('فشل في إضافة الأموال');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatedBackground variant="default" intensity="normal">
      {/* Emergency Call Button */}
      <EmergencyCallButton />
      
      <div className="min-h-screen py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-gold-500 to-gold-600 rounded-xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-gold-500/30">
              <Wallet className="w-8 h-8 text-dark-900" />
            </div>
            <h1 className="text-3xl font-bold gradient-text mb-2">المحفظة الإلكترونية</h1>
            <p className="text-gray-400">إدارة أموالك وعمليات الدفع</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Wallet Balance Card */}
            <div className="lg:col-span-1">
              <div className="bg-dark-800/50 backdrop-blur-xl border border-gold-400/20 rounded-2xl p-6 shadow-2xl shadow-cosmic-500/10">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-gold-500 to-gold-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-gold-500/30">
                    <Wallet className="w-8 h-8 text-dark-900" />
                  </div>
                  <h2 className="text-lg font-medium text-gray-300 mb-2">الرصيد الحالي</h2>
                  <div className="text-3xl font-bold text-white mb-1">
                    ${balance.toFixed(2)}
                  </div>
                  <p className="text-sm text-gray-400">محفظة سامية تاروت</p>
                </div>

                {/* Quick Actions */}
                <div className="space-y-3">
                  <button
                    onClick={() => setShowAddFunds(true)}
                    className="w-full flex items-center justify-center px-4 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-lg shadow-lg shadow-green-500/30 transition-all duration-200 transform hover:scale-105"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    إضافة أموال
                  </button>
                  
                  <button className="w-full flex items-center justify-center px-4 py-3 bg-gradient-to-r from-cosmic-500 to-cosmic-600 hover:from-cosmic-600 hover:to-cosmic-700 text-white rounded-lg shadow-lg shadow-cosmic-500/30 transition-all duration-200 transform hover:scale-105">
                    <ArrowUpRight className="w-4 h-4 mr-2" />
                    تحويل أموال
                  </button>
                </div>
              </div>

              {/* Payment Methods */}
              <div className="bg-dark-800/50 backdrop-blur-xl border border-gold-400/20 rounded-2xl p-6 shadow-2xl shadow-cosmic-500/10 mt-6">
                <h3 className="text-lg font-bold text-white mb-4">طرق الدفع</h3>
                <div className="space-y-3">
                  <div className="flex items-center p-3 bg-dark-700/50 border border-gold-400/20 rounded-lg">
                    <CreditCard className="w-5 h-5 text-blue-400 mr-3" />
                    <div>
                      <p className="text-white text-sm font-medium">بطاقة ائتمانية</p>
                      <p className="text-gray-400 text-xs">**** 1234</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center p-3 bg-dark-700/50 border border-gold-400/20 rounded-lg">
                    <Coins className="w-5 h-5 text-orange-400 mr-3" />
                    <div>
                      <p className="text-white text-sm font-medium">عملة رقمية</p>
                      <p className="text-gray-400 text-xs">USDT, BTC</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Transactions History */}
            <div className="lg:col-span-2">
              <div className="bg-dark-800/50 backdrop-blur-xl border border-gold-400/20 rounded-2xl p-6 shadow-2xl shadow-cosmic-500/10">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-white flex items-center">
                    <History className="w-5 h-5 mr-2" />
                    سجل المعاملات
                  </h3>
                  <select className="bg-dark-700/50 border border-gold-400/30 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-gold-400/50 focus:border-gold-400 transition-all duration-200">
                    <option>آخر 30 يوم</option>
                    <option>آخر 3 أشهر</option>
                    <option>آخر سنة</option>
                  </select>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-dark-700/50 border border-gold-400/20 rounded-lg p-4 backdrop-blur-xl">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-400 text-sm">إجمالي الإيداعات</p>
                        <p className="text-green-400 text-lg font-bold">$150.00</p>
                      </div>
                      <TrendingUp className="w-6 h-6 text-green-400" />
                    </div>
                  </div>
                  
                  <div className="bg-dark-700/50 border border-gold-400/20 rounded-lg p-4 backdrop-blur-xl">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-400 text-sm">إجمالي المصروفات</p>
                        <p className="text-red-400 text-lg font-bold">$25.00</p>
                      </div>
                      <ArrowDownLeft className="w-6 h-6 text-red-400" />
                    </div>
                  </div>
                  
                  <div className="bg-dark-700/50 border border-gold-400/20 rounded-lg p-4 backdrop-blur-xl">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-400 text-sm">عدد المعاملات</p>
                        <p className="text-gold-400 text-lg font-bold">{transactions.length}</p>
                      </div>
                      <DollarSign className="w-6 h-6 text-gold-400" />
                    </div>
                  </div>
                </div>

                {/* Transactions List */}
                <div className="space-y-3">
                  {transactions.map((transaction) => (
                    <div
                      key={transaction.id}
                      className="flex items-center justify-between p-4 bg-dark-700/30 border border-gold-400/20 rounded-lg hover:bg-dark-700/50 transition-all duration-200"
                    >
                      <div className="flex items-center">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-3 ${
                          transaction.type === 'credit' 
                            ? 'bg-green-500/20 text-green-400' 
                            : 'bg-red-500/20 text-red-400'
                        }`}>
                          {transaction.type === 'credit' ? (
                            <ArrowDownLeft className="w-5 h-5" />
                          ) : (
                            <ArrowUpRight className="w-5 h-5" />
                          )}
                        </div>
                        <div>
                          <p className="text-white font-medium">{transaction.description}</p>
                          <p className="text-gray-400 text-sm">{transaction.date}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-bold ${
                          transaction.type === 'credit' ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {transaction.type === 'credit' ? '+' : '-'}${transaction.amount}
                        </p>
                        <p className="text-gray-400 text-sm">{transaction.status}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Add Funds Modal */}
          {showAddFunds && (
            <div className="fixed inset-0 bg-dark-900/80 backdrop-blur-xl flex items-center justify-center z-50 p-4">
              <div className="bg-dark-800/90 backdrop-blur-xl border border-gold-400/20 rounded-2xl p-6 w-full max-w-md shadow-2xl shadow-cosmic-500/20">
                <h3 className="text-xl font-bold text-white mb-4">إضافة أموال</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      المبلغ ($)
                    </label>
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="أدخل المبلغ"
                      className="w-full px-4 py-3 bg-dark-700/50 border border-gold-400/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gold-400/50 focus:border-gold-400 transition-all duration-200"
                    />
                  </div>
                  
                  <div className="flex space-x-3">
                    <button
                      onClick={() => setShowAddFunds(false)}
                      className="flex-1 px-4 py-3 border border-gold-400/30 text-gold-400 rounded-lg hover:bg-gold-400/10 transition-all duration-200"
                    >
                      إلغاء
                    </button>
                    <button
                      onClick={handleAddFunds}
                      disabled={loading}
                      className="flex-1 px-4 py-3 bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-600 hover:to-gold-700 text-dark-900 font-bold rounded-lg shadow-lg shadow-gold-500/30 transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                    >
                      {loading ? 'جاري الإضافة...' : 'إضافة'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AnimatedBackground>
  );
};

export default WalletPage; 