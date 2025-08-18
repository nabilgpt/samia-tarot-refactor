import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import api from '../../services/frontendApi.js';

const TransferPayment = ({ service, amount, onPaymentSuccess, onPaymentError, onBack, bookingId, method }) => {
  const { user, profile } = useAuth();
  const [step, setStep] = useState(1); // 1: Instructions, 2: Receipt upload, 3: Confirmation
  const [receiptFile, setReceiptFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  // Transfer method configurations
  const transferMethods = {
    western_union: {
      name: 'Western Union',
      icon: '🌍',
      instructions: [
        'Visit any Western Union location or use their website/app',
        'Send money to: Samia Tarot Services',
        'Use the receiver details provided below',
        'Keep your receipt with the MTCN (tracking number)',
        'Upload a photo of your receipt for verification'
      ],
      receiverInfo: {
        name: 'Samia Tarot Services',
        country: 'Lebanon',
        city: 'Beirut',
        phone: '+961-1-234567'
      },
      fees: '$5-15 transfer fee',
      processingTime: '1-3 business days'
    },
    moneygram: {
      name: 'MoneyGram',
      icon: '💸',
      instructions: [
        'Visit any MoneyGram agent location or use their online service',
        'Send money to: Samia Tarot Services',
        'Use the receiver details provided below',
        'Keep your receipt with the reference number',
        'Upload a photo of your receipt for verification'
      ],
      receiverInfo: {
        name: 'Samia Tarot Services',
        country: 'Lebanon',
        city: 'Beirut',
        phone: '+961-1-234567'
      },
      fees: '$5-12 transfer fee',
      processingTime: '1-3 business days'
    },
    ria: {
      name: 'Ria Money Transfer',
      icon: '🏦',
      instructions: [
        'Visit any Ria Money Transfer location or use their website',
        'Send money to: Samia Tarot Services',
        'Use the receiver details provided below',
        'Keep your receipt with the PIN number',
        'Upload a photo of your receipt for verification'
      ],
      receiverInfo: {
        name: 'Samia Tarot Services',
        country: 'Lebanon',
        city: 'Beirut',
        phone: '+961-1-234567'
      },
      fees: '$3-10 transfer fee',
      processingTime: '1-2 business days'
    },
    omt: {
      name: 'OMT (Lebanon)',
      icon: '🇱🇧',
      instructions: [
        'Visit any OMT branch in Lebanon',
        'Send money to: Samia Tarot Services',
        'Use the receiver details provided below',
        'Keep your receipt with the transaction number',
        'Upload a photo of your receipt for verification'
      ],
      receiverInfo: {
        name: 'Samia Tarot Services',
        phone: '+961-1-234567',
        id: 'ID: 123456789'
      },
      fees: '$2-5 transfer fee',
      processingTime: 'Same day'
    },
    whish: {
      name: 'Whish Money',
      icon: '📱',
      instructions: [
        'Open your Whish Money app',
        'Send money to: +961-1-234567',
        'Use the amount specified below',
        'Add "SAMIA-' + bookingId + '" in the notes',
        'Take a screenshot of the successful transaction'
      ],
      receiverInfo: {
        phone: '+961-1-234567',
        name: 'Samia Tarot Services'
      },
      fees: '1-2% transaction fee',
      processingTime: 'Instant'
    },
    bob: {
      name: 'Bank of Beirut',
      icon: '🏛️',
      instructions: [
        'Transfer to Bank of Beirut account',
        'Account Name: Samia Tarot Services',
        'Use the account details provided below',
        'Include "SAMIA-' + bookingId + '" in the transfer reference',
        'Upload a photo of your transfer receipt'
      ],
      receiverInfo: {
        bankName: 'Bank of Beirut',
        accountName: 'Samia Tarot Services',
        accountNumber: '123456789',
        iban: 'LB62 0999 0000 0012 3456 7890 1234'
      },
      fees: 'No additional fees',
      processingTime: '1-2 business days'
    }
  };

  const currentMethod = transferMethods[method.id] || transferMethods.western_union;

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        setError('Please upload a valid image (JPG, PNG, WebP) or PDF file');
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('File size must be less than 5MB');
        return;
      }

      setReceiptFile(file);
      setError(null);
    }
  };

  const handleReceiptUpload = async () => {
    if (!receiptFile) {
      setError('Please select a receipt file to upload');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      // Create payment record first
      const paymentResult = await api.createPayment({
        booking_id: bookingId,
        user_id: user.id,
        amount: amount,
        method: method.id,
        status: 'awaiting_approval',
        metadata: {
          transfer_method: currentMethod.name,
          submitted_at: new Date().toISOString()
        }
      });

      if (!paymentResult.success) {
        throw new Error(paymentResult.error);
      }

      // Upload receipt
      const receiptResult = await api.uploadPaymentReceipt(paymentResult.data.id, receiptFile);
      
      if (receiptResult.success) {
        setStep(3);
      } else {
        throw new Error(receiptResult.error);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const renderInstructions = () => (
    <div className="space-y-6">
      <div className="mb-6">
        <div className="flex items-center mb-4">
          <span className="text-3xl mr-3">{currentMethod.icon}</span>
          <div>
            <h3 className="text-lg font-semibold">{currentMethod.name}</h3>
            <p className="text-sm text-gray-600">Follow the steps below to complete your payment</p>
          </div>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <h4 className="font-medium text-blue-900 mb-2">Payment Instructions</h4>
        <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800">
          {currentMethod.instructions.map((instruction, index) => (
            <li key={index}>{instruction}</li>
          ))}
        </ol>
      </div>

      <div className="bg-gray-50 p-4 rounded-lg mb-6">
        <h4 className="font-medium mb-3">Receiver Information</h4>
        <div className="space-y-2 text-sm">
          {Object.entries(currentMethod.receiverInfo).map(([key, value]) => (
            <div key={key} className="flex justify-between">
              <span className="capitalize text-gray-600">{key.replace(/([A-Z])/g, ' $1').trim()}:</span>
              <span className="font-medium">{value}</span>
            </div>
          ))}
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
            <span>Amount to Send:</span>
            <span className="font-bold">${amount} USD</span>
          </div>
          <div className="flex justify-between">
            <span>Transfer Fees:</span>
            <span>{currentMethod.fees}</span>
          </div>
          <div className="flex justify-between">
            <span>Processing Time:</span>
            <span>{currentMethod.processingTime}</span>
          </div>
        </div>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start">
          <span className="text-yellow-600 mr-2">⚠️</span>
          <div className="text-sm text-yellow-800">
            <p className="font-medium mb-1">Important:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Send exactly <strong>${amount} USD</strong></li>
              <li>Keep your receipt for verification</li>
              <li>Payment will be confirmed after receipt verification</li>
              <li>Contact support if you need assistance</li>
            </ul>
          </div>
        </div>
      </div>

      <button
        onClick={() => setStep(2)}
        className="w-full py-3 px-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
      >
        I&apos;ve Sent the Money
      </button>
    </div>
  );

  const renderReceiptUpload = () => (
    <div className="space-y-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">Upload Payment Receipt</h3>
        <p className="text-gray-600 text-sm">
          Please upload a clear photo of your {currentMethod.name} receipt for verification.
        </p>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Receipt File
        </label>
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
          <input
            type="file"
            accept="image/*,.pdf"
            onChange={handleFileSelect}
            className="hidden"
            id="receipt-upload"
          />
          <label htmlFor="receipt-upload" className="cursor-pointer">
            {receiptFile ? (
              <div className="space-y-2">
                <div className="text-green-600">
                  <span className="text-2xl">✓</span>
                </div>
                <p className="text-sm font-medium text-gray-900">{receiptFile.name}</p>
                <p className="text-xs text-gray-500">
                  {(receiptFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
                <p className="text-xs text-purple-600">Click to change file</p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="text-gray-400">
                  <span className="text-3xl">📄</span>
                </div>
                <p className="text-sm font-medium text-gray-900">
                  Click to upload receipt
                </p>
                <p className="text-xs text-gray-500">
                  JPG, PNG, WebP or PDF (max 5MB)
                </p>
              </div>
            )}
          </label>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">Receipt Requirements</h4>
        <ul className="list-disc list-inside space-y-1 text-sm text-blue-800">
          <li>Clear, readable image of the complete receipt</li>
          <li>All transaction details must be visible</li>
          <li>Include transaction/reference number</li>
          <li>Show amount sent and receiver information</li>
        </ul>
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
          onClick={handleReceiptUpload}
          disabled={uploading || !receiptFile}
          className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
            uploading || !receiptFile
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-purple-600 hover:bg-purple-700 text-white'
          }`}
        >
          {uploading ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              Uploading...
            </div>
          ) : (
            'Submit Receipt'
          )}
        </button>
      </div>
    </div>
  );

  const renderConfirmation = () => (
    <div className="text-center space-y-6">
      <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
        <span className="text-2xl">✅</span>
      </div>
      
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Receipt Uploaded Successfully
        </h3>
        <p className="text-gray-600">
          Your {currentMethod.name} payment receipt has been uploaded and is awaiting verification.
          You will be notified once the payment is confirmed.
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="text-sm text-blue-800">
          <p className="font-medium mb-1">What happens next?</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Our team will verify your payment receipt</li>
            <li>Verification typically takes {currentMethod.processingTime.toLowerCase()}</li>
            <li>You&apos;ll receive a notification once confirmed</li>
            <li>Your booking will be activated upon payment confirmation</li>
          </ul>
        </div>
      </div>

      <div className="bg-gray-50 p-4 rounded-lg text-left">
        <h4 className="font-medium mb-2">Payment Details</h4>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span>Method:</span>
            <span>{currentMethod.name}</span>
          </div>
          <div className="flex justify-between">
            <span>Amount:</span>
            <span>${amount} USD</span>
          </div>
          <div className="flex justify-between">
            <span>Status:</span>
            <span className="text-yellow-600 font-medium">Awaiting Verification</span>
          </div>
        </div>
      </div>

      <button
        onClick={() => {
          onPaymentSuccess({
            paymentId: null, // Will be set after admin approval
            transactionId: null,
            amount: amount,
            method: method.id,
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
          <p className="text-sm text-gray-500">{currentMethod.name}</p>
        </div>
      </div>

      {step === 1 && renderInstructions()}
      {step === 2 && renderReceiptUpload()}
      {step === 3 && renderConfirmation()}
    </div>
  );
};

export default TransferPayment; 