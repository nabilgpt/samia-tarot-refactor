-- ============================================================
-- SAMIA TAROT - AUTO-POPULATE DEFAULT PAYMENT METHODS
-- ============================================================
-- This function automatically populates default payment methods
-- if the payment_settings table is empty (first setup)
-- ============================================================

-- Create the auto-population function
CREATE OR REPLACE FUNCTION auto_populate_default_payment_methods()
RETURNS TABLE(
  method_name VARCHAR(32),
  status TEXT,
  message TEXT
) 
LANGUAGE plpgsql
AS $$
DECLARE
  method_count INTEGER;
  insert_result RECORD;
  method_record RECORD;
BEGIN
  -- Check if payment_settings table has any records
  SELECT COUNT(*) INTO method_count FROM payment_settings;
  
  -- If table is not empty, return early
  IF method_count > 0 THEN
    RETURN QUERY SELECT 
      'system'::VARCHAR(32) as method_name,
      'skipped'::TEXT as status,
      format('Payment methods already exist (%s methods found)', method_count)::TEXT as message;
    RETURN;
  END IF;
  
  -- Log start of population
  RETURN QUERY SELECT 
    'system'::VARCHAR(32) as method_name,
    'info'::TEXT as status,
    'Starting auto-population of default payment methods'::TEXT as message;

  -- Insert all default payment methods
  BEGIN
    -- 1. Stripe (Card processor for EU/UAE)
    INSERT INTO payment_settings (
      method, enabled, countries, details, fees, processing_time, 
      auto_confirm, requires_receipt, display_order
    ) VALUES (
      'stripe', true, 
      ARRAY['DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'AT', 'PT', 'IE', 'LU', 'AE'],
      '{"description": "Credit/Debit Card via Stripe", "icon": "credit-card", "color": "#635BFF", "supports_apple_pay": true, "supports_google_pay": true, "gateway_type": "card_processor"}',
      '{"percentage": 2.9, "fixed": 0.30, "currency": "USD", "description": "Standard processing fee"}',
      'Instant', true, false, 1
    );
    
    RETURN QUERY SELECT 'stripe'::VARCHAR(32), 'success'::TEXT, 'Stripe payment method inserted'::TEXT;
    
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 'stripe'::VARCHAR(32), 'error'::TEXT, SQLERRM::TEXT;
  END;

  BEGIN
    -- 2. Square (Card processor for US/CA/AU/GB/JP)
    INSERT INTO payment_settings (
      method, enabled, countries, details, fees, processing_time, 
      auto_confirm, requires_receipt, display_order
    ) VALUES (
      'square', true,
      ARRAY['US', 'CA', 'AU', 'GB', 'JP'],
      '{"description": "Credit/Debit Card via Square", "icon": "credit-card", "color": "#3E4348", "supports_apple_pay": true, "supports_google_pay": true, "gateway_type": "card_processor"}',
      '{"percentage": 2.6, "fixed": 0.10, "currency": "USD", "description": "Standard processing fee"}',
      'Instant', true, false, 2
    );
    
    RETURN QUERY SELECT 'square'::VARCHAR(32), 'success'::TEXT, 'Square payment method inserted'::TEXT;
    
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 'square'::VARCHAR(32), 'error'::TEXT, SQLERRM::TEXT;
  END;

  BEGIN
    -- 3. Apple Pay (Gateway feature)
    INSERT INTO payment_settings (
      method, enabled, countries, details, fees, processing_time, 
      auto_confirm, requires_receipt, display_order
    ) VALUES (
      'apple_pay', true,
      ARRAY['DEPENDS_ON_GATEWAY'],
      '{"description": "Apple Pay via Gateway", "icon": "smartphone", "color": "#000000", "gateway_feature": true, "depends_on": ["stripe", "square"], "device_requirement": "iOS"}',
      '{"inherited": true, "description": "Same as gateway"}',
      'Instant', true, false, 3
    );
    
    RETURN QUERY SELECT 'apple_pay'::VARCHAR(32), 'success'::TEXT, 'Apple Pay method inserted'::TEXT;
    
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 'apple_pay'::VARCHAR(32), 'error'::TEXT, SQLERRM::TEXT;
  END;

  BEGIN
    -- 4. Google Pay (Gateway feature)
    INSERT INTO payment_settings (
      method, enabled, countries, details, fees, processing_time, 
      auto_confirm, requires_receipt, display_order
    ) VALUES (
      'google_pay', true,
      ARRAY['DEPENDS_ON_GATEWAY'],
      '{"description": "Google Pay via Gateway", "icon": "smartphone", "color": "#4285F4", "gateway_feature": true, "depends_on": ["stripe", "square"], "device_requirement": "Android"}',
      '{"inherited": true, "description": "Same as gateway"}',
      'Instant', true, false, 4
    );
    
    RETURN QUERY SELECT 'google_pay'::VARCHAR(32), 'success'::TEXT, 'Google Pay method inserted'::TEXT;
    
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 'google_pay'::VARCHAR(32), 'error'::TEXT, SQLERRM::TEXT;
  END;

  BEGIN
    -- 5. USDT (Cryptocurrency)
    INSERT INTO payment_settings (
      method, enabled, countries, details, fees, processing_time, 
      auto_confirm, requires_receipt, display_order
    ) VALUES (
      'usdt', true,
      ARRAY['GLOBAL'],
      '{"description": "USDT Cryptocurrency", "icon": "coins", "color": "#26A17B", "networks": ["ethereum", "tron"], "wallet_addresses": {"ethereum": "", "tron": ""}, "requires_wallet": true}',
      '{"type": "network", "description": "Network fees only (varies by network)"}',
      '5-15 minutes', false, true, 5
    );
    
    RETURN QUERY SELECT 'usdt'::VARCHAR(32), 'success'::TEXT, 'USDT cryptocurrency method inserted'::TEXT;
    
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 'usdt'::VARCHAR(32), 'error'::TEXT, SQLERRM::TEXT;
  END;

  BEGIN
    -- 6. Western Union (International transfer)
    INSERT INTO payment_settings (
      method, enabled, countries, details, fees, processing_time, 
      auto_confirm, requires_receipt, display_order
    ) VALUES (
      'western_union', true,
      ARRAY['GLOBAL'],
      '{"description": "Western Union Money Transfer", "icon": "send", "color": "#FFCC00", "requires_id": true, "transfer_type": "international", "pickup_locations": "worldwide"}',
      '{"range": "5-15", "currency": "USD", "description": "Transfer fee (varies by destination)"}',
      '1-3 business days', false, true, 6
    );
    
    RETURN QUERY SELECT 'western_union'::VARCHAR(32), 'success'::TEXT, 'Western Union method inserted'::TEXT;
    
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 'western_union'::VARCHAR(32), 'error'::TEXT, SQLERRM::TEXT;
  END;

  BEGIN
    -- 7. MoneyGram (International transfer)
    INSERT INTO payment_settings (
      method, enabled, countries, details, fees, processing_time, 
      auto_confirm, requires_receipt, display_order
    ) VALUES (
      'moneygram', true,
      ARRAY['GLOBAL'],
      '{"description": "MoneyGram International Transfer", "icon": "send", "color": "#E31837", "requires_id": true, "transfer_type": "international", "pickup_locations": "worldwide"}',
      '{"range": "5-12", "currency": "USD", "description": "Transfer fee (varies by destination)"}',
      '1-3 business days', false, true, 7
    );
    
    RETURN QUERY SELECT 'moneygram'::VARCHAR(32), 'success'::TEXT, 'MoneyGram method inserted'::TEXT;
    
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 'moneygram'::VARCHAR(32), 'error'::TEXT, SQLERRM::TEXT;
  END;

  BEGIN
    -- 8. Ria (International transfer)
    INSERT INTO payment_settings (
      method, enabled, countries, details, fees, processing_time, 
      auto_confirm, requires_receipt, display_order
    ) VALUES (
      'ria', true,
      ARRAY['GLOBAL'],
      '{"description": "Ria Money Transfer Service", "icon": "send", "color": "#FF6B35", "requires_id": true, "transfer_type": "international", "pickup_locations": "worldwide"}',
      '{"range": "3-10", "currency": "USD", "description": "Transfer fee (varies by destination)"}',
      '1-2 business days', false, true, 8
    );
    
    RETURN QUERY SELECT 'ria'::VARCHAR(32), 'success'::TEXT, 'Ria transfer method inserted'::TEXT;
    
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 'ria'::VARCHAR(32), 'error'::TEXT, SQLERRM::TEXT;
  END;

  BEGIN
    -- 9. OMT (Lebanon-specific)
    INSERT INTO payment_settings (
      method, enabled, countries, details, fees, processing_time, 
      auto_confirm, requires_receipt, display_order
    ) VALUES (
      'omt', true,
      ARRAY['LB'],
      '{"description": "OMT Lebanon Money Transfer", "icon": "building-2", "color": "#1E40AF", "local_currency": "LBP", "region_specific": true, "country": "Lebanon"}',
      '{"range": "2-5", "currency": "USD", "description": "Local transfer fee"}',
      'Same day', false, true, 9
    );
    
    RETURN QUERY SELECT 'omt'::VARCHAR(32), 'success'::TEXT, 'OMT Lebanon method inserted'::TEXT;
    
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 'omt'::VARCHAR(32), 'error'::TEXT, SQLERRM::TEXT;
  END;

  BEGIN
    -- 10. Whish (Lebanon-specific digital wallet)
    INSERT INTO payment_settings (
      method, enabled, countries, details, fees, processing_time, 
      auto_confirm, requires_receipt, display_order
    ) VALUES (
      'whish', true,
      ARRAY['LB'],
      '{"description": "Whish Money Digital Wallet", "icon": "wallet", "color": "#8B5CF6", "local_currency": "LBP", "region_specific": true, "country": "Lebanon", "digital_wallet": true}',
      '{"percentage": 1.5, "description": "Transaction fee"}',
      'Instant', false, true, 10
    );
    
    RETURN QUERY SELECT 'whish'::VARCHAR(32), 'success'::TEXT, 'Whish digital wallet method inserted'::TEXT;
    
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 'whish'::VARCHAR(32), 'error'::TEXT, SQLERRM::TEXT;
  END;

  BEGIN
    -- 11. BOB (Bank of Beirut - Lebanon-specific)
    INSERT INTO payment_settings (
      method, enabled, countries, details, fees, processing_time, 
      auto_confirm, requires_receipt, display_order
    ) VALUES (
      'bob', true,
      ARRAY['LB'],
      '{"description": "Bank of Beirut Direct Transfer", "icon": "building-2", "color": "#059669", "local_currency": "LBP", "region_specific": true, "country": "Lebanon", "bank_transfer": true}',
      '{"fixed": 0, "description": "No additional fees"}',
      '1-2 business days', false, true, 11
    );
    
    RETURN QUERY SELECT 'bob'::VARCHAR(32), 'success'::TEXT, 'Bank of Beirut method inserted'::TEXT;
    
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 'bob'::VARCHAR(32), 'error'::TEXT, SQLERRM::TEXT;
  END;

  BEGIN
    -- 12. Wallet (In-app wallet)
    INSERT INTO payment_settings (
      method, enabled, countries, details, fees, processing_time, 
      auto_confirm, requires_receipt, display_order
    ) VALUES (
      'wallet', true,
      ARRAY['GLOBAL'],
      '{"description": "SAMIA In-App Wallet", "icon": "wallet", "color": "#7C3AED", "instant_payment": true, "internal_system": true, "balance_based": true}',
      '{"fixed": 0, "description": "No fees"}',
      'Instant', true, false, 12
    );
    
    RETURN QUERY SELECT 'wallet'::VARCHAR(32), 'success'::TEXT, 'In-app wallet method inserted'::TEXT;
    
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 'wallet'::VARCHAR(32), 'error'::TEXT, SQLERRM::TEXT;
  END;

  -- Final summary
  SELECT COUNT(*) INTO method_count FROM payment_settings;
  RETURN QUERY SELECT 
    'system'::VARCHAR(32) as method_name,
    'completed'::TEXT as status,
    format('Auto-population completed. Total payment methods: %s', method_count)::TEXT as message;

END;
$$;

-- ============================================================
-- CREATE SYSTEM INITIALIZATION CHECK FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION check_and_populate_payment_methods()
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  method_count INTEGER;
  result_record RECORD;
BEGIN
  -- Check if payment_settings table exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'payment_settings'
  ) THEN
    RAISE NOTICE 'payment_settings table does not exist. Skipping auto-population.';
    RETURN FALSE;
  END IF;

  -- Check if table is empty
  SELECT COUNT(*) INTO method_count FROM payment_settings;
  
  IF method_count = 0 THEN
    RAISE NOTICE 'Payment settings table is empty. Auto-populating default methods...';
    
    -- Call the population function
    FOR result_record IN 
      SELECT * FROM auto_populate_default_payment_methods()
    LOOP
      RAISE NOTICE '[%] %: %', result_record.method_name, result_record.status, result_record.message;
    END LOOP;
    
    RETURN TRUE;
  ELSE
    RAISE NOTICE 'Payment methods already exist (% methods found). Skipping auto-population.', method_count;
    RETURN FALSE;
  END IF;
