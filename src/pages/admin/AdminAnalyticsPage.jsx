import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, TrendingDown, Users, Eye, DollarSign, Calendar, Filter, Download } from 'lucide-react';
import AdminLayout from '../../components/Layout/AdminLayout';

const AdminAnalyticsPage = () => {
  const [analyticsData, setAnalyticsData] = useState({
    userGrowth: { current: 1250, previous: 1180, change: 5.9 },
    readerGrowth: { current: 45, previous: 42, change: 7.1 },
    sessionGrowth: { current: 890, previous: 823, change: 8.1 },
    revenueGrowth: { current: 15670, previous: 14230, change: 10.1 }
  });
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('month');
  const [chartData, setChartData] = useState([]);

  useEffect(() => {
    fetchAnalyticsData();
  }, [timeRange]);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      // TODO: Replace with actual API call
      const response = await fetch(`/api/admin/analytics?range=${timeRange}`);
      if (response.ok) {
        const data = await response.json();
        setAnalyticsData(data.summary);
        setChartData(data.chartData);
      } else {
        // Mock chart data
        setChartData([
          { name: 'يناير', users: 1100, sessions: 650, revenue: 12000 },
          { name: 'فبراير', users: 1150, sessions: 720, revenue: 13500 },
          { name: 'مارس', users: 1200, sessions: 780, revenue: 14200 },
          { name: 'أبريل', users: 1250, sessions: 890, revenue: 15670 }
        ]);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportReport = async (format) => {
    try {
      console.log(`Exporting analytics report in ${format} format`);
      // TODO: Implement export functionality
    } catch (error) {
      console.error('Error exporting report:', error);
    }
  };

  const StatCard = ({ title, value, change, icon: Icon, color }) => (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div className="flex items-center">
        <div className={`p-2 ${color} rounded-lg`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        <div className="mr-4">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{value.toLocaleString()}</p>
          <div className="flex items-center mt-1">
            {change >= 0 ? (
              <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
            ) : (
              <TrendingDown className="w-4 h-4 text-red-500 mr-1" />
            )}
            <span className={`text-sm ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {change >= 0 ? '+' : ''}{change}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );

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
              <BarChart3 className="w-8 h-8 mr-3 text-purple-600" />
              الإحصائيات والتحليلات
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              مراقبة أداء المنصة والاتجاهات
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

        {/* Time Range Filter */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            >
              <option value="week">هذا الأسبوع</option>
              <option value="month">هذا الشهر</option>
              <option value="quarter">هذا الربع</option>
              <option value="year">هذا العام</option>
            </select>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="إجمالي المستخدمين"
            value={analyticsData.userGrowth.current}
            change={analyticsData.userGrowth.change}
            icon={Users}
            color="bg-blue-500"
          />
          <StatCard
            title="القراء النشطين"
            value={analyticsData.readerGrowth.current}
            change={analyticsData.readerGrowth.change}
            icon={Eye}
            color="bg-purple-500"
          />
          <StatCard
            title="الجلسات المكتملة"
            value={analyticsData.sessionGrowth.current}
            change={analyticsData.sessionGrowth.change}
            icon={BarChart3}
            color="bg-green-500"
          />
          <StatCard
            title="الإيرادات ($)"
            value={analyticsData.revenueGrowth.current}
            change={analyticsData.revenueGrowth.change}
            icon={DollarSign}
            color="bg-orange-500"
          />
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* User Growth Chart */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">نمو المستخدمين</h3>
            <div className="h-64 flex items-center justify-center bg-gray-50 dark:bg-gray-700 rounded">
              <p className="text-gray-500 dark:text-gray-400">مخطط نمو المستخدمين</p>
              {/* TODO: Implement actual chart component */}
            </div>
          </div>

          {/* Revenue Chart */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">نمو الإيرادات</h3>
            <div className="h-64 flex items-center justify-center bg-gray-50 dark:bg-gray-700 rounded">
              <p className="text-gray-500 dark:text-gray-400">مخطط نمو الإيرادات</p>
              {/* TODO: Implement actual chart component */}
            </div>
          </div>
        </div>

        {/* Detailed Analytics Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">التحليلات التفصيلية</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    الفترة
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    المستخدمين الجدد
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    الجلسات
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    الإيرادات
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    معدل التحويل
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {chartData.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {item.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {item.users.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {item.sessions.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      ${item.revenue.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {((item.sessions / item.users) * 100).toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Performance Insights */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">أفضل القراء</h3>
            <div className="space-y-3">
              {['سارة أحمد', 'محمد علي', 'نور فاطمة'].map((reader, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm text-gray-900 dark:text-white">{reader}</span>
                  <span className="text-sm text-purple-600 dark:text-purple-400">
                    {(Math.random() * 50 + 50).toFixed(1)} جلسة
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">الخدمات الأكثر طلباً</h3>
            <div className="space-y-3">
              {['قراءة التاروت', 'قراءة الطالع', 'الأحلام والرؤى'].map((service, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm text-gray-900 dark:text-white">{service}</span>
                  <span className="text-sm text-green-600 dark:text-green-400">
                    {(Math.random() * 200 + 100).toFixed(0)} طلب
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">معدلات الرضا</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-900 dark:text-white">تقييم عام</span>
                <span className="text-sm text-yellow-600 dark:text-yellow-400">4.8/5</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-900 dark:text-white">معدل الإكمال</span>
                <span className="text-sm text-blue-600 dark:text-blue-400">94%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-900 dark:text-white">العملاء المتكررين</span>
                <span className="text-sm text-purple-600 dark:text-purple-400">67%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminAnalyticsPage; 