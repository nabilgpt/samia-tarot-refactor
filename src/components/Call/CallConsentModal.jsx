import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, Video, Mic, Record, AlertTriangle, CheckCircle,
  Clock, Users, Lock, Eye, FileText, X
} from 'lucide-react';
import { getRTLClasses } from '../../utils/rtlUtils';

const CallConsentModal = ({ 
  isOpen, 
  onClose, 
  onConsent, 
  sessionDetails,
  consentType = 'call_participation' // 'call_participation', 'recording', 'emergency_extension'
}) => {
  const [consents, setConsents] = useState({
    call_participation: false,
    recording: false,
    data_sharing: false,
    terms_of_service: false
  });
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

  const consentTexts = {
    call_participation: {
      title: 'Video Call Participation Consent',
      description: 'Please review and consent to participate in this video call session.',
      icon: Video,
      color: 'blue',
      items: [
        'I consent to participate in this video/audio call session',
        'I understand this is a professional tarot reading session',
        'I confirm I am 18 years or older',
        'I agree to maintain respectful communication throughout the session'
      ]
    },
    recording: {
      title: 'Call Recording Consent',
      description: 'This session will be recorded and permanently stored for quality and legal purposes.',
      icon: Record,
      color: 'red',
      items: [
        'I consent to having this call session recorded',
        'I understand recordings are permanently stored for legal compliance',
        'I acknowledge recordings may be used for quality assurance',
        'I understand I can request access to my recordings'
      ]
    },
    emergency_extension: {
      title: 'Emergency Session Extension',
      description: 'Request to extend the current session for emergency purposes.',
      icon: AlertTriangle,
      color: 'orange',
      items: [
        'I understand this is an emergency extension with additional charges',
        'I consent to extending the session beyond the original duration',
        'I acknowledge emergency extension rates apply',
        'I confirm this extension is necessary for my situation'
      ]
    }
  };

  const currentConsent = consentTexts[consentType];

  const handleConsentChange = (consentKey, value) => {
    setConsents(prev => ({
      ...prev,
      [consentKey]: value
    }));
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);

      // Validate required consents based on type
      const requiredConsents = {
        call_participation: ['call_participation', 'terms_of_service'],
        recording: ['recording', 'data_sharing'],
        emergency_extension: ['call_participation']
      };

      const required = requiredConsents[consentType] || [];
      const missingConsents = required.filter(key => !consents[key]);

      if (missingConsents.length > 0) {
        alert('Please provide all required consents to continue.');
        return;
      }

      // Call the consent handler
      await onConsent({
        consent_type: consentType,
        consents: consents,
        timestamp: new Date().toISOString(),
        session_details: sessionDetails
      });

      onClose();
    } catch (error) {
      console.error('Consent submission error:', error);
      alert('Failed to submit consent. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getConsentColor = (color) => {
    const colors = {
      blue: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
      red: 'text-red-400 bg-red-500/10 border-red-500/30',
      orange: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
      green: 'text-green-400 bg-green-500/10 border-green-500/30'
    };
    return colors[color] || colors.blue;
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
          className={`bg-cosmic-dark border border-cosmic-accent/30 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto ${getRTLClasses()}`}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-cosmic-accent/30">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getConsentColor(currentConsent.color)}`}>
                <currentConsent.icon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-cosmic-text">
                  {currentConsent.title}
                </h3>
                <p className="text-cosmic-text/60 text-sm">
                  Legal consent required to proceed
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
            {/* Description */}
            <div className={`p-4 rounded-lg border ${getConsentColor(currentConsent.color)}`}>
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold mb-2">Important Legal Notice</h4>
                  <p className="text-sm opacity-90">
                    {currentConsent.description}
                  </p>
                </div>
              </div>
            </div>

            {/* Session Details */}
            {sessionDetails && (
              <div className="bg-cosmic-panel/20 border border-cosmic-accent/30 rounded-lg p-4">
                <h4 className="font-semibold text-cosmic-text mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Session Details
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-cosmic-text/60">Session Type:</span>
                    <span className="text-cosmic-text ml-2 font-medium">
                      {sessionDetails.call_type || 'Video Call'}
                    </span>
                  </div>
                  
                  <div>
                    <span className="text-cosmic-text/60">Duration:</span>
                    <span className="text-cosmic-text ml-2 font-medium">
                      {sessionDetails.max_duration_minutes || 60} minutes
                    </span>
                  </div>
                  
                  <div>
                    <span className="text-cosmic-text/60">Recording:</span>
                    <span className="text-cosmic-text ml-2 font-medium">
                      {sessionDetails.recording_enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                  
                  <div>
                    <span className="text-cosmic-text/60">Emergency Session:</span>
                    <span className="text-cosmic-text ml-2 font-medium">
                      {sessionDetails.is_emergency_session ? 'Yes' : 'No'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Consent Items */}
            <div className="space-y-4">
              <h4 className="font-semibold text-cosmic-text flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Required Consents
              </h4>

              {/* Call Participation Consent */}
              {(consentType === 'call_participation' || consentType === 'emergency_extension') && (
                <div className="space-y-3">
                  <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg border border-cosmic-accent/20 hover:border-cosmic-accent/40 transition-colors">
                    <input
                      type="checkbox"
                      checked={consents.call_participation}
                      onChange={(e) => handleConsentChange('call_participation', e.target.checked)}
                      className="w-4 h-4 mt-1 text-cosmic-accent bg-cosmic-dark border-cosmic-accent/30 rounded focus:ring-cosmic-accent"
                    />
                    <div className="flex-1">
                      <p className="text-cosmic-text font-medium mb-2">
                        Call Participation Consent *
                      </p>
                      <ul className="text-cosmic-text/70 text-sm space-y-1">
                        {consentTexts.call_participation.items.map((item, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <span className="text-cosmic-accent mt-1">•</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </label>
                </div>
              )}

              {/* Recording Consent */}
              {(consentType === 'recording' || (sessionDetails?.recording_enabled && consentType === 'call_participation')) && (
                <div className="space-y-3">
                  <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg border border-red-500/20 hover:border-red-500/40 transition-colors">
                    <input
                      type="checkbox"
                      checked={consents.recording}
                      onChange={(e) => handleConsentChange('recording', e.target.checked)}
                      className="w-4 h-4 mt-1 text-red-400 bg-cosmic-dark border-red-500/30 rounded focus:ring-red-400"
                    />
                    <div className="flex-1">
                      <p className="text-red-400 font-medium mb-2 flex items-center gap-2">
                        <Record className="w-4 h-4" />
                        Recording Consent *
                      </p>
                      <ul className="text-cosmic-text/70 text-sm space-y-1">
                        {consentTexts.recording.items.map((item, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <span className="text-red-400 mt-1">•</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </label>
                </div>
              )}

              {/* Data Sharing Consent */}
              {consentType === 'recording' && (
                <div className="space-y-3">
                  <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg border border-cosmic-accent/20 hover:border-cosmic-accent/40 transition-colors">
                    <input
                      type="checkbox"
                      checked={consents.data_sharing}
                      onChange={(e) => handleConsentChange('data_sharing', e.target.checked)}
                      className="w-4 h-4 mt-1 text-cosmic-accent bg-cosmic-dark border-cosmic-accent/30 rounded focus:ring-cosmic-accent"
                    />
                    <div className="flex-1">
                      <p className="text-cosmic-text font-medium mb-2">
                        Data Sharing Consent *
                      </p>
                      <div className="text-cosmic-text/70 text-sm space-y-1">
                        <p>I understand that call recordings may be:</p>
                        <ul className="ml-4 space-y-1">
                          <li>• Stored securely for legal compliance</li>
                          <li>• Shared with quality assurance teams</li>
                          <li>• Used for training purposes (anonymized)</li>
                          <li>• Provided to legal authorities if required</li>
                        </ul>
                      </div>
                    </div>
                  </label>
                </div>
              )}

              {/* Terms of Service */}
              <div className="space-y-3">
                <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg border border-cosmic-accent/20 hover:border-cosmic-accent/40 transition-colors">
                  <input
                    type="checkbox"
                    checked={consents.terms_of_service}
                    onChange={(e) => handleConsentChange('terms_of_service', e.target.checked)}
                    className="w-4 h-4 mt-1 text-cosmic-accent bg-cosmic-dark border-cosmic-accent/30 rounded focus:ring-cosmic-accent"
                  />
                  <div className="flex-1">
                    <p className="text-cosmic-text font-medium mb-2">
                      Terms of Service Agreement *
                    </p>
                    <div className="text-cosmic-text/70 text-sm">
                      <p>
                        I have read and agree to the{' '}
                        <a href="/terms" target="_blank" className="text-cosmic-accent hover:underline">
                          Terms of Service
                        </a>{' '}
                        and{' '}
                        <a href="/privacy" target="_blank" className="text-cosmic-accent hover:underline">
                          Privacy Policy
                        </a>
                        .
                      </p>
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {/* Legal Notice */}
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                <div className="text-yellow-400 text-sm">
                  <p className="font-medium mb-1">Legal Compliance Notice</p>
                  <p className="opacity-90">
                    Your consent is recorded with timestamp, IP address, and device information 
                    for legal compliance. This information is stored securely and used only for 
                    verification purposes.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-cosmic-accent/30">
            <div className="text-cosmic-text/60 text-sm">
              <Lock className="inline w-4 h-4 mr-1" />
              Consent data is encrypted and secured
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
                disabled={loading}
                className="flex items-center gap-2 px-6 py-2 bg-cosmic-accent hover:bg-cosmic-accent/80 disabled:bg-cosmic-accent/30 disabled:cursor-not-allowed rounded-lg text-white font-medium transition-colors"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Grant Consent
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

export default CallConsentModal;