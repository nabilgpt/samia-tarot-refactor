import React, { useRef, useState, useEffect } from 'react';
import ReCAPTCHA from 'react-google-recaptcha';
import { useTranslation } from 'react-i18next';
import { Shield, Check, AlertCircle, RefreshCw } from 'lucide-react';
import Button from './Button';

const ReCaptchaComponent = ({ 
  onVerify, 
  onError, 
  onExpire,
  theme = 'dark',
  size = 'normal',
  className = '',
  showStatus = true,
  autoReset = true
}) => {
  const { t, i18n } = useTranslation();
  const recaptchaRef = useRef();
  const [isVerified, setIsVerified] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [token, setToken] = useState(null);

  // reCAPTCHA configuration
  const RECAPTCHA_SITE_KEY = "6LfwzksrAAAAAJIFtpCaSBXXKni6pFYEGsvYbN06";
  const RECAPTCHA_SECRET_KEY = "6LfwzksrAAAAAAx_w7utBIM572cyg3bDMj10yVw2";

  // Get current language for reCAPTCHA
  const getCurrentLanguage = () => {
    const currentLang = i18n.language;
    return currentLang === 'ar' ? 'ar' : 'en';
  };

  // Handle reCAPTCHA change
  const handleCaptchaChange = async (captchaToken) => {
    if (!captchaToken) {
      setIsVerified(false);
      setToken(null);
      setError(null);
      onVerify?.(false, null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Verify token with backend
      const isValid = await verifyRecaptchaToken(captchaToken);
      
      if (isValid) {
        setIsVerified(true);
        setToken(captchaToken);
        setError(null);
        onVerify?.(true, captchaToken);
      } else {
        setIsVerified(false);
        setToken(null);
        setError(t('auth.verification.captchaError'));
        onError?.(t('auth.verification.captchaError'));
        
        // Auto reset on failure
        if (autoReset) {
          setTimeout(() => {
            resetCaptcha();
          }, 2000);
        }
      }
    } catch (err) {
      setIsVerified(false);
      setToken(null);
      setError(err.message || t('auth.verification.captchaError'));
      onError?.(err.message || t('auth.verification.captchaError'));
    } finally {
      setIsLoading(false);
    }
  };

  // Verify reCAPTCHA token with backend
  const verifyRecaptchaToken = async (token) => {
    try {
      // In a real application, this should be done on your backend
      const response = await fetch('/api/verify-recaptcha', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const data = await response.json();
      return data.success;
    } catch (error) {
      // Fallback verification for demo purposes
      // In production, NEVER do client-side verification
      console.warn('Backend verification failed, using fallback');
      return await fallbackVerification(token);
    }
  };

  // Fallback verification (for demo only - NOT for production)
  const fallbackVerification = async (token) => {
    try {
      const response = await fetch(
        `https://www.google.com/recaptcha/api/siteverify?secret=${RECAPTCHA_SECRET_KEY}&response=${token}`,
        { method: 'POST' }
      );
      
      const data = await response.json();
      return data.success;
    } catch (error) {
      console.error('reCAPTCHA verification failed:', error);
      return false;
    }
  };

  // Handle reCAPTCHA expiration
  const handleCaptchaExpire = () => {
    setIsVerified(false);
    setToken(null);
    setError(t('auth.verification.captchaExpired'));
    onExpire?.();
  };

  // Reset reCAPTCHA
  const resetCaptcha = () => {
    if (recaptchaRef.current) {
      recaptchaRef.current.reset();
    }
    setIsVerified(false);
    setToken(null);
    setError(null);
  };

  // Handle manual refresh
  const handleRefresh = () => {
    resetCaptcha();
    setError(null);
  };

  // Auto-reset when language changes
  useEffect(() => {
    if (isVerified || token) {
      resetCaptcha();
    }
  }, [i18n.language]);

  return (
    <div className={`recaptcha-container ${className}`}>
      {/* Header */}
      {showStatus && (
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Shield className="w-5 h-5 text-gold-400" />
            <span className="font-medium text-gold-400">
              {t('auth.verification.captchaTitle')}
            </span>
          </div>
          
          {/* Status indicators */}
          <div className="flex items-center space-x-2">
            {isLoading && (
              <RefreshCw className="w-4 h-4 text-blue-400 animate-spin" />
            )}
            {isVerified && (
              <Check className="w-5 h-5 text-green-400" />
            )}
            {error && (
              <AlertCircle className="w-5 h-5 text-red-400" />
            )}
          </div>
        </div>
      )}

      {/* reCAPTCHA Widget */}
      <div className="flex flex-col items-center space-y-4">
        {!isVerified ? (
          <div className="recaptcha-widget">
            <ReCAPTCHA
              ref={recaptchaRef}
              sitekey={RECAPTCHA_SITE_KEY}
              onChange={handleCaptchaChange}
              onExpired={handleCaptchaExpire}
              theme={theme}
              size={size}
              hl={getCurrentLanguage()}
              className="mx-auto"
            />
          </div>
        ) : (
          <div className="text-center space-y-3">
            <div className="flex justify-center">
              <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center">
                <Check className="w-8 h-8 text-white" />
              </div>
            </div>
            <p className="text-green-400 font-medium">
              {t('auth.verification.captchaVerified')}
            </p>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="flex items-center space-x-2 text-red-400 text-sm bg-red-400/10 p-3 rounded-lg border border-red-400/20">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Action buttons */}
        {(error || isVerified) && (
          <div className="flex space-x-3">
            <Button
              onClick={handleRefresh}
              variant="outline"
              size="sm"
              className="text-xs"
            >
              <RefreshCw className="w-3 h-3 mr-1" />
              {t('auth.verification.refreshCaptcha')}
            </Button>
          </div>
        )}
      </div>

      {/* Help text */}
      <div className="mt-4 text-center">
        <p className="text-xs text-gray-400">
          {t('auth.verification.captchaHelp')}
        </p>
      </div>
    </div>
  );
};

export default ReCaptchaComponent; 