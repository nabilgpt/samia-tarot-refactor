import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Record, Play, Pause, Lock, Shield, Clock, 
  CheckCircle, AlertTriangle, Eye, Database
} from 'lucide-react';

const CallRecordingIndicator = ({ 
  isRecording = false, 
  duration = 0, 
  className = '',
  recordingStatus = 'ready', // 'uploading', 'processing', 'ready', 'failed'
  isPermanentlyStored = true,
  showDetails = false,
  onToggleDetails 
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [blinkOn, setBlinkOn] = useState(true);

  // Blinking animation for recording indicator
  useEffect(() => {
    if (isRecording) {
      const interval = setInterval(() => {
        setBlinkOn(prev => !prev);
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setBlinkOn(true);
    }
  }, [isRecording]);

  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusIcon = () => {
    switch (recordingStatus) {
      case 'uploading':
        return <div className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />;
      case 'processing':
        return <div className="w-3 h-3 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />;
      case 'ready':
        return <CheckCircle className="w-3 h-3 text-green-400" />;
      case 'failed':
        return <AlertTriangle className="w-3 h-3 text-red-400" />;
      default:
        return <Record className="w-3 h-3 text-red-400" />;
    }
  };

  const getStatusColor = () => {
    switch (recordingStatus) {
      case 'uploading':
        return 'bg-blue-500/20 border-blue-500/30 text-blue-400';
      case 'processing':
        return 'bg-yellow-500/20 border-yellow-500/30 text-yellow-400';
      case 'ready':
        return 'bg-green-500/20 border-green-500/30 text-green-400';
      case 'failed':
        return 'bg-red-500/20 border-red-500/30 text-red-400';
      default:
        return 'bg-red-500/20 border-red-500/30 text-red-400';
    }
  };

  const getStatusText = () => {
    switch (recordingStatus) {
      case 'uploading':
        return 'Uploading';
      case 'processing':
        return 'Processing';
      case 'ready':
        return 'Recorded';
      case 'failed':
        return 'Failed';
      default:
        return 'Recording';
    }
  };

  return (
    <div className={`${className}`}>
      {/* Compact Indicator */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className={`
          flex items-center gap-2 px-3 py-2 rounded-lg border backdrop-blur-sm cursor-pointer
          ${getStatusColor()}
        `}
        onClick={() => {
          setIsExpanded(!isExpanded);
          onToggleDetails?.();
        }}
      >
        {/* Recording Icon with Pulse Animation */}
        <div className="relative">
          {isRecording && (
            <motion.div
              animate={{ 
                scale: blinkOn ? [1, 1.2, 1] : 1,
                opacity: blinkOn ? [1, 0.7, 1] : 1
              }}
              transition={{ duration: 0.5 }}
              className="absolute inset-0 bg-red-400 rounded-full"
            />
          )}
          
          <div className="relative z-10 flex items-center justify-center">
            {isRecording ? (
              <Record className="w-4 h-4 text-white" />
            ) : (
              getStatusIcon()
            )}
          </div>
        </div>

        {/* Status Text */}
        <span className="text-sm font-medium">
          {isRecording ? 'REC' : getStatusText()}
        </span>

        {/* Duration */}
        <span className="text-xs opacity-90">
          {formatDuration(duration)}
        </span>

        {/* Permanent Storage Indicator */}
        {isPermanentlyStored && (
          <Lock className="w-3 h-3 opacity-75" />
        )}
      </motion.div>

      {/* Expanded Details */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mt-2 overflow-hidden"
          >
            <div className={`
              p-4 rounded-lg border backdrop-blur-sm
              ${getStatusColor()}
            `}>
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  <span className="font-semibold text-sm">Call Recording Details</span>
                </div>
                
                <button
                  onClick={() => setIsExpanded(false)}
                  className="text-xs opacity-75 hover:opacity-100"
                >
                  Hide
                </button>
              </div>

              {/* Recording Info */}
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="opacity-75">Status:</span>
                  <div className="flex items-center gap-1">
                    {getStatusIcon()}
                    <span className="font-medium">{getStatusText()}</span>
                  </div>
                </div>

                <div className="flex justify-between">
                  <span className="opacity-75">Duration:</span>
                  <span className="font-medium">{formatDuration(duration)}</span>
                </div>

                <div className="flex justify-between">
                  <span className="opacity-75">Storage:</span>
                  <div className="flex items-center gap-1">
                    <Database className="w-3 h-3" />
                    <span className="font-medium">
                      {isPermanentlyStored ? 'Permanent' : 'Temporary'}
                    </span>
                  </div>
                </div>

                {/* Legal Compliance Notice */}
                <div className="mt-3 pt-2 border-t border-current/20">
                  <div className="flex items-start gap-2">
                    <Eye className="w-3 h-3 mt-0.5 opacity-75" />
                    <div className="opacity-75 leading-tight">
                      <p className="font-medium mb-1">Legal Compliance</p>
                      <ul className="space-y-0.5 text-[10px]">
                        <li>• Recording with verified consent</li>
                        <li>• Encrypted and secured storage</li>
                        <li>• Permanent retention for legal compliance</li>
                        <li>• Access logged and audited</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Recording Quality Indicators */}
                {isRecording && (
                  <div className="mt-3 pt-2 border-t border-current/20">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                        <span className="text-[10px] opacity-75">Audio</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                        <span className="text-[10px] opacity-75">Video</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Shield className="w-2 h-2 opacity-75" />
                        <span className="text-[10px] opacity-75">Encrypted</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Failed Status Details */}
                {recordingStatus === 'failed' && (
                  <div className="mt-3 pt-2 border-t border-current/20">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-3 h-3 mt-0.5" />
                      <div className="text-[10px]">
                        <p className="font-medium mb-1">Recording Failed</p>
                        <p className="opacity-75">
                          The recording could not be saved. Please contact support if this persists.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Processing Status Details */}
                {(recordingStatus === 'uploading' || recordingStatus === 'processing') && (
                  <div className="mt-3 pt-2 border-t border-current/20">
                    <div className="flex items-start gap-2">
                      <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin mt-0.5" />
                      <div className="text-[10px]">
                        <p className="font-medium mb-1">
                          {recordingStatus === 'uploading' ? 'Uploading Recording' : 'Processing Recording'}
                        </p>
                        <p className="opacity-75">
                          {recordingStatus === 'uploading' 
                            ? 'Securely uploading to permanent storage...'
                            : 'Optimizing and encrypting recording...'
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CallRecordingIndicator;