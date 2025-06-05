import React, { useState, useEffect } from 'react';
import { AnalyticsAPI } from '../../api/analyticsApi.js';
import { 
  FileText, 
  Download, 
  Calendar, 
  Clock,
  CheckCircle,
  AlertCircle,
  Plus,
  Eye
} from 'lucide-react';

const ReportsTab = ({ dateRange, loading, setLoading }) => {
  const [reports, setReports] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [selectedReportType, setSelectedReportType] = useState('monthly_revenue');

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    setLoading(true);
    try {
      const result = await AnalyticsAPI.getReports(20);
      if (result.success) {
        setReports(result.data);
      }
    } catch (error) {
      console.error('Error loading reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateReport = async () => {
    setGenerating(true);
    try {
      const result = await AnalyticsAPI.generateReport(
        selectedReportType,
        dateRange.start,
        dateRange.end
      );
      
      if (result.success) {
        console.log('Report generated successfully');
        // Reload reports list
        await loadReports();
      }
    } catch (error) {
      console.error('Error generating report:', error);
    } finally {
      setGenerating(false);
    }
  };

  const handleExportData = async (type) => {
    try {
      const result = await AnalyticsAPI.exportToCSV(type, dateRange.start, dateRange.end);
      if (result.success) {
        console.log(`${type} data exported successfully`);
      }
    } catch (error) {
      console.error(`Error exporting ${type} data:`, error);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const reportTypes = [
    {
      id: 'monthly_revenue',
      name: 'Monthly Revenue Report',
      description: 'Comprehensive revenue analysis with payment methods and trends'
    },
    {
      id: 'user_growth',
      name: 'User Growth Report',
      description: 'User acquisition, retention, and demographic analysis'
    },
    {
      id: 'booking_summary',
      name: 'Booking Summary Report',
      description: 'Service utilization, booking patterns, and reader performance'
    },
    {
      id: 'quality_metrics',
      name: 'Quality Metrics Report',
      description: 'Customer satisfaction, ratings, and quality indicators'
    },
    {
      id: 'emergency_incidents',
      name: 'Emergency Incidents Report',
      description: 'Emergency call statistics, response times, and escalations'
    }
  ];

  const exportOptions = [
    {
      id: 'revenue',
      name: 'Revenue Data',
      description: 'Export revenue and transaction data'
    },
    {
      id: 'users',
      name: 'User Data',
      description: 'Export user growth and signup data'
    },
    {
      id: 'bookings',
      name: 'Booking Data',
      description: 'Export booking and service data'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Reports & Exports</h2>
        <p className="text-gray-600 mt-1">
          Generate comprehensive reports and export data for analysis
        </p>
      </div>

      {/* Report Generation Section */}
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Generate New Report</h3>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Report Type Selection */}
          <div className="lg:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Select Report Type
            </label>
            <div className="space-y-3">
              {reportTypes.map((type) => (
                <div
                  key={type.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedReportType === type.id
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedReportType(type.id)}
                >
                  <div className="flex items-center">
                    <input
                      type="radio"
                      name="reportType"
                      value={type.id}
                      checked={selectedReportType === type.id}
                      onChange={() => setSelectedReportType(type.id)}
                      className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300"
                    />
                    <div className="ml-3">
                      <h4 className="text-sm font-medium text-gray-900">{type.name}</h4>
                      <p className="text-sm text-gray-500">{type.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Generation Controls */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Report Period
            </label>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Start Date</label>
                <input
                  type="date"
                  value={dateRange.start}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                  readOnly
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">End Date</label>
                <input
                  type="date"
                  value={dateRange.end}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                  readOnly
                />
              </div>
              <button
                onClick={handleGenerateReport}
                disabled={generating}
                className="w-full flex items-center justify-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
              >
                {generating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Generating...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Generate Report
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Export Section */}
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Data Export</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {exportOptions.map((option) => (
            <div
              key={option.id}
              className="p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
            >
              <h4 className="font-medium text-gray-900 mb-2">{option.name}</h4>
              <p className="text-sm text-gray-500 mb-3">{option.description}</p>
              <button
                onClick={() => handleExportData(option.id)}
                className="flex items-center px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Reports History */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Report History</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Report Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Period
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Generated By
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {reports.map((report) => (
                <tr key={report.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <FileText className="h-5 w-5 text-gray-400 mr-3" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {reportTypes.find(t => t.id === report.report_type)?.name || report.report_type}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(report.report_period_start)} - {formatDate(report.report_period_end)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {report.generated_by 
                      ? `${report.generated_by.first_name} ${report.generated_by.last_name}`
                      : 'System'
                    }
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 text-gray-400 mr-2" />
                      {formatDate(report.created_at)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      report.status === 'generated' 
                        ? 'bg-green-100 text-green-800' 
                        : report.status === 'generating'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {report.status === 'generated' && <CheckCircle className="h-3 w-3 mr-1" />}
                      {report.status === 'generating' && <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-yellow-600 mr-1"></div>}
                      {report.status === 'failed' && <AlertCircle className="h-3 w-3 mr-1" />}
                      {report.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button className="text-purple-600 hover:text-purple-900 flex items-center">
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </button>
                      {report.file_url && (
                        <button className="text-green-600 hover:text-green-900 flex items-center">
                          <Download className="h-4 w-4 mr-1" />
                          Download
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {reports.length === 0 && (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No reports generated yet</h3>
            <p className="text-gray-500">Generate your first report using the form above.</p>
          </div>
        )}
      </div>

      {/* Report Templates Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">Report Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <h4 className="font-medium text-blue-900 mb-2">Available Formats</h4>
            <ul className="text-blue-800 space-y-1">
              <li>• PDF - Formatted reports with charts and tables</li>
              <li>• CSV - Raw data for further analysis</li>
              <li>• JSON - Structured data for API integration</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-blue-900 mb-2">Automated Reports</h4>
            <ul className="text-blue-800 space-y-1">
              <li>• Monthly revenue reports (auto-generated)</li>
              <li>• Weekly performance summaries</li>
              <li>• Emergency incident reports (real-time)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportsTab; 