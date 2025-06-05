-- =====================================================
-- SAMIA TAROT - COMPLETE DATABASE SCHEMA
-- =====================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. PROFILES TABLE (Extended user information)
-- =====================================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  date_of_birth DATE,
  gender TEXT CHECK (gender IN ('male', 'female', 'other')),
  country TEXT,
  country_code TEXT,
  zodiac TEXT,
  avatar_url TEXT,
  role TEXT CHECK (role IN ('client', 'reader', 'admin', 'monitor')) DEFAULT 'client',
  is_active BOOLEAN DEFAULT true,
  bio TEXT,
  specialties TEXT[], -- For readers
  languages TEXT[] DEFAULT ARRAY['en'],
  timezone TEXT DEFAULT 'UTC',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 2. SERVICES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  type TEXT CHECK (type IN ('tarot', 'coffee', 'palm', 'dream', 'call')) NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  duration_minutes INTEGER DEFAULT 30,
  is_vip BOOLEAN DEFAULT false,
  is_ai BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 3. BOOKINGS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) NOT NULL,
  reader_id UUID REFERENCES profiles(id),
  service_id UUID REFERENCES services(id) NOT NULL,
  scheduled_at TIMESTAMP WITH TIME ZONE,
  status TEXT CHECK (status IN ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled')) DEFAULT 'pending',
  is_emergency BOOLEAN DEFAULT false,
  notes TEXT,
  session_url TEXT, -- For video/voice calls
  recording_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 4. PAYMENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id),
  user_id UUID REFERENCES profiles(id) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  method TEXT CHECK (method IN ('stripe', 'square', 'usdt', 'western_union', 'moneygram', 'ria', 'omt', 'whish', 'bob', 'wallet')) NOT NULL,
  transaction_id TEXT,
  transaction_hash TEXT, -- For USDT blockchain verification
  receipt_url TEXT,
  status TEXT CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'refunded', 'awaiting_approval')) DEFAULT 'pending',
  admin_notes TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 4.1. WALLETS TABLE (In-app wallet system)
-- =====================================================
CREATE TABLE IF NOT EXISTS wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) NOT NULL UNIQUE,
  balance DECIMAL(10,2) DEFAULT 0.00 CHECK (balance >= 0),
  currency TEXT DEFAULT 'USD',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 4.2. TRANSACTIONS TABLE (Wallet operations log)
-- =====================================================
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID REFERENCES wallets(id) NOT NULL,
  user_id UUID REFERENCES profiles(id) NOT NULL,
  type TEXT CHECK (type IN ('credit', 'debit', 'refund', 'topup', 'payment')) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  balance_before DECIMAL(10,2) NOT NULL,
  balance_after DECIMAL(10,2) NOT NULL,
  reference_id UUID, -- Can reference payment_id, booking_id, etc.
  reference_type TEXT CHECK (reference_type IN ('payment', 'booking', 'refund', 'topup', 'admin_adjustment')),
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 4.3. RECEIPT UPLOADS TABLE (For transfer method receipts)
-- =====================================================
CREATE TABLE IF NOT EXISTS receipt_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID REFERENCES payments(id) NOT NULL,
  user_id UUID REFERENCES profiles(id) NOT NULL,
  file_url TEXT NOT NULL,
  file_name TEXT,
  file_size INTEGER,
  upload_status TEXT CHECK (upload_status IN ('uploaded', 'verified', 'rejected')) DEFAULT 'uploaded',
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 5. MESSAGES TABLE (Chat system)
-- =====================================================
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id) NOT NULL,
  sender_id UUID REFERENCES profiles(id) NOT NULL,
  type TEXT CHECK (type IN ('text', 'image', 'voice', 'file', 'system')) DEFAULT 'text',
  content TEXT,
  file_url TEXT,
  metadata JSONB,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 6. REVIEWS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id) NOT NULL,
  client_id UUID REFERENCES profiles(id) NOT NULL,
  reader_id UUID REFERENCES profiles(id) NOT NULL,
  rating INTEGER CHECK (rating BETWEEN 1 AND 5) NOT NULL,
  feedback TEXT,
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 7. NOTIFICATIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT CHECK (type IN ('booking', 'payment', 'message', 'system', 'promotion')) DEFAULT 'system',
  data JSONB,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_active ON profiles(is_active);
CREATE INDEX IF NOT EXISTS idx_services_type ON services(type);
CREATE INDEX IF NOT EXISTS idx_services_active ON services(is_active);
CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_reader ON bookings(reader_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_scheduled ON bookings(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_payments_booking ON payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_method ON payments(method);
CREATE INDEX IF NOT EXISTS idx_wallets_user ON wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_wallet ON transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_receipt_uploads_payment ON receipt_uploads(payment_id);
CREATE INDEX IF NOT EXISTS idx_receipt_uploads_status ON receipt_uploads(upload_status);
CREATE INDEX IF NOT EXISTS idx_messages_booking ON messages(booking_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read);

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipt_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Public profiles viewable by all" ON profiles FOR SELECT USING (role = 'reader' AND is_active = true);

-- Services policies
CREATE POLICY "Services are viewable by all authenticated users" ON services FOR SELECT USING (auth.role() = 'authenticated' AND is_active = true);
CREATE POLICY "Only admins can manage services" ON services FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Bookings policies
CREATE POLICY "Users can view own bookings" ON bookings FOR SELECT USING (
  auth.uid() = user_id OR auth.uid() = reader_id OR 
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'monitor'))
);
CREATE POLICY "Users can create own bookings" ON bookings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own bookings" ON bookings FOR UPDATE USING (
  auth.uid() = user_id OR auth.uid() = reader_id OR 
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'monitor'))
);

