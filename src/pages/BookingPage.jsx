import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../services/frontendApi.js';
import { serviceHelpers, supabase } from '../lib/supabase.js';
import ServiceSelector from '../components/Booking/ServiceSelector.jsx';
import AnimatedBackground from '../components/UI/AnimatedBackground.jsx';

const BookingPage = () => {
  const { serviceId } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedService, setSelectedService] = useState(null);
  const [selectedReader, setSelectedReader] = useState(null);
  const [selectedDateTime, setSelectedDateTime] = useState(null);
  const [readers, setReaders] = useState([]);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isEmergency, setIsEmergency] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (serviceId) {
      loadServiceById(serviceId);
    }
  }, [serviceId, isAuthenticated]);

  useEffect(() => {
    if (selectedService) {
      loadReaders();
    }
  }, [selectedService]);

  useEffect(() => {
    if (selectedReader && selectedService && !isEmergency) {
      loadAvailableSlots();
    }
  }, [selectedReader, selectedService, isEmergency]);

  const loadServiceById = async (id) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('id', id)
        .eq('is_active', true)
        .single();

      if (error) throw error;
      if (data) {
        setSelectedService(data);
        setCurrentStep(2); // Skip service selection
      }
    } catch (error) {
      console.error('Error loading service:', error);
      setError('Service not found');
    } finally {
      setLoading(false);
    }
  };

  const loadReaders = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'reader')
        .eq('is_active', true);

      if (error) throw error;
      setReaders(data || []);
    } catch (error) {
      console.error('Error loading readers:', error);
      setError('Failed to load readers');
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableSlots = async () => {
    try {
      setLoading(true);
      // This would typically fetch from a schedule/availability table
      // For now, we'll generate mock available slots
      const slots = generateAvailableSlots();
      setAvailableSlots(slots);
    } catch (error) {
      console.error('Error loading available slots:', error);
      setError('Failed to load available times');
    } finally {
      setLoading(false);
    }
  };

  const generateAvailableSlots = () => {
    const slots = [];
    const now = new Date();
    const startDate = new Date(now);
    
    // VIP services can be booked same day, normal services need 2+ days
    if (selectedService.is_vip) {
      startDate.setHours(now.getHours() + 2); // 2 hours from now
    } else {
      startDate.setDate(now.getDate() + 2); // 2 days from now
      startDate.setHours(9, 0, 0, 0); // Start at 9 AM
    }

    // Generate slots for next 7 days
    for (let day = 0; day < 7; day++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + day);
      
      // Generate hourly slots from 9 AM to 9 PM
      for (let hour = 9; hour <= 21; hour++) {
        const slotTime = new Date(currentDate);
        slotTime.setHours(hour, 0, 0, 0);
        
        // Skip past times for today
        if (slotTime > now) {
          slots.push({
            id: `${day}-${hour}`,
            datetime: slotTime,
            available: Math.random() > 0.3 // 70% chance of being available
          });
        }
      }
    }

    return slots;
  };

  const handleServiceSelect = (service) => {
    setSelectedService(service);
    if (service) {
      setCurrentStep(2);
    }
  };

  const handleReaderSelect = (reader) => {
    setSelectedReader(reader);
    setCurrentStep(3);
  };

  const handleDateTimeSelect = (slot) => {
    setSelectedDateTime(slot);
    setCurrentStep(4);
  };

  const handleEmergencyCall = () => {
    setIsEmergency(true);
    setCurrentStep(4);
  };

  const handleBookingConfirm = async () => {
    try {
      setLoading(true);
      setError('');

      const bookingData = {
        user_id: user.id,
        service_id: selectedService.id,
        reader_id: selectedReader.id,
        scheduled_at: isEmergency ? null : selectedDateTime.datetime.toISOString(),
        status: 'pending',
        notes: isEmergency ? 'Emergency call booking' : ''
      };

      const result = await api.createBooking(bookingData);
      
      if (result.success) {
        // Redirect to payment or confirmation page
        navigate(`/booking/confirmation/${result.data.id}`);
      } else {
        setError(result.error || 'Failed to create booking');
      }
    } catch (error) {
      console.error('Error creating booking:', error);
      setError('Failed to create booking');
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case 1: return 'Choose Service';
      case 2: return 'Select Reader';
      case 3: return 'Pick Date & Time';
      case 4: return 'Confirm Booking';
      default: return 'Book Service';
    }
  };

  if (loading && currentStep === 1) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <AnimatedBackground variant="default" intensity="normal">
      <div className="py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Progress Steps */}
          <div className="mb-8">
            <div className="flex items-center justify-center">
              {[1, 2, 3, 4].map((step) => (
                <div key={step} className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step <= currentStep 
                      ? 'bg-gradient-to-r from-gold-500 to-gold-600 text-dark-900 shadow-lg' 
                      : 'bg-dark-600/50 text-gray-400 border border-gray-500/30'
                  }`}>
                    {step}
                  </div>
                  {step < 4 && (
                    <div className={`w-16 h-1 mx-2 rounded-full ${
                      step < currentStep ? 'bg-gradient-to-r from-gold-500 to-gold-600' : 'bg-gray-500/30'
                    }`} />
                  )}
                </div>
              ))}
            </div>
            <div className="text-center mt-4">
              <h1 className="text-2xl font-bold gradient-text">{getStepTitle()}</h1>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-900/30 border border-red-400/30 rounded-lg backdrop-blur-xl">
              <p className="text-red-300">{error}</p>
            </div>
          )}

          {/* Step Content */}
          <div className="bg-dark-800/50 backdrop-blur-xl border border-gold-400/20 rounded-2xl p-6 shadow-2xl shadow-cosmic-500/10">
            {/* Step 1: Service Selection */}
            {currentStep === 1 && (
              <ServiceSelector
                onServiceSelect={handleServiceSelect}
                selectedService={selectedService}
              />
            )}

            {/* Step 2: Reader Selection */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-white mb-2">Choose Your Reader</h2>
                  <p className="text-gray-300">Select a spiritual guide for your {selectedService?.name}</p>
                </div>

                {readers.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {readers.map((reader) => (
                      <div
                        key={reader.id}
                        onClick={() => handleReaderSelect(reader)}
                        className={`p-6 border-2 rounded-lg cursor-pointer transition-all duration-200 hover:shadow-lg backdrop-blur-xl ${
                          selectedReader?.id === reader.id
                            ? 'border-gold-400 bg-gold-400/10 shadow-lg shadow-gold-500/20'
                            : 'border-gray-500/30 bg-dark-700/30 hover:border-gold-400/50 hover:bg-gold-400/5'
                        }`}
                      >
                        <div className="text-center">
                          <div className="w-16 h-16 bg-gradient-to-br from-gold-500 to-gold-600 rounded-full flex items-center justify-center text-dark-900 text-xl font-bold mx-auto mb-4 shadow-lg">
                            {reader.first_name?.[0]}{reader.last_name?.[0]}
                          </div>
                          <h3 className="text-lg font-semibold text-white mb-2">
                            {reader.first_name} {reader.last_name}
                          </h3>
                          <p className="text-sm text-gold-300 mb-3">{reader.zodiac}</p>
                          <p className="text-sm text-gray-400">{reader.country}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <span className="text-6xl mb-4 block">👥</span>
                    <h3 className="text-lg font-medium text-white mb-2">No readers available</h3>
                    <p className="text-gray-400">Please try again later</p>
                  </div>
                )}

                {/* Emergency Call Option */}
                <div className="mt-8 p-6 bg-red-900/20 border border-red-400/30 rounded-lg backdrop-blur-xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-red-300 mb-2">🚨 Emergency Call</h3>
                      <p className="text-red-200">
                        Need immediate guidance? Skip scheduling and call now for urgent spiritual support.
                      </p>
                    </div>
                    <button
                      onClick={handleEmergencyCall}
                      className="px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold rounded-lg shadow-lg shadow-red-500/30 transition-all duration-200 transform hover:scale-105"
                    >
                      Emergency Call
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Date & Time Selection */}
            {currentStep === 3 && !isEmergency && (
              <div className="space-y-6">
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-white mb-2">Select Date & Time</h2>
                  <p className="text-gray-300">Choose when you&apos;d like your session with {selectedReader?.first_name}</p>
                </div>

                {availableSlots.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {availableSlots.filter(slot => slot.available).map((slot) => (
                      <button
                        key={slot.id}
                        onClick={() => handleDateTimeSelect(slot)}
                        className={`p-4 border-2 rounded-lg text-left transition-all duration-200 hover:shadow-md backdrop-blur-xl ${
                          selectedDateTime?.id === slot.id
                            ? 'border-gold-400 bg-gold-400/10 shadow-lg shadow-gold-500/20'
                            : 'border-gray-500/30 bg-dark-700/30 hover:border-gold-400/50 hover:bg-gold-400/5'
                        }`}
                      >
                        <div className="text-sm font-medium text-gray-300">
                          {slot.datetime.toLocaleDateString('en-US', { 
                            weekday: 'short', 
                            month: 'short', 
                            day: 'numeric' 
                          })}
                        </div>
                        <div className="text-lg font-bold text-gold-400">
                          {slot.datetime.toLocaleTimeString('en-US', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <span className="text-6xl mb-4 block">📅</span>
                    <h3 className="text-lg font-medium text-white mb-2">No available slots</h3>
                    <p className="text-gray-400">Please try selecting a different reader</p>
                  </div>
                )}
              </div>
            )}

            {/* Step 4: Confirmation */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-white mb-2">Confirm Your Booking</h2>
                  <p className="text-gray-300">Review your selection before proceeding to payment</p>
                </div>

                <div className="bg-dark-700/30 backdrop-blur-xl border border-gold-400/20 rounded-lg p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="font-semibold text-white mb-3">Service Details</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Service:</span>
                          <span className="font-medium text-white">{selectedService?.name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Duration:</span>
                          <span className="font-medium text-white">{selectedService?.duration_minutes} minutes</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Price:</span>
                          <span className="font-medium text-gold-400">${selectedService?.price}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Type:</span>
                          <span className="font-medium text-white">
                            {isEmergency ? 'Emergency Call' : 'Scheduled Session'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-semibold text-white mb-3">Session Details</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Reader:</span>
                          <span className="font-medium text-white">
                            {selectedReader?.first_name} {selectedReader?.last_name}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Date & Time:</span>
                          <span className="font-medium text-white">
                            {isEmergency 
                              ? 'Immediate (Emergency)'
                              : selectedDateTime ? formatDateTime(selectedDateTime.datetime) : 'Not selected'
                            }
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between">
                  <button
                    onClick={() => setCurrentStep(currentStep - 1)}
                    className="px-6 py-3 border border-gold-400/30 text-gold-400 rounded-lg hover:bg-gold-400/10 transition-all duration-200"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleBookingConfirm}
                    disabled={loading}
                    className="px-8 py-3 bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-600 hover:to-gold-700 text-dark-900 font-bold rounded-lg shadow-lg shadow-gold-500/30 transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:transform-none"
                  >
                    {loading ? 'Creating Booking...' : 'Proceed to Payment'}
                  </button>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            {currentStep > 1 && currentStep < 4 && (
              <div className="flex justify-between mt-8">
                <button
                  onClick={() => setCurrentStep(currentStep - 1)}
                  className="px-6 py-3 border border-gold-400/30 text-gold-400 rounded-lg hover:bg-gold-400/10 transition-all duration-200"
                >
                  Back
                </button>
                <button
                  onClick={() => setCurrentStep(currentStep + 1)}
                  disabled={
                    (currentStep === 2 && !selectedReader) ||
                    (currentStep === 3 && !selectedDateTime && !isEmergency)
                  }
                  className="px-6 py-3 bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-600 hover:to-gold-700 text-dark-900 font-bold rounded-lg shadow-lg shadow-gold-500/30 transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:transform-none"
                >
                  Continue
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </AnimatedBackground>
  );
};

export default BookingPage; 