import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { PlusIcon, CpuChipIcon, PuzzlePieceIcon, CheckBadgeIcon, SparklesIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import api from '../../services/frontendApi';
import AddProviderModal from './AddProviderModal';
import EditProviderModal from './EditProviderModal';
import AddModelModal from './AddModelModal';
import EditModelModal from './EditModelModal';
import AddAssignmentModal from './AddAssignmentModal';
import EditAssignmentModal from './EditAssignmentModal';

const DynamicAIManagementTabV2 = () => {
    const [activeTab, setActiveTab] = useState('providers');
    const [providers, setProviders] = useState([]);
    const [models, setModels] = useState([]);
    const [assignments, setAssignments] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isProviderModalOpen, setIsProviderModalOpen] = useState(false);
    const [isModelModalOpen, setIsModelModalOpen] = useState(false);
    const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
    const [isEditProviderModalOpen, setIsEditProviderModalOpen] = useState(false);
    const [selectedProvider, setSelectedProvider] = useState(null);
    const [isEditModelModalOpen, setIsEditModelModalOpen] = useState(false);
    const [selectedModel, setSelectedModel] = useState(null);
    const [isEditAssignmentModalOpen, setIsEditAssignmentModalOpen] = useState(false);
    const [selectedAssignment, setSelectedAssignment] = useState(null);
    
    // TODO: Add state for other modals

    const handleProviderAdded = (newProvider) => {
        // Safeguard to handle cases where the full response or just data is passed.
        const providerToAdd = newProvider.data ? newProvider.data : newProvider;
        setProviders(prev => [providerToAdd, ...prev]);
    };

    const handleProviderUpdated = (updatedProvider) => {
        setProviders(prev => prev.map(p => p.id === updatedProvider.id ? updatedProvider : p));
    };

    const handleTestProvider = async (provider) => {
        toast.loading(`Testing ${provider.name}...`);
        try {
            const response = await api.post('/dynamic-ai/providers/test', {
                provider_type: provider.provider_type,
                api_endpoint: provider.api_endpoint
            });

            toast.dismiss();
            if (response.success) {
                toast.success(response.message);
            } else {
                toast.error(response.message);
            }
        } catch (error) {
            toast.dismiss();
            toast.error(error.message || 'An error occurred during testing.');
        }
    };

    const handleEditProvider = (provider) => {
        setSelectedProvider(provider);
        setIsEditProviderModalOpen(true);
    };

    const handleDeleteProvider = async (providerId) => {
        if (window.confirm('Are you sure you want to delete this provider? This action cannot be undone.')) {
            try {
                const response = await api.delete(`/dynamic-ai/providers/${providerId}`);
                if (response.success) {
                    toast.success('Provider deleted successfully!');
                    setProviders(prev => prev.filter(p => p.id !== providerId));
                } else {
                    toast.error(response.message);
                }
            } catch (error) {
                toast.error(error.message || 'An error occurred while deleting the provider.');
            }
        }
    };

    const loadData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [providersRes, modelsRes, assignmentsRes] = await Promise.all([
                api.get('/dynamic-ai/providers'),
                api.get('/dynamic-ai/models'),
                api.get('/dynamic-ai/assignments')
            ]);
            setProviders(providersRes.data || []);
            setModels(modelsRes.data || []);
            setAssignments(assignmentsRes.data || []);
        } catch (error) {
            toast.error('Failed to load AI management data.');
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleModelAdded = (newModel) => {
        setModels(prev => [newModel, ...prev]);
    };

    const handleAssignmentAdded = (newAssignment) => {
        setAssignments(prev => [newAssignment, ...prev]);
    };

    const handleAssignmentUpdated = (updatedAssignment) => {
        setAssignments(prev => prev.map(a => a.id === updatedAssignment.id ? updatedAssignment : a));
    };

    const handleEditAssignment = (assignment) => {
        setSelectedAssignment(assignment);
        setIsEditAssignmentModalOpen(true);
    };

    const handleDeleteAssignment = async (assignmentId) => {
        if (window.confirm('Are you sure you want to delete this assignment?')) {
            try {
                const response = await api.delete(`/dynamic-ai/assignments/${assignmentId}`);
                if (response.success) {
                    toast.success('Assignment deleted successfully!');
                    setAssignments(prev => prev.filter(a => a.id !== assignmentId));
                } else {
                    toast.error(response.message);
                }
            } catch (error) {
                toast.error(error.message || 'An error occurred while deleting the assignment.');
            }
        }
    };

    const handleModelUpdated = (updatedModel) => {
        setModels(prev => prev.map(m => m.id === updatedModel.id ? updatedModel : m));
    };

    const handleEditModel = (model) => {
        setSelectedModel(model);
        setIsEditModelModalOpen(true);
    };

    const handleDeleteModel = async (modelId) => {
        if (window.confirm('Are you sure you want to delete this model?')) {
            try {
                const response = await api.delete(`/dynamic-ai/models/${modelId}`);
                if (response.success) {
                    toast.success('Model deleted successfully!');
                    setModels(prev => prev.filter(m => m.id !== modelId));
                } else {
                    toast.error(response.message);
                }
            } catch (error) {
                toast.error(error.message || 'An error occurred while deleting the model.');
            }
        }
    };

    const renderContent = () => {
        if (isLoading) {
            return <div>Loading...</div>;
        }

        switch (activeTab) {
            case 'providers':
                return <ProvidersPanel 
                    providers={providers} 
                    onAdd={() => setIsProviderModalOpen(true)}
                    onTest={handleTestProvider}
                    onEdit={handleEditProvider}
                    onDelete={handleDeleteProvider}
                />;
            case 'models':
                return <ModelsPanel 
                    models={models} 
                    onAdd={() => setIsModelModalOpen(true)}
                    onEdit={handleEditModel}
                    onDelete={handleDeleteModel}
                />;
            case 'assignments':
                return <AssignmentsPanel 
                    assignments={assignments} 
                    onAdd={() => setIsAssignmentModalOpen(true)}
                    onEdit={handleEditAssignment}
                    onDelete={handleDeleteAssignment}
                />;
            default:
                return null;
        }
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8 text-white">
            <h1 className="text-2xl font-bold mb-4">Dynamic AI Management</h1>
            <div className="flex border-b border-gray-700 mb-4">
                <TabButton title="Providers" icon={CpuChipIcon} activeTab={activeTab} onClick={() => setActiveTab('providers')} />
                <TabButton title="Models" icon={PuzzlePieceIcon} activeTab={activeTab} onClick={() => setActiveTab('models')} />
                <TabButton title="Assignments" icon={CheckBadgeIcon} activeTab={activeTab} onClick={() => setActiveTab('assignments')} />
            </div>
            {renderContent()}
            <AddProviderModal 
                isOpen={isProviderModalOpen} 
                onClose={() => setIsProviderModalOpen(false)}
                onProviderAdded={handleProviderAdded}
            />
            {selectedProvider && (
                <EditProviderModal
                    isOpen={isEditProviderModalOpen}
                    onClose={() => setIsEditProviderModalOpen(false)}
                    onProviderUpdated={handleProviderUpdated}
                    provider={selectedProvider}
                />
            )}
            <AddModelModal 
                isOpen={isModelModalOpen}
                onClose={() => setIsModelModalOpen(false)}
                onModelAdded={handleModelAdded}
                providers={providers}
            />
            {selectedModel && (
                <EditModelModal
                    isOpen={isEditModelModalOpen}
                    onClose={() => setIsEditModelModalOpen(false)}
                    onModelUpdated={handleModelUpdated}
                    model={selectedModel}
                    providers={providers}
                />
            )}
            <AddAssignmentModal
                isOpen={isAssignmentModalOpen}
                onClose={() => setIsAssignmentModalOpen(false)}
                onAssignmentAdded={handleAssignmentAdded}
                providers={providers}
                models={models}
            />
            {selectedAssignment && (
                <EditAssignmentModal
                    isOpen={isEditAssignmentModalOpen}
                    onClose={() => setIsEditAssignmentModalOpen(false)}
                    onAssignmentUpdated={handleAssignmentUpdated}
                    assignment={selectedAssignment}
                    providers={providers}
                    models={models}
                />
            )}
        </div>
    );
};

