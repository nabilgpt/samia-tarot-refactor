# SAMIA TAROT - Complete Payment System Documentation

## Overview

The SAMIA TAROT platform features a comprehensive multi-method payment system with secure integration, location-based payment method selection, and full admin management capabilities.

## 🌍 Payment Methods

### Card Payments
- **Stripe** - For EU/UAE users (Germany, France, Italy, Spain, Netherlands, Belgium, Austria, Portugal, Ireland, Luxembourg, UAE)
- **Square** - For all other countries
- Features: Instant confirmation, automatic processing, secure tokenization

### Cryptocurrency
- **USDT** - Available globally
- Networks: Ethereum (ERC-20) and TRON (TRC-20)
- Features: Blockchain verification, transaction hash tracking, admin approval required

### International Transfers
- **Western Union** - Global money transfer service
- **MoneyGram** - International remittance service  
- **Ria Money Transfer** - Worldwide money transfer
- Features: Receipt upload, admin verification, 1-3 business day processing

### Local Transfers (Lebanon)
- **OMT** - Lebanese money transfer service
- **Whish Money** - Digital wallet service
- **Bank of Beirut (BOB)** - Direct bank transfer
- Features: Same-day to 2-day processing, local currency support

### In-App Wallet
- **SAMIA Wallet** - Internal balance system
- Features: Instant payments, no fees, top-up options, transaction history

## 📂 Database Schema

### Core Tables

#### payments
```sql
CREATE TABLE payments (
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
```

#### wallets
```sql
CREATE TABLE wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) NOT NULL UNIQUE,
  balance DECIMAL(10,2) DEFAULT 0.00 CHECK (balance >= 0),
  currency TEXT DEFAULT 'USD',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### transactions
```sql
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID REFERENCES wallets(id) NOT NULL,
  user_id UUID REFERENCES profiles(id) NOT NULL,
  type TEXT CHECK (type IN ('credit', 'debit', 'refund', 'topup', 'payment')) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  balance_before DECIMAL(10,2) NOT NULL,
  balance_after DECIMAL(10,2) NOT NULL,
  reference_id UUID,
  reference_type TEXT CHECK (reference_type IN ('payment', 'booking', 'refund', 'topup', 'admin_adjustment')),
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### receipt_uploads
```sql
CREATE TABLE receipt_uploads (
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
```

## 🧾 Payment Flow

### 1. Service Selection
- User selects a service from the available options
- System calculates total amount including any fees
- Location-based payment method filtering applied

### 2. Payment Method Selection
- `PaymentMethodSelector` component displays available methods based on user location
- Each method shows fees, processing time, and auto-confirmation status
- User selects preferred payment method

### 3. Payment Processing

#### Card Payments (Stripe/Square)
1. Payment form loads with secure tokenization
2. User enters card details
3. Payment processed immediately
4. Success/failure response handled
5. Payment record created in database

#### USDT Payments
1. User selects network (Ethereum/TRON)
2. Wallet address displayed for transfer
3. User sends USDT to provided address
4. User submits transaction hash
5. Admin verifies on blockchain
6. Payment approved/rejected

#### Transfer Payments
1. Transfer instructions displayed
2. User completes transfer at service location
3. User uploads receipt photo
4. Admin reviews and verifies receipt
5. Payment approved/rejected

#### Wallet Payments
1. Wallet balance checked
2. Sufficient funds verified
3. Payment processed instantly
4. Wallet balance updated
5. Transaction logged

### 4. Confirmation
- Payment confirmation displayed
- Booking status updated
- User redirected to dashboard
- Notifications sent

## 🛠 Admin Tools

### Payment Management
- View all pending payments requiring approval
- Review uploaded receipts and transaction hashes
- Approve/reject payments with notes
- View complete payment history
- Export payment reports

### Wallet Management
- View all user wallets and balances
- Add/remove funds from user wallets
- View wallet transaction history
- Manage wallet status (active/inactive)
- Generate wallet reports

