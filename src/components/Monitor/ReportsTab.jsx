import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase.js';
import { useAuth } from '../../context/AuthContext.jsx';

const ReportsTab = ({ onUpdate }) => {
  const { user } = useAuth();
  const [reports, setReports] = useState([]);
  const [systemReports, setSystemReports] = useState([]);
  const [emergencyReports, setEmergencyReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeView, setActiveView] = useState('system');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [reportPeriod, setReportPeriod] = useState('today');
  const [newReport, setNewReport] = useState({
    title: '',
    type: 'incident',
    priority: 'medium',
    description: '',
    affected_users: '',
    recommendations: ''
  });

  useEffect(() => {
    loadReportsData();
  }, [reportPeriod]);

  const loadReportsData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadSystemReports(),
        loadEmergencyReports(),
        loadMonitorReports()
      ]);
    } catch (error) {
      console.error('Error loading reports data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSystemReports = async () => {
    try {
      const dateFilter = getDateFilter();
      
      // Get system metrics for the period
      const [bookingsData, paymentsData, messagesData, usersData] = await Promise.all([
        supabase.from('bookings').select('*').gte('created_at', dateFilter),
        supabase.from('payments').select('*').gte('created_at', dateFilter),
        supabase.from('messages').select('*').gte('created_at', dateFilter),
        supabase.from('profiles').select('*').gte('created_at', dateFilter)
      ]);

      const systemReport = {
        id: 'system-' + Date.now(),
        type: 'system',
        period: reportPeriod,
        generated_at: new Date().toISOString(),
        metrics: {
          total_bookings: bookingsData.data?.length || 0,
          completed_bookings: bookingsData.data?.filter(b => b.status === 'completed').length || 0,
          cancelled_bookings: bookingsData.data?.filter(b => b.status === 'cancelled').length || 0,
          total_payments: paymentsData.data?.length || 0,
          successful_payments: paymentsData.data?.filter(p => p.status === 'completed').length || 0,
          failed_payments: paymentsData.data?.filter(p => p.status === 'failed').length || 0,
          total_messages: messagesData.data?.length || 0,
          flagged_messages: messagesData.data?.filter(m => m.flagged).length || 0,
          new_users: usersData.data?.length || 0,
          revenue: paymentsData.data?.filter(p => p.status === 'completed')
            .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0) || 0
        }
      };

      setSystemReports([systemReport]);
    } catch (error) {
      console.error('Error loading system reports:', error);
    }
  };

  const loadEmergencyReports = async () => {
    try {
      const dateFilter = getDateFilter();
      const { data, error } = await supabase
        .from('emergency_incidents')
        .select(`
          *,
          booking:bookings(
            id,
            client:profiles!bookings_user_id_fkey(first_name, last_name, email),
            reader:profiles!bookings_reader_id_fkey(first_name, last_name, email),
            service:services(name, type)
          ),
          reporter:profiles!emergency_incidents_reporter_id_fkey(first_name, last_name, email)
        `)
        .gte('created_at', dateFilter)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEmergencyReports(data || []);
    } catch (error) {
      console.error('Error loading emergency reports:', error);
    }
  };

  const loadMonitorReports = async () => {
    try {
      const dateFilter = getDateFilter();
      const { data, error } = await supabase
        .from('monitor_reports')
        .select(`
          *,
          author:profiles!monitor_reports_author_id_fkey(first_name, last_name, email)
        `)
        .gte('created_at', dateFilter)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReports(data || []);
    } catch (error) {
      console.error('Error loading monitor reports:', error);
    }
  };

  const getDateFilter = () => {
    const now = new Date();
    switch (reportPeriod) {
      case 'today':
        return new Date(now.setHours(0, 0, 0, 0)).toISOString();
      case 'week':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      case 'month':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      default:
        return new Date(now.setHours(0, 0, 0, 0)).toISOString();
    }
  };

  const submitReport = async () => {
    try {
      const { error } = await supabase
        .from('monitor_reports')
        .insert({
          ...newReport,
          author_id: user.id,
          status: 'submitted'
        });

      if (error) throw error;

      await loadMonitorReports();
      onUpdate?.();
      setShowCreateModal(false);
      setNewReport({
        title: '',
        type: 'incident',
        priority: 'medium',
        description: '',
        affected_users: '',
        recommendations: ''
      });
      alert('Report submitted successfully');
    } catch (error) {
      console.error('Error submitting report:', error);
      alert('Failed to submit report');
    }
  };

  const exportReport = (reportData, filename) => {
    const csvContent = [
      ['Metric', 'Value'].join(','),
      ...Object.entries(reportData.metrics || {}).map(([key, value]) => [
        key.replace(/_/g, ' ').toUpperCase(),
        value
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'system': return '📊';
      case 'emergency': return '🚨';
      case 'incident': return '⚠️';
      case 'quality': return '✅';
      case 'performance': return '📈';
      default: return '📄';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const views = [
    { id: 'system', name: 'System Reports', count: systemReports.length, icon: '📊' },
    { id: 'emergency', name: 'Emergency Reports', count: emergencyReports.length, icon: '🚨' },
    { id: 'monitor', name: 'Monitor Reports', count: reports.length, icon: '📋' }
  ];

  const getCurrentData = () => {
    switch (activeView) {
      case 'system': return systemReports;
      case 'emergency': return emergencyReports;
      case 'monitor': return reports;
      default: return [];
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Reports & Analytics</h3>
        <div className="flex space-x-2">
          <select
            value={reportPeriod}
            onChange={(e) => setReportPeriod(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="today">Today</option>
            <option value="week">Last 7 Days</option>
            <option value="month">Last 30 Days</option>
          </select>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            Create Report
          </button>
          <button
            onClick={loadReportsData}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* View Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
        {views.map((view) => (
          <button
            key={view.id}
            onClick={() => setActiveView(view.id)}
            className={`flex-1 flex items-center justify-center px-4 py-2 rounded-md font-medium text-sm transition-colors ${
              activeView === view.id
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <span className="mr-2">{view.icon}</span>
            {view.name}
            {view.count > 0 && (
              <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                {view.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* System Reports Summary */}
      {activeView === 'system' && systemReports.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold text-gray-900">System Performance Summary</h4>
            <button
              onClick={() => exportReport(systemReports[0], 'system-report')}
              className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
            >
              Export CSV
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(systemReports[0].metrics).map(([key, value]) => (
              <div key={key} className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">
                  {key.includes('revenue') ? `$${value.toFixed(2)}` : value}
                </div>
                <div className="text-sm text-gray-600 capitalize">
                  {key.replace(/_/g, ' ')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reports List */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Report</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Author</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-4 text-center text-gray-500">
                    Loading reports...
                  </td>
                </tr>
              ) : getCurrentData().length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-4 text-center text-gray-500">
                    No {activeView} reports found
                  </td>
                </tr>
              ) : (
                getCurrentData().map((report) => (
                  <tr key={report.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className="text-2xl mr-3">{getTypeIcon(report.type || activeView)}</span>
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {report.title || `${activeView} Report #${report.id.slice(0, 8)}`}
                          </div>
                          <div className="text-sm text-gray-500">
                            {report.description?.substring(0, 50) || 'System generated report'}
                            {report.description?.length > 50 && '...'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full font-medium">
                        {report.type || activeView}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full font-medium ${getPriorityColor(report.priority || report.severity)}`}>
                        {report.priority || report.severity || 'Medium'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {report.author?.first_name 
                        ? `${report.author.first_name} ${report.author.last_name}` 
                        : report.reporter?.first_name 
                          ? `${report.reporter.first_name} ${report.reporter.last_name}`
                          : 'System'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDateTime(report.created_at || report.generated_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button
                        onClick={() => {
                          setSelectedReport(report);
                          setShowDetailModal(true);
                        }}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        View Details
                      </button>
                      {activeView === 'system' && (
                        <button
                          onClick={() => exportReport(report, 'system-report')}
                          className="text-green-600 hover:text-green-900"
                        >
                          Export
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Report Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-96 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Create Monitor Report</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Report Title</label>
                  <input
                    type="text"
                    value={newReport.title}
                    onChange={(e) => setNewReport(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter report title"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select
                    value={newReport.type}
                    onChange={(e) => setNewReport(prev => ({ ...prev, type: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="incident">Incident Report</option>
                    <option value="quality">Quality Assurance</option>
                    <option value="performance">Performance Issue</option>
                    <option value="security">Security Concern</option>
                    <option value="user_behavior">User Behavior</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                  <select
                    value={newReport.priority}
                    onChange={(e) => setNewReport(prev => ({ ...prev, priority: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Affected Users</label>
                  <input
                    type="text"
                    value={newReport.affected_users}
                    onChange={(e) => setNewReport(prev => ({ ...prev, affected_users: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="User IDs or emails"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={newReport.description}
                  onChange={(e) => setNewReport(prev => ({ ...prev, description: e.target.value }))}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Detailed description of the issue or observation"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Recommendations</label>
                <textarea
                  value={newReport.recommendations}
                  onChange={(e) => setNewReport(prev => ({ ...prev, recommendations: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Recommended actions or solutions"
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={submitReport}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Submit Report
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Report Detail Modal */}
      {showDetailModal && selectedReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-96 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {getTypeIcon(selectedReport.type || activeView)} Report Details
              </h3>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Title</label>
                  <p className="text-gray-900">{selectedReport.title || `${activeView} Report`}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Type</label>
                  <p className="text-gray-900">{selectedReport.type || activeView}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Priority</label>
                  <span className={`px-2 py-1 text-xs rounded-full font-medium ${getPriorityColor(selectedReport.priority || selectedReport.severity)}`}>
                    {selectedReport.priority || selectedReport.severity || 'Medium'}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Created</label>
                  <p className="text-gray-900">{formatDateTime(selectedReport.created_at || selectedReport.generated_at)}</p>
                </div>
              </div>

              {selectedReport.description && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <p className="text-gray-900 whitespace-pre-wrap">{selectedReport.description}</p>
                </div>
              )}

              {selectedReport.metrics && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">System Metrics</label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
                    {Object.entries(selectedReport.metrics).map(([key, value]) => (
                      <div key={key} className="p-3 bg-gray-50 rounded-lg text-center">
                        <div className="text-lg font-bold text-gray-900">
                          {key.includes('revenue') ? `$${value.toFixed(2)}` : value}
                        </div>
                        <div className="text-xs text-gray-600 capitalize">
                          {key.replace(/_/g, ' ')}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedReport.recommendations && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Recommendations</label>
                  <p className="text-gray-900 whitespace-pre-wrap">{selectedReport.recommendations}</p>
                </div>
              )}

              {selectedReport.affected_users && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Affected Users</label>
                  <p className="text-gray-900">{selectedReport.affected_users}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportsTab; 