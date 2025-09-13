import { useState } from 'react';

export const DSRRequestModal = ({ isOpen, onClose, onSubmit }) => {
  const [requestType, setRequestType] = useState('export');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('request'); // 'request', 'confirmation', 'success'
  const [requestResult, setRequestResult] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/dsr/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          request_type: requestType,
          verification_method: 'email'
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        setRequestResult(data);
        setStep('success');
        onSubmit?.(data);
      } else {
        throw new Error(data.error || 'Failed to submit request');
      }
    } catch (error) {
      console.error('DSR request error:', error);
      alert(`Failed to submit request: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep('request');
    setRequestResult(null);
    setRequestType('export');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="cosmic-card max-w-lg w-full mx-4 relative">
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-cosmic-text-muted hover:text-cosmic-purple"
        >
          ✕
        </button>

        {step === 'request' && (
          <>
            <h2 className="text-xl font-semibold text-cosmic-purple mb-6">
              Data Subject Rights Request
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-cosmic-text mb-3">
                  Request Type
                </label>
                <div className="space-y-3">
                  <label className="flex items-start space-x-3 cursor-pointer">
                    <input
                      type="radio"
                      name="requestType"
                      value="export"
                      checked={requestType === 'export'}
                      onChange={(e) => setRequestType(e.target.value)}
                      className="mt-1"
                    />
                    <div>
                      <div className="font-medium text-cosmic-text">Export My Data</div>
                      <div className="text-sm text-cosmic-text-muted">
                        Download a copy of all your personal data (GDPR Article 15)
                      </div>
                    </div>
                  </label>
                  
                  <label className="flex items-start space-x-3 cursor-pointer">
                    <input
                      type="radio"
                      name="requestType"
                      value="delete"
                      checked={requestType === 'delete'}
                      onChange={(e) => setRequestType(e.target.value)}
                      className="mt-1"
                    />
                    <div>
                      <div className="font-medium text-cosmic-text">Delete My Account</div>
                      <div className="text-sm text-cosmic-text-muted">
                        Permanently delete your account and all data (GDPR Article 17)
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {requestType === 'delete' && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                  <div className="flex items-start space-x-2">
                    <span className="text-red-500 text-lg">⚠️</span>
                    <div>
                      <h4 className="font-medium text-red-400 mb-1">Important Notice</h4>
                      <ul className="text-sm text-red-300 space-y-1">
                        <li>• This action cannot be undone after the grace period</li>
                        <li>• You have 72 hours to cancel the deletion</li>
                        <li>• All your readings, messages, and account data will be permanently removed</li>
                        <li>• Some data may be retained for legal compliance</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-cosmic-purple/10 border border-cosmic-purple/20 rounded-lg p-4">
                <h4 className="font-medium text-cosmic-purple mb-2">Next Steps</h4>
                <p className="text-sm text-cosmic-text">
                  After submitting this request, you'll receive a verification email. 
                  Click the link in the email to confirm your request. 
                  Processing typically takes 30 days or less.
                </p>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={loading}
                  className="px-4 py-2 border border-cosmic-purple/20 rounded-lg text-cosmic-text hover:bg-cosmic-purple/10 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-cosmic-purple text-white rounded-lg hover:bg-cosmic-purple/80 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </>
        )}

        {step === 'success' && requestResult && (
          <>
            <div className="text-center">
              <div className="w-16 h-16 bg-green-500/10 border border-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-green-500 text-2xl">✓</span>
              </div>
              
              <h2 className="text-xl font-semibold text-cosmic-purple mb-4">
                Request Submitted Successfully
              </h2>
              
              <div className="space-y-4 text-left">
                <div className="cosmic-surface rounded-lg p-4">
                  <h4 className="font-medium text-cosmic-text mb-2">Request Details</h4>
                  <div className="text-sm space-y-1">
                    <div><strong>Request ID:</strong> {requestResult.request_id}</div>
                    <div><strong>Type:</strong> {requestType === 'export' ? 'Data Export' : 'Account Deletion'}</div>
                    <div><strong>Status:</strong> Pending Verification</div>
                    <div><strong>Expires:</strong> {new Date(requestResult.expiry_date).toLocaleDateString()}</div>
                  </div>
                </div>

                <div className="bg-cosmic-accent/10 border border-cosmic-accent/20 rounded-lg p-4">
                  <p className="text-sm text-cosmic-text">
                    <strong>Next step:</strong> {requestResult.next_step}
                  </p>
                </div>
              </div>

              <button
                onClick={handleClose}
                className="w-full mt-6 px-4 py-2 bg-cosmic-purple text-white rounded-lg hover:bg-cosmic-purple/80 transition-colors"
              >
                Close
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};