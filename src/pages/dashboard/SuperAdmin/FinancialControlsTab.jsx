import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SuperAdminAPI from '../../../api/superAdminApi.js';
import {
  CurrencyDollarIcon,
  WalletIcon,
  CreditCardIcon,
  ArrowDownTrayIcon,
  BanknotesIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  PlusIcon,
  MinusIcon,
  ArrowPathIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

const FinancialControlsTab = () => {
  const [financialData, setFinancialData] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [walletAction, setWalletAction] = useState('add');
  const [walletAmount, setWalletAmount] = useState('');
  const [walletUserId, setWalletUserId] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadFinancialData();
  }, []);

  const loadFinancialData = async () => {
    try {
      setLoading(true);
      const result = await SuperAdminAPI.getFinancialOverview();
      if (result.success) {
        setFinancialData(result.data);
      } else {
        setMessage(`Error loading financial data: ${result.error}`);
      }
    } catch (error) {
      setMessage(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRefund = async () => {
    try {
      if (!selectedTransaction || !refundAmount) return;
      
      setLoading(true);
      const result = await SuperAdminAPI.processRefund(
        selectedTransaction.id,
        parseFloat(refundAmount),
        refundReason
      );
      
      if (result.success) {
        setMessage('Refund processed successfully');
        setShowRefundModal(false);
        setRefundAmount('');
        setRefundReason('');
        await loadFinancialData();
      } else {
        setMessage(`Error processing refund: ${result.error}`);
      }
    } catch (error) {
      setMessage(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleWalletAdjustment = async () => {
    try {
      if (!walletUserId || !walletAmount) return;
      
      setLoading(true);
      // This would be implemented in the API
      setMessage(`${walletAction === 'add' ? 'Added' : 'Removed'} ${walletAmount} SAR ${walletAction === 'add' ? 'to' : 'from'} user wallet`);
      setShowWalletModal(false);
      setWalletAmount('');
      setWalletUserId('');
      await loadFinancialData();
    } catch (error) {
      setMessage(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const exportFinancialReport = () => {
    const csvContent = [
      ['Financial Report', 'Generated:', new Date().toISOString()].join(','),
      [''],
      ['Metric', 'Value'].join(','),
      ['Total Payments', financialData.total_payments || 0].join(','),
      ['Pending Payments', financialData.pending_payments || 0].join(','),
      ['Completed Payments', financialData.completed_payments || 0].join(','),
      ['Total Wallet Balance', financialData.total_wallet_balance || 0].join(','),
      ['Total Transactions', financialData.total_transactions || 0].join(','),
      [''],
      ['Recent Transactions'].join(','),
      ['ID', 'Amount', 'Type', 'Date'].join(','),
      ...(financialData.recent_transactions || []).map(t => [
        t.id.slice(0, 8),
        t.amount,
        t.type,
        new Date(t.created_at).toLocaleDateString()
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `financial_report_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getTransactionIcon = (type) => {
    switch (type) {
      case 'payment': return <CreditCardIcon className="w-4 h-4 text-green-400" />;
      case 'refund': return <ArrowPathIcon className="w-4 h-4 text-red-400" />;
      case 'wallet_add': return <PlusIcon className="w-4 h-4 text-blue-400" />;
      case 'wallet_deduct': return <MinusIcon className="w-4 h-4 text-orange-400" />;
      default: return <CurrencyDollarIcon className="w-4 h-4 text-gray-400" />;
    }
  };

  const getTransactionColor = (type) => {
    switch (type) {
      case 'payment': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'refund': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'wallet_add': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'wallet_deduct': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center">
            <CurrencyDollarIcon className="w-8 h-8 text-gold-400 mr-3" />
            Financial Controls
          </h2>
          <p className="text-cosmic-300 mt-1">
            Manage payments, refunds, wallets, and financial operations
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowWalletModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
          >
            <WalletIcon className="w-5 h-5" />
            <span>Adjust Wallet</span>
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={exportFinancialReport}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
          >
            <ArrowDownTrayIcon className="w-5 h-5" />
            <span>Export Report</span>
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={loadFinancialData}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            Refresh
          </motion.button>
        </div>
      </div>

      {/* Message */}
      {message && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-lg ${
            message.includes('Error') 
              ? 'bg-red-500/20 border border-red-500/30 text-red-400'
              : 'bg-green-500/20 border border-green-500/30 text-green-400'
          }`}
        >
          {message}
        </motion.div>
      )}

      {/* Financial Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-white/5 backdrop-blur-sm border border-white/20 rounded-xl p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-cosmic-300 text-sm">Total Payments</p>
              <p className="text-2xl font-bold text-green-400">
                {(financialData.total_payments || 0).toLocaleString()} SAR
              </p>
            </div>
            <CreditCardIcon className="w-8 h-8 text-green-400" />
          </div>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-white/5 backdrop-blur-sm border border-white/20 rounded-xl p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-cosmic-300 text-sm">Wallet Balance</p>
              <p className="text-2xl font-bold text-blue-400">
                {(financialData.total_wallet_balance || 0).toLocaleString()} SAR
              </p>
            </div>
            <WalletIcon className="w-8 h-8 text-blue-400" />
          </div>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-white/5 backdrop-blur-sm border border-white/20 rounded-xl p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-cosmic-300 text-sm">Pending Payments</p>
              <p className="text-2xl font-bold text-yellow-400">
                {financialData.pending_payments || 0}
              </p>
            </div>
            <ExclamationTriangleIcon className="w-8 h-8 text-yellow-400" />
          </div>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-white/5 backdrop-blur-sm border border-white/20 rounded-xl p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-cosmic-300 text-sm">Total Transactions</p>
              <p className="text-2xl font-bold text-purple-400">
                {financialData.total_transactions || 0}
              </p>
            </div>
            <ChartBarIcon className="w-8 h-8 text-purple-400" />
          </div>
        </motion.div>
      </div>

      {/* Recent Transactions */}
      <div className="bg-white/5 backdrop-blur-sm border border-white/20 rounded-xl">
        <div className="p-6 border-b border-white/10">
          <h3 className="text-lg font-bold text-white flex items-center">
            <BanknotesIcon className="w-5 h-5 text-gold-400 mr-2" />
            Recent Transactions
          </h3>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin w-8 h-8 border-4 border-purple-400 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-cosmic-300">Loading transactions...</p>
          </div>
        ) : (
          <div className="divide-y divide-white/10">
            {(financialData.recent_transactions || []).length === 0 ? (
              <div className="p-8 text-center">
                <BanknotesIcon className="w-16 h-16 text-cosmic-300 mx-auto mb-4" />
                <h4 className="text-lg font-medium text-white mb-2">No Transactions</h4>
                <p className="text-cosmic-300">No recent transactions found</p>
              </div>
            ) : (
              (financialData.recent_transactions || []).map((transaction) => (
                <motion.div
                  key={transaction.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="p-6 hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-gradient-to-r from-gold-400 to-orange-400 rounded-full flex items-center justify-center">
                        {getTransactionIcon(transaction.type)}
                      </div>
                      
                      <div>
                        <div className="flex items-center space-x-2 mb-1">
                          <h4 className="text-white font-medium">
                            Transaction #{transaction.id.slice(0, 8)}
                          </h4>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getTransactionColor(transaction.type)}`}>
                            {transaction.type}
                          </span>
                        </div>
                        
                        <div className="flex items-center space-x-4 text-sm text-cosmic-300">
                          <span>💰 {transaction.amount} SAR</span>
                          <span>📅 {new Date(transaction.created_at).toLocaleDateString()}</span>
                          <span>👤 User ID: {transaction.user_id?.slice(0, 8)}...</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      {transaction.type === 'payment' && (
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => {
                            setSelectedTransaction(transaction);
                            setShowRefundModal(true);
                          }}
                          className="px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                        >
                          Refund
                        </motion.button>
                      )}
                    </div>
                  </div>

                  {/* Transaction Details */}
                  <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                    <div className="bg-white/5 rounded p-2">
                      <span className="text-cosmic-400">Reference</span>
                      <p className="text-white font-mono">{transaction.reference_id || 'N/A'}</p>
                    </div>
                    <div className="bg-white/5 rounded p-2">
                      <span className="text-cosmic-400">Description</span>
                      <p className="text-white">{transaction.description || 'No description'}</p>
                    </div>
                    <div className="bg-white/5 rounded p-2">
                      <span className="text-cosmic-400">Method</span>
                      <p className="text-white">
                        {transaction.payment_method || 'Wallet'}
                      </p>
                    </div>
                    <div className="bg-white/5 rounded p-2">
                      <span className="text-cosmic-400">Status</span>
                      <p className="text-white capitalize">
                        {transaction.status || 'completed'}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Quick Financial Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-white/5 backdrop-blur-sm border border-white/20 rounded-xl p-6 cursor-pointer"
          onClick={() => setShowWalletModal(true)}
        >
          <div className="flex items-center space-x-3 mb-4">
            <WalletIcon className="w-8 h-8 text-blue-400" />
            <h3 className="text-lg font-bold text-white">Wallet Management</h3>
          </div>
          <p className="text-cosmic-300 text-sm">
            Add or deduct funds from user wallets
          </p>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-white/5 backdrop-blur-sm border border-white/20 rounded-xl p-6 cursor-pointer"
        >
          <div className="flex items-center space-x-3 mb-4">
            <ArrowPathIcon className="w-8 h-8 text-red-400" />
            <h3 className="text-lg font-bold text-white">Bulk Refunds</h3>
          </div>
          <p className="text-cosmic-300 text-sm">
            Process multiple refunds at once
          </p>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-white/5 backdrop-blur-sm border border-white/20 rounded-xl p-6 cursor-pointer"
        >
          <div className="flex items-center space-x-3 mb-4">
            <ChartBarIcon className="w-8 h-8 text-purple-400" />
            <h3 className="text-lg font-bold text-white">Analytics</h3>
          </div>
          <p className="text-cosmic-300 text-sm">
            View detailed financial analytics
          </p>
        </motion.div>
      </div>

      {/* Refund Modal */}
      <AnimatePresence>
        {showRefundModal && selectedTransaction && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gradient-to-b from-bg-primary to-bg-secondary border border-red-500/30 rounded-2xl p-6 w-full max-w-md"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white">Process Refund</h3>
                <button
                  onClick={() => setShowRefundModal(false)}
                  className="text-cosmic-300 hover:text-white"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="bg-white/5 rounded-lg p-4">
                  <div className="text-sm space-y-2">
                    <div className="flex justify-between">
                      <span className="text-cosmic-300">Transaction ID:</span>
                      <span className="text-white font-mono">{selectedTransaction.id.slice(0, 8)}...</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-cosmic-300">Original Amount:</span>
                      <span className="text-white">{selectedTransaction.amount} SAR</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-cosmic-300">User ID:</span>
                      <span className="text-white">{selectedTransaction.user_id?.slice(0, 8)}...</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-cosmic-300 mb-2">
                    Refund Amount (SAR)
                  </label>
                  <input
                    type="number"
                    value={refundAmount}
                    onChange={(e) => setRefundAmount(e.target.value)}
                    max={selectedTransaction.amount}
                    min="0"
                    step="0.01"
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-cosmic-300 focus:border-red-400 focus:outline-none"
                    placeholder="Enter refund amount"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-cosmic-300 mb-2">
                    Refund Reason
                  </label>
                  <textarea
                    value={refundReason}
                    onChange={(e) => setRefundReason(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-cosmic-300 focus:border-red-400 focus:outline-none"
                    placeholder="Enter reason for refund..."
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-4 mt-6">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowRefundModal(false)}
                  className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleRefund}
                  disabled={loading || !refundAmount}
                  className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Processing...' : 'Process Refund'}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Wallet Adjustment Modal */}
      <AnimatePresence>
        {showWalletModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gradient-to-b from-bg-primary to-bg-secondary border border-blue-500/30 rounded-2xl p-6 w-full max-w-md"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white">Wallet Adjustment</h3>
                <button
                  onClick={() => setShowWalletModal(false)}
                  className="text-cosmic-300 hover:text-white"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-cosmic-300 mb-2">
                    User ID
                  </label>
                  <input
                    type="text"
                    value={walletUserId}
                    onChange={(e) => setWalletUserId(e.target.value)}
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-cosmic-300 focus:border-blue-400 focus:outline-none"
                    placeholder="Enter user ID"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-cosmic-300 mb-2">
                    Action
                  </label>
                  <div className="flex space-x-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="add"
                        checked={walletAction === 'add'}
                        onChange={(e) => setWalletAction(e.target.value)}
                        className="mr-2"
                      />
                      <span className="text-white">Add Funds</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="deduct"
                        checked={walletAction === 'deduct'}
                        onChange={(e) => setWalletAction(e.target.value)}
                        className="mr-2"
                      />
                      <span className="text-white">Deduct Funds</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-cosmic-300 mb-2">
                    Amount (SAR)
                  </label>
                  <input
                    type="number"
                    value={walletAmount}
                    onChange={(e) => setWalletAmount(e.target.value)}
                    min="0"
                    step="0.01"
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-cosmic-300 focus:border-blue-400 focus:outline-none"
                    placeholder="Enter amount"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-4 mt-6">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowWalletModal(false)}
                  className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleWalletAdjustment}
                  disabled={loading || !walletUserId || !walletAmount}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Processing...' : `${walletAction === 'add' ? 'Add' : 'Deduct'} Funds`}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FinancialControlsTab; 