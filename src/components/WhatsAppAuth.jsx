import React, { useState } from 'react';
import { supabase, authHelpers } from '../lib/supabase.js';

const WhatsAppAuth = () => {
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [message, setMessage] = useState('');
  const [user, setUser] = useState(null);

  const sendOTP = async () => {
    if (!phone) {
      setMessage('Please enter a valid phone number');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const { data, error } = await supabase.auth.signInWithOtp({
        phone: phone,
        options: {
          channel: 'whatsapp',
          data: {
            twilioAccountSid: import.meta.env.VITE_TWILIO_ACCOUNT_SID,
            twilioMessageServiceSid: import.meta.env.VITE_TWILIO_MESSAGE_SERVICE_SID
          }
        }
      });

      if (error) {
        setMessage(`Error: ${error.message}`);
      } else {
        setOtpSent(true);
        setMessage('OTP sent to your WhatsApp! Please check your messages.');
      }
    } catch (err) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const verifyOTP = async () => {
    if (!otp) {
      setMessage('Please enter the OTP');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        phone: phone,
        token: otp,
        type: 'sms'
      });

      if (error) {
        setMessage(`Error: ${error.message}`);
      } else {
        setUser(data.user);
        setMessage('Authentication successful!');
      }
    } catch (err) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    setLoading(true);
    setMessage('');

    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      });

      if (error) {
        setMessage(`Error: ${error.message}`);
      } else {
        setMessage('Redirecting to Google...');
      }
    } catch (err) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    await authHelpers.signOut();
    setUser(null);
    setOtpSent(false);
    setPhone('');
    setOtp('');
    setMessage('');
  };

  // Listen for auth state changes
  React.useEffect(() => {
    const { data: { subscription } } = authHelpers.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser(session.user);
        setMessage('Authentication successful!');
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  if (user) {
    return (
      <div style={{ maxWidth: '400px', margin: '50px auto', padding: '20px', border: '1px solid #ddd', borderRadius: '8px' }}>
        <h2>Welcome!</h2>
        <p>Email: {user.email}</p>
        <p>Phone: {user.phone}</p>
        <p>User ID: {user.id}</p>
        <p>Provider: {user.app_metadata?.provider}</p>
        <button 
          onClick={signOut}
          style={{
            width: '100%',
            padding: '12px',
            backgroundColor: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '16px'
          }}
        >
          Sign Out
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '400px', margin: '50px auto', padding: '20px', border: '1px solid #ddd', borderRadius: '8px' }}>
      <h2>Authentication Options</h2>
      
      {/* Google OAuth */}
      <div style={{ marginBottom: '30px' }}>
        <button
          onClick={signInWithGoogle}
          disabled={loading}
          style={{
            width: '100%',
            padding: '12px',
            backgroundColor: loading ? '#6c757d' : '#db4437',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '16px',
            marginBottom: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
        >
          <span>🔍</span>
          {loading ? 'Loading...' : 'Continue with Google'}
        </button>
      </div>

      <div style={{ textAlign: 'center', margin: '20px 0', color: '#666' }}>
        <span>OR</span>
      </div>

      {/* WhatsApp OTP */}
      <h3 style={{ marginBottom: '15px' }}>WhatsApp OTP Authentication</h3>
      
      {!otpSent ? (
        <div>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Phone Number (with country code):
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1234567890"
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                fontSize: '16px'
              }}
            />
          </div>
          
          <button
            onClick={sendOTP}
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: loading ? '#6c757d' : '#25D366',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            <span>📱</span>
            {loading ? 'Sending...' : 'Send OTP via WhatsApp'}
          </button>
        </div>
      ) : (
        <div>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Enter OTP from WhatsApp:
            </label>
            <input
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="123456"
              maxLength="6"
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                fontSize: '16px',
                textAlign: 'center',
                letterSpacing: '2px'
              }}
            />
          </div>
          
          <button
            onClick={verifyOTP}
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: loading ? '#6c757d' : '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '16px',
              marginBottom: '10px'
            }}
          >
            {loading ? 'Verifying...' : 'Verify OTP'}
          </button>
          
          <button
            onClick={() => {
              setOtpSent(false);
              setOtp('');
              setMessage('');
            }}
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            Back to Phone Entry
          </button>
        </div>
      )}
      
      {message && (
        <div style={{
          marginTop: '15px',
          padding: '10px',
          backgroundColor: message.includes('Error') ? '#f8d7da' : '#d4edda',
          color: message.includes('Error') ? '#721c24' : '#155724',
          border: `1px solid ${message.includes('Error') ? '#f5c6cb' : '#c3e6cb'}`,
          borderRadius: '4px'
        }}>
          {message}
        </div>
      )}
    </div>
  );
};

export default WhatsAppAuth;
