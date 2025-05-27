-- =====================================================
-- SAMIA TAROT - SUPABASE DATABASE SCHEMA
-- =====================================================
-- Run this script in your Supabase SQL Editor
-- This will create all necessary tables and policies

-- =====================================================
-- 1. USER PROFILES TABLE
-- =====================================================
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text,
  last_name text,
  dob date,
  zodiac text,
  country text,
  country_code text,
  phone text,
  profile_picture text,
  role text default 'client' check (role in ('client', 'reader', 'admin', 'monitor')),
  is_active boolean default true,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- =====================================================
-- 2. SERVICES TABLE
-- =====================================================
create table if not exists services (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  type text not null check (type in ('tarot', 'coffee', 'palm', 'dream', 'call')),
  is_vip boolean default false,
  duration_minutes integer,
  price decimal(10,2),
  reader_id uuid references profiles(id),
  is_ai boolean default false,
  is_active boolean default true,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- =====================================================
-- 3. BOOKINGS TABLE
-- =====================================================
create table if not exists bookings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) not null,
  service_id uuid references services(id) not null,
  reader_id uuid references profiles(id),
  status text default 'pending' check (status in ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled')),
  scheduled_at timestamp with time zone,
  completed_at timestamp with time zone,
  notes text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- =====================================================
-- 4. PAYMENTS TABLE
-- =====================================================
create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references bookings(id) not null,
  user_id uuid references profiles(id) not null,
  method text not null check (method in ('stripe', 'square', 'transfer', 'usdt', 'paypal')),
  amount decimal(10,2) not null,
  currency text default 'USD',
  status text default 'pending' check (status in ('pending', 'completed', 'failed', 'refunded')),
  transaction_id text,
  receipt_url text,
  metadata jsonb,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- =====================================================
-- 5. MESSAGES TABLE (FOR CHAT SYSTEM)
-- =====================================================
create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid references profiles(id) not null,
  receiver_id uuid references profiles(id) not null,
  booking_id uuid references bookings(id),
  type text default 'text' check (type in ('text', 'voice', 'image', 'file', 'call_recording')),
  content text,
  file_url text,
  metadata jsonb,
  is_read boolean default false,
  created_at timestamp with time zone default now()
);

-- =====================================================
-- 6. REVIEWS TABLE
-- =====================================================
create table if not exists reviews (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references bookings(id) not null,
  user_id uuid references profiles(id) not null,
  reader_id uuid references profiles(id) not null,
  rating integer check (rating >= 1 and rating <= 5),
  comment text,
  is_public boolean default true,
  created_at timestamp with time zone default now()
);

-- =====================================================
-- 7. NOTIFICATIONS TABLE
-- =====================================================
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) not null,
  title text not null,
  message text not null,
  type text default 'info' check (type in ('info', 'success', 'warning', 'error')),
  is_read boolean default false,
  action_url text,
  created_at timestamp with time zone default now()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================
create index if not exists idx_profiles_role on profiles(role);
create index if not exists idx_services_type on services(type);
create index if not exists idx_services_reader_id on services(reader_id);
create index if not exists idx_bookings_user_id on bookings(user_id);
create index if not exists idx_bookings_reader_id on bookings(reader_id);
create index if not exists idx_bookings_status on bookings(status);
create index if not exists idx_payments_user_id on payments(user_id);
create index if not exists idx_payments_booking_id on payments(booking_id);
create index if not exists idx_messages_booking_id on messages(booking_id);
create index if not exists idx_messages_sender_id on messages(sender_id);
create index if not exists idx_messages_receiver_id on messages(receiver_id);
create index if not exists idx_reviews_reader_id on reviews(reader_id);
create index if not exists idx_notifications_user_id on notifications(user_id);

-- =====================================================
-- ENABLE ROW LEVEL SECURITY (RLS)
-- =====================================================
alter table profiles enable row level security;
alter table services enable row level security;
alter table bookings enable row level security;
alter table payments enable row level security;
alter table messages enable row level security;
alter table reviews enable row level security;
alter table notifications enable row level security;

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- PROFILES POLICIES
create policy "Users can view own profile" on profiles
  for select using (auth.uid() = id);

create policy "Users can update own profile" on profiles
  for update using (auth.uid() = id);

create policy "Users can insert own profile" on profiles
  for insert with check (auth.uid() = id);

create policy "Public profiles for readers" on profiles
  for select using (role = 'reader' and is_active = true);

