import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Crown, User, DollarSign, AlertCircle, CheckCircle, ArrowRight, ArrowLeft } from 'lucide-react';
import { toast } from 'react-hot-toast';

const ServiceBooking = () => {
  const [services, setServices] = useState([]);
  const [selectedService, setSelectedService] = useState(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1: Select Service, 2: Select Date/Time, 3: Confirm
  const [bookingValidation, setBookingValidation] = useState(null);

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/services');
      const data = await response.json();
      
      if (data.success) {
        setServices(data.data);
      } else {
        toast.error('فشل في تحميل الخدمات');
      }
    } catch (error) {
      console.error('Error fetching services:', error);
      toast.error('خطأ في تحميل الخدمات');
    } finally {
      setLoading(false);
    }
  };

  const validateBookingTime = async (serviceId, appointmentTime) => {
    try {
      const response = await fetch('/api/bookings/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          service_id: serviceId,
          appointment_time: appointmentTime
        })
      });

      const data = await response.json();
      setBookingValidation(data);
      return data.is_valid;
    } catch (error) {
      console.error('Error validating booking:', error);
      toast.error('خطأ في التحقق من صحة الحجز');
      return false;
    }
  };

  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 9; hour <= 21; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        slots.push(timeString);
      }
    }
    return slots;
  };

  const getMinimumDate = (service) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    if (service.is_vip) {
      // VIP: Can book today if >= 2 hours from now
      return today.toISOString().split('T')[0];
    } else {
      // Regular: Can only book starting day after tomorrow
      const dayAfterTomorrow = new Date(today);
      dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
      return dayAfterTomorrow.toISOString().split('T')[0];
    }
  };

  const isTimeSlotValid = (service, date, time) => {
    const now = new Date();
    const appointmentDateTime = new Date(`${date}T${time}`);
    const hoursDiff = (appointmentDateTime - now) / (1000 * 60 * 60);

    if (service.is_vip) {
      // VIP: Minimum 2 hours notice
      return hoursDiff >= 2;
    } else {
      // Regular: Minimum 48 hours notice
      return hoursDiff >= 48;
    }
  };

  const handleServiceSelect = (service) => {
    setSelectedService(service);
    setStep(2);
    setSelectedDate('');
    setSelectedTime('');
    setBookingValidation(null);
  };

  const handleDateTimeSelect = async () => {
    if (!selectedDate || !selectedTime) {
      toast.error('يرجى اختيار التاريخ والوقت');
      return;
    }

    const appointmentDateTime = new Date(`${selectedDate}T${selectedTime}`);
    const isValid = await validateBookingTime(selectedService.id, appointmentDateTime.toISOString());
    
    if (isValid) {
      setStep(3);
    } else {
      // Validation message will be shown from the validation response
    }
  };

  const handleBookingConfirm = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          service_id: selectedService.id,
          appointment_time: new Date(`${selectedDate}T${selectedTime}`).toISOString()
        })
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success('تم حجز الموعد بنجاح!');
        // Reset form
        setSelectedService(null);
        setSelectedDate('');
        setSelectedTime('');
        setStep(1);
        setBookingValidation(null);
      } else {
        toast.error(data.error || 'فشل في حجز الموعد');
      }
    } catch (error) {
      console.error('Error creating booking:', error);
      toast.error('خطأ في إنشاء الحجز');
    } finally {
      setLoading(false);
    }
  };

  const resetBooking = () => {
    setSelectedService(null);
    setSelectedDate('');
    setSelectedTime('');
    setStep(1);
    setBookingValidation(null);
  };

  if (loading && step === 1) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">حجز الخدمات</h1>
        <p className="text-gray-600">اختر الخدمة والموعد المناسب لك</p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-center space-x-8 mb-8">
        <div className={`flex items-center ${step >= 1 ? 'text-purple-600' : 'text-gray-400'}`}>
          <div className={`rounded-full w-8 h-8 flex items-center justify-center ${
            step >= 1 ? 'bg-purple-600 text-white' : 'bg-gray-200'
          }`}>
            1
          </div>
          <span className="mr-2 text-sm">اختيار الخدمة</span>
        </div>
        
        <ArrowLeft className="text-gray-400" size={20} />
        
        <div className={`flex items-center ${step >= 2 ? 'text-purple-600' : 'text-gray-400'}`}>
          <div className={`rounded-full w-8 h-8 flex items-center justify-center ${
            step >= 2 ? 'bg-purple-600 text-white' : 'bg-gray-200'
          }`}>
            2
          </div>
          <span className="mr-2 text-sm">التاريخ والوقت</span>
        </div>
        
        <ArrowLeft className="text-gray-400" size={20} />
        
        <div className={`flex items-center ${step >= 3 ? 'text-purple-600' : 'text-gray-400'}`}>
          <div className={`rounded-full w-8 h-8 flex items-center justify-center ${
            step >= 3 ? 'bg-purple-600 text-white' : 'bg-gray-200'
          }`}>
            3
          </div>
          <span className="mr-2 text-sm">التأكيد</span>
        </div>
      </div>

      {/* Step 1: Service Selection */}
      {step === 1 && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">اختر الخدمة</h2>
          
          {/* VIP Services */}
          <div className="mb-8">
            <h3 className="text-lg font-medium text-yellow-600 mb-4 flex items-center">
              <Crown className="ml-2" size={20} />
              خدمات VIP
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {services.filter(s => s.is_vip).map((service) => (
                <div
                  key={service.id}
                  onClick={() => handleServiceSelect(service)}
                  className="border-2 rounded-xl p-4 cursor-pointer transition-all duration-200 border-yellow-200 hover:border-yellow-400 hover:bg-yellow-50"
                >
                  <div className="flex items-start justify-between mb-3">
                    <Crown className="text-yellow-500" size={18} />
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                      VIP
                    </span>
                  </div>
                  
                  <h3 className="font-semibold text-gray-900 mb-2">{service.name_ar}</h3>
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">{service.description_ar}</p>
                  
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <User size={14} />
                      <span>{service.reader_name || 'غير محدد'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock size={14} />
                      <span>{service.duration_minutes} دقيقة</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <DollarSign size={14} />
                      <span>${service.price}</span>
                    </div>
                  </div>
                  
                  <div className="mt-3 text-xs text-yellow-700 bg-yellow-50 p-2 rounded">
                    يمكن حجزها اليوم أو غداً (إشعار مسبق ساعتين)
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Regular Services */}
          <div>
            <h3 className="text-lg font-medium text-blue-600 mb-4 flex items-center">
              <Clock className="ml-2" size={20} />
              الخدمات العادية
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {services.filter(s => !s.is_vip).map((service) => (
                <div
                  key={service.id}
                  onClick={() => handleServiceSelect(service)}
                  className="border-2 rounded-xl p-4 cursor-pointer transition-all duration-200 border-blue-200 hover:border-blue-400 hover:bg-blue-50"
                >
                  <div className="flex items-start justify-between mb-3">
                    <Clock className="text-blue-500" size={18} />
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                      عادية
                    </span>
                  </div>
                  
                  <h3 className="font-semibold text-gray-900 mb-2">{service.name_ar}</h3>
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">{service.description_ar}</p>
                  
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <User size={14} />
                      <span>{service.reader_name || 'غير محدد'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock size={14} />
                      <span>{service.duration_minutes} دقيقة</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <DollarSign size={14} />
                      <span>${service.price}</span>
                    </div>
                  </div>
                  
                  <div className="mt-3 text-xs text-blue-700 bg-blue-50 p-2 rounded">
                    يمكن حجزها بدءاً من بعد الغد (إشعار مسبق 48 ساعة)
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Date & Time Selection */}
      {step === 2 && selectedService && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">اختيار التاريخ والوقت</h2>
            <button
              onClick={() => setStep(1)}
              className="text-purple-600 hover:text-purple-800 flex items-center gap-2"
            >
              <ArrowRight size={16} />
              العودة لاختيار الخدمة
            </button>
          </div>

          {/* Selected Service Summary */}
          <div className={`p-4 rounded-lg mb-6 ${
            selectedService.is_vip ? 'bg-yellow-50 border border-yellow-200' : 'bg-blue-50 border border-blue-200'
          }`}>
            <div className="flex items-center gap-3">
              {selectedService.is_vip ? (
                <Crown className="text-yellow-500" size={20} />
              ) : (
                <Clock className="text-blue-500" size={20} />
              )}
              <div>
                <h3 className="font-semibold text-gray-900">{selectedService.name_ar}</h3>
                <p className="text-sm text-gray-600">
                  {selectedService.duration_minutes} دقيقة - ${selectedService.price}
                </p>
              </div>
            </div>
          </div>

          {/* Date Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                التاريخ
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                min={getMinimumDate(selectedService)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                {selectedService.is_vip 
                  ? 'يمكن الحجز من اليوم (بحد أدنى ساعتين مسبقاً)' 
                  : 'يمكن الحجز بدءاً من بعد الغد'
                }
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                الوقت
              </label>
              <select
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                disabled={!selectedDate}
              >
                <option value="">اختر الوقت</option>
                {generateTimeSlots().map((time) => {
                  const isValid = selectedDate ? isTimeSlotValid(selectedService, selectedDate, time) : true;
                  return (
                    <option 
                      key={time} 
                      value={time} 
                      disabled={!isValid}
                      className={!isValid ? 'text-gray-400' : ''}
                    >
                      {time} {!isValid ? '(غير متاح)' : ''}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          {/* Validation Message */}
          {bookingValidation && !bookingValidation.is_valid && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <div className="flex items-center">
                <AlertCircle className="text-red-500 ml-2" size={16} />
                <span className="text-sm text-red-800 font-medium">خطأ في الحجز:</span>
              </div>
              <p className="text-sm text-red-700 mt-1">{bookingValidation.error_message}</p>
            </div>
          )}

          {/* Continue Button */}
          <div className="flex justify-end mt-6">
            <button
              onClick={handleDateTimeSelect}
              disabled={!selectedDate || !selectedTime || loading}
              className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <>
                  متابعة
                  <ArrowLeft size={16} />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Confirmation */}
      {step === 3 && selectedService && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">تأكيد الحجز</h2>
            <button
              onClick={() => setStep(2)}
              className="text-purple-600 hover:text-purple-800 flex items-center gap-2"
            >
              <ArrowRight size={16} />
              تعديل التاريخ والوقت
            </button>
          </div>

          {/* Booking Summary */}
          <div className="space-y-4">
            <div className={`p-6 rounded-lg ${
              selectedService.is_vip ? 'bg-yellow-50 border border-yellow-200' : 'bg-blue-50 border border-blue-200'
            }`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  {selectedService.is_vip ? (
                    <Crown className="text-yellow-500" size={24} />
                  ) : (
                    <Clock className="text-blue-500" size={24} />
                  )}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{selectedService.name_ar}</h3>
                    <p className="text-sm text-gray-600">{selectedService.name_en}</p>
                  </div>
                </div>
                <span className={`px-3 py-1 text-sm font-medium rounded-full ${
                  selectedService.is_vip 
                    ? 'bg-yellow-100 text-yellow-800' 
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  {selectedService.is_vip ? 'VIP' : 'عادية'}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <User size={16} className="text-gray-500" />
                  <span><strong>القارئ:</strong> {selectedService.reader_name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock size={16} className="text-gray-500" />
                  <span><strong>المدة:</strong> {selectedService.duration_minutes} دقيقة</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar size={16} className="text-gray-500" />
                  <span><strong>التاريخ:</strong> {selectedDate}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock size={16} className="text-gray-500" />
                  <span><strong>الوقت:</strong> {selectedTime}</span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-semibold text-gray-900">المجموع:</span>
                  <span className="text-2xl font-bold text-purple-600">${selectedService.price}</span>
                </div>
              </div>
            </div>

            {/* Validation Success */}
            {bookingValidation && bookingValidation.is_valid && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-md">
                <div className="flex items-center">
                  <CheckCircle className="text-green-500 ml-2" size={16} />
                  <span className="text-sm text-green-800 font-medium">الحجز متاح!</span>
                </div>
                <p className="text-sm text-green-700 mt-1">
                  يمكنك المتابعة لتأكيد الحجز
                </p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between mt-8">
            <button
              onClick={resetBooking}
              className="px-6 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
            >
              إلغاء
            </button>
            <button
              onClick={handleBookingConfirm}
              disabled={loading}
              className="bg-purple-600 text-white px-8 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <>
                  <CheckCircle size={16} />
                  تأكيد الحجز
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServiceBooking;
