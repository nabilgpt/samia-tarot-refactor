// ===============================================
// STRIPE CONFIGURATION SERVICE
// ===============================================

const Stripe = require('stripe');

// Initialize Stripe with secret key
const stripe = Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder');

// Stripe configuration
const stripeConfig = {
  publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || 'pk_test_placeholder',
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || 'whsec_your_webhook_secret_from_stripe_dashboard',
  webhookEndpoint: process.env.STRIPE_WEBHOOK_ENDPOINT || 'https://samiatarot.com/api/webhook/stripe'
};

// Validate Stripe configuration
const validateStripeConfig = () => {
  if (!process.env.STRIPE_SECRET_KEY) {
    console.warn('⚠️ STRIPE_SECRET_KEY not found in environment variables, using default test key');
  }
  
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    console.warn('⚠️ STRIPE_WEBHOOK_SECRET not found in environment variables');
  }
  
  console.log('✅ Stripe configuration loaded');
};

// Initialize validation
validateStripeConfig();

module.exports = {
  stripe,
  stripeConfig,
  validateStripeConfig
}; 