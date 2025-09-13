import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import CosmicButton from '../../components/UI/CosmicButton';
import { 
  ChartBarIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  SignalIcon,
  EyeIcon,
  CogIcon,
  HeartIcon
} from '@heroicons/react/24/outline';

const ObservabilityDashboard = () => {
  const [activeTab, setActiveTab] = useState('golden-signals');
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // In production, this would fetch real data from the observability services
    const mockData = {
      golden_signals: {
        auth: {
          latency_p95: 245.5,
          error_rate: 0.2,
          requests_per_second: 12.4,
          cpu_utilization: 45.2
        },
        booking: {
          latency_p95: 850.2,
          error_rate: 0.8,
          requests_per_second: 3.2,
          cpu_utilization: 32.1
        },
        payment: {
          latency_p95: 1250.0,
          error_rate: 0.1,
          requests_per_second: 1.8,
          cpu_utilization: 28.5
        },
        emergency: {
          latency_p95: 45.2,
          error_rate: 0.0,
          requests_per_second: 0.1,
          cpu_utilization: 15.2
        }
      },
      slo_compliance: {
        auth: { completion_rate: { compliant: true, actual: 99.8 }, duration_p95: { compliant: true, actual: 245 } },
        booking: { completion_rate: { compliant: true, actual: 86.5 }, duration_p95: { compliant: true, actual: 850 } },
        payment: { completion_rate: { compliant: true, actual: 99.2 }, duration_p95: { compliant: true, actual: 1250 } },
        emergency: { completion_rate: { compliant: true, actual: 100.0 }, duration_p95: { compliant: true, actual: 45 } }
      },
      synthetic_probes: [
        { name: 'homepage_health', status: 'success', response_time_ms: 120, last_check: '2025-01-13T07:05:00Z' },
        { name: 'api_health', status: 'success', response_time_ms: 85, last_check: '2025-01-13T07:05:00Z' },
        { name: 'emergency_endpoint', status: 'success', response_time_ms: 25, last_check: '2025-01-13T07:05:00Z' },
        { name: 'login_journey', status: 'failure', response_time_ms: 0, error_message: 'Timeout', last_check: '2025-01-13T07:03:00Z' }
      ],
      active_alerts: [
        {
          service: 'booking',
          metric: 'error_rate',
          severity: 'warning',
          message: 'Booking error rate increased to 0.8%',
          fired_at: '2025-01-13T06:55:00Z',
          runbook_url: '/RUNBOOKS/INCIDENT_RESPONSE.md#booking-problems'
        }
      ]
    };

    setDashboardData(mockData);
    setLoading(false);
  }, []);

  const observabilityTabs = [
    {
      id: 'golden-signals',
      name: 'Golden Signals',
      icon: ChartBarIcon,
      description: 'Latency, Traffic, Errors, Saturation'
    },
    {
      id: 'slo-compliance',
      name: 'SLO Compliance',
      icon: SignalIcon,
      description: 'Service Level Objectives tracking'
    },
    {
      id: 'synthetic-probes',
      name: 'Synthetic Probes',
      icon: EyeIcon,
      description: 'Automated health checks and user journeys'
    },
    {
      id: 'burn-rate-alerts',
      name: 'Burn Rate Alerts',
      icon: ExclamationTriangleIcon,
      description: 'Multi-window error budget monitoring'
    },
    {
      id: 'journey-monitoring',
      name: 'User Journeys',
      icon: ClockIcon,
      description: 'Critical user flow monitoring'
    }
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case 'success': return 'text-green-400';
      case 'failure': return 'text-red-400';
      case 'timeout': return 'text-yellow-400';
      default: return 'text-gray-400';
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return 'border-red-500 bg-red-500/10';
      case 'warning': return 'border-yellow-500 bg-yellow-500/10';
      default: return 'border-blue-500 bg-blue-500/10';
    }
  };

  const openRunbook = (url) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-black flex items-center justify-center">
        <div className="text-center">
          <div className="relative mb-6">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-400"></div>
            <div className="absolute inset-0 rounded-full border-2 border-purple-400/20"></div>
          </div>
          <p className="text-gray-300 text-lg font-medium">Loading observability data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-black p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <div className="flex items-center justify-center mb-4">
              <ChartBarIcon className="h-8 w-8 text-purple-400 mr-3" />
              <h1 className="text-4xl font-bold text-white">
                Observability Dashboard
              </h1>
            </div>
            <p className="text-gray-300 text-lg max-w-3xl mx-auto">
              Google SRE Golden Signals monitoring with SLOs, burn-rate alerts, and synthetic probes
            </p>
          </motion.div>
        </div>

        {/* Active Alerts Banner */}
        {dashboardData?.active_alerts?.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mb-8"
          >
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mr-3" />
                  <div>
                    <p className="text-red-300 font-semibold">Active Alerts ({dashboardData.active_alerts.length})</p>
                    <p className="text-red-400 text-sm">
                      {dashboardData.active_alerts[0].message}
                    </p>
                  </div>
                </div>
                <CosmicButton
                  variant="danger"
                  size="sm"
                  onClick={() => openRunbook(dashboardData.active_alerts[0].runbook_url)}
                >
                  View Runbook
                </CosmicButton>
              </div>
            </div>
          </motion.div>
        )}

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mb-8"
        >
          <div className="flex flex-wrap gap-2 mb-6">
            {observabilityTabs.map((tab, index) => {
              const IconComponent = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <motion.button
                  key={tab.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.1 * index }}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center px-4 py-3 rounded-lg transition-all duration-300
                    ${isActive 
                      ? 'bg-purple-600 text-white shadow-lg' 
                      : 'bg-white/10 text-gray-300 hover:bg-white/20 hover:text-white'
                    }
                  `}
                >
                  <IconComponent className="h-5 w-5 mr-2" />
                  <div className="text-left">
                    <div className="font-semibold text-sm">{tab.name}</div>
                    <div className="text-xs opacity-75">{tab.description}</div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </motion.div>

        {/* Tab Content */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          {activeTab === 'golden-signals' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {Object.entries(dashboardData.golden_signals).map(([service, metrics]) => (
                <div key={service} className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
                  <h3 className="text-xl font-semibold text-white mb-4 capitalize">{service}</h3>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-300 text-sm">Latency p95</span>
                      <span className="text-white font-semibold">{metrics.latency_p95.toFixed(1)}ms</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-gray-300 text-sm">Error Rate</span>
                      <span className={`font-semibold ${metrics.error_rate > 1 ? 'text-red-400' : 'text-green-400'}`}>
                        {metrics.error_rate.toFixed(2)}%
                      </span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-gray-300 text-sm">RPS</span>
                      <span className="text-white font-semibold">{metrics.requests_per_second.toFixed(1)}</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-gray-300 text-sm">CPU</span>
                      <span className={`font-semibold ${metrics.cpu_utilization > 80 ? 'text-red-400' : 'text-blue-400'}`}>
                        {metrics.cpu_utilization.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'slo-compliance' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {Object.entries(dashboardData.slo_compliance).map(([service, slo]) => (
                <div key={service} className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
                  <h3 className="text-xl font-semibold text-white mb-4 capitalize">{service} SLO</h3>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-300">Completion Rate</span>
                      <div className="flex items-center">
                        <span className="text-white font-semibold mr-2">{slo.completion_rate.actual}%</span>
                        <div className={`w-3 h-3 rounded-full ${slo.completion_rate.compliant ? 'bg-green-400' : 'bg-red-400'}`}></div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-gray-300">Response Time p95</span>
                      <div className="flex items-center">
                        <span className="text-white font-semibold mr-2">{slo.duration_p95.actual}ms</span>
                        <div className={`w-3 h-3 rounded-full ${slo.duration_p95.compliant ? 'bg-green-400' : 'bg-red-400'}`}></div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'synthetic-probes' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {dashboardData.synthetic_probes.map((probe, index) => (
                <motion.div
                  key={probe.name}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.1 * index }}
                  className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white">{probe.name}</h3>
                    <div className={`w-3 h-3 rounded-full ${probe.status === 'success' ? 'bg-green-400' : 'bg-red-400'}`}></div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-300 text-sm">Status</span>
                      <span className={`font-semibold capitalize ${getStatusColor(probe.status)}`}>
                        {probe.status}
                      </span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-gray-300 text-sm">Response Time</span>
                      <span className="text-white font-semibold">{probe.response_time_ms}ms</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-gray-300 text-sm">Last Check</span>
                      <span className="text-gray-400 text-xs">
                        {new Date(probe.last_check).toLocaleTimeString()}
                      </span>
                    </div>
                    
                    {probe.error_message && (
                      <div className="mt-3 p-2 bg-red-500/10 border border-red-500/20 rounded text-red-400 text-xs">
                        {probe.error_message}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {activeTab === 'burn-rate-alerts' && (
            <div className="text-center py-12">
              <ExclamationTriangleIcon className="h-16 w-16 text-gray-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">Burn Rate Monitoring</h3>
              <p className="text-gray-400 mb-6">Multi-window error budget consumption tracking</p>
              <CosmicButton variant="outline" onClick={() => console.log('Coming soon')}>
                View Burn Rate Dashboard
              </CosmicButton>
            </div>
          )}

          {activeTab === 'journey-monitoring' && (
            <div className="text-center py-12">
              <ClockIcon className="h-16 w-16 text-gray-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">User Journey Monitoring</h3>
              <p className="text-gray-400 mb-6">Critical user flow completion tracking</p>
              <CosmicButton variant="outline" onClick={() => console.log('Coming soon')}>
                View Journey Dashboard
              </CosmicButton>
            </div>
          )}
        </motion.div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mt-12 text-center"
        >
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
            <div className="flex items-center justify-center mb-4">
              <HeartIcon className="h-5 w-5 text-red-400 mr-2" />
              <span className="text-white font-semibold">System Health</span>
            </div>
            <p className="text-gray-300 text-sm">
              All critical services operational. M32 on-call escalation active.
              For incidents, see <span className="text-purple-400 cursor-pointer" onClick={() => openRunbook('/RUNBOOKS/INCIDENT_RESPONSE.md')}>Incident Response Runbook</span>.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default ObservabilityDashboard;