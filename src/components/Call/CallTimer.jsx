import React, { useState, useEffect } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';

const CallTimer = ({ startTime, duration, onTimeUp, isEmergency = false }) => {
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isWarning, setIsWarning] = useState(false);
  const [isCritical, setIsCritical] = useState(false);

  useEffect(() => {
    if (!startTime || !duration) return;

    const interval = setInterval(() => {
      const now = new Date();
      const start = new Date(startTime);
      const elapsed = Math.floor((now - start) / 1000); // seconds
      const remaining = Math.max(0, (duration * 60) - elapsed); // convert duration to seconds

      setTimeElapsed(elapsed);
      setTimeRemaining(remaining);

      // Warning at 5 minutes remaining
      setIsWarning(remaining <= 300 && remaining > 60);
      
      // Critical at 1 minute remaining
      setIsCritical(remaining <= 60 && remaining > 0);

      // Time's up
      if (remaining <= 0) {
        clearInterval(interval);
        if (onTimeUp) {
          onTimeUp();
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime, duration, onTimeUp]);

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimerColor = () => {
    if (isCritical) return 'text-red-500';
    if (isWarning) return 'text-yellow-500';
    return 'text-white';
  };

  const getBackgroundColor = () => {
    if (isCritical) return 'bg-red-900/50';
    if (isWarning) return 'bg-yellow-900/50';
    return 'bg-gray-800/50';
  };

  if (!startTime || !duration) {
    return null;
  }

  return (
    <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg ${getBackgroundColor()}`}>
      {/* Timer Icon */}
      <div className="flex items-center space-x-1">
        {(isWarning || isCritical) && (
          <AlertTriangle className={`h-4 w-4 ${getTimerColor()}`} />
        )}
        <Clock className={`h-4 w-4 ${getTimerColor()}`} />
      </div>

      {/* Time Display */}
      <div className="flex flex-col items-center">
        <div className={`font-mono text-lg font-bold ${getTimerColor()}`}>
          {formatTime(timeRemaining)}
        </div>
        <div className="text-xs text-gray-400">
          {isEmergency ? 'Emergency' : 'Remaining'}
        </div>
      </div>

      {/* Elapsed Time (smaller) */}
      <div className="text-xs text-gray-400">
        <div>Elapsed: {formatTime(timeElapsed)}</div>
      </div>

      {/* Warning Messages */}
      {isCritical && (
        <div className="text-xs text-red-400 font-medium animate-pulse">
          Call ending soon!
        </div>
      )}
      {isWarning && !isCritical && (
        <div className="text-xs text-yellow-400 font-medium">
          5 min remaining
        </div>
      )}
    </div>
  );
};

export default CallTimer; 