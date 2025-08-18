import React, { useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import api from '../../services/frontendApi';

const AddModelModal = ({ isOpen, onClose, onModelAdded, providers }) => {
    const [formData, setFormData] = useState({
        provider_id: providers.length > 0 ? providers[0].id : '',
        model_name: '',
        display_name: '',
        model_type: 'chat_completion',
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
            const response = await api.post('/dynamic-ai/models', formData);
            if (response.success) {
                toast.success(response.message);
                onModelAdded(response.data);
                onClose();
            } else {
                toast.error(response.message);
            }
        } catch (error) {
            toast.error('Failed to add model.');
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
                    <h2 className="text-xl font-bold">Add New AI Model</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        <XMarkIcon className="h-6 w-6" />
                    </button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="space-y-4">
                        <SelectField label="Provider" name="provider_id" value={formData.provider_id} onChange={handleChange}>
                            {providers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </SelectField>
                        <InputField label="Model Name (e.g., gpt-4o)" name="model_name" value={formData.model_name} onChange={handleChange} required />
                        <InputField label="Display Name (e.g., GPT-4 Omni)" name="display_name" value={formData.display_name} onChange={handleChange} required />
                        <SelectField label="Model Type" name="model_type" value={formData.model_type} onChange={handleChange}>
                            <option value="chat_completion">Chat Completion</option>
                            <option value="text_generation">Text Generation</option>
                            <option value="tts">Text-to-Speech</option>
                            {/* Add other model types */}
                        </SelectField>
                        <TextareaField label="Description" name="description" value={formData.description} onChange={handleChange} />
                    </div>
                    <div className="mt-6 flex justify-end space-x-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 rounded bg-gray-600 hover:bg-gray-700">Cancel</button>
                        <button type="submit" disabled={isSaving} className="px-4 py-2 rounded bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800">
                            {isSaving ? 'Saving...' : 'Save Model'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// Reusable field components
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

export default AddModelModal; 