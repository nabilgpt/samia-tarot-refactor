import React, { useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import api from '../../services/frontendApi';

const AddProviderModal = ({ isOpen, onClose, onProviderAdded }) => {
    const [formData, setFormData] = useState({
        name: '',
        provider_type: 'openai',
        api_endpoint: '',
        description: ''
    });
    const [isSaving, setIsSaving] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const response = await api.post('/dynamic-ai/providers', formData);
            if (response.success) {
                toast.success('Provider added successfully!');
                // Pass only the provider data, not the whole response
                onProviderAdded(response.data);
                onClose();
            } else {
                toast.error(response.message);
            }
        } catch (error) {
            toast.error('Failed to add provider.');
            console.error(error);
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-gray-800 rounded-lg p-8 max-w-md w-full">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">Add New AI Provider</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        <XMarkIcon className="h-6 w-6" />
                    </button>
                </div>
                <form onSubmit={handleSubmit}>
                    {/* Form fields */}
                    <div className="space-y-4">
                        <InputField label="Provider Name" name="name" value={formData.name} onChange={handleChange} required />
                        <SelectField label="Provider Type" name="provider_type" value={formData.provider_type} onChange={handleChange}>
                            <option value="openai">OpenAI</option>
                            <option value="anthropic">Anthropic</option>
                            <option value="google">Google</option>
                            {/* Add other provider types */}
                        </SelectField>
                        <InputField label="API Endpoint (Base URL)" name="api_endpoint" value={formData.api_endpoint} onChange={handleChange} required />
                        <TextareaField label="Description" name="description" value={formData.description} onChange={handleChange} />
                    </div>
                    <div className="mt-6 flex justify-end space-x-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 rounded bg-gray-600 hover:bg-gray-700">Cancel</button>
                        <button type="submit" disabled={isSaving} className="px-4 py-2 rounded bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800">
                            {isSaving ? 'Saving...' : 'Save Provider'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// Helper components for form fields to maintain consistent styling
const InputField = ({ label, ...props }) => (
    <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">{label}</label>
        <input {...props} className="w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-purple-500 focus:border-purple-500" />
    </div>
);

const SelectField = ({ label, children, ...props }) => (
    <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">{label}</label>
        <select {...props} className="w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-purple-500 focus:border-purple-500">
            {children}
        </select>
    </div>
);

const TextareaField = ({ label, ...props }) => (
    <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">{label}</label>
        <textarea {...props} rows="3" className="w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-purple-500 focus:border-purple-500"></textarea>
    </div>
);

export default AddProviderModal; 