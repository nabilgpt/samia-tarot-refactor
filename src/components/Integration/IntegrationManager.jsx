import React, { useState, useEffect } from 'react';
import { 
  Plus, Settings, Check, X, AlertCircle, 
  Calendar, Video, Mail, Globe, Key,
  RefreshCw, Trash2, Edit, ExternalLink
} from 'lucide-react';
import { supabase } from '../../lib/supabase.js';
import { useAuth } from '../../context/AuthContext.jsx';

const IntegrationManager = () => {
  const { user } = useAuth();
  const [integrations, setIntegrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState(null);

  const availableIntegrations = [
    {
      id: 'google_calendar',
      name: 'Google Calendar',
      description: 'Sync your appointments with Google Calendar',
      icon: Calendar,
      color: 'blue',
      fields: [
        { name: 'client_id', label: 'Client ID', type: 'text', required: true },
        { name: 'client_secret', label: 'Client Secret', type: 'password', required: true },
        { name: 'calendar_id', label: 'Calendar ID', type: 'text', required: false }
      ]
    },
    {
      id: 'zoom',
      name: 'Zoom',
      description: 'Create Zoom meetings for video sessions',
      icon: Video,
      color: 'indigo',
      fields: [
        { name: 'api_key', label: 'API Key', type: 'text', required: true },
        { name: 'api_secret', label: 'API Secret', type: 'password', required: true },
        { name: 'webhook_secret', label: 'Webhook Secret', type: 'password', required: false }
      ]
    },
    {
      id: 'mailchimp',
      name: 'Mailchimp',
      description: 'Manage email marketing and client communications',
      icon: Mail,
      color: 'yellow',
      fields: [
        { name: 'api_key', label: 'API Key', type: 'password', required: true },
        { name: 'server_prefix', label: 'Server Prefix', type: 'text', required: true },
        { name: 'list_id', label: 'Default List ID', type: 'text', required: false }
      ]
    },
    {
      id: 'stripe',
      name: 'Stripe',
      description: 'Process payments and manage subscriptions',
      icon: Globe,
      color: 'purple',
      fields: [
        { name: 'publishable_key', label: 'Publishable Key', type: 'text', required: true },
        { name: 'secret_key', label: 'Secret Key', type: 'password', required: true },
        { name: 'webhook_secret', label: 'Webhook Secret', type: 'password', required: false }
      ]
    }
  ];

  useEffect(() => {
    if (user?.id) {
      loadIntegrations();
    }
  }, [user?.id]);

  const loadIntegrations = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('integrations')
        .select('*')
        .eq('reader_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setIntegrations(data || []);
    } catch (error) {
      console.error('Error loading integrations:', error);
    } finally {
      setLoading(false);
    }
  };

  const addIntegration = async (integrationType, config) => {
    try {
      const integrationInfo = availableIntegrations.find(i => i.id === integrationType);
      
      const { data, error } = await supabase
        .from('integrations')
        .insert({
          reader_id: user.id,
          integration_type: integrationType,
          integration_name: integrationInfo.name,
          config: config,
          is_active: true,
          sync_status: 'pending'
        })
        .select()
        .single();

      if (error) throw error;

      setIntegrations(prev => [data, ...prev]);
      setShowAddModal(false);
      
      // Test the integration
      await testIntegration(data.id);
    } catch (error) {
      console.error('Error adding integration:', error);
      alert('Error adding integration');
    }
  };

  const updateIntegration = async (id, updates) => {
    try {
      const { data, error } = await supabase
        .from('integrations')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setIntegrations(prev => 
        prev.map(integration => 
          integration.id === id ? data : integration
        )
      );
    } catch (error) {
      console.error('Error updating integration:', error);
    }
  };

  const deleteIntegration = async (id) => {
    if (!confirm('Are you sure you want to delete this integration?')) return;

    try {
      const { error } = await supabase
        .from('integrations')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setIntegrations(prev => prev.filter(integration => integration.id !== id));
    } catch (error) {
      console.error('Error deleting integration:', error);
    }
  };

  const testIntegration = async (id) => {
    try {
      // Update status to testing
      await updateIntegration(id, { sync_status: 'testing' });

      // Simulate API test (in real implementation, this would call the actual API)
      setTimeout(async () => {
        const success = Math.random() > 0.3; // 70% success rate for demo
        await updateIntegration(id, { 
          sync_status: success ? 'success' : 'error',
          error_message: success ? null : 'Connection failed. Please check your credentials.',
          last_sync_at: success ? new Date().toISOString() : null
        });
      }, 2000);
    } catch (error) {
      console.error('Error testing integration:', error);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'success':
        return 'text-green-600 bg-green-100';
      case 'error':
        return 'text-red-600 bg-red-100';
      case 'testing':
        return 'text-yellow-600 bg-yellow-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success':
        return <Check className="w-4 h-4" />;
      case 'error':
        return <X className="w-4 h-4" />;
      case 'testing':
        return <RefreshCw className="w-4 h-4 animate-spin" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Integration Manager</h1>
            <p className="text-gray-600 mt-2">Connect your favorite tools and services</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Integration
          </button>
        </div>

        {/* Active Integrations */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {integrations.map((integration) => {
            const integrationInfo = availableIntegrations.find(i => i.id === integration.integration_type);
            const Icon = integrationInfo?.icon || Globe;
            
            return (
              <div key={integration.id} className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <div className={`p-3 rounded-full bg-${integrationInfo?.color || 'gray'}-100`}>
                      <Icon className={`w-6 h-6 text-${integrationInfo?.color || 'gray'}-600`} />
                    </div>
                    <div className="ml-3">
                      <h3 className="font-semibold text-gray-900">{integration.integration_name}</h3>
                      <p className="text-sm text-gray-500">{integrationInfo?.description}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setSelectedIntegration(integration)}
                      className="p-2 text-gray-400 hover:text-gray-600"
                    >
                      <Settings className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteIntegration(integration.id)}
                      className="p-2 text-gray-400 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Status</span>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(integration.sync_status)}`}>
                      {getStatusIcon(integration.sync_status)}
                      <span className="ml-1 capitalize">{integration.sync_status}</span>
                    </span>
                  </div>

                  {integration.last_sync_at && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Last Sync</span>
                      <span className="text-sm text-gray-900">
                        {new Date(integration.last_sync_at).toLocaleDateString()}
                      </span>
                    </div>
                  )}

                  {integration.error_message && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm text-red-600">{integration.error_message}</p>
                    </div>
                  )}

                  <div className="flex items-center space-x-2 pt-2">
                    <button
                      onClick={() => testIntegration(integration.id)}
                      disabled={integration.sync_status === 'testing'}
                      className="flex-1 flex items-center justify-center px-3 py-2 text-sm font-medium text-purple-600 border border-purple-600 rounded-lg hover:bg-purple-50 disabled:opacity-50"
                    >
                      <RefreshCw className={`w-4 h-4 mr-1 ${integration.sync_status === 'testing' ? 'animate-spin' : ''}`} />
                      Test
                    </button>
                    <button
                      onClick={() => updateIntegration(integration.id, { is_active: !integration.is_active })}
                      className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg ${
                        integration.is_active
                          ? 'bg-green-600 text-white hover:bg-green-700'
                          : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
                      }`}
                    >
                      {integration.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Available Integrations */}
        {integrations.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm p-8 border border-gray-200 text-center">
            <Key className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Integrations Yet</h3>
            <p className="text-gray-600 mb-6">
              Connect your favorite tools to streamline your workflow and enhance your business.
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              <Plus className="w-5 h-5 mr-2" />
              Add Your First Integration
            </button>
          </div>
        )}

        {/* Add Integration Modal */}
        {showAddModal && (
          <AddIntegrationModal
            availableIntegrations={availableIntegrations}
            existingIntegrations={integrations}
            onAdd={addIntegration}
            onClose={() => setShowAddModal(false)}
          />
        )}

        {/* Edit Integration Modal */}
        {selectedIntegration && (
          <EditIntegrationModal
            integration={selectedIntegration}
            integrationInfo={availableIntegrations.find(i => i.id === selectedIntegration.integration_type)}
            onUpdate={(updates) => {
              updateIntegration(selectedIntegration.id, updates);
              setSelectedIntegration(null);
            }}
            onClose={() => setSelectedIntegration(null)}
          />
        )}
      </div>
    </div>
  );
};

// Add Integration Modal Component
const AddIntegrationModal = ({ availableIntegrations, existingIntegrations, onAdd, onClose }) => {
  const [selectedType, setSelectedType] = useState(null);
  const [config, setConfig] = useState({});

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedType) return;

    onAdd(selectedType, config);
  };

  const isAlreadyConnected = (integrationType) => {
    return existingIntegrations.some(i => i.integration_type === integrationType);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Add Integration</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {!selectedType ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {availableIntegrations.map((integration) => {
              const Icon = integration.icon;
              const isConnected = isAlreadyConnected(integration.id);
              
              return (
                <button
                  key={integration.id}
                  onClick={() => !isConnected && setSelectedType(integration.id)}
                  disabled={isConnected}
                  className={`p-4 border-2 rounded-lg text-left transition-colors ${
                    isConnected
                      ? 'border-gray-200 bg-gray-50 cursor-not-allowed'
                      : 'border-gray-200 hover:border-purple-300 hover:bg-purple-50'
                  }`}
                >
                  <div className="flex items-center mb-3">
                    <div className={`p-2 rounded-lg bg-${integration.color}-100`}>
                      <Icon className={`w-6 h-6 text-${integration.color}-600`} />
                    </div>
                    <div className="ml-3">
                      <h3 className="font-medium text-gray-900">{integration.name}</h3>
                      {isConnected && (
                        <span className="text-xs text-green-600 font-medium">Connected</span>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-gray-600">{integration.description}</p>
                </button>
              );
            })}
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="mb-6">
              <button
                type="button"
                onClick={() => setSelectedType(null)}
                className="text-purple-600 hover:text-purple-700 text-sm font-medium"
              >
                ← Back to integrations
              </button>
            </div>

            {(() => {
              const integration = availableIntegrations.find(i => i.id === selectedType);
              const Icon = integration.icon;
              
              return (
                <div>
                  <div className="flex items-center mb-6">
                    <div className={`p-3 rounded-lg bg-${integration.color}-100`}>
                      <Icon className={`w-8 h-8 text-${integration.color}-600`} />
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-semibold text-gray-900">{integration.name}</h3>
                      <p className="text-gray-600">{integration.description}</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {integration.fields.map((field) => (
                      <div key={field.name}>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {field.label}
                          {field.required && <span className="text-red-500 ml-1">*</span>}
                        </label>
                        <input
                          type={field.type}
                          required={field.required}
                          value={config[field.name] || ''}
                          onChange={(e) => setConfig(prev => ({
                            ...prev,
                            [field.name]: e.target.value
                          }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          placeholder={`Enter ${field.label.toLowerCase()}`}
                        />
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-end space-x-3 mt-6">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                    >
                      Connect Integration
                    </button>
                  </div>
                </div>
              );
            })()}
          </form>
        )}
      </div>
    </div>
  );
};

// Edit Integration Modal Component
const EditIntegrationModal = ({ integration, integrationInfo, onUpdate, onClose }) => {
  const [config, setConfig] = useState(integration.config || {});

  const handleSubmit = (e) => {
    e.preventDefault();
    onUpdate({ config });
  };

  if (!integrationInfo) return null;

  const Icon = integrationInfo.icon;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center">
            <div className={`p-3 rounded-lg bg-${integrationInfo.color}-100 mr-4`}>
              <Icon className={`w-8 h-8 text-${integrationInfo.color}-600`} />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Edit {integration.integration_name}</h2>
              <p className="text-gray-600">{integrationInfo.description}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            {integrationInfo.fields.map((field) => (
              <div key={field.name}>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {field.label}
                  {field.required && <span className="text-red-500 ml-1">*</span>}
                </label>
                <input
                  type={field.type}
                  required={field.required}
                  value={config[field.name] || ''}
                  onChange={(e) => setConfig(prev => ({
                    ...prev,
                    [field.name]: e.target.value
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder={field.type === 'password' ? '••••••••' : `Enter ${field.label.toLowerCase()}`}
                />
              </div>
            ))}
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              Update Integration
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default IntegrationManager; 