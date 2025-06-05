import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar, 
  Clock, 
  Plus, 
  Edit3, 
  Trash2, 
  Check, 
  X, 
  AlertCircle,
  Loader,
  Save,
  Eye,
  EyeOff,
  RefreshCw,
  Filter,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  XCircle,
  Hourglass
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { WorkingHoursAPI } from '../../api/workingHoursApi';

const WorkingHoursManager = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('schedule');
  const [loading, setLoading] = useState(false);
  const [schedule, setSchedule] = useState([]);
  const [requests, setRequests] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showBulkAdd, setShowBulkAdd] = useState(false);
  const [editingSlot, setEditingSlot] = useState(null);
  const [filters, setFilters] = useState({
    period: 'future',
    status: 'all'
  });

  // Form states
  const [formData, setFormData] = useState({
    date: '',
    start_time: '09:00',
    end_time: '17:00',
    is_available: true,
    max_bookings: 1,
    buffer_minutes: 15,
    notes: ''
  });

  const [bulkFormData, setBulkFormData] = useState({
    start_date: '',
    end_date: '',
    days_of_week: [],
    start_time: '09:00',
    end_time: '17:00',
    max_bookings: 1,
    buffer_minutes: 15,
    notes: ''
  });

  const [errors, setErrors] = useState([]);
  const [successMessage, setSuccessMessage] = useState('');

  // Load data
  const loadSchedule = useCallback(async () => {
    try {
      setLoading(true);
      const result = await WorkingHoursAPI.getMySchedule(filters);
      if (result.success) {
        setSchedule(result.data.map(item => WorkingHoursAPI.formatScheduleData(item)));
      } else {
        setErrors([result.error]);
      }
    } catch (error) {
      setErrors(['Failed to load schedule']);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const loadRequests = useCallback(async () => {
    try {
      const result = await WorkingHoursAPI.getMyRequests();
      if (result.success) {
        setRequests(result.data);
      } else {
        setErrors([result.error]);
      }
    } catch (error) {
      setErrors(['Failed to load requests']);
    }
  }, []);

  useEffect(() => {
    loadSchedule();
    loadRequests();
  }, [loadSchedule, loadRequests]);

  // Form handlers
  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleBulkFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name === 'days_of_week') {
      const dayValue = parseInt(value);
      setBulkFormData(prev => ({
        ...prev,
        days_of_week: checked 
          ? [...prev.days_of_week, dayValue]
          : prev.days_of_week.filter(day => day !== dayValue)
      }));
    } else {
      setBulkFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
  };

  const resetForm = () => {
    setFormData({
      date: '',
      start_time: '09:00',
      end_time: '17:00',
      is_available: true,
      max_bookings: 1,
      buffer_minutes: 15,
      notes: ''
    });
    setEditingSlot(null);
    setShowAddForm(false);
    setErrors([]);
  };

  const resetBulkForm = () => {
    setBulkFormData({
      start_date: '',
      end_date: '',
      days_of_week: [],
      start_time: '09:00',
      end_time: '17:00',
      max_bookings: 1,
      buffer_minutes: 15,
      notes: ''
    });
    setShowBulkAdd(false);
    setErrors([]);
  };

  // Submit handlers
  const handleSubmitSingle = async (e) => {
    e.preventDefault();
    
    // Validate form
    const validation = WorkingHoursAPI.validateWorkingHours(formData);
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    try {
      setLoading(true);
      setErrors([]);

      const requestData = {
        action_type: editingSlot ? 'edit' : 'add',
        target_schedule_id: editingSlot?.id || null,
        requested_changes: formData,
        old_values: editingSlot || null,
        request_notes: formData.notes
      };

      const result = await WorkingHoursAPI.submitRequest(requestData);
      
      if (result.success) {
        setSuccessMessage(result.message);
        resetForm();
        loadRequests();
      } else {
        setErrors([result.error]);
      }
    } catch (error) {
      setErrors(['Failed to submit request']);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitBulk = async (e) => {
    e.preventDefault();

    if (bulkFormData.days_of_week.length === 0) {
      setErrors(['Please select at least one day of the week']);
      return;
    }

    try {
      setLoading(true);
      setErrors([]);

      // Generate slots for bulk add
      const slots = [];
      const startDate = new Date(bulkFormData.start_date);
      const endDate = new Date(bulkFormData.end_date);
      
      for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
        const dayOfWeek = date.getDay();
        if (bulkFormData.days_of_week.includes(dayOfWeek)) {
          slots.push({
            date: date.toISOString().split('T')[0],
            start_time: bulkFormData.start_time,
            end_time: bulkFormData.end_time,
            is_available: true,
            max_bookings: bulkFormData.max_bookings,
            buffer_minutes: bulkFormData.buffer_minutes,
            notes: bulkFormData.notes
          });
        }
      }

      if (slots.length === 0) {
        setErrors(['No slots generated. Please check your date range and selected days.']);
        return;
      }

      const result = await WorkingHoursAPI.submitBulkRequest(slots, bulkFormData.notes);
      
      if (result.success) {
        setSuccessMessage(`Bulk request submitted with ${slots.length} slots`);
        resetBulkForm();
        loadRequests();
      } else {
        setErrors([result.error]);
      }
    } catch (error) {
      setErrors(['Failed to submit bulk request']);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSlot = async (slot) => {
    if (!window.confirm('Are you sure you want to request deletion of this time slot?')) {
      return;
    }

    try {
      setLoading(true);
      
      const requestData = {
        action_type: 'delete',
        target_schedule_id: slot.id,
        requested_changes: { action: 'delete' },
        old_values: slot,
        request_notes: `Delete ${slot.formattedDate} ${slot.formattedTime}`
      };

      const result = await WorkingHoursAPI.submitRequest(requestData);
      
      if (result.success) {
        setSuccessMessage('Delete request submitted successfully');
        loadRequests();
      } else {
        setErrors([result.error]);
      }
    } catch (error) {
      setErrors(['Failed to submit delete request']);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelRequest = async (requestId) => {
    if (!window.confirm('Are you sure you want to cancel this request?')) {
      return;
    }

    try {
      setLoading(true);
      const result = await WorkingHoursAPI.cancelRequest(requestId);
      
      if (result.success) {
        setSuccessMessage('Request cancelled successfully');
        loadRequests();
      } else {
        setErrors([result.error]);
      }
    } catch (error) {
      setErrors(['Failed to cancel request']);
    } finally {
      setLoading(false);
    }
  };

  const handleEditSlot = (slot) => {
    setFormData({
      date: slot.date,
      start_time: slot.start_time,
      end_time: slot.end_time,
      is_available: slot.is_available,
      max_bookings: slot.max_bookings,
      buffer_minutes: slot.buffer_minutes,
      notes: slot.notes || ''
    });
    setEditingSlot(slot);
    setShowAddForm(true);
  };

  // Helper functions
  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30';
      case 'approved': return 'text-green-400 bg-green-500/20 border-green-500/30';
      case 'rejected': return 'text-red-400 bg-red-500/20 border-red-500/30';
      case 'cancelled': return 'text-gray-400 bg-gray-500/20 border-gray-500/30';
      default: return 'text-gray-400 bg-gray-500/20 border-gray-500/30';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return <Hourglass className="w-4 h-4" />;
      case 'approved': return <CheckCircle className="w-4 h-4" />;
      case 'rejected': return <XCircle className="w-4 h-4" />;
      case 'cancelled': return <X className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  const daysOfWeek = [
    { value: 0, label: 'Sunday' },
    { value: 1, label: 'Monday' },
    { value: 2, label: 'Tuesday' },
    { value: 3, label: 'Wednesday' },
    { value: 4, label: 'Thursday' },
    { value: 5, label: 'Friday' },
    { value: 6, label: 'Saturday' }
  ];

  const filteredSchedule = schedule.filter(slot => {
    if (filters.period === 'past') return slot.isPast;
    if (filters.period === 'today') return slot.isToday;
    if (filters.period === 'future') return !slot.isPast && !slot.isToday;
    return true;
  });

  const filteredRequests = requests.filter(request => {
    if (filters.status === 'all') return true;
    return request.status === filters.status;
  });

  return (
    <div className="space-y-6">
      {/* Success/Error Messages */}
      <AnimatePresence>
        {successMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="p-4 bg-green-500/20 border border-green-500/30 rounded-lg flex items-center gap-3"
          >
            <CheckCircle className="w-5 h-5 text-green-400" />
            <span className="text-green-300">{successMessage}</span>
            <button
              onClick={() => setSuccessMessage('')}
              className="ml-auto text-green-400 hover:text-green-300"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}

        {errors.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="p-4 bg-red-500/20 border border-red-500/30 rounded-lg"
          >
            <div className="flex items-center gap-3 mb-2">
              <AlertCircle className="w-5 h-5 text-red-400" />
              <span className="text-red-300 font-medium">Error</span>
              <button
                onClick={() => setErrors([])}
                className="ml-auto text-red-400 hover:text-red-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <ul className="text-red-300 text-sm space-y-1">
              {errors.map((error, index) => (
                <li key={index}>• {error}</li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Calendar className="w-6 h-6 text-purple-400" />
          <h2 className="text-2xl font-bold text-white">Working Hours</h2>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={loadSchedule}
            disabled={loading}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          
          <button
            onClick={() => setShowBulkAdd(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <Calendar className="w-4 h-4" />
            Bulk Add
          </button>
          
          <button
            onClick={() => setShowAddForm(true)}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Slot
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-700">
        {[
          { id: 'schedule', name: 'My Schedule', icon: Calendar },
          { id: 'requests', name: 'Approval Requests', icon: Clock }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors ${
              activeTab === tab.id
                ? 'text-purple-400 border-b-2 border-purple-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.name}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'schedule' && (
          <motion.div
            key="schedule"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            {/* Filters */}
            <div className="flex items-center gap-4 p-4 bg-black/30 rounded-lg border border-purple-500/20">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={filters.period}
                onChange={(e) => setFilters(prev => ({ ...prev, period: e.target.value }))}
                className="bg-dark-700 border border-gray-600 rounded px-3 py-1 text-white"
              >
                <option value="future">Future</option>
                <option value="today">Today</option>
                <option value="past">Past</option>
                <option value="all">All</option>
              </select>
            </div>

            {/* Schedule Grid */}
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader className="w-8 h-8 text-purple-400 animate-spin" />
              </div>
            ) : filteredSchedule.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-medium text-white mb-2">No working hours scheduled</h3>
                <p className="text-gray-400 mb-4">
                  Start by adding your availability. All changes require admin approval.
                </p>
                <button
                  onClick={() => setShowAddForm(true)}
                  className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                >
                  Add Your First Slot
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredSchedule.map((slot) => (
                  <motion.div
                    key={slot.id}
                    layout
                    className="p-4 bg-black/30 backdrop-blur-sm rounded-xl border border-purple-500/20 hover:border-purple-500/40 transition-all"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-white">{slot.formattedDate}</h3>
                        <p className="text-purple-400 font-mono">{slot.formattedTime}</p>
                        <p className="text-gray-400 text-sm">Duration: {slot.duration}</p>
                      </div>
                      
                      {slot.is_available ? (
                        <Eye className="w-4 h-4 text-green-400" />
                      ) : (
                        <EyeOff className="w-4 h-4 text-gray-400" />
                      )}
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Max bookings:</span>
                        <span className="text-white">{slot.max_bookings}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Buffer:</span>
                        <span className="text-white">{slot.buffer_minutes}m</span>
                      </div>
                      {slot.notes && (
                        <div className="text-sm">
                          <span className="text-gray-400">Notes:</span>
                          <p className="text-white mt-1">{slot.notes}</p>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEditSlot(slot)}
                        className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                      >
                        <Edit3 className="w-4 h-4" />
                        Edit
                      </button>
                      
                      <button
                        onClick={() => handleDeleteSlot(slot)}
                        className="flex-1 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'requests' && (
          <motion.div
            key="requests"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            {/* Filters */}
            <div className="flex items-center gap-4 p-4 bg-black/30 rounded-lg border border-purple-500/20">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                className="bg-dark-700 border border-gray-600 rounded px-3 py-1 text-white"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            {/* Requests List */}
            {filteredRequests.length === 0 ? (
              <div className="text-center py-12">
                <Clock className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-medium text-white mb-2">No requests found</h3>
                <p className="text-gray-400">
                  Your working hours change requests will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredRequests.map((request) => (
                  <motion.div
                    key={request.id}
                    layout
                    className="p-6 bg-black/30 backdrop-blur-sm rounded-xl border border-purple-500/20"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-white capitalize">
                            {request.action_type} Request
                          </h3>
                          <span className={`px-2 py-1 rounded-full text-xs border flex items-center gap-1 ${getStatusColor(request.status)}`}>
                            {getStatusIcon(request.status)}
                            {request.status}
                          </span>
                        </div>
                        <p className="text-gray-400 text-sm">
                          Submitted on {new Date(request.created_at).toLocaleDateString()}
                        </p>
                      </div>

                      {request.status === 'pending' && (
                        <button
                          onClick={() => handleCancelRequest(request.id)}
                          className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm transition-colors"
                        >
                          Cancel
                        </button>
                      )}
                    </div>

                    {/* Request Details */}
                    <div className="bg-dark-700/50 rounded-lg p-4 mb-4">
                      <h4 className="font-medium text-white mb-2">Requested Changes:</h4>
                      <pre className="text-gray-300 text-sm bg-dark-800 p-3 rounded overflow-x-auto">
                        {JSON.stringify(request.requested_changes, null, 2)}
                      </pre>
                    </div>

                    {request.request_notes && (
                      <div className="mb-4">
                        <h4 className="font-medium text-white mb-2">Notes:</h4>
                        <p className="text-gray-300">{request.request_notes}</p>
                      </div>
                    )}

                    {request.review_reason && (
                      <div className="bg-dark-700/50 rounded-lg p-4">
                        <h4 className="font-medium text-white mb-2">Admin Review:</h4>
                        <p className="text-gray-300">{request.review_reason}</p>
                        {request.admin_first_name && (
                          <p className="text-gray-400 text-sm mt-2">
                            Reviewed by {request.admin_first_name} {request.admin_last_name}
                          </p>
                        )}
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            onClick={() => resetForm()}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-dark-800 rounded-2xl border border-purple-500/20 p-6 w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-white">
                  {editingSlot ? 'Edit Time Slot' : 'Add Time Slot'}
                </h3>
                <button
                  onClick={resetForm}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmitSingle} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Date
                  </label>
                  <input
                    type="date"
                    name="date"
                    value={formData.date}
                    onChange={handleFormChange}
                    min={new Date().toISOString().split('T')[0]}
                    max={new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                    required
                    className="w-full px-3 py-2 bg-dark-700 border border-gray-600 rounded-lg text-white focus:border-purple-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Start Time
                    </label>
                    <input
                      type="time"
                      name="start_time"
                      value={formData.start_time}
                      onChange={handleFormChange}
                      required
                      className="w-full px-3 py-2 bg-dark-700 border border-gray-600 rounded-lg text-white focus:border-purple-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      End Time
                    </label>
                    <input
                      type="time"
                      name="end_time"
                      value={formData.end_time}
                      onChange={handleFormChange}
                      required
                      className="w-full px-3 py-2 bg-dark-700 border border-gray-600 rounded-lg text-white focus:border-purple-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Max Bookings
                    </label>
                    <input
                      type="number"
                      name="max_bookings"
                      value={formData.max_bookings}
                      onChange={handleFormChange}
                      min="1"
                      max="10"
                      required
                      className="w-full px-3 py-2 bg-dark-700 border border-gray-600 rounded-lg text-white focus:border-purple-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Buffer (minutes)
                    </label>
                    <input
                      type="number"
                      name="buffer_minutes"
                      value={formData.buffer_minutes}
                      onChange={handleFormChange}
                      min="0"
                      max="120"
                      step="5"
                      required
                      className="w-full px-3 py-2 bg-dark-700 border border-gray-600 rounded-lg text-white focus:border-purple-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      name="is_available"
                      checked={formData.is_available}
                      onChange={handleFormChange}
                      className="w-4 h-4 text-purple-600 bg-dark-700 border-gray-600 rounded focus:ring-purple-500"
                    />
                    <span className="text-sm text-gray-300">Available for bookings</span>
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Notes (optional)
                  </label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleFormChange}
                    rows="3"
                    className="w-full px-3 py-2 bg-dark-700 border border-gray-600 rounded-lg text-white focus:border-purple-500 focus:outline-none resize-none"
                    placeholder="Add any special notes about this time slot..."
                  />
                </div>

                <div className="flex items-center gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <Loader className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    {editingSlot ? 'Update Slot' : 'Add Slot'}
                  </button>
                  
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bulk Add Modal */}
      <AnimatePresence>
        {showBulkAdd && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            onClick={() => resetBulkForm()}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-dark-800 rounded-2xl border border-purple-500/20 p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-white">
                  Bulk Add Working Hours
                </h3>
                <button
                  onClick={resetBulkForm}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmitBulk} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Start Date
                    </label>
                    <input
                      type="date"
                      name="start_date"
                      value={bulkFormData.start_date}
                      onChange={handleBulkFormChange}
                      min={new Date().toISOString().split('T')[0]}
                      max={new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                      required
                      className="w-full px-3 py-2 bg-dark-700 border border-gray-600 rounded-lg text-white focus:border-purple-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      End Date
                    </label>
                    <input
                      type="date"
                      name="end_date"
                      value={bulkFormData.end_date}
                      onChange={handleBulkFormChange}
                      min={bulkFormData.start_date || new Date().toISOString().split('T')[0]}
                      max={new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                      required
                      className="w-full px-3 py-2 bg-dark-700 border border-gray-600 rounded-lg text-white focus:border-purple-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Days of Week
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {daysOfWeek.map((day) => (
                      <label key={day.value} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          name="days_of_week"
                          value={day.value}
                          checked={bulkFormData.days_of_week.includes(day.value)}
                          onChange={handleBulkFormChange}
                          className="w-4 h-4 text-purple-600 bg-dark-700 border-gray-600 rounded focus:ring-purple-500"
                        />
                        <span className="text-sm text-gray-300">{day.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Start Time
                    </label>
                    <input
                      type="time"
                      name="start_time"
                      value={bulkFormData.start_time}
                      onChange={handleBulkFormChange}
                      required
                      className="w-full px-3 py-2 bg-dark-700 border border-gray-600 rounded-lg text-white focus:border-purple-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      End Time
                    </label>
                    <input
                      type="time"
                      name="end_time"
                      value={bulkFormData.end_time}
                      onChange={handleBulkFormChange}
                      required
                      className="w-full px-3 py-2 bg-dark-700 border border-gray-600 rounded-lg text-white focus:border-purple-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Max Bookings
                    </label>
                    <input
                      type="number"
                      name="max_bookings"
                      value={bulkFormData.max_bookings}
                      onChange={handleBulkFormChange}
                      min="1"
                      max="10"
                      required
                      className="w-full px-3 py-2 bg-dark-700 border border-gray-600 rounded-lg text-white focus:border-purple-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Buffer (minutes)
                    </label>
                    <input
                      type="number"
                      name="buffer_minutes"
                      value={bulkFormData.buffer_minutes}
                      onChange={handleBulkFormChange}
                      min="0"
                      max="120"
                      step="5"
                      required
                      className="w-full px-3 py-2 bg-dark-700 border border-gray-600 rounded-lg text-white focus:border-purple-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Notes (optional)
                  </label>
                  <textarea
                    name="notes"
                    value={bulkFormData.notes}
                    onChange={handleBulkFormChange}
                    rows="3"
                    className="w-full px-3 py-2 bg-dark-700 border border-gray-600 rounded-lg text-white focus:border-purple-500 focus:outline-none resize-none"
                    placeholder="Add notes for all these time slots..."
                  />
                </div>

                <div className="flex items-center gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <Loader className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    Submit Bulk Request
                  </button>
                  
                  <button
                    type="button"
                    onClick={resetBulkForm}
                    className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default WorkingHoursManager; 