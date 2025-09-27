import React, { useState, useEffect } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { BarChart3, TrendingUp, Users, Package, DollarSign, Activity, RefreshCw } from 'lucide-react';
import api from '../../lib/api';

const Metrics = () => {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    loadMetrics();
  }, []);

  const loadMetrics = async () => {
    try {
      setLoading(true);
      const data = await api.ops.metrics();
      setMetrics(data);
      setError(null);
    } catch (err) {
      console.error('Error loading metrics:', err);
      setError('Failed to load metrics');
    } finally {
      setLoading(false);
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

  const mockMetrics = {
    total_users: 1247,
    active_users: 892,
    total_orders: 3456,
    completed_orders: 3102,
    pending_orders: 234,
    failed_orders: 120,
    total_revenue: 87450.00,
    monthly_revenue: 12340.00,
    avg_order_value: 25.30,
    api_requests: 125678,
    api_errors: 234,
    error_rate: 0.19
  };

  const displayMetrics = metrics || mockMetrics;

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
              Platform Metrics
            </h1>
            <div className="w-32 h-1 bg-cosmic-gradient mb-6 rounded-full shadow-theme-cosmic" />
            <p className="text-theme-secondary text-lg">
              Real-time performance and usage analytics
            </p>
          </div>

          <button
            onClick={loadMetrics}
            disabled={loading}
            className="btn-base btn-secondary inline-flex items-center mt-6 lg:mt-0"
          >
            <RefreshCw className={`w-5 h-5 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </motion.div>

        {error && (
          <motion.div
            variants={itemVariants}
            className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-8"
          >
            <p className="text-red-400">{error}</p>
          </motion.div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <motion.div
            variants={itemVariants}
            className="card-base bg-theme-card backdrop-blur-lg border border-theme-cosmic rounded-2xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <Users className="w-8 h-8 text-blue-400" />
              <TrendingUp className="w-5 h-5 text-green-400" />
            </div>
            <div className="text-3xl font-bold gradient-text mb-2">
              {displayMetrics.total_users.toLocaleString()}
            </div>
            <p className="text-theme-secondary text-sm">Total Users</p>
            <p className="text-green-400 text-xs mt-2">
              {displayMetrics.active_users} active
            </p>
          </motion.div>

          <motion.div
            variants={itemVariants}
            className="card-base bg-theme-card backdrop-blur-lg border border-theme-cosmic rounded-2xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <Package className="w-8 h-8 text-purple-400" />
              <Activity className="w-5 h-5 text-blue-400" />
            </div>
            <div className="text-3xl font-bold gradient-text mb-2">
              {displayMetrics.total_orders.toLocaleString()}
            </div>
            <p className="text-theme-secondary text-sm">Total Orders</p>
            <p className="text-blue-400 text-xs mt-2">
              {displayMetrics.pending_orders} pending
            </p>
          </motion.div>

          <motion.div
            variants={itemVariants}
            className="card-base bg-theme-card backdrop-blur-lg border border-theme-cosmic rounded-2xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <DollarSign className="w-8 h-8 text-green-400" />
              <TrendingUp className="w-5 h-5 text-green-400" />
            </div>
            <div className="text-3xl font-bold gradient-text mb-2">
              ${displayMetrics.total_revenue.toLocaleString()}
            </div>
            <p className="text-theme-secondary text-sm">Total Revenue</p>
            <p className="text-green-400 text-xs mt-2">
              ${displayMetrics.monthly_revenue.toLocaleString()} this month
            </p>
          </motion.div>

          <motion.div
            variants={itemVariants}
            className="card-base bg-theme-card backdrop-blur-lg border border-theme-cosmic rounded-2xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <BarChart3 className="w-8 h-8 text-gold-primary" />
              <Activity className="w-5 h-5 text-theme-secondary" />
            </div>
            <div className="text-3xl font-bold gradient-text mb-2">
              ${displayMetrics.avg_order_value.toFixed(2)}
            </div>
            <p className="text-theme-secondary text-sm">Avg Order Value</p>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.div
            variants={itemVariants}
            className="bg-theme-card backdrop-blur-lg border border-theme-cosmic rounded-2xl p-6"
          >
            <h3 className="text-xl font-bold text-theme-primary mb-6">Order Status</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-theme-secondary">Completed</span>
                <div className="flex items-center">
                  <div className="w-48 h-2 bg-theme-card rounded-full mr-3 overflow-hidden">
                    <div
                      className="h-full bg-green-500 rounded-full"
                      style={{ width: `${(displayMetrics.completed_orders / displayMetrics.total_orders) * 100}%` }}
                    />
                  </div>
                  <span className="text-theme-primary font-semibold w-16 text-right">
                    {displayMetrics.completed_orders}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-theme-secondary">Pending</span>
                <div className="flex items-center">
                  <div className="w-48 h-2 bg-theme-card rounded-full mr-3 overflow-hidden">
                    <div
                      className="h-full bg-yellow-500 rounded-full"
                      style={{ width: `${(displayMetrics.pending_orders / displayMetrics.total_orders) * 100}%` }}
                    />
                  </div>
                  <span className="text-theme-primary font-semibold w-16 text-right">
                    {displayMetrics.pending_orders}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-theme-secondary">Failed</span>
                <div className="flex items-center">
                  <div className="w-48 h-2 bg-theme-card rounded-full mr-3 overflow-hidden">
                    <div
                      className="h-full bg-red-500 rounded-full"
                      style={{ width: `${(displayMetrics.failed_orders / displayMetrics.total_orders) * 100}%` }}
                    />
                  </div>
                  <span className="text-theme-primary font-semibold w-16 text-right">
                    {displayMetrics.failed_orders}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            variants={itemVariants}
            className="bg-theme-card backdrop-blur-lg border border-theme-cosmic rounded-2xl p-6"
          >
            <h3 className="text-xl font-bold text-theme-primary mb-6">API Performance</h3>
            <div className="space-y-6">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-theme-secondary">Total Requests</span>
                  <span className="text-theme-primary font-bold text-xl">
                    {displayMetrics.api_requests.toLocaleString()}
                  </span>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-theme-secondary">Total Errors</span>
                  <span className="text-red-400 font-bold text-xl">
                    {displayMetrics.api_errors.toLocaleString()}
                  </span>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-theme-secondary">Error Rate</span>
                  <span className={`font-bold text-xl ${
                    displayMetrics.error_rate < 1 ? 'text-green-400' :
                    displayMetrics.error_rate < 5 ? 'text-yellow-400' : 'text-red-400'
                  }`}>
                    {displayMetrics.error_rate}%
                  </span>
                </div>
                <div className="w-full h-2 bg-theme-card rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      displayMetrics.error_rate < 1 ? 'bg-green-500' :
                      displayMetrics.error_rate < 5 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${Math.min(displayMetrics.error_rate * 10, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </motion.div>
        </div>

      </div>
    </div>
  );
};

export default Metrics;