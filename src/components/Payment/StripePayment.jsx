import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  CardElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js';
import { useAuth } from '../../context/AuthContext.jsx';
import api from '../../services/frontendApi.js';

// Initialize Stripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

const CheckoutForm = ({ service, amount, onPaymentSuccess, onPaymentError, onBack, bookingId }) => {
  const stripe = useStripe();
  const elements = useElements();
  const { user, profile } = useAuth();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [clientSecret, setClientSecret] = useState('');

  useEffect(() => {
    // Create payment intent on component mount
    createPaymentIntent();
  }, []);

  const createPaymentIntent = async () => {
    try {
      // In a real app, you'd call your backend to create a payment intent
      // For now, we'll simulate this process
      const response = await fetch('/api/create-payment-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: Math.round(amount * 100), // Convert to cents
          currency: 'usd',
          metadata: {
            user_id: user.id,
            booking_id: bookingId,
            service_id: service.id
          }
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create payment intent');
      }

      const { client_secret } = await response.json();
      setClientSecret(client_secret);
    } catch (err) {
      setError('Failed to initialize payment. Please try again.');
      console.error('Payment intent creation failed:', err);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setProcessing(true);
    setError(null);

    const card = elements.getElement(CardElement);

    try {
      // Confirm payment with Stripe
      const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(
        clientSecret,
        {
          payment_method: {
            card: card,
            billing_details: {
              name: `${profile.first_name} ${profile.last_name}`,
              email: user.email,
              phone: profile.phone,
              address: {
                country: profile.country_code || 'US'
              }
            },
          }
        }
      );

      if (stripeError) {
        throw new Error(stripeError.message);
      }

      if (paymentIntent.status === 'succeeded') {
        // Create payment record in our database
        const paymentResult = await api.createPayment({
          booking_id: bookingId,
          user_id: user.id,
          amount: amount,
          method: 'stripe',
          transaction_id: paymentIntent.id,
          status: 'completed',
          metadata: {
            stripe_payment_intent: paymentIntent.id,
            stripe_payment_method: paymentIntent.payment_method
          }
        });

        if (paymentResult.success) {
          onPaymentSuccess({
            paymentId: paymentResult.data.id,
            transactionId: paymentIntent.id,
            amount: amount,
            method: 'stripe'
          });
        } else {
          throw new Error(paymentResult.error);
        }
      }
    } catch (err) {
      setError(err.message);
      onPaymentError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  const cardElementOptions = {
    style: {
      base: {
        fontSize: '16px',
        color: '#424770',
        '::placeholder': {
          color: '#aab7c4',
        },
        fontFamily: '"Helvetica Neue", Helvetica, sans-serif',
        fontSmoothing: 'antialiased',
      },
      invalid: {
        color: '#9e2146',
      },
    },
    hidePostalCode: true
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
          <p className="text-sm text-gray-500">Stripe Payment</p>
        </div>
      </div>

      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">Payment Details</h3>
        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="text-sm text-gray-600">Service: <span className="font-medium">{service?.name}</span></p>
          <p className="text-sm text-gray-600">Amount: <span className="font-medium">${amount} USD</span></p>
          <p className="text-sm text-gray-600">Processing Fee: <span className="font-medium">2.9% + $0.30</span></p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Card Information
          </label>
          <div className="border border-gray-300 rounded-lg p-4 bg-white">
            <CardElement options={cardElementOptions} />
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={!stripe || processing}
          className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
            processing
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
      </form>

      <div className="mt-6 text-center">
        <div className="flex items-center justify-center space-x-4 text-xs text-gray-500">
          <div className="flex items-center">
            <span className="mr-1">🔒</span>
            <span>Secured by Stripe</span>
          </div>
          <div className="flex items-center">
            <span className="mr-1">🛡️</span>
            <span>SSL Encrypted</span>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          Your payment information is secure and encrypted
        </p>
      </div>
    </div>
  );
};

const StripePayment = (props) => {
  return (
    <Elements stripe={stripePromise}>
      <CheckoutForm {...props} />
    </Elements>
  );
};

export default StripePayment; 