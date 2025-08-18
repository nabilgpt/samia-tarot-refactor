import React, { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import api from '../../services/frontendApi';

const EditModelModal = ({ isOpen, onClose, onModelUpdated, model, providers }) => {
    const [formData, setFormData] = useState({ ...model });
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (model) {
            setFormData({ ...model });
        }
    }, [model]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const response = await api.put(`/dynamic-ai/models/${model.id}`, formData);
            if (response.success) {
                toast.success('Model updated successfully!');
                onModelUpdated(response.data.model);
                onClose();
            } else {
                toast.error(response.message);
            }
        } catch (error) {
            toast.error(error.message || 'An error occurred while updating the model.');
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-gray-800 rounded-lg p-8 w-full max-w-md">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold text-white">Edit Model</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        <XMarkIcon className="h-6 w-6" />
                    </button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="space-y-4">
                        {/* Form fields similar to AddModelModal */}
                         <div>
                            <label htmlFor="provider_id" className="block text-sm font-medium text-gray-300">Provider</label>
                            <select
                                name="provider_id"
                                id="provider_id"
                                value={formData.provider_id}
                                onChange={handleChange}
                                className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm text-white focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                            >
                                {providers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="model_name" className="block text-sm font-medium text-gray-300">Model Name (API Identifier)</label>
                            <input
                                type="text"
                                name="model_name"
                                id="model_name"
                                value={formData.model_name}
                                onChange={handleChange}
                                className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm text-white focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                                required
                            />
                        </div>
                        <div>
                            <label htmlFor="display_name" className="block text-sm font-medium text-gray-300">Display Name</label>
                            <input
                                type="text"
                                name="display_name"
                                id="display_name"
                                value={formData.display_name}
                                onChange={handleChange}
                                className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm text-white focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                            />
                        </div>
                        <div>
                            <label htmlFor="model_type" className="block text-sm font-medium text-gray-300">Model Type</label>
                            <select
                                name="model_type"
                                id="model_type"
                                value={formData.model_type}
                                onChange={handleChange}
                                className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm text-white focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                            >
                                <option value="chat_completion">Chat Completion</option>
                                <option value="text_embedding">Text Embedding</option>
                                <option value="tts">Text-to-Speech</option>
                                <option value="image_generation">Image Generation</option>
                            </select>
                        </div>
                        <div>
                            <label htmlFor="description" className="block text-sm font-medium text-gray-300">Description</label>
                            <textarea
                                name="description"
                                id="description"
                                value={formData.description}
                                onChange={handleChange}
                                rows="3"
                                className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm text-white focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                            ></textarea>
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

export default EditModelModal; 