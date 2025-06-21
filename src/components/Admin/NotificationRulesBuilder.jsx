import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  Edit, 
  Save, 
  X, 
  Bell, 
  Mail, 
  Smartphone, 
  Webhook,
  AlertTriangle,
  Star,
  DollarSign,
  Calendar,
  MessageSquare,
  Toggle,
  Settings,
  Play,
  Pause
} from 'lucide-react';

const NotificationRulesBuilder = () => {
  const [rules, setRules] = useState([]);
  const [editingRule, setEditingRule] = useState(null);
  const [showRuleBuilder, setShowRuleBuilder] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load existing rules
  useEffect(() => {
    loadRules();
  }, []);

  const loadRules = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/notification-rules', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setRules(data.data || []);
      }
    } catch (error) {
      console.error('Failed to load rules:', error);
    } finally {
      setLoading(false);
    }
  };

  // Save rule
  const saveRule = async (rule) => {
    try {
      const method = rule.id ? 'PUT' : 'POST';
      const url = rule.id ? `/api/admin/notification-rules/${rule.id}` : '/api/admin/notification-rules';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(rule)
      });

      if (response.ok) {
        const data = await response.json();
        if (rule.id) {
          setRules(prev => prev.map(r => r.id === rule.id ? data.data : r));
        } else {
          setRules(prev => [...prev, data.data]);
        }
        setEditingRule(null);
        setShowRuleBuilder(false);
      }
    } catch (error) {
      console.error('Failed to save rule:', error);
    }
  };

  // Delete rule
  const deleteRule = async (ruleId) => {
    if (!confirm('هل أنت متأكد من حذف هذه القاعدة؟')) return;
    
    try {
      const response = await fetch(`/api/admin/notification-rules/${ruleId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        setRules(prev => prev.filter(r => r.id !== ruleId));
      }
    } catch (error) {
      console.error('Failed to delete rule:', error);
    }
  };

  // Toggle rule active status
  const toggleRuleStatus = async (ruleId, isActive) => {
    try {
      const response = await fetch(`/api/admin/notification-rules/${ruleId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ is_active: !isActive })
      });

      if (response.ok) {
        setRules(prev => prev.map(r => 
          r.id === ruleId ? { ...r, is_active: !isActive } : r
        ));
      }
    } catch (error) {
      console.error('Failed to toggle rule status:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
            <Bell className="w-6 h-6 mr-3 text-purple-600" />
            قواعد الإشعارات
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            إنشاء وإدارة قواعد الإشعارات التلقائية
          </p>
        </div>
        <button
          onClick={() => {
            setEditingRule(null);
            setShowRuleBuilder(true);
          }}
          className="inline-flex items-center px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          إضافة قاعدة جديدة
        </button>
      </div>

      {/* Rules List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">جاري تحميل القواعد...</p>
          </div>
        ) : rules.length === 0 ? (
          <div className="col-span-full text-center py-8">
            <Bell className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">لا توجد قواعد إشعارات</p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
              أنشئ قاعدة جديدة للبدء
            </p>
          </div>
        ) : (
          rules.map((rule) => (
            <RuleCard
              key={rule.id}
              rule={rule}
              onEdit={() => {
                setEditingRule(rule);
                setShowRuleBuilder(true);
              }}
              onDelete={() => deleteRule(rule.id)}
              onToggle={() => toggleRuleStatus(rule.id, rule.is_active)}
            />
          ))
        )}
      </div>

      {/* Rule Builder Modal */}
      {showRuleBuilder && (
        <RuleBuilderModal
          rule={editingRule}
          onSave={saveRule}
          onClose={() => {
            setShowRuleBuilder(false);
            setEditingRule(null);
          }}
        />
      )}
    </div>
  );
};

