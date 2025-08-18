# SAMIA TAROT - Database Schema Documentation

## Overview
The SAMIA TAROT database schema is built on Supabase (PostgreSQL) with comprehensive Row Level Security (RLS), optimized for performance and scalability.

## Table of Contents
1. [Database Overview](#database-overview)
2. [User Management Tables](#user-management-tables)
3. [Tarot System Tables](#tarot-system-tables)
4. [Communication Tables](#communication-tables)
5. [Payment & Financial Tables](#payment--financial-tables)
6. [Analytics & Reporting Tables](#analytics--reporting-tables)
7. [Security & Audit Tables](#security--audit-tables)
8. [Configuration Tables](#configuration-tables)
9. [Relationships & Constraints](#relationships--constraints)
10. [Indexes & Performance](#indexes--performance)

## Database Overview

### Database Technology
- **Platform**: Supabase (PostgreSQL 15)
- **Security**: Row Level Security (RLS) enabled
- **Extensions**: uuid-ossp, pgcrypto, pg_stat_statements
- **Backup**: Automated daily backups with point-in-time recovery

### Schema Structure
```sql
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enable Row Level Security globally
ALTER DATABASE postgres SET row_security = on;
```

## User Management Tables

### users
Core user account information with role-based access control.

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'client' CHECK (role IN ('client', 'reader', 'admin', 'monitor', 'super_admin')),
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    phone_number VARCHAR(20),
    date_of_birth DATE,
    timezone VARCHAR(50) DEFAULT 'UTC',
    profile_image_url TEXT,
    bio TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login TIMESTAMP WITH TIME ZONE,
    login_count INTEGER DEFAULT 0,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    preferences JSONB DEFAULT '{}',
    
    -- Soft delete
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- RLS Policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins can view all users" ON users
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

-- Indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_active ON users(is_active);
CREATE INDEX idx_users_created_at ON users(created_at);
```

### user_profiles
Extended user profile information for different user types.

```sql
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    profile_type VARCHAR(50) NOT NULL, -- 'client', 'reader', 'admin'
    
    -- Reader-specific fields
    specializations TEXT[],
    experience_years INTEGER,
    reading_rate DECIMAL(10,2),
    availability_schedule JSONB,
    certifications TEXT[],
    languages TEXT[] DEFAULT ARRAY['en'],
    
    -- Client-specific fields
    birth_chart_data JSONB,
    preferred_readers UUID[],
    reading_history_count INTEGER DEFAULT 0,
    
    -- Admin-specific fields
    admin_permissions TEXT[],
    department VARCHAR(100),
    
    -- Common fields
    social_links JSONB DEFAULT '{}',
    notification_preferences JSONB DEFAULT '{}',
    privacy_settings JSONB DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own profile" ON user_profiles
    FOR ALL USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

-- Indexes
CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX idx_user_profiles_type ON user_profiles(profile_type);
```

## Tarot System Tables

### tarot_cards
Master table for all tarot cards with metadata.

```sql
CREATE TABLE tarot_cards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    card_key VARCHAR(100) UNIQUE NOT NULL, -- 'the-fool', 'ace-of-cups'
    name VARCHAR(255) NOT NULL,
    arcana_type VARCHAR(10) NOT NULL CHECK (arcana_type IN ('major', 'minor')),
    suit VARCHAR(20), -- null for major arcana
    number INTEGER,
    image_url TEXT NOT NULL,
    description TEXT,
    
    -- Card meanings
    upright_meaning TEXT NOT NULL,
    reversed_meaning TEXT NOT NULL,
    upright_keywords TEXT[] DEFAULT '{}',
    reversed_keywords TEXT[] DEFAULT '{}',
    
    -- Contextual meanings
    love_upright TEXT,
    love_reversed TEXT,
    career_upright TEXT,
    career_reversed TEXT,
    finance_upright TEXT,
    finance_reversed TEXT,
    health_upright TEXT,
    health_reversed TEXT,
    spiritual_upright TEXT,
    spiritual_reversed TEXT,
    
    -- Metadata
    element VARCHAR(20), -- fire, water, earth, air
    planet VARCHAR(50),
    zodiac_sign VARCHAR(50),
    hebrew_letter VARCHAR(10),
    numerology INTEGER,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_tarot_cards_key ON tarot_cards(card_key);
CREATE INDEX idx_tarot_cards_arcana ON tarot_cards(arcana_type);
CREATE INDEX idx_tarot_cards_suit ON tarot_cards(suit);
```

### tarot_spreads
Predefined and custom tarot spread layouts.

```sql
CREATE TABLE tarot_spreads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    card_count INTEGER NOT NULL,
    layout_data JSONB NOT NULL, -- positions, labels, coordinates
    difficulty_level VARCHAR(20) DEFAULT 'beginner',
    category VARCHAR(100),
    is_custom BOOLEAN DEFAULT false,
    created_by UUID REFERENCES users(id),
    is_public BOOLEAN DEFAULT true,
    usage_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE tarot_spreads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public spreads viewable by all" ON tarot_spreads
    FOR SELECT USING (is_public = true);

CREATE POLICY "Users can manage own custom spreads" ON tarot_spreads
    FOR ALL USING (created_by = auth.uid());

-- Indexes
CREATE INDEX idx_tarot_spreads_public ON tarot_spreads(is_public);
CREATE INDEX idx_tarot_spreads_creator ON tarot_spreads(created_by);
```

### reading_sessions
Individual tarot reading sessions and their data.

```sql
CREATE TABLE reading_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES users(id) NOT NULL,
    reader_id UUID REFERENCES users(id), -- null for AI readings
    spread_id UUID REFERENCES tarot_spreads(id) NOT NULL,
    
    -- Session details
    question TEXT,
    session_type VARCHAR(50) DEFAULT 'standard', -- standard, emergency, practice
    status VARCHAR(50) DEFAULT 'pending', -- pending, active, completed, cancelled
    
    -- Cards drawn
    cards_drawn JSONB NOT NULL, -- array of card objects with positions
    
    -- AI interpretation
    ai_interpretation JSONB,
    ai_model_version VARCHAR(50),
    
    -- Human reader notes (if applicable)
    reader_notes TEXT,
    reader_interpretation TEXT,
    
    -- Session metadata
    duration_minutes INTEGER,
    satisfaction_rating INTEGER CHECK (satisfaction_rating BETWEEN 1 AND 5),
    client_feedback TEXT,
    
    -- Timestamps
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE reading_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own readings" ON reading_sessions
    FOR SELECT USING (
        client_id = auth.uid() OR 
        reader_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

-- Indexes
CREATE INDEX idx_reading_sessions_client ON reading_sessions(client_id);
CREATE INDEX idx_reading_sessions_reader ON reading_sessions(reader_id);
CREATE INDEX idx_reading_sessions_status ON reading_sessions(status);
CREATE INDEX idx_reading_sessions_created ON reading_sessions(created_at);
```

## Communication Tables

### chat_rooms
Chat room management for user communications.

```sql
CREATE TABLE chat_rooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_type VARCHAR(50) NOT NULL, -- 'direct', 'reading', 'group', 'support'
    name VARCHAR(255),
    description TEXT,
    
    -- Participants
    participants UUID[] NOT NULL,
    max_participants INTEGER DEFAULT 2,
    
    -- Room settings
    is_encrypted BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    auto_delete_after_hours INTEGER, -- null = never delete
    
    -- Reading session link
    reading_session_id UUID REFERENCES reading_sessions(id),
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access rooms they participate in" ON chat_rooms
    FOR SELECT USING (auth.uid() = ANY(participants));

-- Indexes
CREATE INDEX idx_chat_rooms_participants ON chat_rooms USING GIN(participants);
CREATE INDEX idx_chat_rooms_type ON chat_rooms(room_type);
CREATE INDEX idx_chat_rooms_active ON chat_rooms(is_active);
```

### chat_messages
Individual chat messages with encryption support.

```sql
CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID REFERENCES chat_rooms(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES users(id) NOT NULL,
    
    -- Message content
    content TEXT NOT NULL,
    message_type VARCHAR(50) DEFAULT 'text', -- text, image, file, system
    is_encrypted BOOLEAN DEFAULT false,
    
    -- File attachments
    file_url TEXT,
    file_name VARCHAR(255),
    file_size INTEGER,
    file_type VARCHAR(100),
    
    -- Message metadata
    reply_to_id UUID REFERENCES chat_messages(id),
    is_edited BOOLEAN DEFAULT false,
    edited_at TIMESTAMP WITH TIME ZONE,
    
    -- Delivery status
    delivered_at TIMESTAMP WITH TIME ZONE,
    read_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Soft delete
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- RLS Policies
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages in their rooms" ON chat_messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM chat_rooms 
            WHERE id = room_id 
            AND auth.uid() = ANY(participants)
        )
    );

-- Indexes
CREATE INDEX idx_chat_messages_room ON chat_messages(room_id);
CREATE INDEX idx_chat_messages_sender ON chat_messages(sender_id);
CREATE INDEX idx_chat_messages_created ON chat_messages(created_at);
CREATE INDEX idx_chat_messages_type ON chat_messages(message_type);
```

### video_call_sessions
Video call session tracking and metadata.

```sql
CREATE TABLE video_call_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID REFERENCES chat_rooms(id),
    initiator_id UUID REFERENCES users(id) NOT NULL,
    participants UUID[] NOT NULL,
    
    -- Call details
    call_type VARCHAR(50) DEFAULT 'video', -- video, audio, screen_share
    status VARCHAR(50) DEFAULT 'initiated', -- initiated, ringing, active, ended, failed
    
    -- Quality metrics
    duration_seconds INTEGER,
    quality_rating INTEGER CHECK (quality_rating BETWEEN 1 AND 5),
    connection_quality JSONB, -- detailed quality metrics
    
    -- Technical details
    server_region VARCHAR(50),
    ice_servers_used JSONB,
    
    -- Timestamps
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ended_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE video_call_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own call sessions" ON video_call_sessions
    FOR SELECT USING (
        initiator_id = auth.uid() OR 
        auth.uid() = ANY(participants)
    );

-- Indexes
CREATE INDEX idx_video_calls_initiator ON video_call_sessions(initiator_id);
CREATE INDEX idx_video_calls_participants ON video_call_sessions USING GIN(participants);
CREATE INDEX idx_video_calls_status ON video_call_sessions(status);
```

## Payment & Financial Tables

### user_wallets
Digital wallet balances for each user.

```sql
CREATE TABLE user_wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    balance DECIMAL(15,2) DEFAULT 0.00 CHECK (balance >= 0),
    currency VARCHAR(3) DEFAULT 'USD',
    
    -- Limits and controls
    daily_limit DECIMAL(15,2) DEFAULT 1000.00,
    monthly_limit DECIMAL(15,2) DEFAULT 10000.00,
    is_frozen BOOLEAN DEFAULT false,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE user_wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own wallet" ON user_wallets
    FOR SELECT USING (user_id = auth.uid());

-- Indexes
CREATE INDEX idx_user_wallets_user ON user_wallets(user_id);
```

### transactions
Financial transaction records with full audit trail.

```sql
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) NOT NULL,
    
    -- Transaction details
    transaction_type VARCHAR(50) NOT NULL, -- deposit, withdrawal, payment, refund, fee
    amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    status VARCHAR(50) DEFAULT 'pending', -- pending, completed, failed, cancelled
    
    -- Payment gateway details
    gateway_provider VARCHAR(50), -- stripe, square, paypal
    gateway_transaction_id VARCHAR(255),
    gateway_fee DECIMAL(15,2) DEFAULT 0.00,
    
    -- Related entities
    reading_session_id UUID REFERENCES reading_sessions(id),
    payment_method_id UUID,
    
    -- Description and metadata
    description TEXT,
    metadata JSONB DEFAULT '{}',
    
    -- Audit fields
    processed_by UUID REFERENCES users(id), -- for manual transactions
    processor_notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Reconciliation
    reconciled BOOLEAN DEFAULT false,
    reconciled_at TIMESTAMP WITH TIME ZONE
);

-- RLS Policies
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transactions" ON transactions
    FOR SELECT USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

-- Indexes
CREATE INDEX idx_transactions_user ON transactions(user_id);
CREATE INDEX idx_transactions_type ON transactions(transaction_type);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_created ON transactions(created_at);
CREATE INDEX idx_transactions_gateway ON transactions(gateway_provider, gateway_transaction_id);
```

### payment_methods
Stored payment methods for users (tokenized).

```sql
CREATE TABLE payment_methods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    -- Payment method details
    method_type VARCHAR(50) NOT NULL, -- card, bank_account, digital_wallet
    provider VARCHAR(50) NOT NULL, -- stripe, square, paypal
    provider_method_id VARCHAR(255) NOT NULL, -- tokenized ID
    
    -- Display information (no sensitive data)
    display_name VARCHAR(255),
    last_four VARCHAR(4),
    brand VARCHAR(50),
    expiry_month INTEGER,
    expiry_year INTEGER,
    
    -- Settings
    is_default BOOLEAN DEFAULT false,
    is_verified BOOLEAN DEFAULT false,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Soft delete for audit purposes
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- RLS Policies
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own payment methods" ON payment_methods
    FOR ALL USING (user_id = auth.uid());

-- Indexes
CREATE INDEX idx_payment_methods_user ON payment_methods(user_id);
CREATE INDEX idx_payment_methods_provider ON payment_methods(provider, provider_method_id);
```

## Analytics & Reporting Tables

### user_analytics
User behavior and engagement analytics.

```sql
CREATE TABLE user_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    -- Session data
    session_id VARCHAR(255),
    page_views INTEGER DEFAULT 0,
    session_duration INTEGER, -- seconds
    
    -- Engagement metrics
    readings_completed INTEGER DEFAULT 0,
    messages_sent INTEGER DEFAULT 0,
    calls_made INTEGER DEFAULT 0,
    
    -- Financial metrics
    total_spent DECIMAL(15,2) DEFAULT 0.00,
    average_session_value DECIMAL(15,2) DEFAULT 0.00,
    
    -- Device and location
    device_type VARCHAR(50),
    browser VARCHAR(100),
    operating_system VARCHAR(100),
    country VARCHAR(2),
    city VARCHAR(100),
    
    -- Timestamps
    date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_user_analytics_user_date ON user_analytics(user_id, date);
CREATE INDEX idx_user_analytics_date ON user_analytics(date);
```

### system_metrics
System-wide performance and usage metrics.

```sql
CREATE TABLE system_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(15,4) NOT NULL,
    metric_unit VARCHAR(50),
    
    -- Dimensions
    dimensions JSONB DEFAULT '{}',
    
    -- Aggregation level
    aggregation_level VARCHAR(50) DEFAULT 'hourly', -- minute, hourly, daily
    
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_system_metrics_name_time ON system_metrics(metric_name, timestamp);
CREATE INDEX idx_system_metrics_timestamp ON system_metrics(timestamp);
```

## Security & Audit Tables

### audit_logs
Comprehensive audit trail for all system actions.

```sql
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    
    -- Action details
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100),
    resource_id UUID,
    
    -- Request details
    ip_address INET,
    user_agent TEXT,
    request_method VARCHAR(10),
    request_path TEXT,
    
    -- Changes made
    old_values JSONB,
    new_values JSONB,
    
    -- Result
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    
    -- Additional context
    metadata JSONB DEFAULT '{}',
    
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit logs" ON audit_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

-- Indexes
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
```

### security_events
Security-related events and alerts.

```sql
CREATE TABLE security_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    
    -- Event details
    event_type VARCHAR(100) NOT NULL, -- login_failure, suspicious_activity, etc.
    severity VARCHAR(20) DEFAULT 'medium', -- low, medium, high, critical
    description TEXT NOT NULL,
    
    -- Context
    ip_address INET,
    user_agent TEXT,
    geolocation JSONB,
    
    -- Detection details
    detection_method VARCHAR(100), -- manual, automated, ai
    confidence_score DECIMAL(3,2), -- 0.00 to 1.00
    
    -- Response
    status VARCHAR(50) DEFAULT 'open', -- open, investigating, resolved, false_positive
    assigned_to UUID REFERENCES users(id),
    resolution_notes TEXT,
    
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- Indexes
CREATE INDEX idx_security_events_user ON security_events(user_id);
CREATE INDEX idx_security_events_type ON security_events(event_type);
CREATE INDEX idx_security_events_severity ON security_events(severity);
CREATE INDEX idx_security_events_status ON security_events(status);
```

## Configuration Tables

### system_configuration
System-wide configuration settings.

```sql
CREATE TABLE system_configuration (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    config_key VARCHAR(255) UNIQUE NOT NULL,
    config_value TEXT,
    value_type VARCHAR(50) DEFAULT 'string', -- string, number, boolean, json
    description TEXT,
    
    -- Access control
    is_sensitive BOOLEAN DEFAULT false,
    required_role VARCHAR(50) DEFAULT 'super_admin',
    
    -- Validation
    validation_rules JSONB,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID REFERENCES users(id)
);

-- RLS Policies
ALTER TABLE system_configuration ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage configuration" ON system_configuration
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role = 'super_admin'
        )
    );

-- Indexes
CREATE INDEX idx_system_config_key ON system_configuration(config_key);
```

## Relationships & Constraints

### Key Relationships
```sql
-- User to Profile (1:1)
ALTER TABLE user_profiles 
ADD CONSTRAINT fk_profile_user 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- User to Wallet (1:1)
ALTER TABLE user_wallets 
ADD CONSTRAINT fk_wallet_user 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Reading Session relationships
ALTER TABLE reading_sessions 
ADD CONSTRAINT fk_session_client 
FOREIGN KEY (client_id) REFERENCES users(id);

ALTER TABLE reading_sessions 
ADD CONSTRAINT fk_session_reader 
FOREIGN KEY (reader_id) REFERENCES users(id);

-- Transaction relationships
ALTER TABLE transactions 
ADD CONSTRAINT fk_transaction_user 
FOREIGN KEY (user_id) REFERENCES users(id);

-- Chat relationships
ALTER TABLE chat_messages 
ADD CONSTRAINT fk_message_room 
FOREIGN KEY (room_id) REFERENCES chat_rooms(id) ON DELETE CASCADE;

ALTER TABLE chat_messages 
ADD CONSTRAINT fk_message_sender 
FOREIGN KEY (sender_id) REFERENCES users(id);
```

### Check Constraints
```sql
-- Ensure valid email format
ALTER TABLE users ADD CONSTRAINT check_email_format 
CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- Ensure positive amounts
ALTER TABLE transactions ADD CONSTRAINT check_positive_amount 
CHECK (amount > 0);

-- Ensure valid rating range
ALTER TABLE reading_sessions ADD CONSTRAINT check_rating_range 
CHECK (satisfaction_rating IS NULL OR (satisfaction_rating >= 1 AND satisfaction_rating <= 5));
```

## Indexes & Performance

### Performance Indexes
```sql
-- Composite indexes for common queries
CREATE INDEX idx_reading_sessions_client_status ON reading_sessions(client_id, status);
CREATE INDEX idx_transactions_user_type_date ON transactions(user_id, transaction_type, created_at);
CREATE INDEX idx_chat_messages_room_created ON chat_messages(room_id, created_at);

-- Partial indexes for active records
CREATE INDEX idx_users_active_email ON users(email) WHERE is_active = true;
CREATE INDEX idx_chat_rooms_active ON chat_rooms(id) WHERE is_active = true;

-- GIN indexes for JSONB columns
CREATE INDEX idx_users_metadata ON users USING GIN(metadata);
CREATE INDEX idx_user_profiles_preferences ON user_profiles USING GIN(notification_preferences);
CREATE INDEX idx_reading_sessions_cards ON reading_sessions USING GIN(cards_drawn);
```

### Database Functions
```sql
-- Update wallet balance atomically
CREATE OR REPLACE FUNCTION update_wallet_balance(
    p_user_id UUID,
    p_amount DECIMAL,
    p_transaction_type VARCHAR,
    p_metadata JSONB DEFAULT '{}'
) RETURNS BOOLEAN AS $$
DECLARE
    current_balance DECIMAL;
BEGIN
    -- Lock the wallet row
    SELECT balance INTO current_balance
    FROM user_wallets
    WHERE user_id = p_user_id
    FOR UPDATE;
    
    -- Check if sufficient funds for debit operations
    IF p_amount < 0 AND current_balance + p_amount < 0 THEN
        RAISE EXCEPTION 'Insufficient funds';
    END IF;
    
    -- Update wallet balance
    UPDATE user_wallets
    SET balance = balance + p_amount,
        updated_at = NOW()
    WHERE user_id = p_user_id;
    
    -- Create transaction record
    INSERT INTO transactions (
        user_id,
        transaction_type,
        amount,
        status,
        metadata,
        completed_at
    ) VALUES (
        p_user_id,
        p_transaction_type,
        ABS(p_amount),
        'completed',
        p_metadata,
        NOW()
    );
    
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql;
```

### Triggers
```sql
-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to relevant tables
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at 
    BEFORE UPDATE ON user_profiles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

---

**Last Updated**: December 2024
**Version**: 1.0.0
**Maintainer**: SAMIA TAROT Development Team 