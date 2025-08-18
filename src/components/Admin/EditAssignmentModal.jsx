import React, { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import api from '../../services/frontendApi';

const EditAssignmentModal = ({ isOpen, onClose, onAssignmentUpdated, assignment, providers, models }) => {
    const [formData, setFormData] = useState({ ...assignment });
    const [filteredModels, setFilteredModels] = useState([]);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (assignment) {
            setFormData({ ...assignment });
        }
    }, [assignment]);

     useEffect(() => {
        if (formData.primary_provider_id) {
            setFilteredModels(models.filter(m => m.provider_id === formData.primary_provider_id));
        } else {
            setFilteredModels([]);
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
            const response = await api.put(`/dynamic-ai/assignments/${assignment.id}`, formData);
            if (response.success) {
                toast.success('Assignment updated successfully!');
                onAssignmentUpdated(response.data.assignment);
                onClose();
            } else {
                toast.error(response.message);
            }
        } catch (error) {
            toast.error(error.message || 'An error occurred while updating the assignment.');
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-gray-800 rounded-lg p-8 w-full max-w-md">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold text-white">Edit Assignment</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        <XMarkIcon className="h-6 w-6" />
                    </button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="space-y-4">
                        {/* Form fields similar to AddAssignmentModal */}
                        <div>
                            <label htmlFor="feature_name" className="block text-sm font-medium text-gray-300">Feature Name</label>
                            <input
                                type="text"
                                name="feature_name"
                                id="feature_name"
                                value={formData.feature_name}
                                onChange={handleChange}
                                className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm text-white focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                                required
                            />
                        </div>
                         <div>
                            <label htmlFor="feature_category" className="block text-sm font-medium text-gray-300">Feature Category</label>
                            <select
                                name="feature_category"
                                id="feature_category"
                                value={formData.feature_category}
                                onChange={handleChange}
                                className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm text-white focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                            >
                                <option value="zodiac">Zodiac</option>
                                <option value="tarot_reading">Tarot Reading</option>
                                <option value="chat">Chat</option>
                                <option value="tts">Text-to-Speech</option>
                                <option value="translation">Translation</option>
                                <option value="content_moderation">Content Moderation</option>
                            </select>
                        </div>
                        <div>
                            <label htmlFor="primary_provider_id" className="block text-sm font-medium text-gray-300">Primary Provider</label>
                            <select
                                name="primary_provider_id"
                                id="primary_provider_id"
                                value={formData.primary_provider_id}
                                onChange={handleChange}
                                className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm text-white focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                            >
                                {providers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="primary_model_id" className="block text-sm font-medium text-gray-300">Primary Model</label>
                            <select
                                name="primary_model_id"
                                id="primary_model_id"
                                value={formData.primary_model_id}
                                onChange={handleChange}
                                disabled={filteredModels.length === 0}
                                className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm text-white focus:ring-purple-500 focus:border-purple-500 sm:text-sm disabled:opacity-50"
                            >
                                <option value="">Select a model</option>
                                {filteredModels.map(m => <option key={m.id} value={m.id}>{m.display_name || m.model_name}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="mt-6 flex justify-end space-x-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-600 hover:bg-gray-500 rounded-md">
                            Cancel
                        </button>
                        <button type="submit" disabled={isSaving} className="px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-md disabled:opacity-50">
                            {isSaving ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditAssignmentModal; 