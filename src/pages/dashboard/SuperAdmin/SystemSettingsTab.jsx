import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../../services/frontendApi.js';
import PaymentSettingsManager from '../../../components/Admin/PaymentSettingsManager.jsx';
import RewardsManagement from '../../../components/Admin/RewardsManagement.jsx';
import {
  CogIcon,
  KeyIcon,
  CircleStackIcon,
  CloudIcon,
  ShieldCheckIcon,
  BellIcon,
  GlobeAltIcon,
  CurrencyDollarIcon,
  TrophyIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  EyeIcon,
  EyeSlashIcon
} from '@heroicons/react/24/outline';

const SystemSettingsTab = () => {
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [activeSection, setActiveSection] = useState('database');
  const [showSecrets, setShowSecrets] = useState({});

  const sections = [
    { id: 'database', name: 'Database', icon: CircleStackIcon },
    { id: 'payments', name: 'Payments', icon: CurrencyDollarIcon },
    { id: 'rewards', name: 'Rewards System', icon: TrophyIcon },
    { id: 'notifications', name: 'Notifications', icon: BellIcon },
    { id: 'security', name: 'Security', icon: ShieldCheckIcon },
    { id: 'localization', name: 'Localization', icon: GlobeAltIcon },
    { id: 'system', name: 'System', icon: CloudIcon }
  ];

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const result = await api.getSystemSettings();
      if (result.success) {
        setSettings(result.data);
      } else {
        setMessage(`Error loading settings: ${result.error}`);
      }
    } catch (error) {
      setMessage(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (category, key, value) => {
    try {
      setSaving(true);
      const result = await api.updateSystemSetting(key, value, category);
      if (result.success) {
        setSettings(prev => ({
          ...prev,
          [category]: {
            ...prev[category],
            [key]: value
          }
        }));
        setMessage('Setting updated successfully');
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage(`Error updating setting: ${result.error}`);
        setTimeout(() => setMessage(''), 5000);
      }
    } catch (error) {
      setMessage(`Error: ${error.message}`);
      setTimeout(() => setMessage(''), 5000);
    } finally {
      setSaving(false);
    }
  };

  const toggleSecret = (key) => {
    setShowSecrets(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const renderSecretInput = (category, key, value, label, placeholder) => (
    <div>
      <label className="block text-sm font-medium text-cosmic-300 mb-2">
        {label}
      </label>
      <div className="relative">
        <input
          type={showSecrets[key] ? 'text' : 'password'}
          value={value || ''}
          onChange={(e) => updateSetting(category, key, e.target.value)}
          placeholder={placeholder}
          className="w-full px-4 py-2 pr-10 bg-white/10 border border-white/20 rounded-lg text-white placeholder-cosmic-300 focus:border-purple-400 focus:outline-none"
        />
        <button
          type="button"
          onClick={() => toggleSecret(key)}
          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-cosmic-300 hover:text-white"
        >
          {showSecrets[key] ? 
            <EyeSlashIcon className="w-4 h-4" /> : 
            <EyeIcon className="w-4 h-4" />
          }
        </button>
      </div>
    </div>
  );

  const renderInput = (category, key, value, label, placeholder, type = 'text') => (
    <div>
      <label className="block text-sm font-medium text-cosmic-300 mb-2">
        {label}
      </label>
      <input
        type={type}
        value={value || ''}
        onChange={(e) => updateSetting(category, key, e.target.value)}
        placeholder={placeholder}
        className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-cosmic-300 focus:border-purple-400 focus:outline-none"
      />
    </div>
  );

  const renderToggle = (category, key, value, label, description) => (
    <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
      <div>
        <h4 className="text-white font-medium">{label}</h4>
        <p className="text-cosmic-300 text-sm">{description}</p>
      </div>
      <button
        onClick={() => updateSetting(category, key, !value)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          value ? 'bg-purple-600' : 'bg-gray-600'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            value ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );

  const renderAPIKeysSection = () => (
    <div className="space-y-6">
      <h3 className="text-xl font-bold text-white mb-4">API Keys & External Services</h3>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* OpenAI */}
        <div className="bg-white/5 backdrop-blur-sm border border-white/20 rounded-xl p-6">
          <h4 className="text-lg font-bold text-white mb-4 flex items-center">
            <KeyIcon className="w-5 h-5 text-green-400 mr-2" />
            OpenAI Configuration
          </h4>
          <div className="space-y-4">
            {renderSecretInput('api_keys', 'openai_api_key', settings.api_keys?.openai_api_key, 'API Key', 'sk-...')}
            {renderInput('api_keys', 'openai_organization', settings.api_keys?.openai_organization, 'Organization ID', 'org-...')}
            {renderInput('api_keys', 'openai_model', settings.api_keys?.openai_model, 'Default Model', 'gpt-4')}
          </div>
        </div>

        {/* Supabase */}
        <div className="bg-white/5 backdrop-blur-sm border border-white/20 rounded-xl p-6">
          <h4 className="text-lg font-bold text-white mb-4 flex items-center">
            <CircleStackIcon className="w-5 h-5 text-blue-400 mr-2" />
            Supabase Configuration
          </h4>
          <div className="space-y-4">
            {renderInput('api_keys', 'supabase_url', settings.api_keys?.supabase_url, 'Project URL', 'https://xxx.supabase.co')}
            {renderSecretInput('api_keys', 'supabase_anon_key', settings.api_keys?.supabase_anon_key, 'Anon Key', 'eyJ...')}
            {renderSecretInput('api_keys', 'supabase_service_key', settings.api_keys?.supabase_service_key, 'Service Role Key', 'eyJ...')}
          </div>
        </div>

        {/* Stripe */}
        <div className="bg-white/5 backdrop-blur-sm border border-white/20 rounded-xl p-6">
          <h4 className="text-lg font-bold text-white mb-4 flex items-center">
            <CurrencyDollarIcon className="w-5 h-5 text-purple-400 mr-2" />
            Stripe Configuration
          </h4>
          <div className="space-y-4">
            {renderSecretInput('api_keys', 'stripe_publishable_key', settings.api_keys?.stripe_publishable_key, 'Publishable Key', 'pk_...')}
            {renderSecretInput('api_keys', 'stripe_secret_key', settings.api_keys?.stripe_secret_key, 'Secret Key', 'sk_...')}
            {renderSecretInput('api_keys', 'stripe_webhook_secret', settings.api_keys?.stripe_webhook_secret, 'Webhook Secret', 'whsec_...')}
          </div>
        </div>

        {/* WebRTC */}
        <div className="bg-white/5 backdrop-blur-sm border border-white/20 rounded-xl p-6">
          <h4 className="text-lg font-bold text-white mb-4 flex items-center">
            <CloudIcon className="w-5 h-5 text-cyan-400 mr-2" />
            WebRTC Configuration
          </h4>
          <div className="space-y-4">
            {renderInput('api_keys', 'webrtc_ice_servers', settings.api_keys?.webrtc_ice_servers, 'ICE Servers', 'stun:stun.l.google.com:19302')}
            {renderSecretInput('api_keys', 'turn_server_username', settings.api_keys?.turn_server_username, 'TURN Username', 'username')}
            {renderSecretInput('api_keys', 'turn_server_credential', settings.api_keys?.turn_server_credential, 'TURN Credential', 'password')}
          </div>
        </div>
      </div>
    </div>
  );

  const renderPaymentsSection = () => (
    <div className="space-y-6">
      {/* Payment Methods Management */}
      <PaymentSettingsManager />
      
      {/* Legacy Payment Settings */}
      <div className="bg-white/5 backdrop-blur-sm border border-white/20 rounded-xl p-6">
        <h3 className="text-xl font-bold text-white mb-4">Platform Settings</h3>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white/5 backdrop-blur-sm border border-white/20 rounded-xl p-6">
            <h4 className="text-lg font-bold text-white mb-4">Commission & Fees</h4>
            <div className="space-y-4">
              {renderInput('payments', 'platform_commission_rate', settings.payments?.platform_commission_rate, 'Platform Commission (%)', '15', 'number')}
              {renderInput('payments', 'min_booking_amount', settings.payments?.min_booking_amount, 'Minimum Booking Amount (SAR)', '50', 'number')}
              {renderInput('payments', 'max_booking_amount', settings.payments?.max_booking_amount, 'Maximum Booking Amount (SAR)', '1000', 'number')}
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-sm border border-white/20 rounded-xl p-6">
            <h4 className="text-lg font-bold text-white mb-4">Gateway Features</h4>
            <div className="space-y-4">
              {renderToggle('payments', 'stripe_enabled', settings.payments?.stripe_enabled, 'Stripe Gateway', 'Enable Stripe payment gateway')}
              {renderToggle('payments', 'apple_pay_enabled', settings.payments?.apple_pay_enabled, 'Apple Pay', 'Accept Apple Pay payments')}
              {renderToggle('payments', 'google_pay_enabled', settings.payments?.google_pay_enabled, 'Google Pay', 'Accept Google Pay payments')}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSecuritySection = () => (
    <div className="space-y-6">
      <h3 className="text-xl font-bold text-white mb-4">Security Settings</h3>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white/5 backdrop-blur-sm border border-white/20 rounded-xl p-6">
          <h4 className="text-lg font-bold text-white mb-4">Authentication</h4>
          <div className="space-y-4">
            {renderInput('security', 'session_timeout_minutes', settings.security?.session_timeout_minutes, 'Session Timeout (minutes)', '60', 'number')}
            {renderInput('security', 'max_login_attempts', settings.security?.max_login_attempts, 'Max Login Attempts', '5', 'number')}
            {renderInput('security', 'password_min_length', settings.security?.password_min_length, 'Minimum Password Length', '8', 'number')}
          </div>
        </div>

        <div className="bg-white/5 backdrop-blur-sm border border-white/20 rounded-xl p-6">
          <h4 className="text-lg font-bold text-white mb-4">Security Features</h4>
          <div className="space-y-4">
            {renderToggle('security', 'two_factor_required', settings.security?.two_factor_required, '2FA Required', 'Require two-factor authentication')}
            {renderToggle('security', 'email_verification_required', settings.security?.email_verification_required, 'Email Verification', 'Require email verification for new accounts')}
            {renderToggle('security', 'auto_logout_enabled', settings.security?.auto_logout_enabled, 'Auto Logout', 'Automatically logout inactive users')}
          </div>
        </div>
      </div>
    </div>
  );

  const renderNotificationsSection = () => (
    <div className="space-y-6">
      <h3 className="text-xl font-bold text-white mb-4">Notification Settings</h3>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white/5 backdrop-blur-sm border border-white/20 rounded-xl p-6">
          <h4 className="text-lg font-bold text-white mb-4">Email Notifications</h4>
          <div className="space-y-4">
            {renderToggle('notifications', 'booking_confirmations', settings.notifications?.booking_confirmations, 'Booking Confirmations', 'Send email confirmations for bookings')}
            {renderToggle('notifications', 'payment_receipts', settings.notifications?.payment_receipts, 'Payment Receipts', 'Send email receipts for payments')}
            {renderToggle('notifications', 'reminder_emails', settings.notifications?.reminder_emails, 'Reminder Emails', 'Send reminder emails before sessions')}
          </div>
        </div>

        <div className="bg-white/5 backdrop-blur-sm border border-white/20 rounded-xl p-6">
          <h4 className="text-lg font-bold text-white mb-4">Push Notifications</h4>
          <div className="space-y-4">
            {renderToggle('notifications', 'push_new_bookings', settings.notifications?.push_new_bookings, 'New Bookings', 'Notify readers of new bookings')}
            {renderToggle('notifications', 'push_session_reminders', settings.notifications?.push_session_reminders, 'Session Reminders', 'Remind users of upcoming sessions')}
            {renderToggle('notifications', 'push_chat_messages', settings.notifications?.push_chat_messages, 'Chat Messages', 'Notify of new chat messages')}
          </div>
        </div>
      </div>
    </div>
  );

  const renderSystemSection = () => (
    <div className="space-y-6">
      <h3 className="text-xl font-bold text-white mb-4">System Configuration</h3>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white/5 backdrop-blur-sm border border-white/20 rounded-xl p-6">
          <h4 className="text-lg font-bold text-white mb-4">Performance</h4>
          <div className="space-y-4">
            {renderInput('system', 'max_concurrent_sessions', settings.system?.max_concurrent_sessions, 'Max Concurrent Sessions', '1000', 'number')}
            {renderInput('system', 'session_duration_limit', settings.system?.session_duration_limit, 'Max Session Duration (minutes)', '120', 'number')}
            {renderInput('system', 'file_upload_max_size', settings.system?.file_upload_max_size, 'Max File Upload Size (MB)', '10', 'number')}
          </div>
        </div>

        <div className="bg-white/5 backdrop-blur-sm border border-white/20 rounded-xl p-6">
          <h4 className="text-lg font-bold text-white mb-4">Features</h4>
          <div className="space-y-4">
            {renderToggle('system', 'maintenance_mode', settings.system?.maintenance_mode, 'Maintenance Mode', 'Put the system in maintenance mode')}
            {renderToggle('system', 'new_registrations_enabled', settings.system?.new_registrations_enabled, 'New Registrations', 'Allow new user registrations')}
            {renderToggle('system', 'ai_features_enabled', settings.system?.ai_features_enabled, 'AI Features', 'Enable AI-powered features')}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center">
            <CogIcon className="w-8 h-8 text-purple-400 mr-3" />
            System Settings
          </h2>
          <p className="text-cosmic-300 mt-1">
            Configure platform-wide settings and integrations
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={loadSettings}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            Refresh
          </motion.button>
        </div>
      </div>

      {/* Message */}
      {message && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-lg ${
            message.includes('Error') 
              ? 'bg-red-500/20 border border-red-500/30 text-red-400'
              : 'bg-green-500/20 border border-green-500/30 text-green-400'
          }`}
        >
          {message}
        </motion.div>
      )}

      {/* Navigation Tabs */}
      <div className="bg-white/5 backdrop-blur-sm border border-white/20 rounded-xl p-2">
        <div className="flex flex-wrap gap-2">
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <motion.button
                key={section.id}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setActiveSection(section.id)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                  activeSection === section.id
                    ? 'bg-purple-600 text-white'
                    : 'text-cosmic-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="text-sm font-medium">{section.name}</span>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="bg-white/5 backdrop-blur-sm border border-white/20 rounded-xl p-8 text-center">
          <div className="animate-spin w-8 h-8 border-4 border-purple-400 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-cosmic-300">Loading settings...</p>
        </div>
      ) : (
        <motion.div
          key={activeSection}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* API Keys section removed as per user requirements */}
          {activeSection === 'payments' && renderPaymentsSection()}
          {activeSection === 'rewards' && (
            <RewardsManagement />
          )}
          {activeSection === 'security' && renderSecuritySection()}
          {activeSection === 'notifications' && renderNotificationsSection()}
          {activeSection === 'system' && renderSystemSection()}
          {activeSection === 'database' && (
            <div className="bg-white/5 backdrop-blur-sm border border-white/20 rounded-xl p-8 text-center">
              <CircleStackIcon className="w-16 h-16 text-cosmic-300 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">Database Management</h3>
              <p className="text-cosmic-300">Advanced database operations coming soon</p>
            </div>
          )}
          {activeSection === 'localization' && (
            <div className="bg-white/5 backdrop-blur-sm border border-white/20 rounded-xl p-8 text-center">
              <GlobeAltIcon className="w-16 h-16 text-cosmic-300 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">Localization</h3>
              <p className="text-cosmic-300">Language and region settings coming soon</p>
            </div>
          )}
        </motion.div>
      )}

      {/* Save Indicator */}
      {saving && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="fixed bottom-4 right-4 bg-purple-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2"
        >
          <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
          <span>Saving...</span>
        </motion.div>
      )}
    </div>
  );
};

export default SystemSettingsTab; 