import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Server, 
  Database, 
  Zap, 
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  RefreshCw,
  Cpu,
  HardDrive,
  Wifi
} from 'lucide-react';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const PerformanceMonitoringDashboard = () => {
  const [systemHealth, setSystemHealth] = useState({
    database: { status: 'healthy', response_time: 0 },
    auth: { status: 'healthy', response_time: 0 },
    storage: { status: 'healthy', response_time: 0 },
    api: { status: 'healthy', response_time: 0 }
  });
  const [performanceMetrics, setPerformanceMetrics] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    loadPerformanceData();
    
    if (autoRefresh) {
      const interval = setInterval(loadPerformanceData, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const loadPerformanceData = async () => {
    setLoading(true);
    try {
      // Load system health
      const healthResponse = await fetch('/api/admin/system-health', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (healthResponse.ok) {
        const healthData = await healthResponse.json();
        setSystemHealth(healthData.data || {});
      }

      // Generate mock performance metrics for demonstration
      const mockMetrics = generateMockPerformanceData();
      setPerformanceMetrics(mockMetrics);

      // Generate mock alerts
      const mockAlerts = generateMockAlerts();
      setAlerts(mockAlerts);

      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error loading performance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateMockPerformanceData = () => {
    const now = new Date();
    const data = [];
    
    for (let i = 23; i >= 0; i--) {
      const time = new Date(now.getTime() - i * 60 * 60 * 1000);
      data.push({
        time: time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        apiResponseTime: Math.floor(Math.random() * 200) + 100,
        dbResponseTime: Math.floor(Math.random() * 100) + 50,
        activeUsers: Math.floor(Math.random() * 100) + 200,
        errorRate: Math.random() * 2,
        cpuUsage: Math.floor(Math.random() * 30) + 40,
        memoryUsage: Math.floor(Math.random() * 20) + 60
      });
    }
    
    return data;
  };

  const generateMockAlerts = () => {
    return [
      {
        id: 1,
        type: 'warning',
        message: 'High API response time detected',
        timestamp: new Date(Date.now() - 5 * 60 * 1000),
        resolved: false
      },
      {
        id: 2,
        type: 'info',
        message: 'Database maintenance completed',
        timestamp: new Date(Date.now() - 15 * 60 * 1000),
        resolved: true
      },
      {
        id: 3,
        type: 'error',
        message: 'Failed payment processor connection',
        timestamp: new Date(Date.now() - 30 * 60 * 1000),
        resolved: true
      }
    ];
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-100';
      case 'degraded': return 'text-yellow-600 bg-yellow-100';
      case 'down': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'healthy': return CheckCircle;
      case 'degraded': return AlertTriangle;
      case 'down': return AlertTriangle;
      default: return Activity;
    }
  };

  const getAlertIcon = (type) => {
    switch (type) {
      case 'error': return AlertTriangle;
      case 'warning': return AlertTriangle;
      case 'info': return CheckCircle;
      default: return Activity;
    }
  };

  const getAlertColor = (type) => {
    switch (type) {
      case 'error': return 'text-red-600 bg-red-100';
      case 'warning': return 'text-yellow-600 bg-yellow-100';
      case 'info': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const MetricCard = ({ title, value, unit, icon: Icon, trend = null, color = 'blue' }) => {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {value} <span className="text-sm font-normal text-gray-500">{unit}</span>
            </p>
            {trend && (
              <div className="flex items-center mt-2">
                <TrendingUp className={`h-4 w-4 mr-1 ${trend > 0 ? 'text-green-500' : 'text-red-500'}`} />
                <span className={`text-sm font-medium ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {Math.abs(trend).toFixed(1)}%
                </span>
              </div>
            )}
          </div>
          <div className={`p-3 rounded-full bg-${color}-100`}>
            <Icon className={`h-6 w-6 text-${color}-600`} />
          </div>
        </div>
      </div>
    );
  };

  if (loading && !performanceMetrics.length) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Performance Monitoring</h1>
            <p className="text-gray-600 mt-2">Real-time system performance and health monitoring</p>
          </div>
          
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`flex items-center px-4 py-2 rounded-lg border ${
                autoRefresh 
                  ? 'bg-green-50 border-green-200 text-green-700' 
                  : 'bg-gray-50 border-gray-200 text-gray-700'
              }`}
            >
              <Activity className="w-4 h-4 mr-2" />
              Auto Refresh {autoRefresh ? 'ON' : 'OFF'}
            </button>
            
            <button
              onClick={loadPerformanceData}
              disabled={loading}
              className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* System Health Status */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {Object.entries(systemHealth).map(([service, health]) => {
            const StatusIcon = getStatusIcon(health.status);
            return (
              <div key={service} className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 capitalize">{service}</p>
                    <div className="flex items-center mt-2">
                      <StatusIcon className={`h-5 w-5 mr-2 ${getStatusColor(health.status).split(' ')[0]}`} />
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(health.status)}`}>
                        {health.status || 'Unknown'}
                      </span>
                    </div>
                    {health.response_time !== undefined && (
                      <p className="text-xs text-gray-500 mt-1">
                        Response: {health.response_time}ms
                      </p>
                    )}
                  </div>
                  <div className="p-3 bg-gray-100 rounded-full">
                    <Server className="h-6 w-6 text-gray-600" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Performance Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricCard
            title="Avg API Response"
            value={performanceMetrics.length ? Math.round(performanceMetrics[performanceMetrics.length - 1]?.apiResponseTime) : 0}
            unit="ms"
            icon={Zap}
            trend={-2.1}
            color="blue"
          />
          
          <MetricCard
            title="Active Users"
            value={performanceMetrics.length ? performanceMetrics[performanceMetrics.length - 1]?.activeUsers : 0}
            unit=""
            icon={Activity}
            trend={5.3}
            color="green"
          />
          
          <MetricCard
            title="Error Rate"
            value={performanceMetrics.length ? performanceMetrics[performanceMetrics.length - 1]?.errorRate.toFixed(2) : 0}
            unit="%"
            icon={AlertTriangle}
            trend={-1.2}
            color="red"
          />
          
          <MetricCard
            title="CPU Usage"
            value={performanceMetrics.length ? performanceMetrics[performanceMetrics.length - 1]?.cpuUsage : 0}
            unit="%"
            icon={Cpu}
            trend={0.8}
            color="purple"
          />
        </div>

        {/* Performance Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Response Time Chart */}
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Response Time Trends</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={performanceMetrics}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="apiResponseTime" 
                  stroke="#8B5CF6" 
                  name="API Response (ms)"
                  strokeWidth={2}
                />
                <Line 
                  type="monotone" 
                  dataKey="dbResponseTime" 
                  stroke="#06B6D4" 
                  name="Database Response (ms)"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* System Resources Chart */}
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">System Resources</h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={performanceMetrics}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip />
                <Area 
                  type="monotone" 
                  dataKey="cpuUsage" 
                  stackId="1" 
                  stroke="#F59E0B" 
                  fill="#F59E0B" 
                  name="CPU Usage (%)"
                />
                <Area 
                  type="monotone" 
                  dataKey="memoryUsage" 
                  stackId="1" 
                  stroke="#10B981" 
                  fill="#10B981" 
                  name="Memory Usage (%)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Alerts */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Recent Alerts</h3>
            {lastUpdated && (
              <p className="text-sm text-gray-500">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </p>
            )}
          </div>
          
          <div className="space-y-3">
            {alerts.map((alert) => {
              const AlertIcon = getAlertIcon(alert.type);
              return (
                <div key={alert.id} className="flex items-start p-4 border border-gray-200 rounded-lg">
                  <div className={`p-2 rounded-full mr-3 ${getAlertColor(alert.type)}`}>
                    <AlertIcon className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{alert.message}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {alert.timestamp.toLocaleString()}
                    </p>
                  </div>
                  {alert.resolved && (
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                      Resolved
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PerformanceMonitoringDashboard; 