-- Payments policies
CREATE POLICY "Users can view own payments" ON payments FOR SELECT USING (
  auth.uid() = user_id OR 
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'monitor'))
);
CREATE POLICY "Users can create own payments" ON payments FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Wallets policies
CREATE POLICY "Users can view own wallet" ON wallets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all wallets" ON wallets FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'monitor'))
);
CREATE POLICY "System can create wallets" ON wallets FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can update wallets" ON wallets FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Transactions policies
CREATE POLICY "Users can view own transactions" ON transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all transactions" ON transactions FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'monitor'))
);
CREATE POLICY "System can create transactions" ON transactions FOR INSERT WITH CHECK (true);

-- Receipt uploads policies
CREATE POLICY "Users can view own receipts" ON receipt_uploads FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all receipts" ON receipt_uploads FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'monitor'))
);
CREATE POLICY "Users can upload own receipts" ON receipt_uploads FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can update receipt status" ON receipt_uploads FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'monitor'))
);

-- Messages policies
CREATE POLICY "Users can view messages from their bookings" ON messages FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM bookings 
    WHERE id = booking_id AND (user_id = auth.uid() OR reader_id = auth.uid())
  ) OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'monitor'))
);
CREATE POLICY "Users can send messages to their bookings" ON messages FOR INSERT WITH CHECK (
  auth.uid() = sender_id AND EXISTS (
    SELECT 1 FROM bookings 
    WHERE id = booking_id AND (user_id = auth.uid() OR reader_id = auth.uid())
  )
);

-- Reviews policies
CREATE POLICY "Reviews are viewable by all" ON reviews FOR SELECT USING (is_public = true);
CREATE POLICY "Users can create reviews for their completed bookings" ON reviews FOR INSERT WITH CHECK (
  auth.uid() = client_id AND EXISTS (
    SELECT 1 FROM bookings 
    WHERE id = booking_id AND user_id = auth.uid() AND status = 'completed'
  )
);

-- Notifications policies
CREATE POLICY "Users can view own notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON notifications FOR UPDATE USING (auth.uid() = user_id);

-- =====================================================
-- TRIGGERS AND FUNCTIONS
-- =====================================================

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    COALESCE(NEW.phone, '')
  );
  
  -- Create wallet for new user
  INSERT INTO public.wallets (user_id, balance, currency)
  VALUES (NEW.id, 0.00, 'USD');
  
  RETURN NEW;
END;
$$;

-- Trigger for new user registration
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Add updated_at triggers
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER services_updated_at BEFORE UPDATE ON services FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER bookings_updated_at BEFORE UPDATE ON bookings FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER payments_updated_at BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER wallets_updated_at BEFORE UPDATE ON wallets FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER receipt_uploads_updated_at BEFORE UPDATE ON receipt_uploads FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- =====================================================
-- SAMPLE DATA
-- =====================================================

-- Insert sample services
INSERT INTO services (name, description, type, price, duration_minutes, is_vip, is_ai) VALUES
('Classic Tarot Reading', 'Traditional 3-card tarot spread revealing past, present, and future insights', 'tarot', 25.00, 30, false, false),
('VIP Tarot Reading', 'Comprehensive Celtic Cross spread with detailed interpretation', 'tarot', 75.00, 60, true, false),
('AI-Enhanced Tarot', 'Modern tarot reading enhanced with AI insights and digital cards', 'tarot', 35.00, 45, false, true),
('Turkish Coffee Reading', 'Ancient art of reading coffee grounds to reveal your destiny', 'coffee', 20.00, 25, false, false),
('VIP Coffee Reading', 'Premium coffee reading with detailed life guidance', 'coffee', 60.00, 50, true, false),
('Palm Reading', 'Traditional palmistry revealing your life lines and future', 'palm', 30.00, 35, false, false),
('VIP Palm Reading', 'Comprehensive palm analysis with detailed life mapping', 'palm', 80.00, 60, true, false),
('Dream Analysis', 'Professional interpretation of your dreams and their meanings', 'dream', 40.00, 40, false, false),
('VIP Dream Analysis', 'Deep psychological dream analysis with spiritual guidance', 'dream', 90.00, 75, true, false),
('Emergency Spiritual Call', 'Immediate spiritual guidance for urgent life situations', 'call', 50.00, 20, false, false),
('VIP Emergency Call', 'Priority emergency spiritual consultation with master readers', 'call', 120.00, 30, true, false)
ON CONFLICT DO NOTHING;

-- Insert sample reader profiles (these would be created when readers sign up)
-- This is just for demonstration - in reality, profiles are created via auth trigger

COMMENT ON TABLE profiles IS 'Extended user profiles with role-based information';
COMMENT ON TABLE services IS 'Available spiritual services and readings';
COMMENT ON TABLE bookings IS 'User booking appointments with readers';
COMMENT ON TABLE payments IS 'Payment transactions for bookings';
COMMENT ON TABLE messages IS 'Chat messages between users and readers';
COMMENT ON TABLE reviews IS 'User reviews and ratings for completed sessions';
COMMENT ON TABLE notifications IS 'System notifications for users'; 