// Rule Card Component
const RuleCard = ({ rule, onEdit, onDelete, onToggle }) => {
  const getEntityIcon = (entity) => {
    const iconMap = {
      feedback: Star,
      payment: DollarSign,
      booking: Calendar,
      message: MessageSquare,
      user: Settings
    };
    return iconMap[entity] || Bell;
  };

  const getChannelIcon = (channel) => {
    const iconMap = {
      email: Mail,
      sms: Smartphone,
      push: Bell,
      webhook: Webhook
    };
    return iconMap[channel] || Bell;
  };

  const EntityIcon = getEntityIcon(rule.trigger_conditions?.entity);
  
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow border-l-4 ${
      rule.is_active ? 'border-green-500' : 'border-gray-300'
    }`}>
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center">
            <div className={`p-2 rounded-lg mr-3 ${
              rule.is_active 
                ? 'bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-300'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
            }`}>
              <EntityIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white">
                {rule.name}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {rule.description}
              </p>
            </div>
          </div>
          
          <button
            onClick={onToggle}
            className={`p-1 rounded transition-colors ${
              rule.is_active
                ? 'text-green-600 hover:text-green-700'
                : 'text-gray-400 hover:text-gray-600'
            }`}
            title={rule.is_active ? 'إيقاف القاعدة' : 'تفعيل القاعدة'}
          >
            {rule.is_active ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
          </button>
        </div>

        {/* Trigger Condition */}
        <div className="mb-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            شرط التفعيل:
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {rule.trigger_conditions?.entity} {rule.trigger_conditions?.field} {' '}
            {rule.trigger_conditions?.operator} {rule.trigger_conditions?.value}
          </p>
        </div>

        {/* Channels */}
        <div className="mb-4">
          <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
            قنوات الإشعار:
          </p>
          <div className="flex space-x-2">
            {rule.channels?.map((channel, index) => {
              const ChannelIcon = getChannelIcon(channel);
              return (
                <div
                  key={index}
                  className="p-1 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 rounded"
                  title={channel}
                >
                  <ChannelIcon className="w-3 h-3" />
                </div>
              );
            })}
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-4">
          <span>تم التنفيذ {rule.execution_count || 0} مرة</span>
          <span>الأولوية: {rule.priority || 1}</span>
        </div>

        {/* Actions */}
        <div className="flex space-x-2">
          <button
            onClick={onEdit}
            className="flex-1 py-2 px-3 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors text-sm"
          >
            <Edit className="w-3 h-3 inline mr-1" />
            تعديل
          </button>
          <button
            onClick={onDelete}
            className="flex-1 py-2 px-3 bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-800 transition-colors text-sm"
          >
            <Trash2 className="w-3 h-3 inline mr-1" />
            حذف
          </button>
        </div>
      </div>
    </div>
  );
};

// Rule Builder Modal Component
const RuleBuilderModal = ({ rule, onSave, onClose }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    trigger_conditions: {
      entity: 'feedback',
      field: 'rating',
      operator: '<=',
      value: 2
    },
    actions: [{
      type: 'email',
      template: 'تنبيه: {{entity}} جديد يتطلب انتباهك',
      recipients: ['admin']
    }],
    channels: ['email'],
    priority: 1,
    is_active: true,
    ...rule
  });

  const entityOptions = [
    { value: 'feedback', label: 'التقييمات', fields: ['rating', 'comment'] },
    { value: 'payment', label: 'المدفوعات', fields: ['amount', 'status'] },
    { value: 'booking', label: 'الحجوزات', fields: ['status', 'date'] },
    { value: 'message', label: 'الرسائل', fields: ['content', 'flagged'] },
    { value: 'user', label: 'المستخدمون', fields: ['role', 'status'] }
  ];

  const operatorOptions = [
    { value: '=', label: 'يساوي' },
    { value: '!=', label: 'لا يساوي' },
    { value: '>', label: 'أكبر من' },
    { value: '<', label: 'أصغر من' },
    { value: '>=', label: 'أكبر من أو يساوي' },
    { value: '<=', label: 'أصغر من أو يساوي' },
    { value: 'contains', label: 'يحتوي على' }
  ];

  const channelOptions = [
    { value: 'email', label: 'البريد الإلكتروني', icon: Mail },
    { value: 'sms', label: 'رسالة نصية', icon: Smartphone },
    { value: 'push', label: 'إشعار فوري', icon: Bell },
    { value: 'webhook', label: 'Webhook', icon: Webhook }
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  const updateTriggerCondition = (field, value) => {
    setFormData(prev => ({
      ...prev,
      trigger_conditions: {
        ...prev.trigger_conditions,
        [field]: value
      }
    }));
  };

  const updateAction = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      actions: prev.actions.map((action, i) => 
        i === index ? { ...action, [field]: value } : action
      )
    }));
  };

  const toggleChannel = (channel) => {
    setFormData(prev => ({
      ...prev,
      channels: prev.channels.includes(channel)
        ? prev.channels.filter(c => c !== channel)
        : [...prev.channels, channel]
    }));
  };

  const selectedEntity = entityOptions.find(e => e.value === formData.trigger_conditions.entity);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit} className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              {rule ? 'تعديل القاعدة' : 'إضافة قاعدة جديدة'}
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Basic Information */}
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                اسم القاعدة
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                الوصف
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>

          {/* Trigger Conditions */}
          <div className="mb-6">
            <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
              شروط التفعيل
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  الكيان
                </label>
                <select
                  value={formData.trigger_conditions.entity}
                  onChange={(e) => updateTriggerCondition('entity', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                >
                  {entityOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  الحقل
                </label>
                <select
                  value={formData.trigger_conditions.field}
                  onChange={(e) => updateTriggerCondition('field', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                >
                  {selectedEntity?.fields.map(field => (
                    <option key={field} value={field}>
                      {field}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  المشغل
                </label>
                <select
                  value={formData.trigger_conditions.operator}
                  onChange={(e) => updateTriggerCondition('operator', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                >
                  {operatorOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  القيمة
                </label>
                <input
                  type="text"
                  value={formData.trigger_conditions.value}
                  onChange={(e) => updateTriggerCondition('value', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Notification Channels */}
          <div className="mb-6">
            <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
              قنوات الإشعار
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {channelOptions.map(channel => {
                const IconComponent = channel.icon;
                const isSelected = formData.channels.includes(channel.value);
                
                return (
                  <button
                    key={channel.value}
                    type="button"
                    onClick={() => toggleChannel(channel.value)}
                    className={`p-3 rounded-lg border-2 transition-colors ${
                      isSelected
                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-300'
                        : 'border-gray-300 dark:border-gray-600 hover:border-purple-300 text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    <IconComponent className="w-5 h-5 mx-auto mb-1" />
                    <span className="text-xs">{channel.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Message Template */}
          <div className="mb-6">
            <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
              قالب الرسالة
            </h4>
            <textarea
              value={formData.actions[0]?.template || ''}
              onChange={(e) => updateAction(0, 'template', e.target.value)}
              rows={3}
              placeholder="استخدم {{field_name}} للمتغيرات الديناميكية"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              يمكنك استخدام متغيرات مثل: {`{{entity_name}}, {{actor_name}}, {{value}}`}
            </p>
          </div>

          {/* Priority and Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                الأولوية
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData(prev => ({ ...prev, priority: parseInt(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              >
                <option value={1}>منخفضة</option>
                <option value={2}>متوسطة</option>
                <option value={3}>عالية</option>
                <option value={4}>عاجلة</option>
              </select>
            </div>

            <div className="flex items-center">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                  className="rounded border-gray-300 text-purple-600 shadow-sm focus:border-purple-300 focus:ring focus:ring-purple-200 focus:ring-opacity-50"
                />
                <span className="mr-2 text-sm text-gray-700 dark:text-gray-300">
                  تفعيل القاعدة
                </span>
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
            >
              <Save className="w-4 h-4 inline mr-2" />
              حفظ القاعدة
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NotificationRulesBuilder; 