import React, { useState, useEffect } from 'react';
import { PhoneIcon, VideoCameraIcon, ExclamationTriangleIcon } from '@heroicons/react/24/solid';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

const EmergencyCallButton = ({ className = '' }) => {
  const { user } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [pricing, setPricing] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedCallType, setSelectedCallType] = useState(null);

  // Only show for clients and guests
  const shouldShowButton = user && ['client', 'guest'].includes(user.role);

  useEffect(() => {
    if (showModal) {
      fetchPricing();
    }
  }, [showModal]);

  const fetchPricing = async () => {
    try {
      const response = await fetch('/api/emergency-calls/pricing', {
        headers: {
          'Authorization': `Bearer ${user?.access_token}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch pricing');
      
      const result = await response.json();
      setPricing(result.data || []);
    } catch (err) {
      console.error('Error fetching pricing:', err);
      setError('Failed to load pricing information');
    }
  };

  const handleEmergencyClick = () => {
    setShowModal(true);
    setError('');
    setSelectedCallType(null);
  };

  const handleCallTypeSelect = (callType) => {
    setSelectedCallType(callType);
  };

  const initiateEmergencyCall = async () => {
    if (!selectedCallType) {
      setError('Please select a call type');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/emergency-calls/initiate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.access_token}`
        },
        body: JSON.stringify({
          call_type: selectedCallType,
          message: 'Emergency call request'
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to initiate emergency call');
      }

      // Close modal and show success
      setShowModal(false);
      
      // Show real-time notification
      await supabase
        .from('notifications')
        .insert({
          user_id: user.id,
          title: 'Emergency Call Initiated',
          message: `Your emergency ${selectedCallType} call has been initiated. Please wait for a reader to respond.`,
          type: 'emergency_call_initiated',
          data: result.data,
          priority: 'high'
        });

      // Optionally redirect to a waiting/call interface
      // window.location.href = `/emergency-call/${result.data.emergency_call_id}`;

    } catch (err) {
      console.error('Error initiating emergency call:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedCallType(null);
    setError('');
  };

  const getPricingForType = (callType) => {
    return pricing.find(p => p.call_type === callType);
  };

  if (!shouldShowButton) {
    return null;
  }

  return (
    <>
      {/* Emergency Call Button */}
      <button
        onClick={handleEmergencyClick}
        className={`
          relative inline-flex items-center px-4 py-2 
          bg-gradient-to-r from-red-600 to-red-700 
          hover:from-red-700 hover:to-red-800
          text-white font-medium rounded-lg
          shadow-lg hover:shadow-xl
          transform hover:scale-105 transition-all duration-200
          border border-red-500
          ${className}
        `}
        title="Emergency Call - Immediate assistance"
      >
        <ExclamationTriangleIcon className="w-5 h-5 mr-2 animate-pulse" />
        <span className="hidden sm:inline">Emergency Call</span>
        <span className="sm:hidden">Emergency</span>
        
        {/* Pulsing ring effect */}
        <div className="absolute -inset-1 bg-red-400 rounded-lg opacity-30 animate-ping"></div>
      </button>

      {/* Emergency Call Type Selection Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            {/* Background overlay */}
            <div 
              className="fixed inset-0 bg-black bg-opacity-75 transition-opacity"
              onClick={closeModal}
            ></div>

            {/* Modal content */}
            <div className="inline-block align-bottom bg-gray-900 rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6 border border-gray-700">
              {/* Header */}
              <div className="sm:flex sm:items-start">
                <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                  <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
                </div>
                <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                  <h3 className="text-lg leading-6 font-medium text-white">
                    Emergency Call Request
                  </h3>
                  <div className="mt-2">
                    <p className="text-sm text-gray-300">
                      Select the type of emergency call you need. You will be connected to an available reader immediately.
                    </p>
                  </div>
                </div>
              </div>

              {/* Call Type Selection */}
              <div className="mt-6 space-y-4">
                {/* Audio Call Option */}
                <div 
                  className={`
                    relative cursor-pointer rounded-lg border p-4 transition-all duration-200
                    ${selectedCallType === 'audio' 
                      ? 'border-purple-500 bg-purple-900/20 ring-2 ring-purple-500' 
                      : 'border-gray-600 bg-gray-800 hover:border-gray-500'
                    }
                  `}
                  onClick={() => handleCallTypeSelect('audio')}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <PhoneIcon className="w-6 h-6 text-purple-400 mr-3" />
                      <div>
                        <h4 className="text-white font-medium">Audio Call</h4>
                        <p className="text-gray-400 text-sm">Voice-only emergency consultation</p>
                      </div>
                    </div>
                    <div className="text-right">
                      {getPricingForType('audio') && (
                        <>
                          <div className="text-white font-bold">
                            ${(getPricingForType('audio').base_price * getPricingForType('audio').emergency_multiplier).toFixed(2)}
                          </div>
                          <div className="text-gray-400 text-xs">
                            + ${getPricingForType('audio').per_minute_rate}/min
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  {selectedCallType === 'audio' && (
                    <div className="absolute top-2 right-2">
                      <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                    </div>
                  )}
                </div>

                {/* Video Call Option */}
                <div 
                  className={`
                    relative cursor-pointer rounded-lg border p-4 transition-all duration-200
                    ${selectedCallType === 'video' 
                      ? 'border-purple-500 bg-purple-900/20 ring-2 ring-purple-500' 
                      : 'border-gray-600 bg-gray-800 hover:border-gray-500'
                    }
                  `}
                  onClick={() => handleCallTypeSelect('video')}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <VideoCameraIcon className="w-6 h-6 text-purple-400 mr-3" />
                      <div>
                        <h4 className="text-white font-medium">Video Call</h4>
                        <p className="text-gray-400 text-sm">Video emergency consultation</p>
                        <p className="text-gray-500 text-xs mt-1">
                          * Reader camera is optional
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      {getPricingForType('video') && (
                        <>
                          <div className="text-white font-bold">
                            ${(getPricingForType('video').base_price * getPricingForType('video').emergency_multiplier).toFixed(2)}
                          </div>
                          <div className="text-gray-400 text-xs">
                            + ${getPricingForType('video').per_minute_rate}/min
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  {selectedCallType === 'video' && (
                    <div className="absolute top-2 right-2">
                      <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                    </div>
                  )}
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="mt-4 p-3 bg-red-900/50 border border-red-600 rounded-lg">
                  <p className="text-red-300 text-sm">{error}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="mt-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={initiateEmergencyCall}
                  disabled={!selectedCallType || loading}
                  className={`
                    w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 text-base font-medium text-white sm:ml-3 sm:w-auto sm:text-sm
                    ${!selectedCallType || loading
                      ? 'bg-gray-600 cursor-not-allowed'
                      : 'bg-red-600 hover:bg-red-700 focus:ring-2 focus:ring-offset-2 focus:ring-red-500'
                    }
                  `}
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Initiating...
                    </>
                  ) : (
                    'Start Emergency Call'
                  )}
                </button>
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={loading}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-600 shadow-sm px-4 py-2 bg-gray-800 text-base font-medium text-gray-300 hover:bg-gray-700 sm:mt-0 sm:w-auto sm:text-sm"
                >
                  Cancel
                </button>
              </div>

              {/* Important Notice */}
              <div className="mt-4 p-3 bg-yellow-900/50 border border-yellow-600 rounded-lg">
                <p className="text-yellow-300 text-xs">
                  <strong>Important:</strong> Emergency calls are recorded for quality and safety purposes. 
                  You will be charged immediately upon connection. If no reader responds within 5 minutes, 
                  the call will be escalated to administrators.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default EmergencyCallButton; 