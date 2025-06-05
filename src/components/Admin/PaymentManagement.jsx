import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { UserAPI } from '../../api/userApi.js';

const PaymentManagement = () => {
  const { user, profile } = useAuth();
  const [payments, setPayments] = useState([]);
  const [pendingPayments, setPendingPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState('pending'); // pending, all, receipts
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadPaymentData();
  }, [selectedTab]);

  const loadPaymentData = async () => {
    setLoading(true);
    try {
      if (selectedTab === 'pending') {
        const result = await UserAPI.getPendingPayments();
        if (result.success) {
          setPendingPayments(result.data);
        }
      } else {
        // Load all payments - you'd implement this method
        // const result = await UserAPI.getAllPayments();
        // if (result.success) {
        //   setPayments(result.data);
        // }
      }
    } catch (err) {
      setError('Failed to load payment data');
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentAction = async (paymentId, action, notes = '') => {
    setProcessing(true);
    setError(null);

    try {
      const result = await UserAPI.updatePaymentStatus(paymentId, action, notes);
      if (result.success) {
        // Reload data
        await loadPaymentData();
        setSelectedPayment(null);
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setProcessing(false);
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

  const renderPendingPayments = () => (
    <div className="space-y-4">
      {pendingPayments.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-gray-400 text-4xl mb-4">✅</div>
          <p className="text-gray-600">No pending payments to review</p>
        </div>
      ) : (
        pendingPayments.map((payment) => (
          <div key={payment.id} className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3">
                <span className="text-2xl">{getMethodIcon(payment.method)}</span>
                <div>
                  <h4 className="font-medium text-gray-900">
                    {payment.profiles?.first_name} {payment.profiles?.last_name}
                  </h4>
                  <p className="text-sm text-gray-600">{payment.profiles?.phone}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-gray-900">${payment.amount}</p>
                {getStatusBadge(payment.status)}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
              <div>
                <span className="text-gray-600">Method:</span>
                <span className="ml-2 font-medium capitalize">{payment.method.replace('_', ' ')}</span>
              </div>
              <div>
                <span className="text-gray-600">Date:</span>
                <span className="ml-2 font-medium">
                  {new Date(payment.created_at).toLocaleDateString()}
                </span>
              </div>
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

            {/* Receipt Images */}
            {payment.receipt_uploads && payment.receipt_uploads.length > 0 && (
              <div className="mb-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Uploaded Receipts:</p>
                <div className="flex space-x-2">
                  {payment.receipt_uploads.map((receipt, index) => (
                    <img
                      key={index}
                      src={receipt.file_url}
                      alt="Payment Receipt"
                      className="w-20 h-20 object-cover rounded-lg border cursor-pointer hover:opacity-75"
                      onClick={() => window.open(receipt.file_url, '_blank')}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* USDT Transaction Hash */}
            {payment.method === 'usdt' && payment.transaction_hash && (
              <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm font-medium text-blue-900 mb-1">USDT Transaction Hash:</p>
                <p className="font-mono text-xs text-blue-800 break-all">{payment.transaction_hash}</p>
                <div className="mt-2 space-x-2">
                  <a
                    href={`https://etherscan.io/tx/${payment.transaction_hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 text-xs"
                  >
                    View on Etherscan
                  </a>
                  <a
                    href={`https://tronscan.org/#/transaction/${payment.transaction_hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 text-xs"
                  >
                    View on TronScan
                  </a>
                </div>
              </div>
            )}

            {/* Admin Actions */}
            <div className="flex space-x-2">
              <button
                onClick={() => handlePaymentAction(payment.id, 'completed', 'Payment verified and approved')}
                disabled={processing}
                className="flex-1 py-2 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                Approve
              </button>
              <button
                onClick={() => setSelectedPayment(payment)}
                className="flex-1 py-2 px-4 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Reject
              </button>
              <button
                onClick={() => setSelectedPayment(payment)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Details
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );

  const renderPaymentDetails = () => {
    if (!selectedPayment) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold">Payment Details</h3>
            <button
              onClick={() => setSelectedPayment(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Payment ID</label>
                <p className="mt-1 text-sm text-gray-900 font-mono">{selectedPayment.id}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Amount</label>
                <p className="mt-1 text-sm text-gray-900 font-bold">${selectedPayment.amount} USD</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Method</label>
                <p className="mt-1 text-sm text-gray-900 capitalize">
                  {selectedPayment.method.replace('_', ' ')}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <div className="mt-1">{getStatusBadge(selectedPayment.status)}</div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Customer</label>
              <p className="mt-1 text-sm text-gray-900">
                {selectedPayment.profiles?.first_name} {selectedPayment.profiles?.last_name}
                <br />
                <span className="text-gray-600">{selectedPayment.profiles?.phone}</span>
              </p>
            </div>

            {selectedPayment.transaction_hash && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Transaction Hash</label>
                <p className="mt-1 text-sm text-gray-900 font-mono break-all">
                  {selectedPayment.transaction_hash}
                </p>
              </div>
            )}

            {selectedPayment.admin_notes && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Admin Notes</label>
                <p className="mt-1 text-sm text-gray-900">{selectedPayment.admin_notes}</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Add Notes</label>
              <textarea
                id="admin-notes"
                rows={3}
                className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Add notes about this payment..."
              />
            </div>

            <div className="flex space-x-3 pt-4">
              <button
                onClick={() => {
                  const notes = document.getElementById('admin-notes').value;
                  handlePaymentAction(selectedPayment.id, 'completed', notes);
                }}
                disabled={processing}
                className="flex-1 py-2 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                Approve Payment
              </button>
              <button
                onClick={() => {
                  const notes = document.getElementById('admin-notes').value;
                  handlePaymentAction(selectedPayment.id, 'failed', notes);
                }}
                disabled={processing}
                className="flex-1 py-2 px-4 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                Reject Payment
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (!profile || !['admin', 'monitor'].includes(profile.role)) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600">Access denied. Admin privileges required.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Payment Management</h2>
        <div className="flex space-x-2">
          <button
            onClick={() => setSelectedTab('pending')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              selectedTab === 'pending'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Pending ({pendingPayments.length})
          </button>
          <button
            onClick={() => setSelectedTab('all')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              selectedTab === 'all'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            All Payments
          </button>
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
          <span className="ml-3 text-gray-600">Loading payments...</span>
        </div>
      ) : (
        <div>
          {selectedTab === 'pending' && renderPendingPayments()}
          {selectedTab === 'all' && (
            <div className="text-center py-8">
              <p className="text-gray-600">All payments view - to be implemented</p>
            </div>
          )}
        </div>
      )}

      {selectedPayment && renderPaymentDetails()}
    </div>
  );
};

export default PaymentManagement; 