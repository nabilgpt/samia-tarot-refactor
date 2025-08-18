-- ==========================================
-- SAMIA TAROT - MISSING TAROT TABLES CREATION
-- Fix for 404 errors in Admin Tarot Management
-- ==========================================

-- Create tarot_spread_reader_assignments table
CREATE TABLE IF NOT EXISTS public.tarot_spread_reader_assignments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    spread_id UUID NOT NULL REFERENCES public.tarot_spreads(id) ON DELETE CASCADE,
    reader_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    assigned_by UUID REFERENCES public.profiles(id),
    is_active BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(spread_id, reader_id)
);

-- Create tarot_deck_reader_assignments table
CREATE TABLE IF NOT EXISTS public.tarot_deck_reader_assignments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    deck_id UUID NOT NULL REFERENCES public.tarot_decks(id) ON DELETE CASCADE,
    reader_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    assigned_by UUID REFERENCES public.profiles(id),
    is_active BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(deck_id, reader_id)
);

-- Create tarot_deck_card_images table
CREATE TABLE IF NOT EXISTS public.tarot_deck_card_images (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    deck_id UUID NOT NULL REFERENCES public.tarot_decks(id) ON DELETE CASCADE,
    card_name VARCHAR(100) NOT NULL,
    card_name_ar VARCHAR(100),
    card_number INTEGER,
    suit VARCHAR(50), -- major_arcana, cups, wands, swords, pentacles
    suit_ar VARCHAR(50),
    image_url TEXT,
    image_path TEXT,
    thumbnail_url TEXT,
    alt_text TEXT,
    alt_text_ar TEXT,
    file_size BIGINT,
    mime_type VARCHAR(100),
    dimensions JSONB, -- {width: 300, height: 500}
    upload_status VARCHAR(20) DEFAULT 'pending', -- pending, uploading, complete, failed
    uploaded_by UUID REFERENCES public.profiles(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(deck_id, card_name)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_spread_reader_assignments_spread_id ON public.tarot_spread_reader_assignments(spread_id);
CREATE INDEX IF NOT EXISTS idx_spread_reader_assignments_reader_id ON public.tarot_spread_reader_assignments(reader_id);
CREATE INDEX IF NOT EXISTS idx_spread_reader_assignments_active ON public.tarot_spread_reader_assignments(is_active);

CREATE INDEX IF NOT EXISTS idx_deck_reader_assignments_deck_id ON public.tarot_deck_reader_assignments(deck_id);
CREATE INDEX IF NOT EXISTS idx_deck_reader_assignments_reader_id ON public.tarot_deck_reader_assignments(reader_id);
CREATE INDEX IF NOT EXISTS idx_deck_reader_assignments_active ON public.tarot_deck_reader_assignments(is_active);

CREATE INDEX IF NOT EXISTS idx_deck_card_images_deck_id ON public.tarot_deck_card_images(deck_id);
CREATE INDEX IF NOT EXISTS idx_deck_card_images_card_name ON public.tarot_deck_card_images(card_name);
CREATE INDEX IF NOT EXISTS idx_deck_card_images_suit ON public.tarot_deck_card_images(suit);
CREATE INDEX IF NOT EXISTS idx_deck_card_images_upload_status ON public.tarot_deck_card_images(upload_status);
CREATE INDEX IF NOT EXISTS idx_deck_card_images_active ON public.tarot_deck_card_images(is_active);

-- Enable Row Level Security (RLS)
ALTER TABLE public.tarot_spread_reader_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tarot_deck_reader_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tarot_deck_card_images ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tarot_spread_reader_assignments
CREATE POLICY "Enable read access for authenticated users" ON public.tarot_spread_reader_assignments
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert for admin users" ON public.tarot_spread_reader_assignments
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

CREATE POLICY "Enable update for admin users" ON public.tarot_spread_reader_assignments
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

CREATE POLICY "Enable delete for admin users" ON public.tarot_spread_reader_assignments
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

-- RLS Policies for tarot_deck_reader_assignments
CREATE POLICY "Enable read access for authenticated users" ON public.tarot_deck_reader_assignments
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert for admin users" ON public.tarot_deck_reader_assignments
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

CREATE POLICY "Enable update for admin users" ON public.tarot_deck_reader_assignments
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

CREATE POLICY "Enable delete for admin users" ON public.tarot_deck_reader_assignments
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

-- RLS Policies for tarot_deck_card_images
CREATE POLICY "Enable read access for authenticated users" ON public.tarot_deck_card_images
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert for admin users" ON public.tarot_deck_card_images
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

CREATE POLICY "Enable update for admin users" ON public.tarot_deck_card_images
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

CREATE POLICY "Enable delete for admin users" ON public.tarot_deck_card_images
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

-- Add trigger for updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_tarot_spread_reader_assignments_updated_at 
    BEFORE UPDATE ON public.tarot_spread_reader_assignments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tarot_deck_reader_assignments_updated_at 
    BEFORE UPDATE ON public.tarot_deck_reader_assignments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tarot_deck_card_images_updated_at 
    BEFORE UPDATE ON public.tarot_deck_card_images 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT ALL ON public.tarot_spread_reader_assignments TO authenticated;
GRANT ALL ON public.tarot_deck_reader_assignments TO authenticated;
GRANT ALL ON public.tarot_deck_card_images TO authenticated;

GRANT ALL ON public.tarot_spread_reader_assignments TO service_role;
GRANT ALL ON public.tarot_deck_reader_assignments TO service_role;
GRANT ALL ON public.tarot_deck_card_images TO service_role;

-- Success message
SELECT 'Missing tarot tables created successfully!' as message; 