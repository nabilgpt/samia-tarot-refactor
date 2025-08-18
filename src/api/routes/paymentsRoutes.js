// ===============================================
// PAYMENTS & TRANSACTIONS API ROUTES
// ===============================================

const express = require('express');
const Joi = require('joi');
const { supabase } = require('../lib/supabase');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validation');
const { stripe } = require('../config/stripe');
const multer = require('multer');
const path = require('path');
const router = express.Router();

// ===============================================
// MULTER CONFIGURATION FOR RECEIPT UPLOADS
// ===============================================

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only images and PDF files are allowed'));
    }
  }
});

// ===============================================
// VALIDATION SCHEMAS
// ===============================================

const paymentSchema = Joi.object({
  booking_id: Joi.string().uuid().optional(),
  amount: Joi.number().positive().precision(2).required(),
  currency: Joi.string().length(3).default('USD'),
  method: Joi.string().valid(
    'stripe', 'square', 'usdt', 'western_union', 'moneygram', 
    'ria', 'omt', 'whish', 'bob', 'wallet'
  ).required(),
  transaction_id: Joi.string().max(255).optional(),
  transaction_hash: Joi.string().max(255).optional(),
  metadata: Joi.object().optional()
});

const walletTopupSchema = Joi.object({
  amount: Joi.number().positive().precision(2).required(),
  method: Joi.string().valid(
    'stripe', 'square', 'usdt', 'western_union', 'moneygram', 
    'ria', 'omt', 'whish', 'bob'
  ).required(),
  transaction_id: Joi.string().optional(),
  transaction_hash: Joi.string().optional()
});

const refundSchema = Joi.object({
  payment_id: Joi.string().uuid().required(),
  amount: Joi.number().positive().precision(2).optional(), // Partial refund
  reason: Joi.string().max(500).required(),
  admin_notes: Joi.string().max(1000).optional()
});

const transferSchema = Joi.object({
  recipient_id: Joi.string().uuid().required(),
  amount: Joi.number().positive().precision(2).required(),
  description: Joi.string().max(255).optional()
});

const stripePaymentIntentSchema = Joi.object({
  amount: Joi.number().positive().integer().required(), // Amount in cents
  currency: Joi.string().length(3).default('USD'),
  booking_id: Joi.string().uuid().optional(),
  metadata: Joi.object().optional()
});

// ===============================================
// PAYMENT PROCESSING ROUTES
// ===============================================

// Create payment
router.post('/payments',
  authenticateToken,
  validateRequest(paymentSchema),
  async (req, res) => {
    try {
      const { booking_id, amount, currency, method, transaction_id, transaction_hash, metadata } = req.body;
      const user_id = req.user.id;

      // Validate booking if provided
      if (booking_id) {
        const { data: booking, error: bookingError } = await supabase
          .from('bookings')
          .select('id, user_id, service_id, services(price)')
          .eq('id', booking_id)
          .single();

        if (bookingError || !booking) {
          return res.status(404).json({
            error: 'Booking not found',
            code: 'BOOKING_NOT_FOUND'
          });
        }

        if (booking.user_id !== user_id) {
          return res.status(403).json({
            error: 'Access denied',
            code: 'ACCESS_DENIED'
          });
        }

        // Validate amount matches service price
        if (Math.abs(amount - parseFloat(booking.services.price)) > 0.01) {
          return res.status(400).json({
            error: 'Payment amount does not match service price',
            code: 'AMOUNT_MISMATCH'
          });
        }
      }

      // Create payment record
      const paymentData = {
        booking_id,
        user_id,
        amount,
        currency,
        method,
        transaction_id,
        transaction_hash,
        metadata,
        status: method === 'wallet' ? 'processing' : 'pending'
      };

      // Handle wallet payments
      if (method === 'wallet') {
        // Get user's wallet
        const { data: wallet, error: walletError } = await supabase
          .from('wallets')
          .select('*')
          .eq('user_id', user_id)
          .single();

        if (walletError || !wallet) {
          return res.status(400).json({
            error: 'Wallet not found',
            code: 'WALLET_NOT_FOUND'
          });
        }

        // Check sufficient balance
        if (wallet.balance < amount) {
          return res.status(400).json({
            error: 'Insufficient wallet balance',
            code: 'INSUFFICIENT_BALANCE'
          });
        }

        // Process wallet payment in transaction
        const { data: payment, error: paymentError } = await supabase
          .rpc('process_wallet_payment', {
            p_user_id: user_id,
            p_booking_id: booking_id,
            p_amount: amount,
            p_currency: currency,
            p_metadata: metadata
          });

        if (paymentError) throw paymentError;

        res.status(201).json({
          success: true,
          data: payment,
          message: 'Wallet payment processed successfully'
        });

      } else {
        // For other payment methods, create pending payment
        const { data: payment, error } = await supabase
          .from('payments')
          .insert(paymentData)
          .select('*')
          .single();

        if (error) throw error;

        res.status(201).json({
          success: true,
          data: payment,
          message: 'Payment created successfully'
        });
      }

    } catch (error) {
      console.error('Create payment error:', error);
      res.status(500).json({
        error: 'Failed to create payment',
        details: error.message
      });
    }
  }
);

