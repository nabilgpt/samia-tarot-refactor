// ============================================================================
// SAMIA TAROT - ENHANCED PROVIDER CONFIGURATION
// Real-time testing and validation for AI providers
// ============================================================================
// Date: 2025-01-13
// Purpose: Comprehensive provider configuration with live testing
// Features: Real-time validation, health monitoring, performance testing
// ============================================================================

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
    Settings, 
    Database, 
    Brain, 
    Cpu, 
    Wifi, 
    WifiOff,
    TestTube,
    CheckCircle,
    XCircle,
    AlertTriangle,
    Clock,
    Zap,
    Eye,
    EyeOff,
    Save,
    Edit,
    Trash2,
    Plus,
    RefreshCw,
    Play,
    Pause,
    Activity,
    TrendingUp,
    Shield,
    Key,
    Globe,
    Server,
    Gauge,
    Target,
    Sparkles,
    Star,
    ArrowRight,
    Info,
    Filter,
    Search,
    X,
    Copy,
    Download,
    Upload,
    RotateCcw,
    AlertCircle,
    CheckCircle2,
    Timer,
    Users,
    DollarSign,
    Calendar,
    BarChart3,
    LineChart,
    PieChart,
    TrendingDown,
    Loader2
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useUI } from '../../../context/UIContext';
import { useAuth } from '../../../context/AuthContext';
import providerTestingService from '../../../services/providerTestingService';
import systemSecretsService from '../../../services/systemSecretsService';

