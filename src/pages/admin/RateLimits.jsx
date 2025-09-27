import React, { useState, useEffect } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Shield, Activity, RefreshCw, AlertCircle } from 'lucide-react';

const RateLimits = () => {
  const [limits, setLimits] = useState([]);
  const [loading, setLoading] = useState(true);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    loadLimits();
  }, []);

  const loadLimits = () => {
    const mockLimits = [
      { endpoint: '/api/orders', limit: 100, window: '1h', current: 45, status: 'healthy' },
      { endpoint: '/api/payments/intent', limit: 50, window: '1h', current: 12, status: 'healthy' },
      { endpoint: '/api/auth/login', limit: 10, window: '15m', current: 3, status: 'healthy' },
      { endpoint: '/api/horoscopes/daily', limit: 1000, window: '1h', current: 823, status: 'warning' },
      { endpoint: '/api/verify/phone', limit: 5, window: '1h', current: 2, status: 'healthy' }
    ];
    setLimits(mockLimits);
    setLoading(false);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'healthy': return 'text-green-400 bg-green-500/10 border-green-500/20';
      case 'warning': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
      case 'critical': return 'text-red-400 bg-red-500/10 border-red-500/20';
      default: return 'text-theme-secondary bg-theme-card border-theme-cosmic';
    }
  };

  const itemVariants = {
    hidden: shouldReduceMotion ? { opacity: 0 } : { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: shouldReduceMotion ? { duration: 0.2 } : {
        type: "spring",
        stiffness: 100,
        damping: 12
      }
    }
  };

  return (
    <div className="min-h-screen py-20 px-4">
      <div className="container mx-auto max-w-7xl">

        <motion.div
          variants={itemVariants}
          initial="hidden"
          animate="visible"
          className="flex flex-col lg:flex-row lg:justify-between lg:items-center mb-12"
        >
          <div>
            <h1 className="fluid-heading-xl font-bold gradient-text mb-4">
              Rate Limits
            </h1>
            <div className="w-32 h-1 bg-cosmic-gradient mb-6 rounded-full shadow-theme-cosmic" />
            <p className="text-theme-secondary text-lg">
              API rate limiting and throttling controls
            </p>
          </div>

          <button
            onClick={loadLimits}
            disabled={loading}
            className="btn-base btn-secondary inline-flex items-center mt-6 lg:mt-0"
          >
            <RefreshCw className={`w-5 h-5 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </motion.div>

        <motion.div
          variants={itemVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8"
        >
          <div className="card-base bg-theme-card backdrop-blur-lg border border-theme-cosmic rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <Shield className="w-8 h-8 text-green-400" />
            </div>
            <div className="text-3xl font-bold text-green-400 mb-2">
              {limits.filter(l => l.status === 'healthy').length}
            </div>
            <p className="text-theme-secondary text-sm">Healthy Endpoints</p>
          </div>

          <div className="card-base bg-theme-card backdrop-blur-lg border border-theme-cosmic rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <AlertCircle className="w-8 h-8 text-yellow-400" />
            </div>
            <div className="text-3xl font-bold text-yellow-400 mb-2">
              {limits.filter(l => l.status === 'warning').length}
            </div>
            <p className="text-theme-secondary text-sm">Warning Endpoints</p>
          </div>

          <div className="card-base bg-theme-card backdrop-blur-lg border border-theme-cosmic rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <Activity className="w-8 h-8 text-blue-400" />
            </div>
            <div className="text-3xl font-bold text-blue-400 mb-2">
              {limits.length}
            </div>
            <p className="text-theme-secondary text-sm">Total Monitored</p>
          </div>
        </motion.div>

        <motion.div
          variants={itemVariants}
          initial="hidden"
          animate="visible"
          className="bg-theme-card backdrop-blur-lg border border-theme-cosmic rounded-2xl overflow-hidden"
        >
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-theme-card/50 border-b border-theme-cosmic">
                <tr>
                  <th className="text-left p-4 font-medium text-theme-primary">Endpoint</th>
                  <th className="text-left p-4 font-medium text-theme-primary">Limit</th>
                  <th className="text-left p-4 font-medium text-theme-primary">Window</th>
                  <th className="text-left p-4 font-medium text-theme-primary">Current</th>
                  <th className="text-left p-4 font-medium text-theme-primary">Usage</th>
                  <th className="text-left p-4 font-medium text-theme-primary">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-theme-cosmic">
                {limits.map((limit, index) => {
                  const usagePercent = (limit.current / limit.limit) * 100;
                  return (
                    <tr key={index} className="hover:bg-theme-card/30 transition-colors duration-200">
                      <td className="p-4">
                        <code className="text-blue-400 text-sm">{limit.endpoint}</code>
                      </td>
                      <td className="p-4 text-theme-primary font-semibold">
                        {limit.limit}
                      </td>
                      <td className="p-4 text-theme-secondary">
                        {limit.window}
                      </td>
                      <td className="p-4 text-theme-primary font-semibold">
                        {limit.current}
                      </td>
                      <td className="p-4">
                        <div className="w-full">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-theme-secondary text-xs">
                              {usagePercent.toFixed(0)}%
                            </span>
                          </div>
                          <div className="w-full h-2 bg-theme-card rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                usagePercent < 50 ? 'bg-green-500' :
                                usagePercent < 80 ? 'bg-yellow-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${usagePercent}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(limit.status)}`}>
                          {limit.status.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </motion.div>

      </div>
    </div>
  );
};

export default RateLimits;