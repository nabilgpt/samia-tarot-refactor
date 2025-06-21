// ===============================================
// STRIPE FRONTEND UTILITY
// ===============================================

import { loadStripe } from '@stripe/stripe-js';

// Initialize Stripe with publishable key
// Using environment variable or fallback to provided key
const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 
  import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_placeholder';

// Load Stripe instance
export const stripePromise = loadStripe(stripePublishableKey);

// Stripe configuration
export const stripeConfig = {
  publishableKey: stripePublishableKey,
  appearance: {
    theme: 'stripe',
    variables: {
      colorPrimary: '#8B5CF6', // Purple theme matching SAMIA TAROT
      colorBackground: '#ffffff',
      colorText: '#1f2937',
      colorDanger: '#df1b41',
      fontFamily: 'system-ui, sans-serif',
      spacingUnit: '4px',
      borderRadius: '8px',
    },
  },
  loader: 'auto',
};

// Payment element options
export const paymentElementOptions = {
  layout: 'tabs',
  defaultValues: {
    billingDetails: {
      name: '',
      email: '',
    }
  }
};

// Helper function to create payment intent
export const createPaymentIntent = async (paymentData) => {
  try {
    const response = await fetch('/api/payments/create-payment-intent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
      },
      body: JSON.stringify(paymentData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to create payment intent');
    }

    return await response.json();
  } catch (error) {
    console.error('Error creating payment intent:', error);
    throw error;
  }
};

// Helper function to confirm payment
export const confirmPayment = async (stripe, elements, paymentIntentClientSecret, returnUrl) => {
  try {
    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      clientSecret: paymentIntentClientSecret,
      confirmParams: {
        return_url: returnUrl || window.location.origin + '/payment/success',
      },
    });

    if (error) {
      console.error('Payment confirmation error:', error);
      return { error, paymentIntent: null };
    }

    console.log('Payment confirmed successfully:', paymentIntent);
    return { error: null, paymentIntent };
  } catch (error) {
    console.error('Payment confirmation failed:', error);
    return { error, paymentIntent: null };
  }
};

// Helper function to handle payment method collection
export const setupPaymentMethod = async (stripe, elements) => {
  try {
    const { error, setupIntent } = await stripe.confirmSetup({
      elements,
      confirmParams: {
        return_url: window.location.origin + '/payment/setup-complete',
      },
    });

    if (error) {
      console.error('Setup payment method error:', error);
      return { error, setupIntent: null };
    }

    return { error: null, setupIntent };
  } catch (error) {
    console.error('Setup payment method failed:', error);
    return { error, setupIntent: null };
  }
};

// Format amount for Stripe (convert dollars to cents)
export const formatAmountForStripe = (amount, currency = 'USD') => {
  // Stripe expects amounts in cents for USD
  const multiplier = currency.toUpperCase() === 'USD' ? 100 : 1;
  return Math.round(amount * multiplier);
};

// Format amount for display (convert cents to dollars)
export const formatAmountFromStripe = (amount, currency = 'USD') => {
  const divisor = currency.toUpperCase() === 'USD' ? 100 : 1;
  return (amount / divisor).toFixed(2);
};

// Validate Stripe configuration
export const validateStripeConfig = () => {
  if (!stripePublishableKey) {
    console.error('❌ Stripe publishable key not found');
    return false;
  }

  if (!stripePublishableKey.startsWith('pk_')) {
    console.error('❌ Invalid Stripe publishable key format');
    return false;
  }

  console.log('✅ Stripe configuration validated');
  return true;
};

// Initialize validation
validateStripeConfig(); 