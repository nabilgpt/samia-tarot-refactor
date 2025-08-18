import React, { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import api from '../../services/frontendApi';

const AddAssignmentModal = ({ isOpen, onClose, onAssignmentAdded, providers, models }) => {
    const [formData, setFormData] = useState({
        feature_name: '',
        feature_category: 'zodiac',
        primary_provider_id: providers.length > 0 ? providers[0].id : '',
        primary_model_id: ''
    });
    const [filteredModels, setFilteredModels] = useState([]);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (formData.primary_provider_id) {
            const providerModels = models.filter(m => m.provider_id === formData.primary_provider_id);
            setFilteredModels(providerModels);
            if (providerModels.length > 0) {
                setFormData(prev => ({ ...prev, primary_model_id: providerModels[0].id }));
            }
        }
    }, [formData.primary_provider_id, models]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const response = await api.post('/dynamic-ai/assignments', formData);
            if (response.success) {
                toast.success(response.message);
                onAssignmentAdded(response.data);
                onClose();
            } else {
                toast.error(response.message);
            }
        } catch (error) {
            toast.error('Failed to add assignment.');
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
                    <h2 className="text-xl font-bold">Add New Feature Assignment</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        <XMarkIcon className="h-6 w-6" />
                    </button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="space-y-4">
                        <InputField label="Feature Name" name="feature_name" value={formData.feature_name} onChange={handleChange} required />
                        <SelectField label="Feature Category" name="feature_category" value={formData.feature_category} onChange={handleChange}>
                            <option value="zodiac">Zodiac</option>
                            <option value="tarot_reading">Tarot Reading</option>
                            <option value="chat">Chat</option>
                            <option value="tts">TTS</option>
                        </SelectField>
                        <SelectField label="Provider" name="primary_provider_id" value={formData.primary_provider_id} onChange={handleChange}>
                            {providers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </SelectField>
                        <SelectField label="Model" name="primary_model_id" value={formData.primary_model_id} onChange={handleChange}>
                            {filteredModels.map(m => <option key={m.id} value={m.id}>{m.display_name}</option>)}
                        </SelectField>
                    </div>
                    <div className="mt-6 flex justify-end space-x-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 rounded bg-gray-600 hover:bg-gray-700">Cancel</button>
                        <button type="submit" disabled={isSaving} className="px-4 py-2 rounded bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800">
                            {isSaving ? 'Saving...' : 'Save Assignment'}
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

export default AddAssignmentModal; 