-- SERVICES POLICIES
create policy "Public read for active services" on services
  for select using (is_active = true);

create policy "Readers can manage their services" on services
  for all using (auth.uid() = reader_id);

create policy "Admins can manage all services" on services
  for all using (
    exists (
      select 1 from profiles 
      where id = auth.uid() and role = 'admin'
    )
  );

-- BOOKINGS POLICIES
create policy "Users can view their bookings" on bookings
  for select using (auth.uid() = user_id);

create policy "Readers can view their bookings" on bookings
  for select using (auth.uid() = reader_id);

create policy "Users can create bookings" on bookings
  for insert with check (auth.uid() = user_id);

create policy "Users can update their bookings" on bookings
  for update using (auth.uid() = user_id);

create policy "Readers can update their bookings" on bookings
  for update using (auth.uid() = reader_id);

-- PAYMENTS POLICIES
create policy "Users can view their payments" on payments
  for select using (auth.uid() = user_id);

create policy "Users can create payments" on payments
  for insert with check (auth.uid() = user_id);

create policy "Admins can view all payments" on payments
  for select using (
    exists (
      select 1 from profiles 
      where id = auth.uid() and role = 'admin'
    )
  );

-- MESSAGES POLICIES
create policy "Users can view their messages" on messages
  for select using (auth.uid() = sender_id or auth.uid() = receiver_id);

create policy "Users can send messages" on messages
  for insert with check (auth.uid() = sender_id);

create policy "Users can update their sent messages" on messages
  for update using (auth.uid() = sender_id);

-- REVIEWS POLICIES
create policy "Public read for reviews" on reviews
  for select using (is_public = true);

create policy "Users can create reviews for their bookings" on reviews
  for insert with check (
    auth.uid() = user_id and 
    exists (
      select 1 from bookings 
      where id = booking_id and user_id = auth.uid() and status = 'completed'
    )
  );

create policy "Users can view their reviews" on reviews
  for select using (auth.uid() = user_id);

create policy "Readers can view their reviews" on reviews
  for select using (auth.uid() = reader_id);

-- NOTIFICATIONS POLICIES
create policy "Users can view their notifications" on notifications
  for select using (auth.uid() = user_id);

create policy "Users can update their notifications" on notifications
  for update using (auth.uid() = user_id);

-- =====================================================
-- FUNCTIONS AND TRIGGERS
-- =====================================================

-- Function to update updated_at timestamp
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Triggers for updated_at
create trigger update_profiles_updated_at before update on profiles
  for each row execute function update_updated_at_column();

create trigger update_services_updated_at before update on services
  for each row execute function update_updated_at_column();

create trigger update_bookings_updated_at before update on bookings
  for each row execute function update_updated_at_column();

create trigger update_payments_updated_at before update on payments
  for each row execute function update_updated_at_column();

-- Function to create profile on user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, first_name, last_name, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'first_name', ''),
    coalesce(new.raw_user_meta_data->>'last_name', ''),
    coalesce(new.phone, '')
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to create profile on user signup
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- =====================================================
-- SEED DATA (OPTIONAL - FOR DEVELOPMENT)
-- =====================================================

-- Create a test reader profile (you can modify this)
-- insert into profiles (id, first_name, last_name, zodiac, country, role)
-- values (gen_random_uuid(), 'Samia', 'Tarot', 'Virgo', 'Lebanon', 'reader')
-- on conflict (id) do nothing;

-- Add sample services (uncomment if needed)
-- insert into services (name, description, type, duration_minutes, price, is_vip)
-- values 
--   ('Tarot Reading', 'Complete tarot card reading session', 'tarot', 30, 49.99, false),
--   ('VIP Tarot Reading', 'Premium tarot reading with detailed analysis', 'tarot', 60, 99.99, true),
--   ('Coffee Reading', 'Traditional coffee cup fortune telling', 'coffee', 20, 29.99, false),
--   ('Palm Reading', 'Palmistry and hand analysis', 'palm', 25, 39.99, false),
--   ('Dream Interpretation', 'Analysis and interpretation of your dreams', 'dream', 15, 24.99, false)
-- on conflict (id) do nothing;

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================
-- Schema creation completed successfully!
-- Next steps:
-- 1. Run this script in your Supabase SQL Editor
-- 2. Verify all tables are created
-- 3. Test the RLS policies
-- 4. Add your seed data if needed 