END;
$$;

-- ============================================================
-- CREATE UTILITY FUNCTION FOR ADDING NEW METHODS
-- ============================================================

CREATE OR REPLACE FUNCTION add_new_payment_method(
  p_method VARCHAR(32),
  p_enabled BOOLEAN DEFAULT true,
  p_countries TEXT[] DEFAULT ARRAY[]::TEXT[],
  p_details JSONB DEFAULT '{}'::JSONB,
  p_fees JSONB DEFAULT '{}'::JSONB,
  p_processing_time VARCHAR(100) DEFAULT 'Unknown',
  p_auto_confirm BOOLEAN DEFAULT false,
  p_requires_receipt BOOLEAN DEFAULT false,
  p_display_order INTEGER DEFAULT 0
)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT,
  method_id INTEGER
) 
LANGUAGE plpgsql
AS $$
DECLARE
  new_id INTEGER;
BEGIN
  BEGIN
    INSERT INTO payment_settings (
      method, enabled, countries, details, fees, processing_time,
      auto_confirm, requires_receipt, display_order
    ) VALUES (
      p_method, p_enabled, p_countries, p_details, p_fees, p_processing_time,
      p_auto_confirm, p_requires_receipt, p_display_order
    ) RETURNING id INTO new_id;
    
    RETURN QUERY SELECT 
      TRUE as success,
      format('Payment method "%s" added successfully', p_method) as message,
      new_id as method_id;
      
  EXCEPTION 
    WHEN unique_violation THEN
      RETURN QUERY SELECT 
        FALSE as success,
        format('Payment method "%s" already exists', p_method) as message,
        NULL::INTEGER as method_id;
    WHEN OTHERS THEN
      RETURN QUERY SELECT 
        FALSE as success,
        format('Error adding payment method "%s": %s', p_method, SQLERRM) as message,
        NULL::INTEGER as method_id;
  END;
