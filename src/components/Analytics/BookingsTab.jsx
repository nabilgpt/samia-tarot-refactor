import React, { useState, useEffect } from 'react';
import { AnalyticsAPI } from '../../api/analyticsApi.js';
import { 
  Calendar, 
  Clock, 
  AlertTriangle, 
  Download, 
  CheckCircle,
  XCircle,
  Users
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

const BookingsTab = ({ dateRange, loading, setLoading }) => {
  const [bookingStats, setBookingStats] = useState({
    totalBookings: 0,
    avgProcessingTime: 0,
    byStatus: {},
    byService: {}
  });
  const [emergencyStats, setEmergencyStats] = useState({
    totalCalls: 0,
    totalEscalated: 0,
    avgResponseTime: 0,
    escalationRate: 0,
    byStatus: {}
  });
  const [bookingsByReader, setBookingsByReader] = useState([]);
  const [filters, setFilters] = useState({
    serviceType: '',
    status: ''
  });

  useEffect(() => {
    loadBookingData();
  }, [dateRange, filters]);

  const loadBookingData = async () => {
    setLoading(true);
    try {
      // Load booking stats
      const bookingResult = await AnalyticsAPI.getBookingStats(dateRange.start, dateRange.end, filters);
      if (bookingResult.success) {
        setBookingStats(bookingResult.data);
      }

      // Load emergency stats
      const emergencyResult = await AnalyticsAPI.getEmergencyStats(dateRange.start, dateRange.end);
      if (emergencyResult.success) {
        setEmergencyStats(emergencyResult.data);
      }

      // Load bookings by reader
      const readerResult = await AnalyticsAPI.getBookingsByReader(dateRange.start, dateRange.end);
      if (readerResult.success) {
        setBookingsByReader(readerResult.data);
      }

    } catch (error) {
      console.error('Error loading booking data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      const result = await AnalyticsAPI.exportToCSV('bookings', dateRange.start, dateRange.end, filters);
      if (result.success) {
        console.log('Booking data exported successfully');
      }
    } catch (error) {
      console.error('Error exporting booking data:', error);
    }
  };

  // Colors for charts
  const COLORS = ['#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#3B82F6'];

  // Prepare data for charts
  const statusData = Object.entries(bookingStats.byStatus || {}).map(([status, count]) => ({
    status,
    count
  }));

  const serviceData = Object.entries(bookingStats.byService || {}).map(([service, count]) => ({
    service,
    count
  }));

  const emergencyStatusData = Object.entries(emergencyStats.byStatus || {}).map(([status, count]) => ({
    status,
    count
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Bookings & Services</h2>
          <p className="text-gray-600 mt-1">
            Service utilization, booking patterns, and emergency call analytics
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          {/* Filters */}
          <select
            value={filters.serviceType}
            onChange={(e) => setFilters(prev => ({ ...prev, serviceType: e.target.value }))}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
          >
            <option value="">All Services</option>
            <option value="tarot">Tarot Reading</option>
            <option value="coffee">Coffee Reading</option>
            <option value="palm">Palm Reading</option>
            <option value="dream">Dream Interpretation</option>
            <option value="call">Video Call</option>
          </select>

          <select
            value={filters.status}
            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <button
            onClick={handleExportCSV}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Booking Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-purple-100">
              <Calendar className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Bookings</p>
              <p className="text-2xl font-bold text-gray-900">
                {bookingStats.totalBookings?.toLocaleString() || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100">
              <Clock className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Avg Processing Time</p>
              <p className="text-2xl font-bold text-gray-900">
                {bookingStats.avgProcessingTime?.toFixed(1) || 0}h
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-red-100">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Emergency Calls</p>
              <p className="text-2xl font-bold text-gray-900">
                {emergencyStats.totalCalls?.toLocaleString() || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-yellow-100">
              <Users className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Escalation Rate</p>
              <p className="text-2xl font-bold text-gray-900">
                {emergencyStats.escalationRate?.toFixed(1) || 0}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Booking Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bookings by Status */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Bookings by Status</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                  label={({ status, count }) => `${status}: ${count}`}
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bookings by Service Type */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Bookings by Service</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={serviceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="service" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#8B5CF6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Emergency Call Analytics */}
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Emergency Call Statistics</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center p-4 bg-red-50 rounded-lg">
            <p className="text-2xl font-bold text-red-600">{emergencyStats.totalCalls}</p>
            <p className="text-sm text-red-800">Total Emergency Calls</p>
          </div>
          <div className="text-center p-4 bg-orange-50 rounded-lg">
            <p className="text-2xl font-bold text-orange-600">{emergencyStats.totalEscalated}</p>
            <p className="text-sm text-orange-800">Escalated Calls</p>
          </div>
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <p className="text-2xl font-bold text-blue-600">{emergencyStats.avgResponseTime?.toFixed(1) || 0}s</p>
            <p className="text-sm text-blue-800">Avg Response Time</p>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <p className="text-2xl font-bold text-green-600">{(100 - emergencyStats.escalationRate).toFixed(1)}%</p>
            <p className="text-sm text-green-800">Success Rate</p>
          </div>
        </div>
        
        {/* Emergency Status Chart */}
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={emergencyStatusData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="status" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#EF4444" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Readers by Bookings */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Top Readers by Bookings</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Reader
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Bookings
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Completed
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cancelled
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Success Rate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Top Service
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {bookingsByReader.slice(0, 10).map((reader, index) => {
                const successRate = reader.totalBookings > 0 
                  ? (reader.completedBookings / reader.totalBookings * 100).toFixed(1)
                  : 0;
                const topService = Object.entries(reader.services || {})
                  .sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A';
                
                return (
                  <tr key={reader.readerId}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-8 w-8">
                          <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center">
                            <span className="text-sm font-medium text-purple-600">
                              {reader.readerName.split(' ').map(n => n[0]).join('')}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {reader.readerName}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {reader.totalBookings}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {reader.completedBookings}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {reader.cancelledBookings}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        parseFloat(successRate) >= 80 
                          ? 'bg-green-100 text-green-800' 
                          : parseFloat(successRate) >= 60
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {successRate}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 capitalize">
                      {topService}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default BookingsTab; 