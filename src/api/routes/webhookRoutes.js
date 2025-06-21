// ===============================================
// WEBHOOK HANDLERS API ROUTES
// ===============================================

const express = require('express');
const { stripe, stripeConfig } = require('../config/stripe');
const { supabase } = require('../lib/supabase');
const router = express.Router();

// ===============================================
// STRIPE WEBHOOK HANDLER
// ===============================================

// Stripe webhook endpoint
router.post('/stripe', 
  express.raw({ type: 'application/json' }), 
  async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const endpointSecret = stripeConfig.webhookSecret;

    let event;

    try {
      // Verify webhook signature
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
      console.log('✅ Stripe webhook signature verified');
    } catch (err) {
      console.error('⚠️ Webhook signature verification failed:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    try {
      // Handle the event
      switch (event.type) {
        case 'payment_intent.succeeded':
          await handlePaymentIntentSucceeded(event.data.object);
          break;
        
        case 'payment_intent.payment_failed':
          await handlePaymentIntentFailed(event.data.object);
          break;
        
        case 'payment_intent.canceled':
          await handlePaymentIntentCanceled(event.data.object);
          break;
        
        case 'charge.dispute.created':
          await handleChargeDisputeCreated(event.data.object);
          break;
        
        case 'invoice.payment_succeeded':
          await handleInvoicePaymentSucceeded(event.data.object);
          break;
        
        case 'customer.subscription.updated':
          await handleSubscriptionUpdated(event.data.object);
          break;
        
        default:
          console.log(`Unhandled event type: ${event.type}`);
      }

      res.json({ received: true });

    } catch (error) {
      console.error('Error processing webhook:', error);
      res.status(500).json({
        error: 'Webhook processing failed',
        details: error.message
      });
    }
  }
);

// ===============================================
// WEBHOOK EVENT HANDLERS
// ===============================================

// Handle successful payment
async function handlePaymentIntentSucceeded(paymentIntent) {
  try {
    console.log('💰 Payment succeeded:', paymentIntent.id);

    // Update payment status in database
    const { data: payment, error: updateError } = await supabase
      .from('payments')
      .update({
        status: 'completed',
        transaction_hash: paymentIntent.charges?.data?.[0]?.id || null,
        completed_at: new Date().toISOString(),
        metadata: {
          ...paymentIntent.metadata,
          stripe_payment_intent_id: paymentIntent.id,
          amount_received: paymentIntent.amount_received,
          charges: paymentIntent.charges?.data || []
        }
      })
      .eq('transaction_id', paymentIntent.id)
      .select('*')
      .single();

    if (updateError) {
      console.error('Error updating payment status:', updateError);
      return;
    }

    if (!payment) {
      console.warn('Payment record not found for Stripe payment intent:', paymentIntent.id);
      return;
    }

    // Update booking status if payment is for a booking
    if (payment.booking_id) {
      await supabase
        .from('bookings')
        .update({
          payment_status: 'paid',
          status: 'confirmed'
        })
        .eq('id', payment.booking_id);

      console.log('✅ Booking payment status updated:', payment.booking_id);
    }

    // Add to wallet if it's a wallet top-up
    if (paymentIntent.metadata?.purpose === 'wallet_topup') {
      await supabase.rpc('add_wallet_funds', {
        p_user_id: payment.user_id,
        p_amount: payment.amount,
        p_transaction_id: payment.id,
        p_description: 'Stripe wallet top-up'
      });

      console.log('✅ Wallet funds added for user:', payment.user_id);
    }

    // Send notification to user
    await createNotification({
      user_id: payment.user_id,
      type: 'payment_success',
      title: 'Payment Successful',
      message: `Your payment of $${payment.amount} has been processed successfully.`,
      metadata: {
        payment_id: payment.id,
        amount: payment.amount,
        currency: payment.currency
      }
    });

    console.log('✅ Payment processing completed for:', paymentIntent.id);

  } catch (error) {
    console.error('Error handling payment success:', error);
  }
}

