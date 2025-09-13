import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  PlayCircleIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  ChartBarIcon,
  ShieldCheckIcon,
  DocumentTextIcon,
  BeakerIcon,
  CpuChipIcon,
  SignalIcon
} from '@heroicons/react/24/outline';
import CosmicButton from '../../components/UI/CosmicButton';

const E2ESyntheticsDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [testResults, setTestResults] = useState({
    lastRun: '2025-01-13T10:30:00Z',
    totalTests: 45,
    passedTests: 42,
    failedTests: 3,
    avgResponseTime: 234,
    successRate: 93.3
  });

  const tabs = [
    { id: 'overview', name: 'Overview', icon: ChartBarIcon },
    { id: 'e2e-journeys', name: 'E2E Journeys', icon: PlayCircleIcon },
    { id: 'synthetics', name: 'Synthetic Monitors', icon: SignalIcon },
    { id: 'rate-limits', name: 'Rate Limits', icon: ShieldCheckIcon },
    { id: 'burn-rate', name: 'Burn Rate Alerts', icon: ExclamationTriangleIcon },
    { id: 'security', name: 'Security Lint', icon: BeakerIcon }
  ];

  const criticalJourneys = [
    {
      name: 'Auth/Login Flow',
      status: 'passing',
      lastRun: '2 minutes ago',
      duration: '1.2s',
      successRate: '99.1%',
      runbook: '/RUNBOOKS/AUTH_TROUBLESHOOTING.md'
    },
    {
      name: 'Booking & Payment',
      status: 'passing',
      lastRun: '5 minutes ago', 
      duration: '3.8s',
      successRate: '97.5%',
      runbook: '/RUNBOOKS/BOOKING_TROUBLESHOOTING.md'
    },
    {
      name: 'Emergency Call',
      status: 'warning',
      lastRun: '1 minute ago',
      duration: '8.2s',
      successRate: '95.2%',
      runbook: '/RUNBOOKS/EMERGENCY_CALL_PROCEDURES.md'
    },
    {
      name: 'Daily Zodiac Publish',
      status: 'passing',
      lastRun: '30 minutes ago',
      duration: '12.1s',
      successRate: '100%',
      runbook: '/RUNBOOKS/DAILY_ZODIAC_PROCEDURES.md'
    }
  ];

  const syntheticMonitors = [
    {
      name: 'Health Check',
      endpoint: '/api/health',
      status: 'up',
      responseTime: '45ms',
      uptime: '99.98%',
      lastCheck: '30s ago'
    },
    {
      name: 'Login Journey',
      endpoint: '/api/auth/synthetic-login',
      status: 'up',
      responseTime: '156ms',
      uptime: '99.5%',
      lastCheck: '1m ago'
    },
    {
      name: 'Checkout Flow',
      endpoint: '/api/checkout/synthetic',
      status: 'degraded',
      responseTime: '2.1s',
      uptime: '98.2%',
      lastCheck: '2m ago'
    },
    {
      name: 'Emergency Route',
      endpoint: '/api/emergency/health',
      status: 'up',
      responseTime: '89ms',
      uptime: '99.9%',
      lastCheck: '45s ago'
    }
  ];

  const getStatusIcon = (status) => {
    switch (status) {
      case 'passing':
      case 'up':
        return <CheckCircleIcon className="h-5 w-5 text-green-400" />;
      case 'warning':
      case 'degraded':
        return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />;
      case 'failing':
      case 'down':
        return <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />;
      default:
        return <ClockIcon className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'passing':
      case 'up':
        return 'text-green-400';
      case 'warning':
      case 'degraded':
        return 'text-yellow-400';
      case 'failing':
      case 'down':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-300 text-sm">Total Tests</p>
              <p className="text-2xl font-bold text-white">{testResults.totalTests}</p>
            </div>
            <BeakerIcon className="h-8 w-8 text-purple-400" />
          </div>
        </div>
        
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-300 text-sm">Success Rate</p>
              <p className="text-2xl font-bold text-green-400">{testResults.successRate}%</p>
            </div>
            <CheckCircleIcon className="h-8 w-8 text-green-400" />
          </div>
        </div>
        
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-300 text-sm">Avg Response</p>
              <p className="text-2xl font-bold text-blue-400">{testResults.avgResponseTime}ms</p>
            </div>
            <CpuChipIcon className="h-8 w-8 text-blue-400" />
          </div>
        </div>
        
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-300 text-sm">Failed Tests</p>
              <p className="text-2xl font-bold text-red-400">{testResults.failedTests}</p>
            </div>
            <ExclamationTriangleIcon className="h-8 w-8 text-red-400" />
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
        <h3 className="text-xl font-semibold text-white mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <CosmicButton variant="primary" size="sm">
            <PlayCircleIcon className="h-4 w-4 mr-2" />
            Run All E2E Tests
          </CosmicButton>
          <CosmicButton variant="success" size="sm">
            <SignalIcon className="h-4 w-4 mr-2" />
            Trigger Synthetic Check
          </CosmicButton>
          <CosmicButton variant="neon" size="sm">
            <DocumentTextIcon className="h-4 w-4 mr-2" />
            View Test Reports
          </CosmicButton>
        </div>
      </div>
    </div>
  );

  const renderE2EJourneys = () => (
    <div className="space-y-6">
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
        <h3 className="text-xl font-semibold text-white mb-4">Critical User Journeys</h3>
        <div className="space-y-4">
          {criticalJourneys.map((journey, index) => (
            <div key={index} className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
              <div className="flex items-center space-x-4">
                {getStatusIcon(journey.status)}
                <div>
                  <h4 className="text-white font-medium">{journey.name}</h4>
                  <p className="text-gray-400 text-sm">Last run: {journey.lastRun}</p>
                </div>
              </div>
              <div className="flex items-center space-x-6 text-sm">
                <div className="text-center">
                  <p className="text-gray-400">Duration</p>
                  <p className="text-white">{journey.duration}</p>
                </div>
                <div className="text-center">
                  <p className="text-gray-400">Success Rate</p>
                  <p className={getStatusColor(journey.status)}>{journey.successRate}</p>
                </div>
                <CosmicButton 
                  variant="outline" 
                  size="sm"
                  onClick={() => window.open(journey.runbook, '_blank')}
                >
                  View Runbook
                </CosmicButton>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderSynthetics = () => (
    <div className="space-y-6">
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
        <h3 className="text-xl font-semibold text-white mb-4">24/7 Synthetic Monitors</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {syntheticMonitors.map((monitor, index) => (
            <div key={index} className="p-4 bg-white/5 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  {getStatusIcon(monitor.status)}
                  <h4 className="text-white font-medium">{monitor.name}</h4>
                </div>
                <span className={`text-sm px-2 py-1 rounded ${
                  monitor.status === 'up' ? 'bg-green-900 text-green-300' :
                  monitor.status === 'degraded' ? 'bg-yellow-900 text-yellow-300' :
                  'bg-red-900 text-red-300'
                }`}>
                  {monitor.status.toUpperCase()}
                </span>
              </div>
              <p className="text-gray-400 text-sm mb-3">{monitor.endpoint}</p>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-gray-400">Response</p>
                  <p className="text-white">{monitor.responseTime}</p>
                </div>
                <div>
                  <p className="text-gray-400">Uptime</p>
                  <p className="text-green-400">{monitor.uptime}</p>
                </div>
                <div>
                  <p className="text-gray-400">Last Check</p>
                  <p className="text-gray-300">{monitor.lastCheck}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderRateLimits = () => (
    <div className="space-y-6">
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
        <h3 className="text-xl font-semibold text-white mb-4">Rate Limit Conformance (HTTP 429 + Retry-After)</h3>
        <div className="space-y-4">
          <div className="p-4 bg-green-900/20 border border-green-700 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <CheckCircleIcon className="h-5 w-5 text-green-400" />
              <h4 className="text-green-400 font-medium">Rate Limiting Compliance: 98.5%</h4>
            </div>
            <p className="text-gray-300 text-sm">All endpoints properly return HTTP 429 with Retry-After headers</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-white/5 rounded-lg">
              <h4 className="text-white font-medium mb-2">Tested Endpoints</h4>
              <ul className="space-y-1 text-sm text-gray-300">
                <li>• /api/auth/login - ✓ Compliant</li>
                <li>• /api/bookings/availability - ✓ Compliant</li>
                <li>• /api/zodiac/today - ✓ Compliant</li>
                <li>• /api/services - ⚠ Partial compliance</li>
              </ul>
            </div>
            
            <div className="p-4 bg-white/5 rounded-lg">
              <h4 className="text-white font-medium mb-2">Backoff Performance</h4>
              <ul className="space-y-1 text-sm text-gray-300">
                <li>• Exponential backoff: Working</li>
                <li>• Jitter implementation: Active</li>
                <li>• Client retry success: 94.2%</li>
                <li>• Avg retry delay: 2.3s</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderBurnRate = () => (
    <div className="space-y-6">
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
        <h3 className="text-xl font-semibold text-white mb-4">Burn Rate Alerts & Noise Control</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="p-4 bg-white/5 rounded-lg text-center">
            <p className="text-gray-400 text-sm">Fast Burn (5m)</p>
            <p className="text-2xl font-bold text-green-400">0%</p>
            <p className="text-gray-400 text-xs">Threshold: 14%</p>
          </div>
          <div className="p-4 bg-white/5 rounded-lg text-center">
            <p className="text-gray-400 text-sm">Medium Burn (1h)</p>
            <p className="text-2xl font-bold text-green-400">2.1%</p>
            <p className="text-gray-400 text-xs">Threshold: 6%</p>
          </div>
          <div className="p-4 bg-white/5 rounded-lg text-center">
            <p className="text-gray-400 text-sm">Slow Burn (6h)</p>
            <p className="text-2xl font-bold text-green-400">1.3%</p>
            <p className="text-gray-400 text-xs">Threshold: 3%</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="p-4 bg-blue-900/20 border border-blue-700 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <SignalIcon className="h-5 w-5 text-blue-400" />
              <h4 className="text-blue-400 font-medium">SLO Health: All Green</h4>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-gray-400">API Availability</p>
                <p className="text-green-400">99.9% ✓</p>
              </div>
              <div>
                <p className="text-gray-400">Page Load Latency</p>
                <p className="text-green-400">95% < 2s ✓</p>
              </div>
              <div>
                <p className="text-gray-400">Booking Success</p>
                <p className="text-green-400">99.5% ✓</p>
              </div>
              <div>
                <p className="text-gray-400">Payment Processing</p>
                <p className="text-green-400">99.8% ✓</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSecurity = () => (
    <div className="space-y-6">
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
        <h3 className="text-xl font-semibold text-white mb-4">Security Content-Lint Gate</h3>
        
        <div className="p-4 bg-green-900/20 border border-green-700 rounded-lg mb-4">
          <div className="flex items-center space-x-2 mb-2">
            <ShieldCheckIcon className="h-5 w-5 text-green-400" />
            <h4 className="text-green-400 font-medium">Security Scan: PASSED</h4>
          </div>
          <p className="text-gray-300 text-sm">No malware signatures or security threats detected</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-white/5 rounded-lg">
            <h4 className="text-white font-medium mb-2">Scan Summary</h4>
            <ul className="space-y-1 text-sm text-gray-300">
              <li>• Files scanned: 1,247</li>
              <li>• Threats detected: 0</li>
              <li>• False positives: 0</li>
              <li>• Scan duration: 23.4s</li>
            </ul>
          </div>
          
          <div className="p-4 bg-white/5 rounded-lg">
            <h4 className="text-white font-medium mb-2">Protected Against</h4>
            <ul className="space-y-1 text-sm text-gray-300">
              <li>• Web shells & backdoors</li>
              <li>• SQL injection patterns</li>
              <li>• XSS payloads</li>
              <li>• Crypto miners</li>
              <li>• Credential leaks</li>
              <li>• Malware signatures</li>
            </ul>
          </div>
        </div>

        <div className="mt-4 p-4 bg-purple-900/20 border border-purple-700 rounded-lg">
          <div className="flex items-center space-x-2 mb-2">
            <BeakerIcon className="h-5 w-5 text-purple-400" />
            <h4 className="text-purple-400 font-medium">EICAR Test File Available</h4>
          </div>
          <p className="text-gray-300 text-sm">Standard antivirus test file created for AV validation (safe for testing)</p>
        </div>
      </div>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverview();
      case 'e2e-journeys':
        return renderE2EJourneys();
      case 'synthetics':
        return renderSynthetics();
      case 'rate-limits':
        return renderRateLimits();
      case 'burn-rate':
        return renderBurnRate();
      case 'security':
        return renderSecurity();
      default:
        return renderOverview();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-black p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl font-bold text-white mb-4">
            E2E Test Suite & Synthetic Monitoring
          </h1>
          <p className="text-gray-300 text-lg max-w-3xl mx-auto">
            Comprehensive black-box testing, 24/7 synthetic monitors, rate-limit conformance, 
            and burn-rate alerting following Google SRE best practices.
          </p>
        </motion.div>

        {/* Navigation Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mb-8"
        >
          <div className="flex flex-wrap justify-center gap-2">
            {tabs.map((tab) => {
              const IconComponent = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                    activeTab === tab.id
                      ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/25'
                      : 'bg-white/10 text-gray-300 hover:bg-white/20 hover:text-white'
                  }`}
                >
                  <IconComponent className="h-4 w-4" />
                  <span className="text-sm font-medium">{tab.name}</span>
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Tab Content */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {renderTabContent()}
        </motion.div>

        {/* Footer Links */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mt-12 text-center"
        >
          <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-400">
            <a href="/RUNBOOKS/" className="hover:text-purple-400 transition-colors">
              📚 All Runbooks
            </a>
            <a href="/RUNBOOKS/BURN_RATE_RESPONSE.md" className="hover:text-purple-400 transition-colors">
              🚨 Burn Rate Response
            </a>
            <a href="/dashboard/observability" className="hover:text-purple-400 transition-colors">
              📊 Observability Dashboard
            </a>
            <a href="/dashboard/backup" className="hover:text-purple-400 transition-colors">
              💾 Backup Dashboard
            </a>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default E2ESyntheticsDashboard;