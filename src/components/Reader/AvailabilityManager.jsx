import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Clock, Calendar, Plus, Edit3, Trash2, AlertTriangle,
  CheckCircle, XCircle, Bell, BellOff, Settings,
  Save, RotateCcw, Eye, EyeOff
} from 'lucide-react';
import { getRTLClasses, getMobileRowClasses } from '../../utils/rtlUtils';
import { useResponsive } from '../../hooks/useResponsive';

const AvailabilityManager = () => {
  const [activeTab, setActiveTab] = useState('schedule');
  const [schedule, setSchedule] = useState([]);
  const [overrides, setOverrides] = useState([]);
  const [emergencyNotifications, setEmergencyNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingSlot, setEditingSlot] = useState(null);
  const [showAddSlot, setShowAddSlot] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(null);
  const { isMobile } = useResponsive();

  const daysOfWeek = [
    { value: 0, label: 'Sunday', short: 'Sun' },
    { value: 1, label: 'Monday', short: 'Mon' },
    { value: 2, label: 'Tuesday', short: 'Tue' },
    { value: 3, label: 'Wednesday', short: 'Wed' },
    { value: 4, label: 'Thursday', short: 'Thu' },
    { value: 5, label: 'Friday', short: 'Fri' },
    { value: 6, label: 'Saturday', short: 'Sat' }
  ];

  useEffect(() => {
    fetchSchedule();
    fetchOverrides();
    fetchEmergencyNotifications();
    fetchCurrentStatus();
  }, []);

  const fetchSchedule = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/reader-availability/schedule', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSchedule(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching schedule:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchOverrides = async () => {
    try {
      const now = new Date();
      const startDate = now.toISOString().split('T')[0];
      const endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const response = await fetch(`/api/reader-availability/overrides?start_date=${startDate}&end_date=${endDate}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setOverrides(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching overrides:', error);
    }
  };

  const fetchEmergencyNotifications = async () => {
    try {
      const response = await fetch('/api/reader-availability/emergency/notifications?limit=10', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setEmergencyNotifications(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching emergency notifications:', error);
    }
  };

  const fetchCurrentStatus = async () => {
    try {
      const response = await fetch('/api/reader-availability/status', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setCurrentStatus(data.data);
      }
    } catch (error) {
      console.error('Error fetching current status:', error);
    }
  };

  const saveSchedule = async (newSchedule) => {
    try {
      setLoading(true);
      const response = await fetch('/api/reader-availability/schedule', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ schedule: newSchedule })
      });

      if (response.ok) {
        setSchedule(newSchedule);
        fetchCurrentStatus();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to save schedule');
      }
    } catch (error) {
      console.error('Error saving schedule:', error);
      alert('Failed to save schedule');
    } finally {
      setLoading(false);
    }
  };

  const addScheduleSlot = (slotData) => {
    const newSchedule = [...schedule, slotData];
    saveSchedule(newSchedule);
    setShowAddSlot(false);
  };

  const updateScheduleSlot = (slotId, updates) => {
    const newSchedule = schedule.map(slot => 
      slot.id === slotId ? { ...slot, ...updates } : slot
    );
    saveSchedule(newSchedule);
    setEditingSlot(null);
  };

  const deleteScheduleSlot = (slotId) => {
    if (confirm('Are you sure you want to delete this time slot?')) {
      const newSchedule = schedule.filter(slot => slot.id !== slotId);
      saveSchedule(newSchedule);
    }
  };

  const createOverride = async (overrideData) => {
    try {
      const response = await fetch('/api/reader-availability/overrides', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(overrideData)
      });

      if (response.ok) {
        fetchOverrides();
        fetchCurrentStatus();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to create override');
      }
    } catch (error) {
      console.error('Error creating override:', error);
      alert('Failed to create override');
    }
  };

  const respondToEmergency = async (notificationId, response, notes = '') => {
    try {
      const apiResponse = await fetch(`/api/reader-availability/emergency/notifications/${notificationId}/respond`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ response, response_notes: notes })
      });

      if (apiResponse.ok) {
        fetchEmergencyNotifications();
      } else {
        const data = await apiResponse.json();
        alert(data.error || 'Failed to respond');
      }
    } catch (error) {
      console.error('Error responding to emergency:', error);
      alert('Failed to respond');
    }
  };

  const formatTime = (time) => {
    if (!time) return '';
    return new Date(`2000-01-01T${time}`).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getDaySchedule = (dayValue) => {
    return schedule.filter(slot => slot.day_of_week === dayValue).sort((a, b) => 
      a.start_time.localeCompare(b.start_time)
    );
  };

  const getOverrideForDate = (date) => {
    return overrides.find(override => override.override_date === date);
  };

  const tabs = [
    { id: 'schedule', label: 'Schedule', icon: Calendar },
    { id: 'overrides', label: 'Overrides', icon: Settings },
    { id: 'emergency', label: 'Emergency', icon: AlertTriangle }
  ];

  return (
    <div className={`space-y-6 ${getRTLClasses()}`}>
      {/* Header with Status */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-cosmic-text">Availability Manager</h2>
          <p className="text-cosmic-text/70 text-sm">
            Manage your schedule and emergency availability
          </p>
        </div>
        
        {currentStatus && (
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${
              currentStatus.is_available 
                ? 'border-green-500/30 bg-green-500/10 text-green-400'
                : 'border-red-500/30 bg-red-500/10 text-red-400'
            }`}>
              {currentStatus.is_available ? (
                <CheckCircle className="w-4 h-4" />
              ) : (
                <XCircle className="w-4 h-4" />
              )}
              <span className="text-sm font-medium">
                {currentStatus.is_available ? 'Available' : 'Unavailable'}
              </span>
            </div>
            
            <span className="text-cosmic-text/60 text-xs">
              Updated: {new Date(currentStatus.timestamp).toLocaleTimeString()}
            </span>
          </div>
        )}
      </div>

      {/* Tab Navigation */}
      <div className={`flex ${isMobile ? 'flex-col' : 'flex-row'} gap-1 bg-cosmic-panel/20 p-1 rounded-xl`}>
        {tabs.map(tab => {
          const Icon = tab.icon;
          const hasNotifications = tab.id === 'emergency' && 
            emergencyNotifications.some(n => n.notification_status === 'pending' || n.notification_status === 'sent');
          
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                relative flex items-center gap-2 px-4 py-3 rounded-lg transition-all duration-200 flex-1
                ${activeTab === tab.id 
                  ? 'bg-cosmic-accent text-white shadow-lg' 
                  : 'text-cosmic-text/70 hover:text-cosmic-text hover:bg-cosmic-panel/30'
                }
              `}
            >
              <Icon className="w-4 h-4" />
              {!isMobile && <span className="font-medium">{tab.label}</span>}
              
              {hasNotifications && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full" />
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'schedule' && (
            <div className="space-y-6">
              {/* Add Slot Button */}
              <div className="flex justify-end">
                <button
                  onClick={() => setShowAddSlot(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-cosmic-accent hover:bg-cosmic-accent/80 rounded-lg text-white font-medium transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Time Slot
                </button>
              </div>

              {/* Weekly Schedule */}
              <div className="grid gap-4">
                {daysOfWeek.map(day => {
                  const daySlots = getDaySchedule(day.value);
                  const today = new Date().toISOString().split('T')[0];
                  const override = getOverrideForDate(today);
                  
                  return (
                    <motion.div
                      key={day.value}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: day.value * 0.1 }}
                      className="bg-cosmic-panel/20 backdrop-blur-sm border border-cosmic-accent/30 rounded-xl p-4"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-cosmic-text">
                          {isMobile ? day.short : day.label}
                        </h3>
                        
                        {override && override.override_date === today && day.value === new Date().getDay() && (
                          <span className="px-2 py-1 bg-yellow-500/10 border border-yellow-500/30 rounded text-yellow-400 text-xs">
                            Override Active
                          </span>
                        )}
                      </div>

                      {daySlots.length === 0 ? (
                        <p className="text-cosmic-text/60 text-sm italic">No availability set</p>
                      ) : (
                        <div className="space-y-2">
                          {daySlots.map(slot => (
                            <div
                              key={slot.id}
                              className={`${getMobileRowClasses()} bg-cosmic-dark/30 rounded-lg p-3 flex items-center justify-between`}
                            >
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <Clock className="w-3 h-3 text-cosmic-accent" />
                                  <span className="text-sm font-medium text-cosmic-text">
                                    {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                                  </span>
                                </div>
                                
                                <div className="flex items-center gap-3 text-xs text-cosmic-text/60">
                                  {slot.emergency_available && (
                                    <div className="flex items-center gap-1">
                                      <AlertTriangle className="w-3 h-3 text-red-400" />
                                      <span>Emergency ({slot.emergency_response_time_minutes}min)</span>
                                    </div>
                                  )}
                                  
                                  {slot.auto_accept_bookings && (
                                    <div className="flex items-center gap-1">
                                      <CheckCircle className="w-3 h-3 text-green-400" />
                                      <span>Auto-accept</span>
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => setEditingSlot(slot)}
                                  className="p-1 text-cosmic-text/60 hover:text-cosmic-accent rounded transition-colors"
                                >
                                  <Edit3 className="w-3 h-3" />
                                </button>
                                
                                <button
                                  onClick={() => deleteScheduleSlot(slot.id)}
                                  className="p-1 text-cosmic-text/60 hover:text-red-400 rounded transition-colors"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'overrides' && (
            <OverridesTab 
              overrides={overrides}
              onCreateOverride={createOverride}
              onRefresh={fetchOverrides}
            />
          )}

          {activeTab === 'emergency' && (
            <EmergencyTab 
              notifications={emergencyNotifications}
              onRespond={respondToEmergency}
              onRefresh={fetchEmergencyNotifications}
            />
          )}
        </motion.div>
      </AnimatePresence>

      {/* Add/Edit Slot Modal */}
      <ScheduleSlotModal
        show={showAddSlot || editingSlot}
        editingSlot={editingSlot}
        daysOfWeek={daysOfWeek}
        onSave={(slotData) => {
          if (editingSlot) {
            updateScheduleSlot(editingSlot.id, slotData);
          } else {
            addScheduleSlot(slotData);
          }
        }}
        onClose={() => {
          setShowAddSlot(false);
          setEditingSlot(null);
        }}
      />
    </div>
  );
};

// Schedule Slot Modal Component
const ScheduleSlotModal = ({ show, editingSlot, daysOfWeek, onSave, onClose }) => {
  const [formData, setFormData] = useState({
    day_of_week: 1,
    start_time: '09:00',
    end_time: '17:00',
    emergency_available: false,
    emergency_response_time_minutes: 15,
    emergency_rate_multiplier: 1.5,
    auto_accept_bookings: false,
    max_concurrent_sessions: 1,
    break_between_sessions_minutes: 10,
    notes: ''
  });

  useEffect(() => {
    if (editingSlot) {
      setFormData({ ...editingSlot });
    }
  }, [editingSlot]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  if (!show) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-cosmic-dark border border-cosmic-accent/30 rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
      >
        <h3 className="text-xl font-bold text-cosmic-text mb-6">
          {editingSlot ? 'Edit Time Slot' : 'Add Time Slot'}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Day of Week */}
          <div>
            <label className="block text-sm font-medium text-cosmic-text mb-2">
              Day of Week
            </label>
            <select
              value={formData.day_of_week}
              onChange={(e) => setFormData(prev => ({ ...prev, day_of_week: parseInt(e.target.value) }))}
              className="w-full px-3 py-2 bg-cosmic-dark/50 border border-cosmic-accent/30 rounded-lg text-cosmic-text focus:border-cosmic-accent focus:outline-none"
            >
              {daysOfWeek.map(day => (
                <option key={day.value} value={day.value}>
                  {day.label}
                </option>
              ))}
            </select>
          </div>

          {/* Time Range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-cosmic-text mb-2">
                Start Time
              </label>
              <input
                type="time"
                value={formData.start_time}
                onChange={(e) => setFormData(prev => ({ ...prev, start_time: e.target.value }))}
                className="w-full px-3 py-2 bg-cosmic-dark/50 border border-cosmic-accent/30 rounded-lg text-cosmic-text focus:border-cosmic-accent focus:outline-none"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-cosmic-text mb-2">
                End Time
              </label>
              <input
                type="time"
                value={formData.end_time}
                onChange={(e) => setFormData(prev => ({ ...prev, end_time: e.target.value }))}
                className="w-full px-3 py-2 bg-cosmic-dark/50 border border-cosmic-accent/30 rounded-lg text-cosmic-text focus:border-cosmic-accent focus:outline-none"
                required
              />
            </div>
          </div>

          {/* Emergency Settings */}
          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.emergency_available}
                onChange={(e) => setFormData(prev => ({ ...prev, emergency_available: e.target.checked }))}
                className="w-4 h-4 text-cosmic-accent bg-cosmic-dark border-cosmic-accent/30 rounded focus:ring-cosmic-accent"
              />
              <span className="text-sm font-medium text-cosmic-text">
                Available for emergency calls
              </span>
            </label>
          </div>

          {formData.emergency_available && (
            <div className="grid grid-cols-2 gap-3 pl-6">
              <div>
                <label className="block text-sm font-medium text-cosmic-text mb-2">
                  Response Time (min)
                </label>
                <input
                  type="number"
                  value={formData.emergency_response_time_minutes}
                  onChange={(e) => setFormData(prev => ({ ...prev, emergency_response_time_minutes: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 bg-cosmic-dark/50 border border-cosmic-accent/30 rounded-lg text-cosmic-text focus:border-cosmic-accent focus:outline-none"
                  min="5"
                  max="60"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-cosmic-text mb-2">
                  Rate Multiplier
                </label>
                <input
                  type="number"
                  value={formData.emergency_rate_multiplier}
                  onChange={(e) => setFormData(prev => ({ ...prev, emergency_rate_multiplier: parseFloat(e.target.value) }))}
                  className="w-full px-3 py-2 bg-cosmic-dark/50 border border-cosmic-accent/30 rounded-lg text-cosmic-text focus:border-cosmic-accent focus:outline-none"
                  min="1.0"
                  max="5.0"
                  step="0.1"
                />
              </div>
            </div>
          )}

          {/* Auto-accept */}
          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.auto_accept_bookings}
                onChange={(e) => setFormData(prev => ({ ...prev, auto_accept_bookings: e.target.checked }))}
                className="w-4 h-4 text-cosmic-accent bg-cosmic-dark border-cosmic-accent/30 rounded focus:ring-cosmic-accent"
              />
              <span className="text-sm font-medium text-cosmic-text">
                Auto-accept bookings
              </span>
            </label>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-cosmic-text mb-2">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              className="w-full px-3 py-2 bg-cosmic-dark/50 border border-cosmic-accent/30 rounded-lg text-cosmic-text placeholder-cosmic-text/50 focus:border-cosmic-accent focus:outline-none resize-none"
              placeholder="Optional notes..."
              rows="2"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-cosmic-panel/20 hover:bg-cosmic-panel/30 border border-cosmic-accent/30 rounded-lg text-cosmic-text transition-colors"
            >
              Cancel
            </button>
            
            <button
              type="submit"
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-cosmic-accent hover:bg-cosmic-accent/80 rounded-lg text-white font-medium transition-colors"
            >
              <Save className="w-4 h-4" />
              Save
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

// Overrides Tab Component (placeholder)
const OverridesTab = ({ overrides, onCreateOverride, onRefresh }) => {
  return (
    <div className="text-center py-8">
      <Calendar className="w-12 h-12 text-cosmic-text/30 mx-auto mb-4" />
      <p className="text-cosmic-text/60">Overrides management coming soon</p>
    </div>
  );
};

// Emergency Tab Component (placeholder)  
const EmergencyTab = ({ notifications, onRespond, onRefresh }) => {
  return (
    <div className="text-center py-8">
      <Bell className="w-12 h-12 text-cosmic-text/30 mx-auto mb-4" />
      <p className="text-cosmic-text/60">Emergency notifications will appear here</p>
    </div>
  );
};

export default AvailabilityManager;