-- =====================================================
-- EXCHANGE RATES TABLE CREATION
-- =====================================================
-- This table stores exchange rates for multi-currency pricing display
-- All rates are relative to USD (base currency)

CREATE TABLE IF NOT EXISTS exchange_rates (
  id SERIAL PRIMARY KEY,
  currency_code VARCHAR(3) NOT NULL UNIQUE,
  currency_name VARCHAR(100) NOT NULL,
  rate DECIMAL(18, 8) NOT NULL, -- Exchange rate relative to USD
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_exchange_rates_currency_code ON exchange_rates(currency_code);
CREATE INDEX IF NOT EXISTS idx_exchange_rates_last_updated ON exchange_rates(last_updated);
CREATE INDEX IF NOT EXISTS idx_exchange_rates_active ON exchange_rates(is_active);

-- Insert default exchange rates (will be updated by cron job)
INSERT INTO exchange_rates (currency_code, currency_name, rate, last_updated) VALUES
  ('USD', 'US Dollar', 1.00000000, NOW()),
  ('AED', 'UAE Dirham', 3.67300000, NOW()),
  ('SAR', 'Saudi Riyal', 3.75000000, NOW()),
  ('EUR', 'Euro', 0.85000000, NOW()),
  ('LBP', 'Lebanese Pound', 89000.00000000, NOW()),
  ('EGP', 'Egyptian Pound', 30.90000000, NOW()),
  ('JOD', 'Jordanian Dinar', 0.71000000, NOW()),
  ('QAR', 'Qatari Riyal', 3.64000000, NOW()),
  ('KWD', 'Kuwaiti Dinar', 0.30700000, NOW()),
  ('BHD', 'Bahraini Dinar', 0.37700000, NOW()),
  ('OMR', 'Omani Rial', 0.38500000, NOW()),
  ('GBP', 'British Pound', 0.79000000, NOW()),
  ('CAD', 'Canadian Dollar', 1.35000000, NOW()),
  ('AUD', 'Australian Dollar', 1.52000000, NOW()),
  ('TRY', 'Turkish Lira', 29.50000000, NOW())
ON CONFLICT (currency_code) DO UPDATE SET
  rate = EXCLUDED.rate,
  last_updated = EXCLUDED.last_updated,
  updated_at = NOW();

-- Enable Row Level Security
ALTER TABLE exchange_rates ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access (rates are public information)
CREATE POLICY "Public read access for exchange rates" ON exchange_rates
  FOR SELECT USING (is_active = true);

-- Create policy for admin write access
CREATE POLICY "Admin write access for exchange rates" ON exchange_rates
  FOR ALL USING (
    auth.uid() IN (
      SELECT id FROM profiles 
      WHERE role IN ('admin', 'super_admin') 
      AND is_active = true
    )
  );

-- Create function to update exchange rates timestamp
CREATE OR REPLACE FUNCTION update_exchange_rates_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update timestamp
CREATE TRIGGER update_exchange_rates_timestamp_trigger
  BEFORE UPDATE ON exchange_rates
  FOR EACH ROW
  EXECUTE FUNCTION update_exchange_rates_timestamp();

-- Create function to get fresh exchange rates (for API)
CREATE OR REPLACE FUNCTION get_fresh_exchange_rates()
RETURNS TABLE (
  currency_code VARCHAR(3),
  currency_name VARCHAR(100),
  rate DECIMAL(18, 8),
  last_updated TIMESTAMP WITH TIME ZONE,
  is_stale BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    er.currency_code,
    er.currency_name,
    er.rate,
    er.last_updated,
    (NOW() - er.last_updated) > INTERVAL '1 hour' AS is_stale
  FROM exchange_rates er
  WHERE er.is_active = true
  ORDER BY er.currency_code;
END;
$$ LANGUAGE plpgsql;

-- Create function to convert USD to local currency
CREATE OR REPLACE FUNCTION convert_usd_to_currency(
  usd_amount DECIMAL(10, 2),
  target_currency VARCHAR(3)
)
RETURNS DECIMAL(12, 2) AS $$
DECLARE
  exchange_rate DECIMAL(18, 8);
  converted_amount DECIMAL(12, 2);
BEGIN
  -- Get the exchange rate for the target currency
  SELECT rate INTO exchange_rate
  FROM exchange_rates
  WHERE currency_code = target_currency
    AND is_active = true;
  
  -- If currency not found, return original amount
  IF exchange_rate IS NULL THEN
    RETURN usd_amount;
  END IF;
  
  -- Convert the amount
  converted_amount := usd_amount * exchange_rate;
  
  RETURN converted_amount;
END;
$$ LANGUAGE plpgsql;

-- Create function to format currency display
CREATE OR REPLACE FUNCTION format_currency_display(
  usd_amount DECIMAL(10, 2),
  target_currency VARCHAR(3),
  target_country VARCHAR(3) DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  exchange_rate DECIMAL(18, 8);
  converted_amount DECIMAL(12, 2);
  currency_name VARCHAR(100);
  result JSON;
BEGIN
  -- Get the exchange rate and currency name
  SELECT rate, currency_name INTO exchange_rate, currency_name
  FROM exchange_rates
  WHERE currency_code = target_currency
    AND is_active = true;
  
  -- If currency not found, return USD only
  IF exchange_rate IS NULL THEN
    result := json_build_object(
      'usd_amount', usd_amount,
      'local_amount', usd_amount,
      'local_currency', 'USD',
      'local_currency_name', 'US Dollar',
      'exchange_rate', 1.0,
      'has_conversion', false
    );
    RETURN result;
  END IF;
  
  -- Convert the amount
  converted_amount := usd_amount * exchange_rate;
  
  -- Build result object
  result := json_build_object(
    'usd_amount', usd_amount,
    'local_amount', converted_amount,
    'local_currency', target_currency,
    'local_currency_name', currency_name,
    'exchange_rate', exchange_rate,
    'has_conversion', true,
    'display_text', 'تقريبا حسب سعر الصرف في مصرفك'
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE exchange_rates IS 'Stores exchange rates for multi-currency pricing display';
COMMENT ON FUNCTION get_fresh_exchange_rates() IS 'Returns all active exchange rates with staleness indicator';
COMMENT ON FUNCTION convert_usd_to_currency(DECIMAL, VARCHAR) IS 'Converts USD amount to target currency';
COMMENT ON FUNCTION format_currency_display(DECIMAL, VARCHAR, VARCHAR) IS 'Formats currency display with conversion info'; 