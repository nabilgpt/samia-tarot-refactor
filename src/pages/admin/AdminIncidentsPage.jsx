import React, { useState, useEffect } from 'react';
import { AlertTriangle, Search, Filter, Eye, CheckCircle, XCircle, Clock, Flag, User, MessageSquare } from 'lucide-react';
import AdminLayout from '../../components/Layout/AdminLayout';

const AdminIncidentsPage = () => {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [selectedIncident, setSelectedIncident] = useState(null);

  useEffect(() => {
    fetchIncidents();
  }, []);

  const fetchIncidents = async () => {
    try {
      setLoading(true);
      // TODO: Replace with actual API call
      const response = await fetch('/api/admin/incidents');
      if (response.ok) {
        const data = await response.json();
        setIncidents(data);
      } else {
        // Mock data for now
        setIncidents([
          {
            id: 1,
            title: 'شكوى من سلوك غير لائق',
            description: 'تم الإبلاغ عن سلوك غير لائق من قارئ خلال جلسة قراءة التاروت',
            reportedBy: 'فاطمة أحمد',
            reportedUser: 'محمد علي',
            userRole: 'reader',
            severity: 'high',
            status: 'investigating',
            category: 'behavior',
            sessionId: 'SES_001',
            createdAt: '2024-01-20 14:30',
            updatedAt: '2024-01-20 15:45',
            assignedTo: 'سارة الإدارة',
            evidence: ['لقطة شاشة', 'تسجيل صوتي'],
            actions: [
              { action: 'تم إنشاء البلاغ', timestamp: '2024-01-20 14:30', user: 'النظام' },
              { action: 'تم تعيين المحقق', timestamp: '2024-01-20 14:35', user: 'أحمد الإدارة' },
              { action: 'بدء التحقيق', timestamp: '2024-01-20 15:45', user: 'سارة الإدارة' }
            ]
          },
          {
            id: 2,
            title: 'مشكلة في الدفع',
            description: 'عميل يشكو من خصم مبلغ دون تلقي الخدمة',
            reportedBy: 'خالد حسن',
            reportedUser: null,
            userRole: 'client',
            severity: 'medium',
            status: 'resolved',
            category: 'payment',
            sessionId: null,
            createdAt: '2024-01-19 10:20',
            updatedAt: '2024-01-19 16:30',
            assignedTo: 'محمد المالية',
            evidence: ['إيصال الدفع', 'سجل المعاملات'],
            actions: [
              { action: 'تم إنشاء البلاغ', timestamp: '2024-01-19 10:20', user: 'النظام' },
              { action: 'مراجعة سجل المعاملات', timestamp: '2024-01-19 11:00', user: 'محمد المالية' },
              { action: 'تم استرداد المبلغ', timestamp: '2024-01-19 16:30', user: 'محمد المالية' }
            ]
          },
          {
            id: 3,
            title: 'انتهاك سياسة المحتوى',
            description: 'تم رفع محتوى غير مناسب في ملف القارئ الشخصي',
            reportedBy: 'نظام المراقبة الآلي',
            reportedUser: 'نور فاطمة',
            userRole: 'reader',
            severity: 'low',
            status: 'pending',
            category: 'content',
            sessionId: null,
            createdAt: '2024-01-18 20:15',
            updatedAt: '2024-01-18 20:15',
            assignedTo: null,
            evidence: ['لقطة شاشة من الملف الشخصي'],
            actions: [
              { action: 'تم إنشاء البلاغ تلقائياً', timestamp: '2024-01-18 20:15', user: 'النظام' }
            ]
          },
          {
            id: 4,
            title: 'محاولة اختراق الحساب',
            description: 'تم رصد محاولات دخول مشبوهة لحساب مستخدم',
            reportedBy: 'نظام الأمان',
            reportedUser: 'عبدالله محمد',
            userRole: 'client',
            severity: 'critical',
            status: 'escalated',
            category: 'security',
            sessionId: null,
            createdAt: '2024-01-17 02:45',
            updatedAt: '2024-01-17 08:30',
            assignedTo: 'فريق الأمان',
            evidence: ['سجل محاولات الدخول', 'عناوين IP المشبوهة'],
            actions: [
              { action: 'رصد نشاط مشبوه', timestamp: '2024-01-17 02:45', user: 'النظام' },
              { action: 'تم تجميد الحساب مؤقتاً', timestamp: '2024-01-17 02:50', user: 'النظام' },
              { action: 'إحالة لفريق الأمان', timestamp: '2024-01-17 08:30', user: 'أحمد الإدارة' }
            ]
          }
        ]);
      }
    } catch (error) {
      console.error('Error fetching incidents:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateIncidentStatus = async (incidentId, newStatus) => {
    try {
      // TODO: Replace with actual API call
      const response = await fetch(`/api/admin/incidents/${incidentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        setIncidents(incidents.map(incident => 
          incident.id === incidentId 
            ? { 
                ...incident, 
                status: newStatus,
                updatedAt: new Date().toLocaleString('ar-SA'),
                actions: [
                  ...incident.actions,
                  { 
                    action: `تم تغيير الحالة إلى ${getStatusText(newStatus)}`, 
                    timestamp: new Date().toLocaleString('ar-SA'), 
                    user: 'المدير الحالي' 
                  }
                ]
              }
            : incident
        ));
      }
    } catch (error) {
      console.error('Error updating incident:', error);
    }
  };

  const assignIncident = async (incidentId, assignee) => {
    try {
      // TODO: Replace with actual API call
      setIncidents(incidents.map(incident => 
        incident.id === incidentId 
          ? { 
              ...incident, 
              assignedTo: assignee,
              updatedAt: new Date().toLocaleString('ar-SA'),
              actions: [
                ...incident.actions,
                { 
                  action: `تم تعيين المحقق: ${assignee}`, 
                  timestamp: new Date().toLocaleString('ar-SA'), 
                  user: 'المدير الحالي' 
                }
              ]
            }
          : incident
      ));
    } catch (error) {
      console.error('Error assigning incident:', error);
    }
  };

  const getSeverityBadge = (severity) => {
    const severityConfig = {
      critical: { color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300', text: 'حرج' },
      high: { color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300', text: 'عالي' },
      medium: { color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300', text: 'متوسط' },
      low: { color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300', text: 'منخفض' }
    };
    
    const config = severityConfig[severity] || severityConfig.medium;
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.text}
      </span>
    );
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { color: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300', text: 'في الانتظار', icon: Clock },
      investigating: { color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300', text: 'قيد التحقيق', icon: Eye },
      escalated: { color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300', text: 'مُحال', icon: Flag },
      resolved: { color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300', text: 'محلول', icon: CheckCircle },
      closed: { color: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300', text: 'مغلق', icon: XCircle }
    };
    
    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="w-3 h-3 mr-1" />
        {config.text}
      </span>
    );
  };

  const getStatusText = (status) => {
    const statusTexts = {
      pending: 'في الانتظار',
      investigating: 'قيد التحقيق',
      escalated: 'مُحال',
      resolved: 'محلول',
      closed: 'مغلق'
    };
    return statusTexts[status] || status;
  };

  const getCategoryBadge = (category) => {
    const categoryConfig = {
      behavior: { color: 'bg-red-100 text-red-800', text: 'سلوك' },
      payment: { color: 'bg-green-100 text-green-800', text: 'دفع' },
      content: { color: 'bg-yellow-100 text-yellow-800', text: 'محتوى' },
      security: { color: 'bg-purple-100 text-purple-800', text: 'أمان' },
      technical: { color: 'bg-blue-100 text-blue-800', text: 'تقني' }
    };
    
    const config = categoryConfig[category] || categoryConfig.technical;
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${config.color}`}>
        {config.text}
      </span>
    );
  };

  const filteredIncidents = incidents.filter(incident => {
    const matchesSearch = incident.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         incident.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (incident.reportedBy && incident.reportedBy.toLowerCase().includes(searchTerm.toLowerCase())) ||
                         (incident.reportedUser && incident.reportedUser.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || incident.status === statusFilter;
    const matchesSeverity = severityFilter === 'all' || incident.severity === severityFilter;
    return matchesSearch && matchesStatus && matchesSeverity;
  });

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
              <AlertTriangle className="w-8 h-8 mr-3 text-purple-600" />
              إدارة الحوادث
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              متابعة وإدارة الحوادث والشكاوى المبلغ عنها
            </p>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="البحث في الحوادث..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              >
                <option value="all">جميع الحالات</option>
                <option value="pending">في الانتظار</option>
                <option value="investigating">قيد التحقيق</option>
                <option value="escalated">مُحال</option>
                <option value="resolved">محلول</option>
                <option value="closed">مغلق</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              >
                <option value="all">جميع الدرجات</option>
                <option value="critical">حرج</option>
                <option value="high">عالي</option>
                <option value="medium">متوسط</option>
                <option value="low">منخفض</option>
              </select>
            </div>
          </div>
        </div>

        {/* Incidents List */}
        <div className="space-y-4">
          {filteredIncidents.map((incident) => (
            <div key={incident.id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                        {incident.title}
                      </h3>
                      <div className="flex items-center space-x-2">
                        {getSeverityBadge(incident.severity)}
                        {getStatusBadge(incident.status)}
                        {getCategoryBadge(incident.category)}
                      </div>
                    </div>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      #{incident.id}
                    </span>
                  </div>
                  
                  <p className="text-gray-700 dark:text-gray-300 text-sm mb-4">
                    {incident.description}
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 text-sm">
                    <div className="space-y-1">
                      <p><span className="font-medium">المبلغ:</span> {incident.reportedBy}</p>
                      {incident.reportedUser && (
                        <p><span className="font-medium">المبلغ عنه:</span> {incident.reportedUser} ({incident.userRole})</p>
                      )}
                      {incident.sessionId && (
                        <p><span className="font-medium">الجلسة:</span> {incident.sessionId}</p>
                      )}
                    </div>
                    <div className="space-y-1">
                      <p><span className="font-medium">تاريخ الإنشاء:</span> {incident.createdAt}</p>
                      <p><span className="font-medium">آخر تحديث:</span> {incident.updatedAt}</p>
                      {incident.assignedTo && (
                        <p><span className="font-medium">المعين:</span> {incident.assignedTo}</p>
                      )}
                    </div>
                  </div>

                  {incident.evidence && incident.evidence.length > 0 && (
                    <div className="mb-4">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">الأدلة:</p>
                      <div className="flex flex-wrap gap-2">
                        {incident.evidence.map((evidence, index) => (
                          <span key={index} className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-xs rounded">
                            {evidence}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => setSelectedIncident(incident)}
                      className="inline-flex items-center px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-xs font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      عرض التفاصيل
                    </button>
                    
                    {incident.status === 'pending' && (
                      <button
                        onClick={() => updateIncidentStatus(incident.id, 'investigating')}
                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        بدء التحقيق
                      </button>
                    )}
                    
                    {incident.status === 'investigating' && (
                      <button
                        onClick={() => updateIncidentStatus(incident.id, 'resolved')}
                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        حل
                      </button>
                    )}
                    
                    {incident.status !== 'escalated' && incident.severity === 'critical' && (
                      <button
                        onClick={() => updateIncidentStatus(incident.id, 'escalated')}
                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                      >
                        <Flag className="w-4 h-4 mr-1" />
                        إحالة
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredIncidents.length === 0 && (
          <div className="text-center py-12">
            <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">لا توجد حوادث تطابق المعايير المحددة</p>
          </div>
        )}

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="flex items-center">
              <AlertTriangle className="w-8 h-8 text-red-600" />
              <div className="mr-3">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">إجمالي الحوادث</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{incidents.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="flex items-center">
              <Clock className="w-8 h-8 text-yellow-600" />
              <div className="mr-3">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">في الانتظار</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {incidents.filter(i => i.status === 'pending').length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="flex items-center">
              <Eye className="w-8 h-8 text-blue-600" />
              <div className="mr-3">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">قيد التحقيق</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {incidents.filter(i => i.status === 'investigating').length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="flex items-center">
              <CheckCircle className="w-8 h-8 text-green-600" />
              <div className="mr-3">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">محلولة</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {incidents.filter(i => i.status === 'resolved').length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Incident Details Modal */}
        {selectedIncident && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    تفاصيل الحادثة #{selectedIncident.id}
                  </h2>
                  <button
                    onClick={() => setSelectedIncident(null)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <XCircle className="w-6 h-6" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white mb-2">سجل الإجراءات</h3>
                    <div className="space-y-2">
                      {selectedIncident.actions.map((action, index) => (
                        <div key={index} className="flex items-start space-x-3 text-sm">
                          <div className="flex-shrink-0 w-2 h-2 bg-purple-600 rounded-full mt-2"></div>
                          <div className="flex-1">
                            <p className="text-gray-900 dark:text-white">{action.action}</p>
                            <p className="text-gray-500 dark:text-gray-400 text-xs">
                              {action.timestamp} • {action.user}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {!selectedIncident.assignedTo && (
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white mb-2">تعيين محقق</h3>
                      <div className="flex space-x-2">
                        <select
                          onChange={(e) => assignIncident(selectedIncident.id, e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                        >
                          <option value="">اختر محقق</option>
                          <option value="سارة الإدارة">سارة الإدارة</option>
                          <option value="محمد المالية">محمد المالية</option>
                          <option value="فريق الأمان">فريق الأمان</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminIncidentsPage; 