// Create Stripe payment intent
router.post('/create-payment-intent',
  authenticateToken,
  validateRequest(stripePaymentIntentSchema),
  async (req, res) => {
    try {
      const { amount, currency, booking_id, metadata = {} } = req.body;
      const user_id = req.user.id;

      // Add user information to metadata
      const enrichedMetadata = {
        ...metadata,
        user_id,
        booking_id: booking_id || null,
        platform: 'samia_tarot'
      };

      // Validate booking if provided
      if (booking_id) {
        const { data: booking, error: bookingError } = await supabase
          .from('bookings')
          .select('id, user_id, service_id, services(price, name)')
          .eq('id', booking_id)
          .single();

        if (bookingError || !booking) {
          return res.status(404).json({
            error: 'Booking not found',
            code: 'BOOKING_NOT_FOUND'
          });
        }

        if (booking.user_id !== user_id) {
          return res.status(403).json({
            error: 'Access denied',
            code: 'ACCESS_DENIED'
          });
        }

        // Add booking info to metadata
        enrichedMetadata.service_name = booking.services.name;
        enrichedMetadata.service_price = booking.services.price;
      }

      // Create Stripe payment intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount), // Ensure integer
        currency: currency.toLowerCase(),
        metadata: enrichedMetadata,
        automatic_payment_methods: {
          enabled: true,
        },
      });

      // Store payment intent in database for tracking
      const { data: paymentRecord, error: dbError } = await supabase
        .from('payments')
        .insert({
          user_id,
          booking_id,
          amount: amount / 100, // Convert cents to dollars for database
          currency: currency.toUpperCase(),
          method: 'stripe',
          transaction_id: paymentIntent.id,
          status: 'pending',
          metadata: enrichedMetadata
        })
        .select('*')
        .single();

      if (dbError) {
        console.error('Database error while storing payment:', dbError);
        // Continue anyway, as Stripe intent was created successfully
      }

      res.status(201).json({
        success: true,
        data: {
          clientSecret: paymentIntent.client_secret,
          paymentIntentId: paymentIntent.id,
          amount,
          currency,
          paymentRecord: paymentRecord || null
        },
        message: 'Payment intent created successfully'
      });

    } catch (error) {
      console.error('Create payment intent error:', error);
      
      // Handle Stripe-specific errors
      if (error.type === 'StripeCardError') {
        return res.status(400).json({
          error: 'Card error',
          details: error.message,
          code: 'STRIPE_CARD_ERROR'
        });
      }
      
      if (error.type === 'StripeInvalidRequestError') {
        return res.status(400).json({
          error: 'Invalid request',
          details: error.message,
          code: 'STRIPE_INVALID_REQUEST'
        });
      }

      res.status(500).json({
        error: 'Failed to create payment intent',
        details: error.message
      });
    }
  }
);

