-- ============================================================
-- FIX PAYMENT SETTINGS CONSTRAINT - SAMIA TAROT
-- Add support for Apple Pay and Google Pay as gateway methods
-- ============================================================

-- Step 1: Drop the existing constraint
ALTER TABLE payment_settings DROP CONSTRAINT IF EXISTS payment_settings_method_check;

-- Step 2: Add updated constraint with Apple Pay and Google Pay
ALTER TABLE payment_settings ADD CONSTRAINT payment_settings_method_check CHECK (
  method IN (
    'stripe', 'square', 'usdt', 'western_union', 'moneygram',
    'ria', 'omt', 'whish', 'bob', 'wallet',
    'apple_pay', 'google_pay'
  )
);

-- Step 3: Update any existing records if needed
-- (This is safe since we're only adding new allowed values)

-- Step 4: Verify the constraint is working
DO $$
BEGIN
    -- Test inserting a valid method
    BEGIN
        INSERT INTO payment_settings (method, enabled, details, processing_time) 
        VALUES ('test_method_valid', true, '{"test": true}', 'Test')
        ON CONFLICT (method) DO NOTHING;
        
        -- If we get here, constraint is not working properly
        DELETE FROM payment_settings WHERE method = 'test_method_valid';
        RAISE EXCEPTION 'Constraint is not working - invalid method was allowed!';
    EXCEPTION WHEN check_violation THEN
        RAISE NOTICE 'SUCCESS: Payment settings constraint is working correctly';
    END;
END $$;

-- Step 5: Insert Apple Pay configuration (gateway-dependent)
INSERT INTO payment_settings (
    method, 
    enabled, 
    countries, 
    details, 
    fees, 
    processing_time, 
    auto_confirm, 
    requires_receipt, 
    display_order
) VALUES (
    'apple_pay', 
    true, 
    ARRAY['DEPENDS_ON_GATEWAY'], 
    '{"depends_on": ["stripe", "square"], "description": "Apple Pay via gateway", "gateway_feature": true}',
    '{"inherited": true, "description": "Same as gateway"}',
    'Instant', 
    true, 
    false, 
    11
) ON CONFLICT (method) DO UPDATE SET
    enabled = EXCLUDED.enabled,
    countries = EXCLUDED.countries,
    details = EXCLUDED.details,
    fees = EXCLUDED.fees,
    processing_time = EXCLUDED.processing_time,
    auto_confirm = EXCLUDED.auto_confirm,
    requires_receipt = EXCLUDED.requires_receipt,
    display_order = EXCLUDED.display_order,
    updated_at = NOW();

-- Step 6: Insert Google Pay configuration (gateway-dependent)
INSERT INTO payment_settings (
    method, 
    enabled, 
    countries, 
    details, 
    fees, 
    processing_time, 
    auto_confirm, 
    requires_receipt, 
    display_order
) VALUES (
    'google_pay', 
    true, 
    ARRAY['DEPENDS_ON_GATEWAY'], 
    '{"depends_on": ["stripe", "square"], "description": "Google Pay via gateway", "gateway_feature": true}',
    '{"inherited": true, "description": "Same as gateway"}',
    'Instant', 
    true, 
    false, 
    12
) ON CONFLICT (method) DO UPDATE SET
    enabled = EXCLUDED.enabled,
    countries = EXCLUDED.countries,
    details = EXCLUDED.details,
    fees = EXCLUDED.fees,
    processing_time = EXCLUDED.processing_time,
    auto_confirm = EXCLUDED.auto_confirm,
    requires_receipt = EXCLUDED.requires_receipt,
    display_order = EXCLUDED.display_order,
    updated_at = NOW();

-- Step 7: Update payment method validation function
CREATE OR REPLACE FUNCTION validate_payment_method(user_country_code VARCHAR(3), payment_method VARCHAR(32))
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  is_valid BOOLEAN := false;
  gateway_methods TEXT[] := ARRAY['stripe', 'square'];
BEGIN
  -- Handle gateway-dependent methods (Apple Pay, Google Pay)
  IF payment_method IN ('apple_pay', 'google_pay') THEN
    -- Check if any gateway that supports this method is available for the country
    SELECT true INTO is_valid
    FROM payment_settings ps
    JOIN payment_regions pr ON user_country_code = pr.country_code
    WHERE ps.method = ANY(gateway_methods)
      AND ps.enabled = true
      AND (
        ps.method = ANY(pr.available_methods) OR
        'GLOBAL' = ANY(ps.countries) OR
        user_country_code = ANY(ps.countries)
      )
      AND ps.details->>'supports_' || payment_method = 'true';
  ELSE
    -- Handle regular payment methods
    SELECT true INTO is_valid
    FROM payment_settings ps
    JOIN payment_regions pr ON user_country_code = pr.country_code
    WHERE ps.method = payment_method
      AND ps.enabled = true
      AND (
        ps.method = ANY(pr.available_methods) OR
        'GLOBAL' = ANY(ps.countries) OR
        user_country_code = ANY(ps.countries)
      );
  END IF;
  
  RETURN COALESCE(is_valid, false);
END;
$$;

-- Step 8: Create function to get available payment methods including gateway features
CREATE OR REPLACE FUNCTION get_available_payment_methods_with_features(user_country_code VARCHAR(3))
RETURNS TABLE(
  method VARCHAR(32),
  enabled BOOLEAN,
  details JSONB,
  fees JSONB,
  processing_time VARCHAR(100),
  auto_confirm BOOLEAN,
  requires_receipt BOOLEAN,
  display_order INTEGER,
  is_gateway_feature BOOLEAN
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ps.method,
    ps.enabled,
    ps.details,
    ps.fees,
    ps.processing_time,
    ps.auto_confirm,
    ps.requires_receipt,
    ps.display_order,
    COALESCE((ps.details->>'gateway_feature')::boolean, false) as is_gateway_feature
  FROM payment_settings ps
  JOIN payment_regions pr ON user_country_code = pr.country_code
  WHERE ps.enabled = true
    AND (
      -- Regular methods
      (ps.method = ANY(pr.available_methods) OR
       'GLOBAL' = ANY(ps.countries) OR
       user_country_code = ANY(ps.countries)) OR
      -- Gateway features (apple_pay, google_pay) if gateway is available
      (ps.details->>'gateway_feature' = 'true' AND
       EXISTS (
         SELECT 1 FROM payment_settings gateway_ps
         JOIN UNNEST(ARRAY['stripe', 'square']) AS gateway_method ON gateway_ps.method = gateway_method
         WHERE gateway_ps.enabled = true
           AND (gateway_ps.method = ANY(pr.available_methods) OR
                'GLOBAL' = ANY(gateway_ps.countries) OR
                user_country_code = ANY(gateway_ps.countries))
           AND gateway_ps.details->>'supports_' || ps.method = 'true'
       ))
    )
  ORDER BY ps.display_order ASC;
END;
$$;

-- Step 9: Add comment to document the new methods
COMMENT ON CONSTRAINT payment_settings_method_check ON payment_settings IS 
'Allows all payment methods including gateway features: stripe, square, usdt, western_union, moneygram, ria, omt, whish, bob, wallet, apple_pay, google_pay';

-- Step 10: Final success messages
DO $$
BEGIN
    RAISE NOTICE '✅ Payment settings constraint updated successfully';
    RAISE NOTICE '✅ Apple Pay and Google Pay are now supported as gateway features';
    RAISE NOTICE '✅ Updated validation functions to handle gateway-dependent methods';
END $$; 