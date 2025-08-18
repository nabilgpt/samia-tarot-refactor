import { supabaseAdmin } from '../lib/supabase.js';

// =====================================================
// DEFAULT PAYMENT METHODS CONFIGURATION
// =====================================================

const DEFAULT_PAYMENT_METHODS = [
  // Card Payment Methods
  {
    method: 'stripe',
    enabled: true,
    countries: ['DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'AT', 'PT', 'IE', 'LU', 'AE'],
    details: {
      description: 'Credit/Debit Card via Stripe',
      icon: 'credit-card',
      color: '#635BFF',
      supports_apple_pay: true,
      supports_google_pay: true,
      gateway_type: 'card_processor'
    },
    fees: {
      percentage: 2.9,
      fixed: 0.30,
      currency: 'USD',
      description: 'Standard processing fee'
    },
    processing_time: 'Instant',
    auto_confirm: true,
    requires_receipt: false,
    display_order: 1
  },
  {
    method: 'square',
    enabled: true,
    countries: ['US', 'CA', 'AU', 'GB', 'JP'],
    details: {
      description: 'Credit/Debit Card via Square',
      icon: 'credit-card',
      color: '#3E4348',
      supports_apple_pay: true,
      supports_google_pay: true,
      gateway_type: 'card_processor'
    },
    fees: {
      percentage: 2.6,
      fixed: 0.10,
      currency: 'USD',
      description: 'Standard processing fee'
    },
    processing_time: 'Instant',
    auto_confirm: true,
    requires_receipt: false,
    display_order: 2
  },
  
  // Digital Wallets (Gateway Features)
  {
    method: 'apple_pay',
    enabled: true,
    countries: ['DEPENDS_ON_GATEWAY'],
    details: {
      description: 'Apple Pay via Gateway',
      icon: 'smartphone',
      color: '#000000',
      gateway_feature: true,
      depends_on: ['stripe', 'square'],
      device_requirement: 'iOS'
    },
    fees: {
      inherited: true,
      description: 'Same as gateway'
    },
    processing_time: 'Instant',
    auto_confirm: true,
    requires_receipt: false,
    display_order: 3
  },
  {
    method: 'google_pay',
    enabled: true,
    countries: ['DEPENDS_ON_GATEWAY'],
    details: {
      description: 'Google Pay via Gateway',
      icon: 'smartphone',
      color: '#4285F4',
      gateway_feature: true,
      depends_on: ['stripe', 'square'],
      device_requirement: 'Android'
    },
    fees: {
      inherited: true,
      description: 'Same as gateway'
    },
    processing_time: 'Instant',
    auto_confirm: true,
    requires_receipt: false,
    display_order: 4
  },

  // Cryptocurrency
  {
    method: 'usdt',
    enabled: true,
    countries: ['GLOBAL'],
    details: {
      description: 'USDT Cryptocurrency',
      icon: 'coins',
      color: '#26A17B',
      networks: ['ethereum', 'tron'],
      wallet_addresses: {
        ethereum: '',
        tron: ''
      },
      requires_wallet: true
    },
    fees: {
      type: 'network',
      description: 'Network fees only (varies by network)'
    },
    processing_time: '5-15 minutes',
    auto_confirm: false,
    requires_receipt: true,
    display_order: 5
  },

  // International Transfer Services
  {
    method: 'western_union',
    enabled: true,
    countries: ['GLOBAL'],
    details: {
      description: 'Western Union Money Transfer',
      icon: 'send',
      color: '#FFCC00',
      requires_id: true,
      transfer_type: 'international',
      pickup_locations: 'worldwide'
    },
    fees: {
      range: '5-15',
      currency: 'USD',
      description: 'Transfer fee (varies by destination)'
    },
    processing_time: '1-3 business days',
    auto_confirm: false,
    requires_receipt: true,
    display_order: 6
  },
  {
    method: 'moneygram',
    enabled: true,
    countries: ['GLOBAL'],
    details: {
      description: 'MoneyGram International Transfer',
      icon: 'send',
      color: '#E31837',
      requires_id: true,
      transfer_type: 'international',
      pickup_locations: 'worldwide'
    },
    fees: {
      range: '5-12',
      currency: 'USD',
      description: 'Transfer fee (varies by destination)'
    },
    processing_time: '1-3 business days',
    auto_confirm: false,
    requires_receipt: true,
    display_order: 7
  },
  {
    method: 'ria',
    enabled: true,
    countries: ['GLOBAL'],
    details: {
      description: 'Ria Money Transfer Service',
      icon: 'send',
      color: '#FF6B35',
      requires_id: true,
      transfer_type: 'international',
      pickup_locations: 'worldwide'
    },
    fees: {
      range: '3-10',
      currency: 'USD',
      description: 'Transfer fee (varies by destination)'
    },
    processing_time: '1-2 business days',
    auto_confirm: false,
    requires_receipt: true,
    display_order: 8
  },

  // Lebanon-specific Methods
  {
    method: 'omt',
    enabled: true,
    countries: ['LB'],
    details: {
      description: 'OMT Lebanon Money Transfer',
      icon: 'building-bank',
      color: '#0066CC',
      requires_id: true,
      transfer_type: 'domestic',
      local_service: true
    },
    fees: {
      range: '2-5',
      currency: 'USD',
      description: 'Local transfer fee'
    },
    processing_time: 'Same day',
    auto_confirm: false,
    requires_receipt: true,
    display_order: 9
  },
  {
    method: 'whish',
    enabled: true,
    countries: ['LB'],
    details: {
      description: 'Whish Money Digital Wallet',
      icon: 'wallet',
      color: '#FF4500',
      digital_wallet: true,
      local_service: true
    },
    fees: {
      percentage: 1.5,
      currency: 'USD',
      description: 'Digital wallet fee'
    },
    processing_time: 'Instant',
    auto_confirm: true,
    requires_receipt: false,
    display_order: 10
  },
  {
    method: 'bob',
    enabled: true,
    countries: ['LB'],
    details: {
      description: 'Bank of Beirut Direct Transfer',
      icon: 'building-bank',
      color: '#003366',
      bank_transfer: true,
      local_service: true
    },
    fees: {
      fixed: 2.00,
      currency: 'USD',
      description: 'Bank transfer fee'
    },
    processing_time: '1-2 hours',
    auto_confirm: false,
    requires_receipt: true,
    display_order: 11
  },

  // Platform Wallet
  {
    method: 'wallet',
    enabled: true,
    countries: ['GLOBAL'],
    details: {
      description: 'SAMIA In-App Wallet',
      icon: 'wallet',
      color: '#8B5CF6',
      platform_wallet: true,
      requires_topup: true
    },
    fees: {
      percentage: 0,
      description: 'No fees for wallet payments'
    },
    processing_time: 'Instant',
    auto_confirm: true,
    requires_receipt: false,
    display_order: 12
  }
];

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Check if payment_settings table is empty
 */
async function isPaymentSettingsEmpty() {
  try {
    const { count, error } = await supabaseAdmin
      .from('payment_settings')
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.error('Error checking payment_settings table:', error);
      return false;
    }

    return count === 0;
  } catch (error) {
    console.error('Error in isPaymentSettingsEmpty:', error);
    return false;
  }
}

