import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Phone, Clock, AlertTriangle, Heart, User, MessageCircle,
  X, Send, ChevronRight, Wifi, WifiOff
} from 'lucide-react';
import { getRTLClasses, getMobileRowClasses } from '../../utils/rtlUtils';
import { useResponsive } from '../../hooks/useResponsive';

const EmergencyCallButton = ({ isVisible = true, onRequestCreated }) => {
  const [showModal, setShowModal] = useState(false);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [availableReaders, setAvailableReaders] = useState([]);
  const [formData, setFormData] = useState({
    request_type: 'immediate',
    urgency_level: 'medium',
    topic_category: '',
    brief_description: '',
    max_budget_usd: '',
    preferred_language: 'en'
  });
  const { isMobile } = useResponsive();
  const [hasConnection, setHasConnection] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setHasConnection(true);
    const handleOffline = () => setHasConnection(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (showModal && step === 2) {
      fetchAvailableReaders();
    }
  }, [showModal, step, formData.preferred_language]);

  const fetchAvailableReaders = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        preferred_language: formData.preferred_language,
        max_response_time: formData.request_type === 'immediate' ? '15' : '30'
      });

      const response = await fetch(`/api/reader-availability/emergency/available?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAvailableReaders(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching available readers:', error);
      setAvailableReaders([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitRequest = async () => {
    try {
      setLoading(true);
      
      const response = await fetch('/api/reader-availability/emergency/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (response.ok) {
        onRequestCreated?.(data.data);
        setShowModal(false);
        setStep(1);
        setFormData({
          request_type: 'immediate',
          urgency_level: 'medium',
          topic_category: '',
          brief_description: '',
          max_budget_usd: '',
          preferred_language: 'en'
        });
      } else {
        alert(data.error || 'Failed to create emergency request');
      }
    } catch (error) {
      console.error('Error creating emergency request:', error);
      alert('Failed to create emergency request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getUrgencyColor = (level) => {
    switch (level) {
      case 'critical': return 'text-red-400 bg-red-500/10 border-red-500/30';
      case 'high': return 'text-orange-400 bg-orange-500/10 border-orange-500/30';
      case 'medium': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30';
      case 'low': return 'text-green-400 bg-green-500/10 border-green-500/30';
      default: return 'text-cosmic-text bg-cosmic-panel/10 border-cosmic-accent/30';
    }
  };

  const getRequestTypeIcon = (type) => {
    switch (type) {
      case 'immediate': return <AlertTriangle className="w-4 h-4" />;
      case 'within_15min': return <Clock className="w-4 h-4" />;
      case 'within_30min': return <Phone className="w-4 h-4" />;
      default: return <Phone className="w-4 h-4" />;
    }
  };

  if (!isVisible) return null;

  return (
    <>
      {/* Emergency Button */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setShowModal(true)}
        className={`
          fixed bottom-6 right-6 z-40 w-16 h-16 bg-gradient-to-r from-red-500 to-red-600 
          hover:from-red-600 hover:to-red-700 rounded-full shadow-2xl 
          flex items-center justify-center text-white transition-all duration-300
          ${!hasConnection ? 'opacity-50 cursor-not-allowed' : ''}
        `}
        disabled={!hasConnection}
      >
        <div className="relative">
          <Phone className="w-6 h-6" />
          {!hasConnection && <WifiOff className="absolute -top-1 -right-1 w-3 h-3" />}
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute inset-0 bg-red-500 rounded-full opacity-30"
          />
        </div>
      </motion.button>

      {/* Emergency Request Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={(e) => e.target === e.currentTarget && setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className={`
                bg-cosmic-dark border border-red-500/30 rounded-xl w-full max-w-md max-h-[90vh] 
                overflow-y-auto ${getRTLClasses()}
              `}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-red-500/30">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center">
                    <Phone className="w-5 h-5 text-red-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Emergency Call</h3>
                    <p className="text-cosmic-text/60 text-sm">
                      Connect with an available reader
                    </p>
                  </div>
                </div>
                
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 text-cosmic-text/60 hover:text-white rounded-lg hover:bg-cosmic-panel/20 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Step Indicator */}
              <div className="flex items-center justify-center p-4 border-b border-cosmic-accent/20">
                <div className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                    step >= 1 ? 'bg-red-500 text-white' : 'bg-cosmic-panel/30 text-cosmic-text/60'
                  }`}>
                    1
                  </div>
                  <div className={`w-8 h-0.5 ${step >= 2 ? 'bg-red-500' : 'bg-cosmic-panel/30'}`} />
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                    step >= 2 ? 'bg-red-500 text-white' : 'bg-cosmic-panel/30 text-cosmic-text/60'
                  }`}>
                    2
                  </div>
                  <div className={`w-8 h-0.5 ${step >= 3 ? 'bg-red-500' : 'bg-cosmic-panel/30'}`} />
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                    step >= 3 ? 'bg-red-500 text-white' : 'bg-cosmic-panel/30 text-cosmic-text/60'
                  }`}>
                    3
                  </div>
                </div>
              </div>

              {/* Step Content */}
              <div className="p-6">
                <AnimatePresence mode="wait">
                  {step === 1 && (
                    <motion.div
                      key="step1"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-6"
                    >
                      <h4 className="font-semibold text-white mb-4">Request Details</h4>

                      {/* Request Type */}
                      <div>
                        <label className="block text-sm font-medium text-cosmic-text mb-2">
                          Response Time
                        </label>
                        <div className="space-y-2">
                          {[
                            { value: 'immediate', label: 'Immediate (within 5 min)', icon: AlertTriangle },
                            { value: 'within_15min', label: 'Within 15 minutes', icon: Clock },
                            { value: 'within_30min', label: 'Within 30 minutes', icon: Phone }
                          ].map(option => {
                            const Icon = option.icon;
                            return (
                              <button
                                key={option.value}
                                onClick={() => setFormData(prev => ({ ...prev, request_type: option.value }))}
                                className={`
                                  w-full p-3 rounded-lg border transition-all duration-200 flex items-center gap-3
                                  ${formData.request_type === option.value
                                    ? 'border-red-500 bg-red-500/10 text-red-400'
                                    : 'border-cosmic-accent/30 bg-cosmic-panel/10 text-cosmic-text hover:border-cosmic-accent/50'
                                  }
                                `}
                              >
                                <Icon className="w-4 h-4" />
                                <span className="text-sm font-medium">{option.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Urgency Level */}
                      <div>
                        <label className="block text-sm font-medium text-cosmic-text mb-2">
                          Urgency Level
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { value: 'low', label: 'Low' },
                            { value: 'medium', label: 'Medium' },
                            { value: 'high', label: 'High' },
                            { value: 'critical', label: 'Critical' }
                          ].map(option => (
                            <button
                              key={option.value}
                              onClick={() => setFormData(prev => ({ ...prev, urgency_level: option.value }))}
                              className={`
                                p-2 rounded-lg border text-sm transition-all duration-200
                                ${formData.urgency_level === option.value
                                  ? getUrgencyColor(option.value)
                                  : 'border-cosmic-accent/30 bg-cosmic-panel/10 text-cosmic-text hover:border-cosmic-accent/50'
                                }
                              `}
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Topic Category */}
                      <div>
                        <label className="block text-sm font-medium text-cosmic-text mb-2">
                          Topic Category
                        </label>
                        <select
                          value={formData.topic_category}
                          onChange={(e) => setFormData(prev => ({ ...prev, topic_category: e.target.value }))}
                          className="w-full px-3 py-2 bg-cosmic-dark/50 border border-cosmic-accent/30 rounded-lg text-cosmic-text focus:border-red-500 focus:outline-none"
                        >
                          <option value="">Select category</option>
                          <option value="love">Love & Relationships</option>
                          <option value="career">Career & Finance</option>
                          <option value="spiritual">Spiritual Guidance</option>
                          <option value="health">Health & Wellness</option>
                          <option value="family">Family & Friends</option>
                          <option value="general">General Reading</option>
                        </select>
                      </div>

                      {/* Brief Description */}
                      <div>
                        <label className="block text-sm font-medium text-cosmic-text mb-2">
                          Brief Description
                        </label>
                        <textarea
                          value={formData.brief_description}
                          onChange={(e) => setFormData(prev => ({ ...prev, brief_description: e.target.value }))}
                          placeholder="Briefly describe what you need guidance on..."
                          className="w-full px-3 py-2 bg-cosmic-dark/50 border border-cosmic-accent/30 rounded-lg text-cosmic-text placeholder-cosmic-text/50 focus:border-red-500 focus:outline-none resize-none"
                          rows="3"
                          maxLength="500"
                        />
                        <p className="text-xs text-cosmic-text/50 mt-1">
                          {formData.brief_description.length}/500 characters
                        </p>
                      </div>
                    </motion.div>
                  )}

                  {step === 2 && (
                    <motion.div
                      key="step2"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-6"
                    >
                      <h4 className="font-semibold text-white mb-4">Available Readers</h4>

                      {loading ? (
                        <div className="text-center py-8">
                          <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                          <p className="text-cosmic-text/60">Finding available readers...</p>
                        </div>
                      ) : availableReaders.length === 0 ? (
                        <div className="text-center py-8">
                          <AlertTriangle className="w-12 h-12 text-red-400/50 mx-auto mb-4" />
                          <p className="text-cosmic-text/60 mb-2">No readers available for emergency calls</p>
                          <p className="text-cosmic-text/40 text-sm">
                            Please try again later or book a regular session
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {availableReaders.map(reader => (
                            <div
                              key={reader.reader_id}
                              className={`${getMobileRowClasses()} bg-cosmic-panel/20 border border-cosmic-accent/30 rounded-lg p-4`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 bg-cosmic-accent/20 rounded-lg flex items-center justify-center">
                                    <User className="w-5 h-5 text-cosmic-accent" />
                                  </div>
                                  <div>
                                    <h5 className="font-medium text-cosmic-text">
                                      {reader.display_name}
                                    </h5>
                                    <p className="text-cosmic-text/60 text-sm">
                                      Response: {reader.emergency_response_time_minutes} min
                                    </p>
                                  </div>
                                </div>
                                
                                <div className="text-right">
                                  <p className="text-sm font-medium text-cosmic-accent">
                                    {reader.emergency_rate_multiplier}x rate
                                  </p>
                                  <p className="text-xs text-cosmic-text/50">
                                    {reader.estimated_availability}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Budget */}
                      <div>
                        <label className="block text-sm font-medium text-cosmic-text mb-2">
                          Maximum Budget (USD)
                        </label>
                        <input
                          type="number"
                          value={formData.max_budget_usd}
                          onChange={(e) => setFormData(prev => ({ ...prev, max_budget_usd: e.target.value }))}
                          placeholder="Optional budget limit"
                          className="w-full px-3 py-2 bg-cosmic-dark/50 border border-cosmic-accent/30 rounded-lg text-cosmic-text placeholder-cosmic-text/50 focus:border-red-500 focus:outline-none"
                          min="0"
                          step="0.01"
                        />
                      </div>
                    </motion.div>
                  )}

                  {step === 3 && (
                    <motion.div
                      key="step3"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-6"
                    >
                      <h4 className="font-semibold text-white mb-4">Confirm Request</h4>

                      <div className="bg-cosmic-panel/10 border border-cosmic-accent/20 rounded-lg p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-cosmic-text/70">Response Time:</span>
                          <span className="text-cosmic-text font-medium">
                            {formData.request_type.replace('_', ' ')}
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-cosmic-text/70">Urgency:</span>
                          <span className={`px-2 py-1 rounded border ${getUrgencyColor(formData.urgency_level)}`}>
                            {formData.urgency_level}
                          </span>
                        </div>
                        
                        {formData.topic_category && (
                          <div className="flex items-center justify-between">
                            <span className="text-cosmic-text/70">Category:</span>
                            <span className="text-cosmic-text font-medium">
                              {formData.topic_category}
                            </span>
                          </div>
                        )}
                        
                        {formData.max_budget_usd && (
                          <div className="flex items-center justify-between">
                            <span className="text-cosmic-text/70">Budget:</span>
                            <span className="text-cosmic-text font-medium">
                              ${formData.max_budget_usd} USD
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                          <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-yellow-400 font-medium text-sm mb-1">
                              Emergency Call Notice
                            </p>
                            <p className="text-yellow-400/80 text-xs">
                              Emergency calls may have higher rates. You'll be notified of the final cost before the call begins.
                            </p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Footer Actions */}
              <div className="flex items-center justify-between p-6 border-t border-cosmic-accent/20">
                {step > 1 && (
                  <button
                    onClick={() => setStep(step - 1)}
                    className="px-4 py-2 bg-cosmic-panel/20 hover:bg-cosmic-panel/30 border border-cosmic-accent/30 rounded-lg text-cosmic-text transition-colors"
                  >
                    Back
                  </button>
                )}
                
                <div className="flex-1" />
                
                {step < 3 ? (
                  <button
                    onClick={() => setStep(step + 1)}
                    disabled={step === 1 && (!formData.request_type || !formData.urgency_level)}
                    className="flex items-center gap-2 px-6 py-2 bg-red-500 hover:bg-red-600 disabled:bg-red-500/30 disabled:cursor-not-allowed rounded-lg text-white font-medium transition-colors"
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={handleSubmitRequest}
                    disabled={loading}
                    className="flex items-center gap-2 px-6 py-2 bg-red-500 hover:bg-red-600 disabled:bg-red-500/30 disabled:cursor-not-allowed rounded-lg text-white font-medium transition-colors"
                  >
                    {loading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Send Request
                      </>
                    )}
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default EmergencyCallButton;