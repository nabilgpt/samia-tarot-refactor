import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { 
  Settings, 
  CreditCard, 
  Globe,
  Key,
  Eye,
  EyeOff,
  Save,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Plus,
  Trash2,
  Edit3
} from 'lucide-react';
import { useUI } from '../../context/UIContext';
import PaymentMethodService from '../../services/paymentMethodService';

const PaymentMethodsAdmin = () => {
  const { t } = useTranslation();
  const { language, showSuccess, showError } = useUI();
  const [loading, setLoading] = useState(true);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [paymentGateways, setPaymentGateways] = useState([]);
  const [paymentRegions, setPaymentRegions] = useState([]);
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [showApiKeys, setShowApiKeys] = useState({});
  const [editingGateway, setEditingGateway] = useState(null);
  const [gatewayForm, setGatewayForm] = useState({});

  useEffect(() => {
    loadPaymentData();
  }, []);

  const loadPaymentData = async () => {
    try {
      setLoading(true);
      
      // In a real implementation, these would be API calls
      // For now, we'll use the service's fallback data
      const methods = PaymentMethodService.ALLOWED_PAYMENT_METHODS.map(method => ({
        method,
        enabled: true,
        display_order: PaymentMethodService.ALLOWED_PAYMENT_METHODS.indexOf(method) + 1,
        fees: PaymentMethodService.getMethodConfig(method).fees || {},
        processing_time: PaymentMethodService.getMethodConfig(method).processing_time || 'Unknown'
      }));
      
      setPaymentMethods(methods);
      
      // Mock gateway data
      setPaymentGateways([
        {
          id: 1,
          gateway: 'stripe',
          api_key: 'sk_test_...',
          public_key: 'pk_test_...',
          webhook_secret: 'whsec_...',
          supports_apple_pay: true,
          supports_google_pay: true,
          enabled: true
        },
        {
          id: 2,
          gateway: 'square',
          api_key: 'sq0atp-...',
          public_key: 'sq0idp-...',
          webhook_secret: '',
          supports_apple_pay: false,
          supports_google_pay: true,
          enabled: true
        }
      ]);
      
      // Mock region data
      setPaymentRegions([
        { id: 1, region: 'EU', countries: ['DE', 'FR', 'IT', 'ES', 'NL'], methods: ['stripe', 'usdt', 'western_union', 'moneygram', 'ria', 'wallet'] },
        { id: 2, region: 'UAE', countries: ['AE'], methods: ['stripe', 'usdt', 'western_union', 'moneygram', 'ria', 'wallet'] },
        { id: 3, region: 'Lebanon', countries: ['LB'], methods: ['square', 'usdt', 'western_union', 'moneygram', 'ria', 'omt', 'whish', 'bob', 'wallet'] },
        { id: 4, region: 'Other', countries: ['*'], methods: ['square', 'usdt', 'western_union', 'moneygram', 'ria', 'wallet'] }
      ]);
      
    } catch (error) {
      console.error('Error loading payment data:', error);
      showError(language === 'ar' ? 'فشل في تحميل بيانات الدفع' : 'Failed to load payment data');
    } finally {
      setLoading(false);
    }
  };

  const toggleMethodEnabled = async (method) => {
    try {
      const updatedMethods = paymentMethods.map(m => 
        m.method === method ? { ...m, enabled: !m.enabled } : m
      );
      setPaymentMethods(updatedMethods);
      
      // In real implementation, this would be an API call
      showSuccess(language === 'ar' ? 'تم تحديث طريقة الدفع' : 'Payment method updated');
    } catch (error) {
      showError(language === 'ar' ? 'فشل في تحديث طريقة الدفع' : 'Failed to update payment method');
    }
  };

  const updateGateway = async (gatewayId, updates) => {
    try {
      const updatedGateways = paymentGateways.map(g => 
        g.id === gatewayId ? { ...g, ...updates } : g
      );
      setPaymentGateways(updatedGateways);
      
      // In real implementation, this would be an API call
      showSuccess(language === 'ar' ? 'تم تحديث بوابة الدفع' : 'Payment gateway updated');
      setEditingGateway(null);
      setGatewayForm({});
    } catch (error) {
      showError(language === 'ar' ? 'فشل في تحديث بوابة الدفع' : 'Failed to update payment gateway');
    }
  };

  const testGatewayConnection = async (gateway) => {
    try {
      setLoading(true);
      // In real implementation, this would test the API connection
      await new Promise(resolve => setTimeout(resolve, 2000));
      showSuccess(language === 'ar' ? `تم اختبار ${gateway} بنجاح` : `${gateway} connection test successful`);
    } catch (error) {
      showError(language === 'ar' ? `فشل اختبار ${gateway}` : `${gateway} connection test failed`);
    } finally {
      setLoading(false);
    }
  };

  const getMethodIcon = (method) => {
    const config = PaymentMethodService.getMethodConfig(method);
    return config.icon || '💳';
  };

  const getMethodColor = (method) => {
    const config = PaymentMethodService.getMethodConfig(method);
    return config.color || 'bg-gray-500/20';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="relative">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold-400"></div>
          <div className="absolute inset-0 rounded-full border-2 border-gold-400/20"></div>
        </div>
        <span className="ml-4 text-gray-300">
          {language === 'ar' ? 'جاري التحميل...' : 'Loading...'}
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-green-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
            {language === 'ar' ? 'إدارة طرق الدفع' : 'Payment Methods Management'}
          </h2>
          <p className="text-gray-400 mt-1">
            {language === 'ar' ? 'تكوين وإدارة طرق الدفع المتاحة' : 'Configure and manage available payment methods'}
          </p>
        </div>
        
        <button
          onClick={loadPaymentData}
          className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:from-blue-600 hover:to-purple-600 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          <span>{language === 'ar' ? 'تحديث' : 'Refresh'}</span>
        </button>
      </div>

      {/* Payment Methods Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {paymentMethods.map((method) => (
          <motion.div
            key={method.method}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`glassmorphism rounded-xl p-6 border border-white/10 ${
              method.enabled ? '' : 'opacity-60'
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <span className="text-3xl">{getMethodIcon(method.method)}</span>
                <div>
                  <h3 className="font-semibold text-white capitalize">
                    {method.method.replace('_', ' ')}
                  </h3>
                  <p className="text-sm text-gray-400">
                    Order: {method.display_order}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => toggleMethodEnabled(method.method)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    method.enabled ? 'bg-green-500' : 'bg-gray-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      method.enabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Processing Time:</span>
                <span className="text-white">{method.processing_time}</span>
              </div>
              {method.fees && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Fees:</span>
                  <span className="text-white">
                    {method.fees.percentage && `${method.fees.percentage}%`}
                    {method.fees.fixed && ` + $${method.fees.fixed}`}
                    {method.fees.description && method.fees.description}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-400">Status:</span>
                <span className={`flex items-center space-x-1 ${
                  method.enabled ? 'text-green-400' : 'text-red-400'
                }`}>
                  {method.enabled ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                  <span>{method.enabled ? 'Enabled' : 'Disabled'}</span>
                </span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Payment Gateways */}
      <div className="glassmorphism rounded-2xl p-6 border border-white/10">
        <h3 className="text-xl font-bold text-white mb-6">
          {language === 'ar' ? 'بوابات الدفع' : 'Payment Gateways'}
        </h3>
        
        <div className="space-y-4">
          {paymentGateways.map((gateway) => (
            <div key={gateway.id} className="bg-white/5 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">
                    {gateway.gateway === 'stripe' ? '💳' : '🟦'}
                  </span>
                  <div>
                    <h4 className="font-semibold text-white capitalize">
                      {gateway.gateway}
                    </h4>
                    <div className="flex items-center space-x-4 text-sm text-gray-400">
                      {gateway.supports_apple_pay && (
                        <span className="px-2 py-1 bg-black/20 text-white text-xs rounded">
                           Pay
                        </span>
                      )}
                      {gateway.supports_google_pay && (
                        <span className="px-2 py-1 bg-blue-500/20 text-blue-300 text-xs rounded">
                          G Pay
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => testGatewayConnection(gateway.gateway)}
                    className="px-3 py-1 bg-blue-500/20 text-blue-300 text-xs rounded hover:bg-blue-500/30 transition-colors"
                  >
                    {language === 'ar' ? 'اختبار' : 'Test'}
                  </button>
                  <button
                    onClick={() => {
                      setEditingGateway(gateway.id);
                      setGatewayForm(gateway);
                    }}
                    className="px-3 py-1 bg-yellow-500/20 text-yellow-300 text-xs rounded hover:bg-yellow-500/30 transition-colors"
                  >
                    <Edit3 className="w-3 h-3" />
                  </button>
                </div>
              </div>
              
              {editingGateway === gateway.id ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">API Key</label>
                      <div className="relative">
                        <input
                          type={showApiKeys[gateway.id] ? 'text' : 'password'}
                          value={gatewayForm.api_key || ''}
                          onChange={(e) => setGatewayForm({...gatewayForm, api_key: e.target.value})}
                          className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded text-white text-sm"
                        />
                        <button
                          onClick={() => setShowApiKeys({...showApiKeys, [gateway.id]: !showApiKeys[gateway.id]})}
                          className="absolute right-2 top-2 text-gray-400 hover:text-white"
                        >
                          {showApiKeys[gateway.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Public Key</label>
                      <input
                        type="text"
                        value={gatewayForm.public_key || ''}
                        onChange={(e) => setGatewayForm({...gatewayForm, public_key: e.target.value})}
                        className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded text-white text-sm"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Webhook Secret</label>
                    <input
                      type="password"
                      value={gatewayForm.webhook_secret || ''}
                      onChange={(e) => setGatewayForm({...gatewayForm, webhook_secret: e.target.value})}
                      className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded text-white text-sm"
                    />
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={gatewayForm.supports_apple_pay || false}
                        onChange={(e) => setGatewayForm({...gatewayForm, supports_apple_pay: e.target.checked})}
                        className="rounded"
                      />
                      <span className="text-sm text-gray-300">Apple Pay</span>
                    </label>
                    
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={gatewayForm.supports_google_pay || false}
                        onChange={(e) => setGatewayForm({...gatewayForm, supports_google_pay: e.target.checked})}
                        className="rounded"
                      />
                      <span className="text-sm text-gray-300">Google Pay</span>
                    </label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => updateGateway(gateway.id, gatewayForm)}
                      className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
                    >
                      <Save className="w-4 h-4 mr-2 inline" />
                      {language === 'ar' ? 'حفظ' : 'Save'}
                    </button>
                    <button
                      onClick={() => {
                        setEditingGateway(null);
                        setGatewayForm({});
                      }}
                      className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
                    >
                      {language === 'ar' ? 'إلغاء' : 'Cancel'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-400">API Key:</span>
                    <span className="text-white ml-2">
                      {gateway.api_key ? '••••••••' : 'Not set'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400">Public Key:</span>
                    <span className="text-white ml-2">
                      {gateway.public_key ? gateway.public_key.substring(0, 12) + '...' : 'Not set'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400">Status:</span>
                    <span className={`ml-2 ${gateway.enabled ? 'text-green-400' : 'text-red-400'}`}>
                      {gateway.enabled ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Regional Settings */}
      <div className="glassmorphism rounded-2xl p-6 border border-white/10">
        <h3 className="text-xl font-bold text-white mb-6">
          {language === 'ar' ? 'الإعدادات الإقليمية' : 'Regional Settings'}
        </h3>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {paymentRegions.map((region) => (
            <div key={region.id} className="bg-white/5 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-white">{region.region}</h4>
                <Globe className="w-5 h-5 text-blue-400" />
              </div>
              
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-gray-400">Countries:</span>
                  <span className="text-white ml-2">
                    {region.countries.join(', ')}
                  </span>
                </div>
                
                <div>
                  <span className="text-gray-400">Available Methods:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {region.methods.map((method) => (
                      <span
                        key={method}
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
    </div>
  );
};

export default PaymentMethodsAdmin; 