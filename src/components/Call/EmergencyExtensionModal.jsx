import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  AlertTriangle, Clock, DollarSign, CheckCircle, X, 
  CreditCard, Zap, Shield, Eye
} from 'lucide-react';
import { getRTLClasses } from '../../utils/rtlUtils';

const EmergencyExtensionModal = ({ 
  isOpen, 
  onClose, 
  onSubmit, 
  sessionId,
  extensionCount = 0,
  timeRemaining = 0 
}) => {
  const [loading, setLoading] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState(15);
  const [emergencyReason, setEmergencyReason] = useState('');
  const [customDuration, setCustomDuration] = useState('');
  const [useCustomDuration, setUseCustomDuration] = useState(false);

  // Extension pricing logic (progressive pricing)
  const baseRate = 5.00; // $5 base rate
  const extensionMultiplier = (extensionCount + 1); // 1st = $5, 2nd = $10, 3rd = $15, etc.
  const ratePerMinute = baseRate * extensionMultiplier;

  const predefinedDurations = [
    { minutes: 10, label: '10 minutes' },
    { minutes: 15, label: '15 minutes' },
    { minutes: 30, label: '30 minutes' },
    { minutes: 60, label: '1 hour' }
  ];

  const calculateCost = (minutes) => {
    return (ratePerMinute * minutes).toFixed(2);
  };

  const isFirstExtension = extensionCount === 0;
  const finalDuration = useCustomDuration ? parseInt(customDuration) || 0 : selectedDuration;
  const totalCost = calculateCost(finalDuration);

  const handleSubmit = async () => {
    try {
      setLoading(true);

      if (!emergencyReason.trim()) {
        alert('Please provide a reason for the emergency extension.');
        return;
      }

      if (finalDuration <= 0 || finalDuration > 120) {
        alert('Extension duration must be between 1 and 120 minutes.');
        return;
      }

      const response = await fetch(`/api/calls/sessions/${sessionId}/emergency-extension`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          additional_minutes: finalDuration,
          emergency_reason: emergencyReason.trim()
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to request extension');
      }

      const result = await response.json();
      
      onSubmit({
        additional_minutes: finalDuration,
        emergency_reason: emergencyReason.trim(),
        cost: totalCost,
        extension_id: result.data.id,
        approval_status: result.data.approval_status
      });

    } catch (error) {
      console.error('Emergency extension error:', error);
      alert(`Failed to request emergency extension: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const formatTimeRemaining = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className={`bg-cosmic-dark border border-orange-500/30 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto ${getRTLClasses()}`}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-orange-500/30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-500/20 border border-orange-500/30 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">
                  Emergency Extension Request
                </h3>
                <p className="text-cosmic-text/60 text-sm">
                  Extend your current call session
                </p>
              </div>
            </div>
            
            <button
              onClick={onClose}
              className="p-2 text-cosmic-text/60 hover:text-cosmic-text rounded-lg hover:bg-cosmic-panel/20 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Current Status */}
            <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-orange-400 mb-2">Current Call Status</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-cosmic-text/60">Time Remaining:</span>
                      <span className="text-white ml-2 font-medium">
                        {formatTimeRemaining(timeRemaining)}
                      </span>
                    </div>
                    <div>
                      <span className="text-cosmic-text/60">Extensions:</span>
                      <span className="text-white ml-2 font-medium">
                        {extensionCount}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Extension Approval Notice */}
            {isFirstExtension ? (
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-green-400 mb-1">Auto-Approval Available</h4>
                    <p className="text-cosmic-text/70 text-sm">
                      Your first emergency extension will be automatically approved and activated immediately.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Eye className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-yellow-400 mb-1">Manual Approval Required</h4>
                    <p className="text-cosmic-text/70 text-sm">
                      Additional extensions require admin approval. Your call will continue while we review your request.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Duration Selection */}
            <div className="space-y-4">
              <h4 className="font-semibold text-white flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Extension Duration
              </h4>

              {/* Predefined Durations */}
              <div className="grid grid-cols-2 gap-3">
                {predefinedDurations.map((duration) => (
                  <button
                    key={duration.minutes}
                    onClick={() => {
                      setSelectedDuration(duration.minutes);
                      setUseCustomDuration(false);
                    }}
                    className={`p-3 rounded-lg border text-center transition-colors ${
                      !useCustomDuration && selectedDuration === duration.minutes
                        ? 'border-orange-500 bg-orange-500/10 text-orange-400'
                        : 'border-cosmic-accent/30 bg-cosmic-panel/20 text-cosmic-text hover:border-orange-500/50'
                    }`}
                  >
                    <div className="font-medium">{duration.label}</div>
                    <div className="text-sm opacity-70">${calculateCost(duration.minutes)}</div>
                  </button>
                ))}
              </div>

              {/* Custom Duration */}
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useCustomDuration}
                    onChange={(e) => {
                      setUseCustomDuration(e.target.checked);
                      if (e.target.checked) {
                        setCustomDuration('');
                      }
                    }}
                    className="w-4 h-4 text-orange-400 bg-cosmic-dark border-orange-500/30 rounded focus:ring-orange-400"
                  />
                  <span className="text-cosmic-text font-medium">Custom duration</span>
                </label>

                {useCustomDuration && (
                  <div className="flex gap-3">
                    <input
                      type="number"
                      min="1"
                      max="120"
                      value={customDuration}
                      onChange={(e) => setCustomDuration(e.target.value)}
                      placeholder="Minutes"
                      className="flex-1 px-3 py-2 bg-cosmic-panel border border-cosmic-accent/30 rounded-lg text-cosmic-text placeholder-cosmic-text/50 focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                    />
                    <div className="px-3 py-2 bg-cosmic-panel/50 border border-cosmic-accent/30 rounded-lg text-cosmic-text/60 min-w-[80px] text-center">
                      ${customDuration ? calculateCost(parseInt(customDuration) || 0) : '0.00'}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Emergency Reason */}
            <div className="space-y-3">
              <label className="block font-semibold text-white">
                Emergency Reason *
              </label>
              <textarea
                value={emergencyReason}
                onChange={(e) => setEmergencyReason(e.target.value)}
                placeholder="Please describe why you need to extend this call session..."
                rows={3}
                className="w-full px-3 py-2 bg-cosmic-panel border border-cosmic-accent/30 rounded-lg text-cosmic-text placeholder-cosmic-text/50 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 resize-none"
                required
              />
              <p className="text-cosmic-text/60 text-sm">
                This information helps our team process your request quickly.
              </p>
            </div>

            {/* Pricing Summary */}
            <div className="bg-cosmic-panel/20 border border-cosmic-accent/30 rounded-lg p-4">
              <h4 className="font-semibold text-cosmic-text mb-3 flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Extension Pricing
              </h4>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-cosmic-text/60">Duration:</span>
                  <span className="text-cosmic-text font-medium">{finalDuration} minutes</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-cosmic-text/60">Rate per minute:</span>
                  <span className="text-cosmic-text font-medium">${ratePerMinute.toFixed(2)}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-cosmic-text/60">Extension #{extensionCount + 1}:</span>
                  <span className="text-cosmic-text/60">
                    {extensionMultiplier}x rate multiplier
                  </span>
                </div>
                
                <div className="border-t border-cosmic-accent/30 pt-2 mt-2">
                  <div className="flex justify-between items-center">
                    <span className="text-cosmic-text font-semibold">Total Cost:</span>
                    <span className="text-orange-400 font-bold text-lg">${totalCost}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Legal Notice */}
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="text-blue-400 text-sm">
                  <p className="font-medium mb-1">Emergency Extension Policy</p>
                  <ul className="opacity-90 space-y-1">
                    <li>• Emergency extensions are charged at progressive rates</li>
                    <li>• First extension is auto-approved, subsequent ones require review</li>
                    <li>• Extensions are charged immediately upon approval</li>
                    <li>• Refunds are available only if extension is denied</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-orange-500/30">
            <div className="text-cosmic-text/60 text-sm">
              <CreditCard className="inline w-4 h-4 mr-1" />
              Payment processed securely
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-cosmic-panel/20 hover:bg-cosmic-panel/30 border border-cosmic-accent/30 rounded-lg text-cosmic-text transition-colors"
              >
                Cancel
              </button>
              
              <button
                onClick={handleSubmit}
                disabled={loading || !emergencyReason.trim() || finalDuration <= 0}
                className="flex items-center gap-2 px-6 py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-500/30 disabled:cursor-not-allowed rounded-lg text-white font-medium transition-colors"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    Request Extension (${totalCost})
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default EmergencyExtensionModal;