import React, { useState, useEffect, useCallback } from 'react';
import { 
  CpuChipIcon, 
  PlusIcon, 
  PencilIcon, 
  TrashIcon,
  SparklesIcon, // Restored Test icon
  ArrowPathIcon,
  CloudIcon
} from '@heroicons/react/24/outline';
import api from '../../services/frontendApi';
import toastService from '../../services/toastService'; // Correct import

const DynamicAIManagementTab = () => {
  const [providers, setProviders] = useState([]);
  const [models, setModels] = useState([]);
  const [featureAssignments, setFeatureAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState(''); // 'provider', 'model', 'assignment'
  const [selectedItem, setSelectedItem] = useState(null);
  const [activeTab, setActiveTab] = useState('providers');
  const [formData, setFormData] = useState({});
  // const { showToast } = useToast(); // This line was causing the error and is now removed.

  const resetFormData = useCallback(() => ({
    name: '',
    provider_type: 'openai',
    api_endpoint: '',
    description: '',
    is_active: true,
    configuration_key: '', // Add configuration_key to form state
  }), []);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [providersRes, modelsRes, assignmentsRes] = await Promise.all([
        api.get('/dynamic-ai/providers'),
        api.get('/dynamic-ai/models'),
        api.get('/dynamic-ai/assignments')
      ]);
      setProviders(providersRes.data || []);
      setModels(modelsRes.data || []);
      setFeatureAssignments(assignmentsRes.data || []);
    } catch (error) {
      console.error("Error loading AI management data", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setFormData(resetFormData());
    loadData();
  }, [resetFormData, loadData]);

  const handleOpenModal = (type, item = null) => {
    setModalType(type);
    setSelectedItem(item);
    setFormData(item ? { ...item } : resetFormData());
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedItem(null);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newFormData = { ...formData, [name]: type === 'checkbox' ? checked : value };

    // Smart autofill for configuration_key
    if (name === 'name') {
      const generatedKey = value.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/_$/, '') + '_api_key';
      newFormData.configuration_key = generatedKey;
    }

    setFormData(newFormData);
  };

  const handleSave = async () => {
    // Frontend Validation
    if (!formData.configuration_key || formData.configuration_key.trim() === '') {
      toastService.error('Configuration Key is a required field.');
      return;
    }

    try {
      setLoading(true);
      let endpoint = '';
      let payload = {};

      if (modalType === 'provider') {
        endpoint = selectedItem ? `/dynamic-ai/providers/${selectedItem.id}` : '/dynamic-ai/providers';
        payload = {
          name: formData.name,
          provider_type: formData.provider_type,
          api_endpoint: formData.api_endpoint,
          description: formData.description,
          is_active: formData.is_active,
          configuration_key: formData.configuration_key, // Ensure it's in the payload
        };
      }

      const method = selectedItem ? 'put' : 'post';
      const response = await api[method](endpoint, payload);
      
      if (response.success) {
        setShowModal(false);
        await loadData();
      } else {
        console.error('Failed to save:', response.message);
      }
    } catch (error) {
      console.error('Error saving data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (type, id) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      try {
        await api.delete(`/dynamic-ai/${type}s/${id}`);
        await loadData();
      } catch (error) {
        console.error(`Error deleting ${type}:`, error);
      }
    }
  };

  const handleTestProvider = async (provider) => {
    if (!provider.api_endpoint) {
      toastService.error("This provider doesn't have an API endpoint to test.");
      return;
    }
    toastService.info(`Testing connection to ${provider.name}...`);
    try {
      const response = await api.post('/dynamic-ai/providers/test', {
        api_endpoint: provider.api_endpoint,
        provider_type: provider.provider_type
      });
      if (response.success) {
        toastService.success(`Test Success: ${response.message}`);
      } else {
        toastService.error(`Test Failed: ${response.message || 'Could not reach provider endpoint'}`);
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'A server-side error occurred.';
      toastService.error(`Test Failed: ${errorMessage}`);
      console.error(`Connectivity test failed for ${provider.name}:`, error);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="p-6 bg-gray-900/50 rounded-lg text-white">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Dynamic AI Management</h1>
        <div>
          <button onClick={() => {}} className="bg-gray-700/50 hover:bg-gray-600/50 text-white font-bold py-2 px-4 rounded-lg flex items-center mr-2">
            Test Provider
          </button>
          <button onClick={loadData} className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg flex items-center">
            <ArrowPathIcon className="h-5 w-5 mr-2" />
            Refresh
          </button>
        </div>
      </div>
      
      <div className="flex border-b border-gray-700 mb-6">
        <button onClick={() => setActiveTab('providers')} className={`py-2 px-4 ${activeTab === 'providers' ? 'border-b-2 border-purple-500 text-white' : 'text-gray-400'}`}>AI Providers</button>
        <button onClick={() => setActiveTab('models')} className={`py-2 px-4 ${activeTab === 'models' ? 'border-b-2 border-purple-500 text-white' : 'text-gray-400'}`}>Models</button>
        <button onClick={() => setActiveTab('assignments')} className={`py-2 px-4 ${activeTab === 'assignments' ? 'border-b-2 border-purple-500 text-white' : 'text-gray-400'}`}>Feature Assignments</button>
      </div>

      <div className="mt-8">
        {activeTab === 'providers' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">AI Providers</h2>
              <button
                onClick={() => handleOpenModal('provider')}
                className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg flex items-center"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                Add Provider
              </button>
            </div>
            <div className="bg-gray-800/50 rounded-lg shadow">
              <ul className="divide-y divide-gray-700">
                {providers.map((provider) => (
                  <li key={provider.id} className="p-4 flex items-center justify-between hover:bg-gray-700/50 transition-colors duration-200">
                    <div className="flex items-center">
                      <CpuChipIcon className="h-10 w-10 text-gray-400 mr-4" />
                      <div>
                        <p className="font-semibold">{provider.name}</p>
                        <p className="text-sm text-gray-400">{provider.provider_type}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                        provider.is_active ? 'bg-green-200/20 text-green-200' : 'bg-red-200/20 text-red-200'
                      }`}>
                        {provider.is_active ? 'Active' : 'Inactive'}
                      </span>
                      <button onClick={() => handleTestProvider(provider)} className="p-2 text-gray-400 hover:text-white" title="Test Provider">
                        <SparklesIcon className="h-5 w-5" />
                      </button>
                      <button onClick={() => handleOpenModal('provider', provider)} className="p-2 text-gray-400 hover:text-white" title="Edit">
                        <PencilIcon className="h-5 w-5" />
                      </button>
                      <button onClick={() => handleDelete('provider', provider.id)} className="p-2 text-red-500 hover:text-red-400" title="Delete">
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
        {/* Models and Assignments Tabs can be rendered here */}
      </div>


      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">
              {selectedItem ? 'Edit' : 'Add'} {modalType.charAt(0).toUpperCase() + modalType.slice(1)}
            </h2>
            
            {modalType === 'provider' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Provider Name</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name || ''}
                    onChange={handleChange}
                    className="w-full bg-gray-700 border border-gray-600 rounded-md p-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Provider Type</label>
                  <input
                    type="text"
                    name="provider_type"
                    value={formData.provider_type || ''}
                    onChange={handleChange}
                    className="w-full bg-gray-700 border border-gray-600 rounded-md p-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Configuration Key</label>
                  <input
                    type="text"
                    name="configuration_key"
                    value={formData.configuration_key || ''}
                    onChange={handleChange}
                    className="w-full bg-gray-700 border border-gray-600 rounded-md p-2 focus:ring-purple-500 focus:border-purple-500"
                    placeholder="e.g., my_provider_api_key"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">API Endpoint</label>
                  <input
                    type="text"
                    name="api_endpoint"
                    value={formData.api_endpoint || ''}
                    onChange={handleChange}
                    className="w-full bg-gray-700 border border-gray-600 rounded-md p-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300">Description</label>
                  <textarea
                    name="description"
                    rows="3"
                    value={formData.description || ''}
                    onChange={handleChange}
                    className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                  ></textarea>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    name="is_active"
                    checked={formData.is_active || false}
                    onChange={handleChange}
                    className="h-4 w-4 text-purple-600 bg-gray-700 border-gray-600 rounded focus:ring-purple-500"
                  />
                  <label className="ml-2 block text-sm">Active</label>
                </div>
              </div>
            )}
            
            <div className="mt-6 flex justify-end space-x-4">
              <button onClick={handleCloseModal} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded">
                Cancel
              </button>
              <button onClick={handleSave} className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded">
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DynamicAIManagementTab; 