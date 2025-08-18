import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../../lib/supabase.js';
import {
  StarIcon,
  SpeakerWaveIcon,
  PlayIcon,
  PauseIcon,
  Cog6ToothIcon,
  ClockIcon,
  MicrophoneIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  BeakerIcon,
  SparklesIcon,
  CalendarDaysIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';

const DailyZodiacManagementTab = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [activeSection, setActiveSection] = useState('overview');
  
  // Configuration states
  const [config, setConfig] = useState({
    default_tts_provider: 'openai',
    openai_voice_ar: 'nova',
    openai_voice_en: 'alloy',
    elevenlabs_voice_ar: 'samia_ar',
    elevenlabs_voice_en: 'samia_en',
    auto_generation_enabled: true,
    generation_timezone: 'UTC'
  });

  // Testing states
  const [testingVoice, setTestingVoice] = useState(false);
  const [testResults, setTestResults] = useState({});
  const [playingTest, setPlayingTest] = useState(null);
  
  // Generation states
  const [generating, setGenerating] = useState(false);
  const [generationLogs, setGenerationLogs] = useState([]);
  
  // Statistics
  const [stats, setStats] = useState({
    total_readings: 0,
    today_generated: 0,
    audio_files: 0,
    storage_size: 0
  });

  // Credential status
  const [credentialStatus, setCredentialStatus] = useState({
    openai: { available: false, status: 'unknown', message: 'Checking...' },
    elevenlabs: { available: false, status: 'unknown', message: 'Checking...' },
    system_status: 'unknown'
  });

  const sections = [
    { id: 'overview', name: 'Overview', icon: ChartBarIcon },
    { id: 'tts_config', name: 'TTS Configuration', icon: SpeakerWaveIcon },
    { id: 'voice_testing', name: 'Voice Testing', icon: BeakerIcon },
    { id: 'generation', name: 'Generation Control', icon: SparklesIcon },
    { id: 'prompt_management', name: 'Samia Prompt', icon: MicrophoneIcon },
    { id: 'schedule', name: 'Schedule Settings', icon: ClockIcon },
    { id: 'logs', name: 'Generation Logs', icon: CalendarDaysIcon }
  ];

  const zodiacSigns = [
    { key: 'aries', name: { en: 'Aries', ar: 'الحمل' }, emoji: '🐏' },
    { key: 'taurus', name: { en: 'Taurus', ar: 'الثور' }, emoji: '🐂' },
    { key: 'gemini', name: { en: 'Gemini', ar: 'الجوزاء' }, emoji: '👯' },
    { key: 'cancer', name: { en: 'Cancer', ar: 'السرطان' }, emoji: '🦀' },
    { key: 'leo', name: { en: 'Leo', ar: 'الأسد' }, emoji: '🦁' },
    { key: 'virgo', name: { en: 'Virgo', ar: 'العذراء' }, emoji: '👩' },
    { key: 'libra', name: { en: 'Libra', ar: 'الميزان' }, emoji: '⚖️' },
    { key: 'scorpio', name: { en: 'Scorpio', ar: 'العقرب' }, emoji: '🦂' },
    { key: 'sagittarius', name: { en: 'Sagittarius', ar: 'القوس' }, emoji: '🏹' },
    { key: 'capricorn', name: { en: 'Capricorn', ar: 'الجدي' }, emoji: '🐐' },
    { key: 'aquarius', name: { en: 'Aquarius', ar: 'الدلو' }, emoji: '🏺' },
    { key: 'pisces', name: { en: 'Pisces', ar: 'الحوت' }, emoji: '🐟' }
  ];

  const openaiVoices = ['alloy', 'echo', 'fable', 'nova', 'onyx', 'shimmer'];

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Helper function to get authentication token
  const getAuthToken = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      return session?.access_token;
    } catch (error) {
      console.error('Error getting auth token:', error);
      return null;
    }
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load configuration
      await Promise.all([
        loadConfiguration(),
        loadStatistics(),
        loadGenerationLogs(),
        loadCredentialStatus()
      ]);
      
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setMessage(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const loadConfiguration = async () => {
    try {
      const token = await getAuthToken();
      if (!token) {
        console.error('No access token available');
        return;
      }

      const response = await fetch('/api/daily-zodiac/config', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setConfig(data.data);
        }
      }
    } catch (error) {
      console.error('Error loading configuration:', error);
    }
  };

  const loadStatistics = async () => {
    try {
      const token = await getAuthToken();
      if (!token) {
        console.error('No access token available');
        return;
      }

      const response = await fetch('/api/daily-zodiac/stats', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setStats(data.data);
        }
      }
    } catch (error) {
      console.error('Error loading statistics:', error);
    }
  };

  const loadGenerationLogs = async () => {
    try {
      const token = await getAuthToken();
      if (!token) {
        console.error('No access token available');
        return;
      }

      const response = await fetch('/api/daily-zodiac/logs?limit=10', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setGenerationLogs(data.data);
        }
      }
    } catch (error) {
      console.error('Error loading generation logs:', error);
    }
  };

  const loadCredentialStatus = async () => {
    try {
      const token = await getAuthToken();
      if (!token) {
        console.error('No access token available');
        return;
      }

      const response = await fetch('/api/daily-zodiac/credential-status', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setCredentialStatus(data.data);
        }
      }
    } catch (error) {
      console.error('Error loading credential status:', error);
    }
  };

  const updateConfiguration = async (key, value) => {
    try {
      setSaving(true);
      
      const token = await getAuthToken();
      if (!token) {
        console.error('No access token available');
        return;
      }
      
      const response = await fetch('/api/daily-zodiac/config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ [key]: value })
      });

      if (response.ok) {
        setConfig(prev => ({ ...prev, [key]: value }));
        setMessage('Configuration updated successfully');
        setTimeout(() => setMessage(''), 3000);
      } else {
        throw new Error('Failed to update configuration');
      }
    } catch (error) {
      setMessage(`Error: ${error.message}`);
      setTimeout(() => setMessage(''), 5000);
    } finally {
      setSaving(false);
    }
  };

  const testVoice = async (language, provider = null) => {
    try {
      setTestingVoice(true);
      
      const useProvider = provider || config.default_tts_provider;
      
      const testText = language === 'ar' 
        ? 'مرحباً، أنا سامية. هذا اختبار للصوت العربي في نظام الأبراج اليومية.'
        : 'Hello, I am Samia. This is a voice test for the Daily Zodiac system.';

      const token = await getAuthToken();
      if (!token) {
        console.error('No access token available');
        return;
      }

      const response = await fetch('/api/daily-zodiac/test-voice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          text: testText,
          language: language,
          provider: useProvider,
          voice_id: useProvider === 'openai' 
            ? config[`openai_voice_${language}`]
            : config[`elevenlabs_voice_${language}`]
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setTestResults(prev => ({
          ...prev,
          [`${useProvider}_${language}`]: {
            success: true,
            audioUrl: data.data.audio_ar_url || data.data.audio_en_url,
            timestamp: new Date().toISOString()
          }
        }));
      } else {
        setTestResults(prev => ({
          ...prev,
          [`${useProvider}_${language}`]: {
            success: false,
            error: data.error,
            timestamp: new Date().toISOString()
          }
        }));
      }
    } catch (error) {
      console.error('Voice test error:', error);
      setTestResults(prev => ({
        ...prev,
        [`${config.default_tts_provider}_${language}`]: {
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        }
      }));
    } finally {
      setTestingVoice(false);
    }
  };

  const generateTodaysReadings = async (options = {}) => {
    try {
      setGenerating(true);
      
      const token = await getAuthToken();
      if (!token) {
        console.error('No access token available');
        setMessage('Authentication error: Please refresh the page and try again');
        return;
      }
      
      const response = await fetch('/api/daily-zodiac/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          date: options.date || new Date().toISOString().split('T')[0],
          force_regenerate: options.forceRegenerate || false,
          specific_signs: options.specificSigns || null,
          tts_provider: options.ttsProvider || config.default_tts_provider
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setMessage(`Generation started successfully! ID: ${data.data.generation_id}`);
        // Reload logs after a short delay
        setTimeout(() => {
          loadGenerationLogs();
          loadStatistics();
        }, 2000);
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      setMessage(`Generation failed: ${error.message}`);
    } finally {
      setGenerating(false);
      setTimeout(() => setMessage(''), 5000);
    }
  };

  function renderOverviewSection() {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Statistics Cards */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">System Statistics</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-cosmic-300 text-sm">Total Readings</p>
                  <p className="text-2xl font-bold text-white">{stats.total_readings}</p>
                </div>
                <StarIcon className="w-8 h-8 text-purple-400" />
              </div>
            </div>
            <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-cosmic-300 text-sm">Today Generated</p>
                  <p className="text-2xl font-bold text-white">{stats.today_generated}</p>
                </div>
                <CalendarDaysIcon className="w-8 h-8 text-green-400" />
              </div>
            </div>
            <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-cosmic-300 text-sm">Audio Files</p>
                  <p className="text-2xl font-bold text-white">{stats.audio_files}</p>
                </div>
                <SpeakerWaveIcon className="w-8 h-8 text-blue-400" />
              </div>
            </div>
            <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-cosmic-300 text-sm">Storage Size</p>
                  <p className="text-2xl font-bold text-white">{(stats.storage_size / 1024 / 1024).toFixed(1)}MB</p>
                </div>
                <ChartBarIcon className="w-8 h-8 text-yellow-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Current Configuration */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">Current Configuration</h3>
          <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-cosmic-300">Default TTS Provider</span>
              <span className="text-white font-medium capitalize">{config.default_tts_provider}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-cosmic-300">OpenAI Voice (EN)</span>
              <span className="text-white font-medium capitalize">{config.openai_voice_en}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-cosmic-300">OpenAI Voice (AR)</span>
              <span className="text-white font-medium capitalize">{config.openai_voice_ar}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-cosmic-300">Auto Generation</span>
              <span className={`font-medium ${config.auto_generation_enabled ? 'text-green-400' : 'text-red-400'}`}>
                {config.auto_generation_enabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-cosmic-300">Timezone</span>
              <span className="text-white font-medium">{config.generation_timezone}</span>
            </div>
          </div>
        </div>

        {/* Credential Status */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">API Credential Status</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* OpenAI Status */}
            <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-white font-medium">OpenAI TTS</div>
                  <div className="text-sm text-cosmic-300">{credentialStatus.openai.message}</div>
                </div>
                <div className={`w-3 h-3 rounded-full ${
                  credentialStatus.openai.status === 'active' ? 'bg-green-500' :
                  credentialStatus.openai.status === 'missing' ? 'bg-red-500' :
                  'bg-yellow-500'
                }`}></div>
              </div>
            </div>

            {/* ElevenLabs Status */}
            <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-white font-medium">ElevenLabs</div>
                  <div className="text-sm text-cosmic-300">{credentialStatus.elevenlabs.message}</div>
                </div>
                <div className={`w-3 h-3 rounded-full ${
                  credentialStatus.elevenlabs.status === 'active' ? 'bg-green-500' :
                  credentialStatus.elevenlabs.status === 'missing' ? 'bg-red-500' :
                  'bg-yellow-500'
                }`}></div>
              </div>
            </div>
          </div>

          {/* System Status Summary */}
          <div className={`p-4 rounded-lg border ${
            credentialStatus.system_status === 'healthy' ? 'bg-green-500/10 border-green-500/30' :
            credentialStatus.system_status === 'partial' ? 'bg-yellow-500/10 border-yellow-500/30' :
            credentialStatus.system_status === 'critical' ? 'bg-red-500/10 border-red-500/30' :
            'bg-gray-500/10 border-gray-500/30'
          }`}>
            <div className="flex items-center space-x-3">
              <div className={`w-4 h-4 rounded-full ${
                credentialStatus.system_status === 'healthy' ? 'bg-green-500' :
                credentialStatus.system_status === 'partial' ? 'bg-yellow-500' :
                credentialStatus.system_status === 'critical' ? 'bg-red-500' :
                'bg-gray-500'
              }`}></div>
              <div>
                <div className={`font-medium ${
                  credentialStatus.system_status === 'healthy' ? 'text-green-300' :
                  credentialStatus.system_status === 'partial' ? 'text-yellow-300' :
                  credentialStatus.system_status === 'critical' ? 'text-red-300' :
                  'text-gray-300'
                }`}>
                  System Status: {credentialStatus.system_status.charAt(0).toUpperCase() + credentialStatus.system_status.slice(1)}
                </div>
                <div className="text-sm text-cosmic-300">
                  {credentialStatus.system_status === 'healthy' && 'All TTS providers are configured and ready'}
                  {credentialStatus.system_status === 'partial' && 'Some TTS providers are missing credentials'}
                  {credentialStatus.system_status === 'critical' && 'No TTS providers are configured'}
                  {credentialStatus.system_status === 'unknown' && 'Checking credential status...'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  function renderTTSConfigSection() {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-white">TTS Provider Configuration</h3>
          <div className="flex items-center space-x-2">
            <InformationCircleIcon className="w-5 h-5 text-blue-400" />
            <span className="text-sm text-cosmic-300">Changes are saved automatically</span>
          </div>
        </div>

        {/* Provider Selection */}
        <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700">
          <h4 className="text-md font-semibold text-white mb-4">Default TTS Provider</h4>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => updateConfiguration('default_tts_provider', 'openai')}
              disabled={saving}
              className={`p-4 rounded-lg border-2 transition-all ${
                config.default_tts_provider === 'openai'
                  ? 'border-purple-500 bg-purple-500/20'
                  : 'border-gray-600 hover:border-purple-400'
              }`}
            >
              <div className="text-center">
                <div className="text-lg font-semibold text-white">OpenAI TTS</div>
                <div className="text-sm text-cosmic-300 mt-1">High quality, fast generation</div>
                <div className="text-xs text-cosmic-400 mt-2">6 voices available</div>
              </div>
            </button>
            <button
              onClick={() => updateConfiguration('default_tts_provider', 'elevenlabs')}
              disabled={saving}
              className={`p-4 rounded-lg border-2 transition-all ${
                config.default_tts_provider === 'elevenlabs'
                  ? 'border-purple-500 bg-purple-500/20'
                  : 'border-gray-600 hover:border-purple-400'
              }`}
            >
              <div className="text-center">
                <div className="text-lg font-semibold text-white">ElevenLabs</div>
                <div className="text-sm text-cosmic-300 mt-1">Premium quality, custom voices</div>
                <div className="text-xs text-cosmic-400 mt-2">Custom Samia voices</div>
              </div>
            </button>
          </div>
        </div>

        {/* OpenAI Voice Configuration */}
        <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700">
          <h4 className="text-md font-semibold text-white mb-4">OpenAI Voice Configuration</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-cosmic-300 mb-2">
                English Voice
              </label>
              <select
                value={config.openai_voice_en}
                onChange={(e) => updateConfiguration('openai_voice_en', e.target.value)}
                disabled={saving}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
              >
                {openaiVoices.map(voice => (
                  <option key={`en-voice-${voice}`} value={voice}>{voice.charAt(0).toUpperCase() + voice.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-cosmic-300 mb-2">
                Arabic Voice
              </label>
              <select
                value={config.openai_voice_ar}
                onChange={(e) => updateConfiguration('openai_voice_ar', e.target.value)}
                disabled={saving}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
              >
                {openaiVoices.map(voice => (
                  <option key={`ar-voice-${voice}`} value={voice}>{voice.charAt(0).toUpperCase() + voice.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* ElevenLabs Voice Configuration */}
        <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700">
          <h4 className="text-md font-semibold text-white mb-4">ElevenLabs Voice Configuration</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-cosmic-300 mb-2">
                English Voice ID
              </label>
              <input
                type="text"
                value={config.elevenlabs_voice_en}
                onChange={(e) => updateConfiguration('elevenlabs_voice_en', e.target.value)}
                disabled={saving}
                placeholder="Enter ElevenLabs voice ID"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-cosmic-300 mb-2">
                Arabic Voice ID
              </label>
              <input
                type="text"
                value={config.elevenlabs_voice_ar}
                onChange={(e) => updateConfiguration('elevenlabs_voice_ar', e.target.value)}
                disabled={saving}
                placeholder="Enter ElevenLabs voice ID"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>
          <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <div className="flex items-start">
              <InformationCircleIcon className="w-5 h-5 text-blue-400 mt-0.5 mr-2" />
              <div className="text-sm text-blue-300">
                <strong>Note:</strong> ElevenLabs voice IDs are found in your ElevenLabs dashboard. 
                Use custom cloned voices for the best Samia experience.
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  function renderVoiceTestingSection() {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-white">Voice Testing</h3>
          <button
            onClick={() => {
              setTestResults({});
              setMessage('Test results cleared');
              setTimeout(() => setMessage(''), 3000);
            }}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            Clear Results
          </button>
        </div>

        {/* Test Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* OpenAI Testing */}
          <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700">
            <h4 className="text-md font-semibold text-white mb-4 flex items-center">
              <BeakerIcon className="w-5 h-5 mr-2 text-purple-400" />
              OpenAI TTS Testing
            </h4>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-cosmic-300">English ({config.openai_voice_en})</span>
                <button
                  onClick={() => testVoice('en', 'openai')}
                  disabled={testingVoice}
                  className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded text-sm transition-colors disabled:opacity-50"
                >
                  {testingVoice ? 'Testing...' : 'Test'}
                </button>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-cosmic-300">Arabic ({config.openai_voice_ar})</span>
                <button
                  onClick={() => testVoice('ar', 'openai')}
                  disabled={testingVoice}
                  className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded text-sm transition-colors disabled:opacity-50"
                >
                  {testingVoice ? 'Testing...' : 'Test'}
                </button>
              </div>
            </div>
          </div>

          {/* ElevenLabs Testing */}
          <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700">
            <h4 className="text-md font-semibold text-white mb-4 flex items-center">
              <BeakerIcon className="w-5 h-5 mr-2 text-blue-400" />
              ElevenLabs TTS Testing
            </h4>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-cosmic-300">English (Custom)</span>
                <button
                  onClick={() => testVoice('en', 'elevenlabs')}
                  disabled={testingVoice}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-colors disabled:opacity-50"
                >
                  {testingVoice ? 'Testing...' : 'Test'}
                </button>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-cosmic-300">Arabic (Custom)</span>
                <button
                  onClick={() => testVoice('ar', 'elevenlabs')}
                  disabled={testingVoice}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-colors disabled:opacity-50"
                >
                  {testingVoice ? 'Testing...' : 'Test'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Test Results */}
        {Object.keys(testResults).length > 0 && (
          <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700">
            <h4 className="text-md font-semibold text-white mb-4">Test Results</h4>
            <div className="space-y-3">
              {Object.entries(testResults).map(([key, result]) => {
                const [provider, language] = key.split('_');
                return (
                  <div key={`test-result-${key}`} className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                    <div className="flex items-center">
                      <div className={`w-3 h-3 rounded-full mr-3 ${result.success ? 'bg-green-400' : 'bg-red-400'}`}></div>
                      <span className="text-white font-medium">
                        {provider.charAt(0).toUpperCase() + provider.slice(1)} - {language.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      {result.success ? (
                        <>
                          <span className="text-green-400 text-sm">Success</span>
                          {result.audioUrl && (
                            <button
                              onClick={() => {
                                const audio = new Audio(result.audioUrl);
                                setPlayingTest(key);
                                audio.play();
                                audio.onended = () => setPlayingTest(null);
                              }}
                              className="p-1 bg-green-600 hover:bg-green-700 text-white rounded transition-colors"
                            >
                              {playingTest === key ? (
                                <PauseIcon className="w-4 h-4" />
                              ) : (
                                <PlayIcon className="w-4 h-4" />
                              )}
                            </button>
                          )}
                        </>
                      ) : (
                        <span className="text-red-400 text-sm" title={result.error}>
                          Failed
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  function renderGenerationSection() {
    return (
      <div className="space-y-6">
        <h3 className="text-lg font-semibold text-white">Generation Control</h3>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => generateTodaysReadings()}
            disabled={generating}
            className="p-4 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            <SparklesIcon className="w-6 h-6 mx-auto mb-2" />
            <div className="text-sm font-medium">Generate Today</div>
            <div className="text-xs opacity-75">All signs, current date</div>
          </button>
          
          <button
            onClick={() => generateTodaysReadings({ forceRegenerate: true })}
            disabled={generating}
            className="p-4 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            <ArrowPathIcon className="w-6 h-6 mx-auto mb-2" />
            <div className="text-sm font-medium">Force Regenerate</div>
            <div className="text-xs opacity-75">Override existing readings</div>
          </button>
          
          <button
            onClick={() => setActiveSection('schedule')}
            className="p-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <ClockIcon className="w-6 h-6 mx-auto mb-2" />
            <div className="text-sm font-medium">Schedule Settings</div>
            <div className="text-xs opacity-75">Configure automation</div>
          </button>
        </div>

        {/* Advanced Generation Options */}
        <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700">
          <h4 className="text-md font-semibold text-white mb-4">Advanced Generation Options</h4>
          
          {/* Date Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-cosmic-300 mb-2">
                Target Date
              </label>
              <input
                type="date"
                defaultValue={new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-cosmic-300 mb-2">
                TTS Provider Override
              </label>
              <select
                defaultValue={config.default_tts_provider}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
              >
                <option value="openai">OpenAI TTS</option>
                <option value="elevenlabs">ElevenLabs</option>
              </select>
            </div>
          </div>

          {/* Zodiac Sign Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-cosmic-300 mb-3">
              Select Specific Signs (leave empty for all)
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
              {zodiacSigns.map(sign => (
                <label key={`zodiac-sign-${sign.key}`} className="flex items-center p-2 bg-gray-700/50 rounded cursor-pointer hover:bg-gray-700">
                  <input
                    type="checkbox"
                    className="mr-2 text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-sm text-white">
                    {sign.emoji} {sign.name.en}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Generate Button */}
          <div className="flex justify-center">
            <button
              onClick={() => generateTodaysReadings({ 
                // Would collect form data here
              })}
              disabled={generating}
              className="px-8 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center"
            >
              {generating ? (
                <>
                  <ArrowPathIcon className="w-5 h-5 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <SparklesIcon className="w-5 h-5 mr-2" />
                  Start Generation
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  function renderPromptManagementSection() {
    return (
      <div className="space-y-6">
        <h3 className="text-lg font-semibold text-white">Samia Prompt Management</h3>
        
        {/* Samia Tone Prompt */}
        <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700">
          <div className="mb-4">
            <h4 className="text-md font-semibold text-white">AI Personality Prompt</h4>
            <p className="text-sm text-cosmic-300 mt-1">
              Configure how Samia's personality appears in the generated horoscope readings
            </p>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-cosmic-300 mb-2">
                Samia's Tone & Personality Prompt
              </label>
              <textarea
                value={config.samia_tone_prompt || ''}
                onChange={(e) => updateConfiguration('samia_tone_prompt', e.target.value)}
                disabled={saving}
                rows={6}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500 resize-none"
                placeholder="Enter the AI prompt that defines Samia's personality and tone..."
              />
            </div>
            
            <div className="flex items-center justify-between pt-4 border-t border-gray-700">
              <div className="text-sm text-cosmic-300">
                This prompt will be used for all AI-generated horoscope content
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => updateConfiguration('samia_tone_prompt', 'You are Samia, a mystical and wise tarot reader. Speak with warmth, insight, and gentle guidance. Use cosmic and spiritual language that feels authentic and caring.')}
                  disabled={saving}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors text-sm"
                >
                  Reset to Default
                </button>
                <button
                  onClick={() => {
                    const currentPrompt = config.samia_tone_prompt || '';
                    const testText = `Using current prompt: "${currentPrompt.substring(0, 100)}..." to generate a sample Aries reading.`;
                    setMessage(testText);
                    setTimeout(() => setMessage(''), 5000);
                  }}
                  disabled={saving}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors text-sm"
                >
                  Test Prompt
                </button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Prompt Guidelines */}
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <InformationCircleIcon className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
            <div>
              <h5 className="text-blue-300 font-medium">Prompt Guidelines</h5>
              <ul className="text-sm text-blue-200 mt-2 space-y-1">
                <li>• Keep the prompt focused on Samia's personality and tone</li>
                <li>• Use clear, specific language about her mystical and caring nature</li>
                <li>• Avoid overly complex instructions that might confuse the AI</li>
                <li>• Test changes with sample generations before applying</li>
                <li>• Remember this affects both English and Arabic content</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  function renderScheduleSection() {
    return (
      <div className="space-y-6">
        <h3 className="text-lg font-semibold text-white">Schedule Settings</h3>

        {/* Auto Generation Toggle */}
        <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h4 className="text-md font-semibold text-white">Automatic Generation</h4>
              <p className="text-sm text-cosmic-300">Enable daily automatic generation of horoscopes</p>
            </div>
            <button
              onClick={() => updateConfiguration('auto_generation_enabled', !config.auto_generation_enabled)}
              disabled={saving}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                config.auto_generation_enabled ? 'bg-purple-600' : 'bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  config.auto_generation_enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
          
          {config.auto_generation_enabled && (
            <div className="space-y-4 pt-4 border-t border-gray-700">
              <div>
                <label className="block text-sm font-medium text-cosmic-300 mb-2">
                  Generation Time (UTC)
                </label>
                <input
                  type="time"
                  defaultValue="02:00"
                  className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-cosmic-300 mb-2">
                  Timezone
                </label>
                <select
                  value={config.generation_timezone}
                  onChange={(e) => updateConfiguration('generation_timezone', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="UTC">UTC</option>
                  <option value="America/New_York">Eastern Time</option>
                  <option value="America/Los_Angeles">Pacific Time</option>
                  <option value="Europe/London">London</option>
                  <option value="Asia/Dubai">Dubai</option>
                  <option value="Asia/Riyadh">Riyadh</option>
                </select>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  function renderLogsSection() {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-white">Generation Logs</h3>
          <button
            onClick={loadGenerationLogs}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
          >
            Refresh
          </button>
        </div>

        <div className="space-y-3">
          {generationLogs.length === 0 ? (
            <div className="text-center py-8 text-cosmic-300">
              No generation logs found
            </div>
          ) : (
            generationLogs.map((log) => (
              <div key={log.id} className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-white font-medium">
                      Generation #{log.id}
                    </div>
                    <div className="text-sm text-cosmic-300">
                      {new Date(log.created_at).toLocaleString()}
                    </div>
                  </div>
                  <div className={`px-2 py-1 rounded text-xs font-medium ${
                    log.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                    log.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                    'bg-yellow-500/20 text-yellow-400'
                  }`}>
                    {log.status || 'Unknown'}
                  </div>
                </div>
                
                {log.details && (
                  <div className="mt-2 text-sm text-cosmic-300">
                    {log.details}
                  </div>
                )}
                
                {log.signs_generated && (
                  <div className="mt-2 text-xs text-cosmic-400">
                    Generated: {log.signs_generated.join(', ')}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center">
            <StarIcon className="w-8 h-8 mr-3 text-purple-400" />
            Daily Zodiac Management
          </h1>
          <p className="text-cosmic-300 mt-1">
            Configure TTS providers, voices, and generation settings for daily horoscopes
          </p>
        </div>
        <div className="flex items-center space-x-3">
          {message && (
            <div className={`px-4 py-2 rounded-lg text-sm ${
              message.includes('Error') || message.includes('failed')
                ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                : 'bg-green-500/20 text-green-300 border border-green-500/30'
            }`}>
              {message}
            </div>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex space-x-1 bg-gray-800/50 p-1 rounded-lg">
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <button
              key={`section-tab-${section.id}`}
              onClick={() => setActiveSection(section.id)}
              className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeSection === section.id
                  ? 'bg-purple-600 text-white'
                  : 'text-cosmic-300 hover:text-white hover:bg-gray-700'
              }`}
            >
              <Icon className="w-4 h-4 mr-2" />
              {section.name}
            </button>
          );
        })}
      </div>

      {/* Content Area */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeSection}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.2 }}
        >
          {activeSection === 'overview' && renderOverviewSection()}
          {activeSection === 'tts_config' && renderTTSConfigSection()}
          {activeSection === 'voice_testing' && renderVoiceTestingSection()}
          {activeSection === 'generation' && renderGenerationSection()}
          {activeSection === 'prompt_management' && renderPromptManagementSection()}
          {activeSection === 'schedule' && renderScheduleSection()}
          {activeSection === 'logs' && renderLogsSection()}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default DailyZodiacManagementTab; 