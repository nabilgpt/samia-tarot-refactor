import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { Package, Clock, CheckCircle, AlertCircle, Eye, Download, Calendar } from 'lucide-react';
import api from '../../lib/api';

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchOrders = async () => {
    try {
      const userOrders = await api.getMyOrders();
      setOrders(userOrders);
      setError(null);
    } catch (error) {
      console.error('Error fetching orders:', error);
      setError('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed': return 'text-green-400 bg-green-500/10 border-green-500/20';
      case 'in_progress': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
      case 'pending': return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
      case 'cancelled': return 'text-red-400 bg-red-500/10 border-red-500/20';
      default: return 'text-theme-secondary bg-theme-card border-theme-cosmic';
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'in_progress': return <Clock className="w-4 h-4" />;
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'cancelled': return <AlertCircle className="w-4 h-4" />;
      default: return <Package className="w-4 h-4" />;
    }
  };

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

  if (loading) {
    return (
      <div className="min-h-screen py-20 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold gradient-text mb-4">My Orders</h1>
            <div className="w-32 h-1 bg-cosmic-gradient mx-auto rounded-full shadow-theme-cosmic" />
          </div>
          <div className="grid gap-6">
            {Array(3).fill(0).map((_, index) => (
              <div key={index} className="bg-theme-card backdrop-blur-lg border border-theme-cosmic rounded-2xl p-6 animate-pulse">
                <div className="flex justify-between items-start mb-4">
                  <div className="space-y-2">
                    <div className="h-6 bg-theme-tertiary rounded w-32"></div>
                    <div className="h-4 bg-theme-tertiary rounded w-48"></div>
                  </div>
                  <div className="h-8 bg-theme-tertiary rounded-full w-20"></div>
                </div>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="h-4 bg-theme-tertiary rounded"></div>
                  <div className="h-4 bg-theme-tertiary rounded"></div>
                  <div className="h-4 bg-theme-tertiary rounded"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-20 px-4">
      <div className="container mx-auto max-w-4xl">

        {/* Header */}
        <motion.div
          variants={itemVariants}
          initial="hidden"
          animate="visible"
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-bold gradient-text mb-4">
            My Orders
          </h1>
          <div className="w-32 h-1 bg-cosmic-gradient mx-auto mb-6 rounded-full shadow-theme-cosmic" />
          <p className="text-theme-secondary text-lg">
            Track your readings and spiritual guidance orders
          </p>
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
              onClick={fetchOrders}
              className="mt-4 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors duration-300"
            >
              Try Again
            </button>
          </motion.div>
        )}

        {/* Orders List */}
        {orders.length === 0 && !loading ? (
          <motion.div
            variants={itemVariants}
            initial="hidden"
            animate="visible"
            className="text-center py-12"
          >
            <Package className="w-16 h-16 text-theme-muted mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-theme-primary mb-2">No Orders Yet</h3>
            <p className="text-theme-secondary mb-6">You haven't placed any orders yet. Ready to discover your destiny?</p>
            <Link
              to="/services"
              className="inline-flex items-center px-6 py-3 bg-cosmic-gradient hover:shadow-theme-cosmic text-theme-inverse font-medium rounded-lg transition-all duration-300 transform hover:scale-105"
            >
              Browse Services
            </Link>
          </motion.div>
        ) : (
          <div className="space-y-6">
            {orders.map((order, index) => (
              <motion.div
                key={order.order_id}
                variants={itemVariants}
                initial="hidden"
                animate="visible"
                transition={{ delay: index * 0.1 }}
                className="bg-theme-card backdrop-blur-lg border border-theme-cosmic rounded-2xl p-6 hover:border-gold-primary/50 transition-all duration-300"
              >

                {/* Order Header */}
                <div className="flex flex-col md:flex-row md:justify-between md:items-start mb-6">
                  <div>
                    <h3 className="text-xl font-bold text-theme-primary mb-2">
                      {order.service_name || 'Spiritual Reading'}
                    </h3>
                    <p className="text-theme-secondary text-sm mb-2">
                      Order #{order.order_id}
                    </p>
                    <div className="flex items-center text-theme-muted text-xs">
                      <Calendar className="w-3 h-3 mr-1" />
                      {new Date(order.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className={`inline-flex items-center px-3 py-1 rounded-full border text-xs font-medium ${getStatusColor(order.status)}`}>
                    {getStatusIcon(order.status)}
                    <span className="ml-1 capitalize">{order.status || 'pending'}</span>
                  </div>
                </div>

                {/* Order Details */}
                <div className="grid md:grid-cols-3 gap-4 mb-6">
                  <div>
                    <p className="text-theme-muted text-xs uppercase tracking-wide mb-1">Amount</p>
                    <p className="text-theme-primary font-semibold">${order.amount?.toFixed(2) || '0.00'}</p>
                  </div>
                  <div>
                    <p className="text-theme-muted text-xs uppercase tracking-wide mb-1">Reader</p>
                    <p className="text-theme-primary font-semibold">{order.reader_name || 'Assigning...'}</p>
                  </div>
                  <div>
                    <p className="text-theme-muted text-xs uppercase tracking-wide mb-1">Type</p>
                    <p className="text-theme-primary font-semibold capitalize">{order.service_type || 'Standard'}</p>
                  </div>
                </div>

                {/* Question Preview */}
                {order.question && (
                  <div className="mb-6">
                    <p className="text-theme-muted text-xs uppercase tracking-wide mb-2">Your Question</p>
                    <div className="bg-theme-card/50 rounded-lg p-3">
                      <p className="text-theme-secondary text-sm italic">"{order.question}"</p>
                    </div>
                  </div>
                )}

                {/* Progress or Results */}
                {order.status === 'completed' && (
                  <div className="mb-6">
                    <p className="text-theme-muted text-xs uppercase tracking-wide mb-2">Reading Available</p>
                    <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                      <p className="text-green-400 text-sm flex items-center">
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Your reading is complete and ready to view
                      </p>
                    </div>
                  </div>
                )}

                {order.status === 'in_progress' && (
                  <div className="mb-6">
                    <p className="text-theme-muted text-xs uppercase tracking-wide mb-2">Progress</p>
                    <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
                      <p className="text-yellow-400 text-sm flex items-center">
                        <Clock className="w-4 h-4 mr-2" />
                        Your reader is preparing your spiritual guidance
                      </p>
                      <div className="mt-2 bg-theme-card rounded-full h-2">
                        <div className="bg-yellow-400 h-2 rounded-full w-2/3 animate-pulse"></div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-3">
                  <Link
                    to={`/orders/${order.order_id}`}
                    className="inline-flex items-center px-4 py-2 bg-cosmic-gradient hover:shadow-theme-cosmic text-theme-inverse font-medium rounded-lg transition-all duration-300 transform hover:scale-105"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    View Details
                  </Link>

                  {order.status === 'completed' && (
                    <button className="inline-flex items-center px-4 py-2 bg-theme-card hover:bg-theme-cosmic border border-theme-cosmic text-theme-primary font-medium rounded-lg transition-all duration-300">
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </button>
                  )}

                  {(order.status === 'pending' || order.status === 'in_progress') && (
                    <button className="inline-flex items-center px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/20 text-red-400 font-medium rounded-lg transition-all duration-300">
                      Cancel Order
                    </button>
                  )}
                </div>

              </motion.div>
            ))}
          </div>
        )}

        {/* Navigation */}
        <motion.div
          variants={itemVariants}
          initial="hidden"
          animate="visible"
          className="text-center mt-12"
        >
          <Link
            to="/services"
            className="inline-flex items-center px-6 py-3 bg-transparent border border-theme-cosmic text-theme-primary hover:bg-theme-cosmic hover:text-theme-inverse font-medium rounded-lg transition-all duration-300"
          >
            Order New Reading
          </Link>
        </motion.div>

      </div>
    </div>
  );
};

export default Orders;