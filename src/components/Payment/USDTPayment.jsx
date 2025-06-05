import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { UserAPI } from '../../api/userApi.js';

const USDTPayment = ({ service, amount, onPaymentSuccess, onPaymentError, onBack, bookingId }) => {
  const { user, profile } = useAuth();
  const [step, setStep] = useState(1); // 1: Instructions, 2: Hash submission, 3: Confirmation
  const [transactionHash, setTransactionHash] = useState('');
  const [network, setNetwork] = useState('ethereum'); // ethereum or tron
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);

  // Wallet addresses for different networks
  const walletAddresses = {
    ethereum: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b1', // Example ETH address
    tron: 'TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE' // Example TRON address
  };

  const handleNetworkChange = (selectedNetwork) => {
    setNetwork(selectedNetwork);
    setTransactionHash('');
    setError(null);
  };

  const handleHashSubmit = async () => {
    if (!transactionHash.trim()) {
      setError('Please enter a valid transaction hash');
      return;
    }

    // Basic hash validation
    const hashPattern = network === 'ethereum' 
      ? /^0x[a-fA-F0-9]{64}$/ 
      : /^[a-fA-F0-9]{64}$/;
    
    if (!hashPattern.test(transactionHash.trim())) {
      setError(`Invalid ${network === 'ethereum' ? 'Ethereum' : 'TRON'} transaction hash format`);
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      // Create payment record with pending status
      const paymentResult = await UserAPI.createPayment({
        booking_id: bookingId,
        user_id: user.id,
        amount: amount,
        method: 'usdt',
        transaction_hash: transactionHash.trim(),
        status: 'awaiting_approval',
        metadata: {
          network: network,
          wallet_address: walletAddresses[network],
          submitted_at: new Date().toISOString()
        }
      });

      if (paymentResult.success) {
        setStep(3);
        // Note: We don't call onPaymentSuccess immediately since this requires admin verification
      } else {
        throw new Error(paymentResult.error);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    // You could add a toast notification here
  };

  const renderInstructions = () => (
    <div className="space-y-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-4">USDT Payment Instructions</h3>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
          <div className="flex items-start">
            <span className="text-yellow-600 mr-2">⚠️</span>
            <div className="text-sm text-yellow-800">
              <p className="font-medium mb-1">Important:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Send exactly <strong>${amount} USD</strong> worth of USDT</li>
                <li>Use only the wallet address provided below</li>
                <li>Payment verification may take 5-15 minutes</li>
                <li>Keep your transaction hash for verification</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Select Network
        </label>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => handleNetworkChange('ethereum')}
            className={`p-4 border rounded-lg text-center transition-colors ${
              network === 'ethereum'
                ? 'border-purple-500 bg-purple-50 text-purple-700'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <div className="font-medium">Ethereum (ERC-20)</div>
            <div className="text-sm text-gray-600">Higher fees, faster confirmation</div>
          </button>
          <button
            onClick={() => handleNetworkChange('tron')}
            className={`p-4 border rounded-lg text-center transition-colors ${
              network === 'tron'
                ? 'border-purple-500 bg-purple-50 text-purple-700'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <div className="font-medium">TRON (TRC-20)</div>
            <div className="text-sm text-gray-600">Lower fees, standard confirmation</div>
          </button>
        </div>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {network === 'ethereum' ? 'Ethereum' : 'TRON'} Wallet Address
        </label>
        <div className="flex items-center space-x-2">
          <div className="flex-1 p-3 bg-gray-50 border border-gray-300 rounded-lg font-mono text-sm break-all">
            {walletAddresses[network]}
          </div>
          <button
            onClick={() => copyToClipboard(walletAddresses[network])}
            className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            Copy
          </button>
        </div>
      </div>

      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="font-medium mb-2">Payment Summary</h4>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span>Service:</span>
            <span>{service?.name}</span>
          </div>
          <div className="flex justify-between">
            <span>Amount:</span>
            <span>${amount} USD in USDT</span>
          </div>
          <div className="flex justify-between">
            <span>Network:</span>
            <span>{network === 'ethereum' ? 'Ethereum (ERC-20)' : 'TRON (TRC-20)'}</span>
          </div>
          <div className="flex justify-between">
            <span>Network Fees:</span>
            <span>Paid by you</span>
          </div>
        </div>
      </div>

      <button
        onClick={() => setStep(2)}
        className="w-full py-3 px-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
      >
        I&apos;ve Sent the Payment
      </button>
    </div>
  );

  const renderHashSubmission = () => (
    <div className="space-y-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">Submit Transaction Hash</h3>
        <p className="text-gray-600 text-sm">
          Please enter the transaction hash from your USDT transfer for verification.
        </p>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Transaction Hash
        </label>
        <input
          type="text"
          value={transactionHash}
          onChange={(e) => setTransactionHash(e.target.value)}
          placeholder={network === 'ethereum' ? '0x...' : 'Enter transaction hash'}
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        />
        <p className="text-xs text-gray-500 mt-1">
          {network === 'ethereum' 
            ? 'Ethereum transaction hash starts with 0x followed by 64 characters'
            : 'TRON transaction hash is 64 characters long'
          }
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      <div className="flex space-x-3">
        <button
          onClick={() => setStep(1)}
          className="flex-1 py-3 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Back
        </button>
        <button
          onClick={handleHashSubmit}
          disabled={processing}
          className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
            processing
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-purple-600 hover:bg-purple-700 text-white'
          }`}
        >
          {processing ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              Submitting...
            </div>
          ) : (
            'Submit for Verification'
          )}
        </button>
      </div>
    </div>
  );

  const renderConfirmation = () => (
    <div className="text-center space-y-6">
      <div className="mx-auto w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center">
        <span className="text-2xl">⏳</span>
      </div>
      
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Payment Submitted for Verification
        </h3>
        <p className="text-gray-600">
          Your USDT payment has been submitted and is awaiting admin verification.
          You will be notified once the payment is confirmed.
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="text-sm text-blue-800">
          <p className="font-medium mb-1">What happens next?</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Our team will verify your transaction on the blockchain</li>
            <li>Verification typically takes 5-15 minutes</li>
            <li>You&apos;ll receive a notification once confirmed</li>
            <li>Your booking will be activated upon payment confirmation</li>
          </ul>
        </div>
      </div>

      <div className="bg-gray-50 p-4 rounded-lg text-left">
        <h4 className="font-medium mb-2">Transaction Details</h4>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span>Network:</span>
            <span>{network === 'ethereum' ? 'Ethereum (ERC-20)' : 'TRON (TRC-20)'}</span>
          </div>
          <div className="flex justify-between">
            <span>Amount:</span>
            <span>${amount} USD in USDT</span>
          </div>
          <div className="flex justify-between">
            <span>Hash:</span>
            <span className="font-mono text-xs break-all">{transactionHash}</span>
          </div>
        </div>
      </div>

      <button
        onClick={() => {
          // Navigate back to dashboard or booking page
          onPaymentSuccess({
            paymentId: null, // Will be set after admin approval
            transactionId: transactionHash,
            amount: amount,
            method: 'usdt',
            status: 'awaiting_approval'
          });
        }}
        className="w-full py-3 px-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
      >
        Continue to Dashboard
      </button>
    </div>
  );

  return (
    <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={step === 1 ? onBack : () => setStep(step - 1)}
          className="flex items-center text-gray-600 hover:text-gray-800"
        >
          <span className="mr-2">←</span>
          Back
        </button>
        <div className="text-right">
          <p className="text-2xl font-bold text-purple-600">${amount}</p>
          <p className="text-sm text-gray-500">USDT Payment</p>
        </div>
      </div>

      {step === 1 && renderInstructions()}
      {step === 2 && renderHashSubmission()}
      {step === 3 && renderConfirmation()}
    </div>
  );
};

export default USDTPayment; 