END;
$$;

-- ============================================================
-- CREATE VERIFICATION FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION verify_payment_methods_setup()
RETURNS TABLE(
  total_methods INTEGER,
  enabled_methods INTEGER,
  disabled_methods INTEGER,
  method_list TEXT
) 
LANGUAGE plpgsql
AS $$
DECLARE
  total_count INTEGER;
  enabled_count INTEGER;
  disabled_count INTEGER;
  methods_text TEXT;
BEGIN
  -- Get counts
  SELECT COUNT(*) INTO total_count FROM payment_settings;
  SELECT COUNT(*) INTO enabled_count FROM payment_settings WHERE enabled = true;
  SELECT COUNT(*) INTO disabled_count FROM payment_settings WHERE enabled = false;
  
  -- Get method list
  SELECT string_agg(
    format('%s (%s)', method, CASE WHEN enabled THEN 'enabled' ELSE 'disabled' END), 
    ', ' ORDER BY display_order
  ) INTO methods_text FROM payment_settings;
  
  RETURN QUERY SELECT 
    total_count as total_methods,
    enabled_count as enabled_methods,
    disabled_count as disabled_methods,
    COALESCE(methods_text, 'No methods found') as method_list;
END;
$$;

-- ============================================================
-- COMMENTS AND USAGE INSTRUCTIONS
-- ============================================================

