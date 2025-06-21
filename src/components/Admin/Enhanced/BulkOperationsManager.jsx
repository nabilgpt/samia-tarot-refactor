import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CheckIcon,
  XMarkIcon,
  ArrowUturnLeftIcon,
  DocumentArrowDownIcon,
  TrashIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';

const BulkOperationsManager = ({
  data = [],
  selectedIds = [],
  onSelectionChange,
  onBulkOperation,
  entityType = 'users',
  availableOperations = [],
  loading = false,
  className = ''
}) => {
  const { t } = useTranslation();
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [confirmingOperation, setConfirmingOperation] = useState(null);
  const [operationProgress, setOperationProgress] = useState(null);
  const [undoableActions, setUndoableActions] = useState([]);
  const [showUndoPanel, setShowUndoPanel] = useState(false);

  // Check if all items are selected
  const isAllSelected = data.length > 0 && selectedIds.length === data.length;
  const isPartiallySelected = selectedIds.length > 0 && selectedIds.length < data.length;

  // Handle select all/none
  const handleSelectAll = useCallback(() => {
    if (isAllSelected) {
      onSelectionChange([]);
    } else {
      onSelectionChange(data.map(item => item.id));
    }
  }, [isAllSelected, data, onSelectionChange]);

  // Handle individual selection
  const handleSelectItem = useCallback((id) => {
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter(selectedId => selectedId !== id));
    } else {
      onSelectionChange([...selectedIds, id]);
    }
  }, [selectedIds, onSelectionChange]);

  // Show bulk actions when items are selected
  useEffect(() => {
    setShowBulkActions(selectedIds.length > 0);
  }, [selectedIds.length]);

  // Fetch undoable actions
  const fetchUndoableActions = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/undo/available', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      setUndoableActions(data.actions || []);
    } catch (error) {
      console.error('Failed to fetch undoable actions:', error);
    }
  }, []);

  useEffect(() => {
    fetchUndoableActions();
    const interval = setInterval(fetchUndoableActions, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [fetchUndoableActions]);

  // Handle bulk operation
  const handleBulkOperation = async (operation) => {
    if (!selectedIds.length) return;

    setConfirmingOperation(operation);
  };

  // Confirm and execute bulk operation
  const executeBulkOperation = async () => {
    if (!confirmingOperation || !selectedIds.length) return;

    setOperationProgress({
      operation: confirmingOperation.type,
      total: selectedIds.length,
      completed: 0,
      status: 'processing'
    });

    try {
      const result = await onBulkOperation(confirmingOperation.type, selectedIds);
      
      setOperationProgress({
        operation: confirmingOperation.type,
        total: result.total,
        completed: result.successful,
        failed: result.failed,
        status: 'completed'
      });

      // Clear selection after successful operation
      onSelectionChange([]);
      
      // Refresh undoable actions
      fetchUndoableActions();

      // Auto-hide progress after 5 seconds
      setTimeout(() => {
        setOperationProgress(null);
      }, 5000);

    } catch (error) {
      setOperationProgress({
        operation: confirmingOperation.type,
        status: 'error',
        error: error.message
      });
    } finally {
      setConfirmingOperation(null);
    }
  };

  // Handle undo action
  const handleUndo = async (auditLogId) => {
    try {
      const response = await fetch(`/api/admin/undo/${auditLogId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Undo failed');
      }

      // Refresh undoable actions
      fetchUndoableActions();
      
      // Show success message
      // This would typically be handled by a toast notification system
      
    } catch (error) {
      console.error('Undo failed:', error);
    }
  };

  // Default bulk operations
  const defaultOperations = [
    {
      type: 'bulk_delete',
      label: t('admin.bulkOperations.delete'),
      icon: TrashIcon,
      color: 'red',
      destructive: true,
      description: t('admin.bulkOperations.deleteDescription')
    },
    {
      type: 'bulk_approve',
      label: t('admin.bulkOperations.approve'),
      icon: CheckCircleIcon,
      color: 'green',
      destructive: false,
      description: t('admin.bulkOperations.approveDescription')
    },
    {
      type: 'bulk_export',
      label: t('admin.bulkOperations.export'),
      icon: DocumentArrowDownIcon,
      color: 'blue',
      destructive: false,
      description: t('admin.bulkOperations.exportDescription')
    }
  ];

  const operations = availableOperations.length > 0 ? availableOperations : defaultOperations;

  return (
    <div className={`bulk-operations-manager ${className}`}>
      {/* Selection Controls */}
      <div className="flex items-center justify-between mb-4 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-4">
          {/* Select All Checkbox */}
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={isAllSelected}
              ref={input => {
                if (input) input.indeterminate = isPartiallySelected;
              }}
              onChange={handleSelectAll}
              className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
            />
            <label className="ml-2 text-sm text-gray-700 dark:text-gray-300">
              {isAllSelected 
                ? t('admin.bulkOperations.deselectAll')
                : t('admin.bulkOperations.selectAll')
              }
            </label>
          </div>

          {/* Selection Count */}
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {selectedIds.length > 0 && (
              <span>
                {t('admin.bulkOperations.selectedCount', { count: selectedIds.length })}
              </span>
            )}
          </div>
        </div>

        {/* Undo Panel Toggle */}
        {undoableActions.length > 0 && (
          <button
            onClick={() => setShowUndoPanel(!showUndoPanel)}
            className="flex items-center space-x-2 px-3 py-1 text-sm text-purple-600 hover:text-purple-700 dark:text-purple-400"
          >
            <ArrowUturnLeftIcon className="h-4 w-4" />
            <span>{t('admin.bulkOperations.undoActions', { count: undoableActions.length })}</span>
          </button>
        )}
      </div>

      {/* Bulk Actions Bar */}
      <AnimatePresence>
        {showBulkActions && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mb-4 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-700"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <InformationCircleIcon className="h-5 w-5 text-purple-600" />
                <span className="text-sm font-medium text-purple-800 dark:text-purple-200">
                  {t('admin.bulkOperations.actionsAvailable')}
                </span>
              </div>

              <div className="flex items-center space-x-2">
                {operations.map((operation) => (
                  <button
                    key={operation.type}
                    onClick={() => handleBulkOperation(operation)}
                    disabled={loading}
                    className={`
                      inline-flex items-center px-3 py-2 text-sm font-medium rounded-md
                      transition-colors duration-200
                      ${operation.color === 'red' 
                        ? 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/20 dark:text-red-400'
                        : operation.color === 'green'
                        ? 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/20 dark:text-green-400'
                        : 'bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/20 dark:text-blue-400'
                      }
                      disabled:opacity-50 disabled:cursor-not-allowed
                    `}
                  >
                    <operation.icon className="h-4 w-4 mr-2" />
                    {operation.label}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Undo Panel */}
      <AnimatePresence>
        {showUndoPanel && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-700"
          >
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                  {t('admin.bulkOperations.undoableActions')}
                </h3>
                <button
                  onClick={() => setShowUndoPanel(false)}
                  className="text-yellow-600 hover:text-yellow-700"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-2 max-h-40 overflow-y-auto">
                {undoableActions.map((action) => (
                  <div
                    key={action.id}
                    className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded border"
                  >
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {action.action_type} on {action.table_name}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(action.created_at).toLocaleString()}
                      </div>
                    </div>
                    <button
                      onClick={() => handleUndo(action.id)}
                      className="ml-2 px-2 py-1 text-xs bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400"
                    >
                      <ArrowUturnLeftIcon className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Operation Progress */}
      <AnimatePresence>
        {operationProgress && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-blue-800 dark:text-blue-200">
                  {operationProgress.status === 'processing' && t('admin.bulkOperations.processing')}
                  {operationProgress.status === 'completed' && t('admin.bulkOperations.completed')}
                  {operationProgress.status === 'error' && t('admin.bulkOperations.error')}
                </div>
                {operationProgress.total && (
                  <div className="text-xs text-blue-600 dark:text-blue-400">
                    {operationProgress.completed || 0} / {operationProgress.total} {t('admin.bulkOperations.processed')}
                    {operationProgress.failed > 0 && (
                      <span className="text-red-600 ml-2">
                        ({operationProgress.failed} {t('admin.bulkOperations.failed')})
                      </span>
                    )}
                  </div>
                )}
                {operationProgress.error && (
                  <div className="text-xs text-red-600 dark:text-red-400">
                    {operationProgress.error}
                  </div>
                )}
              </div>

              {operationProgress.status === 'processing' && (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
              )}
              {operationProgress.status === 'completed' && (
                <CheckIcon className="h-5 w-5 text-green-600" />
              )}
              {operationProgress.status === 'error' && (
                <XMarkIcon className="h-5 w-5 text-red-600" />
              )}
            </div>

            {/* Progress Bar */}
            {operationProgress.total && operationProgress.status === 'processing' && (
              <div className="mt-2 w-full bg-blue-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${((operationProgress.completed || 0) / operationProgress.total) * 100}%`
                  }}
                ></div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {confirmingOperation && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={() => setConfirmingOperation(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center mb-4">
                {confirmingOperation.destructive ? (
                  <ExclamationTriangleIcon className="h-6 w-6 text-red-600 mr-3" />
                ) : (
                  <InformationCircleIcon className="h-6 w-6 text-blue-600 mr-3" />
                )}
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                  {t('admin.bulkOperations.confirmOperation')}
                </h3>
              </div>

              <div className="mb-4">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  {confirmingOperation.description}
                </p>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {t('admin.bulkOperations.affectedItems', { count: selectedIds.length })}
                </p>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setConfirmingOperation(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={executeBulkOperation}
                  className={`
                    px-4 py-2 text-sm font-medium text-white rounded-md
                    ${confirmingOperation.destructive
                      ? 'bg-red-600 hover:bg-red-700'
                      : 'bg-purple-600 hover:bg-purple-700'
                    }
                  `}
                >
                  {confirmingOperation.label}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Selection Checkboxes for Data Items */}
      <div className="space-y-2">
        {data.map((item) => (
          <div key={item.id} className="flex items-center">
            <input
              type="checkbox"
              checked={selectedIds.includes(item.id)}
              onChange={() => handleSelectItem(item.id)}
              className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
            />
            {/* This would be replaced by your actual data row component */}
            <div className="ml-3 flex-1">
              {/* Your data row content here */}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BulkOperationsManager; 