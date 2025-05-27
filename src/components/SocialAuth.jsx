import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useTranslation } from 'react-i18next';
import { Phone, Mail, Loader2, Check, AlertCircle } from 'lucide-react';
import Button from './Button';

const supabase = createClient(
  'https://uusefmlielktdcltzwzt.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJodHRwczovL3N1cGFiYXNlLmNvbS9qd3Qvc2NvcGVzIjpbImF1dGgiXSwicm9sZSI6ImFub24iLCJpYXQiOjE2ODg0MDk3MDcsImV4cCI6MjAwMDAwMDAwMH0.JfSt1aI8mJQ4GuCPrlIxw3htv6yE-0Ajl-JbixcM1UA'
);

const SocialAuth = ({ onSuccess, onError, mode = 'signin' }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState({});
  const [mobileAuth, setMobileAuth] = useState({
    phone: '',
    otp: '',
    step: 'phone', // 'phone' | 'otp' | 'complete'
    loading: false,
    error: null
  });

  // Social OAuth Providers
  const socialProviders = [
    {
      id: 'google',
      name: 'Google',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
      ),
      color: 'bg-red-600 hover:bg-red-700',
      textColor: 'text-white'
    },
    {
      id: 'apple',
      name: 'Apple',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
        </svg>
      ),
      color: 'bg-black hover:bg-gray-800',
      textColor: 'text-white'
    },
    {
      id: 'facebook',
      name: 'Facebook',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
        </svg>
      ),
      color: 'bg-blue-600 hover:bg-blue-700',
      textColor: 'text-white'
    },
    {
      id: 'snapchat',
      name: 'Snapchat',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.174-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.402.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.357-.629-2.748-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24.009 12.017 24c6.624 0 11.99-5.367 11.99-11.988C24.007 5.367 18.641.001 12.017.001z"/>
        </svg>
      ),
      color: 'bg-yellow-400 hover:bg-yellow-500',
      textColor: 'text-black'
    },
    {
      id: 'microsoft',
      name: 'Microsoft',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M11.4 24H0V12.6h11.4V24zM24 24H12.6V12.6H24V24zM11.4 11.4H0V0h11.4v11.4zM24 11.4H12.6V0H24v11.4z"/>
        </svg>
      ),
      color: 'bg-blue-500 hover:bg-blue-600',
      textColor: 'text-white'
    }
  ];

  // Handle OAuth Sign-in
  const handleOAuthSignIn = async (provider) => {
    setLoading(prev => ({ ...prev, [provider]: true }));
    
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        }
      });

      if (error) {
        onError?.(error.message);
      } else {
        // OAuth redirect will handle success
      }
    } catch (err) {
      onError?.(err.message);
    } finally {
      setLoading(prev => ({ ...prev, [provider]: false }));
    }
  };

  // Handle Mobile Phone Authentication
  const handleMobileAuth = async () => {
    if (mobileAuth.step === 'phone') {
      await sendPhoneOTP();
    } else if (mobileAuth.step === 'otp') {
      await verifyPhoneOTP();
    }
  };

  const sendPhoneOTP = async () => {
    if (!mobileAuth.phone) {
      setMobileAuth(prev => ({ ...prev, error: 'Please enter a valid phone number' }));
      return;
    }

    setMobileAuth(prev => ({ ...prev, loading: true, error: null }));

    try {
      const { data, error } = await supabase.auth.signInWithOtp({
        phone: mobileAuth.phone,
        options: {
          channel: 'sms'
        }
      });

      if (error) {
        setMobileAuth(prev => ({ ...prev, error: error.message, loading: false }));
      } else {
        setMobileAuth(prev => ({ 
          ...prev, 
          step: 'otp', 
          loading: false,
          error: null 
        }));
      }
    } catch (err) {
      setMobileAuth(prev => ({ ...prev, error: err.message, loading: false }));
    }
  };

  const verifyPhoneOTP = async () => {
    if (!mobileAuth.otp) {
      setMobileAuth(prev => ({ ...prev, error: 'Please enter the OTP code' }));
      return;
    }

    setMobileAuth(prev => ({ ...prev, loading: true, error: null }));

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        phone: mobileAuth.phone,
        token: mobileAuth.otp,
        type: 'sms'
      });

      if (error) {
        setMobileAuth(prev => ({ ...prev, error: error.message, loading: false }));
      } else {
        setMobileAuth(prev => ({ ...prev, step: 'complete', loading: false }));
        onSuccess?.(data.user);
      }
    } catch (err) {
      setMobileAuth(prev => ({ ...prev, error: err.message, loading: false }));
    }
  };

  // Listen for auth state changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        onSuccess?.(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [onSuccess]);

  return (
    <div className="space-y-6">
      {/* Social OAuth Providers */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-gold-400 text-center mb-4">
          {mode === 'signin' ? t('auth.socialSignin') : t('auth.socialSignup')}
        </h3>
        
        {socialProviders.map((provider) => (
          <Button
            key={provider.id}
            onClick={() => handleOAuthSignIn(provider.id)}
            disabled={loading[provider.id]}
            className={`w-full ${provider.color} ${provider.textColor} border-0 hover:scale-105 transition-all duration-200`}
            size="lg"
          >
            <div className="flex items-center justify-center space-x-3">
              {loading[provider.id] ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                provider.icon
              )}
              <span>
                {loading[provider.id] 
                  ? t('auth.connecting') 
                  : `${mode === 'signin' ? t('auth.continueWith') : t('auth.signupWith')} ${provider.name}`
                }
              </span>
            </div>
          </Button>
        ))}
      </div>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-600"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-dark-800 text-gray-400">{t('auth.or')}</span>
        </div>
      </div>

      {/* Mobile-Only Authentication */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gold-400 text-center">
          {t('auth.mobileAuth')}
        </h3>

        {mobileAuth.step === 'phone' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gold-400 mb-2">
                <Phone className="inline w-4 h-4 mr-2" />
                {t('auth.phoneNumber')}
              </label>
              <input
                type="tel"
                value={mobileAuth.phone}
                onChange={(e) => setMobileAuth(prev => ({ ...prev, phone: e.target.value }))}
                className="input-field"
                placeholder="+966501234567"
                dir="ltr"
              />
            </div>
            
            {mobileAuth.error && (
              <div className="flex items-center space-x-2 text-red-400 text-sm">
                <AlertCircle className="w-4 h-4" />
                <span>{mobileAuth.error}</span>
              </div>
            )}

            <Button
              onClick={handleMobileAuth}
              loading={mobileAuth.loading}
              className="w-full"
              size="lg"
            >
              {t('auth.sendOTP')}
            </Button>
          </div>
        )}

        {mobileAuth.step === 'otp' && (
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-sm text-gray-400 mb-4">
                {t('auth.otpSentTo')} {mobileAuth.phone}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gold-400 mb-2">
                {t('auth.enterOTP')}
              </label>
              <input
                type="text"
                value={mobileAuth.otp}
                onChange={(e) => setMobileAuth(prev => ({ ...prev, otp: e.target.value }))}
                className="input-field text-center text-2xl tracking-widest"
                placeholder="123456"
                maxLength={6}
                dir="ltr"
              />
            </div>

            {mobileAuth.error && (
              <div className="flex items-center space-x-2 text-red-400 text-sm">
                <AlertCircle className="w-4 h-4" />
                <span>{mobileAuth.error}</span>
              </div>
            )}

            <div className="space-y-3">
              <Button
                onClick={handleMobileAuth}
                loading={mobileAuth.loading}
                className="w-full"
                size="lg"
              >
                {t('auth.verifyOTP')}
              </Button>

              <Button
                onClick={() => setMobileAuth(prev => ({ ...prev, step: 'phone', otp: '', error: null }))}
                variant="outline"
                className="w-full"
                size="sm"
              >
                {t('auth.changePhone')}
              </Button>
            </div>
          </div>
        )}

        {mobileAuth.step === 'complete' && (
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center">
                <Check className="w-8 h-8 text-white" />
              </div>
            </div>
            <p className="text-green-400 font-medium">{t('auth.phoneVerified')}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SocialAuth; 