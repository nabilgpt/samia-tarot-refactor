import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { Clock, User, Star, Play, Eye, Filter, RefreshCw, AlertCircle } from 'lucide-react';
import api from '../../lib/api';

const Queue = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    fetchQueue();
    const interval = setInterval(fetchQueue, 15000);
    return () => clearInterval(interval);
  }, []);

  const fetchQueue = async () => {
    try {
      setRefreshing(true);
      const queueData = await api.getReaderQueue();
      setOrders(queueData);
      setError(null);
    } catch (error) {
      console.error('Error fetching queue:', error);
      setError('Failed to load queue');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleAcceptOrder = async (orderId) => {
    try {
      console.log('Accepting order:', orderId);
      fetchQueue();
    } catch (error) {
      console.error('Error accepting order:', error);
    }
  };

  const getServiceIcon = (serviceType) => {
    switch (serviceType?.toLowerCase()) {
      case 'tarot': return '🔮';
      case 'astrology': return '⭐';
      case 'numerology': return '🔢';
      case 'palm': return '✋';
      default: return '🌟';
    }
  };

  const getPriorityColor = (amount) => {
    if (amount >= 100) return 'text-gold-primary';
    if (amount >= 50) return 'text-yellow-400';
    return 'text-theme-secondary';
  };

  const filteredOrders = orders.filter(order => {
    if (filter === 'all') return true;
    if (filter === 'high-value') return order.amount >= 50;
    if (filter === 'urgent') return new Date(order.created_at) < new Date(Date.now() - 2 * 60 * 60 * 1000);
    return true;
  });

  const itemVariants = {
    hidden: shouldReduceMotion ? { opacity: 0 } : { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: shouldReduceMotion ? { duration: 0.3 } : {
        type: "spring",
        stiffness: 100,
        damping: 12
      }
    }
  };

  return (
    <div className="min-h-screen py-20 px-4">
      <div className="container mx-auto max-w-6xl">

        {/* Header */}
        <motion.div
          variants={itemVariants}
          initial="hidden"
          animate="visible"
          className="flex flex-col md:flex-row md:justify-between md:items-center mb-12"
        >
          <div>
            <h1 className="text-4xl md:text-5xl font-bold gradient-text mb-4">
              Reading Queue
            </h1>
            <div className="w-32 h-1 bg-cosmic-gradient mb-6 rounded-full shadow-theme-cosmic" />
            <p className="text-theme-secondary text-lg">
              Pending orders awaiting your spiritual guidance
            </p>
          </div>

          {/* Controls */}
          <div className="flex flex-wrap gap-4">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="bg-theme-card border border-theme-cosmic rounded-lg px-4 py-2 text-theme-primary focus:border-gold-primary focus:outline-none"
            >
              <option value="all">All Orders</option>
              <option value="high-value">High Value ($50+)</option>
              <option value="urgent">Urgent (2+ hours)</option>
            </select>

            <button
              onClick={fetchQueue}
              disabled={refreshing}
              className="inline-flex items-center px-4 py-2 bg-cosmic-gradient hover:shadow-theme-cosmic text-theme-inverse font-medium rounded-lg transition-all duration-300 transform hover:scale-105 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div
          variants={itemVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
        >
          <div className="bg-theme-card backdrop-blur-lg border border-theme-cosmic rounded-xl p-4 text-center">
            <div className="text-2xl font-bold gradient-text">{orders.length}</div>
            <p className="text-theme-secondary text-sm">Total Queue</p>
          </div>
          <div className="bg-theme-card backdrop-blur-lg border border-theme-cosmic rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-gold-primary">{orders.filter(o => o.amount >= 50).length}</div>
            <p className="text-theme-secondary text-sm">High Value</p>
          </div>
          <div className="bg-theme-card backdrop-blur-lg border border-theme-cosmic rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-yellow-400">
              {orders.filter(o => new Date(o.created_at) < new Date(Date.now() - 2 * 60 * 60 * 1000)).length}
            </div>
            <p className="text-theme-secondary text-sm">Urgent</p>
          </div>
          <div className="bg-theme-card backdrop-blur-lg border border-theme-cosmic rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-green-400">
              ${orders.reduce((sum, order) => sum + (order.amount || 0), 0).toFixed(0)}
            </div>
            <p className="text-theme-secondary text-sm">Total Value</p>
          </div>
        </motion.div>

        {/* Error State */}
        {error && (
          <motion.div
            variants={itemVariants}
            initial="hidden"
            animate="visible"
            className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 mb-8 text-center"
          >
            <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
            <p className="text-red-400">{error}</p>
            <button
              onClick={fetchQueue}
              className="mt-4 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors duration-300"
            >
              Try Again
            </button>
          </motion.div>
        )}

        {/* Queue List */}
        {loading ? (
          <div className="space-y-4">
            {Array(3).fill(0).map((_, index) => (
              <div key={index} className="bg-theme-card backdrop-blur-lg border border-theme-cosmic rounded-2xl p-6 animate-pulse">
                <div className="flex justify-between items-start mb-4">
                  <div className="space-y-2">
                    <div className="h-6 bg-theme-tertiary rounded w-48"></div>
                    <div className="h-4 bg-theme-tertiary rounded w-32"></div>
                  </div>
                  <div className="h-8 bg-theme-tertiary rounded w-20"></div>
                </div>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="h-4 bg-theme-tertiary rounded"></div>
                  <div className="h-4 bg-theme-tertiary rounded"></div>
                  <div className="h-4 bg-theme-tertiary rounded"></div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredOrders.length === 0 ? (
          <motion.div
            variants={itemVariants}
            initial="hidden"
            animate="visible"
            className="text-center py-12"
          >
            <Clock className="w-16 h-16 text-theme-muted mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-theme-primary mb-2">
              {filter === 'all' ? 'No Orders in Queue' : 'No Orders Match Filter'}
            </h3>
            <p className="text-theme-secondary mb-6">
              {filter === 'all'
                ? 'All caught up! Check back later for new reading requests.'
                : 'Try changing your filter to see more orders.'
              }
            </p>
            {filter !== 'all' && (
              <button
                onClick={() => setFilter('all')}
                className="px-4 py-2 bg-cosmic-gradient text-theme-inverse rounded-lg"
              >
                Show All Orders
              </button>
            )}
          </motion.div>
        ) : (
          <div className="space-y-6">
            {filteredOrders.map((order, index) => (
              <motion.div
                key={order.order_id}
                variants={itemVariants}
                initial="hidden"
                animate="visible"
                transition={{ delay: index * 0.1 }}
                className="bg-theme-card backdrop-blur-lg border border-theme-cosmic rounded-2xl p-6 hover:border-gold-primary/50 transition-all duration-300"
              >

                {/* Order Header */}
                <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start mb-6">
                  <div className="flex items-start mb-4 lg:mb-0">
                    <div className="text-3xl mr-4 mt-1">
                      {getServiceIcon(order.service_type)}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-theme-primary mb-1">
                        {order.service_name || 'Spiritual Reading'}
                      </h3>
                      <p className="text-theme-secondary text-sm mb-2">
                        Order #{order.order_id}
                      </p>
                      <div className="flex items-center text-theme-muted text-xs">
                        <Clock className="w-3 h-3 mr-1" />
                        Waiting {Math.floor((Date.now() - new Date(order.created_at)) / (1000 * 60))} minutes
                      </div>
                    </div>
                  </div>

                  {/* Amount Badge */}
                  <div className={`inline-flex items-center px-4 py-2 rounded-full border-2 ${
                    order.amount >= 100
                      ? 'border-gold-primary bg-gold-primary/10 text-gold-primary'
                      : order.amount >= 50
                      ? 'border-yellow-400 bg-yellow-400/10 text-yellow-400'
                      : 'border-theme-cosmic bg-theme-cosmic/10 text-theme-secondary'
                  }`}>
                    <Star className="w-4 h-4 mr-2" />
                    ${order.amount?.toFixed(2) || '0.00'}
                  </div>
                </div>

                {/* Client Info */}
                <div className="grid md:grid-cols-3 gap-4 mb-6">
                  <div>
                    <p className="text-theme-muted text-xs uppercase tracking-wide mb-1">Client</p>
                    <p className="text-theme-primary font-semibold flex items-center">
                      <User className="w-4 h-4 mr-2" />
                      {order.client_name || 'Anonymous'}
                    </p>
                  </div>
                  <div>
                    <p className="text-theme-muted text-xs uppercase tracking-wide mb-1">Service Type</p>
                    <p className="text-theme-primary font-semibold capitalize">{order.service_type || 'General'}</p>
                  </div>
                  <div>
                    <p className="text-theme-muted text-xs uppercase tracking-wide mb-1">Requested</p>
                    <p className="text-theme-primary font-semibold">
                      {new Date(order.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>

                {/* Question Preview */}
                {order.question && (
                  <div className="mb-6">
                    <p className="text-theme-muted text-xs uppercase tracking-wide mb-2">Client's Question</p>
                    <div className="bg-theme-card/50 rounded-lg p-4">
                      <p className="text-theme-secondary italic">
                        "{order.question.length > 150 ? `${order.question.substring(0, 150)}...` : order.question}"
                      </p>
                    </div>
                  </div>
                )}

                {/* Priority Indicators */}
                <div className="flex flex-wrap gap-2 mb-6">
                  {order.amount >= 100 && (
                    <span className="px-2 py-1 bg-gold-primary/20 text-gold-primary text-xs rounded-full">
                      Premium Order
                    </span>
                  )}
                  {new Date(order.created_at) < new Date(Date.now() - 2 * 60 * 60 * 1000) && (
                    <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded-full">
                      Urgent
                    </span>
                  )}
                  {order.client_vip && (
                    <span className="px-2 py-1 bg-purple-500/20 text-purple-400 text-xs rounded-full">
                      VIP Client
                    </span>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => handleAcceptOrder(order.order_id)}
                    className="inline-flex items-center px-6 py-3 bg-cosmic-gradient hover:shadow-theme-cosmic text-theme-inverse font-bold rounded-lg transition-all duration-300 transform hover:scale-105"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Accept & Start Reading
                  </button>

                  <Link
                    to={`/orders/${order.order_id}`}
                    className="inline-flex items-center px-4 py-3 bg-theme-card hover:bg-theme-cosmic border border-theme-cosmic text-theme-primary font-medium rounded-lg transition-all duration-300"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    View Details
                  </Link>

                  {order.question && (
                    <button className="inline-flex items-center px-4 py-3 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/20 text-blue-400 font-medium rounded-lg transition-all duration-300">
                      <User className="w-4 h-4 mr-2" />
                      Contact Client
                    </button>
                  )}
                </div>

              </motion.div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
};

export default Queue;