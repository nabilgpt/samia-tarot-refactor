import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import api from '../../services/frontendApi.js';

const WalletManagement = () => {
  const { user, profile } = useAuth();
  const [wallets, setWallets] = useState([]);
  const [selectedWallet, setSelectedWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [showAddFunds, setShowAddFunds] = useState(false);
  const [fundAmount, setFundAmount] = useState('');
  const [fundDescription, setFundDescription] = useState('');

  useEffect(() => {
    loadWalletData();
  }, []);

  const loadWalletData = async () => {
    setLoading(true);
    try {
      // This would need to be implemented in the API
      // const result = await api.getAllWallets();
      // For now, we'll use placeholder data
      setWallets([
        {
          id: '1',
          user_id: 'user1',
          balance: 125.50,
          currency: 'USD',
          is_active: true,
          created_at: '2024-01-15T10:00:00Z',
          user: {
            first_name: 'John',
            last_name: 'Doe',
            phone: '+1234567890',
            email: 'john@example.com'
          }
        },
        {
          id: '2',
          user_id: 'user2',
          balance: 75.25,
          currency: 'USD',
          is_active: true,
          created_at: '2024-01-20T14:30:00Z',
          user: {
            first_name: 'Jane',
            last_name: 'Smith',
            phone: '+1234567891',
            email: 'jane@example.com'
          }
        }
      ]);
    } catch (err) {
      setError('Failed to load wallet data');
    } finally {
      setLoading(false);
    }
  };

  const loadTransactions = async (walletId) => {
    try {
      // This would need to be implemented in the API
      // const result = await api.getWalletTransactions(walletId);
      // For now, we'll use placeholder data
      setTransactions([
        {
          id: '1',
          type: 'credit',
          amount: 50.00,
          balance_before: 75.50,
          balance_after: 125.50,
          description: 'Admin credit - Welcome bonus',
          created_at: '2024-01-25T10:00:00Z'
        },
        {
          id: '2',
          type: 'debit',
          amount: 25.00,
          balance_before: 125.50,
          balance_after: 100.50,
          description: 'Payment for Tarot Reading',
          created_at: '2024-01-24T15:30:00Z'
        }
      ]);
    } catch (err) {
      setError('Failed to load transaction history');
    }
  };

  const handleAddFunds = async () => {
    if (!selectedWallet || !fundAmount || parseFloat(fundAmount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      const result = await api.addWalletFunds(
        selectedWallet.user_id,
        parseFloat(fundAmount),
        fundDescription || `Admin credit - ${new Date().toLocaleDateString()}`,
        user.id
      );

      if (result.success) {
        // Update wallet balance locally
        setWallets(wallets.map(wallet => 
          wallet.id === selectedWallet.id 
            ? { ...wallet, balance: result.data.newBalance }
            : wallet
        ));
        
        // Update selected wallet
        setSelectedWallet({
          ...selectedWallet,
          balance: result.data.newBalance
        });

        // Reload transactions
        await loadTransactions(selectedWallet.id);

        // Reset form
        setFundAmount('');
        setFundDescription('');
        setShowAddFunds(false);
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setProcessing(false);
    }
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

  const renderWalletList = () => (
    <div className="space-y-4">
      {wallets.map((wallet) => (
        <div
          key={wallet.id}
          className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => {
            setSelectedWallet(wallet);
            loadTransactions(wallet.id);
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <span className="text-xl">👛</span>
              </div>
              <div>
                <h4 className="font-medium text-gray-900">
                  {wallet.user?.first_name} {wallet.user?.last_name}
                </h4>
                <p className="text-sm text-gray-600">{wallet.user?.phone}</p>
                <p className="text-xs text-gray-500">
                  Created: {new Date(wallet.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-purple-600">
                ${wallet.balance.toFixed(2)}
              </p>
              <p className="text-sm text-gray-500">{wallet.currency}</p>
              <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                wallet.is_active 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {wallet.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderWalletDetails = () => {
    if (!selectedWallet) return null;

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setSelectedWallet(null)}
            className="flex items-center text-gray-600 hover:text-gray-800"
          >
            <span className="mr-2">←</span>
            Back to Wallets
          </button>
          <button
            onClick={() => setShowAddFunds(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            Add Funds
          </button>
        </div>

        {/* Wallet Info Card */}
        <div className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xl font-semibold">
                {selectedWallet.user?.first_name} {selectedWallet.user?.last_name}
              </h3>
              <p className="text-purple-200">{selectedWallet.user?.phone}</p>
              <p className="text-purple-200 text-sm">{selectedWallet.user?.email}</p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold">${selectedWallet.balance.toFixed(2)}</p>
              <p className="text-purple-200">Current Balance</p>
            </div>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-purple-200">
              Wallet ID: {selectedWallet.id}
            </span>
            <span className="text-purple-200">
              Created: {new Date(selectedWallet.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>

        {/* Transaction History */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h4 className="font-medium text-gray-900">Transaction History</h4>
          </div>
          <div className="divide-y divide-gray-200">
            {transactions.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No transactions found
              </div>
            ) : (
              transactions.map((transaction) => (
                <div key={transaction.id} className="p-4">
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
              ))
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderAddFundsModal = () => {
    if (!showAddFunds) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold">Add Funds to Wallet</h3>
            <button
              onClick={() => setShowAddFunds(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                User
              </label>
              <p className="text-sm text-gray-900">
                {selectedWallet?.user?.first_name} {selectedWallet?.user?.last_name}
              </p>
              <p className="text-xs text-gray-500">{selectedWallet?.user?.phone}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Current Balance
              </label>
              <p className="text-lg font-bold text-purple-600">
                ${selectedWallet?.balance.toFixed(2)} USD
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Amount to Add
              </label>
              <input
                type="number"
                value={fundAmount}
                onChange={(e) => setFundAmount(e.target.value)}
                placeholder="0.00"
                min="0"
                step="0.01"
                className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description (Optional)
              </label>
              <textarea
                value={fundDescription}
                onChange={(e) => setFundDescription(e.target.value)}
                placeholder="Reason for adding funds..."
                rows={3}
                className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            {fundAmount && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  <strong>New Balance:</strong> ${(parseFloat(selectedWallet?.balance || 0) + parseFloat(fundAmount || 0)).toFixed(2)} USD
                </p>
              </div>
            )}

            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 rounded-lg p-3">
                {error}
              </div>
            )}

            <div className="flex space-x-3 pt-4">
              <button
                onClick={() => setShowAddFunds(false)}
                className="flex-1 py-2 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddFunds}
                disabled={processing || !fundAmount || parseFloat(fundAmount) <= 0}
                className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                  processing || !fundAmount || parseFloat(fundAmount) <= 0
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700 text-white'
                }`}
              >
                {processing ? 'Adding...' : 'Add Funds'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600">Access denied. Admin privileges required.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Wallet Management</h2>
        <div className="text-sm text-gray-600">
          Total Wallets: {wallets.length}
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 rounded-lg p-4">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          <span className="ml-3 text-gray-600">Loading wallets...</span>
        </div>
      ) : (
        <div>
          {selectedWallet ? renderWalletDetails() : renderWalletList()}
        </div>
      )}

      {renderAddFundsModal()}
    </div>
  );
};

export default WalletManagement; 