// Get payments (with filters)
router.get('/payments',
  authenticateToken,
  async (req, res) => {
    try {
      const { 
        status, 
        method, 
        booking_id,
        page = 1, 
        limit = 20,
        start_date,
        end_date
      } = req.query;

      let query = supabase
        .from('payments')
        .select(`
          *,
          booking:bookings(
            id,
            service_id,
            services(name, type),
            reader:profiles!bookings_reader_id_fkey(id, first_name, last_name)
          ),
          user:profiles!payments_user_id_fkey(id, first_name, last_name, email),
          receipt_uploads(id, file_url, upload_status)
        `);

      // Apply user-based filters
      if (req.user.role === 'client') {
        query = query.eq('user_id', req.user.id);
      }

      // Apply additional filters
      if (status) query = query.eq('status', status);
      if (method) query = query.eq('method', method);
      if (booking_id) query = query.eq('booking_id', booking_id);
      if (start_date) query = query.gte('created_at', start_date);
      if (end_date) query = query.lte('created_at', end_date);

      // Apply pagination
      const offset = (page - 1) * limit;
      query = query.range(offset, offset + limit - 1).order('created_at', { ascending: false });

      const { data: payments, error } = await query;
      if (error) throw error;

      // Get total count for pagination
      let countQuery = supabase
        .from('payments')
        .select('*', { count: 'exact', head: true });

      if (req.user.role === 'client') {
        countQuery = countQuery.eq('user_id', req.user.id);
      }

      const { count } = await countQuery;

      res.json({
        success: true,
        data: payments,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count,
          pages: Math.ceil(count / limit)
        }
      });

    } catch (error) {
      console.error('Get payments error:', error);
      res.status(500).json({
        error: 'Failed to retrieve payments',
        details: error.message
      });
    }
  }
);

