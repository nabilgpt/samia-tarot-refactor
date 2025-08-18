import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Mic, 
  MicOff, 
  Square, 
  Play, 
  Pause, 
  Send, 
  X, 
  AlertCircle, 
  Clock, 
  Volume2,
  Loader2,
  RotateCcw,
  Download,
  Trash2
} from 'lucide-react';

const UnifiedAudioRecorder = ({ 
  onSend, 
  onCancel, 
  maxDuration = 300, // 5 minutes default
  maxFileSize = 10 * 1024 * 1024, // 10MB
  allowedFormats = ['audio/webm', 'audio/mp4', 'audio/wav', 'audio/ogg']
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [waveformData, setWaveformData] = useState([]);
  const [error, setError] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [recordingQuality, setRecordingQuality] = useState('high');
  const [volume, setVolume] = useState(1);

  const mediaRecorderRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const streamRef = useRef(null);
  const audioRef = useRef(null);
  const canvasRef = useRef(null);
  const intervalRef = useRef(null);
  const animationRef = useRef(null);
  const chunksRef = useRef([]);

  // =========================================================================
  // AUDIO RECORDING SETUP
  // =========================================================================

  const setupAudioRecording = useCallback(async () => {
    try {
      setError(null);
      setIsProcessing(true);

      // Request microphone access with enhanced constraints
      const constraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: recordingQuality === 'high' ? 48000 : 44100,
          channelCount: 2,
          volume: 1.0
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      // Setup audio context for waveform visualization
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      analyserRef.current = audioContextRef.current.createAnalyser();
      
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);

      analyserRef.current.fftSize = 256;
      const bufferLength = analyserRef.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      // Setup MediaRecorder with optimal settings
      const mimeTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/wav',
        'audio/ogg'
      ];

      let selectedMimeType = null;
      for (const mimeType of mimeTypes) {
        if (MediaRecorder.isTypeSupported(mimeType)) {
          selectedMimeType = mimeType;
          break;
        }
      }

      if (!selectedMimeType) {
        throw new Error('No supported audio format found');
      }

      const options = {
        mimeType: selectedMimeType,
        audioBitsPerSecond: recordingQuality === 'high' ? 128000 : 64000
      };

      mediaRecorderRef.current = new MediaRecorder(stream, options);
      chunksRef.current = [];

      // MediaRecorder event handlers
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        try {
          const blob = new Blob(chunksRef.current, { type: selectedMimeType });
          
          // Validate file size
          if (blob.size > maxFileSize) {
            throw new Error(`Recording too large (${(blob.size / 1024 / 1024).toFixed(1)}MB). Maximum size is ${maxFileSize / 1024 / 1024}MB.`);
          }

          setAudioBlob(blob);
          const url = URL.createObjectURL(blob);
          setAudioUrl(url);
          
          // Stop waveform animation
          if (animationRef.current) {
            cancelAnimationFrame(animationRef.current);
          }
          
          setIsProcessing(false);
        } catch (error) {
          console.error('Error processing recording:', error);
          setError(error.message);
          setIsProcessing(false);
        }
      };

      mediaRecorderRef.current.onerror = (event) => {
        console.error('MediaRecorder error:', event.error);
        setError('Recording failed: ' + event.error.message);
        setIsProcessing(false);
      };

      // Start waveform visualization
      const drawWaveform = () => {
        if (!analyserRef.current || !canvasRef.current) return;

        analyserRef.current.getByteFrequencyData(dataArray);
        
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;

        // Clear canvas
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, width, height);

        // Draw waveform
        const barWidth = width / bufferLength;
        let x = 0;

        // Create gradient
        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, '#8b5cf6');
        gradient.addColorStop(0.5, '#a855f7');
        gradient.addColorStop(1, '#7c3aed');

        ctx.fillStyle = gradient;

        for (let i = 0; i < bufferLength; i++) {
          const barHeight = (dataArray[i] / 255) * height * 0.8;
          
          ctx.fillRect(x, height - barHeight, barWidth - 1, barHeight);
          x += barWidth;
        }

        // Store waveform data for display
        setWaveformData([...dataArray]);

        if (isRecording && !isPaused) {
          animationRef.current = requestAnimationFrame(drawWaveform);
        }
      };

      // Start visualization
      drawWaveform();
      setIsProcessing(false);

    } catch (error) {
      console.error('Error setting up audio recording:', error);
      setError(error.message || 'Failed to access microphone');
      setIsProcessing(false);
    }
  }, [recordingQuality, maxFileSize]);

  // =========================================================================
  // RECORDING CONTROLS
  // =========================================================================

  const startRecording = useCallback(async () => {
    try {
      if (!mediaRecorderRef.current) {
        await setupAudioRecording();
      }

      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'inactive') {
        mediaRecorderRef.current.start(1000); // Collect data every second
        setIsRecording(true);
        setIsPaused(false);
        setRecordingTime(0);
        setError(null);

        // Start timer
        intervalRef.current = setInterval(() => {
          setRecordingTime(prev => {
            const newTime = prev + 1;
            if (newTime >= maxDuration) {
              stopRecording();
              return maxDuration;
            }
            return newTime;
          });
        }, 1000);
      }
    } catch (error) {
      console.error('Error starting recording:', error);
      setError('Failed to start recording');
    }
  }, [maxDuration, setupAudioRecording]);

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }
  }, []);

  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
      setIsPaused(false);

      // Resume timer
      intervalRef.current = setInterval(() => {
        setRecordingTime(prev => {
          const newTime = prev + 1;
          if (newTime >= maxDuration) {
            stopRecording();
            return maxDuration;
          }
          return newTime;
        });
      }, 1000);
    }
  }, [maxDuration]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    setIsRecording(false);
    setIsPaused(false);

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
  }, []);

  const resetRecording = useCallback(() => {
    stopRecording();
    
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }

    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingTime(0);
    setWaveformData([]);
    setError(null);
    setUploadProgress(0);
    chunksRef.current = [];
  }, [audioUrl, stopRecording]);

  // =========================================================================
  // PLAYBACK CONTROLS
  // =========================================================================

  const togglePlayback = useCallback(() => {
    if (!audioRef.current || !audioUrl) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  }, [isPlaying, audioUrl]);

  const handleAudioEnded = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const handleVolumeChange = useCallback((newVolume) => {
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
  }, []);

  // =========================================================================
  // SEND/UPLOAD HANDLING
  // =========================================================================

  const handleSend = useCallback(async () => {
    if (!audioBlob || !onSend) return;

    try {
      setIsProcessing(true);
      setUploadProgress(0);

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 100);

      await onSend(audioBlob, recordingTime);
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      // Close modal after successful send
      setTimeout(() => {
        handleCancel();
      }, 500);

    } catch (error) {
      console.error('Error sending voice message:', error);
      setError('Failed to send voice message');
      setUploadProgress(0);
    } finally {
      setIsProcessing(false);
    }
  }, [audioBlob, recordingTime, onSend]);

  const handleCancel = useCallback(() => {
    resetRecording();
    
    // Clean up media resources
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }

    if (onCancel) {
      onCancel();
    }
  }, [resetRecording, onCancel]);

  const handleDownload = useCallback(() => {
    if (!audioBlob) return;

    const url = URL.createObjectURL(audioBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `voice_message_${new Date().toISOString().slice(0, 19)}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [audioBlob]);

  // =========================================================================
  // UTILITY FUNCTIONS
  // =========================================================================

  const formatTime = useCallback((seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const getRecordingStatus = () => {
    if (isProcessing) return 'Processing...';
    if (isRecording && isPaused) return 'Paused';
    if (isRecording) return 'Recording...';
    if (audioBlob) return 'Ready to send';
    return 'Ready to record';
  };

  const getProgressPercentage = () => {
    return Math.min((recordingTime / maxDuration) * 100, 100);
  };

  // =========================================================================
  // EFFECTS
  // =========================================================================

  useEffect(() => {
    setupAudioRecording();

    return () => {
      // Cleanup on unmount
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [setupAudioRecording, audioUrl]);

  // =========================================================================
  // RENDER
  // =========================================================================

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">Voice Message</h3>
          <p className="text-sm text-gray-400">{getRecordingStatus()}</p>
        </div>
        <button
          onClick={handleCancel}
          className="p-2 text-gray-400 hover:text-white transition-colors"
          title="Close"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="flex items-center space-x-2 p-3 bg-red-900/50 border border-red-500/50 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-400" />
          <span className="text-red-300 text-sm">{error}</span>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-red-400 hover:text-red-300"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Waveform Visualization */}
      <div className="space-y-4">
        <div className="relative bg-dark-800 rounded-lg p-4 border border-gray-700">
          <canvas
            ref={canvasRef}
            width={400}
            height={120}
            className="w-full h-24 rounded"
          />
          
          {/* Recording Progress Overlay */}
          {isRecording && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="bg-black/50 backdrop-blur-sm rounded-lg px-4 py-2">
                <div className="flex items-center space-x-2 text-white">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  <span className="text-sm font-mono">{formatTime(recordingTime)}</span>
                  <span className="text-xs text-gray-300">/ {formatTime(maxDuration)}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-gray-400">
            <span>{formatTime(recordingTime)}</span>
            <span>{formatTime(maxDuration)}</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${
                recordingTime >= maxDuration ? 'bg-red-500' : 'bg-cosmic-500'
              }`}
              style={{ width: `${getProgressPercentage()}%` }}
            />
          </div>
        </div>
      </div>

      {/* Recording Controls */}
      <div className="flex items-center justify-center space-x-4">
        {!audioBlob ? (
          <>
            {/* Record Button */}
            <button
              onClick={isRecording ? (isPaused ? resumeRecording : pauseRecording) : startRecording}
              disabled={isProcessing || recordingTime >= maxDuration}
              className={`p-4 rounded-full transition-all duration-200 ${
                isRecording && !isPaused
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : isPaused
                  ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                  : 'bg-cosmic-600 hover:bg-cosmic-700 text-white'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isProcessing ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : isRecording && !isPaused ? (
                <Pause className="w-6 h-6" />
              ) : isPaused ? (
                <Play className="w-6 h-6" />
              ) : (
                <Mic className="w-6 h-6" />
              )}
            </button>

            {/* Stop Button */}
            {isRecording && (
              <button
                onClick={stopRecording}
                className="p-4 rounded-full bg-gray-600 hover:bg-gray-700 text-white transition-colors"
                title="Stop Recording"
              >
                <Square className="w-6 h-6" />
              </button>
            )}
          </>
        ) : (
          <>
            {/* Playback Controls */}
            <button
              onClick={togglePlayback}
              className="p-4 rounded-full bg-green-600 hover:bg-green-700 text-white transition-colors"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
            </button>

            {/* Reset Button */}
            <button
              onClick={resetRecording}
              className="p-3 rounded-full bg-gray-600 hover:bg-gray-700 text-white transition-colors"
              title="Record Again"
            >
              <RotateCcw className="w-5 h-5" />
            </button>

            {/* Download Button */}
            <button
              onClick={handleDownload}
              className="p-3 rounded-full bg-blue-600 hover:bg-blue-700 text-white transition-colors"
              title="Download"
            >
              <Download className="w-5 h-5" />
            </button>
          </>
        )}
      </div>

      {/* Playback Audio Element */}
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          onEnded={handleAudioEnded}
          className="hidden"
        />
      )}

      {/* Volume Control */}
      {audioBlob && (
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Volume2 className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-400">Volume</span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={volume}
            onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
          />
        </div>
      )}

      {/* Recording Quality Settings */}
      <div className="space-y-2">
        <label className="text-sm text-gray-400">Recording Quality</label>
        <select
          value={recordingQuality}
          onChange={(e) => setRecordingQuality(e.target.value)}
          disabled={isRecording || audioBlob}
          className="w-full bg-dark-700 border border-gray-600 rounded text-white text-sm p-2 disabled:opacity-50"
        >
          <option value="high">High Quality (128kbps)</option>
          <option value="medium">Medium Quality (64kbps)</option>
        </select>
      </div>

      {/* Action Buttons */}
      <div className="flex space-x-3">
        <button
          onClick={handleCancel}
          className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
        >
          Cancel
        </button>
        
        <button
          onClick={handleSend}
          disabled={!audioBlob || isProcessing}
          className="flex-1 px-4 py-3 bg-cosmic-600 hover:bg-cosmic-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center justify-center space-x-2"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Sending... {uploadProgress}%</span>
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              <span>Send Voice Message</span>
            </>
          )}
        </button>
      </div>

      {/* Upload Progress */}
      {isProcessing && uploadProgress > 0 && (
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-gray-400">
            <span>Uploading...</span>
            <span>{uploadProgress}%</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-1">
            <div
              className="h-1 bg-cosmic-500 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default UnifiedAudioRecorder; 