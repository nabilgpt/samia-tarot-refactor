import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, User, Clock, Star, Send, Save, FileText, Upload, Mic, MicOff, AlertCircle, CheckCircle } from 'lucide-react';
import api from '../../lib/api';

const ReaderOrder = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [readingText, setReadingText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [audioFile, setAudioFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    if (orderId) {
      fetchOrder();
    }
  }, [orderId]);

  const fetchOrder = async () => {
    try {
      const orderData = await api.getOrder(orderId);
      setOrder(orderData);
      setReadingText(orderData.reading_content || '');
    } catch (error) {
      console.error('Error fetching order:', error);
      setError('Failed to load order details');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDraft = async () => {
    setSaving(true);
    try {
      await api.updateOrderReading(orderId, {
        reading_content: readingText,
        status: 'in_progress'
      });
      setOrder({ ...order, reading_content: readingText, status: 'in_progress' });
    } catch (error) {
      console.error('Error saving draft:', error);
      setError('Failed to save draft');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitReading = async () => {
    if (!readingText.trim()) {
      setError('Please provide a reading before submitting');
      return;
    }

    setSubmitting(true);
    try {
      await api.updateOrderReading(orderId, {
        reading_content: readingText,
        status: 'completed',
        completed_at: new Date().toISOString()
      });
      navigate('/reader/queue');
    } catch (error) {
      console.error('Error submitting reading:', error);
      setError('Failed to submit reading');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAudioUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      setAudioFile(file);
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
          <div className="bg-theme-card backdrop-blur-lg border border-theme-cosmic rounded-2xl p-8 animate-pulse">
            <div className="h-8 bg-theme-tertiary rounded w-64 mb-4"></div>
            <div className="h-4 bg-theme-tertiary rounded w-48 mb-8"></div>
            <div className="space-y-4">
              <div className="h-4 bg-theme-tertiary rounded"></div>
              <div className="h-4 bg-theme-tertiary rounded"></div>
              <div className="h-32 bg-theme-tertiary rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error && !order) {
    return (
      <div className="min-h-screen py-20 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-theme-primary mb-4">Order Not Found</h1>
          <p className="text-theme-secondary mb-6">{error}</p>
          <button
            onClick={() => navigate('/reader/queue')}
            className="inline-flex items-center px-6 py-3 bg-cosmic-gradient text-theme-inverse font-medium rounded-lg"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Queue
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
          className="flex items-center mb-8"
        >
          <button
            onClick={() => navigate('/reader/queue')}
            className="mr-4 p-2 hover:bg-theme-cosmic rounded-lg transition-colors duration-300"
          >
            <ArrowLeft className="w-6 h-6 text-theme-secondary" />
          </button>
          <div>
            <h1 className="text-3xl md:text-4xl font-bold gradient-text">
              Reading Session
            </h1>
            <p className="text-theme-secondary">Order #{order?.order_id}</p>
          </div>
        </motion.div>

        {/* Error Display */}
        {error && (
          <motion.div
            variants={itemVariants}
            className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6"
          >
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-red-400 mr-3" />
              <p className="text-red-400">{error}</p>
              <button
                onClick={() => setError(null)}
                className="ml-auto text-red-400 hover:text-red-300"
              >
                ×
              </button>
            </div>
          </motion.div>
        )}

        <div className="grid lg:grid-cols-3 gap-8">

          {/* Order Details Sidebar */}
          <motion.div
            variants={itemVariants}
            initial="hidden"
            animate="visible"
            className="lg:col-span-1"
          >
            <div className="bg-theme-card backdrop-blur-lg border border-theme-cosmic rounded-2xl p-6 sticky top-24">
              <h2 className="text-xl font-bold text-theme-primary mb-6">Order Details</h2>

              {order && (
                <div className="space-y-4">
                  {/* Service Info */}
                  <div>
                    <h3 className="font-semibold text-theme-primary mb-2">{order.service_name}</h3>
                    <p className="text-theme-secondary text-sm">{order.service_type}</p>
                  </div>

                  {/* Client Info */}
                  <div className="pt-4 border-t border-theme-cosmic">
                    <div className="flex items-center mb-2">
                      <User className="w-4 h-4 text-gold-primary mr-2" />
                      <span className="font-medium text-theme-primary">{order.client_name || 'Anonymous'}</span>
                    </div>
                    <div className="flex items-center text-theme-secondary text-sm">
                      <Clock className="w-3 h-3 mr-2" />
                      Ordered {new Date(order.created_at).toLocaleDateString()}
                    </div>
                  </div>

                  {/* Amount */}
                  <div className="pt-4 border-t border-theme-cosmic">
                    <div className="flex items-center justify-between">
                      <span className="text-theme-secondary">Amount</span>
                      <span className="text-xl font-bold gradient-text">${order.amount?.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Client Question */}
                  {order.question && (
                    <div className="pt-4 border-t border-theme-cosmic">
                      <h4 className="font-medium text-theme-primary mb-2">Client's Question</h4>
                      <div className="bg-theme-card/50 rounded-lg p-3">
                        <p className="text-theme-secondary text-sm italic">"{order.question}"</p>
                      </div>
                    </div>
                  )}

                  {/* Status */}
                  <div className="pt-4 border-t border-theme-cosmic">
                    <div className="flex items-center justify-between">
                      <span className="text-theme-secondary">Status</span>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        order.status === 'completed'
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {order.status === 'completed' ? 'Completed' : 'In Progress'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>

          {/* Reading Interface */}
          <motion.div
            variants={itemVariants}
            initial="hidden"
            animate="visible"
            className="lg:col-span-2"
          >
            <div className="bg-theme-card backdrop-blur-lg border border-theme-cosmic rounded-2xl p-6">
              <h2 className="text-xl font-bold text-theme-primary mb-6">Provide Reading</h2>

              {/* Reading Format Tabs */}
              <div className="flex mb-6 space-x-1 bg-theme-card/50 rounded-lg p-1">
                <button className="flex-1 px-4 py-2 bg-cosmic-gradient text-theme-inverse rounded-md font-medium text-sm">
                  <FileText className="w-4 h-4 mr-2 inline" />
                  Written Reading
                </button>
                <button className="flex-1 px-4 py-2 text-theme-secondary hover:text-theme-primary rounded-md font-medium text-sm transition-colors">
                  <Mic className="w-4 h-4 mr-2 inline" />
                  Audio Reading
                </button>
              </div>

              {/* Written Reading */}
              <div className="space-y-4">
                <div>
                  <label className="block text-theme-secondary text-sm mb-2">
                    Your Reading for the Client
                  </label>
                  <textarea
                    value={readingText}
                    onChange={(e) => setReadingText(e.target.value)}
                    placeholder="Begin your spiritual guidance here... Share what the cards, stars, or energy reveals about their question. Be detailed, compassionate, and specific to their situation."
                    className="w-full h-64 bg-theme-card border border-theme-cosmic rounded-lg p-4 text-theme-primary placeholder-theme-muted focus:border-gold-primary focus:outline-none transition-colors duration-300 resize-none"
                    disabled={order?.status === 'completed'}
                  />
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-theme-muted text-xs">
                      {readingText.length} characters
                    </span>
                    <span className="text-theme-muted text-xs">
                      Minimum 200 characters recommended
                    </span>
                  </div>
                </div>

                {/* Audio Upload */}
                <div className="border-t border-theme-cosmic pt-4">
                  <label className="block text-theme-secondary text-sm mb-2">
                    Optional: Audio Recording
                  </label>
                  <div className="flex items-center space-x-4">
                    <label className="flex items-center px-4 py-2 bg-theme-card border border-theme-cosmic rounded-lg cursor-pointer hover:border-gold-primary transition-colors duration-300">
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Audio
                      <input
                        type="file"
                        accept="audio/*"
                        onChange={handleAudioUpload}
                        className="hidden"
                        disabled={order?.status === 'completed'}
                      />
                    </label>

                    <button
                      onClick={() => setIsRecording(!isRecording)}
                      disabled={order?.status === 'completed'}
                      className={`flex items-center px-4 py-2 rounded-lg font-medium transition-all duration-300 ${
                        isRecording
                          ? 'bg-red-500 hover:bg-red-600 text-white'
                          : 'bg-theme-card border border-theme-cosmic text-theme-primary hover:border-gold-primary'
                      }`}
                    >
                      {isRecording ? (
                        <>
                          <MicOff className="w-4 h-4 mr-2" />
                          Stop Recording
                        </>
                      ) : (
                        <>
                          <Mic className="w-4 h-4 mr-2" />
                          Start Recording
                        </>
                      )}
                    </button>
                  </div>

                  {audioFile && (
                    <div className="mt-3 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                      <div className="flex items-center">
                        <CheckCircle className="w-4 h-4 text-green-400 mr-2" />
                        <span className="text-green-400 text-sm">Audio file ready: {audioFile.name}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Reading Guidelines */}
                <div className="bg-gold-primary/10 border border-gold-primary/20 rounded-lg p-4">
                  <h4 className="font-medium text-theme-primary mb-2">Reading Guidelines</h4>
                  <ul className="text-theme-secondary text-sm space-y-1">
                    <li>• Be specific and detailed in your interpretation</li>
                    <li>• Address the client's question directly</li>
                    <li>• Provide actionable guidance and insights</li>
                    <li>• Maintain a compassionate and supportive tone</li>
                    <li>• Include both challenges and opportunities</li>
                  </ul>
                </div>

                {/* Action Buttons */}
                {order?.status !== 'completed' && (
                  <div className="flex flex-col sm:flex-row gap-4 pt-6">
                    <button
                      onClick={handleSaveDraft}
                      disabled={saving}
                      className="flex-1 px-6 py-3 bg-transparent border border-theme-cosmic text-theme-primary hover:bg-theme-cosmic hover:text-theme-inverse font-medium rounded-lg transition-all duration-300"
                    >
                      {saving ? (
                        <>
                          <div className="w-4 h-4 border-2 border-theme-primary border-t-transparent rounded-full animate-spin mr-2 inline-block"></div>
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2 inline" />
                          Save Draft
                        </>
                      )}
                    </button>

                    <button
                      onClick={handleSubmitReading}
                      disabled={submitting || !readingText.trim()}
                      className="flex-1 px-6 py-3 bg-cosmic-gradient hover:shadow-theme-cosmic text-theme-inverse font-bold rounded-lg transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                    >
                      {submitting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-theme-inverse border-t-transparent rounded-full animate-spin mr-2 inline-block"></div>
                          Submitting...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4 mr-2 inline" />
                          Complete & Send Reading
                        </>
                      )}
                    </button>
                  </div>
                )}

                {order?.status === 'completed' && (
                  <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 text-center">
                    <CheckCircle className="w-8 h-8 text-green-400 mx-auto mb-2" />
                    <p className="text-green-400 font-medium">Reading Completed & Delivered</p>
                    <p className="text-theme-secondary text-sm mt-1">
                      This reading has been sent to the client
                    </p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>

        </div>

      </div>
    </div>
  );
};

export default ReaderOrder;