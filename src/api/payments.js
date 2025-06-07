// =============================================================================
// PAYMENTS API - إدارة المدفوعات والمحافظ
// =============================================================================
// Complete payment processing system with multiple gateways

const express = require('express');
const { supabaseAdmin: supabase } = require('./lib/supabase.js');
const rateLimit = require('express-rate-limit');

const Decimal = require('decimal.js');

const router = express.Router();

// =============================================================================
// SUPABASE CLIENT SETUP
// =============================================================================
// Already imported above

// =============================================================================
// PAYMENT GATEWAYS SETUP
// =============================================================================
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
// Square integration will be implemented later
// const square = require('square');

// =============================================================================
// RATE LIMITING
// =============================================================================
const paymentsRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // limit each IP to 30 payment requests per windowMs
  message: {
    error: 'Too many payment requests, please try again later',
    code: 'RATE_LIMIT_EXCEEDED'
  }
});

// =============================================================================
// MIDDLEWARE
// =============================================================================
const { authenticateToken } = require('./middleware/auth');

// =============================================================================
// VALIDATION HELPERS
// =============================================================================

const validatePaymentData = (data, isUpdate = false) => {
  const errors = [];

  // التحقق من المبلغ
  if (!isUpdate && (!data.amount || data.amount <= 0)) {
    errors.push('Valid amount is required');
  }

  // التحقق من العملة
  if (data.currency && !['USD', 'EUR', 'GBP', 'SAR'].includes(data.currency)) {
    errors.push('Unsupported currency');
  }

  // التحقق من طريقة الدفع
  if (!isUpdate && (!data.method || !['stripe', 'square', 'usdt', 'western_union', 'moneygram', 'ria', 'omt', 'whish', 'bob', 'wallet'].includes(data.method))) {
    errors.push('Valid payment method is required');
  }

  // التحقق من الحالة
  if (data.status && !['pending', 'processing', 'completed', 'failed', 'refunded', 'awaiting_approval'].includes(data.status)) {
    errors.push('Invalid payment status');
  }

  // التحقق من بيانات USDT
  if (data.method === 'usdt') {
    if (!data.transaction_hash) {
      errors.push('Transaction hash is required for USDT payments');
    }
    if (data.transaction_hash && !/^0x[a-fA-F0-9]{64}$/.test(data.transaction_hash)) {
      errors.push('Invalid USDT transaction hash format');
    }
  }

  return errors;
};

// =============================================================================
// PAYMENT PROCESSING FUNCTIONS
// =============================================================================

