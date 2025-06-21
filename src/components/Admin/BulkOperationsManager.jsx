import React, { useState, useEffect, useRef } from 'react';
import { 
  Upload, 
  Download, 
  Trash2, 
  CheckCircle, 
  XCircle, 
  Clock, 
  FileText, 
  AlertTriangle,
  ProgressBar,
  CheckSquare,
  Square,
  Filter,
  Search,
  RefreshCw
} from 'lucide-react';

const BulkOperationsManager = ({ entityType, data, onDataUpdate, className = '' }) => {
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [bulkOperation, setBulkOperation] = useState(null);
  const [operationHistory, setOperationHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [csvFile, setCsvFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [filters, setFilters] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    loadOperationHistory();
  }, [entityType]);

  const loadOperationHistory = async () => {
    try {
      const response = await fetch(`/api/admin/bulk-operations?entity_type=${entityType}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        setOperationHistory(result.data || []);
      }
    } catch (error) {
      console.error('Failed to load operation history:', error);
    }
  };

  // Select/Deselect items
  const toggleSelectItem = (itemId) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItems(newSelected);
  };

  const selectAll = () => {
    const filteredData = getFilteredData();
    const allIds = new Set(filteredData.map(item => item.id));
    setSelectedItems(allIds);
  };

  const deselectAll = () => {
    setSelectedItems(new Set());
  };

  // Filter and search data
  const getFilteredData = () => {
    if (!data) return [];
    
    let filtered = data;
    
    // Apply search
    if (searchQuery) {
      filtered = filtered.filter(item => 
        Object.values(item).some(value => 
          value?.toString().toLowerCase().includes(searchQuery.toLowerCase())
        )
      );
    }
    
    // Apply filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== '') {
        filtered = filtered.filter(item => item[key] === value);
      }
    });
    
    return filtered;
  };

  // Execute bulk operation
  const executeBulkOperation = async (operationType) => {
    if (selectedItems.size === 0) {
      alert('يرجى اختيار عناصر للمعالجة');
      return;
    }

    if (!confirm(`هل أنت متأكد من تنفيذ ${operationType} على ${selectedItems.size} عنصر؟`)) {
      return;
    }

    setBulkOperation({ type: operationType, status: 'processing' });

    try {
      const response = await fetch('/api/admin/bulk-operations/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          operation_type: operationType,
          entity_type: entityType,
          entity_ids: Array.from(selectedItems)
        })
      });

      if (response.ok) {
        const result = await response.json();
        setBulkOperation({ 
          type: operationType, 
          status: 'completed',
          operation_id: result.operation_id
        });
        
        // Refresh data
        if (onDataUpdate) {
          onDataUpdate();
        }
        
        // Clear selection
        setSelectedItems(new Set());
        
        // Refresh history
        loadOperationHistory();
        
        setTimeout(() => setBulkOperation(null), 3000);
      } else {
        setBulkOperation({ type: operationType, status: 'failed' });
        setTimeout(() => setBulkOperation(null), 3000);
      }
    } catch (error) {
      console.error('Bulk operation failed:', error);
      setBulkOperation({ type: operationType, status: 'failed' });
      setTimeout(() => setBulkOperation(null), 3000);
    }
  };

  // CSV Export
  const exportToCSV = async () => {
    setExporting(true);
    try {
      const dataToExport = selectedItems.size > 0 
        ? data.filter(item => selectedItems.has(item.id))
        : getFilteredData();

      if (dataToExport.length === 0) {
        alert('لا توجد بيانات للتصدير');
        return;
      }

      // Convert to CSV
      const headers = Object.keys(dataToExport[0]);
      const csvContent = [
        headers.join(','),
        ...dataToExport.map(item => 
          headers.map(header => {
            const value = item[header];
            // Escape commas and quotes in CSV
            if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value || '';
          }).join(',')
        )
      ].join('\n');

      // Download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `${entityType}_export_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Log export operation
      await fetch('/api/admin/bulk-operations/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          operation_type: 'csv_export',
          entity_type: entityType,
          entity_ids: Array.from(selectedItems),
          metadata: { exported_count: dataToExport.length }
        })
      });

      loadOperationHistory();
    } catch (error) {
      console.error('Export failed:', error);
      alert('فشل في تصدير البيانات');
    } finally {
      setExporting(false);
    }
  };

  // CSV Import
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      alert('يرجى اختيار ملف CSV');
      return;
    }

    setCsvFile(file);
    setImporting(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('entity_type', entityType);

      const response = await fetch('/api/admin/bulk-operations/import', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      if (response.ok) {
        const result = await response.json();
        alert(`تم استيراد ${result.imported_count} عنصر بنجاح`);
        
        if (onDataUpdate) {
          onDataUpdate();
        }
        
        loadOperationHistory();
      } else {
        const error = await response.json();
        alert(`فشل في الاستيراد: ${error.message}`);
      }
    } catch (error) {
      console.error('Import failed:', error);
      alert('فشل في استيراد الملف');
    } finally {
      setImporting(false);
      setCsvFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const getOperationIcon = (operationType) => {
    const iconMap = {
      bulk_approve: CheckCircle,
      bulk_reject: XCircle,
      bulk_delete: Trash2,
      csv_export: Download,
      csv_import: Upload
    };
    return iconMap[operationType] || Clock;
  };

  const getOperationStatus = (status) => {
    const statusMap = {
      pending: { icon: Clock, color: 'text-yellow-600 bg-yellow-100', label: 'في الانتظار' },
      processing: { icon: RefreshCw, color: 'text-blue-600 bg-blue-100', label: 'قيد المعالجة' },
      completed: { icon: CheckCircle, color: 'text-green-600 bg-green-100', label: 'مكتمل' },
      failed: { icon: XCircle, color: 'text-red-600 bg-red-100', label: 'فشل' }
    };
    return statusMap[status] || statusMap.pending;
  };

  const filteredData = getFilteredData();

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Bulk Actions Toolbar */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Selection Info */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <button
                onClick={selectedItems.size === filteredData.length ? deselectAll : selectAll}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              >
                {selectedItems.size === filteredData.length ? (
                  <CheckSquare className="w-5 h-5 text-purple-600" />
                ) : (
                  <Square className="w-5 h-5 text-gray-400" />
                )}
              </button>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {selectedItems.size} من {filteredData.length} محدد
              </span>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث..."
                className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white text-sm"
              />
            </div>
          </div>

          {/* Bulk Actions */}
          <div className="flex items-center space-x-2">
            {/* CSV Operations */}
            <div className="flex items-center space-x-2 border-r border-gray-300 dark:border-gray-600 pr-4">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={importing}
                className="inline-flex items-center px-3 py-2 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors text-sm disabled:opacity-50"
              >
                <Upload className="w-4 h-4 mr-2" />
                {importing ? 'جاري الاستيراد...' : 'استيراد CSV'}
              </button>

              <button
                onClick={exportToCSV}
                disabled={exporting || filteredData.length === 0}
                className="inline-flex items-center px-3 py-2 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded-lg hover:bg-green-200 dark:hover:bg-green-800 transition-colors text-sm disabled:opacity-50"
              >
                <Download className="w-4 h-4 mr-2" />
                {exporting ? 'جاري التصدير...' : 'تصدير CSV'}
              </button>
            </div>

            {/* Bulk Actions */}
            {selectedItems.size > 0 && (
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => executeBulkOperation('bulk_approve')}
                  disabled={bulkOperation?.status === 'processing'}
                  className="inline-flex items-center px-3 py-2 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded-lg hover:bg-green-200 dark:hover:bg-green-800 transition-colors text-sm disabled:opacity-50"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  موافقة جماعية
                </button>

                <button
                  onClick={() => executeBulkOperation('bulk_reject')}
                  disabled={bulkOperation?.status === 'processing'}
                  className="inline-flex items-center px-3 py-2 bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300 rounded-lg hover:bg-yellow-200 dark:hover:bg-yellow-800 transition-colors text-sm disabled:opacity-50"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  رفض جماعي
                </button>

                <button
                  onClick={() => executeBulkOperation('bulk_delete')}
                  disabled={bulkOperation?.status === 'processing'}
                  className="inline-flex items-center px-3 py-2 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-800 transition-colors text-sm disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  حذف جماعي
                </button>
              </div>
            )}

            {/* History Toggle */}
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="inline-flex items-center px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm"
            >
              <Clock className="w-4 h-4 mr-2" />
              السجل
            </button>
          </div>
        </div>

        {/* Operation Status */}
        {bulkOperation && (
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-center">
              {bulkOperation.status === 'processing' ? (
                <RefreshCw className="w-4 h-4 text-blue-600 mr-2 animate-spin" />
              ) : bulkOperation.status === 'completed' ? (
                <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
              ) : (
                <XCircle className="w-4 h-4 text-red-600 mr-2" />
              )}
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {bulkOperation.status === 'processing' && `جاري تنفيذ ${bulkOperation.type}...`}
                {bulkOperation.status === 'completed' && `تم تنفيذ ${bulkOperation.type} بنجاح`}
                {bulkOperation.status === 'failed' && `فشل في تنفيذ ${bulkOperation.type}`}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Data Table with Selection */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <button
                    onClick={selectedItems.size === filteredData.length ? deselectAll : selectAll}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded"
                  >
                    {selectedItems.size === filteredData.length ? (
                      <CheckSquare className="w-4 h-4 text-purple-600" />
                    ) : (
                      <Square className="w-4 h-4 text-gray-400" />
                    )}
                  </button>
                </th>
                {filteredData.length > 0 && Object.keys(filteredData[0]).slice(0, 5).map(key => (
                  <th key={key} className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {key}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredData.map((item, index) => (
                <tr 
                  key={item.id || index}
                  className={`hover:bg-gray-50 dark:hover:bg-gray-700 ${
                    selectedItems.has(item.id) ? 'bg-purple-50 dark:bg-purple-900/20' : ''
                  }`}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => toggleSelectItem(item.id)}
                      className="p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded"
                    >
                      {selectedItems.has(item.id) ? (
                        <CheckSquare className="w-4 h-4 text-purple-600" />
                      ) : (
                        <Square className="w-4 h-4 text-gray-400" />
                      )}
                    </button>
                  </td>
                  {Object.values(item).slice(0, 5).map((value, valueIndex) => (
                    <td key={valueIndex} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {typeof value === 'object' ? JSON.stringify(value) : value?.toString() || '-'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredData.length === 0 && (
          <div className="text-center py-8">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">لا توجد بيانات للعرض</p>
          </div>
        )}
      </div>

      {/* Operation History */}
      {showHistory && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              سجل العمليات الجماعية
            </h3>
          </div>
          
          <div className="max-h-64 overflow-y-auto">
            {operationHistory.length === 0 ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>لا توجد عمليات سابقة</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {operationHistory.map((operation, index) => {
                  const IconComponent = getOperationIcon(operation.operation_type);
                  const status = getOperationStatus(operation.status);
                  
                  return (
                    <div key={operation.id || index} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className={`p-2 rounded-lg mr-3 ${status.color}`}>
                            <IconComponent className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {operation.operation_type.replace(/_/g, ' ')}
                            </p>
                            <p className="text-xs text-gray-600 dark:text-gray-400">
                              {operation.processed_items || 0} من {operation.total_items} عنصر
                            </p>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${status.color}`}>
                            <status.icon className="w-3 h-3 mr-1" />
                            {status.label}
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {new Date(operation.started_at).toLocaleString('ar')}
                          </p>
                        </div>
                      </div>
                      
                      {operation.status === 'processing' && (
                        <div className="mt-2">
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                              style={{ 
                                width: `${(operation.processed_items / operation.total_items) * 100}%` 
                              }}
                            ></div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default BulkOperationsManager; 