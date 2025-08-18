import React, { useState, useEffect } from 'react';
import { 
  PhoneIcon, 
  VideoCameraIcon, 
  CurrencyDollarIcon, 
  ClockIcon,
  ExclamationTriangleIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  PlayIcon,
  PauseIcon
} from '@heroicons/react/24/solid';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';

const EmergencyCallManagement = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('pricing');
  const [pricing, setPricing] = useState([]);
  const [settings, setSettings] = useState([]);
  const [callLogs, setCallLogs] = useState([]);
  const [analytics, setAnalytics] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    
    try {
      switch (activeTab) {
        case 'pricing':
          await fetchPricing();
          break;
        case 'settings':
          await fetchSettings();
          break;
        case 'logs':
          await fetchCallLogs();
          break;
        case 'analytics':
          await fetchAnalytics();
          break;
      }
    } catch (err) {
      setError('Failed to fetch data');
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPricing = async () => {
    const response = await fetch('/api/emergency-calls/pricing', {
      headers: {
        'Authorization': `Bearer ${user?.access_token}`
      }
    });
    
    if (!response.ok) throw new Error('Failed to fetch pricing');
    
    const result = await response.json();
    setPricing(result.data || []);
  };

  const fetchSettings = async () => {
    const { data, error } = await supabase
      .from('emergency_call_settings')
      .select('*')
      .order('setting_type', { ascending: true });

    if (error) throw error;
    setSettings(data || []);
  };

  const fetchCallLogs = async () => {
    const { data, error } = await supabase
      .from('emergency_call_logs')
      .select(`
        *,
        client:profiles!emergency_call_logs_client_id_fkey(id, full_name, email),
        reader:profiles!emergency_call_logs_reader_id_fkey(id, full_name, email),
        emergency_call_transactions(*)
      `)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    setCallLogs(data || []);
  };

  const fetchAnalytics = async () => {
    const { data: totalCalls } = await supabase
      .from('emergency_call_logs')
      .select('id', { count: 'exact' });

    const { data: todayCalls } = await supabase
      .from('emergency_call_logs')
      .select('id', { count: 'exact' })
      .gte('created_at', new Date().toISOString().split('T')[0]);

    const { data: revenue } = await supabase
      .from('emergency_call_transactions')
      .select('total_amount')
      .eq('payment_status', 'completed');

    const totalRevenue = revenue?.reduce((sum, t) => sum + parseFloat(t.total_amount), 0) || 0;

    setAnalytics({
      totalCalls: totalCalls?.length || 0,
      todayCalls: todayCalls?.length || 0,
      totalRevenue,
      averageResponseTime: 45 // This would be calculated from actual data
    });
  };

  const updatePricing = async (id, updates) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/emergency-calls/pricing/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.access_token}`
        },
        body: JSON.stringify(updates)
      });

      if (!response.ok) throw new Error('Failed to update pricing');

      setSuccess('Pricing updated successfully');
      await fetchPricing();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (id, value) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('emergency_call_settings')
        .update({ 
          setting_value: value,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;

      setSuccess('Setting updated successfully');
      await fetchSettings();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'pricing', label: 'Pricing', icon: CurrencyDollarIcon },
    { id: 'settings', label: 'Settings', icon: Cog6ToothIcon },
    { id: 'logs', label: 'Call Logs', icon: PhoneIcon },
    { id: 'analytics', label: 'Analytics', icon: ChartBarIcon }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Emergency Call Management</h1>
          <p className="text-gray-400 mt-2">Manage emergency call pricing, settings, and monitor activity</p>
        </div>
        <div className="flex items-center space-x-2">
          <ExclamationTriangleIcon className="w-8 h-8 text-red-500 animate-pulse" />
          <span className="text-red-400 font-semibold">EMERGENCY SYSTEM</span>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="bg-red-900/50 border border-red-600 rounded-lg p-4">
          <p className="text-red-300">{error}</p>
        </div>
      )}
      {success && (
        <div className="bg-green-900/50 border border-green-600 rounded-lg p-4">
          <p className="text-green-300">{success}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-700">
        <nav className="flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200
                  ${activeTab === tab.id
                    ? 'border-purple-500 text-purple-300'
                    : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
                  }
                `}
              >
                <Icon className="w-5 h-5 mr-2" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-gray-800 rounded-lg p-6">
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
          </div>
        )}

        {!loading && activeTab === 'pricing' && (
          <PricingTab pricing={pricing} onUpdate={updatePricing} />
        )}

        {!loading && activeTab === 'settings' && (
          <SettingsTab settings={settings} onUpdate={updateSetting} />
        )}

        {!loading && activeTab === 'logs' && (
          <LogsTab logs={callLogs} />
        )}

        {!loading && activeTab === 'analytics' && (
          <AnalyticsTab analytics={analytics} />
        )}
      </div>
    </div>
  );
};

