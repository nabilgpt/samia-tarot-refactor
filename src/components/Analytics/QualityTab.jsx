import React, { useState, useEffect } from 'react';
import { AnalyticsAPI } from '../../api/analyticsApi.js';
import { 
  Star, 
  Clock, 
  AlertTriangle, 
  TrendingUp,
  Users,
  MessageSquare
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts';

const QualityTab = ({ dateRange, loading, setLoading }) => {
  const [qualityMetrics, setQualityMetrics] = useState({
    totalResponses: 0,
    avgRating: 0,
    byType: {}
  });
  const [readerPerformance, setReaderPerformance] = useState([]);

  useEffect(() => {
    loadQualityData();
  }, [dateRange]);

  const loadQualityData = async () => {
    setLoading(true);
    try {
      // Load quality metrics
      const qualityResult = await AnalyticsAPI.getQualityMetrics(dateRange.start, dateRange.end);
      if (qualityResult.success) {
        setQualityMetrics(qualityResult.data);
      }

      // Load reader performance
      const performanceResult = await AnalyticsAPI.getReaderPerformance(dateRange.start, dateRange.end);
      if (performanceResult.success) {
        setReaderPerformance(performanceResult.data);
      }

    } catch (error) {
      console.error('Error loading quality data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Prepare data for charts
  const ratingDistribution = [
    { rating: '5 Stars', count: 0 },
    { rating: '4 Stars', count: 0 },
    { rating: '3 Stars', count: 0 },
    { rating: '2 Stars', count: 0 },
    { rating: '1 Star', count: 0 }
  ];

  const surveyTypeData = Object.entries(qualityMetrics.byType || {}).map(([type, data]) => ({
    type: type.replace('_', ' '),
    avgRating: data.avgRating || 0,
    count: data.count || 0
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Quality & Performance</h2>
        <p className="text-gray-600 mt-1">
          Service quality metrics, reader performance, and customer satisfaction
        </p>
      </div>

      {/* Quality Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-yellow-100">
              <Star className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Average Rating</p>
              <p className="text-2xl font-bold text-gray-900">
                {qualityMetrics.avgRating?.toFixed(1) || 0}/5
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100">
              <MessageSquare className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Reviews</p>
              <p className="text-2xl font-bold text-gray-900">
                {qualityMetrics.totalResponses?.toLocaleString() || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Satisfaction Rate</p>
              <p className="text-2xl font-bold text-gray-900">
                {qualityMetrics.avgRating > 0 ? ((qualityMetrics.avgRating / 5) * 100).toFixed(1) : 0}%
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-purple-100">
              <Users className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Readers</p>
              <p className="text-2xl font-bold text-gray-900">
                {readerPerformance.length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Quality Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Rating Distribution */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Rating Distribution</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ratingDistribution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="rating" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#F59E0B" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Survey Types Performance */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Ratings by Survey Type</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={surveyTypeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="type" />
                <YAxis domain={[0, 5]} />
                <Tooltip />
                <Bar dataKey="avgRating" fill="#8B5CF6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Reader Performance Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Reader Performance Metrics</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Reader
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Avg Rating
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Reviews
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Bookings
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Revenue
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Emergency Response
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Performance
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {readerPerformance.slice(0, 15).map((reader) => {
                const rating = parseFloat(reader.avg_rating || 0);
                const revenue = parseFloat(reader.total_revenue || 0);
                const emergencyResponse = parseFloat(reader.avg_emergency_response || 0);
                
                // Calculate performance score (simplified)
                const performanceScore = (
                  (rating / 5) * 40 + // 40% weight for rating
                  (Math.min(reader.total_bookings / 50, 1)) * 30 + // 30% weight for bookings
                  (Math.min(reader.total_reviews / 20, 1)) * 20 + // 20% weight for reviews
                  (emergencyResponse > 0 ? Math.max(0, (300 - emergencyResponse) / 300) : 0.5) * 10 // 10% weight for emergency response
                ) * 100;
                
                return (
                  <tr key={reader.reader_id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-8 w-8">
                          <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center">
                            <span className="text-sm font-medium text-purple-600">
                              {reader.reader_name?.split(' ').map(n => n[0]).join('') || 'N/A'}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {reader.reader_name || 'Unknown Reader'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Star className="h-4 w-4 text-yellow-400 mr-1" />
                        <span className="text-sm text-gray-900">
                          {rating.toFixed(1)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {reader.total_reviews || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {reader.total_bookings || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${revenue.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {emergencyResponse > 0 ? `${emergencyResponse.toFixed(1)}s` : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                          <div 
                            className={`h-2 rounded-full ${
                              performanceScore >= 80 ? 'bg-green-500' :
                              performanceScore >= 60 ? 'bg-yellow-500' :
                              'bg-red-500'
                            }`}
                            style={{ width: `${Math.min(performanceScore, 100)}%` }}
                          ></div>
                        </div>
                        <span className="text-sm text-gray-900">
                          {performanceScore.toFixed(0)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quality Insights */}
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quality Insights</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <h4 className="font-medium text-green-900 mb-2">Top Performer</h4>
            <p className="text-sm text-green-800">
              {readerPerformance.length > 0 
                ? readerPerformance.reduce((max, reader) => 
                    (reader.avg_rating || 0) > (max.avg_rating || 0) ? reader : max, 
                    readerPerformance[0]
                  ).reader_name || 'N/A'
                : 'N/A'
              } has the highest average rating
            </p>
          </div>
          
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Service Quality</h4>
            <p className="text-sm text-blue-800">
              Overall satisfaction rate is {qualityMetrics.avgRating > 0 ? ((qualityMetrics.avgRating / 5) * 100).toFixed(1) : 0}% 
              based on {qualityMetrics.totalResponses} reviews
            </p>
          </div>
          
          <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
            <h4 className="font-medium text-purple-900 mb-2">Improvement Areas</h4>
            <p className="text-sm text-purple-800">
              {surveyTypeData.length > 0 
                ? `${surveyTypeData.reduce((min, type) => 
                    type.avgRating < min.avgRating ? type : min, 
                    surveyTypeData[0]
                  ).type} needs attention`
                : 'All areas performing well'
              }
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QualityTab; 