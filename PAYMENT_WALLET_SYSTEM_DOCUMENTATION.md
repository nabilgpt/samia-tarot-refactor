# SAMIA TAROT - Payment & Wallet System Documentation

## Overview
The SAMIA TAROT Payment & Wallet System provides secure payment processing, digital wallet management, and comprehensive financial controls with support for multiple payment methods and currencies.

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Payment Methods](#payment-methods)
3. [Wallet Management](#wallet-management)
4. [Transaction Processing](#transaction-processing)
5. [Security Features](#security-features)
6. [API Integration](#api-integration)
7. [Frontend Components](#frontend-components)
8. [Financial Controls](#financial-controls)
9. [Reporting & Analytics](#reporting--analytics)
10. [Compliance](#compliance)

## Architecture Overview

### System Components
- **Payment Gateway**: Stripe, Square, PayPal integration
- **Wallet Engine**: Digital balance management
- **Transaction Processor**: Payment flow handling
- **Security Layer**: PCI DSS compliance and fraud detection
- **Analytics Engine**: Financial reporting and insights

### Payment Flow
```
User Initiation → Payment Method Selection → Gateway Processing → Transaction Validation → Wallet Update → Confirmation
```

## Payment Methods

### Supported Payment Types
```javascript
const paymentMethods = {
  creditCard: {
    name: 'Credit/Debit Card',
    providers: ['stripe', 'square'],
    currencies: ['USD', 'EUR', 'GBP'],
    fees: { percentage: 2.9, fixed: 0.30 }
  },
  digitalWallet: {
    name: 'Digital Wallets',
    providers: ['paypal', 'apple_pay', 'google_pay'],
    currencies: ['USD', 'EUR'],
    fees: { percentage: 2.4, fixed: 0.30 }
  },
  bankTransfer: {
    name: 'Bank Transfer',
    providers: ['stripe_ach', 'plaid'],
    currencies: ['USD'],
    fees: { percentage: 0.8, fixed: 0.00 }
  },
  cryptocurrency: {
    name: 'Cryptocurrency',
    providers: ['coinbase', 'blockchain'],
    currencies: ['BTC', 'ETH', 'USDC'],
    fees: { percentage: 1.5, fixed: 0.00 }
  }
};
```

### Payment Method Component
```jsx
// src/components/Payment/PaymentMethodSelector.jsx
const PaymentMethodSelector = ({ onMethodSelect, selectedMethod }) => {
  const [availableMethods, setAvailableMethods] = useState([]);

  useEffect(() => {
    fetchAvailablePaymentMethods();
  }, []);

  const fetchAvailablePaymentMethods = async () => {
    try {
      const response = await paymentApi.getAvailableMethods();
      setAvailableMethods(response.data);
    } catch (error) {
      console.error('Failed to fetch payment methods:', error);
    }
  };

  return (
    <div className="payment-method-selector">
      <h3 className="cosmic-subheading text-lg mb-4">Select Payment Method</h3>
      
      <div className="payment-methods-grid">
        {availableMethods.map(method => (
          <PaymentMethodCard
            key={method.id}
            method={method}
            isSelected={selectedMethod?.id === method.id}
            onClick={() => onMethodSelect(method)}
          />
        ))}
      </div>
    </div>
  );
};

const PaymentMethodCard = ({ method, isSelected, onClick }) => {
  return (
    <CosmicCard 
      className={`payment-method-card p-4 cursor-pointer transition-cosmic ${
        isSelected ? 'border-cosmic-gold' : ''
      }`}
      onClick={onClick}
    >
      <div className="flex items-center space-x-3">
        <img 
          src={method.icon} 
          alt={method.name}
          className="w-8 h-8"
        />
        <div>
          <h4 className="text-white font-medium">{method.name}</h4>
          <p className="text-cosmic-purple-300 text-sm">
            Fee: {method.fees.percentage}% + ${method.fees.fixed}
          </p>
        </div>
      </div>
      {isSelected && (
        <CheckCircleIcon className="w-5 h-5 text-cosmic-gold ml-auto" />
      )}
    </CosmicCard>
  );
};
```

## Wallet Management

### Digital Wallet System
```javascript
// src/services/walletService.js
class WalletService {
  async getBalance(userId) {
    try {
      const { data } = await supabase
        .from('user_wallets')
        .select('balance, currency')
        .eq('user_id', userId)
        .single();
      
      return data;
    } catch (error) {
      console.error('Failed to fetch wallet balance:', error);
      throw error;
    }
  }

  async addFunds(userId, amount, paymentMethodId) {
    try {
      // Process payment through gateway
      const paymentResult = await this.processPayment({
        amount,
        paymentMethodId,
        description: 'Wallet top-up'
      });

      if (paymentResult.success) {
        // Update wallet balance
        await this.updateBalance(userId, amount, 'credit', {
          transactionId: paymentResult.transactionId,
          type: 'deposit',
          source: 'payment_gateway'
        });

        return { success: true, newBalance: await this.getBalance(userId) };
      }
    } catch (error) {
      console.error('Failed to add funds:', error);
      throw error;
    }
  }

  async deductFunds(userId, amount, description) {
    try {
      const currentBalance = await this.getBalance(userId);
      
      if (currentBalance.balance < amount) {
        throw new Error('Insufficient funds');
      }

      await this.updateBalance(userId, -amount, 'debit', {
        type: 'payment',
        description
      });

      return { success: true, newBalance: currentBalance.balance - amount };
    } catch (error) {
      console.error('Failed to deduct funds:', error);
      throw error;
    }
  }

  async updateBalance(userId, amount, type, metadata = {}) {
    const { data, error } = await supabase.rpc('update_wallet_balance', {
      p_user_id: userId,
      p_amount: amount,
      p_transaction_type: type,
      p_metadata: metadata
    });

    if (error) throw error;
    return data;
  }
}

export const walletService = new WalletService();
```

### Wallet Component
```jsx
// src/components/Client/ClientWallet.jsx
const ClientWallet = () => {
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [showTopUp, setShowTopUp] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWalletData();
  }, []);

  const fetchWalletData = async () => {
    try {
      const [walletData, transactionData] = await Promise.all([
        walletService.getBalance(user.id),
        walletService.getTransactions(user.id)
      ]);
      
      setWallet(walletData);
      setTransactions(transactionData);
    } catch (error) {
      console.error('Failed to fetch wallet data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTopUp = async (amount, paymentMethod) => {
    try {
      await walletService.addFunds(user.id, amount, paymentMethod.id);
      await fetchWalletData();
      setShowTopUp(false);
    } catch (error) {
      console.error('Top-up failed:', error);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="client-wallet space-y-6">
      <WalletBalance 
        balance={wallet.balance}
        currency={wallet.currency}
        onTopUp={() => setShowTopUp(true)}
      />

      <WalletStats transactions={transactions} />

      <TransactionHistory transactions={transactions} />

      {showTopUp && (
        <TopUpModal
          onClose={() => setShowTopUp(false)}
          onTopUp={handleTopUp}
        />
      )}
    </div>
  );
};
```

## Transaction Processing

### Payment Processing Service
```javascript
// src/services/paymentService.js
class PaymentService {
  constructor() {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    this.square = new SquareApi(process.env.SQUARE_ACCESS_TOKEN);
  }

  async processPayment(paymentData) {
    const { amount, currency, paymentMethodId, provider } = paymentData;

    switch (provider) {
      case 'stripe':
        return await this.processStripePayment(paymentData);
      case 'square':
        return await this.processSquarePayment(paymentData);
      case 'paypal':
        return await this.processPayPalPayment(paymentData);
      default:
        throw new Error('Unsupported payment provider');
    }
  }

  async processStripePayment({ amount, currency, paymentMethodId, customerId }) {
    try {
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: amount * 100, // Convert to cents
        currency: currency.toLowerCase(),
        payment_method: paymentMethodId,
        customer: customerId,
        confirmation_method: 'manual',
        confirm: true,
        return_url: `${process.env.FRONTEND_URL}/payment/return`
      });

      return {
        success: paymentIntent.status === 'succeeded',
        transactionId: paymentIntent.id,
        status: paymentIntent.status,
        clientSecret: paymentIntent.client_secret
      };
    } catch (error) {
      console.error('Stripe payment failed:', error);
      throw error;
    }
  }

  async processSquarePayment({ amount, currency, sourceId, locationId }) {
    try {
      const request = {
        sourceId,
        amountMoney: {
          amount: amount * 100,
          currency: currency.toUpperCase()
        },
        locationId,
        idempotencyKey: uuidv4()
      };

      const response = await this.square.paymentsApi.createPayment(request);
      
      return {
        success: response.result.payment.status === 'COMPLETED',
        transactionId: response.result.payment.id,
        status: response.result.payment.status
      };
    } catch (error) {
      console.error('Square payment failed:', error);
      throw error;
    }
  }

  async refundPayment(transactionId, amount, reason) {
    try {
      // Determine provider from transaction
      const transaction = await this.getTransaction(transactionId);
      
      switch (transaction.provider) {
        case 'stripe':
          return await this.processStripeRefund(transactionId, amount, reason);
        case 'square':
          return await this.processSquareRefund(transactionId, amount, reason);
        default:
          throw new Error('Refund not supported for this provider');
      }
    } catch (error) {
      console.error('Refund failed:', error);
      throw error;
    }
  }
}

export const paymentService = new PaymentService();
```

## Security Features

### PCI DSS Compliance
```javascript
// src/security/pciCompliance.js
class PCIComplianceManager {
  constructor() {
    this.encryptionKey = process.env.ENCRYPTION_KEY;
    this.tokenizationService = new TokenizationService();
  }

  // Never store raw card data
  async tokenizeCardData(cardData) {
    try {
      // Use payment gateway tokenization
      const token = await this.tokenizationService.tokenize(cardData);
      
      // Store only the token, never the actual card data
      return {
        token,
        lastFour: cardData.number.slice(-4),
        brand: this.detectCardBrand(cardData.number),
        expiryMonth: cardData.expiry_month,
        expiryYear: cardData.expiry_year
      };
    } catch (error) {
      console.error('Card tokenization failed:', error);
      throw error;
    }
  }

  // Encrypt sensitive data at rest
  encryptSensitiveData(data) {
    const cipher = crypto.createCipher('aes-256-cbc', this.encryptionKey);
    let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  }

  decryptSensitiveData(encryptedData) {
    const decipher = crypto.createDecipher('aes-256-cbc', this.encryptionKey);
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return JSON.parse(decrypted);
  }

  // Audit trail for all financial operations
  async logFinancialOperation(operation) {
    await supabase.from('financial_audit_logs').insert({
      user_id: operation.userId,
      operation_type: operation.type,
      amount: operation.amount,
      currency: operation.currency,
      transaction_id: operation.transactionId,
      ip_address: operation.ipAddress,
      user_agent: operation.userAgent,
      timestamp: new Date(),
      metadata: operation.metadata
    });
  }
}
```

### Fraud Detection
```javascript
// src/security/fraudDetection.js
class FraudDetectionService {
  async analyzeTransaction(transactionData) {
    const riskFactors = {
      amount: this.analyzeAmount(transactionData.amount),
      location: await this.analyzeLocation(transactionData.ipAddress),
      velocity: await this.analyzeVelocity(transactionData.userId),
      device: this.analyzeDevice(transactionData.deviceFingerprint),
      behavior: await this.analyzeBehavior(transactionData.userId)
    };

    const riskScore = this.calculateRiskScore(riskFactors);
    
    return {
      riskScore,
      riskLevel: this.getRiskLevel(riskScore),
      recommendations: this.getRecommendations(riskScore, riskFactors),
      requiresReview: riskScore > 70
    };
  }

  analyzeAmount(amount) {
    // Flag unusually large amounts
    if (amount > 1000) return 30;
    if (amount > 500) return 20;
    if (amount > 100) return 10;
    return 0;
  }

  async analyzeVelocity(userId) {
    // Check transaction frequency
    const recentTransactions = await this.getRecentTransactions(userId, '1 hour');
    
    if (recentTransactions.length > 5) return 40;
    if (recentTransactions.length > 3) return 25;
    if (recentTransactions.length > 1) return 10;
    return 0;
  }

  calculateRiskScore(factors) {
    return Object.values(factors).reduce((sum, score) => sum + score, 0);
  }

  getRiskLevel(score) {
    if (score > 70) return 'HIGH';
    if (score > 40) return 'MEDIUM';
    return 'LOW';
  }
}
```

## API Integration

### Payment API Routes
```javascript
// src/api/routes/paymentRoutes.js
router.post('/payments/process', authenticateToken, async (req, res) => {
  try {
    const { amount, currency, paymentMethodId, description } = req.body;
    
    // Fraud detection
    const fraudAnalysis = await fraudDetectionService.analyzeTransaction({
      userId: req.user.userId,
      amount,
      ipAddress: req.ip,
      deviceFingerprint: req.headers['x-device-fingerprint']
    });

    if (fraudAnalysis.requiresReview) {
      return res.status(202).json({
        message: 'Payment requires manual review',
        reviewId: await createReviewRequest(req.body, fraudAnalysis)
      });
    }

    // Process payment
    const paymentResult = await paymentService.processPayment({
      amount,
      currency,
      paymentMethodId,
      customerId: req.user.stripeCustomerId
    });

    // Update wallet if successful
    if (paymentResult.success) {
      await walletService.addFunds(req.user.userId, amount, paymentMethodId);
    }

    res.json(paymentResult);
  } catch (error) {
    console.error('Payment processing failed:', error);
    res.status(500).json({ error: 'Payment processing failed' });
  }
});

router.post('/payments/refund', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { transactionId, amount, reason } = req.body;
    
    const refundResult = await paymentService.refundPayment(
      transactionId,
      amount,
      reason
    );

    // Update wallet balance
    if (refundResult.success) {
      await walletService.deductFunds(req.user.userId, amount, 'Refund');
    }

    res.json(refundResult);
  } catch (error) {
    console.error('Refund processing failed:', error);
    res.status(500).json({ error: 'Refund processing failed' });
  }
});

router.get('/wallet/balance', authenticateToken, async (req, res) => {
  try {
    const balance = await walletService.getBalance(req.user.userId);
    res.json(balance);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch wallet balance' });
  }
});

router.get('/transactions', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 20, type, startDate, endDate } = req.query;
    
    const transactions = await transactionService.getUserTransactions(
      req.user.userId,
      { page, limit, type, startDate, endDate }
    );
    
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});
```

## Frontend Components

### Stripe Payment Component
```jsx
// src/components/Payment/StripePayment.jsx
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY);

const StripePayment = ({ amount, onSuccess, onError }) => {
  return (
    <Elements stripe={stripePromise}>
      <StripePaymentForm 
        amount={amount}
        onSuccess={onSuccess}
        onError={onError}
      />
    </Elements>
  );
};

const StripePaymentForm = ({ amount, onSuccess, onError }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    
    if (!stripe || !elements) return;

    setProcessing(true);

    try {
      const cardElement = elements.getElement(CardElement);
      
      // Create payment method
      const { error, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement
      });

      if (error) {
        onError(error.message);
        return;
      }

      // Process payment through backend
      const response = await paymentApi.processPayment({
        amount,
        currency: 'usd',
        paymentMethodId: paymentMethod.id
      });

      if (response.data.success) {
        onSuccess(response.data);
      } else {
        onError('Payment failed');
      }
    } catch (error) {
      onError(error.message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="stripe-payment-form">
      <div className="card-element-container">
        <CardElement
          options={{
            style: {
              base: {
                fontSize: '16px',
                color: '#ffffff',
                '::placeholder': {
                  color: '#9c78fc'
                }
              }
            }
          }}
        />
      </div>
      
      <CosmicButton
        type="submit"
        disabled={!stripe || processing}
        variant="primary"
        className="w-full mt-4"
      >
        {processing ? 'Processing...' : `Pay $${amount}`}
      </CosmicButton>
    </form>
  );
};
```

## Financial Controls

### Admin Financial Dashboard
```jsx
// src/components/Admin/FinancialControls.jsx
const FinancialControls = () => {
  const [financialData, setFinancialData] = useState({});
  const [timeRange, setTimeRange] = useState('30d');

  useEffect(() => {
    fetchFinancialData();
  }, [timeRange]);

  const fetchFinancialData = async () => {
    try {
      const response = await adminApi.getFinancialData(timeRange);
      setFinancialData(response.data);
    } catch (error) {
      console.error('Failed to fetch financial data:', error);
    }
  };

  return (
    <div className="financial-controls space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="cosmic-heading text-2xl">Financial Controls</h2>
        <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
      </div>

      <FinancialMetrics data={financialData.metrics} />
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RevenueChart data={financialData.revenue} />
        <TransactionVolumeChart data={financialData.volume} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <PaymentMethodBreakdown data={financialData.paymentMethods} />
        <RefundAnalysis data={financialData.refunds} />
        <FraudAlerts data={financialData.fraudAlerts} />
      </div>

      <TransactionManagement />
    </div>
  );
};
```

## Reporting & Analytics

### Financial Reports
```javascript
// src/services/financialReports.js
class FinancialReportsService {
  async generateRevenueReport(startDate, endDate) {
    const { data } = await supabase.rpc('generate_revenue_report', {
      start_date: startDate,
      end_date: endDate
    });

    return {
      totalRevenue: data.total_revenue,
      netRevenue: data.net_revenue,
      transactionCount: data.transaction_count,
      averageTransactionValue: data.avg_transaction_value,
      revenueByDay: data.revenue_by_day,
      revenueByMethod: data.revenue_by_method
    };
  }

  async generateReconciliationReport(date) {
    const transactions = await this.getTransactionsByDate(date);
    const gatewayData = await this.getGatewayData(date);
    
    const reconciliation = {
      totalTransactions: transactions.length,
      totalAmount: transactions.reduce((sum, t) => sum + t.amount, 0),
      gatewayTotal: gatewayData.total,
      discrepancies: this.findDiscrepancies(transactions, gatewayData),
      matchRate: this.calculateMatchRate(transactions, gatewayData)
    };

    return reconciliation;
  }

  async exportTransactions(filters) {
    const transactions = await this.getTransactions(filters);
    
    const csvData = transactions.map(t => ({
      'Transaction ID': t.id,
      'Date': t.created_at,
      'User': t.user_email,
      'Amount': t.amount,
      'Currency': t.currency,
      'Status': t.status,
      'Payment Method': t.payment_method,
      'Description': t.description
    }));

    return this.generateCSV(csvData);
  }
}
```

## Compliance

### Regulatory Compliance
```javascript
// src/compliance/regulations.js
class ComplianceManager {
  // PCI DSS Requirements
  async validatePCICompliance() {
    const checks = {
      cardDataStorage: await this.checkCardDataStorage(),
      encryption: await this.checkEncryption(),
      accessControl: await this.checkAccessControl(),
      monitoring: await this.checkMonitoring(),
      testing: await this.checkSecurityTesting()
    };

    return {
      compliant: Object.values(checks).every(check => check.passed),
      checks,
      recommendations: this.getComplianceRecommendations(checks)
    };
  }

  // AML (Anti-Money Laundering) Monitoring
  async monitorAMLCompliance(userId, transactionData) {
    const checks = {
      dailyLimit: await this.checkDailyTransactionLimit(userId, transactionData.amount),
      suspiciousActivity: await this.detectSuspiciousActivity(userId),
      sanctionsList: await this.checkSanctionsList(userId),
      geographicRestrictions: await this.checkGeographicRestrictions(transactionData.country)
    };

    if (!checks.dailyLimit.passed || checks.suspiciousActivity.detected) {
      await this.flagForReview(userId, transactionData, checks);
    }

    return checks;
  }

  // GDPR Data Protection
  async handleDataRequest(userId, requestType) {
    switch (requestType) {
      case 'export':
        return await this.exportUserData(userId);
      case 'delete':
        return await this.deleteUserData(userId);
      case 'rectify':
        return await this.rectifyUserData(userId);
      default:
        throw new Error('Invalid data request type');
    }
  }
}
```

---

**Last Updated**: December 2024
**Version**: 1.0.0
**Maintainer**: SAMIA TAROT Development Team 