/**
 * Insert a single payment method
 */
async function insertPaymentMethod(method) {
  try {
    const { data, error } = await supabaseAdmin
      .from('payment_settings')
      .insert(method)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        console.log(`⚠️  Payment method '${method.method}' already exists, skipping...`);
        return { success: true, skipped: true };
      }
      throw error;
    }

    console.log(`✅ Payment method '${method.method}' inserted successfully`);
    return { success: true, data };
  } catch (error) {
    console.error(`❌ Error inserting payment method '${method.method}':`, error);
    return { success: false, error: error.message };
  }
}

/**
 * Populate all default payment methods
 */
async function populateDefaultPaymentMethods() {
  console.log('🚀 Starting payment methods population...\n');

  try {
    // Check if table is empty
    const isEmpty = await isPaymentSettingsEmpty();
    
    if (!isEmpty) {
      console.log('ℹ️  Payment methods already exist. Skipping population.');
      console.log('💡 To force repopulation, clear the payment_settings table first.');
      return {
        success: true,
        message: 'Payment methods already exist',
        populated: 0
      };
    }

    console.log('📋 Payment settings table is empty. Populating default methods...\n');

    let successCount = 0;
    let errorCount = 0;
    const results = [];

    // Insert each payment method
    for (const method of DEFAULT_PAYMENT_METHODS) {
      console.log(`📝 Inserting ${method.method}...`);
      
      const result = await insertPaymentMethod(method);
      results.push({ method: method.method, ...result });
      
      if (result.success && !result.skipped) {
        successCount++;
      } else if (!result.success) {
        errorCount++;
      }
      
      // Small delay to avoid overwhelming the database
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log('\n' + '='.repeat(50));
    console.log('📊 POPULATION SUMMARY');
    console.log('='.repeat(50));
    console.log(`✅ Successfully inserted: ${successCount} methods`);
    console.log(`❌ Errors: ${errorCount} methods`);
    console.log(`📋 Total processed: ${DEFAULT_PAYMENT_METHODS.length} methods`);

    if (successCount > 0) {
      console.log('\n🎉 Default payment methods populated successfully!');
      console.log('🔧 Super Admin can now manage these methods in the Payment Settings panel.');
    }

    return {
      success: true,
      message: 'Payment methods population completed',
      populated: successCount,
      errors: errorCount,
      results
    };

  } catch (error) {
    console.error('💥 Fatal error during population:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Add new payment methods (utility for future additions)
 */
async function addNewPaymentMethods(newMethods) {
  console.log('🔄 Adding new payment methods...\n');

  let successCount = 0;
  let errorCount = 0;
  const results = [];

  for (const method of newMethods) {
    console.log(`📝 Adding ${method.method}...`);
    
    const result = await insertPaymentMethod(method);
    results.push({ method: method.method, ...result });
    
    if (result.success && !result.skipped) {
      successCount++;
    } else if (!result.success) {
      errorCount++;
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('📊 NEW METHODS SUMMARY');
  console.log('='.repeat(50));
  console.log(`✅ Successfully added: ${successCount} methods`);
  console.log(`❌ Errors: ${errorCount} methods`);

  return {
    success: true,
    added: successCount,
    errors: errorCount,
    results
  };
}

/**
 * Verify payment methods setup
 */
async function verifyPaymentMethodsSetup() {
  try {
    const { data, error } = await supabaseAdmin
      .from('payment_settings')
      .select('method, enabled, display_order')
      .order('display_order');

    if (error) throw error;

    console.log('\n📋 CURRENT PAYMENT METHODS:');
    console.log('='.repeat(40));
    
    if (!data || data.length === 0) {
      console.log('❌ No payment methods found!');
      return { success: false, count: 0 };
    }

    data.forEach((method, index) => {
      const status = method.enabled ? '✅' : '❌';
      console.log(`${index + 1}. ${status} ${method.method} (order: ${method.display_order})`);
    });

    console.log(`\n📊 Total: ${data.length} payment methods configured`);
    
    return { success: true, count: data.length, methods: data };
  } catch (error) {
    console.error('Error verifying setup:', error);
    return { success: false, error: error.message };
  }
}

// =====================================================
// MAIN EXECUTION
// =====================================================

async function main() {
  console.log('🌟 SAMIA TAROT - Payment Methods Auto-Population');
  console.log('='.repeat(60));
  
  try {
    // Populate default methods
    const result = await populateDefaultPaymentMethods();
    
    if (result.success) {
      // Verify the setup
      await verifyPaymentMethodsSetup();
    }
    
    console.log('\n✨ Payment methods setup completed!');
    process.exit(0);
  } catch (error) {
    console.error('💥 Script failed:', error);
    process.exit(1);
  }
}

// Export functions for use in other scripts
export {
  populateDefaultPaymentMethods,
  addNewPaymentMethods,
  verifyPaymentMethodsSetup,
  DEFAULT_PAYMENT_METHODS
};

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
} 