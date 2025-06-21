const { supabase, supabaseAdmin } = require('../lib/supabase');
const { populateDefaultPaymentMethods } = require('../scripts/populate-default-payment-methods');

// =====================================================
// PAYMENT METHODS INITIALIZATION MIDDLEWARE
// =====================================================

/**
 * Check if payment methods are populated and auto-populate if needed
 * This runs on system initialization to ensure all default payment methods exist
 */
async function initializePaymentMethods() {
  try {
    console.log('🔍 Checking payment methods initialization...');

    // Check if payment_settings table exists by trying to query it
    let tableExists = false;
    try {
      const { error: testError } = await supabaseAdmin
        .from('payment_settings')
        .select('*', { count: 'exact', head: true })
        .limit(1);
      
      tableExists = !testError || !testError.message.includes('does not exist');
    } catch (e) {
      tableExists = false;
    }

    if (!tableExists) {
      console.log('⚠️  payment_settings table does not exist. Skipping auto-population.');
      return false;
    }

    // Check if payment methods exist
    const { count, error: countError } = await supabaseAdmin
      .from('payment_settings')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.log('⚠️  Error checking payment methods count:', countError.message);
      return false;
    }

    if (count === 0) {
      console.log('📋 Payment settings table is empty. Auto-populating default methods...');
      
      // Use the script to populate methods
      const result = await populateDefaultPaymentMethods();
      
      if (result.success && result.populated > 0) {
        console.log(`✅ Successfully auto-populated ${result.populated} payment methods`);
        return true;
      } else {
        console.log('⚠️  Auto-population completed but no methods were added');
        return false;
      }
    } else {
      console.log(`✅ Payment methods already exist (${count} methods found). System ready.`);
      
      // Verify and display current methods for startup confirmation
      const verification = await verifyPaymentMethodsSetup();
      if (verification.success) {
        console.log(`🎉 Payment system initialized with ${verification.enabled}/${verification.count} methods enabled`);
      }
      
      return true; // Changed from false to true since having existing methods is a success state
    }

  } catch (error) {
    console.error('💥 Error during payment methods initialization:', error);
    return false;
  }
}

/**
 * Verify payment methods setup and log status
 */
async function verifyPaymentMethodsSetup() {
  try {
    const { data, error } = await supabaseAdmin
      .from('payment_settings')
      .select('method, enabled, display_order, details')
      .order('display_order');

    if (error) {
      console.error('❌ Error verifying payment methods:', error);
      return { success: false, count: 0 };
    }

    if (!data || data.length === 0) {
      console.log('❌ No payment methods found!');
      return { success: false, count: 0 };
    }

    console.log('\n📋 CURRENT PAYMENT METHODS STATUS:');
    console.log('='.repeat(50));
    
    let enabledCount = 0;
    data.forEach((method, index) => {
      const status = method.enabled ? '✅' : '❌';
      const description = method.details?.description || 'No description';
      console.log(`${index + 1}. ${status} ${method.method.toUpperCase()} - ${description}`);
      if (method.enabled) enabledCount++;
    });

    console.log('='.repeat(50));
    console.log(`📊 Total: ${data.length} methods | Enabled: ${enabledCount} | Disabled: ${data.length - enabledCount}`);
    
    return { success: true, count: data.length, enabled: enabledCount, methods: data };
  } catch (error) {
    console.error('Error verifying payment methods setup:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Express middleware to ensure payment methods are initialized
 * This can be used as application-level middleware
 */
function ensurePaymentMethodsMiddleware(req, res, next) {
  // Skip initialization check for non-admin routes to avoid performance impact
  if (!req.path.includes('/admin') && !req.path.includes('/payment')) {
    return next();
  }

  // Check if we've already initialized in this session
  if (global.paymentMethodsInitialized) {
    return next();
  }

  // Run initialization asynchronously
  initializePaymentMethods()
    .then((initialized) => {
      global.paymentMethodsInitialized = true;
      if (initialized) {
        console.log('🎉 Payment methods auto-population completed successfully');
      }
      next();
    })
    .catch((error) => {
      console.error('💥 Payment methods initialization failed:', error);
      // Don't block the request, just log the error
      global.paymentMethodsInitialized = true;
      next();
    });
}

/**
 * Manual trigger for payment methods initialization
 * Can be called from admin endpoints or startup scripts
 */
async function triggerPaymentMethodsInit() {
  console.log('🚀 Manually triggering payment methods initialization...');
  
  try {
    const initialized = await initializePaymentMethods();
    const verification = await verifyPaymentMethodsSetup();
    
    return {
      success: true,
      initialized,
      verification,
      message: initialized 
        ? 'Payment methods auto-populated successfully' 
        : 'Payment methods already exist'
    };
  } catch (error) {
    console.error('Error in manual payment methods initialization:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Check payment methods status (for health checks)
 */
async function checkPaymentMethodsStatus() {
  try {
    const { count, error } = await supabaseAdmin
      .from('payment_settings')
      .select('*', { count: 'exact', head: true });

    if (error) {
      return {
        status: 'error',
        message: 'Could not check payment methods',
        error: error.message
      };
    }

    if (count === 0) {
      return {
        status: 'empty',
        message: 'No payment methods configured',
        count: 0
      };
    }

    // Check enabled methods
    const { count: enabledCount, error: enabledError } = await supabaseAdmin
      .from('payment_settings')
      .select('*', { count: 'exact', head: true })
      .eq('enabled', true);

    if (enabledError) {
      return {
        status: 'partial',
        message: 'Could not check enabled methods',
        count,
        error: enabledError.message
      };
    }

    return {
      status: 'healthy',
      message: 'Payment methods configured',
      total: count,
      enabled: enabledCount,
      disabled: count - enabledCount
    };

  } catch (error) {
    return {
      status: 'error',
      message: 'Payment methods check failed',
      error: error.message
    };
  }
}

// =====================================================
// STARTUP INITIALIZATION
// =====================================================

/**
 * Initialize payment methods on module load (for server startup)
 */
async function startupInitialization() {
  // Only run on server startup, not on every module require
  if (process.env.NODE_ENV !== 'test' && !global.paymentMethodsStartupComplete) {
    console.log('🌟 SAMIA TAROT - Payment Methods Startup Check');
    console.log('='.repeat(60));
    
    try {
      const initialized = await initializePaymentMethods();
      await verifyPaymentMethodsSetup();
      
      global.paymentMethodsStartupComplete = true;
      
      if (initialized) {
        console.log('✨ Payment methods auto-population completed on startup!');
      } else {
        console.log('✨ Payment methods startup check completed!');
      }
      
    } catch (error) {
      console.error('💥 Payment methods startup initialization failed:', error);
    }
    
    console.log('='.repeat(60));
  }
}

// Run startup initialization
startupInitialization();

// =====================================================
// EXPORTS
// =====================================================

module.exports = {
  initializePaymentMethods,
  verifyPaymentMethodsSetup,
  ensurePaymentMethodsMiddleware,
  triggerPaymentMethodsInit,
  checkPaymentMethodsStatus
}; 