// Pricing Tab Component
const PricingTab = ({ pricing, onUpdate }) => {
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});

  const startEdit = (item) => {
    setEditingId(item.id);
    setEditForm(item);
  };

  const saveEdit = async () => {
    await onUpdate(editingId, editForm);
    setEditingId(null);
    setEditForm({});
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Emergency Call Pricing</h2>
        <p className="text-gray-400">Configure pricing for audio and video emergency calls</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {pricing.map((item) => {
          const isEditing = editingId === item.id;
          const Icon = item.call_type === 'audio' ? PhoneIcon : VideoCameraIcon;

          return (
            <div key={item.id} className="bg-gray-900 rounded-lg p-6 border border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <Icon className="w-6 h-6 text-purple-400 mr-3" />
                  <h3 className="text-lg font-semibold text-white capitalize">
                    {item.call_type} Call
                  </h3>
                </div>
                {!isEditing && (
                  <button
                    onClick={() => startEdit(item)}
                    className="text-purple-400 hover:text-purple-300 text-sm"
                  >
                    Edit
                  </button>
                )}
              </div>

              {isEditing ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Base Price ($)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={editForm.base_price || ''}
                      onChange={(e) => setEditForm({ ...editForm, base_price: parseFloat(e.target.value) })}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Emergency Multiplier
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={editForm.emergency_multiplier || ''}
                      onChange={(e) => setEditForm({ ...editForm, emergency_multiplier: parseFloat(e.target.value) })}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Per Minute Rate ($)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={editForm.per_minute_rate || ''}
                      onChange={(e) => setEditForm({ ...editForm, per_minute_rate: parseFloat(e.target.value) })}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white"
                    />
                  </div>
                  <div className="flex space-x-3">
                    <button
                      onClick={saveEdit}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg"
                    >
                      Save
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Base Price:</span>
                    <span className="text-white font-semibold">${item.base_price}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Emergency Multiplier:</span>
                    <span className="text-white font-semibold">{item.emergency_multiplier}x</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Final Emergency Price:</span>
                    <span className="text-green-400 font-bold text-lg">
                      ${(item.base_price * item.emergency_multiplier).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Per Minute Rate:</span>
                    <span className="text-white font-semibold">${item.per_minute_rate}/min</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Status:</span>
                    <span className={`font-semibold ${item.is_active ? 'text-green-400' : 'text-red-400'}`}>
                      {item.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Settings Tab Component
const SettingsTab = ({ settings, onUpdate }) => {
  const updateSettingValue = (setting, newValue) => {
    onUpdate(setting.id, newValue);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Emergency Call Settings</h2>
        <p className="text-gray-400">Configure system-wide emergency call behavior</p>
      </div>

      <div className="grid gap-6">
        {settings.map((setting) => (
          <div key={setting.id} className="bg-gray-900 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-white">{setting.setting_key}</h3>
                <p className="text-gray-400 text-sm">{setting.description}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                setting.is_active ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'
              }`}>
                {setting.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>

            <div className="bg-gray-800 rounded p-3">
              <pre className="text-gray-300 text-sm overflow-x-auto">
                {JSON.stringify(setting.setting_value, null, 2)}
              </pre>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Logs Tab Component
const LogsTab = ({ logs }) => {
  const getStatusColor = (status) => {
    const colors = {
      pending: 'text-yellow-400',
      accepted: 'text-green-400',
      completed: 'text-blue-400',
      escalated: 'text-red-400',
      cancelled: 'text-gray-400'
    };
    return colors[status] || 'text-gray-400';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Emergency Call Logs</h2>
        <p className="text-gray-400">Recent emergency call activity</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="text-left py-3 px-4 text-gray-300 font-medium">Time</th>
              <th className="text-left py-3 px-4 text-gray-300 font-medium">Client</th>
              <th className="text-left py-3 px-4 text-gray-300 font-medium">Reader</th>
              <th className="text-left py-3 px-4 text-gray-300 font-medium">Type</th>
              <th className="text-left py-3 px-4 text-gray-300 font-medium">Status</th>
              <th className="text-left py-3 px-4 text-gray-300 font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} className="border-b border-gray-800 hover:bg-gray-700/50">
                <td className="py-3 px-4 text-gray-300">
                  {new Date(log.created_at).toLocaleString()}
                </td>
                <td className="py-3 px-4 text-white">
                  {log.client?.full_name || 'Unknown'}
                </td>
                <td className="py-3 px-4 text-white">
                  {log.reader?.full_name || 'Unassigned'}
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center">
                    {log.call_type === 'audio' ? (
                      <PhoneIcon className="w-4 h-4 text-blue-400 mr-2" />
                    ) : (
                      <VideoCameraIcon className="w-4 h-4 text-purple-400 mr-2" />
                    )}
                    <span className="text-gray-300 capitalize">{log.call_type}</span>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <span className={`font-medium ${getStatusColor(log.status)}`}>
                    {log.status}
                  </span>
                </td>
                <td className="py-3 px-4 text-green-400 font-semibold">
                  {log.emergency_call_transactions?.[0]?.total_amount 
                    ? `$${log.emergency_call_transactions[0].total_amount}`
                    : '-'
                  }
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Analytics Tab Component
const AnalyticsTab = ({ analytics }) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Emergency Call Analytics</h2>
        <p className="text-gray-400">System performance and usage statistics</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <div className="bg-gray-900 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center">
            <PhoneIcon className="w-8 h-8 text-blue-400" />
            <div className="ml-4">
              <p className="text-gray-400 text-sm">Total Calls</p>
              <p className="text-2xl font-bold text-white">{analytics.totalCalls}</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-900 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center">
            <ClockIcon className="w-8 h-8 text-yellow-400" />
            <div className="ml-4">
              <p className="text-gray-400 text-sm">Today's Calls</p>
              <p className="text-2xl font-bold text-white">{analytics.todayCalls}</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-900 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center">
            <CurrencyDollarIcon className="w-8 h-8 text-green-400" />
            <div className="ml-4">
              <p className="text-gray-400 text-sm">Total Revenue</p>
              <p className="text-2xl font-bold text-white">${analytics.totalRevenue?.toFixed(2)}</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-900 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center">
            <ChartBarIcon className="w-8 h-8 text-purple-400" />
            <div className="ml-4">
              <p className="text-gray-400 text-sm">Avg Response</p>
              <p className="text-2xl font-bold text-white">{analytics.averageResponseTime}s</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmergencyCallManagement; 