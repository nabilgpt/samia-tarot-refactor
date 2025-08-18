/**
 * Payments Repository - SAMIA TAROT
 * 
 * Repository for payment transactions and user wallet management
 * with comprehensive financial tracking.
 */

import { DatabaseClient, QueryResult } from '../db/pg';
import { TABLES } from '../db/tables';

/**
 * Payment transaction interface
 */
export interface PaymentTransaction {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
  transaction_type: 'deposit' | 'withdrawal' | 'payment' | 'refund' | 'emergency_extension';
  payment_method: 'stripe' | 'square' | 'usdt' | 'wallet' | 'transfer';
  status: 'pending' | 'completed' | 'failed' | 'cancelled' | 'refunded';
  payment_gateway?: string;
  gateway_transaction_id?: string;
  gateway_response?: Record<string, any>;
  description?: string;
  created_at: string;
  completed_at?: string;
  updated_at: string;
}

/**
 * User wallet interface
 */
export interface UserWallet {
  id: string;
  user_id: string;
  balance: number;
  currency: string;
  is_active: boolean;
  last_transaction_at?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Payments and wallet repository
 */
export class PaymentsRepository {
  constructor(private db: DatabaseClient) {}

  /**
   * Create payment transaction
   */
  async createTransaction(transactionData: {
    userId: string;
    amount: number;
    currency?: string;
    transactionType: PaymentTransaction['transaction_type'];
    paymentMethod: PaymentTransaction['payment_method'];
    paymentGateway?: string;
    gatewayTransactionId?: string;
    description?: string;
  }): Promise<QueryResult<PaymentTransaction>> {
    const transaction = {
      user_id: transactionData.userId,
      amount: transactionData.amount,
      currency: transactionData.currency || 'USD',
      transaction_type: transactionData.transactionType,
      payment_method: transactionData.paymentMethod,
      status: 'pending' as const,
      payment_gateway: transactionData.paymentGateway,
      gateway_transaction_id: transactionData.gatewayTransactionId,
      description: transactionData.description,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    return this.db.insert<PaymentTransaction>(TABLES.PAYMENT_TRANSACTIONS, transaction);
  }

  /**
   * Update transaction status
   */
  async updateTransactionStatus(
    transactionId: string,
    status: PaymentTransaction['status'],
    gatewayResponse?: Record<string, any>
  ): Promise<QueryResult<PaymentTransaction[]>> {
    const updateData: Partial<PaymentTransaction> = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (status === 'completed') {
      updateData.completed_at = new Date().toISOString();
    }

    if (gatewayResponse) {
      updateData.gateway_response = gatewayResponse;
    }

    return this.db.update<PaymentTransaction>(
      TABLES.PAYMENT_TRANSACTIONS,
      updateData,
      { id: transactionId }
    );
  }

  /**
   * Get transaction by ID
   */
  async getTransaction(transactionId: string): Promise<QueryResult<PaymentTransaction[]>> {
    return this.db.select<PaymentTransaction>(TABLES.PAYMENT_TRANSACTIONS, {
      conditions: { id: transactionId },
    });
  }

  /**
   * Get user transactions
   */
  async getUserTransactions(
    userId: string,
    options: {
      limit?: number;
      offset?: number;
      status?: PaymentTransaction['status'];
      transactionType?: PaymentTransaction['transaction_type'];
    } = {}
  ): Promise<QueryResult<PaymentTransaction[]>> {
    const conditions: Record<string, any> = { user_id: userId };
    
    if (options.status) {
      conditions.status = options.status;
    }
    
    if (options.transactionType) {
      conditions.transaction_type = options.transactionType;
    }

    return this.db.select<PaymentTransaction>(TABLES.PAYMENT_TRANSACTIONS, {
      conditions,
      orderBy: { column: 'created_at', ascending: false },
      limit: options.limit,
      offset: options.offset,
    });
  }

  /**
   * Get transaction by gateway ID
   */
  async getTransactionByGatewayId(
    gatewayTransactionId: string
  ): Promise<QueryResult<PaymentTransaction[]>> {
    return this.db.select<PaymentTransaction>(TABLES.PAYMENT_TRANSACTIONS, {
      conditions: { gateway_transaction_id: gatewayTransactionId },
    });
  }

  /**
   * Create or get user wallet
   */
  async getOrCreateUserWallet(
    userId: string,
    currency: string = 'USD'
  ): Promise<QueryResult<UserWallet>> {
    // Try to get existing wallet
    const existingResult = await this.db.select<UserWallet>(TABLES.USER_WALLETS, {
      conditions: { user_id: userId, currency: currency },
    });

    if (existingResult.error) {
      return { data: null, error: existingResult.error };
    }

    if (existingResult.data && existingResult.data.length > 0) {
      return { data: existingResult.data[0], error: null };
    }

    // Create new wallet
    const newWallet = {
      user_id: userId,
      balance: 0,
      currency: currency,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    return this.db.insert<UserWallet>(TABLES.USER_WALLETS, newWallet);
  }

  /**
   * Get user wallet
   */
  async getUserWallet(
    userId: string,
    currency: string = 'USD'
  ): Promise<QueryResult<UserWallet[]>> {
    return this.db.select<UserWallet>(TABLES.USER_WALLETS, {
      conditions: { 
        user_id: userId, 
        currency: currency,
        is_active: true 
      },
    });
  }

  /**
   * Update wallet balance (with transaction)
   */
  async updateWalletBalance(
    userId: string,
    amount: number,
    transactionType: PaymentTransaction['transaction_type'],
    description: string,
    currency: string = 'USD'
  ): Promise<QueryResult<{
    wallet: UserWallet;
    transaction: PaymentTransaction;
  }>> {
    try {
      // Get current wallet
      const walletResult = await this.getOrCreateUserWallet(userId, currency);
      
      if (walletResult.error || !walletResult.data) {
        return { data: null, error: walletResult.error };
      }

      const currentWallet = walletResult.data;
      const newBalance = currentWallet.balance + amount;

      // Validate sufficient funds for withdrawals
      if (amount < 0 && newBalance < 0) {
        return { 
          data: null, 
          error: new Error('Insufficient wallet balance') 
        };
      }

      // Create transaction record
      const transactionResult = await this.createTransaction({
        userId,
        amount: Math.abs(amount),
        currency,
        transactionType,
        paymentMethod: 'wallet',
        description,
      });

      if (transactionResult.error || !transactionResult.data) {
        return { data: null, error: transactionResult.error };
      }

      // Update wallet balance
      const updateResult = await this.db.update<UserWallet>(
        TABLES.USER_WALLETS,
        {
          balance: newBalance,
          last_transaction_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { id: currentWallet.id }
      );

      if (updateResult.error || !updateResult.data) {
        return { data: null, error: updateResult.error };
      }

      // Mark transaction as completed
      await this.updateTransactionStatus(transactionResult.data.id, 'completed');

      return {
        data: {
          wallet: { ...currentWallet, balance: newBalance },
          transaction: transactionResult.data,
        },
        error: null,
      };
    } catch (error) {
      return { 
        data: null, 
        error: error instanceof Error ? error : new Error('Wallet update failed') 
      };
    }
  }

  /**
   * Add funds to wallet
   */
  async addWalletFunds(
    userId: string,
    amount: number,
    description: string = 'Wallet deposit',
    currency: string = 'USD'
  ): Promise<QueryResult<{ wallet: UserWallet; transaction: PaymentTransaction }>> {
    if (amount <= 0) {
      return { data: null, error: new Error('Amount must be positive') };
    }

    return this.updateWalletBalance(userId, amount, 'deposit', description, currency);
  }

  /**
   * Deduct funds from wallet
   */
  async deductWalletFunds(
    userId: string,
    amount: number,
    description: string = 'Payment',
    currency: string = 'USD'
  ): Promise<QueryResult<{ wallet: UserWallet; transaction: PaymentTransaction }>> {
    if (amount <= 0) {
      return { data: null, error: new Error('Amount must be positive') };
    }

    return this.updateWalletBalance(userId, -amount, 'payment', description, currency);
  }

  /**
   * Transfer funds between wallets
   */
  async transferFunds(
    fromUserId: string,
    toUserId: string,
    amount: number,
    description: string = 'Transfer',
    currency: string = 'USD'
  ): Promise<QueryResult<{
    from_wallet: UserWallet;
    to_wallet: UserWallet;
    from_transaction: PaymentTransaction;
    to_transaction: PaymentTransaction;
  }>> {
    if (amount <= 0) {
      return { data: null, error: new Error('Transfer amount must be positive') };
    }

    try {
      // Deduct from sender
      const deductResult = await this.deductWalletFunds(
        fromUserId, 
        amount, 
        `Transfer to user: ${description}`, 
        currency
      );

      if (deductResult.error) {
        return { data: null, error: deductResult.error };
      }

      // Add to receiver
      const addResult = await this.addWalletFunds(
        toUserId, 
        amount, 
        `Transfer from user: ${description}`, 
        currency
      );

      if (addResult.error) {
        // Rollback sender deduction
        await this.addWalletFunds(fromUserId, amount, 'Transfer rollback', currency);
        return { data: null, error: addResult.error };
      }

      return {
        data: {
          from_wallet: deductResult.data!.wallet,
          to_wallet: addResult.data!.wallet,
          from_transaction: deductResult.data!.transaction,
          to_transaction: addResult.data!.transaction,
        },
        error: null,
      };
    } catch (error) {
      return { 
        data: null, 
        error: error instanceof Error ? error : new Error('Transfer failed') 
      };
    }
  }

  /**
   * Get wallet balance
   */
  async getWalletBalance(
    userId: string,
    currency: string = 'USD'
  ): Promise<QueryResult<{ balance: number; currency: string }[]>> {
    const walletResult = await this.getUserWallet(userId, currency);
    
    if (walletResult.error) {
      return { data: null, error: walletResult.error };
    }

    const wallet = walletResult.data?.[0];
    const balance = wallet ? wallet.balance : 0;

    return {
      data: [{ balance, currency }],
      error: null,
    };
  }

  /**
   * Process emergency extension payment
   */
  async processEmergencyExtensionPayment(
    userId: string,
    amount: number,
    extensionType: string,
    sessionId: string
  ): Promise<QueryResult<PaymentTransaction>> {
    return this.createTransaction({
      userId,
      amount,
      currency: 'USD',
      transactionType: 'emergency_extension',
      paymentMethod: 'wallet',
      description: `Emergency ${extensionType} extension for session ${sessionId}`,
    });
  }

  /**
   * Get payment statistics
   */
  async getPaymentStats(
    userId: string,
    options: {
      startDate?: string;
      endDate?: string;
      currency?: string;
    } = {}
  ): Promise<QueryResult<{
    total_transactions: number;
    total_deposits: number;
    total_payments: number;
    total_refunds: number;
    current_balance: number;
    currency: string;
  }[]>> {
    const currency = options.currency || 'USD';
    
    // Get transactions
    const transactionsResult = await this.db.query<PaymentTransaction[]>(
      TABLES.PAYMENT_TRANSACTIONS,
      async (table) => {
        let query = table
          .select('*')
          .eq('user_id', userId)
          .eq('currency', currency)
          .eq('status', 'completed');

        if (options.startDate) {
          query = query.gte('completed_at', options.startDate);
        }
        if (options.endDate) {
          query = query.lte('completed_at', options.endDate);
        }

        return await query;
      }
    );

    if (transactionsResult.error) {
      return { data: null, error: transactionsResult.error };
    }

    const transactions = transactionsResult.data || [];
    
    // Get current balance
    const balanceResult = await this.getWalletBalance(userId, currency);
    const currentBalance = balanceResult.data?.[0]?.balance || 0;

    // Calculate statistics
    const deposits = transactions.filter(t => t.transaction_type === 'deposit');
    const payments = transactions.filter(t => t.transaction_type === 'payment');
    const refunds = transactions.filter(t => t.transaction_type === 'refund');

    const stats = {
      total_transactions: transactions.length,
      total_deposits: deposits.reduce((sum, t) => sum + t.amount, 0),
      total_payments: payments.reduce((sum, t) => sum + t.amount, 0),
      total_refunds: refunds.reduce((sum, t) => sum + t.amount, 0),
      current_balance: currentBalance,
      currency: currency,
    };

    return { data: [stats], error: null };
  }

  /**
   * Get pending transactions
   */
  async getPendingTransactions(
    userId?: string
  ): Promise<QueryResult<PaymentTransaction[]>> {
    const conditions: Record<string, any> = { status: 'pending' };
    
    if (userId) {
      conditions.user_id = userId;
    }

    return this.db.select<PaymentTransaction>(TABLES.PAYMENT_TRANSACTIONS, {
      conditions,
      orderBy: { column: 'created_at', ascending: true },
    });
  }

  /**
   * Expire old pending transactions
   */
  async expireOldPendingTransactions(
    timeoutMinutes: number = 30
  ): Promise<QueryResult<PaymentTransaction[]>> {
    const cutoffTime = new Date();
    cutoffTime.setMinutes(cutoffTime.getMinutes() - timeoutMinutes);

    return this.db.query<PaymentTransaction[]>(TABLES.PAYMENT_TRANSACTIONS, async (table) => {
      return await table
        .update({ 
          status: 'cancelled',
          updated_at: new Date().toISOString(),
        })
        .eq('status', 'pending')
        .lt('created_at', cutoffTime.toISOString())
        .select();
    });
  }

  /**
   * Refund transaction
   */
  async refundTransaction(
    originalTransactionId: string,
    refundAmount?: number,
    reason?: string
  ): Promise<QueryResult<{
    original_transaction: PaymentTransaction;
    refund_transaction: PaymentTransaction;
  }>> {
    // Get original transaction
    const originalResult = await this.getTransaction(originalTransactionId);
    
    if (originalResult.error || !originalResult.data?.[0]) {
      return { data: null, error: new Error('Original transaction not found') };
    }

    const originalTransaction = originalResult.data[0];
    const refundAmountFinal = refundAmount || originalTransaction.amount;

    // Create refund transaction
    const refundResult = await this.createTransaction({
      userId: originalTransaction.user_id,
      amount: refundAmountFinal,
      currency: originalTransaction.currency,
      transactionType: 'refund',
      paymentMethod: originalTransaction.payment_method,
      description: `Refund for transaction ${originalTransactionId}: ${reason || 'No reason provided'}`,
    });

    if (refundResult.error) {
      return { data: null, error: refundResult.error };
    }

    // Update original transaction status
    await this.updateTransactionStatus(originalTransactionId, 'refunded');

    // Mark refund as completed and add funds to wallet
    await this.updateTransactionStatus(refundResult.data!.id, 'completed');
    await this.addWalletFunds(
      originalTransaction.user_id,
      refundAmountFinal,
      `Refund for transaction ${originalTransactionId}`,
      originalTransaction.currency
    );

    return {
      data: {
        original_transaction: originalTransaction,
        refund_transaction: refundResult.data!,
      },
      error: null,
    };
  }
}