// Example API Integration - Shows how existing components use the service layer
// This file demonstrates proper integration patterns without theme changes

import React, { useState } from 'react';
import { api, handleApiError } from '../../services/api';
import CosmicButton from './CosmicButton';

// Example: Order creation component using existing theme
const OrderCreationExample = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleCreateOrder = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await api.orders.createOrder({
        service_code: 'tarot',
        question_text: 'Sample question',
        is_gold: false
      });
      
      console.log('Order created:', result);
      // Handle success (would integrate with existing notification system)
      
    } catch (err) {
      const errorInfo = handleApiError(err);
      setError(errorInfo);
      
      // Handle specific error types
      if (errorInfo.type === 'profile_incomplete') {
        // Redirect to profile completion (use existing flow)
        console.log('Redirect to profile completion');
      } else if (errorInfo.type === 'rate_limit') {
        // Show rate limit message
        console.log('Rate limited:', errorInfo.message);
      } else if (errorInfo.type === 'service_unavailable') {
        // Show service unavailable banner
        console.log('Service unavailable:', errorInfo.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
          {error.message}
        </div>
      )}
      
      <CosmicButton 
        variant="primary" 
        loading={loading}
        onClick={handleCreateOrder}
      >
        Create Order
      </CosmicButton>
    </div>
  );
};

