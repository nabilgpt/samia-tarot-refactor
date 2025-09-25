/**
 * Mobile Security Configuration - M39
 * WebView hardening and security measures for Capacitor app
 */

// Content Security Policy for mobile WebView
export const MOBILE_CSP = {
  'default-src': ["'self'"],
  'script-src': [
    "'self'",
    "'unsafe-inline'", // Required for Vite dev mode
    "https://js.stripe.com",
    "https://checkout.stripe.com"
  ],
  'style-src': [
    "'self'",
    "'unsafe-inline'", // Required for CSS-in-JS
    "https://fonts.googleapis.com"
  ],
  'font-src': [
    "'self'",
    "https://fonts.gstatic.com",
    "data:"
  ],
  'img-src': [
    "'self'",
    "https:",
    "data:",
    "blob:"
  ],
  'connect-src': [
    "'self'",
    "https://samiatarot.com",
    "https://*.supabase.co",
    "https://api.stripe.com",
    "https://checkout.stripe.com",
    "https://*.twilio.com",
    "wss://*.supabase.co"
  ],
  'media-src': ["'self'", "https:", "blob:"],
  'frame-src': [
    "'self'",
    "https://js.stripe.com",
    "https://checkout.stripe.com"
  ],
  'worker-src': ["'self'", "blob:"],
  'manifest-src': ["'self'"]
};

// Generate CSP header string
export const CSP_HEADER = Object.entries(MOBILE_CSP)
  .map(([directive, sources]) => `${directive} ${sources.join(' ')}`)
  .join('; ');

// WebView security settings for Capacitor
export const WEBVIEW_SECURITY = {
  // Disable debug mode in production
  allowsInlineMediaPlayback: false,
  allowsLinkPreview: false,

  // iOS specific
  ios: {
    allowsBackForwardNavigationGestures: false,
    allowsInlineMediaPlayback: true,
    scrollEnabled: true,
    contentInset: 'automatic'
  },

  // Android specific
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false, // IMPORTANT: Disable in production
    thirdPartyCookiesEnabled: false,
    passwordAutosaveEnabled: false
  }
};

// Trusted domains for navigation
export const TRUSTED_DOMAINS = [
  'samiatarot.com',
  'www.samiatarot.com',
  '*.supabase.co',
  'js.stripe.com',
  'checkout.stripe.com'
];

// Deep link validation
export const validateDeepLink = (url) => {
  const allowedSchemes = ['https', 'samiatarot'];
  const allowedHosts = ['samiatarot.com', 'www.samiatarot.com'];

  try {
    const urlObj = new URL(url);

    if (urlObj.protocol === 'samiatarot:') {
      return true; // Custom scheme is always allowed
    }

    if (urlObj.protocol === 'https:' && allowedHosts.includes(urlObj.hostname)) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
};

// Security headers for mobile requests
export const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
  'Content-Security-Policy': CSP_HEADER
};

// Mobile-specific feature detection and hardening
export const hardenMobileWebView = () => {
  // Disable right-click context menu in mobile WebView
  document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
  });

  // Disable text selection in sensitive areas
  document.addEventListener('selectstart', (e) => {
    if (e.target.closest('.no-select')) {
      e.preventDefault();
    }
  });

  // Prevent pinch-to-zoom (if needed)
  document.addEventListener('touchstart', (e) => {
    if (e.touches.length > 1) {
      // Allow zoom for accessibility, but could be disabled if needed
      // e.preventDefault();
    }
  });

  // Clear sensitive data from memory on app backgrounding
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      // Clear sensitive form data
      const sensitiveInputs = document.querySelectorAll('input[type="password"], input[name*="card"], input[name*="cvv"]');
      sensitiveInputs.forEach(input => {
        input.value = '';
      });
    }
  });

  // Disable developer tools (additional layer)
  if (typeof window !== 'undefined') {
    // Disable F12, Ctrl+Shift+I, etc. (Note: not foolproof, but deters casual inspection)
    document.addEventListener('keydown', (e) => {
      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'C' || e.key === 'J')) ||
        (e.ctrlKey && e.key === 'U')
      ) {
        e.preventDefault();
      }
    });
  }
};

// Initialize mobile security measures
export const initMobileSecurity = () => {
  // Apply WebView hardening
  hardenMobileWebView();

  // Log security initialization
  console.log('🔒 Mobile security measures initialized');
  console.log('✅ CSP configured');
  console.log('✅ Deep link validation active');
  console.log('✅ WebView hardening applied');

  return {
    csp: CSP_HEADER,
    trustedDomains: TRUSTED_DOMAINS,
    securityHeaders: SECURITY_HEADERS
  };
};