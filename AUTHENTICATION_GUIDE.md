# 🔐 SAMIA TAROT - Complete Authentication System

## 📋 Overview

This comprehensive authentication system provides multiple sign-in/sign-up options for the SAMIA TAROT application, including:

- ✅ **Manual Email/Password Registration** (Multi-step form)
- ✅ **Social OAuth Providers** (Google, Apple, Facebook, Snapchat, Microsoft)
- ✅ **Mobile-Only Authentication** (Phone number + SMS OTP)
- ✅ **Email & Phone Verification** (OTP codes)
- ✅ **Enhanced reCAPTCHA Protection** (Google reCAPTCHA v2/v3 with backend verification)
- ✅ **Multi-language Support** (English & Arabic)
- ✅ **Responsive Design** (Mobile-first approach)
- ✅ **Backend API Service** (Node.js/Express + PHP options)

## 🚀 Features

### 🔑 Authentication Methods

#### 1. **Manual Registration Form**
- **Step 1**: Personal Information (Name, Email, Phone, Country, DOB, Gender)
- **Step 2**: Security & Password (Password creation + Terms acceptance)
- **Step 3**: Verification (Email OTP + SMS OTP + Enhanced reCAPTCHA)

#### 2. **Social OAuth Providers**
- 🟢 **Google** - Google Cloud Console OAuth
- 🟣 **Apple** - Apple Developer Portal (Sign in with Apple)
- 🔵 **Facebook** - Facebook Developer Console OAuth
- 🟡 **Snapchat** - SnapKit for Developers
- 🔷 **Microsoft** - Azure AD (Microsoft Identity Platform)

#### 3. **Mobile-Only Authentication**
- Phone number input with country code detection
- SMS OTP verification via Supabase Auth
- Fallback to complete missing profile fields

### 🛡️ Enhanced Security Features

- **Advanced reCAPTCHA Integration** with custom React component
- **Backend Verification Service** (Node.js + PHP options)
- **Rate Limiting** and abuse prevention
- **Real-time Validation** with comprehensive error handling
- **Auto-refresh** and fallback mechanisms
- **Multi-language Support** (Arabic RTL + English LTR)
- **Custom Styling** with SAMIA TAROT theme integration

### 🌍 Internationalization

- **English** and **Arabic** language support
- **RTL (Right-to-Left)** layout support for Arabic
- **Localized error messages** and UI text
- **Cultural adaptations** for different regions

## 📁 Enhanced File Structure

```
src/
├── components/
│   ├── SocialAuth.jsx          # Social OAuth & Mobile auth component
│   ├── ReCaptchaComponent.jsx  # Enhanced reCAPTCHA component
│   ├── Button.jsx              # Reusable button component
│   └── Layout.jsx              # Main layout wrapper
├── pages/
│   ├── AuthPage.jsx            # Comprehensive auth page
│   ├── Login.jsx               # Simple login page (legacy)
│   └── Signup.jsx              # Simple signup page (legacy)
├── styles/
│   └── recaptcha.css           # Custom reCAPTCHA styling
├── context/
│   ├── AuthContext.jsx         # Authentication state management
│   └── UIContext.jsx           # UI notifications & state
├── i18n/
│   ├── en.json                 # English translations
│   ├── ar.json                 # Arabic translations
│   └── index.js                # i18n configuration
├── utils/
│   ├── validation.js           # Form validation utilities
│   └── countries.js            # Countries list with codes
└── App.jsx                     # Main app with routing

backend/
├── verify-recaptcha.js         # Node.js backend service
├── verify-recaptcha.php        # PHP backend alternative
├── package.json                # Node.js dependencies
├── env.example                 # Environment variables template
└── README.md                   # Backend documentation
```

## 🔧 Setup Instructions

### 1. **Install Dependencies**

```bash
# Frontend dependencies
npm install @supabase/supabase-js react-google-recaptcha react-i18next

# Backend dependencies (Node.js)
cd backend
npm install express cors helmet express-rate-limit node-fetch dotenv
```

