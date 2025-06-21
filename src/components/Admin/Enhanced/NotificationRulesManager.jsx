import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  BellIcon,
  EnvelopeIcon,
  DevicePhoneMobileIcon,
  GlobeAltIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  Cog6ToothIcon,
  EyeIcon,
  EyeSlashIcon
} from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

const NotificationRulesManager = ({ className = '' }) => {
  const { t } = useTranslation();
  const [rules, setRules] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [loading, setLoading] = useState(true);

  // Event types that can trigger notifications
  const eventTypes = [
    { value: 'new_booking', label: t('admin.notifications.events.newBooking'), icon: BellIcon },
    { value: 'low_rating', label: t('admin.notifications.events.lowRating'), icon: ExclamationTriangleIcon },
    { value: 'high_payment', label: t('admin.notifications.events.highPayment'), icon: CheckCircleIcon },
    { value: 'failed_payment', label: t('admin.notifications.events.failedPayment'), icon: XCircleIcon },
    { value: 'new_user', label: t('admin.notifications.events.newUser'), icon: PlusIcon },
    { value: 'reader_application', label: t('admin.notifications.events.readerApplication'), icon: PencilIcon },
    { value: 'emergency_session', label: t('admin.notifications.events.emergencySession'), icon: ExclamationTriangleIcon }
  ];

  // Notification channels
  const notificationChannels = [
    { value: 'email', label: t('admin.notifications.channels.email'), icon: EnvelopeIcon },
    { value: 'sms', label: t('admin.notifications.channels.sms'), icon: DevicePhoneMobileIcon },
    { value: 'push', label: t('admin.notifications.channels.push'), icon: BellIcon },
    { value: 'webhook', label: t('admin.notifications.channels.webhook'), icon: GlobeAltIcon }
  ];

  // Condition operators
  const operators = [
    { value: 'eq', label: t('admin.notifications.operators.equals') },
    { value: 'ne', label: t('admin.notifications.operators.notEquals') },
    { value: 'gt', label: t('admin.notifications.operators.greaterThan') },
    { value: 'lt', label: t('admin.notifications.operators.lessThan') },
    { value: 'gte', label: t('admin.notifications.operators.greaterThanOrEqual') },
    { value: 'lte', label: t('admin.notifications.operators.lessThanOrEqual') },
    { value: 'contains', label: t('admin.notifications.operators.contains') },
    { value: 'in', label: t('admin.notifications.operators.in') }
  ];

  // Fetch notification rules
  const fetchRules = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/notification-rules', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch notification rules');
      }

      const data = await response.json();
      setRules(data.rules || []);
    } catch (error) {
      console.error('Failed to fetch notification rules:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  // Handle rule reordering
  const handleDragEnd = async (result) => {
    if (!result.destination) return;

    const items = Array.from(rules);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Update priority based on new order
    const updatedItems = items.map((item, index) => ({
      ...item,
      priority: index + 1
    }));

    setRules(updatedItems);

    // Update priorities on server
    try {
      await Promise.all(
        updatedItems.map(rule =>
          fetch(`/api/admin/notification-rules/${rule.id}`, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ priority: rule.priority })
          })
        )
      );
    } catch (error) {
      console.error('Failed to update rule priorities:', error);
    }
  };

  // Toggle rule active status
  const toggleRuleStatus = async (ruleId, isActive) => {
    try {
      const response = await fetch(`/api/admin/notification-rules/${ruleId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ is_active: !isActive })
      });

      if (!response.ok) {
        throw new Error('Failed to update rule status');
      }

      setRules(rules.map(rule =>
        rule.id === ruleId ? { ...rule, is_active: !isActive } : rule
      ));
    } catch (error) {
      console.error('Failed to toggle rule status:', error);
    }
  };

  // Delete rule
  const deleteRule = async (ruleId) => {
    if (!confirm(t('admin.notifications.confirmDelete'))) return;

    try {
      const response = await fetch(`/api/admin/notification-rules/${ruleId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete rule');
      }

      setRules(rules.filter(rule => rule.id !== ruleId));
    } catch (error) {
      console.error('Failed to delete rule:', error);
    }
  };

  // Get event type info
  const getEventTypeInfo = (eventType) => {
    return eventTypes.find(type => type.value === eventType) || eventTypes[0];
  };

  // Get channel icons
  const getChannelIcons = (actions) => {
    return actions.map(action => {
      const channel = notificationChannels.find(ch => ch.value === action.type);
      return channel ? channel.icon : BellIcon;
    });
  };

  return (
    <div className={`notification-rules-manager ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {t('admin.notifications.title')}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t('admin.notifications.subtitle')}
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          {t('admin.notifications.createRule')}
        </button>
      </div>

      {/* Rules List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
        </div>
      ) : rules.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <BellIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            {t('admin.notifications.noRules')}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {t('admin.notifications.noRulesDescription')}
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            {t('admin.notifications.createFirstRule')}
          </button>
        </div>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="notification-rules">
            {(provided) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="space-y-4"
              >
                {rules.map((rule, index) => {
                  const eventInfo = getEventTypeInfo(rule.event_type);
                  const EventIcon = eventInfo.icon;
                  const channelIcons = getChannelIcons(rule.actions || []);

                  return (
                    <Draggable key={rule.id} draggableId={rule.id} index={index}>
                      {(provided, snapshot) => (
                        <motion.div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`
                            bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6
                            ${snapshot.isDragging ? 'shadow-lg' : 'shadow-sm'}
                            ${!rule.is_active ? 'opacity-50' : ''}
                          `}
                        >
                          <div className="flex items-center justify-between">
                            {/* Drag Handle & Rule Info */}
                            <div className="flex items-center space-x-4">
                              <div
                                {...provided.dragHandleProps}
                                className="cursor-move text-gray-400 hover:text-gray-600"
                              >
                                <Cog6ToothIcon className="h-5 w-5" />
                              </div>

                              <div className="flex items-center space-x-3">
                                <div className={`p-2 rounded-full ${rule.is_active ? 'bg-purple-100 dark:bg-purple-900/20' : 'bg-gray-100 dark:bg-gray-700'}`}>
                                  <EventIcon className={`h-5 w-5 ${rule.is_active ? 'text-purple-600' : 'text-gray-400'}`} />
                                </div>

                                <div>
                                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                                    {rule.rule_name}
                                  </h3>
                                  <p className="text-sm text-gray-600 dark:text-gray-400">
                                    {eventInfo.label}
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* Channels & Actions */}
                            <div className="flex items-center space-x-4">
                              {/* Notification Channels */}
                              <div className="flex items-center space-x-2">
                                {channelIcons.slice(0, 3).map((IconComponent, idx) => (
                                  <div key={idx} className="p-1 bg-gray-100 dark:bg-gray-700 rounded">
                                    <IconComponent className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                                  </div>
                                ))}
                                {channelIcons.length > 3 && (
                                  <span className="text-xs text-gray-500 dark:text-gray-400">
                                    +{channelIcons.length - 3}
                                  </span>
                                )}
                              </div>

                              {/* Rule Actions */}
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={() => toggleRuleStatus(rule.id, rule.is_active)}
                                  className={`p-2 rounded-lg transition-colors ${
                                    rule.is_active
                                      ? 'text-green-600 hover:bg-green-100 dark:hover:bg-green-900/20'
                                      : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                                  }`}
                                  title={rule.is_active ? t('admin.notifications.disable') : t('admin.notifications.enable')}
                                >
                                  {rule.is_active ? <EyeIcon className="h-4 w-4" /> : <EyeSlashIcon className="h-4 w-4" />}
                                </button>

                                <button
                                  onClick={() => setEditingRule(rule)}
                                  className="p-2 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                  title={t('admin.notifications.edit')}
                                >
                                  <PencilIcon className="h-4 w-4" />
                                </button>

                                <button
                                  onClick={() => deleteRule(rule.id)}
                                  className="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                  title={t('admin.notifications.delete')}
                                >
                                  <TrashIcon className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Rule Details */}
                          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* Conditions */}
                              <div>
                                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                  {t('admin.notifications.conditions')}
                                </h4>
                                <div className="text-sm text-gray-600 dark:text-gray-400">
                                  {rule.conditions && Object.keys(rule.conditions).length > 0 ? (
                                    <div className="space-y-1">
                                      {Object.entries(rule.conditions).map(([field, condition]) => (
                                        <div key={field} className="flex items-center space-x-2">
                                          <span className="font-medium">{field}</span>
                                          <span>{condition.operator}</span>
                                          <span className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-xs">
                                            {Array.isArray(condition.value) ? condition.value.join(', ') : condition.value}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <span>{t('admin.notifications.noConditions')}</span>
                                  )}
                                </div>
                              </div>

                              {/* Actions */}
                              <div>
                                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                  {t('admin.notifications.actions')}
                                </h4>
                                <div className="text-sm text-gray-600 dark:text-gray-400">
                                  {rule.actions && rule.actions.length > 0 ? (
                                    <div className="space-y-1">
                                      {rule.actions.map((action, idx) => (
                                        <div key={idx} className="flex items-center space-x-2">
                                          <span className="capitalize">{action.type}</span>
                                          {action.config?.subject && (
                                            <span className="text-xs text-gray-500">
                                              - {action.config.subject}
                                            </span>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <span>{t('admin.notifications.noActions')}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </Draggable>
                  );
                })}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      )}

      {/* Create/Edit Rule Modal */}
      <NotificationRuleModal
        isOpen={showCreateModal || !!editingRule}
        onClose={() => {
          setShowCreateModal(false);
          setEditingRule(null);
        }}
        rule={editingRule}
        onSave={(rule) => {
          if (editingRule) {
            setRules(rules.map(r => r.id === rule.id ? rule : r));
          } else {
            setRules([...rules, rule]);
          }
          setShowCreateModal(false);
          setEditingRule(null);
        }}
        eventTypes={eventTypes}
        notificationChannels={notificationChannels}
        operators={operators}
      />
    </div>
  );
};

// Notification Rule Modal Component
const NotificationRuleModal = ({
  isOpen,
  onClose,
  rule,
  onSave,
  eventTypes,
  notificationChannels,
  operators
}) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    rule_name: '',
    event_type: '',
    conditions: {},
    actions: [],
    priority: 1
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (rule) {
      setFormData(rule);
    } else {
      setFormData({
        rule_name: '',
        event_type: '',
        conditions: {},
        actions: [],
        priority: 1
      });
    }
  }, [rule]);

  const handleSave = async () => {
    try {
      setSaving(true);
      
      const url = rule 
        ? `/api/admin/notification-rules/${rule.id}`
        : '/api/admin/notification-rules';
      
      const method = rule ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        throw new Error('Failed to save rule');
      }

      const data = await response.json();
      onSave(data.rule);
    } catch (error) {
      console.error('Failed to save rule:', error);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          {rule ? t('admin.notifications.editRule') : t('admin.notifications.createRule')}
        </h3>

        <div className="space-y-4">
          {/* Rule Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('admin.notifications.ruleName')}
            </label>
            <input
              type="text"
              value={formData.rule_name}
              onChange={(e) => setFormData({ ...formData, rule_name: e.target.value })}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:border-gray-600"
              placeholder={t('admin.notifications.ruleNamePlaceholder')}
            />
          </div>

          {/* Event Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('admin.notifications.eventType')}
            </label>
            <select
              value={formData.event_type}
              onChange={(e) => setFormData({ ...formData, event_type: e.target.value })}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:border-gray-600"
            >
              <option value="">{t('admin.notifications.selectEventType')}</option>
              {eventTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* Actions */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('admin.notifications.notificationChannels')}
            </label>
            <div className="grid grid-cols-2 gap-2">
              {notificationChannels.map((channel) => {
                const isSelected = formData.actions.some(action => action.type === channel.value);
                return (
                  <label key={channel.value} className="flex items-center space-x-2 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData({
                            ...formData,
                            actions: [...formData.actions, { type: channel.value, config: {} }]
                          });
                        } else {
                          setFormData({
                            ...formData,
                            actions: formData.actions.filter(action => action.type !== channel.value)
                          });
                        }
                      }}
                      className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                    />
                    <channel.icon className="h-5 w-5 text-gray-600" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {channel.label}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !formData.rule_name || !formData.event_type}
            className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? t('common.saving') : t('common.save')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotificationRulesManager; 