COMMENT ON FUNCTION auto_populate_default_payment_methods() IS 
'Automatically populates all 12 default payment methods if payment_settings table is empty. Returns detailed status for each method.';

COMMENT ON FUNCTION check_and_populate_payment_methods() IS 
'Checks if payment methods need to be populated and does so automatically. Returns TRUE if population occurred, FALSE otherwise.';

COMMENT ON FUNCTION add_new_payment_method(VARCHAR, BOOLEAN, TEXT[], JSONB, JSONB, VARCHAR, BOOLEAN, BOOLEAN, INTEGER) IS 
'Utility function to add new payment methods in the future. Handles duplicates gracefully.';

COMMENT ON FUNCTION verify_payment_methods_setup() IS 
'Returns a summary of the current payment methods configuration for verification purposes.';

-- ============================================================
-- USAGE EXAMPLES
-- ============================================================

/*
-- To manually trigger auto-population:
SELECT * FROM auto_populate_default_payment_methods();

-- To check and auto-populate if needed:
SELECT check_and_populate_payment_methods();

-- To verify current setup:
SELECT * FROM verify_payment_methods_setup();

-- To add a new payment method:
SELECT * FROM add_new_payment_method(
  'new_method', 
  true, 
  ARRAY['US', 'CA'], 
  '{"description": "New Payment Method"}',
  '{"percentage": 3.0}',
  'Instant',
  true,
  false,
  13
);
*/ 