// Example: Horoscope fetching using existing theme
const HoroscopeExample = () => {
  const [horoscope, setHoroscope] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchHoroscope = async (zodiac) => {
    setLoading(true);
    try {
      const result = await api.horoscopes.daily({ 
        zodiac,
        country: 'US' // Would get from user profile
      });
      setHoroscope(result);
    } catch (err) {
      const errorInfo = handleApiError(err);
      console.error('Horoscope fetch failed:', errorInfo);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <CosmicButton 
        variant="cosmic"
        loading={loading}
        onClick={() => fetchHoroscope('Leo')}
      >
        Get Daily Horoscope
      </CosmicButton>
      
      {horoscope && (
        <div className="p-4 bg-white/10 backdrop-blur-md rounded-lg border border-white/20">
          <h3 className="text-lg font-semibold text-white mb-2">Your Horoscope</h3>
          <p className="text-gray-300">{horoscope.text_content}</p>
        </div>
      )}
    </div>
  );
};

// Example: Payment integration using existing theme  
const PaymentExample = ({ orderId }) => {
  const [paymentLoading, setPaymentLoading] = useState(false);

  const handlePayment = async () => {
    setPaymentLoading(true);
    try {
      const paymentIntent = await api.payments.createPaymentIntent({
        order_id: orderId,
        promo_code: 'NEWUSER' // Optional
      });
      
      // Redirect to payment provider or handle client_secret
      console.log('Payment intent created:', paymentIntent);
      
    } catch (err) {
      const errorInfo = handleApiError(err);
      if (errorInfo.type === 'service_unavailable') {
        console.log('Payment provider not configured');
      }
    } finally {
      setPaymentLoading(false);
    }
  };

  return (
    <CosmicButton 
      variant="success"
      loading={paymentLoading}
      onClick={handlePayment}
    >
      Process Payment
    </CosmicButton>
  );
};

// Example: Admin notification management
const NotificationAdminExample = () => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const result = await api.notifications.listTemplates();
      setTemplates(result.templates || []);
    } catch (err) {
      console.error('Failed to load templates:', handleApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const testNotification = async () => {
    try {
      await api.notifications.testNotification({
        email: 'test@example.com',
        phone: '+1234567890'
      });
      console.log('Test notification sent');
    } catch (err) {
      const errorInfo = handleApiError(err);
      console.error('Notification test failed:', errorInfo);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <CosmicButton 
          variant="outline"
          loading={loading}
          onClick={loadTemplates}
        >
          Load Templates
        </CosmicButton>
        
        <CosmicButton 
          variant="neon"
          onClick={testNotification}
        >
          Test Notification
        </CosmicButton>
      </div>
      
      {templates.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-white">Templates</h3>
          {templates.map((template, index) => (
            <div key={index} className="p-3 bg-white/5 rounded border border-white/10">
              <span className="text-gray-300">{template.code} ({template.channel})</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Role-specific dashboard integrations would follow this pattern:

// For Reader Dashboard:
export const ReaderDashboardIntegration = {
  // Orders assigned to reader
  getMyOrders: () => api.orders.listOrders({ mine: true }),
  
  // Start working on order
  startOrder: (orderId) => api.orders.startOrder(orderId),
  
  // Upload result media
  uploadResult: (file) => {
    const reader = new FileReader();
    return new Promise((resolve, reject) => {
      reader.onload = async () => {
        try {
          const base64 = reader.result.split(',')[1];
          const result = await api.media.uploadMedia({
            file_data: base64,
            content_type: file.type,
            filename: file.name
          });
          resolve(result);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  },
  
  // Submit order result
  submitResult: (orderId, mediaId) => api.orders.submitResult(orderId, { output_media_id: mediaId }),
  
  // AI assistance (internal only)
  getDraftSuggestions: (orderId) => api.assist.getDrafts(orderId),
  createDraft: (payload) => api.assist.assistDraft(payload),
};

// For Admin Dashboard:
export const AdminDashboardIntegration = {
  // View all orders
  getAllOrders: () => api.orders.listOrders(),
  
  // Assign readers
  assignReader: (orderId, readerId) => api.orders.assignReader(orderId, { reader_id: readerId }),
  
  // Approve/reject orders
  approveOrder: (orderId, note) => api.orders.approveOrder(orderId, { note }),
  rejectOrder: (orderId, note) => api.orders.rejectOrder(orderId, { note }),
  
  // Payment management
  processRefund: (orderData, amount, reason) => api.payments.refund({
    order_id: orderData.id,
    amount_cents: amount * 100,
    reason
  }),
  
  // Notification management
  createTemplate: (templateData) => api.notifications.upsertTemplate(templateData),
  
  // Operations
  getMetrics: () => api.ops.metrics(),
  exportData: (range, entities) => api.ops.exportZip(range, entities),
};

// For Monitor Dashboard:
export const MonitorDashboardIntegration = {
  // Get pending moderation items
  getPendingOrders: () => api.orders.listOrders().then(result => 
    result.orders.filter(order => order.status === 'awaiting_approval')
  ),
  
  // Approve/reject content
  approveOrder: (orderId) => api.orders.approveOrder(orderId),
  rejectOrder: (orderId, reason) => api.orders.rejectOrder(orderId, { note: reason }),
  
  // Call management
  terminateCall: (orderId, reason) => api.calls.terminateCall({ order_id: orderId, reason }),
  
  // Block/unblock users
  blockProfile: (profileId, reason) => api.moderation.blockProfile({ profile_id: profileId, reason }),
};

// For Client Dashboard:
export const ClientDashboardIntegration = {
  // Create new orders
  createOrder: (serviceCode, questionText, isGold = false) => api.orders.createOrder({
    service_code: serviceCode,
    question_text: questionText,
    is_gold: isGold
  }),
  
  // View my orders
  getMyOrders: () => api.orders.listOrders({ mine: true }),
  
  // Get daily horoscope
  getDailyHoroscope: (zodiac, country) => api.horoscopes.daily({ zodiac, country }),
  
  // Schedule calls
  scheduleCall: (serviceCode, scheduledAt, questionText) => api.calls.scheduleCall({
    service_code: serviceCode,
    scheduled_at: scheduledAt,
    question_text: questionText,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
  }),
  
  // Payment
  createPayment: (orderId, promoCode) => api.payments.createPaymentIntent({
    order_id: orderId,
    promo_code: promoCode
  }),
  
  // Get invoice
  getInvoice: (invoiceId) => api.payments.getInvoice(invoiceId),
};

// For SuperAdmin Dashboard:
export const SuperAdminDashboardIntegration = {
  // All admin functions plus:
  
  // System operations
  getSystemSnapshot: () => api.ops.snapshot(),
  getSystemMetrics: () => api.ops.metrics(),
  
  // Horoscope management
  regenerateHoroscope: (payload) => api.horoscopes.regenerate(payload),
  archiveOldHoroscopes: (days) => api.horoscopes.archive({ days }),
  
  // Bulk exports
  exportAllData: (range) => api.ops.exportZip(range, ['orders', 'users', 'payments', 'calls']),
  
  // Advanced moderation
  unblockProfile: (profileId) => api.moderation.unblockProfile(profileId),
};

// Export everything for use in actual dashboard components
export {
  OrderCreationExample,
  HoroscopeExample,
  PaymentExample,
  NotificationAdminExample
};