// Handle failed payment
async function handlePaymentIntentFailed(paymentIntent) {
  try {
    console.log('❌ Payment failed:', paymentIntent.id);

    // Update payment status in database
    await supabase
      .from('payments')
      .update({
        status: 'failed',
        failed_at: new Date().toISOString(),
        metadata: {
          ...paymentIntent.metadata,
          failure_reason: paymentIntent.last_payment_error?.message || 'Unknown error',
          failure_code: paymentIntent.last_payment_error?.code || null
        }
      })
      .eq('transaction_id', paymentIntent.id);

    // Send notification to user
    const userId = paymentIntent.metadata?.user_id;
    if (userId) {
      await createNotification({
        user_id: userId,
        type: 'payment_failed',
        title: 'Payment Failed',
        message: `Your payment could not be processed. Please try again or contact support.`,
        metadata: {
          payment_intent_id: paymentIntent.id,
          failure_reason: paymentIntent.last_payment_error?.message
        }
      });
    }

    console.log('✅ Payment failure processed for:', paymentIntent.id);

  } catch (error) {
    console.error('Error handling payment failure:', error);
  }
}

// Handle canceled payment
async function handlePaymentIntentCanceled(paymentIntent) {
  try {
    console.log('🚫 Payment canceled:', paymentIntent.id);

    await supabase
      .from('payments')
      .update({
        status: 'canceled',
        canceled_at: new Date().toISOString()
      })
      .eq('transaction_id', paymentIntent.id);

    console.log('✅ Payment cancellation processed for:', paymentIntent.id);

  } catch (error) {
    console.error('Error handling payment cancellation:', error);
  }
}

// Handle charge dispute
async function handleChargeDisputeCreated(dispute) {
  try {
    console.log('⚠️ Charge dispute created:', dispute.id);

    // Find the payment associated with this charge
    const { data: payment } = await supabase
      .from('payments')
      .select('*')
      .eq('transaction_hash', dispute.charge)
      .single();

    if (payment) {
      // Update payment status
      await supabase
        .from('payments')
        .update({
          status: 'disputed',
          metadata: {
            ...payment.metadata,
            dispute_id: dispute.id,
            dispute_reason: dispute.reason,
            dispute_amount: dispute.amount
          }
        })
        .eq('id', payment.id);

      // Notify admin
      await createNotification({
        user_id: null, // Admin notification
        type: 'payment_dispute',
        title: 'Payment Dispute Created',
        message: `A dispute has been created for payment ${payment.id}`,
        metadata: {
          payment_id: payment.id,
          dispute_id: dispute.id,
          dispute_reason: dispute.reason
        }
      });
    }

    console.log('✅ Dispute processing completed for:', dispute.id);

  } catch (error) {
    console.error('Error handling charge dispute:', error);
  }
}

// Handle invoice payment success (for subscriptions)
async function handleInvoicePaymentSucceeded(invoice) {
  try {
    console.log('📄 Invoice payment succeeded:', invoice.id);

    // Handle subscription-related logic here
    if (invoice.subscription) {
      const customerId = invoice.customer;
      // Update subscription status in your database
      console.log('✅ Subscription payment processed for customer:', customerId);
    }

  } catch (error) {
    console.error('Error handling invoice payment:', error);
  }
}

// Handle subscription updates
async function handleSubscriptionUpdated(subscription) {
  try {
    console.log('🔄 Subscription updated:', subscription.id);

    // Update subscription status in your database
    const customerId = subscription.customer;
    console.log('✅ Subscription update processed for customer:', customerId);

  } catch (error) {
    console.error('Error handling subscription update:', error);
  }
}

// ===============================================
// HELPER FUNCTIONS
// ===============================================

// Create notification helper
async function createNotification(notificationData) {
  try {
    await supabase
      .from('notifications')
      .insert(notificationData);
  } catch (error) {
    console.error('Error creating notification:', error);
  }
}

module.exports = router; 