const TabButton = ({ title, icon: Icon, activeTab, onClick }) => (
    <button
        onClick={onClick}
        className={`flex items-center space-x-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors duration-200
            ${activeTab === title.toLowerCase()
                ? 'border-purple-500 text-white'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
    >
        <Icon className="h-5 w-5" />
        <span>{title}</span>
    </button>
);

const ProvidersPanel = ({ providers, onAdd, onTest, onEdit, onDelete }) => (
    <div>
        <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-white">AI Providers</h2>
            <button
                onClick={onAdd}
                className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg flex items-center transition-colors duration-200"
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
                                <p className="font-semibold text-white">{provider.name}</p>
                                <p className="text-sm text-gray-400">{provider.provider_type}</p>
                            </div>
                        </div>
                        <div className="flex items-center space-x-2">
                           <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                                provider.is_active ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'
                            }`}>
                                {provider.is_active ? 'Active' : 'Inactive'}
                            </span>
                            <button onClick={() => onTest(provider)} className="p-2 text-gray-400 hover:text-white" title="Test Provider">
                                <SparklesIcon className="h-5 w-5" />
                            </button>
                            <button onClick={() => onEdit(provider)} className="p-2 text-gray-400 hover:text-white" title="Edit">
                                <PencilIcon className="h-5 w-5" />
                            </button>
                            <button onClick={() => onDelete(provider.id)} className="p-2 text-red-500 hover:text-red-400" title="Delete">
                                <TrashIcon className="h-5 w-5" />
                            </button>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    </div>
);

