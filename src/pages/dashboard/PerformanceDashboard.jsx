/**
 * M36 — Performance Dashboard
 * Core Web Vitals monitoring and optimization dashboard
 */

import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { Activity, Zap, Layout, Clock, TrendingUp, AlertTriangle, CheckCircle, Eye, Settings } from 'lucide-react';
import { usePerformance } from '../../components/Performance/PerformanceProvider';

const PerformanceDashboard = () => {
  const { metrics } = usePerformance();
  const [activeTab, setActiveTab] = useState('overview');
  const [cwvData, setCwvData] = useState(null);
  const [lighthouseData, setLighthouseData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPerformanceData();
  }, []);

  const loadPerformanceData = async () => {
    setLoading(true);
    try {
      // Load CWV synthetic data
      const cwvResponse = await fetch('/api/performance/cwv-results');
      if (cwvResponse.ok) {
        const cwv = await cwvResponse.json();
        setCwvData(cwv);
      }

      // Load Lighthouse data
      const lighthouseResponse = await fetch('/api/performance/lighthouse-results');
      if (lighthouseResponse.ok) {
        const lighthouse = await lighthouseResponse.json();
        setLighthouseData(lighthouse);
      }
    } catch (error) {
      console.error('Failed to load performance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'cwv', label: 'Core Web Vitals', icon: Zap },
    { id: 'lighthouse', label: 'Lighthouse Reports', icon: Eye },
    { id: 'synthetics', label: 'Synthetic Monitoring', icon: TrendingUp },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  const renderCWVStatus = (metric, value, target) => {
    const isGood = value <= target;
    const isNeedsImprovement = value <= target * 2;
    
    return (
      <div className={`flex items-center space-x-2 ${
        isGood ? 'text-green-400' : isNeedsImprovement ? 'text-yellow-400' : 'text-red-400'
      }`}>
        {isGood ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
        <span className="font-mono">{value}</span>
      </div>
    );
  };

  const CWVTargets = {
    LCP: 2500,
    INP: 200,
    CLS: 0.1,
    FCP: 1800,
    TTFB: 800
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-cosmic-gradient p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-cosmic-card border border-cosmic-border rounded-lg p-8 animate-pulse">
            <div className="h-8 bg-cosmic-border rounded w-64 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-32 bg-cosmic-border rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cosmic-gradient p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-cosmic-card border border-cosmic-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center space-x-3">
                <Activity className="text-cosmic-primary" />
                <span>M36 Performance Dashboard</span>
              </h1>
              <p className="text-cosmic-text mt-2">
                Core Web Vitals monitoring and optimization dashboard
              </p>
            </div>
            <button
              onClick={loadPerformanceData}
              className="px-4 py-2 bg-cosmic-primary hover:bg-cosmic-primary-dark rounded-lg text-white transition-colors"
            >
              Refresh Data
            </button>
          </div>

          {/* Tabs */}
          <div className="flex space-x-1 bg-cosmic-dark rounded-lg p-1">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${
                    activeTab === tab.id
                      ? 'bg-cosmic-primary text-white'
                      : 'text-cosmic-text hover:text-white hover:bg-cosmic-border'
                  }`}
                >
                  <Icon size={16} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Current Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {Object.entries(CWVTargets).map(([metric, target]) => {
                const currentValue = metrics[metric]?.value || 0;
                const isGood = currentValue <= target;
                
                return (
                  <div key={metric} className="bg-cosmic-card border border-cosmic-border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-cosmic-text text-sm">{metric}</span>
                      {isGood ? (
                        <CheckCircle size={16} className="text-green-400" />
                      ) : (
                        <AlertTriangle size={16} className="text-red-400" />
                      )}
                    </div>
                    <div className="text-2xl font-bold text-white">
                      {metric === 'CLS' 
                        ? currentValue.toFixed(3)
                        : metric === 'TTFB' || metric === 'LCP' || metric === 'INP' || metric === 'FCP'
                        ? `${Math.round(currentValue)}ms`
                        : currentValue
                      }
                    </div>
                    <div className="text-xs text-cosmic-text">
                      Target: {metric === 'CLS' ? target : `${target}ms`}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Performance Score */}
            {lighthouseData && (
              <div className="bg-cosmic-card border border-cosmic-border rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Latest Lighthouse Scores</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {['Performance', 'Accessibility', 'Best Practices', 'SEO'].map(category => {
                    const score = lighthouseData.scores?.[category.toLowerCase().replace(' ', '_')] || 0;
                    return (
                      <div key={category} className="text-center">
                        <div className={`text-3xl font-bold mb-2 ${
                          score >= 90 ? 'text-green-400' :
                          score >= 50 ? 'text-yellow-400' : 'text-red-400'
                        }`}>
                          {Math.round(score)}
                        </div>
                        <div className="text-cosmic-text text-sm">{category}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Core Web Vitals Tab */}
        {activeTab === 'cwv' && (
          <div className="space-y-6">
            {/* CWV Compliance Status */}
            <div className="bg-cosmic-card border border-cosmic-border rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Core Web Vitals Compliance</h3>
              
              {cwvData?.reports ? (
                <div className="space-y-4">
                  {Object.entries(cwvData.reports).map(([path, report]) => (
                    <div key={path} className="border border-cosmic-border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-white">{report.url}</h4>
                        <div className="text-sm text-cosmic-text">
                          RUM Alignment: {(report.rum_alignment_score * 100).toFixed(0)}%
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                        <div className="flex items-center justify-between">
                          <span className="text-cosmic-text">LCP (p75)</span>
                          {renderCWVStatus('LCP', `${Math.round(report.metrics.lcp?.p75 || 0)}ms`, CWVTargets.LCP)}
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-cosmic-text">INP (p75)</span>
                          {renderCWVStatus('INP', `${Math.round(report.metrics.inp?.p75 || 0)}ms`, CWVTargets.INP)}
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-cosmic-text">CLS (p75)</span>
                          {renderCWVStatus('CLS', (report.metrics.cls?.p75 || 0).toFixed(3), CWVTargets.CLS)}
                        </div>
                      </div>
                      
                      {report.recommendations && report.recommendations.length > 0 && (
                        <div className="mt-3 p-3 bg-cosmic-dark rounded-md">
                          <h5 className="text-sm font-medium text-cosmic-primary mb-2">Recommendations:</h5>
                          <ul className="text-sm text-cosmic-text space-y-1">
                            {report.recommendations.map((rec, index) => (
                              <li key={index} className="flex items-start space-x-2">
                                <span className="text-cosmic-primary">•</span>
                                <span>{rec}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-cosmic-text">No CWV data available</div>
                  <button
                    onClick={() => {/* Trigger CWV monitoring */}}
                    className="mt-4 px-4 py-2 bg-cosmic-primary hover:bg-cosmic-primary-dark rounded-lg text-white transition-colors"
                  >
                    Run CWV Monitoring
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Lighthouse Reports Tab */}
        {activeTab === 'lighthouse' && (
          <div className="space-y-6">
            <div className="bg-cosmic-card border border-cosmic-border rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Lighthouse Reports</h3>
                <div className="flex space-x-2">
                  <a
                    href="/lighthouse-results"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-cosmic-border hover:bg-cosmic-primary-dark rounded-lg text-white transition-colors"
                  >
                    View Raw Reports
                  </a>
                  <a
                    href="/performance-reports"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-cosmic-primary hover:bg-cosmic-primary-dark rounded-lg text-white transition-colors"
                  >
                    View HTML Reports
                  </a>
                </div>
              </div>
              
              <div className="text-cosmic-text">
                <p>Lighthouse runs 5 times per build and stores median results.</p>
                <p>Performance budgets are enforced in CI/CD pipeline.</p>
              </div>
            </div>
          </div>
        )}

        {/* Synthetic Monitoring Tab */}
        {activeTab === 'synthetics' && (
          <div className="space-y-6">
            <div className="bg-cosmic-card border border-cosmic-border rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-4">24/7 Synthetic Monitoring</h3>
              <div className="text-cosmic-text space-y-4">
                <p>Continuous monitoring of Core Web Vitals across all critical user journeys:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Home page (critical for LCP)</li>
                  <li>Login flow (critical for INP)</li>
                  <li>Booking flow (critical for all metrics)</li>
                  <li>Dashboard (heavy components, critical for CLS)</li>
                  <li>Chat interface (real-time, critical for INP)</li>
                  <li>Daily horoscope (content page, critical for LCP/CLS)</li>
                </ul>
                
                <div className="mt-6 p-4 bg-cosmic-dark rounded-lg">
                  <h4 className="font-medium text-white mb-2">Monitoring Status</h4>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                    <span className="text-green-400">Active - Next run in 15 minutes</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            <div className="bg-cosmic-card border border-cosmic-border rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Performance Settings</h3>
              
              <div className="space-y-6">
                <div>
                  <h4 className="font-medium text-white mb-2">Core Web Vitals Targets</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(CWVTargets).map(([metric, target]) => (
                      <div key={metric} className="flex items-center justify-between p-3 bg-cosmic-dark rounded-lg">
                        <span className="text-cosmic-text">{metric}</span>
                        <span className="text-white font-mono">
                          ≤ {metric === 'CLS' ? target : `${target}ms`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium text-white mb-2">Monitoring Configuration</h4>
                  <div className="space-y-2 text-cosmic-text">
                    <p>• Lighthouse CI: 5 runs per build, median results</p>
                    <p>• Synthetic monitoring: Every 15 minutes</p>
                    <p>• Performance budgets: Enforced in CI/CD</p>
                    <p>• RUM data collection: Active</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PerformanceDashboard;