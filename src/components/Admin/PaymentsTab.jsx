import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase.js';
import PaymentMethodService from '../../services/paymentMethodService';

const PaymentsTab = ({ onUpdate }) => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [methodFilter, setMethodFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  useEffect(() => {
    loadPayments();
  }, []);

  const loadPayments = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          booking:bookings(
            id,
            scheduled_at,
            status,
            client:profiles!bookings_user_id_fkey(first_name, last_name, email),
            reader:profiles!bookings_reader_id_fkey(first_name, last_name, email),
            service:services(name, type, price)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPayments(data || []);
    } catch (error) {
      console.error('Error loading payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const updatePaymentStatus = async (paymentId, newStatus) => {
    try {
      const { error } = await supabase
        .from('payments')
        .update({ status: newStatus })
        .eq('id', paymentId);

      if (!error) {
        await loadPayments();
        onUpdate?.();
      }
    } catch (error) {
      console.error('Error updating payment status:', error);
    }
  };

  const filteredPayments = payments.filter(payment => {
    const matchesMethod = methodFilter === 'all' || payment.method === methodFilter;
    const matchesStatus = statusFilter === 'all' || payment.status === statusFilter;
    return matchesMethod && matchesStatus;
  });

  // Use PaymentMethodService for icons and colors
  const getMethodIcon = (method) => {
    return PaymentMethodService.getMethodIcon(method);
  };

  const getMethodColor = (method) => {
    const colorMap = {
      stripe: 'bg-blue-100 text-blue-800',
      square: 'bg-gray-100 text-gray-800',
      usdt: 'bg-orange-100 text-orange-800',
      western_union: 'bg-yellow-100 text-yellow-800',
      moneygram: 'bg-purple-100 text-purple-800',
      ria: 'bg-green-100 text-green-800',
      omt: 'bg-red-100 text-red-800',
      whish: 'bg-pink-100 text-pink-800',
      bob: 'bg-indigo-100 text-indigo-800',
      wallet: 'bg-amber-100 text-amber-800'
    };
    return colorMap[method] || 'bg-gray-100 text-gray-800';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'refunded': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const totalRevenue = filteredPayments
    .filter(p => p.status === 'completed')
    .reduce((sum, p) => sum + parseFloat(p.amount), 0);

  const pendingAmount = filteredPayments
    .filter(p => p.status === 'pending')
    .reduce((sum, p) => sum + parseFloat(p.amount), 0);

  return (
    <div className="space-y-6">
      {/* Payment Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <span className="text-2xl">💰</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900">${totalRevenue.toFixed(2)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <span className="text-2xl">⏳</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-gray-900">${pendingAmount.toFixed(2)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <span className="text-2xl">📊</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Payments</p>
              <p className="text-2xl font-bold text-gray-900">{filteredPayments.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <span className="text-2xl">📈</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Avg. Payment</p>
              <p className="text-2xl font-bold text-gray-900">
                ${filteredPayments.length > 0 ? (totalRevenue / filteredPayments.filter(p => p.status === 'completed').length || 0).toFixed(2) : '0.00'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <select
          value={methodFilter}
          onChange={(e) => setMethodFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
        >
          <option value="all">All Methods</option>
          <option value="stripe">Stripe</option>
          <option value="square">Square</option>
          <option value="usdt">USDT</option>
          <option value="western_union">Western Union</option>
          <option value="moneygram">MoneyGram</option>
          <option value="ria">RIA</option>
          <option value="omt">OMT</option>
          <option value="whish">Whish</option>
          <option value="bob">BOB</option>
          <option value="wallet">Wallet</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
        >
          <option value="all">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
          <option value="refunded">Refunded</option>
        </select>

        <div className="text-sm text-gray-600 flex items-center">
          Showing {filteredPayments.length} of {payments.length} payments
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Service</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Method</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan="8" className="px-6 py-4 text-center text-gray-500">
                    Loading payments...
                  </td>
                </tr>
              ) : filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-4 text-center text-gray-500">
                    No payments found
                  </td>
                </tr>
              ) : (
                filteredPayments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                      #{payment.id.slice(0, 8)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {payment.booking?.client?.first_name} {payment.booking?.client?.last_name}
                      </div>
                      <div className="text-sm text-gray-500">{payment.booking?.client?.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{payment.booking?.service?.name}</div>
                      <div className="text-sm text-gray-500">
                        Reader: {payment.booking?.reader?.first_name} {payment.booking?.reader?.last_name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                      ${payment.amount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getMethodColor(payment.method)}`}>
                        <span className="mr-1">{getMethodIcon(payment.method)}</span>
                        {payment.method}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={payment.status}
                        onChange={(e) => updatePaymentStatus(payment.id, e.target.value)}
                        className={`px-2 py-1 rounded-full text-xs font-medium border-0 ${getStatusColor(payment.status)}`}
                      >
                        <option value="pending">Pending</option>
                        <option value="completed">Completed</option>
                        <option value="failed">Failed</option>
                        <option value="refunded">Refunded</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDateTime(payment.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button
                        onClick={() => {
                          setSelectedPayment(payment);
                          setShowPaymentModal(true);
                        }}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        View
                      </button>
                      {payment.receipt_url && (
                        <button
                          onClick={() => {
                            setSelectedPayment(payment);
                            setShowReceiptModal(true);
                          }}
                          className="text-green-600 hover:text-green-900"
                        >
                          Receipt
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment Details Modal */}
      {showPaymentModal && selectedPayment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-96 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Payment Details</h3>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Payment ID</label>
                <p className="text-gray-900 font-mono">#{selectedPayment.id}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Amount</label>
                <p className="text-2xl font-bold text-gray-900">${selectedPayment.amount}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Method</label>
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getMethodColor(selectedPayment.method)}`}>
                  <span className="mr-1">{getMethodIcon(selectedPayment.method)}</span>
                  {selectedPayment.method}
                </span>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedPayment.status)}`}>
                  {selectedPayment.status}
                </span>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Transaction ID</label>
                <p className="text-gray-900 font-mono text-sm">{selectedPayment.transaction_id || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Created</label>
                <p className="text-gray-900">{formatDateTime(selectedPayment.created_at)}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Client</label>
                <p className="text-gray-900">
                  {selectedPayment.booking?.client?.first_name} {selectedPayment.booking?.client?.last_name}
                </p>
                <p className="text-sm text-gray-500">{selectedPayment.booking?.client?.email}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Service</label>
                <p className="text-gray-900">{selectedPayment.booking?.service?.name}</p>
                <p className="text-sm text-gray-500">
                  Reader: {selectedPayment.booking?.reader?.first_name} {selectedPayment.booking?.reader?.last_name}
                </p>
              </div>
            </div>

            {selectedPayment.notes && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700">Notes</label>
                <p className="text-gray-900">{selectedPayment.notes}</p>
              </div>
            )}

            {selectedPayment.receipt_url && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700">Receipt</label>
                <a
                  href={selectedPayment.receipt_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-900 underline"
                >
                  View Receipt
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {showReceiptModal && selectedPayment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-96 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Payment Receipt</h3>
              <button
                onClick={() => setShowReceiptModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            {selectedPayment.receipt_url ? (
              <div className="text-center">
                <img
                  src={selectedPayment.receipt_url}
                  alt="Payment Receipt"
                  className="max-w-full h-auto mx-auto border border-gray-300 rounded-lg"
                />
                <div className="mt-4 space-x-2">
                  <a
                    href={selectedPayment.receipt_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Open in New Tab
                  </a>
                  <button
                    onClick={() => updatePaymentStatus(selectedPayment.id, 'completed')}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Approve Payment
                  </button>
                  <button
                    onClick={() => updatePaymentStatus(selectedPayment.id, 'failed')}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Reject Payment
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-center text-gray-500">No receipt available</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentsTab; 