### USDT Verification
- Direct links to blockchain explorers (Etherscan, TronScan)
- Transaction hash validation
- Network verification tools
- Automated balance checking (future enhancement)

## ⚙️ Configuration

### Environment Variables
```env
# Stripe Configuration
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...

# Square Configuration  
VITE_SQUARE_APPLICATION_ID=sandbox-sq0idb-...
VITE_SQUARE_LOCATION_ID=L...
SQUARE_ACCESS_TOKEN=EAAAl...

# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Payment Method Configuration
```javascript
// Location-based method availability
const paymentMethods = {
  eu_countries: ['stripe'],
  uae_countries: ['stripe'], 
  other_countries: ['square'],
  global: ['usdt', 'western_union', 'moneygram', 'ria', 'wallet'],
  lebanon: ['omt', 'whish', 'bob']
};
```

## 🔒 Security Features

### Data Protection
- All payment data encrypted in transit and at rest
- PCI DSS compliance for card payments
- Secure file upload for receipts
- Row Level Security (RLS) policies

### Access Control
- Role-based permissions (client, admin, monitor)
- API authentication required for all operations
- Admin-only functions protected
- Audit logging for all payment operations

### Validation
- Input sanitization and validation
- Transaction hash format verification
- File type and size restrictions
- Amount and balance validation

## 📱 Mobile Responsiveness

All payment components are fully responsive and optimized for:
- Mobile phones (320px+)
- Tablets (768px+)
- Desktop (1024px+)
- Touch-friendly interfaces
- Optimized loading states

## 🌐 Internationalization

### Multi-language Support
- English (default)
- Arabic (RTL support)
- French
- Spanish

### Currency Support
- USD (primary)
- EUR (for EU users)
- AED (for UAE users)
- LBP (for Lebanon users)

## 🚀 Future Enhancements

### Planned Features
1. **Automated USDT Verification** - Blockchain API integration
2. **Recurring Payments** - Subscription-based services
3. **Payment Plans** - Installment options for expensive services
4. **Loyalty Points** - Reward system integration
5. **Multi-currency Wallets** - Support for multiple currencies
6. **Payment Analytics** - Advanced reporting and insights
7. **Fraud Detection** - AI-powered fraud prevention
8. **Mobile App Integration** - Native mobile payment flows

### API Integrations
- Blockchain APIs for automated verification
- Exchange rate APIs for currency conversion
- SMS APIs for payment notifications
- Email APIs for receipt delivery

## 📊 Monitoring & Analytics

### Key Metrics
- Payment success rates by method
- Average processing times
- Failed payment analysis
- Revenue tracking
- User payment preferences

### Logging
- All payment attempts logged
- Admin actions tracked
- Error monitoring and alerting
- Performance metrics collection

## 🆘 Support & Troubleshooting

### Common Issues
1. **Payment Failures** - Check network connectivity and payment details
2. **USDT Verification Delays** - Blockchain congestion may cause delays
3. **Receipt Upload Issues** - Verify file format and size limits
4. **Wallet Balance Discrepancies** - Check transaction history

### Support Channels
- In-app support chat
- Email support for payment issues
- Admin dashboard for manual intervention
- Documentation and FAQ section

## 📋 Testing

### Test Scenarios
1. **Card Payments** - Use Stripe/Square test cards
2. **USDT Payments** - Use testnet transactions
3. **Transfer Payments** - Upload sample receipts
4. **Wallet Payments** - Test with various balance scenarios
5. **Admin Functions** - Test approval/rejection workflows

### Test Data
```javascript
// Stripe Test Cards
const testCards = {
  visa: '4242424242424242',
  mastercard: '5555555555554444',
  declined: '4000000000000002'
};

// Test USDT Addresses
const testAddresses = {
  ethereum: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b1',
  tron: 'TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE'
};
```

## 📄 License & Compliance

- PCI DSS Level 1 compliance for card processing
- GDPR compliance for EU users
- SOC 2 Type II certification
- Regular security audits and penetration testing

---

*This documentation covers the complete payment system implementation for the SAMIA TAROT platform. For technical support or questions, please contact the development team.* 