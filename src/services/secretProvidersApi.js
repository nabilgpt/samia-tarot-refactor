import { api } from './frontendApi';

const secretProvidersApi = {
  // Fetch all secret providers
  getProviders: async () => {
    try {
      const response = await api.get('/secret-providers');
      return response;
    } catch (error) {
      console.error('Error fetching secret providers:', error);
      throw error;
    }
  },

  // Add a new secret provider
  addProvider: async (providerData) => {
    try {
      const response = await api.post('/secret-providers', providerData);
      return response;
    } catch (error) {
      console.error('Error adding secret provider:', error);
      throw error;
    }
  },

  // Update an existing secret provider
  updateProvider: async (id, providerData) => {
    try {
      const response = await api.put(`/secret-providers/${id}`, providerData);
      return response;
    } catch (error) {
      console.error(`Error updating secret provider ${id}:`, error);
      throw error;
    }
  },

  // Delete a secret provider
  deleteProvider: async (id) => {
    try {
      const response = await api.delete(`/secret-providers/${id}`);
      return response;
    } catch (error) {
      console.error(`Error deleting secret provider ${id}:`, error);
      throw error;
    }
  },
};

export default secretProvidersApi; 