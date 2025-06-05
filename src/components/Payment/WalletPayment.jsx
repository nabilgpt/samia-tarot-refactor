import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { UserAPI } from '../../api/userApi.js';

const WalletPayment = ({ service, amount, onPaymentSuccess, onPaymentError, onBack, bookingId }) => {
  const { user, profile } = useAuth();
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [showTopUp, setShowTopUp] = useState(false);

  useEffect(() => {
    loadWalletData();
  }, []);

  const loadWalletData = async () => {
    try {
      const result = await UserAPI.getUserWallet(user.id);
      if (result.success) {
        setWallet(result.data);
      } else {
        setError('Failed to load wallet information');
      }
    } catch (err) {
      setError('Failed to load wallet information');
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    if (!wallet || wallet.balance < amount) {
      setError('Insufficient wallet balance');
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      const result = await UserAPI.processWalletPayment(
        user.id,
        amount,
        bookingId,
        `Payment for ${service?.name}`
      );

      if (result.success) {
        onPaymentSuccess({
          paymentId: result.data.payment.id,
          transactionId: result.data.transaction.id,
          amount: amount,
          method: 'wallet',
          newBalance: result.data.newBalance
        });
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      setError(err.message);
      onPaymentError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  const renderTopUpOptions = () => (
    <div className="space-y-4">
      <h4 className="font-medium text-gray-900">Top Up Your Wallet</h4>
      <p className="text-sm text-gray-600">
        Add funds to your SAMIA Wallet to make instant payments for future bookings.
      </p>
      
      <div className="grid grid-cols-2 gap-3">
        <button className="p-3 border border-gray-300 rounded-lg hover:border-purple-500 transition-colors">
          <div className="text-center">
            <div className="text-lg font-medium">$25</div>
            <div className="text-xs text-gray-500">Quick Top-up</div>
          </div>
        </button>
        <button className="p-3 border border-gray-300 rounded-lg hover:border-purple-500 transition-colors">
          <div className="text-center">
            <div className="text-lg font-medium">$50</div>
            <div className="text-xs text-gray-500">Popular</div>
          </div>
        </button>
        <button className="p-3 border border-gray-300 rounded-lg hover:border-purple-500 transition-colors">
          <div className="text-center">
            <div className="text-lg font-medium">$100</div>
            <div className="text-xs text-gray-500">Best Value</div>
          </div>
        </button>
        <button className="p-3 border border-gray-300 rounded-lg hover:border-purple-500 transition-colors">
          <div className="text-center">
            <div className="text-lg font-medium">Custom</div>
            <div className="text-xs text-gray-500">Any Amount</div>
          </div>
        </button>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-sm text-blue-800">
          💡 <strong>Tip:</strong> Top up your wallet for instant payments and exclusive wallet-only discounts!
        </p>
      </div>

      <button
        onClick={() => setShowTopUp(false)}
        className="w-full py-2 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
      >
        Back to Payment
      </button>
    </div>
  );

  if (loading) {
    return (
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          <span className="ml-3 text-gray-600">Loading wallet...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={onBack}
          className="flex items-center text-gray-600 hover:text-gray-800"
        >
          <span className="mr-2">←</span>
          Back
        </button>
        <div className="text-right">
          <p className="text-2xl font-bold text-purple-600">${amount}</p>
          <p className="text-sm text-gray-500">Wallet Payment</p>
        </div>
      </div>

      {showTopUp ? renderTopUpOptions() : (
        <div className="space-y-6">
          {/* Wallet Balance Card */}
          <div className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-lg p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <span className="text-2xl mr-3">👛</span>
                <div>
                  <h3 className="font-semibold">SAMIA Wallet</h3>
                  <p className="text-purple-200 text-sm">Available Balance</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">${wallet?.balance || '0.00'}</p>
                <p className="text-purple-200 text-sm">USD</p>
              </div>
            </div>
            
            <div className="flex items-center justify-between text-sm">
              <span className="text-purple-200">Wallet ID: {wallet?.id?.slice(-8) || 'N/A'}</span>
              <span className="text-purple-200">Active</span>
            </div>
          </div>

          {/* Payment Details */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium mb-3">Payment Summary</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Service:</span>
                <span className="font-medium">{service?.name}</span>
              </div>
              <div className="flex justify-between">
                <span>Amount:</span>
                <span className="font-medium">${amount} USD</span>
              </div>
              <div className="flex justify-between">
                <span>Processing Fee:</span>
                <span className="font-medium text-green-600">Free</span>
              </div>
              <div className="flex justify-between">
                <span>Processing Time:</span>
                <span className="font-medium text-green-600">Instant</span>
              </div>
              <hr className="my-2" />
              <div className="flex justify-between font-medium">
                <span>Total:</span>
                <span>${amount} USD</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Remaining Balance:</span>
                <span className={`font-medium ${
                  (wallet?.balance || 0) >= amount ? 'text-green-600' : 'text-red-600'
                }`}>
                  ${((wallet?.balance || 0) - amount).toFixed(2)} USD
                </span>
              </div>
            </div>
          </div>

          {/* Insufficient Balance Warning */}
          {wallet && wallet.balance < amount && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start">
                <span className="text-red-600 mr-2">⚠️</span>
                <div className="text-sm text-red-800">
                  <p className="font-medium mb-1">Insufficient Balance</p>
                  <p>
                    You need ${(amount - wallet.balance).toFixed(2)} more to complete this payment.
                    Please top up your wallet or choose a different payment method.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 rounded-lg p-3">
              {error}
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            {wallet && wallet.balance >= amount ? (
              <button
                onClick={handlePayment}
                disabled={processing}
                className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                  processing
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-purple-600 hover:bg-purple-700 text-white'
                }`}
              >
                {processing ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Processing Payment...
                  </div>
                ) : (
                  `Pay $${amount} from Wallet`
                )}
              </button>
            ) : (
              <button
                onClick={() => setShowTopUp(true)}
                className="w-full py-3 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Top Up Wallet
              </button>
            )}

            {wallet && wallet.balance >= amount && (
              <button
                onClick={() => setShowTopUp(true)}
                className="w-full py-2 px-4 border border-purple-600 text-purple-600 rounded-lg hover:bg-purple-50 transition-colors"
              >
                Add More Funds
              </button>
            )}
          </div>

          {/* Wallet Benefits */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">Wallet Benefits</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-blue-800">
              <li>Instant payments with no processing fees</li>
              <li>Secure and encrypted transactions</li>
              <li>Easy refunds directly to your wallet</li>
              <li>Exclusive wallet-only discounts</li>
              <li>Transaction history and receipts</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default WalletPayment; 