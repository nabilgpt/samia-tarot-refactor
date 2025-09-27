import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { Sparkles, ArrowLeft, Clock, CheckCircle, AlertCircle, Download } from 'lucide-react';
import api from '../lib/api';

const Order = () => {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [polling, setPolling] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    if (orderId) {
      loadOrder();
    }
  }, [orderId]);

  const loadOrder = async () => {
    try {
      setLoading(true);
      const orderData = await api.getOrder(orderId);
      setOrder(orderData);

      if (orderData.status === 'pending' || orderData.status === 'processing') {
        setPolling(true);
        pollOrderStatus(orderData);
      }
    } catch (err) {
      console.error('Error loading order:', err);
      setError('Order not found or unable to load order details');
    } finally {
      setLoading(false);
    }
  };

  const pollOrderStatus = async () => {
    const maxAttempts = 5;
    const baseDelay = 1000;
    const controller = new AbortController();

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      if (controller.signal.aborted) break;

      try {
        const data = await api.getOrder(orderId);
        if (data.status === 'completed' || data.status === 'failed') {
          setOrder(data);
          setPolling(false);
          return;
        }

        const delay = Math.min(baseDelay * Math.pow(2, attempt), 16000);
        const jitter = Math.random() * 400 - 200;
        await new Promise(resolve => setTimeout(resolve, delay + jitter));
      } catch (err) {
        console.error('Polling error:', err);
        if (attempt === maxAttempts - 1) {
          setPolling(false);
        }
      }
    }
    setPolling(false);
  };

  const handleDownloadInvoice = async () => {
    try {
      const invoice = await api.payments.getInvoice(orderId);
      if (invoice && invoice.download_url) {
        window.open(invoice.download_url, '_blank', 'noopener,noreferrer');
      }
    } catch (err) {
      console.error('Error fetching invoice:', err);
      setError('Unable to generate invoice. Please try again.');
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-6 h-6 text-yellow-500" />;
      case 'processing':
        return <Clock className="w-6 h-6 text-blue-500 animate-pulse" />;
      case 'completed':
        return <CheckCircle className="w-6 h-6 text-green-500" />;
      case 'failed':
        return <AlertCircle className="w-6 h-6 text-red-500" />;
      default:
        return <Clock className="w-6 h-6 text-gray-500" />;
    }
  };

  const getOrderSteps = (currentStatus) => {
    const steps = [
      { id: 'created', label: 'Order Created', status: 'completed' },
      { id: 'pending', label: 'Awaiting Reader', status: currentStatus === 'pending' ? 'current' : 'completed' },
      { id: 'processing', label: 'Being Prepared', status: currentStatus === 'processing' ? 'current' : (currentStatus === 'completed' ? 'completed' : 'pending') },
      { id: 'completed', label: 'Ready for Delivery', status: currentStatus === 'completed' ? 'completed' : 'pending' }
    ];
    return steps;
  };

  const getStatusMessage = (status) => {
    switch (status) {
      case 'pending':
        return 'Your cosmic reading is being prepared by our mystical experts...';
      case 'processing':
        return 'Our reader is channeling the cosmic energies for your personalized insights...';
      case 'completed':
        return 'Your reading is complete! The cosmic insights await you.';
      case 'failed':
        return 'There was an issue processing your order. Please contact support.';
      default:
        return 'Processing your spiritual journey...';
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: shouldReduceMotion ? { duration: 0.1 } : {
        delayChildren: 0.3,
        staggerChildren: 0.1
      }
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="text-6xl mb-4 inline-block"
          >
            🔮
          </motion.div>
          <p className="text-theme-secondary text-lg">Loading your cosmic order...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-theme-primary mb-4">Order Not Found</h1>
          <p className="text-theme-secondary mb-6">{error}</p>
          <Link
            to="/services"
            className="inline-flex items-center px-6 py-3 bg-cosmic-gradient text-theme-inverse font-bold rounded-xl transition-all duration-300 transform hover:scale-105 shadow-theme-card"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Services
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>

      {/* Navigation */}
      <nav className="relative z-10 p-6">
        <div className="container mx-auto flex justify-between items-center">
          <div className="text-2xl font-bold gradient-text flex items-center">
            <Sparkles className="w-8 h-8 mr-2 text-gold-primary animate-pulse" />
            SAMIA TAROT
          </div>
          <Link
            to="/services"
            className="flex items-center text-theme-secondary hover:text-gold-primary transition-colors duration-300"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Services
          </Link>
        </div>
      </nav>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 pt-12 pb-20"
      >
        <div className="container mx-auto px-4 max-w-4xl">
          {/* Header */}
          <motion.div variants={itemVariants} className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold gradient-text mb-6">
              Order Status
            </h1>
            <div className="w-24 h-1 bg-cosmic-gradient mx-auto rounded-full shadow-theme-cosmic" />
          </motion.div>

          {/* Order Details Card */}
          <motion.div
            variants={itemVariants}
            className="bg-theme-card backdrop-blur-lg border border-theme-cosmic rounded-2xl p-8 shadow-theme-card mb-8"
          >
            <div className="text-center mb-8">
              {getStatusIcon(order?.status)}
              <h2 className="text-2xl font-bold text-theme-primary mt-4 mb-2">
                Order #{order?.order_id}
              </h2>
              <p className="text-theme-secondary">
                {getStatusMessage(order?.status)}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Order Information */}
              <div>
                <h3 className="text-xl font-bold text-theme-primary mb-4">Order Details</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-theme-secondary">Service:</span>
                    <span className="text-theme-primary font-medium">{order?.service_name || 'Mystical Reading'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-theme-secondary">Amount:</span>
                    <span className="text-theme-primary font-medium">${order?.amount || '0.00'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-theme-secondary">Status:</span>
                    <span className={`font-medium capitalize ${
                      order?.status === 'completed' ? 'text-green-500' :
                      order?.status === 'failed' ? 'text-red-500' : 'text-yellow-500'
                    }`}>
                      {order?.status || 'pending'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-theme-secondary">Created:</span>
                    <span className="text-theme-primary font-medium">
                      {order?.created_at ? new Date(order.created_at).toLocaleString() : 'Just now'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Progress or Results */}
              <div>
                {order?.status === 'completed' ? (
                  <div>
                    <h3 className="text-xl font-bold text-theme-primary mb-4">Your Reading is Ready</h3>
                    <div className="text-center p-6 bg-gradient-to-br from-green-500/10 to-emerald-500/10 rounded-xl border border-green-500/20">
                      <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                      <p className="text-theme-secondary mb-6">
                        Your personalized cosmic reading has been completed and is ready for download.
                      </p>
                      <button
                        onClick={handleDownloadInvoice}
                        className="btn-base btn-primary inline-flex items-center"
                      >
                        <Download className="w-5 h-5 mr-2" />
                        Download Invoice
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <h3 className="text-xl font-bold text-theme-primary mb-4">Processing Status</h3>
                    <div className="text-center p-6 bg-gradient-to-br from-cosmic-primary/10 to-purple-500/10 rounded-xl border border-cosmic-primary/20">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                        className="text-4xl mb-4 inline-block"
                      >
                        🔮
                      </motion.div>
                      <p className="text-theme-secondary">
                        Our mystical experts are channeling cosmic energies for your reading.
                        This page will automatically update when complete.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          {/* Additional Information */}
          <motion.div
            variants={itemVariants}
            className="text-center"
          >
            <div className="bg-theme-card/50 backdrop-blur-sm border border-theme-cosmic/30 rounded-xl p-6">
              <h3 className="text-lg font-bold text-theme-primary mb-4">
                What happens next?
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm text-theme-secondary">
                <div>
                  <div className="text-2xl mb-2">🌟</div>
                  <p>Your order is processed by our expert readers</p>
                </div>
                <div>
                  <div className="text-2xl mb-2">📋</div>
                  <p>A detailed reading is prepared with cosmic insights</p>
                </div>
                <div>
                  <div className="text-2xl mb-2">✨</div>
                  <p>You receive your personalized spiritual guidance</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};

export default Order;