const ModelsPanel = ({ models, onAdd, onEdit, onDelete }) => (
    <div>
        <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-white">AI Models</h2>
            <button
                onClick={onAdd}
                className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg flex items-center"
            >
                <PlusIcon className="h-5 w-5 mr-2" />
                Add Model
            </button>
        </div>
        <div className="bg-gray-800/50 rounded-lg shadow">
            <ul className="divide-y divide-gray-700">
                {models.map((model) => (
                    <li key={model.id} className="p-4 flex items-center justify-between hover:bg-gray-700/50">
                        <div className="flex items-center">
                            <PuzzlePieceIcon className="h-10 w-10 text-gray-400 mr-4" />
                            <div>
                                <p className="font-semibold text-white">{model.display_name || model.model_name}</p>
                                <p className="text-sm text-gray-400">{model.model_type}</p>
                            </div>
                        </div>
                        <div className="flex items-center space-x-2">
                            <button onClick={() => onEdit(model)} className="p-2 text-gray-400 hover:text-white" title="Edit">
                                <PencilIcon className="h-5 w-5" />
                            </button>
                            <button onClick={() => onDelete(model.id)} className="p-2 text-red-500 hover:text-red-400" title="Delete">
                                <TrashIcon className="h-5 w-5" />
                            </button>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    </div>
);

const AssignmentsPanel = ({ assignments, onAdd, onEdit, onDelete }) => (
    <div>
        <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-white">Feature Assignments</h2>
            <button
                onClick={onAdd}
                className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg flex items-center"
            >
                <PlusIcon className="h-5 w-5 mr-2" />
                Add Assignment
            </button>
        </div>
        <div className="bg-gray-800/50 rounded-lg shadow">
            <ul className="divide-y divide-gray-700">
                {assignments.map((assignment) => (
                    <li key={assignment.id} className="p-4 flex items-center justify-between hover:bg-gray-700/50">
                        <div className="flex items-center">
                            <CheckBadgeIcon className="h-10 w-10 text-gray-400 mr-4" />
                            <div>
                                <p className="font-semibold text-white">{assignment.feature_name}</p>
                                <p className="text-sm text-gray-400">{assignment.feature_category}</p>
                            </div>
                        </div>
                        <div className="flex items-center space-x-2">
                            <button onClick={() => onEdit(assignment)} className="p-2 text-gray-400 hover:text-white" title="Edit">
                                <PencilIcon className="h-5 w-5" />
                            </button>
                            <button onClick={() => onDelete(assignment.id)} className="p-2 text-red-500 hover:text-red-400" title="Delete">
                                <TrashIcon className="h-5 w-5" />
                            </button>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    </div>
);

export default DynamicAIManagementTabV2; 