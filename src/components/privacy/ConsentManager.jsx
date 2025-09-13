import { useState, useEffect } from 'react';

export const ConsentManager = ({ userId, onConsentUpdate }) => {
  const [consents, setConsents] = useState({
    data_processing: 'not_required',
    marketing: 'withdrawn',
    analytics: 'withdrawn', 
    ai_assistance: 'withdrawn',
    third_party_sharing: 'withdrawn'
  });
  
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (userId) {
      fetchCurrentConsents();
    }
  }, [userId]);

  const fetchCurrentConsents = async () => {
    try {
      const response = await fetch('/api/dsr/compliance/status', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        if (data.consents) {
          setConsents(data.consents);
        }
      }
    } catch (error) {
      console.error('Failed to fetch consent status:', error);
    }
  };

  const updateConsent = async (consentType, status) => {
    setLoading(true);
    try {
      const response = await fetch('/api/dsr/compliance/consent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          consent_type: consentType,
          status: status,
          consent_version: '1.0'
        })
      });

      if (response.ok) {
        setConsents(prev => ({
          ...prev,
          [consentType]: status
        }));
        onConsentUpdate?.(consentType, status);
      }
    } catch (error) {
      console.error('Failed to update consent:', error);
    } finally {
      setLoading(false);
    }
  };

  const consentLabels = {
    data_processing: 'Essential Data Processing',
    marketing: 'Marketing Communications', 
    analytics: 'Usage Analytics',
    ai_assistance: 'AI-Powered Features',
    third_party_sharing: 'Third-Party Integrations'
  };

  const consentDescriptions = {
    data_processing: 'Required for core service functionality',
    marketing: 'Promotional emails and offers',
    analytics: 'Anonymous usage statistics to improve our service',
    ai_assistance: 'Enhanced features using AI technology',
    third_party_sharing: 'Sharing data with trusted partners for service delivery'
  };

  return (
    <div className="consent-manager space-y-6">
      <div className="cosmic-card p-6">
        <h3 className="text-xl font-semibold text-cosmic-purple mb-4">
          Privacy Consent Management
        </h3>
        <p className="text-cosmic-text mb-6">
          Manage your privacy preferences and control how your data is used. 
          Changes take effect immediately.
        </p>

        <div className="space-y-4">
          {Object.entries(consentLabels).map(([type, label]) => (
            <div key={type} className="consent-item border border-cosmic-purple/20 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-medium text-cosmic-purple">{label}</h4>
                  <p className="text-sm text-cosmic-text-muted mt-1">
                    {consentDescriptions[type]}
                  </p>
                  {type === 'data_processing' && (
                    <span className="inline-block mt-2 text-xs text-cosmic-accent px-2 py-1 rounded bg-cosmic-accent/10">
                      Required for Service
                    </span>
                  )}
                </div>
                <div className="ml-4 flex items-center space-x-2">
                  {type !== 'data_processing' && (
                    <>
                      <button
                        onClick={() => updateConsent(type, 'given')}
                        disabled={loading || consents[type] === 'given'}
                        className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                          consents[type] === 'given'
                            ? 'bg-green-500 text-white'
                            : 'bg-cosmic-surface border border-cosmic-purple/20 text-cosmic-text hover:bg-cosmic-purple/10'
                        }`}
                      >
                        Allow
                      </button>
                      <button
                        onClick={() => updateConsent(type, 'withdrawn')}
                        disabled={loading || consents[type] === 'withdrawn'}
                        className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                          consents[type] === 'withdrawn'
                            ? 'bg-red-500 text-white'
                            : 'bg-cosmic-surface border border-cosmic-purple/20 text-cosmic-text hover:bg-cosmic-purple/10'
                        }`}
                      >
                        Deny
                      </button>
                    </>
                  )}
                  {type === 'data_processing' && (
                    <span className="text-xs text-cosmic-accent font-medium">Always Required</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 pt-4 border-t border-cosmic-purple/20">
          <p className="text-sm text-cosmic-text-muted">
            <strong>Your Rights:</strong> You can change these preferences at any time. 
            Withdrawing consent won't affect the lawfulness of processing based on consent before withdrawal.
          </p>
        </div>
      </div>
    </div>
  );
};