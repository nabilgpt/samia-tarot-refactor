import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { CreditCard, Lock, Shield, ArrowLeft, AlertCircle, CheckCircle } from 'lucide-react';
import api from '../../lib/api';
import { api as paymentsApi } from '../../services/api';

const Checkout = () => {
  const [searchParams] = useSearchParams();
  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [question, setQuestion] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('card');
  const navigate = useNavigate();
  const shouldReduceMotion = useReducedMotion();

  const serviceId = searchParams.get('service');

  useEffect(() => {
    if (serviceId) {
      loadService();
    } else {
      setError('No service selected');
      setLoading(false);
    }
  }, [serviceId]);

  const loadService = async () => {
    try {
      const services = await api.getServices();
      const selectedService = services.find(s => s.code === serviceId || s.id.toString() === serviceId);
      if (selectedService) {
        setService({
          ...selectedService,
          id: selectedService.code || selectedService.id.toString(),
          title: selectedService.name,
          price: selectedService.base_price > 0 ? selectedService.base_price : 25.00
        });
      } else {
        setError('Service not found');
      }
    } catch (error) {
      console.error('Error loading service:', error);
      setError('Failed to load service details');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckout = async (e) => {
    e.preventDefault();
    if (!service) return;

    setProcessing(true);
    setError(null);

    try {
      const orderData = {
        service_code: service.code || service.id,
        question_text: question.trim() || undefined,
        is_gold: false
      };

      const order = await paymentsApi.orders.createOrder(orderData);

      if (order && order.order_id) {
        try {
          await paymentsApi.payments.createPaymentIntent({
            order_id: order.order_id
          });
        } catch (paymentError) {
          console.warn('Payment intent creation failed, proceeding to order page:', paymentError);
        }

        navigate(`/orders/${order.order_id}`);
      } else {
        throw new Error('Order creation failed');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      setError(error.message || 'Failed to process order. Please try again.');
    } finally {
      setProcessing(false);
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
          <div className="text-center">
            <div className="animate-pulse">
              <div className="w-32 h-8 bg-theme-tertiary rounded mx-auto mb-4"></div>
              <div className="w-64 h-4 bg-theme-tertiary rounded mx-auto"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error && !service) {
    return (
      <div className="min-h-screen py-20 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-theme-primary mb-4">Checkout Error</h1>
          <p className="text-theme-secondary mb-6">{error}</p>
          <button
            onClick={() => navigate('/services')}
            className="inline-flex items-center px-6 py-3 bg-cosmic-gradient text-theme-inverse font-medium rounded-lg"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Services
          </button>
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
            Secure Checkout
          </h1>
          <div className="w-32 h-1 bg-cosmic-gradient mx-auto mb-6 rounded-full shadow-theme-cosmic" />
          <p className="text-theme-secondary text-lg">
            Complete your spiritual guidance order
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-8">

          {/* Order Summary */}
          <motion.div
            variants={itemVariants}
            initial="hidden"
            animate="visible"
            className="lg:col-span-1"
          >
            <div className="bg-theme-card backdrop-blur-lg border border-theme-cosmic rounded-2xl p-6 sticky top-24">
              <h2 className="text-xl font-bold text-theme-primary mb-6">Order Summary</h2>

              {service && (
                <div className="space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-theme-primary">{service.title}</h3>
                      <p className="text-theme-secondary text-sm">{service.description}</p>
                    </div>
                  </div>

                  <div className="border-t border-theme-cosmic pt-4">
                    <div className="flex justify-between items-center">
                      <span className="text-theme-secondary">Service</span>
                      <span className="font-semibold text-theme-primary">${service.price.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-theme-secondary">Processing Fee</span>
                      <span className="font-semibold text-theme-primary">$0.00</span>
                    </div>
                  </div>

                  <div className="border-t border-theme-cosmic pt-4">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-bold text-theme-primary">Total</span>
                      <span className="text-2xl font-bold gradient-text">${service.price.toFixed(2)}</span>
                    </div>
                    <p className="text-theme-muted text-xs mt-1">One-time payment</p>
                  </div>
                </div>
              )}

              {/* Trust Signals */}
              <div className="mt-6 pt-6 border-t border-theme-cosmic">
                <div className="space-y-3">
                  <div className="flex items-center text-theme-secondary text-sm">
                    <Shield className="w-4 h-4 text-gold-primary mr-2" />
                    SSL Encrypted Payment
                  </div>
                  <div className="flex items-center text-theme-secondary text-sm">
                    <Lock className="w-4 h-4 text-gold-primary mr-2" />
                    Private & Confidential
                  </div>
                  <div className="flex items-center text-theme-secondary text-sm">
                    <CheckCircle className="w-4 h-4 text-gold-primary mr-2" />
                    Satisfaction Guaranteed
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Checkout Form */}
          <motion.div
            variants={itemVariants}
            initial="hidden"
            animate="visible"
            className="lg:col-span-2"
          >
            <form onSubmit={handleCheckout} className="space-y-8">

              {/* Question Section */}
              <div className="bg-theme-card backdrop-blur-lg border border-theme-cosmic rounded-2xl p-6">
                <h2 className="text-xl font-bold text-theme-primary mb-4">Your Question</h2>
                <p className="text-theme-secondary text-sm mb-4">
                  Share what's on your mind to help your reader provide personalized guidance (optional)
                </p>
                <textarea
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="What would you like guidance on? The more specific you are, the more detailed your reading will be..."
                  className="w-full h-32 bg-theme-card border border-theme-cosmic rounded-lg p-4 text-theme-primary placeholder-theme-muted focus:border-gold-primary focus:outline-none transition-colors duration-300 resize-none"
                  maxLength={500}
                />
                <div className="text-right text-theme-muted text-xs mt-2">
                  {question.length}/500 characters
                </div>
              </div>

              {/* Payment Method */}
              <div className="bg-theme-card backdrop-blur-lg border border-theme-cosmic rounded-2xl p-6">
                <h2 className="text-xl font-bold text-theme-primary mb-4">Payment Method</h2>

                <div className="space-y-3 mb-6">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="payment"
                      value="card"
                      checked={paymentMethod === 'card'}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="sr-only"
                    />
                    <div className={`flex items-center w-full p-4 border-2 rounded-lg transition-all duration-300 ${
                      paymentMethod === 'card'
                        ? 'border-gold-primary bg-gold-primary/10'
                        : 'border-theme-cosmic hover:border-theme-cosmic/60'
                    }`}>
                      <CreditCard className={`w-5 h-5 mr-3 ${paymentMethod === 'card' ? 'text-gold-primary' : 'text-theme-secondary'}`} />
                      <div>
                        <p className="font-medium text-theme-primary">Credit/Debit Card</p>
                        <p className="text-theme-secondary text-sm">Visa, Mastercard, American Express</p>
                      </div>
                    </div>
                  </label>

                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="payment"
                      value="paypal"
                      checked={paymentMethod === 'paypal'}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="sr-only"
                    />
                    <div className={`flex items-center w-full p-4 border-2 rounded-lg transition-all duration-300 ${
                      paymentMethod === 'paypal'
                        ? 'border-gold-primary bg-gold-primary/10'
                        : 'border-theme-cosmic hover:border-theme-cosmic/60'
                    }`}>
                      <div className={`w-5 h-5 mr-3 rounded ${paymentMethod === 'paypal' ? 'bg-gold-primary' : 'bg-theme-secondary'}`} />
                      <div>
                        <p className="font-medium text-theme-primary">PayPal</p>
                        <p className="text-theme-secondary text-sm">Pay with your PayPal account</p>
                      </div>
                    </div>
                  </label>
                </div>

                {/* Mock Payment Form */}
                {paymentMethod === 'card' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-theme-secondary text-sm mb-2">Card Number</label>
                      <input
                        type="text"
                        placeholder="1234 5678 9012 3456"
                        className="w-full bg-theme-card border border-theme-cosmic rounded-lg p-3 text-theme-primary placeholder-theme-muted focus:border-gold-primary focus:outline-none transition-colors duration-300"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-theme-secondary text-sm mb-2">Expiry Date</label>
                        <input
                          type="text"
                          placeholder="MM/YY"
                          className="w-full bg-theme-card border border-theme-cosmic rounded-lg p-3 text-theme-primary placeholder-theme-muted focus:border-gold-primary focus:outline-none transition-colors duration-300"
                        />
                      </div>
                      <div>
                        <label className="block text-theme-secondary text-sm mb-2">CVC</label>
                        <input
                          type="text"
                          placeholder="123"
                          className="w-full bg-theme-card border border-theme-cosmic rounded-lg p-3 text-theme-primary placeholder-theme-muted focus:border-gold-primary focus:outline-none transition-colors duration-300"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-theme-secondary text-sm mb-2">Cardholder Name</label>
                      <input
                        type="text"
                        placeholder="John Doe"
                        className="w-full bg-theme-card border border-theme-cosmic rounded-lg p-3 text-theme-primary placeholder-theme-muted focus:border-gold-primary focus:outline-none transition-colors duration-300"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Error Display */}
              {error && (
                <motion.div
                  variants={itemVariants}
                  className="bg-red-500/10 border border-red-500/20 rounded-xl p-4"
                >
                  <div className="flex items-center">
                    <AlertCircle className="w-5 h-5 text-red-400 mr-3" />
                    <p className="text-red-400">{error}</p>
                  </div>
                </motion.div>
              )}

              {/* Submit Button */}
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  type="button"
                  onClick={() => navigate('/services')}
                  className="flex-1 px-6 py-4 bg-transparent border border-theme-cosmic text-theme-primary hover:bg-theme-cosmic hover:text-theme-inverse font-semibold rounded-xl transition-all duration-300"
                >
                  <ArrowLeft className="w-4 h-4 mr-2 inline" />
                  Back to Services
                </button>
                <button
                  type="submit"
                  disabled={processing || !service}
                  className="flex-1 px-6 py-4 bg-cosmic-gradient hover:shadow-theme-cosmic text-theme-inverse font-bold rounded-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {processing ? (
                    <span className="flex items-center justify-center">
                      <div className="w-4 h-4 border-2 border-theme-inverse border-t-transparent rounded-full animate-spin mr-2"></div>
                      Processing...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center">
                      <Lock className="w-4 h-4 mr-2" />
                      Complete Order ${service?.price?.toFixed(2) || '0.00'}
                    </span>
                  )}
                </button>
              </div>

            </form>
          </motion.div>

        </div>

      </div>
    </div>
  );
};

export default Checkout;