// Get specific payment
router.get('/payments/:id',
  authenticateToken,
  async (req, res) => {
    try {
      const { id } = req.params;

      const { data: payment, error } = await supabase
        .from('payments')
        .select(`
          *,
          booking:bookings(
            id,
            service_id,
            services(name, type, price),
            reader:profiles!bookings_reader_id_fkey(id, first_name, last_name, avatar_url)
          ),
          user:profiles!payments_user_id_fkey(id, first_name, last_name, email, phone),
          receipt_uploads(*),
          refunds:payments!payments_booking_id_fkey(
            id, amount, status, created_at
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      if (!payment) {
        return res.status(404).json({
          error: 'Payment not found',
          code: 'PAYMENT_NOT_FOUND'
        });
      }

      // Check access permissions
      const hasAccess = 
        payment.user_id === req.user.id ||
        ['admin', 'monitor'].includes(req.user.role);

      if (!hasAccess) {
        return res.status(403).json({
          error: 'Access denied',
          code: 'ACCESS_DENIED'
        });
      }

      res.json({
        success: true,
        data: payment
      });

    } catch (error) {
      console.error('Get payment error:', error);
      res.status(500).json({
        error: 'Failed to retrieve payment',
        details: error.message
      });
    }
  }
);

// Update payment status (Admin only)
router.patch('/payments/:id/status',
  authenticateToken,
  requireRole(['admin', 'super_admin']),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { status, admin_notes } = req.body;

      const validStatuses = ['pending', 'processing', 'completed', 'failed', 'refunded', 'awaiting_approval'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          error: 'Invalid status',
          code: 'INVALID_STATUS'
        });
      }

      // Get current payment
      const { data: currentPayment, error: currentError } = await supabase
        .from('payments')
        .select('*')
        .eq('id', id)
        .single();

      if (currentError || !currentPayment) {
        return res.status(404).json({
          error: 'Payment not found',
          code: 'PAYMENT_NOT_FOUND'
        });
      }

      // Update payment
      const { data: payment, error } = await supabase
        .from('payments')
        .update({ 
          status, 
          admin_notes,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select('*')
        .single();

      if (error) throw error;

      // Handle status-specific logic
      if (status === 'completed' && currentPayment.method === 'wallet') {
        // Already processed in wallet payment, just update booking status
        if (payment.booking_id) {
          await supabase
            .from('bookings')
            .update({ status: 'confirmed' })
            .eq('id', payment.booking_id);
        }
      }

      res.json({
        success: true,
        data: payment,
        message: 'Payment status updated successfully'
      });

    } catch (error) {
      console.error('Update payment status error:', error);
      res.status(500).json({
        error: 'Failed to update payment status',
        details: error.message
      });
    }
  }
);

// ===============================================
// RECEIPT UPLOAD ROUTES
// ===============================================

// Upload payment receipt
router.post('/payments/:id/receipt',
  authenticateToken,
  upload.single('receipt'),
  async (req, res) => {
    try {
      const { id: payment_id } = req.params;
      const user_id = req.user.id;

      if (!req.file) {
        return res.status(400).json({
          error: 'No file uploaded',
          code: 'NO_FILE'
        });
      }

      // Verify payment ownership
      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .select('user_id, method')
        .eq('id', payment_id)
        .single();

      if (paymentError || !payment) {
        return res.status(404).json({
          error: 'Payment not found',
          code: 'PAYMENT_NOT_FOUND'
        });
      }

      if (payment.user_id !== user_id) {
        return res.status(403).json({
          error: 'Access denied',
          code: 'ACCESS_DENIED'
        });
      }

      // Upload file to Supabase Storage
      const fileName = `receipts/${payment_id}_${Date.now()}_${req.file.originalname}`;
      const { error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(fileName, req.file.buffer, {
          contentType: req.file.mimetype,
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('receipts')
        .getPublicUrl(fileName);

      // Save receipt record
      const { data: receipt, error } = await supabase
        .from('receipt_uploads')
        .insert({
          payment_id,
          user_id,
          file_url: publicUrl,
          file_name: req.file.originalname,
          file_size: req.file.size,
          upload_status: 'uploaded'
        })
        .select('*')
        .single();

      if (error) throw error;

      // Update payment status to awaiting approval
      await supabase
        .from('payments')
        .update({ status: 'awaiting_approval' })
        .eq('id', payment_id);

      res.status(201).json({
        success: true,
        data: receipt,
        message: 'Receipt uploaded successfully'
      });

    } catch (error) {
      console.error('Upload receipt error:', error);
      res.status(500).json({
        error: 'Failed to upload receipt',
        details: error.message
      });
    }
  }
);

// Verify receipt (Admin only)
router.patch('/receipts/:id/verify',
  authenticateToken,
  requireRole(['admin', 'super_admin']),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { upload_status, admin_notes } = req.body;

      const validStatuses = ['uploaded', 'verified', 'rejected'];
      if (!validStatuses.includes(upload_status)) {
        return res.status(400).json({
          error: 'Invalid status',
          code: 'INVALID_STATUS'
        });
      }

      // Update receipt
      const { data: receipt, error } = await supabase
        .from('receipt_uploads')
        .update({ 
          upload_status, 
          admin_notes,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select('*, payment:payments(*)')
        .single();

      if (error) throw error;

      // Update payment status based on verification
      if (upload_status === 'verified') {
        await supabase
          .from('payments')
          .update({ status: 'completed' })
          .eq('id', receipt.payment_id);

        // Update booking if exists
        if (receipt.payment.booking_id) {
          await supabase
            .from('bookings')
            .update({ status: 'confirmed' })
            .eq('id', receipt.payment.booking_id);
        }
      } else if (upload_status === 'rejected') {
        await supabase
          .from('payments')
          .update({ status: 'failed' })
          .eq('id', receipt.payment_id);
      }

      res.json({
        success: true,
        data: receipt,
        message: 'Receipt verification updated'
      });

    } catch (error) {
      console.error('Verify receipt error:', error);
      res.status(500).json({
        error: 'Failed to verify receipt',
        details: error.message
      });
    }
  }
);

// ===============================================
// WALLET MANAGEMENT ROUTES
// ===============================================

// Get user wallet
router.get('/wallet',
  authenticateToken,
  async (req, res) => {
    try {
      const user_id = req.user.id;

      let { data: wallet, error } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', user_id)
        .single();

      // Create wallet if doesn't exist
      if (error && error.code === 'PGRST116') {
        const { data: newWallet, error: createError } = await supabase
          .from('wallets')
          .insert({ user_id, balance: 0.00 })
          .select('*')
          .single();

        if (createError) throw createError;
        wallet = newWallet;
      } else if (error) {
        throw error;
      }

      res.json({
        success: true,
        data: wallet
      });

    } catch (error) {
      console.error('Get wallet error:', error);
      res.status(500).json({
        error: 'Failed to retrieve wallet',
        details: error.message
      });
    }
  }
);

// Top up wallet
router.post('/wallet/topup',
  authenticateToken,
  validateRequest(walletTopupSchema),
  async (req, res) => {
    try {
      const { amount, method, transaction_id, transaction_hash } = req.body;
      const user_id = req.user.id;

      // Create payment for wallet top-up
      const { data: payment, error } = await supabase
        .from('payments')
        .insert({
          user_id,
          amount,
          currency: 'USD',
          method,
          transaction_id,
          transaction_hash,
          status: 'pending',
          metadata: { type: 'wallet_topup' }
        })
        .select('*')
        .single();

      if (error) throw error;

      res.status(201).json({
        success: true,
        data: payment,
        message: 'Wallet top-up payment created'
      });

    } catch (error) {
      console.error('Wallet top-up error:', error);
      res.status(500).json({
        error: 'Failed to create wallet top-up',
        details: error.message
      });
    }
  }
);

// Get wallet transactions
router.get('/wallet/transactions',
  authenticateToken,
  async (req, res) => {
    try {
      const user_id = req.user.id;
      const { type, page = 1, limit = 20 } = req.query;

      let query = supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user_id);

      if (type) query = query.eq('type', type);

      const offset = (page - 1) * limit;
      query = query.range(offset, offset + limit - 1).order('created_at', { ascending: false });

      const { data: transactions, error } = await query;
      if (error) throw error;

      // Get total count
      const { count } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user_id);

      res.json({
        success: true,
        data: transactions,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count,
          pages: Math.ceil(count / limit)
        }
      });

    } catch (error) {
      console.error('Get wallet transactions error:', error);
      res.status(500).json({
        error: 'Failed to retrieve transactions',
        details: error.message
      });
    }
  }
);

// Transfer between wallets
router.post('/wallet/transfer',
  authenticateToken,
  validateRequest(transferSchema),
  async (req, res) => {
    try {
      const { recipient_id, amount, description } = req.body;
      const sender_id = req.user.id;

      if (sender_id === recipient_id) {
        return res.status(400).json({
          error: 'Cannot transfer to yourself',
          code: 'SELF_TRANSFER'
        });
      }

      // Verify recipient exists
      const { data: recipient, error: recipientError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', recipient_id)
        .single();

      if (recipientError || !recipient) {
        return res.status(404).json({
          error: 'Recipient not found',
          code: 'RECIPIENT_NOT_FOUND'
        });
      }

      // Process transfer
      const { data: transfer, error } = await supabase
        .rpc('process_wallet_transfer', {
          p_sender_id: sender_id,
          p_recipient_id: recipient_id,
          p_amount: amount,
          p_description: description
        });

      if (error) throw error;

      res.status(201).json({
        success: true,
        data: transfer,
        message: 'Transfer completed successfully'
      });

    } catch (error) {
      console.error('Wallet transfer error:', error);
      res.status(500).json({
        error: 'Failed to process transfer',
        details: error.message
      });
    }
  }
);

// ===============================================
// REFUND MANAGEMENT ROUTES
// ===============================================

// Create refund (Admin only)
router.post('/refunds',
  authenticateToken,
  requireRole(['admin', 'super_admin']),
  validateRequest(refundSchema),
  async (req, res) => {
    try {
      const { payment_id, amount, reason, admin_notes } = req.body;

      // Get original payment
      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .select('*')
        .eq('id', payment_id)
        .single();

      if (paymentError || !payment) {
        return res.status(404).json({
          error: 'Payment not found',
          code: 'PAYMENT_NOT_FOUND'
        });
      }

      if (payment.status !== 'completed') {
        return res.status(400).json({
          error: 'Can only refund completed payments',
          code: 'INVALID_PAYMENT_STATUS'
        });
      }

      const refundAmount = amount || payment.amount;

      // Process refund
      const { data: refund, error } = await supabase
        .rpc('process_refund', {
          p_payment_id: payment_id,
          p_refund_amount: refundAmount,
          p_reason: reason,
          p_admin_notes: admin_notes,
          p_admin_id: req.user.id
        });

      if (error) throw error;

      res.status(201).json({
        success: true,
        data: refund,
        message: 'Refund processed successfully'
      });

    } catch (error) {
      console.error('Process refund error:', error);
      res.status(500).json({
        error: 'Failed to process refund',
        details: error.message
      });
    }
  }
);

// Get refunds
router.get('/refunds',
  authenticateToken,
  requireRole(['admin', 'monitor']),
  async (req, res) => {
    try {
      const { status, page = 1, limit = 20 } = req.query;

      let query = supabase
        .from('payments')
        .select(`
          *,
          original_payment:payments!payments_booking_id_fkey(
            id, amount, method, transaction_id
          ),
          user:profiles!payments_user_id_fkey(id, first_name, last_name, email)
        `)
        .eq('status', 'refunded');

      if (status) query = query.eq('status', status);

      const offset = (page - 1) * limit;
      query = query.range(offset, offset + limit - 1).order('created_at', { ascending: false });

      const { data: refunds, error } = await query;
      if (error) throw error;

      // Get total count
      const { count } = await supabase
        .from('payments')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'refunded');

      res.json({
        success: true,
        data: refunds,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count,
          pages: Math.ceil(count / limit)
        }
      });

    } catch (error) {
      console.error('Get refunds error:', error);
      res.status(500).json({
        error: 'Failed to retrieve refunds',
        details: error.message
      });
    }
  }
);

// ===============================================
// PAYMENT ANALYTICS & REPORTS
// ===============================================

// Get payment statistics
router.get('/analytics/payments',
  authenticateToken,
  requireRole(['admin', 'monitor']),
  async (req, res) => {
    try {
      const { start_date, end_date, method } = req.query;

      const analytics = await Promise.all([
        // Total revenue
        supabase.rpc('get_total_revenue', { start_date, end_date, method }),
        
        // Payment method breakdown
        supabase.rpc('get_payment_method_stats', { start_date, end_date }),
        
        // Payment status distribution
        supabase.rpc('get_payment_status_stats', { start_date, end_date }),
        
        // Average transaction value
        supabase.rpc('get_average_transaction_value', { start_date, end_date }),
        
        // Failed payment analysis
        supabase.rpc('get_failed_payment_stats', { start_date, end_date })
      ]);

      const [
        totalRevenue,
        methodStats,
        statusStats,
        avgTransactionValue,
        failedPaymentStats
      ] = analytics;

      res.json({
        success: true,
        data: {
          total_revenue: totalRevenue.data,
          payment_methods: methodStats.data,
          payment_status: statusStats.data,
          average_transaction_value: avgTransactionValue.data,
          failed_payments: failedPaymentStats.data
        }
      });

    } catch (error) {
      console.error('Get payment analytics error:', error);
      res.status(500).json({
        error: 'Failed to retrieve payment analytics',
        details: error.message
      });
    }
  }
);

// Get wallet analytics
router.get('/analytics/wallets',
  authenticateToken,
  requireRole(['admin', 'monitor']),
  async (req, res) => {
    try {
      const analytics = await Promise.all([
        // Total wallet balance
        supabase.rpc('get_total_wallet_balance'),
        
        // Wallet usage statistics
        supabase.rpc('get_wallet_usage_stats'),
        
        // Top-up trends
        supabase.rpc('get_wallet_topup_trends'),
        
        // Transfer volume
        supabase.rpc('get_wallet_transfer_volume')
      ]);

      const [
        totalBalance,
        usageStats,
        topupTrends,
        transferVolume
      ] = analytics;

      res.json({
        success: true,
        data: {
          total_balance: totalBalance.data,
          usage_statistics: usageStats.data,
          topup_trends: topupTrends.data,
          transfer_volume: transferVolume.data
        }
      });

    } catch (error) {
      console.error('Get wallet analytics error:', error);
      res.status(500).json({
        error: 'Failed to retrieve wallet analytics',
        details: error.message
      });
    }
  }
);

module.exports = router; 
