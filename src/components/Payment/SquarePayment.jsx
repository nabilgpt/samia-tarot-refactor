import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import api from '../../services/frontendApi.js';

const SquarePayment = ({ service, amount, onPaymentSuccess, onPaymentError, onBack, bookingId }) => {
  const { user, profile } = useAuth();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [squareLoaded, setSquareLoaded] = useState(false);
  const [paymentForm, setPaymentForm] = useState(null);

  useEffect(() => {
    loadSquareSDK();
  }, []);

  const loadSquareSDK = async () => {
    try {
      // Load Square Web Payments SDK
      if (!window.Square) {
        const script = document.createElement('script');
        script.src = 'https://sandbox.web.squarecdn.com/v1/square.js'; // Use production URL in production
        script.async = true;
        script.onload = initializeSquare;
        document.head.appendChild(script);
      } else {
        initializeSquare();
      }
    } catch (err) {
      setError('Failed to load payment system. Please refresh and try again.');
    }
  };

  const initializeSquare = async () => {
    try {
      const payments = window.Square.payments(
        import.meta.env.VITE_SQUARE_APPLICATION_ID,
        import.meta.env.VITE_SQUARE_LOCATION_ID
      );

      const card = await payments.card();
      await card.attach('#card-container');

      setPaymentForm({ payments, card });
      setSquareLoaded(true);
    } catch (err) {
      setError('Failed to initialize payment form. Please try again.');
      console.error('Square initialization error:', err);
    }
  };

  const handlePayment = async () => {
    if (!paymentForm) return;

    setProcessing(true);
    setError(null);

    try {
      const { payments, card } = paymentForm;

      // Tokenize the payment method
      const result = await card.tokenize();
      
      if (result.status === 'OK') {
        // Send payment token to your backend
        const paymentResponse = await fetch('/api/process-square-payment', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            source_id: result.token,
            amount_money: {
              amount: Math.round(amount * 100), // Convert to cents
              currency: 'USD'
            },
            idempotency_key: `${user.id}-${bookingId}-${Date.now()}`,
            metadata: {
              user_id: user.id,
              booking_id: bookingId,
              service_id: service.id
            }
          }),
        });

        if (!paymentResponse.ok) {
          throw new Error('Payment processing failed');
        }

        const paymentData = await paymentResponse.json();

        // Create payment record in our database
        const paymentResult = await api.createPayment({
          booking_id: bookingId,
          user_id: user.id,
          amount: amount,
          method: 'square',
          transaction_id: paymentData.payment.id,
          status: 'completed',
          metadata: {
            square_payment_id: paymentData.payment.id,
            square_receipt_number: paymentData.payment.receipt_number
          }
        });

        if (paymentResult.success) {
          onPaymentSuccess({
            paymentId: paymentResult.data.id,
            transactionId: paymentData.payment.id,
            amount: amount,
            method: 'square'
          });
        } else {
          throw new Error(paymentResult.error);
        }
      } else {
        throw new Error(result.errors?.[0]?.detail || 'Payment failed');
      }
    } catch (err) {
      setError(err.message);
      onPaymentError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={onBack}
          className="flex items-center text-gray-600 hover:text-gray-800"
        >
          <span className="mr-2">←</span>
          Back
        </button>
        <div className="text-right">
          <p className="text-2xl font-bold text-purple-600">${amount}</p>
          <p className="text-sm text-gray-500">Square Payment</p>
        </div>
      </div>

      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">Payment Details</h3>
        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="text-sm text-gray-600">Service: <span className="font-medium">{service?.name}</span></p>
          <p className="text-sm text-gray-600">Amount: <span className="font-medium">${amount} USD</span></p>
          <p className="text-sm text-gray-600">Processing Fee: <span className="font-medium">2.6% + $0.10</span></p>
        </div>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Card Information
        </label>
        <div 
          id="card-container" 
          className="border border-gray-300 rounded-lg p-4 bg-white min-h-[60px]"
        >
          {!squareLoaded && (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
              <span className="ml-2 text-gray-600">Loading payment form...</span>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      <button
        onClick={handlePayment}
        disabled={!squareLoaded || processing}
        className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
          processing || !squareLoaded
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-purple-600 hover:bg-purple-700 text-white'
        }`}
      >
        {processing ? (
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
            Processing...
          </div>
        ) : (
          `Pay $${amount} USD`
        )}
      </button>

      <div className="mt-6 text-center">
        <div className="flex items-center justify-center space-x-4 text-xs text-gray-500">
          <div className="flex items-center">
            <span className="mr-1">🟦</span>
            <span>Secured by Square</span>
          </div>
          <div className="flex items-center">
            <span className="mr-1">🛡️</span>
            <span>PCI Compliant</span>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          Your payment information is secure and encrypted
        </p>
      </div>
    </div>
  );
};

export default SquarePayment; 