### 2. **Configure Enhanced reCAPTCHA**

#### Frontend Configuration

```jsx
import ReCaptchaComponent from './components/ReCaptchaComponent';

<ReCaptchaComponent
  onVerify={(isVerified, token) => {
    if (isVerified) {
      console.log('reCAPTCHA verified:', token);
    }
  }}
  onError={(error) => {
    console.error('reCAPTCHA error:', error);
  }}
  onExpire={() => {
    console.log('reCAPTCHA expired');
  }}
  theme="dark"
  size="normal"
  showStatus={true}
  autoReset={true}
  className="w-full"
/>
```

#### Backend Configuration

**Node.js Service:**
```bash
cd backend
cp env.example .env
# Edit .env with your configuration
npm start
```

**PHP Service:**
```php
<?php
$RECAPTCHA_SECRET_KEY = 'your_secret_key_here';
// Use the provided verify-recaptcha.php
?>
```

### 3. **Setup OAuth Providers**

#### Google OAuth
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URIs:
   - `http://localhost:3000/auth/callback`
   - `https://yourdomain.com/auth/callback`

#### Apple Sign In
1. Go to [Apple Developer Portal](https://developer.apple.com/)
2. Create an App ID with Sign In with Apple capability
3. Create a Services ID for web authentication
4. Configure domain and redirect URLs

#### Facebook Login
1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Create a new app
3. Add Facebook Login product
4. Configure Valid OAuth Redirect URIs

#### Snapchat Login
1. Go to [Snap Kit](https://kit.snapchat.com/)
2. Create a new app
3. Enable Login Kit
4. Configure redirect URIs

#### Microsoft OAuth
1. Go to [Azure Portal](https://portal.azure.com/)
2. Register a new application
3. Configure authentication platform
4. Add redirect URIs

### 4. **Configure Enhanced reCAPTCHA**

1. **Get reCAPTCHA Keys:**
   - Visit [Google reCAPTCHA](https://www.google.com/recaptcha/)
   - Create a new site with reCAPTCHA v2 (recommended) or v3
   - Add your domain(s)
   - Copy Site Key and Secret Key

2. **Frontend Configuration:**
```javascript
// In ReCaptchaComponent.jsx
const RECAPTCHA_SITE_KEY = "your_site_key_here";
```

3. **Backend Configuration:**
```bash
# In backend/.env
RECAPTCHA_SECRET_KEY=your_secret_key_here
RECAPTCHA_MIN_SCORE=0.5
```

### 5. **Start Backend Service**

**Node.js:**
```bash
cd backend
npm run dev  # Development
npm start    # Production
```

**PHP:**
```bash
# Place verify-recaptcha.php in your web server
# Ensure proper CORS and security headers
```

## 🎯 Enhanced Usage

### Advanced reCAPTCHA Component

```jsx
import ReCaptchaComponent from './components/ReCaptchaComponent';

<ReCaptchaComponent
  onVerify={(isVerified, token) => {
    // Handle verification result
    setFormData(prev => ({ 
      ...prev, 
      captchaVerified: isVerified,
      captchaToken: token 
    }));
  }}
  onError={(error) => {
    // Handle errors
    showNotification(error, 'error');
  }}
  onExpire={() => {
    // Handle expiration
    showNotification('reCAPTCHA expired', 'warning');
  }}
  theme="dark"           // 'light' | 'dark'
  size="normal"          // 'compact' | 'normal'
  showStatus={true}      // Show verification status
  autoReset={true}       // Auto-reset on failure
  className="custom-class"
/>
```

### Backend API Integration

**Endpoint:** `POST /api/verify-recaptcha`

**Request:**
```json
{
  "token": "03AGdBq25..."
}
```

**Success Response:**
```json
{
  "success": true,
  "message": "reCAPTCHA verification successful",
  "score": 0.9,
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Invalid reCAPTCHA response",
  "errorCodes": ["invalid-input-response"]
}
```

## 📤 Enhanced API Payload Example

When a user successfully completes registration, the final payload includes:

```json
{
  "firstName": "Nabil",
  "lastName": "Zein",
  "email": "nabil@example.com",
  "phone": "+96176543210",
  "country": "Lebanon",
  "countryCode": "+961",
  "dateOfBirth": "1981-08-26",
  "zodiac": "Virgo",
  "gender": "Male",
  "password": "hashed_password_here",
  "emailVerified": true,
  "mobileVerified": true,
  "captchaVerified": true,
  "captchaToken": "03AGdBq25...",
  "captchaScore": 0.9
}
```

## 🔄 Enhanced Authentication Flow

### Manual Registration Flow with Enhanced reCAPTCHA
1. **Step 1**: User fills personal information
2. **Step 2**: User creates password and accepts terms
3. **Step 3**: User verifies email, phone, and completes enhanced reCAPTCHA
   - reCAPTCHA widget loads with custom styling
   - User completes challenge
   - Frontend sends token to backend for verification
   - Backend validates with Google and returns result
   - Success indicators and error handling
4. **Final**: Account created and user logged in

## 🎨 Enhanced UI/UX Features

- **Custom reCAPTCHA Styling**: Matches SAMIA TAROT cosmic theme
- **Loading States**: Visual feedback during verification
- **Error Handling**: Clear error messages with retry options
- **Success Indicators**: Animated checkmarks and confirmations
- **Auto-refresh**: Automatic retry on failures
- **Accessibility**: ARIA labels and keyboard navigation
- **Mobile Optimization**: Responsive design for all devices
- **RTL Support**: Proper Arabic language support

## 🛡️ Enhanced Security Considerations

- **Backend Verification**: All reCAPTCHA tokens verified server-side
- **Rate Limiting**: Prevents abuse with configurable limits
- **Security Headers**: Helmet.js protection
- **IP Detection**: Proper client IP identification
- **Logging**: Comprehensive verification attempt logging
- **Fallback Mechanisms**: Multiple verification strategies
- **Token Validation**: Proper token format and expiration checks

## 🚀 Enhanced Deployment Checklist

- [ ] Configure all OAuth provider credentials
- [ ] Set up enhanced reCAPTCHA with production domains
- [ ] Deploy backend verification service (Node.js or PHP)
- [ ] Configure Supabase for production
- [ ] Set up SMS provider (Twilio) for phone verification
- [ ] Configure proper CORS settings
- [ ] Set up monitoring and logging
- [ ] Test all authentication flows including reCAPTCHA
- [ ] Verify email/SMS delivery in production
- [ ] Load test backend verification service
- [ ] Set up SSL/TLS certificates
- [ ] Configure CDN for static assets

## 📞 Enhanced Support & Troubleshooting

### Common reCAPTCHA Issues

1. **"reCAPTCHA verification failed"**
   - Check site key and secret key configuration
   - Verify domain is registered in reCAPTCHA console
   - Check backend service is running

2. **"Backend verification unavailable"**
   - Ensure backend service is accessible
   - Check CORS configuration
   - Verify network connectivity

3. **"Low confidence score"**
   - Adjust RECAPTCHA_MIN_SCORE in backend
   - Consider using reCAPTCHA v2 instead of v3

4. **"Rate limit exceeded"**
   - Wait for rate limit window to reset
   - Adjust rate limiting configuration

### Debug Mode

Enable debug logging:

```bash
# Backend
NODE_ENV=development
LOG_LEVEL=debug

# Frontend
localStorage.setItem('debug', 'recaptcha:*');
```

## 🔄 Future Enhancements

- [ ] **reCAPTCHA v3 Integration** (Score-based verification)
- [ ] **Enterprise reCAPTCHA** (Advanced bot detection)
- [ ] **Custom Challenge Types** (Audio, image, etc.)
- [ ] **Analytics Dashboard** (Verification metrics)
- [ ] **A/B Testing** (Different verification flows)
- [ ] **Machine Learning** (Behavioral analysis)

---

**Built with ❤️ for SAMIA TAROT**

*This enhanced authentication system provides enterprise-grade security with an exceptional user experience across all platforms and languages.* 