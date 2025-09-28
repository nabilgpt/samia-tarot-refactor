import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { CreditCard, Lock, Shield, ArrowLeft, AlertCircle, CheckCircle, Calendar, Clock, Phone, MessageSquare, User, Circle, AlertTriangle, Globe, BookOpen, Zap } from 'lucide-react';
import api from '../../lib/api';

const Checkout = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const shouldReduceMotion = useReducedMotion();

  const [services, setServices] = useState([]);
  const [readers, setReaders] = useState([]);
  const [onlineReaders, setOnlineReaders] = useState([]);

  const [selectedService, setSelectedService] = useState(null);
  const [selectedReader, setSelectedReader] = useState(null);
  const [mode, setMode] = useState('reading');
  const [flow, setFlow] = useState('scheduled');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [questions, setQuestions] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [consent18, setConsent18] = useState(false);
  const [notifChannel, setNotifChannel] = useState('email');

  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);

  const serviceParam = searchParams.get('service');
  const readerParam = searchParams.get('reader');

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedReader && date && flow === 'scheduled') {
      loadAvailability();
    }
  }, [selectedReader, date]);

  useEffect(() => {
    if (selectedReader) {
      const isOnline = onlineReaders.some(r => r.id === selectedReader);
      if (isOnline && flow === 'scheduled') {
        setFlow('instant');
      }
    }
  }, [selectedReader, onlineReaders]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [servicesData, readersData, onlineData] = await Promise.all([
        api.getServices(),
        api.getReaders(),
        api.getOnlineReaders()
      ]);

      setServices(servicesData);
      setReaders(readersData);
      setOnlineReaders(onlineData);

      if (serviceParam) {
        const svc = servicesData.find(s => s.id === serviceParam || s.code === serviceParam);
        if (svc) setSelectedService(svc.id);
      }

      if (readerParam) {
        const rdr = readersData.find(r => r.id === readerParam);
        if (rdr) {
          setSelectedReader(rdr.id);
          const isOnline = onlineData.some(o => o.id === rdr.id);
          if (isOnline) setFlow('instant');
        }
      }
    } catch (err) {
      setError('Failed to load checkout data');
    } finally {
      setLoading(false);
    }
  };

  const loadAvailability = async () => {
    if (!selectedReader || !date) return;
    try {
      const slots = await api.getAvailability(selectedReader, date);
      setAvailableSlots(slots.filter(s => s.status === 'free'));
    } catch (err) {
      console.error('Failed to load availability:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedService || !selectedReader || !consent18) {
      setError('Please fill in all required fields and accept terms');
      return;
    }

    if (flow === 'scheduled' && (!date || !time)) {
      setError('Please select date and time for scheduled session');
      return;
    }

    if (mode === 'calling' && !contactPhone) {
      setError('Phone number required for calling mode');
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      const service = services.find(s => s.id === selectedService);

      const orderPayload = {
        service_id: selectedService,
        reader_id: selectedReader,
        mode,
        flow,
        scheduled_at: flow === 'scheduled' ? `${date}T${time}:00` : null,
        questions: questions.trim() || null,
        contact_phone: contactPhone || null,
        notif_channel: notifChannel,
        timezone
      };

      if (flow === 'emergency') {
        const paymentIntent = await api.payments.createPaymentIntent({
          amount: service.base_price * 1.5,
          currency: 'USD',
          description: `Emergency Call - ${service.name}`
        });

        const call = await api.initiateCall({
          order_id: null,
          reader_id: selectedReader,
          emergency: 1
        });

        navigate(`/orders/${call.id}`);
      } else {
        const order = await api.createOrder(orderPayload);

        if (order && order.order_id) {
          await api.payments.createPaymentIntent({
            order_id: order.order_id,
            amount: service.base_price,
            currency: 'USD'
          });

          if (flow === 'instant' && mode === 'calling') {
            await api.initiateCall({
              order_id: order.order_id,
              reader_id: selectedReader,
              emergency: 0
            });
          }

          navigate(`/orders/${order.order_id}`);
        } else {
          throw new Error('Order creation failed');
        }
      }
    } catch (err) {
      setError(err.message || 'Checkout failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const service = services.find(s => s.id === selectedService);
  const reader = readers.find(r => r.id === selectedReader);
  const isReaderOnline = onlineReaders.some(r => r.id === selectedReader);

  const totalPrice = service ? (flow === 'emergency' ? service.base_price * 1.5 : service.base_price) : 0;

  if (loading) {
    return (
      <div className="container py-12">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-theme-cosmic/20 rounded w-1/3 mx-auto"></div>
          <div className="h-64 bg-theme-cosmic/20 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-12">
      <motion.div
        initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={shouldReduceMotion ? { duration: 0.3 } : { type: "spring", stiffness: 100, damping: 12 }}
      >
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold gradient-text mb-2">Complete Your Booking</h1>
          <p className="text-theme-secondary">Customize your mystical experience</p>
        </div>

        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">

              {!serviceParam && (
                <div className="card p-6">
                  <h2 className="text-xl font-bold text-theme-primary mb-4">Select Service</h2>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {services.map(svc => (
                      <label key={svc.id} className="cursor-pointer">
                        <input
                          type="radio"
                          name="service"
                          value={svc.id}
                          checked={selectedService === svc.id}
                          onChange={() => setSelectedService(svc.id)}
                          className="sr-only"
                        />
                        <div className={`p-4 rounded-lg border-2 transition-all ${
                          selectedService === svc.id
                            ? 'border-gold-primary bg-gold-primary/10'
                            : 'border-theme-cosmic hover:border-theme-cosmic/60'
                        }`}>
                          <h3 className="font-semibold text-theme-primary">{svc.name}</h3>
                          <p className="text-sm text-theme-secondary">${svc.base_price}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {!readerParam && (
                <div className="card p-6">
                  <h2 className="text-xl font-bold text-theme-primary mb-4">Select Reader</h2>
                  <div className="space-y-3">
                    {readers.map(rdr => {
                      const online = onlineReaders.some(o => o.id === rdr.id);
                      return (
                        <label key={rdr.id} className="cursor-pointer block">
                          <input
                            type="radio"
                            name="reader"
                            value={rdr.id}
                            checked={selectedReader === rdr.id}
                            onChange={() => setSelectedReader(rdr.id)}
                            className="sr-only"
                          />
                          <div className={`p-4 rounded-lg border-2 transition-all flex items-center gap-3 ${
                            selectedReader === rdr.id
                              ? 'border-gold-primary bg-gold-primary/10'
                              : 'border-theme-cosmic hover:border-theme-cosmic/60'
                          }`}>
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gold-primary to-purple-500 flex items-center justify-center">
                              <User className="w-6 h-6 text-theme-inverse" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-theme-primary">{rdr.firstName} {rdr.lastName}</h3>
                                {online && (
                                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/20">
                                    <Circle className="w-2 h-2 fill-green-500 text-green-500" />
                                    <span className="text-xs text-green-400">Online</span>
                                  </div>
                                )}
                              </div>
                              <p className="text-sm text-theme-secondary">{rdr.bio}</p>
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="card p-6">
                <h2 className="text-xl font-bold text-theme-primary mb-4">Session Details</h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-theme-secondary mb-2">Mode</label>
                    <div className="grid grid-cols-2 gap-3">
                      <label className="cursor-pointer">
                        <input
                          type="radio"
                          name="mode"
                          value="reading"
                          checked={mode === 'reading'}
                          onChange={(e) => setMode(e.target.value)}
                          className="sr-only"
                        />
                        <div className={`p-3 rounded-lg border-2 text-center ${
                          mode === 'reading' ? 'border-gold-primary bg-gold-primary/10' : 'border-theme-cosmic'
                        }`}>
                          <MessageSquare className="w-5 h-5 mx-auto mb-1" />
                          <span className="text-sm font-medium">Reading</span>
                        </div>
                      </label>
                      <label className="cursor-pointer">
                        <input
                          type="radio"
                          name="mode"
                          value="calling"
                          checked={mode === 'calling'}
                          onChange={(e) => setMode(e.target.value)}
                          className="sr-only"
                        />
                        <div className={`p-3 rounded-lg border-2 text-center ${
                          mode === 'calling' ? 'border-gold-primary bg-gold-primary/10' : 'border-theme-cosmic'
                        }`}>
                          <Phone className="w-5 h-5 mx-auto mb-1" />
                          <span className="text-sm font-medium">Calling</span>
                        </div>
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-theme-secondary mb-2">Flow</label>
                    <div className="grid grid-cols-3 gap-3">
                      <label className="cursor-pointer">
                        <input
                          type="radio"
                          name="flow"
                          value="scheduled"
                          checked={flow === 'scheduled'}
                          onChange={(e) => setFlow(e.target.value)}
                          className="sr-only"
                        />
                        <div className={`p-3 rounded-lg border-2 text-center ${
                          flow === 'scheduled' ? 'border-gold-primary bg-gold-primary/10' : 'border-theme-cosmic'
                        }`}>
                          <Calendar className="w-5 h-5 mx-auto mb-1" />
                          <span className="text-xs font-medium">Scheduled</span>
                        </div>
                      </label>
                      {isReaderOnline && (
                        <label className="cursor-pointer">
                          <input
                            type="radio"
                            name="flow"
                            value="instant"
                            checked={flow === 'instant'}
                            onChange={(e) => setFlow(e.target.value)}
                            className="sr-only"
                          />
                          <div className={`p-3 rounded-lg border-2 text-center ${
                            flow === 'instant' ? 'border-gold-primary bg-gold-primary/10' : 'border-theme-cosmic'
                          }`}>
                            <Clock className="w-5 h-5 mx-auto mb-1" />
                            <span className="text-xs font-medium">Instant</span>
                          </div>
                        </label>
                      )}
                      <label className="cursor-pointer">
                        <input
                          type="radio"
                          name="flow"
                          value="emergency"
                          checked={flow === 'emergency'}
                          onChange={(e) => setFlow(e.target.value)}
                          className="sr-only"
                        />
                        <div className={`p-3 rounded-lg border-2 text-center ${
                          flow === 'emergency' ? 'border-red-500 bg-red-500/10' : 'border-theme-cosmic'
                        }`}>
                          <AlertTriangle className="w-5 h-5 mx-auto mb-1" />
                          <span className="text-xs font-medium">Emergency</span>
                        </div>
                      </label>
                    </div>
                  </div>

                  {flow === 'scheduled' && (
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-theme-secondary mb-2">Date</label>
                        <input
                          type="date"
                          value={date}
                          onChange={(e) => setDate(e.target.value)}
                          className="w-full bg-theme-card border border-theme-cosmic rounded-lg p-3 text-theme-primary"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-theme-secondary mb-2">Time</label>
                        <select
                          value={time}
                          onChange={(e) => setTime(e.target.value)}
                          className="w-full bg-theme-card border border-theme-cosmic rounded-lg p-3 text-theme-primary"
                          required
                        >
                          <option value="">Select time</option>
                          {availableSlots.map(slot => (
                            <option key={slot.start_at} value={slot.start_at}>
                              {slot.start_at} - {slot.end_at}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}

                  {flow === 'emergency' && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                      <p className="text-red-400 text-sm">
                        <AlertTriangle className="w-4 h-4 inline mr-2" />
                        Emergency calls are 1.5x standard rate and require immediate pickup
                      </p>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-theme-secondary mb-2">Your Questions</label>
                    <textarea
                      value={questions}
                      onChange={(e) => setQuestions(e.target.value)}
                      placeholder="What would you like guidance on?"
                      className="w-full h-24 bg-theme-card border border-theme-cosmic rounded-lg p-3 text-theme-primary resize-none"
                      maxLength={500}
                    />
                    <p className="text-xs text-theme-muted mt-1">{questions.length}/500</p>
                  </div>

                  {mode === 'calling' && (
                    <div>
                      <label className="block text-sm font-medium text-theme-secondary mb-2">Contact Phone</label>
                      <input
                        type="tel"
                        value={contactPhone}
                        onChange={(e) => setContactPhone(e.target.value)}
                        placeholder="+1 (555) 123-4567"
                        className="w-full bg-theme-card border border-theme-cosmic rounded-lg p-3 text-theme-primary"
                        required
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-theme-secondary mb-2">Notification Channel</label>
                    <select
                      value={notifChannel}
                      onChange={(e) => setNotifChannel(e.target.value)}
                      className="w-full bg-theme-card border border-theme-cosmic rounded-lg p-3 text-theme-primary"
                    >
                      <option value="email">Email</option>
                      <option value="sms">SMS</option>
                      <option value="whatsapp">WhatsApp</option>
                    </select>
                  </div>

                  <label className="flex items-start cursor-pointer">
                    <input
                      type="checkbox"
                      checked={consent18}
                      onChange={(e) => setConsent18(e.target.checked)}
                      className="mt-1 mr-3"
                      required
                    />
                    <span className="text-sm text-theme-secondary">
                      I confirm that I am 18 years or older and agree to the <a href="/legal/terms" className="text-gold-primary hover:underline">Terms of Service</a>
                    </span>
                  </label>
                </div>
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex items-center">
                  <AlertCircle className="w-5 h-5 text-red-400 mr-3" />
                  <p className="text-red-400">{error}</p>
                </div>
              )}
            </div>

            <div className="lg:col-span-1">
              <div className="card p-6 sticky top-24">
                <h2 className="text-xl font-bold text-theme-primary mb-4">Order Summary</h2>

                {service && (
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-semibold text-theme-primary">{service.name}</h3>
                      <p className="text-sm text-theme-secondary">{service.description}</p>
                    </div>

                    {reader && (
                      <div className="flex items-center gap-3 p-3 bg-theme-cosmic/10 rounded-lg">
                        <User className="w-8 h-8" />
                        <div>
                          <p className="font-medium text-theme-primary">{reader.firstName} {reader.lastName}</p>
                          <p className="text-xs text-theme-secondary">{reader.bio}</p>
                        </div>
                      </div>
                    )}

                    <div className="border-t border-theme-cosmic pt-4 space-y-2">
                      <div className="flex justify-between">
                        <span className="text-theme-secondary">Service</span>
                        <span className="font-semibold">${service.base_price.toFixed(2)}</span>
                      </div>
                      {flow === 'emergency' && (
                        <div className="flex justify-between text-red-400">
                          <span>Emergency Fee (50%)</span>
                          <span className="font-semibold">+${(service.base_price * 0.5).toFixed(2)}</span>
                        </div>
                      )}
                    </div>

                    <div className="border-t border-theme-cosmic pt-4">
                      <div className="flex justify-between items-center">
                        <span className="text-lg font-bold">Total</span>
                        <span className="text-2xl font-bold gradient-text">${totalPrice.toFixed(2)}</span>
                      </div>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex items-center text-theme-secondary">
                        <Shield className="w-4 h-4 text-gold-primary mr-2" />
                        SSL Encrypted
                      </div>
                      <div className="flex items-center text-theme-secondary">
                        <Lock className="w-4 h-4 text-gold-primary mr-2" />
                        Private & Secure
                      </div>
                      <div className="flex items-center text-theme-secondary">
                        <CheckCircle className="w-4 h-4 text-gold-primary mr-2" />
                        Satisfaction Guaranteed
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={processing || !selectedService || !selectedReader || !consent18}
                      className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {processing ? (
                        <span className="flex items-center justify-center">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                          Processing...
                        </span>
                      ) : (
                        <span className="flex items-center justify-center">
                          <Lock className="w-4 h-4 mr-2" />
                          Complete ${totalPrice.toFixed(2)}
                        </span>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => navigate(-1)}
                      className="btn-secondary w-full"
                    >
                      <ArrowLeft className="w-4 h-4 mr-2 inline" />
                      Back
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default Checkout;