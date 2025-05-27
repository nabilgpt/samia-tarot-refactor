# 🛡️ SAMIA TAROT - reCAPTCHA Verification Backend

## 📋 Overview

This is a secure backend service for verifying Google reCAPTCHA tokens for the SAMIA TAROT application. It provides a robust API endpoint that validates reCAPTCHA responses with proper security measures, rate limiting, and error handling.

## ✨ Features

- 🔐 **Secure reCAPTCHA Verification** - Server-side validation with Google's API
- 🚦 **Rate Limiting** - Prevents abuse with configurable limits
- 🛡️ **Security Headers** - Helmet.js for enhanced security
- 🌐 **CORS Support** - Configurable cross-origin resource sharing
- 📊 **Logging & Monitoring** - Comprehensive request logging
- ⚡ **High Performance** - Optimized for speed and reliability
- 🔧 **Environment Configuration** - Flexible configuration via environment variables

## 🚀 Quick Start

### Prerequisites

- Node.js 16+ and npm 8+
- Google reCAPTCHA site and secret keys
- (Optional) Redis for advanced rate limiting

### Installation

1. **Clone and navigate to backend directory:**
```bash
cd backend
```

2. **Install dependencies:**
```bash
npm install
```

3. **Configure environment variables:**
```bash
cp env.example .env
# Edit .env with your configuration
```

4. **Start the server:**
```bash
# Development mode
npm run dev

# Production mode
npm start
```

## ⚙️ Configuration

### Environment Variables

Create a `.env` file based on `env.example`:

```env
# reCAPTCHA Configuration
RECAPTCHA_SECRET_KEY=your_secret_key_here
RECAPTCHA_MIN_SCORE=0.5

# Server Configuration
PORT=3001
NODE_ENV=production
FRONTEND_URL=https://yourdomain.com

# Security Settings
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=10
```

### reCAPTCHA Setup

1. **Get reCAPTCHA Keys:**
   - Visit [Google reCAPTCHA](https://www.google.com/recaptcha/)
   - Create a new site
   - Choose reCAPTCHA v2 or v3
   - Add your domain(s)
   - Copy Site Key (for frontend) and Secret Key (for backend)

2. **Configure Keys:**
   - Add Site Key to your React frontend
   - Add Secret Key to backend `.env` file

## 📡 API Endpoints

### POST `/api/verify-recaptcha`

Verifies a reCAPTCHA token.

**Request:**
```json
{
  "token": "03AGdBq25..."
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "reCAPTCHA verification successful",
  "score": 0.9,
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

**Error Response (400):**
```json
{
  "success": false,
  "error": "Invalid reCAPTCHA response",
  "errorCodes": ["invalid-input-response"]
}
```

### GET `/api/health`

Health check endpoint.

**Response (200):**
```json
{
  "status": "healthy",
  "service": "reCAPTCHA verification",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "version": "1.0.0"
}
```

## 🔧 Frontend Integration

### React Component Usage

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
  theme="dark"
  size="normal"
/>
```

### Manual Integration

```javascript
// Verify reCAPTCHA token
const verifyRecaptcha = async (token) => {
  try {
    const response = await fetch('/api/verify-recaptcha', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token }),
    });
    
    const result = await response.json();
    return result.success;
  } catch (error) {
    console.error('Verification failed:', error);
    return false;
  }
};
```

## 🛡️ Security Features

### Rate Limiting

- **Default:** 10 requests per 15 minutes per IP
- **Configurable:** Via environment variables
- **Headers:** Standard rate limit headers included

### Security Headers

Helmet.js provides:
- Content Security Policy
- X-Frame-Options
- X-Content-Type-Options
- Referrer Policy
- And more...

### IP Detection

Supports various proxy configurations:
- `X-Forwarded-For`
- `X-Real-IP`
- `X-Client-IP`
- Direct connection IP

## 📊 Monitoring & Logging

### Request Logging

All verification attempts are logged with:
- Timestamp
- Client IP address
- Success/failure status
- reCAPTCHA score (v3)
- Error codes
- User agent

### Health Monitoring

Use the `/api/health` endpoint for:
- Load balancer health checks
- Monitoring service integration
- Uptime verification

## 🚀 Deployment

### Docker Deployment

```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
EXPOSE 3001

CMD ["npm", "start"]
```

### PM2 Deployment

```bash
# Install PM2
npm install -g pm2

# Start with PM2
pm2 start verify-recaptcha.js --name "recaptcha-api"

# Save PM2 configuration
pm2 save
pm2 startup
```

### Environment-Specific Configs

**Development:**
```env
NODE_ENV=development
PORT=3001
FRONTEND_URL=http://localhost:3000
```

**Production:**
```env
NODE_ENV=production
PORT=80
FRONTEND_URL=https://samia-tarot.com
```

## 🧪 Testing

### Run Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch
```

### Manual Testing

```bash
# Test health endpoint
curl http://localhost:3001/api/health

# Test verification endpoint
curl -X POST http://localhost:3001/api/verify-recaptcha \
  -H "Content-Type: application/json" \
  -d '{"token":"test_token"}'
```

## 🔍 Troubleshooting

### Common Issues

1. **"Server configuration error"**
   - Check `RECAPTCHA_SECRET_KEY` in `.env`
   - Verify secret key is correct

2. **"CORS error"**
   - Check `FRONTEND_URL` in `.env`
   - Verify frontend domain is correct

3. **"Rate limit exceeded"**
   - Wait for rate limit window to reset
   - Adjust rate limit settings if needed

4. **"Verification service unavailable"**
   - Check internet connection
   - Verify Google reCAPTCHA service status

### Debug Mode

Enable detailed logging:

```env
NODE_ENV=development
LOG_LEVEL=debug
```

## 📚 Additional Resources

- [Google reCAPTCHA Documentation](https://developers.google.com/recaptcha)
- [Express.js Documentation](https://expressjs.com/)
- [Helmet.js Security Guide](https://helmetjs.github.io/)
- [Rate Limiting Best Practices](https://github.com/nfriedly/express-rate-limit)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

**Built with ❤️ for SAMIA TAROT**

*Secure, reliable, and scalable reCAPTCHA verification service.* 