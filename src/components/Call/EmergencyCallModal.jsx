import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Phone, 
  PhoneCall, 
  X, 
  Clock, 
  AlertTriangle, 
  CheckCircle,
  User,
  Calendar,
  MessageSquare,
  Star,
  Heart
} from 'lucide-react';
import { toast } from 'react-toastify';
import api from '../../services/frontendApi.js';
import { useAuth } from '../../context/AuthContext.jsx';

const EmergencyCallModal = ({ isOpen, onClose, onCallInitiated }) => {
  const { user, profile } = useAuth();
  const [availableReaders, setAvailableReaders] = useState([]);
  const [selectedReader, setSelectedReader] = useState(null);
  const [loading, setLoading] = useState(false);
  const [initiating, setInitiating] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [error, setError] = useState('');

  // Debug: Log user role for access control
  useEffect(() => {
    console.log('🚨 EmergencyCallModal - User Role Check:');
    console.log('  User:', user);
    console.log('  Profile:', profile);
    console.log('  Role:', profile?.role || user?.role);
    console.log('  Should show emergency button:', ['client', 'guest'].includes(profile?.role || user?.role));
  }, [user, profile]);

  // Fetch available readers when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchAvailableReaders();
    }
  }, [isOpen]);

  const fetchAvailableReaders = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await api.getAvailableReaders();
      
      if (response.success) {
        setAvailableReaders(response.data);
        console.log('📞 Available readers for emergency:', response.data);
      } else {
        setError('Failed to load available readers');
        console.error('❌ Failed to fetch readers:', response.error);
      }
    } catch (error) {
      console.error('❌ Error fetching readers:', error);
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleReaderSelect = (reader) => {
    setSelectedReader(reader);
    setShowConfirmation(true);
  };

  const handleConfirmCall = async () => {
    if (!selectedReader) return;

    try {
      setInitiating(true);
      setError('');

      console.log('🚨 Initiating emergency call with reader:', selectedReader);

      const callData = {
        reader_id: selectedReader.id,
        call_type: 'emergency',
        client_id: profile?.id || user?.id
      };

      const response = await api.initiateEmergencyCall(callData);

      if (response.success) {
        console.log('✅ Emergency call initiated:', response.data);
        
        // Notify parent component
        onCallInitiated?.(response.data);
        
        // Close modal
        onClose();
        
        // Reset state
        setShowConfirmation(false);
        setSelectedReader(null);
      } else {
        setError(response.error || 'Failed to initiate emergency call');
        console.error('❌ Call initiation failed:', response.error);
      }
    } catch (error) {
      console.error('❌ Emergency call error:', error);
      setError('Failed to connect. Please try again.');
    } finally {
      setInitiating(false);
    }
  };

  const handleCancel = () => {
    setShowConfirmation(false);
    setSelectedReader(null);
    setError('');
  };

  const handleClose = () => {
    if (!initiating) {
      handleCancel();
      onClose();
    }
  };

  // Don't render if user is not client or guest
  const userRole = profile?.role || user?.role;
  if (!['client', 'guest'].includes(userRole)) {
    console.log('🚫 Emergency call modal hidden for role:', userRole);
    return null;
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-md mx-auto"
          >
            {/* Emergency Call Modal */}
            {!showConfirmation && (
              <div className="bg-gradient-to-br from-gray-900/95 to-purple-900/95 backdrop-blur-xl border border-purple-500/30 rounded-2xl shadow-2xl shadow-purple-500/20">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-purple-500/20">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-red-500/20 rounded-lg">
                      <AlertTriangle className="h-6 w-6 text-red-400" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">Emergency Call</h2>
                      <p className="text-sm text-gray-300">Connect with an available reader</p>
                    </div>
                  </div>
                  <button
                    onClick={handleClose}
                    disabled={initiating}
                    className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Content */}
                <div className="p-6">
                  {/* Warning Notice */}
                  <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <div className="flex items-start space-x-3">
                      <Shield className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
                      <div className="text-sm text-red-200">
                        <p className="font-medium mb-1">Emergency Call Notice</p>
                        <p>This will initiate an immediate emergency session. The selected reader cannot decline this call.</p>
                      </div>
                    </div>
                  </div>

                  {/* Error Message */}
                  {error && (
                    <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
                      <p className="text-sm text-red-200">{error}</p>
                    </div>
                  )}

                  {/* Loading State */}
                  {loading && (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-8 w-8 text-purple-400 animate-spin" />
                      <span className="ml-3 text-gray-300">Loading available readers...</span>
                    </div>
                  )}

                  {/* No Readers Available */}
                  {!loading && availableReaders.length === 0 && (
                    <div className="text-center py-8">
                      <Users className="h-12 w-12 text-gray-500 mx-auto mb-3" />
                      <p className="text-gray-300 mb-2">No readers available</p>
                      <p className="text-sm text-gray-400">All readers are currently busy. Please try again in a few moments.</p>
                      <button
                        onClick={fetchAvailableReaders}
                        className="mt-4 px-4 py-2 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 rounded-lg transition-colors"
                      >
                        Refresh
                      </button>
                    </div>
                  )}

                  {/* Available Readers List */}
                  {!loading && availableReaders.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-sm font-medium text-gray-300 mb-3">Select a reader for emergency call:</h3>
                      
                      {availableReaders.map((reader) => (
                        <motion.button
                          key={reader.id}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleReaderSelect(reader)}
                          className="w-full p-4 bg-gradient-to-r from-purple-600/10 to-pink-600/10 hover:from-purple-600/20 hover:to-pink-600/20 border border-purple-500/20 hover:border-purple-400/40 rounded-lg transition-all group"
                        >
                          <div className="flex items-center space-x-3">
                            {/* Avatar */}
                            <div className="relative">
                              {reader.avatar_url ? (
                                <img
                                  src={reader.avatar_url}
                                  alt={reader.name}
                                  className="h-12 w-12 rounded-full object-cover border-2 border-purple-400/30"
                                />
                              ) : (
                                <div className="h-12 w-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                                  <span className="text-white font-medium text-lg">
                                    {reader.name?.charAt(0) || 'R'}
                                  </span>
                                </div>
                              )}
                              {/* Online indicator */}
                              <div className="absolute -bottom-1 -right-1 h-4 w-4 bg-green-500 border-2 border-gray-900 rounded-full"></div>
                            </div>

                            {/* Reader Info */}
                            <div className="flex-1 text-left">
                              <p className="font-medium text-white group-hover:text-purple-200">
                                {reader.name || `${reader.first_name} ${reader.last_name}`}
                              </p>
                              <div className="flex items-center space-x-2 text-sm text-gray-400">
                                <Clock className="h-3 w-3" />
                                <span>Available now</span>
                                {reader.specialties && (
                                  <>
                                    <span>•</span>
                                    <span>{reader.specialties.slice(0, 2).join(', ')}</span>
                                  </>
                                )}
                              </div>
                            </div>

                            {/* Call Icon */}
                            <div className="p-2 bg-red-500/20 group-hover:bg-red-500/30 rounded-lg transition-colors">
                              <PhoneCall className="h-5 w-5 text-red-400" />
                            </div>
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Confirmation Dialog */}
            {showConfirmation && selectedReader && (
              <div className="bg-gradient-to-br from-gray-900/95 to-red-900/95 backdrop-blur-xl border border-red-500/30 rounded-2xl shadow-2xl shadow-red-500/20">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-red-500/20">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-red-500/20 rounded-lg">
                      <Phone className="h-6 w-6 text-red-400" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">Confirm Emergency Call</h2>
                      <p className="text-sm text-gray-300">This action cannot be undone</p>
                    </div>
                  </div>
                  {!initiating && (
                    <button
                      onClick={handleCancel}
                      className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  )}
                </div>

                {/* Content */}
                <div className="p-6">
                  {/* Selected Reader */}
                  <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <div className="flex items-center space-x-3 mb-3">
                      {selectedReader.avatar_url ? (
                        <img
                          src={selectedReader.avatar_url}
                          alt={selectedReader.name}
                          className="h-10 w-10 rounded-full object-cover border-2 border-red-400/30"
                        />
                      ) : (
                        <div className="h-10 w-10 bg-gradient-to-br from-red-500 to-pink-500 rounded-full flex items-center justify-center">
                          <span className="text-white font-medium">
                            {selectedReader.name?.charAt(0) || 'R'}
                          </span>
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-white">
                          {selectedReader.name || `${selectedReader.first_name} ${selectedReader.last_name}`}
                        </p>
                        <p className="text-sm text-red-200">Emergency call recipient</p>
                      </div>
                    </div>
                    
                    <div className="text-sm text-red-200">
                      <p className="mb-2">
                        <strong>You will initiate an emergency session with {selectedReader.name || selectedReader.first_name}.</strong>
                      </p>
                      <ul className="space-y-1 text-red-300">
                        <li>• The reader cannot decline this call</li>
                        <li>• They will receive an emergency alert with a loud siren</li>
                        <li>• The call will be logged for quality assurance</li>
                        <li>• If unanswered, it will escalate to admin/monitor</li>
                      </ul>
                    </div>
                  </div>

                  {/* Error Message */}
                  {error && (
                    <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
                      <p className="text-sm text-red-200">{error}</p>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex space-x-3">
                    <button
                      onClick={handleCancel}
                      disabled={initiating}
                      className="flex-1 px-4 py-3 bg-gray-600/20 hover:bg-gray-600/30 text-gray-300 border border-gray-500/30 rounded-lg transition-colors disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleConfirmCall}
                      disabled={initiating}
                      className="flex-1 px-4 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-lg transition-all shadow-lg shadow-red-500/20 disabled:opacity-50 flex items-center justify-center space-x-2"
                    >
                      {initiating ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Initiating...</span>
                        </>
                      ) : (
                        <>
                          <Volume2 className="h-4 w-4" />
                          <span>Start Emergency Call</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default EmergencyCallModal; 