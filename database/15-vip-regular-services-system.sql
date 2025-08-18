-- SAMIA TAROT - VIP & REGULAR SERVICES SYSTEM SCHEMA

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- READERS TABLE
CREATE TABLE IF NOT EXISTS readers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    name_ar VARCHAR(255),
    name_en VARCHAR(255),
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(50),
    specialties TEXT[],
    bio_ar TEXT,
    bio_en TEXT,
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT true,
    hourly_rate DECIMAL(10,2) DEFAULT 0,
    experience_years INTEGER DEFAULT 0,
    rating DECIMAL(3,2) DEFAULT 0.0,
    total_sessions INTEGER DEFAULT 0,
    languages TEXT[] DEFAULT ARRAY['ar', 'en'],
    timezone VARCHAR(50) DEFAULT 'Asia/Damascus',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- SERVICES TABLE (VIP/Regular Logic)
CREATE TABLE IF NOT EXISTS services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name_ar VARCHAR(255) NOT NULL,
    name_en VARCHAR(255) NOT NULL,
    description_ar TEXT NOT NULL,
    description_en TEXT NOT NULL,
    price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
    type VARCHAR(50) NOT NULL CHECK (type IN ('tarot', 'coffee', 'dream', 'astrology', 'numerology', 'palmistry')),
    duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
    is_active BOOLEAN DEFAULT true,
    is_vip BOOLEAN NOT NULL DEFAULT false,
    reader_id UUID NOT NULL REFERENCES readers(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- BOOKINGS TABLE
CREATE TABLE IF NOT EXISTS bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    reader_id UUID NOT NULL REFERENCES readers(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    appointment_time TIMESTAMP WITH TIME ZONE NOT NULL,
    duration_minutes INTEGER NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    booking_type VARCHAR(50) DEFAULT 'regular',
    original_price DECIMAL(10,2) NOT NULL,
    final_price DECIMAL(10,2) NOT NULL,
    is_vip_booking BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
