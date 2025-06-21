import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useUI } from '../../context/UIContext';
import PaymentSettingsAPI from '../../api/paymentSettingsApi';
import PaymentMethodModal from './PaymentMethodModal';
import {
  CurrencyDollarIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  EyeSlashIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  GlobeAltIcon,
  CreditCardIcon,
  BanknotesIcon,
  DevicePhoneMobileIcon,
  ComputerDesktopIcon
} from '@heroicons/react/24/outline';

const PaymentSettingsManager = () => {
  const { user, profile } = useAuth();
  const { language, showSuccess, showError } = useUI();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [paymentRegions, setPaymentRegions] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEnabled, setFilterEnabled] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [formData, setFormData] = useState({});

  // Check if user has access to payment settings
  const hasAccess = profile?.role === 'admin' || profile?.role === 'super_admin';
  const isSuperAdmin = profile?.role === 'super_admin';

  useEffect(() => {
    if (hasAccess) {
      loadPaymentData();
    }
  }, [hasAccess]);

  const loadPaymentData = async () => {
    try {
      setLoading(true);
      
      // Load payment methods
      const methodsResult = await PaymentSettingsAPI.getPaymentMethods();
      if (methodsResult.success) {
        setPaymentMethods(methodsResult.data || []);
      } else {
        console.error('Failed to load payment methods:', methodsResult.error);
        // Fallback to mock data if API fails
        setPaymentMethods([
          {
            id: 1,
            method: 'stripe',
            enabled: true,
            details: { description: 'Credit/Debit Card via Stripe' },
            fees: { percentage: 2.9, fixed: 0.30 },
            processing_time: 'Instant',
            requires_receipt: false,
            display_order: 1
          },
          {
            id: 2,
            method: 'square',
            enabled: true,
            details: { description: 'Credit/Debit Card via Square' },
            fees: { percentage: 2.6, fixed: 0.10 },
            processing_time: 'Instant',
            requires_receipt: false,
            display_order: 2
          },
          {
            id: 3,
            method: 'usdt',
            enabled: true,
            details: { description: 'USDT Cryptocurrency' },
            fees: { description: 'Network fees only' },
            processing_time: '5-15 minutes',
            requires_receipt: true,
            display_order: 3
          }
        ]);
      }

      // Load payment regions
      const regionsResult = await PaymentSettingsAPI.getPaymentRegions();
      if (regionsResult.success) {
        setPaymentRegions(regionsResult.data || []);
      } else {
        console.error('Failed to load payment regions:', regionsResult.error);
        // Fallback to mock data if API fails
        setPaymentRegions([
          {
            id: 1,
            region: 'Europe',
            country_code: 'EU',
            currency: 'EUR',
            available_methods: ['stripe', 'usdt', 'western_union']
          },
          {
            id: 2,
            region: 'Middle East',
            country_code: 'AE',
            currency: 'AED',
            available_methods: ['stripe', 'usdt', 'western_union', 'moneygram']
          }
        ]);
      }
    } catch (error) {
      console.error('Error loading payment data:', error);
      showError('Failed to load payment settings');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleMethod = async (method) => {
    try {
      setSaving(true);
      const result = await PaymentSettingsAPI.togglePaymentMethod(method);
      
      if (result.success) {
        showSuccess(result.message);
        await loadPaymentData(); // Reload data to reflect changes
      } else {
        showError(result.error || 'Failed to toggle payment method');
      }
    } catch (error) {
      console.error('Error toggling payment method:', error);
      showError('Failed to toggle payment method');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateMethod = async (methodData) => {
    try {
      setSaving(true);
      const result = await PaymentSettingsAPI.createPaymentMethod(methodData);
      
      if (result.success) {
        showSuccess(result.message);
        setShowAddModal(false);
        setFormData({});
        await loadPaymentData();
      } else {
        showError(result.error || 'Failed to create payment method');
      }
    } catch (error) {
      console.error('Error creating payment method:', error);
      showError('Failed to create payment method');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateMethod = async (method, updateData) => {
    try {
      setSaving(true);
      const result = await PaymentSettingsAPI.updatePaymentMethod(method, updateData, profile?.role);
      
      if (result.success) {
        showSuccess(result.message);
        setShowEditModal(false);
        setSelectedMethod(null);
        setFormData({});
        await loadPaymentData();
      } else {
        showError(result.error || 'Failed to update payment method');
      }
    } catch (error) {
      console.error('Error updating payment method:', error);
      showError('Failed to update payment method');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMethod = async (method) => {
    if (!window.confirm(`Are you sure you want to delete the ${method} payment method?`)) {
      return;
    }

    try {
      setSaving(true);
      const result = await PaymentSettingsAPI.deletePaymentMethod(method);
      
      if (result.success) {
        showSuccess(result.message);
        await loadPaymentData();
      } else {
        showError(result.error || 'Failed to delete payment method');
      }
    } catch (error) {
      console.error('Error deleting payment method:', error);
      showError('Failed to delete payment method');
    } finally {
      setSaving(false);
    }
  };



  const getMethodIcon = (method) => {
    const icons = {
      stripe: <CreditCardIcon className="w-6 h-6" />,
      square: <CreditCardIcon className="w-6 h-6" />,
      usdt: <BanknotesIcon className="w-6 h-6" />,
      western_union: <GlobeAltIcon className="w-6 h-6" />,
      moneygram: <GlobeAltIcon className="w-6 h-6" />,
      ria: <GlobeAltIcon className="w-6 h-6" />,
      omt: <BanknotesIcon className="w-6 h-6" />,
      whish: <DevicePhoneMobileIcon className="w-6 h-6" />,
      bob: <BanknotesIcon className="w-6 h-6" />,
      wallet: <CurrencyDollarIcon className="w-6 h-6" />,
      apple_pay: <DevicePhoneMobileIcon className="w-6 h-6" />,
      google_pay: <ComputerDesktopIcon className="w-6 h-6" />
    };
    return icons[method] || <CurrencyDollarIcon className="w-6 h-6" />;
  };

  const getMethodColor = (method) => {
    const colors = {
      stripe: 'from-blue-500 to-blue-600',
      square: 'from-gray-500 to-gray-600',
      usdt: 'from-orange-500 to-orange-600',
      western_union: 'from-yellow-500 to-yellow-600',
      moneygram: 'from-purple-500 to-purple-600',
      ria: 'from-green-500 to-green-600',
      omt: 'from-red-500 to-red-600',
      whish: 'from-pink-500 to-pink-600',
      bob: 'from-indigo-500 to-indigo-600',
      wallet: 'from-amber-500 to-amber-600',
      apple_pay: 'from-gray-800 to-black',
      google_pay: 'from-blue-400 to-blue-500'
    };
    return colors[method] || 'from-gray-500 to-gray-600';
  };

  const filteredMethods = paymentMethods.filter(method => {
    const matchesSearch = method.method.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         method.details?.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterEnabled === 'all' || 
                         (filterEnabled === 'enabled' && method.enabled) ||
                         (filterEnabled === 'disabled' && !method.enabled);
    return matchesSearch && matchesFilter;
  });

  if (!hasAccess) {
    return (
      <div className="bg-white/5 backdrop-blur-sm border border-white/20 rounded-xl p-8 text-center">
        <ExclamationTriangleIcon className="w-16 h-16 text-red-400 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-white mb-2">Access Denied</h3>
        <p className="text-cosmic-300">Payment Settings are only available to Admin and Super Admin users.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center">
            <CurrencyDollarIcon className="w-8 h-8 text-purple-400 mr-3" />
            {language === 'ar' ? 'إعدادات وسائل الدفع' : 'Payment Settings'}
          </h2>
          <p className="text-cosmic-300 mt-1">
            {language === 'ar' 
              ? 'إدارة وسائل الدفع المتاحة للمنصة' 
              : 'Manage available payment methods for the platform'
            }
          </p>
        </div>
        
        {isSuperAdmin && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowAddModal(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all duration-300"
          >
            <PlusIcon className="w-5 h-5" />
            <span>{language === 'ar' ? 'إضافة وسيلة دفع' : 'Add Payment Method'}</span>
          </motion.button>
        )}
      </div>

      {/* Search and Filters */}
      <div className="bg-white/5 backdrop-blur-sm border border-white/20 rounded-xl p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-cosmic-300" />
            <input
              type="text"
              placeholder={language === 'ar' ? 'البحث في وسائل الدفع...' : 'Search payment methods...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-cosmic-300 focus:border-purple-400 focus:outline-none"
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <FunnelIcon className="w-5 h-5 text-cosmic-300" />
            <select
              value={filterEnabled}
              onChange={(e) => setFilterEnabled(e.target.value)}
              className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:border-purple-400 focus:outline-none"
            >
              <option value="all">{language === 'ar' ? 'الكل' : 'All'}</option>
              <option value="enabled">{language === 'ar' ? 'مفعل' : 'Enabled'}</option>
              <option value="disabled">{language === 'ar' ? 'معطل' : 'Disabled'}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Payment Methods Grid */}
      {loading ? (
        <div className="bg-white/5 backdrop-blur-sm border border-white/20 rounded-xl p-8 text-center">
          <div className="animate-spin w-8 h-8 border-4 border-purple-400 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-cosmic-300">Loading payment methods...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMethods.map((method) => (
            <motion.div
              key={method.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`bg-white/5 backdrop-blur-sm border border-white/20 rounded-xl p-6 ${
                method.enabled ? '' : 'opacity-60'
              }`}
            >
              {/* Method Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg bg-gradient-to-r ${getMethodColor(method.method)}`}>
                    {getMethodIcon(method.method)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-white capitalize">
                      {method.method.replace('_', ' ')}
                    </h3>
                    <p className="text-sm text-cosmic-300">
                      Order: {method.display_order}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  {method.enabled ? (
                    <CheckCircleIcon className="w-5 h-5 text-green-400" />
                  ) : (
                    <XCircleIcon className="w-5 h-5 text-red-400" />
                  )}
                </div>
              </div>

              {/* Method Details */}
              <div className="space-y-2 mb-4">
                <p className="text-sm text-cosmic-300">
                  {method.details?.description || 'No description available'}
                </p>
                
                <div className="flex items-center justify-between text-xs">
                  <span className="text-cosmic-400">Processing:</span>
                  <span className="text-white">{method.processing_time}</span>
                </div>
                
                {method.fees && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-cosmic-400">Fees:</span>
                    <span className="text-white">
                      {method.fees.percentage ? `${method.fees.percentage}%` : 
                       method.fees.fixed ? `$${method.fees.fixed}` : 
                       method.fees.description || 'Variable'}
                    </span>
                  </div>
                )}
                
                <div className="flex items-center justify-between text-xs">
                  <span className="text-cosmic-400">Receipt Required:</span>
                  <span className="text-white">
                    {method.requires_receipt ? 'Yes' : 'No'}
                  </span>
                </div>
              </div>

              {/* Method Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-white/10">
                <button
                  onClick={() => handleToggleMethod(method.method)}
                  disabled={saving}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    method.enabled ? 'bg-green-600' : 'bg-gray-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      method.enabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
                
                {isSuperAdmin && (
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => {
                        setSelectedMethod(method);
                        setFormData(method);
                        setShowEditModal(true);
                      }}
                      className="p-2 text-cosmic-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                    >
                      <PencilIcon className="w-4 h-4" />
                    </button>
                    
                    <button
                      onClick={() => handleDeleteMethod(method.method)}
                      className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Regional Settings */}
      <div className="bg-white/5 backdrop-blur-sm border border-white/20 rounded-xl p-6">
        <h3 className="text-xl font-bold text-white mb-4 flex items-center">
          <GlobeAltIcon className="w-6 h-6 text-cyan-400 mr-2" />
          {language === 'ar' ? 'الإعدادات الإقليمية' : 'Regional Settings'}
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {paymentRegions.map((region) => (
            <div key={region.id} className="bg-white/5 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-white">{region.region}</h4>
                <span className="text-xs text-cosmic-300 bg-white/10 px-2 py-1 rounded">
                  {region.currency}
                </span>
              </div>
              
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-cosmic-400">Countries:</span>
                  <span className="text-white ml-2">
                    {region.country_code}
                  </span>
                </div>
                
                <div>
                  <span className="text-cosmic-400">Available Methods:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {region.available_methods?.map((method, index) => (
                      <span
                        key={`${region.id}-method-${index}-${method}`}
                        className="px-2 py-1 bg-blue-500/20 text-blue-300 text-xs rounded"
                      >
                        {method}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add Method Modal */}
      <PaymentMethodModal
        isOpen={showAddModal && isSuperAdmin}
        onClose={() => {
          setShowAddModal(false);
          setFormData({});
        }}
        onSubmit={handleCreateMethod}
        method={null}
        isEditing={false}
        loading={saving}
      />

      {/* Edit Method Modal */}
      <PaymentMethodModal
        isOpen={showEditModal && selectedMethod}
        onClose={() => {
          setShowEditModal(false);
          setSelectedMethod(null);
          setFormData({});
        }}
        onSubmit={(updateData) => handleUpdateMethod(selectedMethod?.method, updateData)}
        method={selectedMethod}
        isEditing={true}
        loading={saving}
      />

      {/* Save Indicator */}
      {saving && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="fixed bottom-4 right-4 bg-purple-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2 z-50"
        >
          <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
          <span>{language === 'ar' ? 'جاري الحفظ...' : 'Saving...'}</span>
        </motion.div>
      )}
    </div>
  );
};

// Add Payment Method Modal Component
export default PaymentSettingsManager; 