// معالجة الدفع عبر Stripe
const processStripePayment = async (paymentData) => {
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(paymentData.amount * 100), // Convert to cents
      currency: paymentData.currency.toLowerCase(),
      metadata: {
        booking_id: paymentData.booking_id,
        user_id: paymentData.user_id
      }
    });

    return {
      success: true,
      transaction_id: paymentIntent.id,
      client_secret: paymentIntent.client_secret,
      status: 'processing'
    };
  } catch (error) {
    console.error('Stripe payment error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// معالجة الدفع عبر Square
const processSquarePayment = async (paymentData) => {
  try {
    // Square payment implementation
    // This is a placeholder - implement based on Square SDK
    console.log('Processing Square payment for amount:', paymentData.amount);
    
    return {
      success: true,
      transaction_id: `sq_${Date.now()}`,
      status: 'processing'
    };
  } catch (error) {
    console.error('Square payment error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// التحقق من معاملة USDT
const verifyUSDTTransaction = async (transactionHash, expectedAmount) => {
  try {
    // This is a placeholder for USDT verification
    // In real implementation, you would verify the transaction on the blockchain
    
    // For now, we'll simulate verification
    const isValid = transactionHash && transactionHash.length === 66;
    
    return {
      isValid,
      amount: isValid ? expectedAmount : 0,
      confirmations: isValid ? 12 : 0
    };
  } catch (error) {
    console.error('USDT verification error:', error);
    return {
      isValid: false,
      amount: 0,
      confirmations: 0
    };
  }
};

// =============================================================================
// WALLET FUNCTIONS
// =============================================================================

// التحقق من رصيد المحفظة
const checkWalletBalance = async (userId, amount, currency = 'USD') => {
  const { data: wallet, error } = await supabase
    .from('wallet_balances')
    .select('balance, currency')
    .eq('user_id', userId)
    .eq('currency', currency)
    .single();

  if (error || !wallet) {
    return { sufficient: false, balance: 0 };
  }

  const balance = new Decimal(wallet.balance);
  const requiredAmount = new Decimal(amount);

  return {
    sufficient: balance.gte(requiredAmount),
    balance: balance.toNumber()
  };
};

// خصم من المحفظة
const deductFromWallet = async (userId, amount, currency = 'USD', referenceId, referenceType, description) => {
  try {
    // بدء transaction
    const { data: currentWallet, error: walletError } = await supabase
      .from('wallet_balances')
      .select('balance')
      .eq('user_id', userId)
      .eq('currency', currency)
      .single();

    if (walletError || !currentWallet) {
      throw new Error('Wallet not found');
    }

    const currentBalance = new Decimal(currentWallet.balance);
    const deductAmount = new Decimal(amount);
    const newBalance = currentBalance.minus(deductAmount);

    if (newBalance.lt(0)) {
      throw new Error('Insufficient wallet balance');
    }

    // تحديث الرصيد
    const { error: updateError } = await supabase
      .from('wallet_balances')
      .update({ 
        balance: newBalance.toNumber(),
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('currency', currency);

    if (updateError) {
      throw new Error('Failed to update wallet balance');
    }

    // إضافة معاملة الخصم
    const { data: transaction, error: transactionError } = await supabase
      .from('wallet_transactions')
      .insert([{
        user_id: userId,
        transaction_type: 'debit',
        amount: amount,
        currency: currency,
        description: description,
        reference_id: referenceId,
        reference_type: referenceType,
        status: 'completed'
      }])
      .select()
      .single();

    if (transactionError) {
      console.error('Wallet transaction log error:', transactionError);
    }

    return {
      success: true,
      newBalance: newBalance.toNumber(),
      transaction
    };

  } catch (error) {
    console.error('Wallet deduction error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// =============================================================================
// API ENDPOINTS
// =============================================================================

// GET /api/payments - استعلام المدفوعات
router.get('/', paymentsRateLimit, authenticateToken, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      method,
      booking_id,
      start_date,
      end_date,
      sort_by = 'created_at',
      sort_order = 'desc'
    } = req.query;

    const requestingUserId = req.user.id;
    const requestingUserRole = req.profile.role;

    // بناء الـ query حسب الدور
    let query = supabase
      .from('payments')
      .select(`
        id, booking_id, user_id, amount, currency, method,
        transaction_id, transaction_hash, receipt_url, status,
        admin_notes, metadata, created_at, updated_at,
        profiles!payments_user_id_fkey (
          first_name, last_name, email
        ),
        bookings (
          id, scheduled_at, services(name, type)
        )
      `);

    // فلترة حسب الدور
    if (!['admin', 'super_admin'].includes(requestingUserRole)) {
      query = query.eq('user_id', requestingUserId);
    }

    // الفلاتر
    if (status) {
      query = query.eq('status', status);
    }

    if (method) {
      query = query.eq('method', method);
    }

    if (booking_id) {
      query = query.eq('booking_id', booking_id);
    }

    if (start_date) {
      query = query.gte('created_at', start_date);
    }

    if (end_date) {
      query = query.lte('created_at', end_date);
    }

    // الترتيب والتقسيم
    query = query.order(sort_by, { ascending: sort_order === 'asc' });
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + parseInt(limit) - 1);

    const { data: payments, error, count } = await query;

    if (error) {
      console.error('Error fetching payments:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch payments',
        code: 'FETCH_ERROR'
      });
    }

    // إحصائيات
    const { data: stats } = await supabase
      .from('payments')
      .select('status, method, amount')
      .eq(
        ['admin', 'super_admin'].includes(requestingUserRole) ? 'id' : 'user_id',
        ['admin', 'super_admin'].includes(requestingUserRole) ? null : requestingUserId
      );

    const paymentStats = stats?.reduce((acc, payment) => {
      acc.total_amount = (acc.total_amount || 0) + parseFloat(payment.amount);
      acc[payment.status] = (acc[payment.status] || 0) + 1;
      acc[`${payment.method}_count`] = (acc[`${payment.method}_count`] || 0) + 1;
      return acc;
    }, {}) || {};

    res.json({
      success: true,
      data: {
        payments,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count,
          total_pages: Math.ceil(count / limit)
        },
        stats: paymentStats
      }
    });

  } catch (error) {
    console.error('Payments fetch error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// GET /api/payments/:id - تفاصيل دفعة معيّنة
router.get('/:id', paymentsRateLimit, authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const requestingUserId = req.user.id;
    const requestingUserRole = req.profile.role;

    let query = supabase
      .from('payments')
      .select(`
        id, booking_id, user_id, amount, currency, method,
        transaction_id, transaction_hash, receipt_url, status,
        admin_notes, metadata, created_at, updated_at,
        profiles!payments_user_id_fkey (
          first_name, last_name, email, phone
        ),
        bookings (
          id, scheduled_at, status, services(name, type, price)
        ),
        receipt_uploads (
          id, file_url, file_name, upload_status, admin_notes, created_at
        )
      `)
      .eq('id', id);

    // فلترة حسب الدور
    if (!['admin', 'super_admin'].includes(requestingUserRole)) {
      query = query.eq('user_id', requestingUserId);
    }

    const { data: payment, error } = await query.single();

    if (error || !payment) {
      return res.status(404).json({
        success: false,
        error: 'Payment not found',
        code: 'PAYMENT_NOT_FOUND'
      });
    }

    // إضافة تفاصيل إضافية للـ USDT
    if (payment.method === 'usdt' && payment.transaction_hash) {
      const verification = await verifyUSDTTransaction(
        payment.transaction_hash, 
        payment.amount, 
        payment.metadata?.wallet_address
      );
      payment.usdt_verification = verification;
    }

    res.json({
      success: true,
      data: payment
    });

  } catch (error) {
    console.error('Payment fetch error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// POST /api/payments - إنشاء دفعة جديدة
router.post('/', paymentsRateLimit, authenticateToken, async (req, res) => {
  try {
    const paymentData = req.body;
    const requestingUserId = req.user.id;

    // التحقق من صحة البيانات
    const validationErrors = validatePaymentData(paymentData);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: validationErrors
      });
    }

    // التحقق من وجود الحجز إذا تم تحديده
    if (paymentData.booking_id) {
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .select('id, user_id, service_id, services(price)')
        .eq('id', paymentData.booking_id)
        .single();

      if (bookingError || !booking) {
        return res.status(404).json({
          success: false,
          error: 'Booking not found',
          code: 'BOOKING_NOT_FOUND'
        });
      }

      // التحقق من الملكية
      if (booking.user_id !== requestingUserId) {
        return res.status(403).json({
          success: false,
          error: 'You can only pay for your own bookings',
          code: 'ACCESS_DENIED'
        });
      }
    }

    // إنشاء الدفعة في قاعدة البيانات
    const newPayment = {
      booking_id: paymentData.booking_id,
      user_id: requestingUserId,
      amount: paymentData.amount,
      currency: paymentData.currency || 'USD',
      method: paymentData.method,
      status: 'pending',
      metadata: paymentData.metadata || {}
    };

    let { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert([newPayment])
      .select()
      .single();

    if (paymentError) {
      console.error('Payment creation error:', paymentError);
      return res.status(500).json({
        success: false,
        error: 'Failed to create payment',
        code: 'PAYMENT_CREATION_ERROR'
      });
    }

    let paymentResult = { success: true };

    // معالجة الدفع حسب الطريقة
    switch (paymentData.method) {
      case 'stripe':
        paymentResult = await processStripePayment({
          ...paymentData,
          user_id: requestingUserId
        });
        break;
        
      case 'square':
        paymentResult = await processSquarePayment({
          ...paymentData,
          user_id: requestingUserId
        });
        break;
        
      case 'wallet': {
        // التحقق من رصيد المحفظة
        const walletCheck = await checkWalletBalance(requestingUserId, paymentData.amount, paymentData.currency);
        
        if (!walletCheck.sufficient) {
          // حذف الدفعة إذا فشلت
          await supabase.from('payments').delete().eq('id', payment.id);
          
          return res.status(400).json({
            success: false,
            error: 'Insufficient wallet balance',
            code: 'INSUFFICIENT_BALANCE',
            available_balance: walletCheck.balance
          });
        }
        
        // خصم من المحفظة
        const deductResult = await deductFromWallet(
          requestingUserId,
          paymentData.amount,
          paymentData.currency,
          payment.id,
          'payment',
          `Payment for booking ${paymentData.booking_id || 'wallet top-up'}`
        );
        
        if (deductResult.success) {
          paymentResult = {
            success: true,
            transaction_id: `wallet_${payment.id}`,
            status: 'completed'
          };
        } else {
          paymentResult = {
            success: false,
            error: deductResult.error
          };
        }
        break;
      }
      case 'usdt': {
        // للـ USDT، نحتاج إلى التحقق من المعاملة
        if (paymentData.transaction_hash) {
          const verification = await verifyUSDTTransaction(
            paymentData.transaction_hash,
            paymentData.amount,
            paymentData.metadata?.wallet_address
          );
          
          paymentResult = {
            success: verification.isValid,
            transaction_id: paymentData.transaction_hash,
            status: verification.isValid ? 'completed' : 'failed',
            verification: verification
          };
        } else {
          paymentResult = {
            success: true,
            status: 'awaiting_approval' // في انتظار رفع الإيصال
          };
        }
        break;
      }
      default:
        // للطرق التقليدية (western_union, moneygram, etc.)
        paymentResult = {
          success: true,
          status: 'awaiting_approval' // في انتظار رفع الإيصال والموافقة
        };
    }

    // تحديث الدفعة بنتيجة المعالجة
    if (paymentResult.success) {
      const updateData = {
        status: paymentResult.status || 'processing',
        transaction_id: paymentResult.transaction_id,
        updated_at: new Date().toISOString()
      };

      if (paymentData.method === 'usdt') {
        updateData.transaction_hash = paymentData.transaction_hash;
      }

      const { data: updatedPayment, error: updateError } = await supabase
        .from('payments')
        .update(updateData)
        .eq('id', payment.id)
        .select()
        .single();

      if (updateError) {
        console.error('Payment update error:', updateError);
      } else {
        payment = updatedPayment;
      }
    } else {
      // فشل المعالجة - تحديث الحالة إلى failed
      await supabase
        .from('payments')
        .update({ 
          status: 'failed',
          admin_notes: paymentResult.error,
          updated_at: new Date().toISOString()
        })
        .eq('id', payment.id);

      return res.status(400).json({
        success: false,
        error: paymentResult.error || 'Payment processing failed',
        code: 'PAYMENT_PROCESSING_ERROR'
      });
    }

    // إرسال إشعار
    await supabase
      .from('notifications')
      .insert([{
        user_id: requestingUserId,
        title: 'Payment Created',
        message: `Your payment of ${paymentData.amount} ${paymentData.currency} has been processed.`,
        type: 'payment',
        data: { payment_id: payment.id }
      }]);

    // إرجاع النتيجة مع client_secret للـ Stripe
    const response = {
      success: true,
      data: payment,
      message: 'Payment created successfully'
    };

    if (paymentResult.client_secret) {
      response.client_secret = paymentResult.client_secret;
    }

    res.status(201).json(response);

  } catch (error) {
    console.error('Payment creation error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// PUT /api/payments/:id - تحديث حالة الدفع
router.put('/:id', paymentsRateLimit, authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const requestingUserId = req.user.id;
    const requestingUserRole = req.profile.role;

    // التحقق من صحة البيانات
    const validationErrors = validatePaymentData(updateData, true);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: validationErrors
      });
    }

    // التحقق من وجود الدفعة
    const { data: existingPayment, error: fetchError } = await supabase
      .from('payments')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !existingPayment) {
      return res.status(404).json({
        success: false,
        error: 'Payment not found',
        code: 'PAYMENT_NOT_FOUND'
      });
    }

    // التحقق من الصلاحية
    const canUpdate = 
      existingPayment.user_id === requestingUserId ||
      ['admin', 'super_admin'].includes(requestingUserRole);

    if (!canUpdate) {
      return res.status(403).json({
        success: false,
        error: 'Access denied to update this payment',
        code: 'ACCESS_DENIED'
      });
    }

    // منع المستخدمين العاديين من تغيير حالات معيّنة
    if (updateData.status && !['admin', 'super_admin'].includes(requestingUserRole)) {
      const allowedStatuses = ['pending', 'processing']; // المستخدمون يمكنهم فقط إلغاء أو إعادة المحاولة
      if (!allowedStatuses.includes(existingPayment.status)) {
        return res.status(403).json({
          success: false,
          error: 'Cannot modify payment in current status',
          code: 'STATUS_IMMUTABLE'
        });
      }
    }

    // إضافة timestamp التحديث
    updateData.updated_at = new Date().toISOString();

    // تحديث الدفعة
    const { data: updatedPayment, error: updateError } = await supabase
      .from('payments')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Payment update error:', updateError);
      return res.status(500).json({
        success: false,
        error: 'Failed to update payment',
        code: 'UPDATE_ERROR'
      });
    }

    // تسجيل في الـ audit log
    await supabase
      .from('audit_logs')
      .insert([{
        user_id: requestingUserId,
        action: 'payment_update',
        resource_type: 'payment',
        resource_id: id,
        details: {
          updated_fields: Object.keys(updateData),
          old_status: existingPayment.status,
          new_status: updateData.status
        }
      }]);

    // إرسال إشعار بالتحديث
    if (updateData.status && updateData.status !== existingPayment.status) {
      await supabase
        .from('notifications')
        .insert([{
          user_id: existingPayment.user_id,
          title: 'Payment Status Updated',
          message: `Your payment status has been updated to ${updateData.status}`,
          type: 'payment',
          data: { payment_id: id, new_status: updateData.status }
        }]);
    }

    res.json({
      success: true,
      data: updatedPayment,
      message: 'Payment updated successfully'
    });

  } catch (error) {
    console.error('Payment update error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// GET /api/payments/wallet/balance - رصيد المحفظة
router.get('/wallet/balance', paymentsRateLimit, authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { currency = 'USD' } = req.query;

    const { data: wallet, error } = await supabase
      .from('wallet_balances')
      .select('balance, currency, updated_at')
      .eq('user_id', userId)
      .eq('currency', currency)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Wallet balance fetch error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch wallet balance',
        code: 'WALLET_FETCH_ERROR'
      });
    }

    // إنشاء محفظة جديدة إذا لم تكن موجودة
    if (!wallet) {
      const { data: newWallet, error: createError } = await supabase
        .from('wallet_balances')
        .insert([{
          user_id: userId,
          balance: 0,
          currency: currency
        }])
        .select()
        .single();

      if (createError) {
        console.error('Wallet creation error:', createError);
        return res.status(500).json({
          success: false,
          error: 'Failed to create wallet',
          code: 'WALLET_CREATION_ERROR'
        });
      }

      return res.json({
        success: true,
        data: {
          balance: 0,
          currency: currency,
          updated_at: newWallet.updated_at
        }
      });
    }

    res.json({
      success: true,
      data: wallet
    });

  } catch (error) {
    console.error('Wallet balance error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// GET /api/payments/wallet/transactions - معاملات المحفظة
router.get('/wallet/transactions', paymentsRateLimit, authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { 
      page = 1, 
      limit = 20, 
      transaction_type,
      currency = 'USD',
      start_date,
      end_date
    } = req.query;

    let query = supabase
      .from('wallet_transactions')
      .select('*')
      .eq('user_id', userId)
      .eq('currency', currency);

    if (transaction_type) {
      query = query.eq('transaction_type', transaction_type);
    }

    if (start_date) {
      query = query.gte('created_at', start_date);
    }

    if (end_date) {
      query = query.lte('created_at', end_date);
    }

    query = query.order('created_at', { ascending: false });
    
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + parseInt(limit) - 1);

    const { data: transactions, error, count } = await query;

    if (error) {
      console.error('Wallet transactions fetch error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch wallet transactions',
        code: 'TRANSACTIONS_FETCH_ERROR'
      });
    }

    res.json({
      success: true,
      data: {
        transactions,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count,
          total_pages: Math.ceil(count / limit)
        }
      }
    });

  } catch (error) {
    console.error('Wallet transactions error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// =============================================================================
// ERROR HANDLING MIDDLEWARE
// =============================================================================
router.use((error, req, res, _next) => {
  console.error('Payments API Error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    code: 'INTERNAL_ERROR'
  });
});

module.exports = router; 