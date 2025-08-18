import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import api from '../../services/frontendApi.js';

const PaymentSummary = () => {
  const { user, profile } = useAuth();
  const [wallet, setWallet] = useState(null);
  const [recentPayments, setRecentPayments] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState('overview'); // overview, payments, transactions
  const [error, setError] = useState(null);

  useEffect(() => {
    loadPaymentData();
  }, []);

  const loadPaymentData = async () => {
    setLoading(true);
    try {
      // Load wallet data
      const walletResult = await api.getUserWallet(user.id);
      if (walletResult.success) {
        setWallet(walletResult.data);
      }

      // Load recent payments
      const paymentsResult = await api.getUserPayments(user.id);
      if (paymentsResult.success) {
        setRecentPayments(paymentsResult.data.slice(0, 5)); // Last 5 payments
      }

      // Load wallet transactions
      const transactionsResult = await api.getWalletTransactions(user.id, 10);
      if (transactionsResult.success) {
        setTransactions(transactionsResult.data);
      }
    } catch (err) {
      setError('Failed to load payment data');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-800', text: 'Pending' },
      awaiting_approval: { color: 'bg-orange-100 text-orange-800', text: 'Awaiting Approval' },
      processing: { color: 'bg-blue-100 text-blue-800', text: 'Processing' },
      completed: { color: 'bg-green-100 text-green-800', text: 'Completed' },
      failed: { color: 'bg-red-100 text-red-800', text: 'Failed' },
      refunded: { color: 'bg-gray-100 text-gray-800', text: 'Refunded' }
    };

    const config = statusConfig[status] || statusConfig.pending;
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        {config.text}
      </span>
    );
  };

  const getMethodIcon = (method) => {
    const icons = {
      stripe: '💳',
      square: '🟦',
      usdt: '₿',
      western_union: '🌍',
      moneygram: '💸',
      ria: '🏦',
      omt: '🇱🇧',
      whish: '📱',
      bob: '🏛️',
      wallet: '👛'
    };
    return icons[method] || '💳';
  };

  const getTransactionIcon = (type) => {
    const icons = {
      credit: '💰',
      debit: '💸',
      refund: '🔄',
      topup: '⬆️',
      payment: '💳'
    };
    return icons[type] || '💰';
  };

  const getTransactionColor = (type) => {
    const colors = {
      credit: 'text-green-600',
      debit: 'text-red-600',
      refund: 'text-blue-600',
      topup: 'text-green-600',
      payment: 'text-purple-600'
    };
    return colors[type] || 'text-gray-600';
  };

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Wallet Balance Card */}
      <div className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <span className="text-3xl mr-3">👛</span>
            <div>
              <h3 className="text-xl font-semibold">SAMIA Wallet</h3>
              <p className="text-purple-200">Available Balance</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold">${wallet?.balance || '0.00'}</p>
            <p className="text-purple-200">USD</p>
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <button className="bg-white bg-opacity-20 hover:bg-opacity-30 px-4 py-2 rounded-lg transition-colors">
            Top Up Wallet
          </button>
          <span className="text-purple-200 text-sm">
            Last updated: {wallet ? new Date(wallet.updated_at).toLocaleDateString() : 'N/A'}
          </span>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mr-3">
              <span className="text-green-600">✅</span>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {recentPayments.filter(p => p.status === 'completed').length}
              </p>
              <p className="text-sm text-gray-600">Completed Payments</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center mr-3">
              <span className="text-yellow-600">⏳</span>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {recentPayments.filter(p => ['pending', 'awaiting_approval'].includes(p.status)).length}
              </p>
              <p className="text-sm text-gray-600">Pending Payments</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center mr-3">
              <span className="text-purple-600">💰</span>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                ${recentPayments.filter(p => p.status === 'completed').reduce((sum, p) => sum + parseFloat(p.amount), 0).toFixed(2)}
              </p>
              <p className="text-sm text-gray-600">Total Spent</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <h4 className="font-medium text-gray-900">Recent Activity</h4>
        </div>
        <div className="divide-y divide-gray-200">
          {recentPayments.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No payment activity yet
            </div>
          ) : (
            recentPayments.slice(0, 3).map((payment) => (
              <div key={payment.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">{getMethodIcon(payment.method)}</span>
                    <div>
                      <p className="font-medium text-gray-900 capitalize">
                        {payment.method.replace('_', ' ')} Payment
                      </p>
                      <p className="text-sm text-gray-600">
                        {new Date(payment.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-gray-900">${payment.amount}</p>
                    {getStatusBadge(payment.status)}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        {recentPayments.length > 3 && (
          <div className="p-4 border-t border-gray-200">
            <button
              onClick={() => setSelectedTab('payments')}
              className="w-full text-center text-purple-600 hover:text-purple-800 font-medium"
            >
              View All Payments
            </button>
          </div>
        )}
      </div>
    </div>
  );

  const renderPayments = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Payment History</h3>
        <span className="text-sm text-gray-600">{recentPayments.length} payments</span>
      </div>

      {recentPayments.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-gray-400 text-4xl mb-4">💳</div>
          <p className="text-gray-600">No payments found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {recentPayments.map((payment) => (
            <div key={payment.id} className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{getMethodIcon(payment.method)}</span>
                  <div>
                    <h4 className="font-medium text-gray-900 capitalize">
                      {payment.method.replace('_', ' ')} Payment
                    </h4>
                    <p className="text-sm text-gray-600">
                      {new Date(payment.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-gray-900">${payment.amount}</p>
                  {getStatusBadge(payment.status)}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Transaction ID:</span>
                  <span className="ml-2 font-mono text-xs">
                    {payment.transaction_id || payment.transaction_hash || 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Booking:</span>
                  <span className="ml-2 font-medium">
                    {payment.booking_id ? `#${payment.booking_id.slice(-8)}` : 'N/A'}
                  </span>
                </div>
              </div>

              {payment.admin_notes && (
                <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Note:</strong> {payment.admin_notes}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderTransactions = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Wallet Transactions</h3>
        <span className="text-sm text-gray-600">{transactions.length} transactions</span>
      </div>

      {transactions.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-gray-400 text-4xl mb-4">👛</div>
          <p className="text-gray-600">No wallet transactions found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {transactions.map((transaction) => (
            <div key={transaction.id} className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{getTransactionIcon(transaction.type)}</span>
                  <div>
                    <p className="font-medium text-gray-900 capitalize">
                      {transaction.type.replace('_', ' ')}
                    </p>
                    <p className="text-sm text-gray-600">{transaction.description}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(transaction.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-lg font-bold ${getTransactionColor(transaction.type)}`}>
                    {transaction.type === 'credit' ? '+' : '-'}${transaction.amount.toFixed(2)}
                  </p>
                  <p className="text-sm text-gray-500">
                    Balance: ${transaction.balance_after.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
        <span className="ml-3 text-gray-600">Loading payment data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Payment & Wallet</h2>
        <div className="flex space-x-2">
          <button
            onClick={() => setSelectedTab('overview')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              selectedTab === 'overview'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setSelectedTab('payments')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              selectedTab === 'payments'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Payments
          </button>
          <button
            onClick={() => setSelectedTab('transactions')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              selectedTab === 'transactions'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Wallet
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 rounded-lg p-4">
          {error}
        </div>
      )}

      <div>
        {selectedTab === 'overview' && renderOverview()}
        {selectedTab === 'payments' && renderPayments()}
        {selectedTab === 'transactions' && renderTransactions()}
      </div>
    </div>
  );
};

export default PaymentSummary; 