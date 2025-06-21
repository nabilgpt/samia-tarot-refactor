import React, { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, TrendingDown, CreditCard, Download, Calendar, Filter } from 'lucide-react';
import AdminLayout from '../../components/Layout/AdminLayout';

const AdminFinancesPage = () => {
  const [financialData, setFinancialData] = useState({
    totalRevenue: 0,
    monthlyRevenue: 0,
    totalTransactions: 0,
    averageTransaction: 0,
    revenueGrowth: 0,
    transactionGrowth: 0
  });
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('month');
  const [filterType, setFilterType] = useState('all');

  useEffect(() => {
    fetchFinancialData();
  }, [dateRange, filterType]);

  const fetchFinancialData = async () => {
    try {
      setLoading(true);
      // TODO: Replace with actual API call
      const response = await fetch(`/api/admin/finances?range=${dateRange}&type=${filterType}`);
      if (response.ok) {
        const data = await response.json();
        setFinancialData(data.summary);
        setTransactions(data.transactions);
      } else {
        // Mock data for now
        setFinancialData({
          totalRevenue: 45230,
          monthlyRevenue: 12450,
          totalTransactions: 1247,
          averageTransaction: 36.3,
          revenueGrowth: 12.5,
          transactionGrowth: 8.3
        });
        setTransactions([
          {
            id: 1,
            date: '2024-01-20',
            client: 'أحمد محمد',
            reader: 'سارة أحمد',
            amount: 25.00,
            type: 'session',
            status: 'completed',
            paymentMethod: 'credit_card'
          },
          {
            id: 2,
            date: '2024-01-20',
            client: 'فاطمة علي',
            reader: 'محمد علي',
            amount: 35.00,
            type: 'session',
            status: 'completed',
            paymentMethod: 'paypal'
          },
          {
            id: 3,
            date: '2024-01-19',
            client: 'خالد حسن',
            reader: 'نور فاطمة',
            amount: 45.00,
            type: 'premium_session',
            status: 'completed',
            paymentMethod: 'credit_card'
          },
          {
            id: 4,
            date: '2024-01-19',
            client: 'مريم أحمد',
            reader: 'سارة أحمد',
            amount: 30.00,
            type: 'session',
            status: 'pending',
            paymentMethod: 'bank_transfer'
          }
        ]);
      }
    } catch (error) {
      console.error('Error fetching financial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportReport = async (format) => {
    try {
      // TODO: Implement export functionality
      console.log(`Exporting financial report in ${format} format`);
      // This would typically trigger a download
    } catch (error) {
      console.error('Error exporting report:', error);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      completed: { color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300', text: 'مكتمل' },
      pending: { color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300', text: 'معلق' },
      failed: { color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300', text: 'فشل' },
      refunded: { color: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300', text: 'مسترد' }
    };
    const config = statusConfig[status] || statusConfig.pending;
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.text}
      </span>
    );
  };

  const getPaymentMethodIcon = (method) => {
    switch (method) {
      case 'credit_card':
        return <CreditCard className="w-4 h-4" />;
      case 'paypal':
        return <span className="text-blue-600 font-bold text-xs">PP</span>;
      case 'bank_transfer':
        return <span className="text-green-600 font-bold text-xs">BT</span>;
      default:
        return <CreditCard className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
              <DollarSign className="w-8 h-8 mr-3 text-purple-600" />
              التقارير المالية
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              مراقبة الإيرادات والمعاملات المالية
            </p>
          </div>
          <div className="flex space-x-2">
            <button 
              onClick={() => exportReport('pdf')}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center"
            >
              <Download className="w-4 h-4 mr-2" />
              PDF
            </button>
            <button 
              onClick={() => exportReport('excel')}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center"
            >
              <Download className="w-4 h-4 mr-2" />
              Excel
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              >
                <option value="today">اليوم</option>
                <option value="week">هذا الأسبوع</option>
                <option value="month">هذا الشهر</option>
                <option value="quarter">هذا الربع</option>
                <option value="year">هذا العام</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              >
                <option value="all">جميع المعاملات</option>
                <option value="session">جلسات عادية</option>
                <option value="premium_session">جلسات مميزة</option>
                <option value="subscription">اشتراكات</option>
                <option value="refund">المبالغ المستردة</option>
              </select>
            </div>
          </div>
        </div>

        {/* Financial Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                <DollarSign className="w-6 h-6 text-green-600 dark:text-green-300" />
              </div>
              <div className="mr-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">إجمالي الإيرادات</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">${financialData.totalRevenue.toLocaleString()}</p>
                <div className="flex items-center mt-1">
                  <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                  <span className="text-sm text-green-600">+{financialData.revenueGrowth}%</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <TrendingUp className="w-6 h-6 text-blue-600 dark:text-blue-300" />
              </div>
              <div className="mr-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">إيرادات الشهر</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">${financialData.monthlyRevenue.toLocaleString()}</p>
                <div className="flex items-center mt-1">
                  <TrendingUp className="w-4 h-4 text-blue-500 mr-1" />
                  <span className="text-sm text-blue-600">+{financialData.revenueGrowth}%</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                <CreditCard className="w-6 h-6 text-purple-600 dark:text-purple-300" />
              </div>
              <div className="mr-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">إجمالي المعاملات</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{financialData.totalTransactions.toLocaleString()}</p>
                <div className="flex items-center mt-1">
                  <TrendingUp className="w-4 h-4 text-purple-500 mr-1" />
                  <span className="text-sm text-purple-600">+{financialData.transactionGrowth}%</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
                <TrendingUp className="w-6 h-6 text-orange-600 dark:text-orange-300" />
              </div>
              <div className="mr-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">متوسط المعاملة</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">${financialData.averageTransaction}</p>
                <div className="flex items-center mt-1">
                  <TrendingDown className="w-4 h-4 text-red-500 mr-1" />
                  <span className="text-sm text-red-600">-2.1%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">آخر المعاملات</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    التاريخ
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    العميل
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    القارئ
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    المبلغ
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    النوع
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    طريقة الدفع
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    الحالة
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {transactions.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {transaction.date}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {transaction.client}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {transaction.reader}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      ${transaction.amount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {transaction.type === 'session' ? 'جلسة عادية' : 
                       transaction.type === 'premium_session' ? 'جلسة مميزة' : 
                       transaction.type === 'subscription' ? 'اشتراك' : 'أخرى'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      <div className="flex items-center">
                        {getPaymentMethodIcon(transaction.paymentMethod)}
                        <span className="mr-2">
                          {transaction.paymentMethod === 'credit_card' ? 'بطاقة ائتمان' :
                           transaction.paymentMethod === 'paypal' ? 'PayPal' :
                           transaction.paymentMethod === 'bank_transfer' ? 'تحويل بنكي' : 'أخرى'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(transaction.status)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminFinancesPage; 