const EnhancedProviderConfiguration = () => {
    const { t } = useTranslation();
    const { language, showSuccess, showError } = useUI();
    const { profile } = useAuth();
    const [providers, setProviders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [testingStates, setTestingStates] = useState({});
    const [healthMonitoring, setHealthMonitoring] = useState({});
    const [validationResults, setValidationResults] = useState({});
    const [testResults, setTestResults] = useState({});
    const [selectedProvider, setSelectedProvider] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [modalType, setModalType] = useState('create'); // create, edit, test, delete
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterType, setFilterType] = useState('all');
    const [showSecrets, setShowSecrets] = useState({});
    const [realTimeMode, setRealTimeMode] = useState(false);
    const intervalRef = useRef(null);

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        provider_type: 'openai',
        base_url: '',
        description: '',
        timeout: 10000,
        requests_per_minute: 60,
        max_retries: 3,
        custom_headers: {},
        is_active: true,
        is_default: false,
        deployment_name: '', // For Azure OpenAI
        organization_id: '', // For OpenAI
    });

    // Provider types with configuration
    const providerTypes = [
        { 
            value: 'openai', 
            label: 'OpenAI', 
            icon: <Brain className="w-5 h-5" />, 
            color: 'text-green-400',
            bgColor: 'bg-green-500/10',
            borderColor: 'border-green-500/20'
        },
        { 
            value: 'anthropic', 
            label: 'Anthropic (Claude)', 
            icon: <Cpu className="w-5 h-5" />, 
            color: 'text-orange-400',
            bgColor: 'bg-orange-500/10',
            borderColor: 'border-orange-500/20'
        },
        { 
            value: 'google', 
            label: 'Google AI', 
            icon: <Sparkles className="w-5 h-5" />, 
            color: 'text-blue-400',
            bgColor: 'bg-blue-500/10',
            borderColor: 'border-blue-500/20'
        },
        { 
            value: 'elevenlabs', 
            label: 'ElevenLabs (TTS)', 
            icon: <Activity className="w-5 h-5" />, 
            color: 'text-purple-400',
            bgColor: 'bg-purple-500/10',
            borderColor: 'border-purple-500/20'
        },
        { 
            value: 'azure_openai', 
            label: 'Azure OpenAI', 
            icon: <Database className="w-5 h-5" />, 
            color: 'text-cyan-400',
            bgColor: 'bg-cyan-500/10',
            borderColor: 'border-cyan-500/20'
        },
        { 
            value: 'custom', 
            label: 'Custom Provider', 
            icon: <Settings className="w-5 h-5" />, 
            color: 'text-gray-400',
            bgColor: 'bg-gray-500/10',
            borderColor: 'border-gray-500/20'
        }
    ];

    // Load providers on component mount
    useEffect(() => {
        loadProviders();
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
            providerTestingService.cleanup();
        };
    }, []);

    // Real-time validation when form data changes
    useEffect(() => {
        if (formData.name && formData.provider_type) {
            validateFormData();
        }
    }, [formData]);

    // Real-time testing mode
    useEffect(() => {
        if (realTimeMode) {
            startRealTimeTestingMode();
        } else {
            stopRealTimeTestingMode();
        }
    }, [realTimeMode]);

    // ============================================================================
    // PROVIDER MANAGEMENT
    // ============================================================================

    const loadProviders = async () => {
        try {
            setLoading(true);
            
            // Load both AI providers and system secrets
            const [aiResponse, secretsResponse] = await Promise.all([
                fetch('http://localhost:5001/api/dynamic-ai/providers', {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`,
                        'Content-Type': 'application/json'
                    }
                }),
                systemSecretsService.getSystemSecrets({ category: 'ai_services' })
            ]);

            const aiProviders = await aiResponse.json();
            const secrets = secretsResponse.data || [];

            // Merge AI providers with their secrets
            const mergedProviders = aiProviders.data?.map(provider => {
                const secret = secrets.find(s => s.config_key === `${provider.name.toUpperCase()}_API_KEY`);
                return {
                    ...provider,
                    has_credentials: !!secret,
                    last_tested: secret?.last_tested_at || null,
                    test_status: secret?.test_status || 'untested'
                };
            }) || [];

            setProviders(mergedProviders);
            
            // Load test results for each provider
            mergedProviders.forEach(provider => {
                loadTestResult(provider.id);
            });

        } catch (error) {
            console.error('Failed to load providers:', error);
            showError(language === 'ar' ? 'فشل في تحميل المقدمين' : 'Failed to load providers');
        } finally {
            setLoading(false);
        }
    };

    const loadTestResult = async (providerId) => {
        try {
            const provider = providers.find(p => p.id === providerId);
            if (!provider) return;

            const testResult = await providerTestingService.testProviderConnection(provider, { timeout: 5000 });
            setTestResults(prev => ({ ...prev, [providerId]: testResult }));
        } catch (error) {
            console.error(`Failed to load test result for ${providerId}:`, error);
        }
    };

    // ============================================================================
    // FORM VALIDATION
    // ============================================================================

    const validateFormData = useCallback(async () => {
        if (!formData.name || !formData.provider_type) return;

        try {
            const validation = await providerTestingService.validateProviderConfiguration(formData);
            setValidationResults(prev => ({ ...prev, [formData.name]: validation }));
            
            // Auto-test if validation passes and real-time mode is enabled
            if (validation.valid && realTimeMode && formData.base_url) {
                testProviderRealTime(formData);
            }
        } catch (error) {
            console.error('Validation error:', error);
        }
    }, [formData, realTimeMode]);

    const testProviderRealTime = useCallback(async (providerData) => {
        const testId = `${providerData.name}_realtime`;
        setTestingStates(prev => ({ ...prev, [testId]: true }));

        try {
            const testResult = await providerTestingService.testProviderConnection(providerData, { timeout: 8000 });
            setTestResults(prev => ({ ...prev, [testId]: testResult }));
        } catch (error) {
            console.error('Real-time test error:', error);
        } finally {
            setTestingStates(prev => ({ ...prev, [testId]: false }));
        }
    }, []);

    // ============================================================================
    // REAL-TIME TESTING MODE
    // ============================================================================

    const startRealTimeTestingMode = () => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
        }

        intervalRef.current = setInterval(async () => {
            if (formData.base_url) {
                await testProviderRealTime(formData);
            }
        }, 5000); // Test every 5 seconds

        console.log('🚀 Real-time testing mode started');
    };

    const stopRealTimeTestingMode = () => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
        console.log('🛑 Real-time testing mode stopped');
    };

    // ============================================================================
    // PROVIDER ACTIONS
    // ============================================================================

    const handleTestProvider = async (provider) => {
        const testId = provider.id;
        setTestingStates(prev => ({ ...prev, [testId]: true }));

        try {
            const testResult = await providerTestingService.testProviderConnection(provider, { timeout: 15000 });
            setTestResults(prev => ({ ...prev, [testId]: testResult }));
            
            if (testResult.success) {
                showSuccess(
                    language === 'ar' 
                        ? `تم اختبار ${provider.name} بنجاح`
                        : `${provider.name} tested successfully`
                );
            } else {
                showError(
                    language === 'ar' 
                        ? `فشل اختبار ${provider.name}: ${testResult.error}`
                        : `${provider.name} test failed: ${testResult.error}`
                );
            }
        } catch (error) {
            console.error(`Test error for ${provider.name}:`, error);
            showError(
                language === 'ar' 
                    ? `خطأ في اختبار ${provider.name}`
                    : `Error testing ${provider.name}`
            );
        } finally {
            setTestingStates(prev => ({ ...prev, [testId]: false }));
        }
    };

    const handleCreateProvider = () => {
        setModalType('create');
        setFormData({
            name: '',
            provider_type: 'openai',
            base_url: '',
            description: '',
            timeout: 10000,
            requests_per_minute: 60,
            max_retries: 3,
            custom_headers: {},
            is_active: true,
            is_default: false,
            deployment_name: '',
            organization_id: '',
        });
        setShowModal(true);
    };

    const handleEditProvider = (provider) => {
        setSelectedProvider(provider);
        setModalType('edit');
        setFormData({
            name: provider.name,
            provider_type: provider.provider_type,
            base_url: provider.api_endpoint || '',
            description: provider.description || '',
            timeout: provider.timeout || 10000,
            requests_per_minute: provider.requests_per_minute || 60,
            max_retries: provider.max_retries || 3,
            custom_headers: provider.custom_headers || {},
            is_active: provider.is_active !== false,
            is_default: provider.is_default || false,
            deployment_name: provider.deployment_name || '',
            organization_id: provider.organization_id || '',
        });
        setShowModal(true);
    };

    const handleDeleteProvider = async (provider) => {
        if (!confirm(language === 'ar' ? 'هل أنت متأكد من حذف هذا المقدم؟' : 'Are you sure you want to delete this provider?')) {
            return;
        }

        try {
            await fetch(`http://localhost:5001/api/dynamic-ai/providers/${provider.id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                }
            });

            showSuccess(
                language === 'ar' 
                    ? 'تم حذف المقدم بنجاح'
                    : 'Provider deleted successfully'
            );
            
            loadProviders();
        } catch (error) {
            console.error('Delete error:', error);
            showError(
                language === 'ar' 
                    ? 'فشل في حذف المقدم'
                    : 'Failed to delete provider'
            );
        }
    };

    const handleSaveProvider = async () => {
        setSaving(true);
        
        try {
            const validation = await providerTestingService.validateProviderConfiguration(formData);
            
            if (!validation.valid) {
                showError(validation.errors.join(', '));
                return;
            }

            const url = modalType === 'create' 
                ? 'http://localhost:5001/api/dynamic-ai/providers'
                : `http://localhost:5001/api/dynamic-ai/providers/${selectedProvider.id}`;
            
            const method = modalType === 'create' ? 'POST' : 'PUT';
            
            const response = await fetch(url, {
                method,
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            showSuccess(
                modalType === 'create'
                    ? (language === 'ar' ? 'تم إنشاء المقدم بنجاح' : 'Provider created successfully')
                    : (language === 'ar' ? 'تم تحديث المقدم بنجاح' : 'Provider updated successfully')
            );

            setShowModal(false);
            loadProviders();
            
        } catch (error) {
            console.error('Save error:', error);
            showError(
                language === 'ar' 
                    ? 'فشل في حفظ المقدم'
                    : 'Failed to save provider'
            );
        } finally {
            setSaving(false);
        }
    };

    // ============================================================================
    // HEALTH MONITORING
    // ============================================================================

    const toggleHealthMonitoring = async (provider) => {
        const monitoringKey = provider.id;
        
        if (healthMonitoring[monitoringKey]) {
            providerTestingService.stopHealthMonitoring(provider.id);
            setHealthMonitoring(prev => ({ ...prev, [monitoringKey]: false }));
            showSuccess(
                language === 'ar' 
                    ? `تم إيقاف مراقبة ${provider.name}`
                    : `Health monitoring stopped for ${provider.name}`
            );
        } else {
            providerTestingService.startHealthMonitoring(provider.id, 30000);
            setHealthMonitoring(prev => ({ ...prev, [monitoringKey]: true }));
            showSuccess(
                language === 'ar' 
                    ? `تم بدء مراقبة ${provider.name}`
                    : `Health monitoring started for ${provider.name}`
            );
        }
    };

    // ============================================================================
    // UTILITY FUNCTIONS
    // ============================================================================

    const getProviderTypeInfo = (type) => {
        return providerTypes.find(pt => pt.value === type) || providerTypes[0];
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'connected':
                return <CheckCircle className="w-5 h-5 text-green-400" />;
            case 'connection_failed':
                return <XCircle className="w-5 h-5 text-red-400" />;
            case 'api_error':
                return <AlertTriangle className="w-5 h-5 text-yellow-400" />;
            case 'validation_failed':
                return <AlertCircle className="w-5 h-5 text-purple-400" />;
            case 'timeout':
                return <Timer className="w-5 h-5 text-orange-400" />;
            default:
                return <Clock className="w-5 h-5 text-gray-400" />;
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'connected':
                return 'text-green-400';
            case 'connection_failed':
                return 'text-red-400';
            case 'api_error':
                return 'text-yellow-400';
            case 'validation_failed':
                return 'text-purple-400';
            case 'timeout':
                return 'text-orange-400';
            default:
                return 'text-gray-400';
        }
    };

    const filteredProviders = providers.filter(provider => {
        const matchesSearch = !searchTerm || 
            provider.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            provider.description?.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesStatus = filterStatus === 'all' || 
            (filterStatus === 'active' && provider.is_active) ||
            (filterStatus === 'inactive' && !provider.is_active) ||
            (filterStatus === 'tested' && testResults[provider.id]?.success) ||
            (filterStatus === 'untested' && !testResults[provider.id]?.success);
        
        const matchesType = filterType === 'all' || provider.provider_type === filterType;
        
        return matchesSearch && matchesStatus && matchesType;
    });

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="flex items-center space-x-2">
                    <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
                    <span className="text-lg text-gray-300">
                        {language === 'ar' ? 'جاري التحميل...' : 'Loading...'}
                    </span>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Settings className="h-8 w-8 text-purple-400" />
                        {language === 'ar' ? 'تكوين المقدمين المحسن' : 'Enhanced Provider Configuration'}
                    </h2>
                    <p className="text-gray-400 mt-1">
                        {language === 'ar' 
                            ? 'إدارة وتكوين مقدمي الذكاء الاصطناعي مع الاختبار في الوقت الفعلي' 
                            : 'Manage and configure AI providers with real-time testing'}
                    </p>
                </div>
                <div className="flex items-center space-x-3">
                    <button
                        onClick={() => setRealTimeMode(!realTimeMode)}
                        className={`flex items-center space-x-2 px-4 py-2 rounded-lg border transition-all ${
                            realTimeMode 
                                ? 'bg-green-500/20 border-green-500/50 text-green-400'
                                : 'bg-gray-500/20 border-gray-500/50 text-gray-400'
                        }`}
                    >
                        {realTimeMode ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                        <span className="hidden sm:inline">
                            {language === 'ar' ? 'الوضع الفوري' : 'Real-time Mode'}
                        </span>
                    </button>
                    <button
                        onClick={handleCreateProvider}
                        className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all"
                    >
                        <Plus className="w-4 h-4" />
                        <span className="hidden sm:inline">
                            {language === 'ar' ? 'إضافة مقدم' : 'Add Provider'}
                        </span>
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                        type="text"
                        placeholder={language === 'ar' ? 'البحث...' : 'Search...'}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-dark-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                </div>

                <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="px-4 py-2 bg-dark-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                    <option value="all">{language === 'ar' ? 'جميع الحالات' : 'All Status'}</option>
                    <option value="active">{language === 'ar' ? 'نشط' : 'Active'}</option>
                    <option value="inactive">{language === 'ar' ? 'غير نشط' : 'Inactive'}</option>
                    <option value="tested">{language === 'ar' ? 'تم اختباره' : 'Tested'}</option>
                    <option value="untested">{language === 'ar' ? 'لم يتم اختباره' : 'Untested'}</option>
                </select>

                <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="px-4 py-2 bg-dark-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                    <option value="all">{language === 'ar' ? 'جميع الأنواع' : 'All Types'}</option>
                    {providerTypes.map(type => (
                        <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                </select>

                <button
                    onClick={loadProviders}
                    className="flex items-center justify-center space-x-2 px-4 py-2 bg-gray-600/20 border border-gray-600 rounded-lg text-gray-300 hover:bg-gray-600/30 transition-all"
                >
                    <RefreshCw className="w-4 h-4" />
                    <span>{language === 'ar' ? 'تحديث' : 'Refresh'}</span>
                </button>
            </div>

            {/* Providers Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredProviders.map((provider) => {
                    const typeInfo = getProviderTypeInfo(provider.provider_type);
                    const testResult = testResults[provider.id];
                    const isTesting = testingStates[provider.id];
                    const isMonitoring = healthMonitoring[provider.id];

                    return (
                        <div
                            key={provider.id}
                            className={`bg-dark-800/50 backdrop-blur-xl border rounded-2xl p-6 shadow-2xl hover:shadow-3xl transition-all duration-300 ${typeInfo.borderColor}`}
                        >
                            {/* Provider Header */}
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center space-x-3">
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${typeInfo.bgColor} ${typeInfo.borderColor} border`}>
                                        {typeInfo.icon}
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-white">{provider.name}</h3>
                                        <p className={`text-sm ${typeInfo.color}`}>{typeInfo.label}</p>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                    {provider.is_active ? (
                                        <Wifi className="w-4 h-4 text-green-400" />
                                    ) : (
                                        <WifiOff className="w-4 h-4 text-red-400" />
                                    )}
                                    {provider.is_default && (
                                        <Star className="w-4 h-4 text-yellow-400" />
                                    )}
                                </div>
                            </div>

                            {/* Status and Test Result */}
                            <div className="mb-4">
                                {testResult ? (
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-2">
                                            {getStatusIcon(testResult.status)}
                                            <span className={`text-sm ${getStatusColor(testResult.status)}`}>
                                                {testResult.status.replace('_', ' ')}
                                            </span>
                                        </div>
                                        <div className="text-xs text-gray-400">
                                            {testResult.response_time}ms
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-center space-x-2">
                                        <Clock className="w-4 h-4 text-gray-400" />
                                        <span className="text-sm text-gray-400">
                                            {language === 'ar' ? 'لم يتم اختباره' : 'Not tested'}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Provider Details */}
                            <div className="space-y-2 mb-4">
                                <div className="flex items-center space-x-2">
                                    <Globe className="w-3 h-3 text-gray-400" />
                                    <span className="text-xs text-gray-300 truncate">{provider.api_endpoint}</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Gauge className="w-3 h-3 text-gray-400" />
                                    <span className="text-xs text-gray-300">
                                        {provider.requests_per_minute || 60} RPM
                                    </span>
                                </div>
                                {provider.description && (
                                    <p className="text-xs text-gray-400 truncate">{provider.description}</p>
                                )}
                            </div>

                            {/* Actions */}
                            <div className="flex flex-wrap gap-2">
                                <button
                                    onClick={() => handleTestProvider(provider)}
                                    disabled={isTesting}
                                    className="flex items-center space-x-1 px-3 py-1 bg-blue-500/20 border border-blue-500/50 rounded text-blue-400 hover:bg-blue-500/30 transition-all text-xs disabled:opacity-50"
                                >
                                    {isTesting ? (
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                    ) : (
                                        <TestTube className="w-3 h-3" />
                                    )}
                                    <span>{language === 'ar' ? 'اختبار' : 'Test'}</span>
                                </button>

                                <button
                                    onClick={() => toggleHealthMonitoring(provider)}
                                    className={`flex items-center space-x-1 px-3 py-1 rounded text-xs transition-all ${
                                        isMonitoring
                                            ? 'bg-green-500/20 border border-green-500/50 text-green-400'
                                            : 'bg-gray-500/20 border border-gray-500/50 text-gray-400'
                                    }`}
                                >
                                    <Activity className="w-3 h-3" />
                                    <span>{language === 'ar' ? 'مراقبة' : 'Monitor'}</span>
                                </button>

                                <button
                                    onClick={() => handleEditProvider(provider)}
                                    className="flex items-center space-x-1 px-3 py-1 bg-purple-500/20 border border-purple-500/50 rounded text-purple-400 hover:bg-purple-500/30 transition-all text-xs"
                                >
                                    <Edit className="w-3 h-3" />
                                    <span>{language === 'ar' ? 'تحرير' : 'Edit'}</span>
                                </button>

                                <button
                                    onClick={() => handleDeleteProvider(provider)}
                                    className="flex items-center space-x-1 px-3 py-1 bg-red-500/20 border border-red-500/50 rounded text-red-400 hover:bg-red-500/30 transition-all text-xs"
                                >
                                    <Trash2 className="w-3 h-3" />
                                    <span>{language === 'ar' ? 'حذف' : 'Delete'}</span>
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Empty State */}
            {filteredProviders.length === 0 && (
                <div className="text-center py-12">
                    <Cpu className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-300 mb-2">
                        {language === 'ar' ? 'لا توجد مقدمين' : 'No providers found'}
                    </h3>
                    <p className="text-gray-400 mb-4">
                        {language === 'ar' 
                            ? 'قم بإنشاء مقدم جديد للبدء' 
                            : 'Create a new provider to get started'}
                    </p>
                    <button
                        onClick={handleCreateProvider}
                        className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all"
                    >
                        {language === 'ar' ? 'إنشاء مقدم' : 'Create Provider'}
                    </button>
                </div>
            )}

            {/* Create/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-dark-800 border border-gray-600 rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold text-white">
                                {modalType === 'create' 
                                    ? (language === 'ar' ? 'إنشاء مقدم جديد' : 'Create New Provider')
                                    : (language === 'ar' ? 'تحرير المقدم' : 'Edit Provider')
                                }
                            </h3>
                            <button
                                onClick={() => setShowModal(false)}
                                className="p-2 text-gray-400 hover:text-white transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Form */}
                        <div className="space-y-4">
                            {/* Provider Name */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    {language === 'ar' ? 'اسم المقدم' : 'Provider Name'}
                                </label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                    className="w-full px-4 py-2 bg-dark-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    placeholder={language === 'ar' ? 'أدخل اسم المقدم' : 'Enter provider name'}
                                />
                            </div>

                            {/* Provider Type */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    {language === 'ar' ? 'نوع المقدم' : 'Provider Type'}
                                </label>
                                <select
                                    value={formData.provider_type}
                                    onChange={(e) => setFormData(prev => ({ ...prev, provider_type: e.target.value }))}
                                    className="w-full px-4 py-2 bg-dark-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                                >
                                    {providerTypes.map(type => (
                                        <option key={type.value} value={type.value}>{type.label}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Base URL */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    {language === 'ar' ? 'رابط القاعدة' : 'Base URL'}
                                </label>
                                <input
                                    type="url"
                                    value={formData.base_url}
                                    onChange={(e) => setFormData(prev => ({ ...prev, base_url: e.target.value }))}
                                    className="w-full px-4 py-2 bg-dark-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    placeholder={language === 'ar' ? 'أدخل رابط القاعدة' : 'Enter base URL'}
                                />
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    {language === 'ar' ? 'الوصف' : 'Description'}
                                </label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                    rows={3}
                                    className="w-full px-4 py-2 bg-dark-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    placeholder={language === 'ar' ? 'أدخل وصف المقدم' : 'Enter provider description'}
                                />
                            </div>

                            {/* Advanced Settings */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        {language === 'ar' ? 'مهلة الاستجابة (ms)' : 'Timeout (ms)'}
                                    </label>
                                    <input
                                        type="number"
                                        value={formData.timeout}
                                        onChange={(e) => setFormData(prev => ({ ...prev, timeout: parseInt(e.target.value) }))}
                                        className="w-full px-4 py-2 bg-dark-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                                        min="1000"
                                        max="60000"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        {language === 'ar' ? 'الطلبات في الدقيقة' : 'Requests per minute'}
                                    </label>
                                    <input
                                        type="number"
                                        value={formData.requests_per_minute}
                                        onChange={(e) => setFormData(prev => ({ ...prev, requests_per_minute: parseInt(e.target.value) }))}
                                        className="w-full px-4 py-2 bg-dark-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                                        min="1"
                                        max="1000"
                                    />
                                </div>
                            </div>

                            {/* Azure OpenAI specific fields */}
                            {formData.provider_type === 'azure_openai' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-2">
                                            {language === 'ar' ? 'اسم النشر' : 'Deployment Name'}
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.deployment_name}
                                            onChange={(e) => setFormData(prev => ({ ...prev, deployment_name: e.target.value }))}
                                            className="w-full px-4 py-2 bg-dark-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                            placeholder={language === 'ar' ? 'أدخل اسم النشر' : 'Enter deployment name'}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-2">
                                            {language === 'ar' ? 'إصدار API' : 'API Version'}
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.api_version}
                                            onChange={(e) => setFormData(prev => ({ ...prev, api_version: e.target.value }))}
                                            className="w-full px-4 py-2 bg-dark-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                            placeholder="2023-12-01-preview"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* OpenAI specific fields */}
                            {formData.provider_type === 'openai' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        {language === 'ar' ? 'معرف المؤسسة' : 'Organization ID'}
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.organization_id}
                                        onChange={(e) => setFormData(prev => ({ ...prev, organization_id: e.target.value }))}
                                        className="w-full px-4 py-2 bg-dark-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                        placeholder={language === 'ar' ? 'أدخل معرف المؤسسة (اختياري)' : 'Enter organization ID (optional)'}
                                    />
                                </div>
                            )}

                            {/* Status toggles */}
                            <div className="flex items-center space-x-6">
                                <label className="flex items-center space-x-2">
                                    <input
                                        type="checkbox"
                                        checked={formData.is_active}
                                        onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                                        className="w-4 h-4 text-purple-600 bg-dark-700 border-gray-600 rounded focus:ring-purple-500"
                                    />
                                    <span className="text-sm text-gray-300">
                                        {language === 'ar' ? 'نشط' : 'Active'}
                                    </span>
                                </label>

                                <label className="flex items-center space-x-2">
                                    <input
                                        type="checkbox"
                                        checked={formData.is_default}
                                        onChange={(e) => setFormData(prev => ({ ...prev, is_default: e.target.checked }))}
                                        className="w-4 h-4 text-purple-600 bg-dark-700 border-gray-600 rounded focus:ring-purple-500"
                                    />
                                    <span className="text-sm text-gray-300">
                                        {language === 'ar' ? 'افتراضي' : 'Default'}
                                    </span>
                                </label>
                            </div>

                            {/* Validation Results */}
                            {validationResults[formData.name] && (
                                <div className="space-y-2">
                                    {validationResults[formData.name].errors.length > 0 && (
                                        <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg">
                                            <div className="flex items-center space-x-2 mb-2">
                                                <XCircle className="w-4 h-4 text-red-400" />
                                                <span className="text-sm font-medium text-red-400">
                                                    {language === 'ar' ? 'أخطاء التحقق' : 'Validation Errors'}
                                                </span>
                                            </div>
                                            <ul className="text-sm text-red-300 space-y-1">
                                                {validationResults[formData.name].errors.map((error, index) => (
                                                    <li key={index}>• {error}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {validationResults[formData.name].warnings.length > 0 && (
                                        <div className="p-3 bg-yellow-500/20 border border-yellow-500/50 rounded-lg">
                                            <div className="flex items-center space-x-2 mb-2">
                                                <AlertTriangle className="w-4 h-4 text-yellow-400" />
                                                <span className="text-sm font-medium text-yellow-400">
                                                    {language === 'ar' ? 'تحذيرات' : 'Warnings'}
                                                </span>
                                            </div>
                                            <ul className="text-sm text-yellow-300 space-y-1">
                                                {validationResults[formData.name].warnings.map((warning, index) => (
                                                    <li key={index}>• {warning}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {validationResults[formData.name].valid && (
                                        <div className="p-3 bg-green-500/20 border border-green-500/50 rounded-lg">
                                            <div className="flex items-center space-x-2">
                                                <CheckCircle className="w-4 h-4 text-green-400" />
                                                <span className="text-sm font-medium text-green-400">
                                                    {language === 'ar' ? 'التحقق ناجح' : 'Validation successful'}
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Real-time Test Results */}
                            {testResults[`${formData.name}_realtime`] && (
                                <div className="space-y-2">
                                    <div className={`p-3 rounded-lg border ${
                                        testResults[`${formData.name}_realtime`].success 
                                            ? 'bg-green-500/20 border-green-500/50'
                                            : 'bg-red-500/20 border-red-500/50'
                                    }`}>
                                        <div className="flex items-center space-x-2 mb-2">
                                            {testResults[`${formData.name}_realtime`].success ? (
                                                <CheckCircle className="w-4 h-4 text-green-400" />
                                            ) : (
                                                <XCircle className="w-4 h-4 text-red-400" />
                                            )}
                                            <span className={`text-sm font-medium ${
                                                testResults[`${formData.name}_realtime`].success 
                                                    ? 'text-green-400' 
                                                    : 'text-red-400'
                                            }`}>
                                                {language === 'ar' ? 'نتيجة الاختبار الفوري' : 'Real-time Test Result'}
                                            </span>
                                            <span className="text-xs text-gray-400">
                                                {testResults[`${formData.name}_realtime`].response_time}ms
                                            </span>
                                        </div>
                                        <p className={`text-sm ${
                                            testResults[`${formData.name}_realtime`].success 
                                                ? 'text-green-300' 
                                                : 'text-red-300'
                                        }`}>
                                            {testResults[`${formData.name}_realtime`].message || 
                                             testResults[`${formData.name}_realtime`].error}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Modal Actions */}
                        <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-600">
                            <div className="flex items-center space-x-2">
                                {testingStates[`${formData.name}_realtime`] && (
                                    <div className="flex items-center space-x-2 text-blue-400">
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span className="text-sm">
                                            {language === 'ar' ? 'جاري الاختبار...' : 'Testing...'}
                                        </span>
                                    </div>
                                )}
                            </div>
                            <div className="flex items-center space-x-3">
                                <button
                                    onClick={() => setShowModal(false)}
                                    className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                                >
                                    {language === 'ar' ? 'إلغاء' : 'Cancel'}
                                </button>
                                <button
                                    onClick={handleSaveProvider}
                                    disabled={saving || !validationResults[formData.name]?.valid}
                                    className="flex items-center space-x-2 px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {saving ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Save className="w-4 h-4" />
                                    )}
                                    <span>
                                        {modalType === 'create' 
                                            ? (language === 'ar' ? 'إنشاء' : 'Create')
                                            : (language === 'ar' ? 'حفظ' : 'Save')
                                        }
                                    </span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EnhancedProviderConfiguration; 