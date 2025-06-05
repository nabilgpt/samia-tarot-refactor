import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { CallAPI } from '../../api/callApi.js';
import { AlertTriangle, Phone, X, Loader } from 'lucide-react';

const EmergencyButton = ({ onEmergencyCall, className = '', onCancel, showModalOnly = false }) => {
  const { user } = useAuth();
  const [showConfirmation, setShowConfirmation] = useState(showModalOnly);
  const [isCreatingCall, setIsCreatingCall] = useState(false);
  const [error, setError] = useState(null);

  const handleEmergencyClick = () => {
    setShowConfirmation(true);
    setError(null);
  };

  const handleConfirmEmergency = async () => {
    try {
      setIsCreatingCall(true);
      setError(null);

      // Create emergency call
      const result = await CallAPI.createEmergencyCall(user.id, 'voice');
      
      if (result.success) {
        setShowConfirmation(false);
        
        // Notify parent component
        if (onEmergencyCall) {
          onEmergencyCall(result.data);
        }
      } else {
        setError(result.error || 'Failed to create emergency call');
      }
    } catch (error) {
      console.error('Error creating emergency call:', error);
      setError('Failed to create emergency call');
    } finally {
      setIsCreatingCall(false);
    }
  };

  const handleCancel = () => {
    setShowConfirmation(false);
    setError(null);
    
    // Call external onCancel if provided (for navbar usage)
    if (onCancel) {
      onCancel();
    }
  };

  return (
    <>
      {/* Emergency Button - Only show if not in modal-only mode */}
      {!showModalOnly && (
        <button
          onClick={handleEmergencyClick}
          disabled={isCreatingCall}
          className={`
            relative group
            bg-gradient-to-r from-red-600 to-red-700 
            hover:from-red-700 hover:to-red-800
            text-white font-bold
            px-6 py-4 rounded-full
            shadow-lg hover:shadow-xl
            transform hover:scale-105
            transition-all duration-200
            disabled:opacity-50 disabled:cursor-not-allowed
            ${className}
          `}
        >
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-6 w-6" />
            <span className="text-lg">EMERGENCY</span>
          </div>
          
          {/* Pulsing ring animation */}
          <div className="absolute inset-0 rounded-full bg-red-500 opacity-30 animate-ping group-hover:animate-none"></div>
        </button>
      )}

      {/* Confirmation Modal */}
      {showConfirmation && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-6 w-6 text-red-600" />
                <h2 className="text-xl font-bold text-gray-900">Emergency Call</h2>
              </div>
              <button
                onClick={handleCancel}
                disabled={isCreatingCall}
                className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Content */}
            <div className="mb-6">
              <p className="text-gray-700 mb-4">
                You are about to initiate an emergency call. This will:
              </p>
              <ul className="list-disc list-inside space-y-2 text-sm text-gray-600">
                <li>Connect you immediately with an available reader</li>
                <li>Override the reader&apos;s silent mode with a loud siren</li>
                <li>Automatically record the call for safety</li>
                <li>Escalate to admin if not answered within 5 minutes</li>
                <li>Be treated as highest priority</li>
              </ul>
              
              {error && (
                <div className="mt-4 p-3 bg-red-100 border border-red-300 rounded-lg">
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex space-x-3">
              <button
                onClick={handleCancel}
                disabled={isCreatingCall}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmEmergency}
                disabled={isCreatingCall}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center justify-center space-x-2"
              >
                {isCreatingCall ? (
                  <>
                    <Loader className="h-4 w-4 animate-spin" />
                    <span>Connecting...</span>
                  </>
                ) : (
                  <>
                    <Phone className="h-4 w-4" />
                    <span>Start Emergency Call</span>
                  </>
                )}
              </button>
            </div>

            {/* Warning */}
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-yellow-800 text-xs">
                ⚠️ Only use this for genuine emergencies. Misuse may result in account suspension.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default EmergencyButton; 