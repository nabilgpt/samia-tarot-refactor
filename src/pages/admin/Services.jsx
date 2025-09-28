import React, { useState, useEffect } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Plus, Edit2, Trash2, Check, X, AlertCircle } from 'lucide-react';
import api from '../../lib/api';

const AdminServices = () => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingService, setEditingService] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    base_price: '',
    active: true
  });
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = async () => {
    try {
      setLoading(true);
      const data = await api.getServices();
      setServices(data);
    } catch (err) {
      console.error('Error loading services:', err);
      setError('Failed to load services');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (service) => {
    setEditingService(service.id);
    setFormData({
      code: service.code,
      name: service.name,
      description: service.description || '',
      base_price: service.base_price.toString(),
      active: service.active
    });
    setIsCreating(false);
  };

  const handleCreate = () => {
    setIsCreating(true);
    setEditingService(null);
    setFormData({
      code: '',
      name: '',
      description: '',
      base_price: '',
      active: true
    });
  };

  const handleCancel = () => {
    setEditingService(null);
    setIsCreating(false);
    setFormData({
      code: '',
      name: '',
      description: '',
      base_price: '',
      active: true
    });
  };

  const handleSave = async () => {
    try {
      const serviceData = {
        code: formData.code,
        name: formData.name,
        description: formData.description,
        base_price: parseFloat(formData.base_price),
        active: formData.active
      };

      if (editingService) {
        await api.updateService(editingService, serviceData);
      } else {
        await api.createService(serviceData);
      }

      await loadServices();
      handleCancel();
    } catch (err) {
      console.error('Error saving service:', err);
      setError('Failed to save service');
    }
  };

  const handleToggleActive = async (serviceId, currentActive) => {
    try {
      await api.updateService(serviceId, { active: !currentActive });
      await loadServices();
    } catch (err) {
      console.error('Error toggling service status:', err);
      setError('Failed to update service status');
    }
  };

  const handleDelete = async (serviceId) => {
    if (!confirm('Are you sure you want to delete this service?')) return;

    try {
      await api.deleteService(serviceId);
      await loadServices();
    } catch (err) {
      console.error('Error deleting service:', err);
      setError('Failed to delete service');
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: shouldReduceMotion ? { duration: 0.3 } : {
        delayChildren: 0.2,
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: shouldReduceMotion ? { opacity: 0 } : { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: shouldReduceMotion ? { duration: 0.3 } : {
        type: "spring",
        stiffness: 100,
        damping: 12
      }
    }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="relative z-10 py-12"
    >
      <div className="container max-w-6xl">
        <motion.div variants={itemVariants} className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="fluid-heading-lg font-bold gradient-text mb-2">
                Services Management
              </h1>
              <p className="text-theme-secondary">
                Manage services available to clients
              </p>
            </div>
            <button
              onClick={handleCreate}
              className="btn-base btn-primary flex items-center gap-2"
              disabled={isCreating || editingService}
            >
              <Plus className="w-5 h-5" />
              Add Service
            </button>
          </div>
        </motion.div>

        {error && (
          <motion.div
            variants={itemVariants}
            className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-3"
          >
            <AlertCircle className="w-5 h-5 text-red-400" />
            <p className="text-red-400 flex-1">{error}</p>
            <button
              onClick={() => setError(null)}
              className="text-red-400 hover:text-red-300"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}

        {(isCreating || editingService) && (
          <motion.div
            variants={itemVariants}
            className="mb-6 p-6 bg-theme-card border border-theme-cosmic rounded-lg"
          >
            <h3 className="text-lg font-bold text-theme-primary mb-4">
              {isCreating ? 'Create New Service' : 'Edit Service'}
            </h3>
            <div className="grid gap-4">
              <div>
                <label className="block text-sm font-medium text-theme-primary mb-2">
                  Service Code *
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="w-full px-4 py-2 bg-theme-card border border-theme-cosmic rounded-lg text-theme-primary focus:outline-none focus:ring-2 focus:ring-gold-primary"
                  placeholder="e.g., tarot_basic"
                  disabled={!!editingService}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-theme-primary mb-2">
                  Service Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 bg-theme-card border border-theme-cosmic rounded-lg text-theme-primary focus:outline-none focus:ring-2 focus:ring-gold-primary"
                  placeholder="e.g., Basic Tarot Reading"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-theme-primary mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 bg-theme-card border border-theme-cosmic rounded-lg text-theme-primary focus:outline-none focus:ring-2 focus:ring-gold-primary"
                  rows="3"
                  placeholder="Service description"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-theme-primary mb-2">
                  Base Price (USD) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.base_price}
                  onChange={(e) => setFormData({ ...formData, base_price: e.target.value })}
                  className="w-full px-4 py-2 bg-theme-card border border-theme-cosmic rounded-lg text-theme-primary focus:outline-none focus:ring-2 focus:ring-gold-primary"
                  placeholder="25.00"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="active"
                  checked={formData.active}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                  className="w-4 h-4 text-gold-primary bg-theme-card border-theme-cosmic rounded focus:ring-gold-primary"
                />
                <label htmlFor="active" className="text-sm text-theme-secondary">
                  Service is active and visible to clients
                </label>
              </div>

              <div className="flex gap-3 mt-4">
                <button
                  onClick={handleSave}
                  className="btn-base btn-primary flex items-center gap-2"
                  disabled={!formData.code || !formData.name || !formData.base_price}
                >
                  <Check className="w-4 h-4" />
                  Save
                </button>
                <button
                  onClick={handleCancel}
                  className="btn-base btn-secondary flex items-center gap-2"
                >
                  <X className="w-4 h-4" />
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {loading ? (
          <div className="space-y-4">
            {Array(3).fill(0).map((_, i) => (
              <div key={i} className="bg-theme-card border border-theme-cosmic rounded-lg p-6 animate-pulse">
                <div className="h-6 bg-theme-tertiary rounded w-1/3 mb-4"></div>
                <div className="h-4 bg-theme-tertiary rounded w-2/3 mb-2"></div>
                <div className="h-4 bg-theme-tertiary rounded w-1/4"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {services.map((service) => (
              <motion.div
                key={service.id}
                variants={itemVariants}
                className="bg-theme-card border border-theme-cosmic rounded-lg p-6 hover:border-gold-primary transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-bold text-theme-primary">
                        {service.name}
                      </h3>
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded ${
                          service.active
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-gray-500/20 text-gray-400'
                        }`}
                      >
                        {service.active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <p className="text-sm text-theme-secondary mb-2">
                      Code: <span className="font-mono">{service.code}</span>
                    </p>
                    {service.description && (
                      <p className="text-sm text-theme-secondary mb-2">
                        {service.description}
                      </p>
                    )}
                    <p className="text-lg font-bold gradient-text">
                      ${service.base_price.toFixed(2)} USD
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleActive(service.id, service.active)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        service.active
                          ? 'bg-gray-500/20 text-gray-400 hover:bg-gray-500/30'
                          : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                      }`}
                    >
                      {service.active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      onClick={() => handleEdit(service)}
                      className="p-2 text-theme-secondary hover:text-gold-primary transition-colors"
                      disabled={isCreating || editingService}
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(service.id)}
                      className="p-2 text-theme-secondary hover:text-red-400 transition-colors"
                      disabled={isCreating || editingService}
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}

            {services.length === 0 && (
              <div className="text-center py-12">
                <p className="text-theme-secondary">
                  No services found. Create your first service to get started.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default AdminServices;