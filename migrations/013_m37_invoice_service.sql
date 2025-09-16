-- M37 Invoice Service - Deterministic PDF invoices with private storage
-- Complete invoice infrastructure with RLS policies and audit trail

-- Create invoice_items table (missing from previous migrations)
CREATE TABLE IF NOT EXISTS invoice_items (
    id BIGSERIAL PRIMARY KEY,
    invoice_id BIGINT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    order_id BIGINT REFERENCES orders(id),
    service_name VARCHAR(200) NOT NULL,
    description TEXT,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price_cents INTEGER NOT NULL, -- Amount in cents
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    total_cents INTEGER NOT NULL, -- quantity * unit_price_cents
    metadata JSONB DEFAULT '{}'::jsonb,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT positive_quantity CHECK (quantity > 0),
    CONSTRAINT positive_unit_price CHECK (unit_price_cents >= 0),
    CONSTRAINT valid_total CHECK (total_cents = quantity * unit_price_cents)
);

-- Enable RLS on invoice_items
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items FORCE ROW LEVEL SECURITY;

-- RLS policy: Users can only see their own invoice items
CREATE POLICY "invoice_items_owner_access" ON invoice_items FOR SELECT
TO authenticated
USING (
    invoice_id IN (
        SELECT i.id FROM invoices i
        JOIN orders o ON o.id = i.order_id
        WHERE o.user_id = auth.uid()
    )
);

-- RLS policy: Admin and superadmin can manage all invoice items
CREATE POLICY "invoice_items_admin_access" ON invoice_items FOR ALL
TO authenticated
USING (get_user_role(auth.uid()) IN ('admin', 'superadmin'));

-- Add PDF storage fields to invoices table if not exists
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS pdf_storage_path VARCHAR(500),
ADD COLUMN IF NOT EXISTS pdf_generated_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS pdf_hash VARCHAR(64), -- SHA-256 hash for deterministic verification
ADD COLUMN IF NOT EXISTS pdf_version INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS signed_url_issued_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_signed_url_issued_at TIMESTAMP WITH TIME ZONE;

-- Invoice access audit table for signed URL tracking
CREATE TABLE IF NOT EXISTS invoice_access_audit (
    id BIGSERIAL PRIMARY KEY,
    invoice_id BIGINT NOT NULL REFERENCES invoices(id),
    access_type VARCHAR(50) NOT NULL, -- 'signed_url_issued', 'pdf_downloaded', 'pdf_generated'
    accessed_by UUID REFERENCES profiles(id),
    client_ip INET,
    user_agent TEXT,
    signed_url_expires_at TIMESTAMP WITH TIME ZONE,
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on invoice access audit
ALTER TABLE invoice_access_audit ENABLE ROW LEVEL SECURITY;

-- RLS policy: Users can only see audit entries for their own invoices
CREATE POLICY "invoice_access_audit_owner" ON invoice_access_audit FOR SELECT
TO authenticated
USING (
    invoice_id IN (
        SELECT i.id FROM invoices i
        JOIN orders o ON o.id = i.order_id
        WHERE o.user_id = auth.uid()
    )
);

-- RLS policy: Admin and superadmin can see all audit entries
CREATE POLICY "invoice_access_audit_admin" ON invoice_access_audit FOR ALL
TO authenticated
USING (get_user_role(auth.uid()) IN ('admin', 'superadmin'));

-- Function to calculate deterministic invoice hash
CREATE OR REPLACE FUNCTION calculate_invoice_hash(
    p_invoice_id BIGINT,
    p_total_cents INTEGER,
    p_currency VARCHAR(3),
    p_issue_date DATE
) RETURNS VARCHAR(64)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
    items_data TEXT;
    invoice_data TEXT;
BEGIN
    -- Get deterministic items data (sorted by service_name for consistency)
    SELECT string_agg(
        CONCAT(service_name, '|', quantity, '|', unit_price_cents, '|', total_cents),
        ','
        ORDER BY service_name, created_at
    ) INTO items_data
    FROM invoice_items
    WHERE invoice_id = p_invoice_id;

    -- Create deterministic invoice data string
    invoice_data := CONCAT(
        p_invoice_id::text, '|',
        p_total_cents, '|',
        p_currency, '|',
        p_issue_date::text, '|',
        COALESCE(items_data, '')
    );

    -- Return SHA-256 hash
    RETURN encode(digest(invoice_data, 'sha256'), 'hex');
END;
$$;

-- Function to update invoice totals from items
CREATE OR REPLACE FUNCTION update_invoice_totals()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
    -- Update invoice totals when items change
    UPDATE invoices
    SET
        total_cents = (
            SELECT COALESCE(SUM(total_cents), 0)
            FROM invoice_items
            WHERE invoice_id = COALESCE(NEW.invoice_id, OLD.invoice_id)
        ),
        updated_at = NOW()
    WHERE id = COALESCE(NEW.invoice_id, OLD.invoice_id);

    RETURN COALESCE(NEW, OLD);
END;
$$;

-- Trigger to automatically update invoice totals
CREATE TRIGGER invoice_items_update_totals
    AFTER INSERT OR UPDATE OR DELETE ON invoice_items
    FOR EACH ROW EXECUTE FUNCTION update_invoice_totals();

-- Function to log invoice access for audit trail
CREATE OR REPLACE FUNCTION log_invoice_access(
    p_invoice_id BIGINT,
    p_access_type VARCHAR(50),
    p_accessed_by UUID DEFAULT NULL,
    p_client_ip INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_signed_url_expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    p_success BOOLEAN DEFAULT true,
    p_error_message TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
    audit_id BIGINT;
BEGIN
    INSERT INTO invoice_access_audit (
        invoice_id, access_type, accessed_by, client_ip, user_agent,
        signed_url_expires_at, success, error_message, metadata
    ) VALUES (
        p_invoice_id, p_access_type, p_accessed_by, p_client_ip, p_user_agent,
        p_signed_url_expires_at, p_success, p_error_message, p_metadata
    ) RETURNING id INTO audit_id;

    -- Update signed URL statistics on invoices table
    IF p_access_type = 'signed_url_issued' AND p_success THEN
        UPDATE invoices
        SET
            signed_url_issued_count = signed_url_issued_count + 1,
            last_signed_url_issued_at = NOW()
        WHERE id = p_invoice_id;
    END IF;

    RETURN audit_id;
END;
$$;

-- View for invoice dashboard (admin use)
CREATE OR REPLACE VIEW invoice_dashboard AS
SELECT
    i.id,
    i.number as invoice_number,
    o.user_id as owner_id,
    p.email as owner_email,
    i.total_cents,
    i.currency,
    i.pdf_generated_at,
    i.signed_url_issued_count,
    i.last_signed_url_issued_at,
    COUNT(ii.id) as items_count,
    o.id as order_id,
    o.status as order_status
FROM invoices i
LEFT JOIN orders o ON o.id = i.order_id
LEFT JOIN profiles p ON p.id = o.user_id
LEFT JOIN invoice_items ii ON ii.invoice_id = i.id
GROUP BY i.id, o.user_id, p.email, o.id, o.status
ORDER BY i.created_at DESC;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_order_id ON invoice_items(order_id);
CREATE INDEX IF NOT EXISTS idx_invoice_access_audit_invoice_id ON invoice_access_audit(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_access_audit_accessed_by ON invoice_access_audit(accessed_by);
CREATE INDEX IF NOT EXISTS idx_invoices_pdf_storage_path ON invoices(pdf_storage_path) WHERE pdf_storage_path IS NOT NULL;