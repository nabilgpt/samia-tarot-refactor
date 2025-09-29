# Twilio Verify Setup Guide

## Overview

This guide walks you through setting up **Twilio Verify** for OTP authentication via WhatsApp, Email, and SMS fallback.

---

## Step 1: Create Verify Service

1. Log into [Twilio Console](https://console.twilio.com)
2. Navigate to **Verify** → **Services**
3. Click **Create new Service**
4. Configure:
   - **Friendly Name**: `SAMIA TAROT`
   - **Code Length**: 6 digits
   - **Code Expiration**: 10 minutes
   - **Default Locale**: `en` (English)
5. Click **Create**
6. **Copy the Service SID** (starts with `VA...`) to your `.env` file as `VERIFY_SERVICE_SID`

---

## Step 2: Configure WhatsApp Sender

### Register WhatsApp Business Account (WABA)

1. Go to **Messaging** → **WhatsApp** → **Senders**
2. Click **Add a WhatsApp Sender**
3. Choose one of:
   - **Twilio Sandbox** (for testing only)
   - **Production WhatsApp Business API** (requires Facebook Business Manager verification)

### Production Setup

1. Complete **Facebook Business Verification**:
   - Business name
   - Business documents
   - Business address
2. **Submit WhatsApp number** for approval
3. **Approve WhatsApp Authentication Template**:
   - Go to **Messaging** → **WhatsApp** → **Message Templates**
   - Look for Verify default template or create custom
   - Template example: `Your {{1}} code is {{2}}`

### Test with Sandbox (Development)

1. Join sandbox by sending code to Twilio's WhatsApp number
2. Test OTP flow
3. **Note**: Sandbox numbers expire and are for testing only

---

## Step 3: Configure Email Channel

Email OTP is automatically enabled through Verify. No additional setup required.

**Optional**: Customize email template
1. Go to **Verify** → **Services** → Your Service → **Email**
2. Customize:
   - From Name
   - From Email (must be verified in SendGrid)
   - Subject Line
   - Body Template

---

## Step 4: Enable Channel Selection & Fallback

Twilio Verify can automatically fallback from WhatsApp → SMS if WhatsApp fails.

1. Go to **Verify** → **Services** → Your Service
2. Click **Settings**
3. Enable **Channel Selection**
4. Configure fallback order:
   - Primary: **WhatsApp**
   - Fallback: **SMS**
5. Set fallback delay: **30 seconds**
6. Save changes

---

## Step 5: Configure Rate Limiting

1. In Verify Service settings
2. Go to **Rate Limits**
3. Configure:
   - **Max attempts**: 5 per 10 minutes
   - **Max sends**: 3 per hour per number
   - **Fraud prevention**: Enable
4. Save

---

## Step 6: Test Integration

### Using Code

```typescript
import { startVerification, checkVerification } from './server/otp'

// Start WhatsApp verification
await startVerification('+966501234567', 'whatsapp', 'ar')

// User receives code via WhatsApp

// Check verification
const result = await checkVerification('+966501234567', '123456', 'whatsapp')
console.log(result.status) // 'approved' or 'pending'
```

### Using Demo Script

```bash
node scripts/otp_demo.js +966501234567 user@example.com 123456
```

---

## Step 7: Go Live Checklist

- [ ] Production WhatsApp sender approved
- [ ] WhatsApp Authentication template approved
- [ ] Rate limits configured
- [ ] Channel fallback enabled
- [ ] Email templates customized
- [ ] Test all channels (WhatsApp, Email, SMS)
- [ ] Monitor Verify usage dashboard

---

## Localization

Verify supports multiple locales:

- `en` - English
- `ar` - Arabic
- `fr` - French
- `de` - German
- `es` - Spanish
- `it` - Italian
- `pt` - Portuguese
- `ru` - Russian
- `zh` - Chinese

Pass locale parameter:

```typescript
await startVerification(phone, 'whatsapp', 'ar') // Arabic
```

---

## Monitoring

### Twilio Console

1. **Verify** → **Services** → Your Service → **Logs**
2. Monitor:
   - Verification attempts
   - Success rate
   - Channel breakdown (WhatsApp/Email/SMS)
   - Error rates

### Webhooks (Optional)

Configure webhooks to receive verification events:

1. Go to Service → **Webhooks**
2. Add webhook URL: `https://your-domain.com/webhooks/verify`
3. Select events:
   - Verification started
   - Verification completed
   - Verification failed

---

## Cost Estimation

### Per Verification Prices (approximate)

- **WhatsApp**: $0.005 - $0.01 per verification
- **Email**: Free (via Verify)
- **SMS**: $0.01 - $0.08 per verification (varies by country)

**Lebanon SMS pricing**: ~$0.04 per SMS

### Optimization Tips

1. Use WhatsApp as primary (cheapest)
2. Email as secondary
3. SMS as last resort fallback
4. Implement rate limiting to prevent abuse
5. Cache verified sessions

---

## Troubleshooting

### WhatsApp not working

- **Check**: WhatsApp sender is approved (not sandbox)
- **Check**: Number is valid E.164 format (`+966...`)
- **Check**: User has WhatsApp installed
- **Solution**: Enable SMS fallback

### Email not delivering

- **Check**: SendGrid domain authenticated
- **Check**: Email not in spam
- **Solution**: Customize from address to match authenticated domain

### Rate limit errors

- **Check**: Verify rate limits configuration
- **Check**: User not exceeding 5 attempts/10m
- **Solution**: Implement lockout logic (see `M016_auth_verifications.sql`)

---

## Security Best Practices

1. **Never log OTP codes** in plain text
2. **Use HTTPS** for all API calls
3. **Implement rate limiting** in app (beyond Twilio's)
4. **Lock accounts** after 5 failed attempts
5. **Monitor for abuse patterns**
6. **Rotate API keys** regularly
7. **Use API Keys** instead of Auth Token in production

---

## References

- [Twilio Verify Documentation](https://www.twilio.com/docs/verify)
- [WhatsApp for Twilio](https://www.twilio.com/docs/whatsapp)
- [Verify API Reference](https://www.twilio.com/docs/verify/api)