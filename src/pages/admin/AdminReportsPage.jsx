import React, { useState, useEffect } from 'react';
import { FileText, Download, Calendar, Filter, BarChart3, Users, DollarSign, TrendingUp, Eye } from 'lucide-react';
import AdminLayout from '../../components/Layout/AdminLayout';

const AdminReportsPage = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [reportType, setReportType] = useState('financial');
  const [dateRange, setDateRange] = useState('7days');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      setLoading(true);
      // TODO: Replace with actual API call
      const response = await fetch('/api/admin/reports');
      if (response.ok) {
        const data = await response.json();
        setReports(data);
      } else {
        // Mock data for now
        setReports([
          {
            id: 1,
            name: 'التقرير المالي الشهري',
            type: 'financial',
            description: 'تقرير شامل عن الإيرادات والمصروفات للشهر الحالي',
            generatedAt: '2024-01-20 10:30',
            generatedBy: 'أحمد الإدارة',
            status: 'completed',
            fileSize: '2.5 MB',
            downloadCount: 15,
            period: 'يناير 2024'
          },
          {
            id: 2,
            name: 'تقرير نشاط المستخدمين',
            type: 'users',
            description: 'إحصائيات تفصيلية عن نشاط المستخدمين والجلسات',
            generatedAt: '2024-01-19 14:20',
            generatedBy: 'سارة الإدارة',
            status: 'completed',
            fileSize: '1.8 MB',
            downloadCount: 8,
            period: 'الأسبوع الماضي'
          },
          {
            id: 3,
            name: 'تقرير أداء القراء',
            type: 'readers',
            description: 'تقييم أداء القراء وإحصائيات الجلسات والتقييمات',
            generatedAt: '2024-01-18 16:45',
            generatedBy: 'محمد الإدارة',
            status: 'generating',
            fileSize: null,
            downloadCount: 0,
            period: 'ديسمبر 2023'
          },
          {
            id: 4,
            name: 'تقرير الأمان والحوادث',
            type: 'security',
            description: 'تقرير شامل عن الحوادث الأمنية والتدابير المتخذة',
            generatedAt: '2024-01-17 09:15',
            generatedBy: 'فاطمة الأمان',
            status: 'completed',
            fileSize: '950 KB',
            downloadCount: 3,
            period: 'الربع الأخير 2023'
          }
        ]);
      }
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateReport = async () => {
    try {
      setLoading(true);
      
      const reportData = {
        type: reportType,
        dateRange: dateRange,
        startDate: dateRange === 'custom' ? customStartDate : null,
        endDate: dateRange === 'custom' ? customEndDate : null
      };

      // TODO: Replace with actual API call
      const response = await fetch('/api/admin/reports/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(reportData)
      });

      if (response.ok) {
        const newReport = await response.json();
        setReports([newReport, ...reports]);
      } else {
        // Mock new report generation
        const newReport = {
          id: reports.length + 1,
          name: getReportName(reportType),
          type: reportType,
          description: getReportDescription(reportType),
          generatedAt: new Date().toLocaleString('ar-SA'),
          generatedBy: 'المدير الحالي',
          status: 'generating',
          fileSize: null,
          downloadCount: 0,
          period: getDateRangeText(dateRange)
        };
        setReports([newReport, ...reports]);
        
        // Simulate report completion after 3 seconds
        setTimeout(() => {
          setReports(prev => prev.map(report => 
            report.id === newReport.id 
              ? { ...report, status: 'completed', fileSize: '1.2 MB' }
              : report
          ));
        }, 3000);
      }
    } catch (error) {
      console.error('Error generating report:', error);
    } finally {
      setLoading(false);
    }
  };

  const downloadReport = async (reportId) => {
    try {
      // TODO: Implement actual download
      console.log(`Downloading report ${reportId}`);
      setReports(reports.map(report => 
        report.id === reportId 
          ? { ...report, downloadCount: report.downloadCount + 1 }
          : report
      ));
    } catch (error) {
      console.error('Error downloading report:', error);
    }
  };

  const getReportName = (type) => {
    const names = {
      financial: 'التقرير المالي',
      users: 'تقرير نشاط المستخدمين',
      readers: 'تقرير أداء القراء',
      sessions: 'تقرير الجلسات',
      security: 'تقرير الأمان والحوادث',
      analytics: 'تقرير التحليلات'
    };
    return names[type] || 'تقرير عام';
  };

  const getReportDescription = (type) => {
    const descriptions = {
      financial: 'تقرير شامل عن الإيرادات والمصروفات والمعاملات المالية',
      users: 'إحصائيات تفصيلية عن نشاط المستخدمين والتسجيلات الجديدة',
      readers: 'تقييم أداء القراء وإحصائيات الجلسات والتقييمات',
      sessions: 'تحليل شامل لجلسات القراءة والحجوزات',
      security: 'تقرير عن الحوادث الأمنية والتدابير المتخذة',
      analytics: 'تحليلات شاملة لأداء المنصة والمؤشرات الرئيسية'
    };
    return descriptions[type] || 'تقرير عام عن المنصة';
  };

  const getDateRangeText = (range) => {
    const ranges = {
      '7days': 'آخر 7 أيام',
      '30days': 'آخر 30 يوم',
      '3months': 'آخر 3 أشهر',
      '6months': 'آخر 6 أشهر',
      '1year': 'آخر سنة',
      'custom': 'فترة مخصصة'
    };
    return ranges[range] || 'فترة محددة';
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      completed: { color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300', text: 'مكتمل' },
      generating: { color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300', text: 'قيد الإنشاء' },
      failed: { color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300', text: 'فشل' }
    };
    
    const config = statusConfig[status] || statusConfig.completed;
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.text}
      </span>
    );
  };

  const getTypeIcon = (type) => {
    const icons = {
      financial: DollarSign,
      users: Users,
      readers: BarChart3,
      sessions: Calendar,
      security: FileText,
      analytics: TrendingUp
    };
    const Icon = icons[type] || FileText;
    return <Icon className="w-5 h-5" />;
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
              <FileText className="w-8 h-8 mr-3 text-purple-600" />
              إدارة التقارير
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              إنشاء وإدارة تقارير المنصة التفصيلية
            </p>
          </div>
        </div>

        {/* Report Generation Form */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">إنشاء تقرير جديد</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                نوع التقرير
              </label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              >
                <option value="financial">التقرير المالي</option>
                <option value="users">نشاط المستخدمين</option>
                <option value="readers">أداء القراء</option>
                <option value="sessions">تقرير الجلسات</option>
                <option value="security">الأمان والحوادث</option>
                <option value="analytics">التحليلات</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                الفترة الزمنية
              </label>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              >
                <option value="7days">آخر 7 أيام</option>
                <option value="30days">آخر 30 يوم</option>
                <option value="3months">آخر 3 أشهر</option>
                <option value="6months">آخر 6 أشهر</option>
                <option value="1year">آخر سنة</option>
                <option value="custom">فترة مخصصة</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={generateReport}
                disabled={loading}
                className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center justify-center"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <>
                    <BarChart3 className="w-4 h-4 mr-2" />
                    إنشاء التقرير
                  </>
                )}
              </button>
            </div>
          </div>

          {dateRange === 'custom' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  تاريخ البداية
                </label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  تاريخ النهاية
                </label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>
          )}
        </div>

        {/* Reports List */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">التقارير المحفوظة</h2>
          
          {reports.map((report) => (
            <div key={report.id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 text-purple-600">
                    {getTypeIcon(report.type)}
                  </div>
                  <div className="flex-1 min-w-0 mr-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                        {report.name}
                      </h3>
                      {getStatusBadge(report.status)}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      {report.description}
                    </p>
                    <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 space-x-4">
                      <span>تم الإنشاء: {report.generatedAt}</span>
                      <span>بواسطة: {report.generatedBy}</span>
                      <span>الفترة: {report.period}</span>
                      {report.fileSize && <span>الحجم: {report.fileSize}</span>}
                      <span>مرات التحميل: {report.downloadCount}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  {report.status === 'completed' && (
                    <button
                      onClick={() => downloadReport(report.id)}
                      className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                    >
                      <Download className="w-4 h-4 mr-1" />
                      تحميل
                    </button>
                  )}
                  {report.status === 'generating' && (
                    <div className="flex items-center text-sm text-yellow-600 dark:text-yellow-400">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600 mr-2"></div>
                      قيد الإنشاء...
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {reports.length === 0 && (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">لا توجد تقارير محفوظة</p>
          </div>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="flex items-center">
              <FileText className="w-8 h-8 text-blue-600" />
              <div className="mr-3">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">إجمالي التقارير</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{reports.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="flex items-center">
              <BarChart3 className="w-8 h-8 text-green-600" />
              <div className="mr-3">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">مكتملة</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {reports.filter(r => r.status === 'completed').length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="flex items-center">
              <Calendar className="w-8 h-8 text-yellow-600" />
              <div className="mr-3">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">قيد الإنشاء</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {reports.filter(r => r.status === 'generating').length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="flex items-center">
              <Download className="w-8 h-8 text-purple-600" />
              <div className="mr-3">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">مرات التحميل</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {reports.reduce((sum, r) => sum + r.downloadCount, 0)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminReportsPage; 